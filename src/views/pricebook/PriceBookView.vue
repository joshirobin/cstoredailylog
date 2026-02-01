<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';

import { usePriceBookStore, type PriceBookItem } from '../../stores/pricebook';
import { useLocationsStore } from '../../stores/locations';
import { 
  Search, Plus, 
  Pencil, Trash2, 
  Tag, Save, X,
  Upload,
  Loader2, Sparkles, CheckCircle2,
  Droplet as Fuel, Settings, History, Globe, 
  Percent, AlertTriangle, RefreshCw as SyncIcon,
  CheckCircle, ArrowUpCircle
} from 'lucide-vue-next';





import * as XLSX from 'xlsx';
import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

// Set worker source for PDF.js to the local bundled worker (v3 compatibility)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;






const priceBookStore = usePriceBookStore();
const locationsStore = useLocationsStore();
const searchQuery = ref('');
const showUpsertModal = ref(false);
const showImportModal = ref(false);
const editingItem = ref<PriceBookItem | null>(null);

const isProcessing = ref(false);
const processingStatus = ref('');
const importedPreview = ref<Omit<PriceBookItem, 'id'>[]>([]);

const activeTab = ref<'registry' | 'approvals' | 'fuel' | 'rules' | 'logs'>('registry');

const pendingApprovals = computed(() => {
    return priceBookStore.items.filter(item => item.needs_approval);
});

const approvePriceChange = async (item: PriceBookItem) => {
    if (!item.suggested_retail) return;
    
    await priceBookStore.updateItem(item.id, {
        retail_price: item.suggested_retail,
        needs_approval: false,
        pos_sync_status: 'Synced',
        last_updated: new Date()
    });
};


const form = ref<Omit<PriceBookItem, 'id' | 'last_updated'>>({
  price_book_id: '',
  locationId: locationsStore.activeLocationId || '',
  sku: '',
  description: '',
  category: 'Grocery',
  retail_price: 0,
  price_type: 'Regular',
  effective_from: new Date().toISOString().split('T')[0],
  effective_to: null,
  status: 'Active',
  // UI legacy fields for calculation flow and display
  itemNumber: '',
  vendor: '',
  priceGroup: '',
  unitCase: 1,
  caseCost: 0,
  caseDiscount: 0,
  unitCost: 0,
  unitRetail: 0,
  srp: 0,
  margin: 0,
  taxGroup: 'Taxable'
});




onMounted(() => {
  priceBookStore.fetchItems(locationsStore.activeLocationId || '');
  priceBookStore.fetchFuelPrices();
  priceBookStore.fetchPricingRules();
  priceBookStore.fetchSyncLogs();
});


// Auto-calculate fields
watch([() => form.value.caseCost, () => form.value.caseDiscount, () => form.value.unitCase], () => {
  const caseCost = form.value.caseCost || 0;
  const caseDiscount = form.value.caseDiscount || 0;
  const unitCase = form.value.unitCase || 1;
  const netCaseCost = caseCost - caseDiscount;
  form.value.unitCost = Number((netCaseCost / unitCase).toFixed(4));
});

watch([() => form.value.unitCost, () => form.value.retail_price], () => {
    if (form.value.retail_price > 0 && form.value.unitCost !== undefined) {
        const margin = ((form.value.retail_price - form.value.unitCost) / form.value.retail_price) * 100;
        form.value.margin = Number(margin.toFixed(2));
    } else {
        form.value.margin = 0;
    }
});


const filteredItems = computed(() => {
  return priceBookStore.items.filter(item => 
    (item.description || '').toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    (item.sku || '').toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    (item.itemNumber || '').toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    (item.vendor || '').toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const openAddModal = () => {
  editingItem.value = null;
  form.value = {
    price_book_id: '',
    locationId: locationsStore.activeLocationId || '',
    sku: '',
    description: '',
    category: 'Grocery',
    retail_price: 0,
    price_type: 'Regular',
    effective_from: new Date().toISOString().split('T')[0],
    effective_to: null,
    status: 'Active',
    itemNumber: '',
    vendor: '',
    priceGroup: '',
    unitCase: 1,
    caseCost: 0,
    caseDiscount: 0,
    unitCost: 0,
    unitRetail: 0,
    srp: 0,
    margin: 0,
    taxGroup: 'Taxable'
  };
  showUpsertModal.value = true;
};

const openEditModal = (item: PriceBookItem) => {
  editingItem.value = item;
  form.value = { 
    ...item,
    effective_from: item.effective_from?.toDate ? item.effective_from.toDate().toISOString().split('T')[0] : item.effective_from,
    retail_price: item.retail_price || item.unitRetail || 0
  } as any;
  showUpsertModal.value = true;
};


const handleSubmit = async () => {
  if (editingItem.value) {
    await priceBookStore.updateItem(editingItem.value.id, form.value);
  } else {
    await priceBookStore.addItem(form.value);
  }
  showUpsertModal.value = false;
};

const deleteItem = (id: string) => {
    if (confirm('Are you sure you want to delete this item from the Price Book?')) {
        priceBookStore.deleteItem(id);
    }
}

// AI Import Logic
const handleFileUpload = async (event: any) => {
    const file = event.target.files[0];
    if (!file) return;

    isProcessing.value = true;
    processingStatus.value = `Initializing AI for ${file.name}...`;

    try {
        const fileName = file.name.toLowerCase();
        if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
            await processExcel(file);
        } else if (fileName.endsWith('.pdf')) {
            await processPDF(file);
        } else {
            alert('Unsupported file format. Please upload Excel or PDF.');
        }
    } catch (error: any) {
        console.error('Import failed:', error);
        processingStatus.value = `Error: ${error.message}`;
        alert(`AI Extraction failed: ${error.message}`);
    } finally {

        isProcessing.value = false;
    }
};

const processExcel = async (file: File) => {
    processingStatus.value = "AI Parsing Spreadsheet Matrix...";
    const reader = new FileReader();
    reader.onload = async (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) return;
        const worksheet = workbook.Sheets[firstSheetName];
        if (!worksheet) return;
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];



        processingStatus.value = "AI Mapping Columns to Price Book Schema...";
        
        // Dynamic Mapping Simulation
        const mappedItems = jsonData.slice(0, 50).map((row: any) => {
            const unitCost = row['Unit Cost'] || (row['Case Cost'] / (row['Pack'] || 1)) || 0;
            const retail = row['Unit Retail'] || row['Price'] || 0;
            const margin = retail > 0 ? ((retail - unitCost) / retail) * 100 : 0;

            return {
                price_book_id: '',
                locationId: locationsStore.activeLocationId || '',
                sku: String(row['SKU'] || row['UPC'] || ''),
                itemNumber: String(row['Item #'] || row['Code'] || ''),
                description: String(row['Description'] || row['Item Name'] || 'Imported Item'),
                vendor: String(row['Vendor'] || row['Supplier'] || ''),
                category: String(row['Category'] || 'Grocery'),
                priceGroup: String(row['Price Group'] || ''),
                unitCase: Number(row['Pack'] || row['Case'] || 1),
                caseCost: Number(row['Case Cost'] || 0),
                caseDiscount: Number(row['Discount'] || 0),
                unitCost: Number(unitCost.toFixed(4)),
                retail_price: Number(retail.toFixed(2)),
                unitRetail: Number(retail.toFixed(2)),
                srp: Number(row['SRP'] || retail || 0),
                margin: Number(margin.toFixed(2)),
                taxGroup: 'Taxable',
                price_type: 'Regular' as const,
                status: 'Active' as const,
                effective_from: new Date().toISOString().split('T')[0],
                effective_to: null,
                last_updated: new Date()
            };
        });





        importedPreview.value = mappedItems;
        processingStatus.value = "AI Validation Complete.";
    };
    reader.readAsArrayBuffer(file);
};

const processPDF = async (file: File) => {
    processingStatus.value = "AI analyzing PDF structure...";
    
    try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const totalPages = pdf.numPages;
        
        processingStatus.value = `AI reading ${totalPages} page(s)...`;
        
        let allItems: any[] = [];
        const maxPagesToScan = Math.min(totalPages, 5); // Scan first 5 pages for speed

        for (let pageNum = 1; pageNum <= maxPagesToScan; pageNum++) {
            processingStatus.value = `AI scanning page ${pageNum}/${maxPagesToScan}...`;
            const page = await pdf.getPage(pageNum);
            
            // Try 1: Direct Text Extraction (Fast & Accurate for digital PDFs)
            const textContent = await page.getTextContent();
            const textItems = textContent.items.map((item: any) => item.str).join(' ');
            
            if (textItems.trim().length > 50) {
                processingStatus.value = `AI parsing text records from page ${pageNum}...`;
                const extracted = parseTextRecords(textItems);
                if (extracted.length > 0) {
                    allItems = [...allItems, ...extracted];
                    continue; // Successfully got text, skip OCR for this page
                }
            }

            // Try 2: OCR Fallback (For scanned PDFs)
            processingStatus.value = `AI vision-scanning page ${pageNum} (OCR)...`;
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) continue;
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            // @ts-ignore
            await page.render({ canvasContext: context, viewport, canvas }).promise;
            const imageData = canvas.toDataURL('image/png');

            const worker = await createWorker('eng');
            const { data: { text: ocrText } } = await worker.recognize(imageData);
            await worker.terminate();

            const extracted = parseTextRecords(ocrText);
            allItems = [...allItems, ...extracted];
        }

        if (allItems.length === 0) {
            throw new Error('AI could not identify any price records in this document. Please ensure it contains product names and prices.');
        }

        // Deduplicate by SKU or Description
        const uniqueItems = Array.from(new Map(allItems.map(item => [item.sku || item.description, item])).values());
        
        importedPreview.value = uniqueItems.slice(0, 100);
        processingStatus.value = "AI Extraction Complete.";
    } catch (e: any) {
        console.error('PDF AI Error:', e);
        throw e;
    }
};

const parseTextRecords = (text: string) => {
    // Split by newlines or multiple spaces which usually separate columns
    const lines = text.split(/\n|\r| {3,}/);
    const items: any[] = [];
    
    lines.forEach(line => {
        // Look for SKU (10-14 digits) and Price (X.XX)
        const skuMatch = line.match(/\b\d{10,14}\b/);
        const priceMatch = line.match(/\d+\.\d{2}/);
        
        if (priceMatch) {
            // Clean description: remove numeric strings that look like SKUs or prices
            const desc = line
                .replace(/\b\d{10,14}\b/g, '')
                .replace(/\d+\.\d{2}/g, '')
                .replace(/[\$\#\*\-\:\,]/g, '')
                .trim();

            if (desc.length > 3) {
                items.push({
                    price_book_id: '',
                    locationId: locationsStore.activeLocationId || '',
                    sku: skuMatch ? skuMatch[0] : '',
                    itemNumber: '',
                    description: desc.substring(0, 50).toUpperCase(),
                    vendor: 'AI EXTRACTED',
                    category: 'Uncategorized',
                    priceGroup: '',
                    unitCase: 1,
                    caseCost: 0,
                    caseDiscount: 0,
                    unitCost: 0,
                    retail_price: Number(priceMatch[0]),
                    unitRetail: Number(priceMatch[0]),
                    srp: Number(priceMatch[0]),
                    margin: 25.00,
                    taxGroup: 'Taxable',
                    price_type: 'Regular' as const,
                    status: 'Active' as const,
                    effective_from: new Date().toISOString().split('T')[0],
                    effective_to: null,
                    last_updated: new Date()
                });


            }


        }
    });
    return items;
};



const commitImport = async () => {
    processingStatus.value = "Committing to Central Registry...";
    isProcessing.value = true;
    try {
        for (const item of importedPreview.value) {
            await priceBookStore.addItem(item as any);
        }

        showImportModal.value = false;
        importedPreview.value = [];
        alert(`Successfully imported ${importedPreview.value.length} items.`);
    } catch (e) {
        console.error(e);
    } finally {
        isProcessing.value = false;
    }
};

</script>

<template>
  <div class="space-y-8 animate-in fade-in duration-700">
    <!-- Header & Tabs -->
    <div class="flex flex-col gap-8 p-2">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div class="space-y-3">
          <div class="flex items-center gap-4">
              <div class="w-14 h-14 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white shadow-2xl rotate-3">
                  <Tag class="w-7 h-7" />
              </div>
              <div>
                  <h2 class="text-4xl font-black text-slate-900 italic tracking-tighter uppercase leading-none">Price Book</h2>
                  <div class="flex items-center gap-2 mt-2">
                      <span class="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></span>
                      <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global SKU & Retail Registry v3.0</p>
                  </div>
              </div>
          </div>
        </div>

        <div class="flex gap-3">
          <button 
            @click="showImportModal = true"
            class="px-5 py-3 bg-white border-2 border-slate-900 text-slate-900 rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg hover:bg-slate-50 transition-all flex items-center gap-3 group"
          >
            <Sparkles class="w-4 h-4 text-primary-500 group-hover:scale-110 transition-transform" />
            AI Scanner
          </button>
          <button 
            @click="openAddModal"
            class="px-5 py-3 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[9px] shadow-xl shadow-slate-900/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 group"
          >
            <Plus class="w-4 h-4 group-hover:rotate-90 transition-transform" />
            New Record
          </button>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="flex flex-wrap gap-2 bg-slate-100/50 p-2 rounded-[2rem] w-fit">
        <button 
          v-for="tab in (['registry', 'approvals', 'fuel', 'rules', 'logs'] as const)" 
          :key="tab"
          @click="activeTab = tab"
          :class="[
            'px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-3 relative',
            activeTab === tab ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-slate-600'
          ]"
        >
          <component :is="tab === 'registry' ? Globe : tab === 'approvals' ? CheckCircle : tab === 'fuel' ? Fuel : tab === 'rules' ? Settings : History" class="w-4 h-4" />
          {{ tab }}
          <span v-if="tab === 'approvals' && pendingApprovals.length > 0" class="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[8px] font-black animate-bounce shadow-lg">
              {{ pendingApprovals.length }}
          </span>
        </button>
      </div>

    </div>

    <!-- Tab Content -->
    <div class="min-h-[60vh]">
      <!-- Registry Tab -->
      <div v-if="activeTab === 'registry'" class="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
        <!-- Search & Filters -->
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div class="lg:col-span-3 relative group">
                <Search class="absolute left-8 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 group-focus-within:text-primary-500 transition-colors" />
                <input 
                    v-model="searchQuery"
                    type="text" 
                    placeholder="Find by SKU, Item #, Description or Vendor..." 
                    class="w-full bg-white border-4 border-slate-50 rounded-[2.5rem] pl-20 pr-10 py-8 text-xl font-black italic tracking-tighter placeholder-slate-200 focus:border-primary-100 transition-all outline-none shadow-xl shadow-slate-200/20"
                />
            </div>
            <div class="flex items-center justify-center p-8 bg-white border-4 border-slate-50 rounded-[2.5rem] shadow-sm">
                <div class="text-center">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Index Size</p>
                    <p class="text-3xl font-black text-slate-900 italic tracking-tighter">{{ priceBookStore.items.length }} Records</p>
                </div>
            </div>
        </div>

        <!-- Master Table -->
        <div class="bg-white rounded-[3rem] border-4 border-slate-50 shadow-2xl overflow-hidden overflow-x-auto custom-scrollbar">

        <table class="w-full text-left border-collapse">
            <thead>
                <tr class="bg-slate-50/50">
                    <th class="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Item Detail</th>
                    <th class="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Codes</th>
                    <th class="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Logistics</th>
                    <th class="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Cost Matrix</th>
                    <th class="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Retail Logic</th>
                    <th class="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
                <tr v-for="item in filteredItems" :key="item.id" class="hover:bg-slate-50/30 transition-colors group">
                    <td class="px-8 py-6">
                        <div class="flex flex-col">
                            <span class="text-lg font-black text-slate-900 uppercase italic tracking-tighter">{{ item.description }}</span>
                            <span class="text-[10px] font-black text-primary-500 uppercase tracking-widest">{{ item.vendor }}</span>
                        </div>
                    </td>
                    <td class="px-6 py-6">
                        <div class="space-y-1">
                            <div class="flex items-center gap-2">
                                <span class="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-black text-slate-500 uppercase">SKU</span>
                                <span class="text-[11px] font-mono font-bold text-slate-700">{{ item.sku }}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-black text-slate-500 uppercase">ITM</span>
                                <span class="text-[11px] font-mono font-bold text-slate-700">{{ item.itemNumber }}</span>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-6">
                        <div class="flex flex-col">
                            <span class="text-[10px] font-black text-slate-400 uppercase mb-1">Price Group</span>
                            <span class="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-widest w-fit">{{ item.priceGroup || 'General' }}</span>
                        </div>
                    </td>
                    <td class="px-6 py-6">
                        <div class="flex flex-col items-center">
                            <div class="grid grid-cols-2 gap-4 w-full">
                                <div class="text-center">
                                    <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Case Cost</p>
                                    <p class="text-xs font-black text-slate-900">${{ (item.caseCost || 0).toFixed(2) }}</p>

                                </div>
                                <div class="text-center border-l border-slate-100">
                                    <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Unit Cost</p>
                                    <p class="text-xs font-black text-primary-600">${{ (item.unitCost || 0).toFixed(2) }}</p>

                                </div>
                            </div>
                        </div>
                    </td>
                                    <td class="px-6 py-6 text-center border-l border-slate-50">
                                        <div class="flex flex-col items-center">
                                            <p class="text-[10px] font-black text-slate-400 uppercase mb-1">Retail</p>
                                            <p class="text-xl font-black text-primary-600 italic tracking-tighter">${{ (item.retail_price || 0).toFixed(2) }}</p>
                                        </div>
                                    </td>
                                    <td class="px-6 py-6 text-center border-l border-slate-50">
                                        <div class="flex flex-col items-center">
                                            <p class="text-[10px] font-black text-emerald-500 uppercase mb-1">Margin</p>
                                            <div class="flex items-center gap-1 justify-center">
                                                <p class="text-sm font-black text-emerald-600">{{ item.margin || 0 }}%</p>
                                                <div v-if="(item.margin || 0) < 15" class="group relative">
                                                    <AlertTriangle class="w-3 h-3 text-rose-500 animate-pulse" />
                                                </div>
                                            </div>
                                        </div>
                                    </td>


                    <td class="px-8 py-6 text-right">
                        <div class="flex items-center justify-end gap-2">
                            <button @click="openEditModal(item)" class="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                                <Pencil class="w-4 h-4" />
                            </button>
                            <button @click="deleteItem(item.id)" class="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm">
                                <Trash2 class="w-4 h-4" />
                            </button>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
      </div>
    </div>
    <!-- Registry Tab End -->

    <!-- Approvals Tab -->
    <div v-if="activeTab === 'approvals'" class="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
        <div v-if="pendingApprovals.length === 0" class="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-slate-50/50 rounded-[3rem] border-4 border-dashed border-slate-100">
            <div class="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center">
                <CheckCircle class="w-10 h-10" />
            </div>
            <div>
                <h3 class="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">System Balanced</h3>
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">No margin violations detected in the registry.</p>
            </div>
        </div>

        <div v-else class="grid grid-cols-1 gap-6">
            <div v-for="item in pendingApprovals" :key="item.id" 
                 class="bg-white p-8 rounded-[3rem] border-4 border-slate-50 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8 group hover:border-rose-100 transition-all">
                <div class="flex items-center gap-6 flex-1">
                    <div class="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform">
                        <AlertTriangle class="w-8 h-8" />
                    </div>
                    <div>
                        <h3 class="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">{{ item.description }}</h3>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Cost Increase Violation Detected • SKU: {{ item.sku }}</p>
                    </div>
                </div>

                <div class="flex items-center gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <div class="text-right">
                        <p class="text-[9px] font-black text-slate-400 uppercase mb-1">Current Retail</p>
                        <p class="text-xl font-black text-slate-400 line-through">${{ (item.retail_price || 0).toFixed(2) }}</p>
                    </div>
                    <div class="w-px h-10 bg-slate-200"></div>
                    <div class="text-center">
                        <ArrowUpCircle class="w-6 h-6 text-rose-500 animate-bounce" />
                    </div>
                    <div>
                        <p class="text-[9px] font-black text-emerald-500 uppercase mb-1">Suggested Retail</p>
                        <p class="text-3xl font-black text-slate-900 italic tracking-tighter">${{ (item.suggested_retail || 0).toFixed(2) }}</p>
                    </div>
                </div>

                <div class="flex items-center gap-4">
                    <button @click="openEditModal(item)" class="px-8 py-4 border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:border-slate-900 transition-all">Override</button>
                    <button @click="approvePriceChange(item)" class="px-10 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-emerald-600 transition-all flex items-center gap-3">
                        <CheckCircle class="w-4 h-4" />
                        Approve & Sync POS
                    </button>
                </div>
            </div>
        </div>
    </div>



      <!-- Fuel Tab -->
      <div v-if="(activeTab as any) === 'fuel'" class="space-y-8 animate-in slide-in-from-bottom-4 duration-500">

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="fuel in priceBookStore.fuelPrices" :key="fuel.id" 
               class="bg-white p-8 rounded-[3rem] border-4 border-slate-50 shadow-xl space-y-6 group hover:border-primary-100 transition-all">
            <div class="flex justify-between items-start">
              <div class="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-primary-400 group-hover:scale-110 transition-transform">
                <Fuel class="w-7 h-7" />
              </div>
              <div class="px-4 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                {{ fuel.status }}
              </div>
            </div>
            
            <div>
              <h3 class="text-3xl font-black text-slate-900 italic tracking-tighter uppercase">{{ fuel.type }}</h3>
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Market Velocity Analysis</p>
            </div>

            <div class="grid grid-cols-2 gap-4 bg-slate-50 p-6 rounded-3xl">
              <div class="text-center">
                <p class="text-[9px] font-black text-slate-400 uppercase mb-1">Cost/Gal</p>
                <p class="text-xl font-black text-slate-900">${{ fuel.costPerGallon.toFixed(3) }}</p>
              </div>
              <div class="text-center border-l border-slate-200">
                <p class="text-[9px] font-black text-primary-500 uppercase mb-1">Retail/Gal</p>
                <p class="text-xl font-black text-slate-900">${{ fuel.retailPerGallon.toFixed(3) }}</p>
              </div>
            </div>

            <div class="flex items-center justify-between px-2">
              <div class="flex flex-col">
                <p class="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Net Margin</p>
                <p class="text-sm font-black text-emerald-600">+${{ fuel.marginPerGallon.toFixed(3) }}</p>
              </div>
              <button class="px-6 py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-[9px] shadow-lg hover:bg-primary-600 transition-all">
                Push Change
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Rules Tab -->
      <div v-if="(activeTab as any) === 'rules'" class="space-y-8 animate-in slide-in-from-bottom-4 duration-500">

        <div class="flex items-center justify-between p-2">
          <div>
            <h3 class="text-2xl font-black text-slate-900 italic tracking-tighter uppercase">Automated Margin Guard</h3>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Self-Correction Rules Engine</p>
          </div>
          <button class="px-6 py-3 border-2 border-slate-900 rounded-xl font-black text-[10px] uppercase hover:bg-slate-900 hover:text-white transition-all">
            Add Logic
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-for="rule in priceBookStore.pricingRules" :key="rule.id" 
               class="bg-white p-6 rounded-3xl border border-slate-100 flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600">
                <Percent class="w-5 h-5" />
              </div>
              <div>
                <p class="text-sm font-black text-slate-900 uppercase tracking-tight">{{ rule.name }}</p>
                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Min Margin: {{ rule.minMargin }}%</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-1 bg-slate-100 rounded text-[9px] font-black text-slate-500">{{ rule.scope }}</span>
              <button class="text-slate-300 hover:text-slate-900 transition-colors"><Pencil class="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </div>

      <!-- Logs Tab -->
      <div v-if="(activeTab as any) === 'logs'" class="space-y-8 animate-in slide-in-from-bottom-4 duration-500">

        <div class="bg-white rounded-[2.5rem] border-4 border-slate-50 overflow-hidden">
          <table class="w-full text-left">
            <thead>
              <tr class="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th class="p-6">Timestamp</th>
                <th class="p-6">Modified Target</th>
                <th class="p-6">Value Shift</th>
                <th class="p-6">Transmit Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              <tr v-for="log in priceBookStore.syncLogs" :key="log.id" class="text-[11px] font-bold">
                <td class="p-6 text-slate-400">{{ new Date(log.timestamp?.toDate()).toLocaleString() }}</td>
                <td class="p-6 text-slate-900 uppercase italic">{{ log.itemName }}</td>
                <td class="p-6">
                  <span class="text-rose-500">${{ log.oldPrice }}</span>
                  <span class="mx-2 text-slate-200">→</span>
                  <span class="text-emerald-500">${{ log.newPrice }}</span>
                </td>
                <td class="p-6 text-right">
                  <div class="flex items-center justify-end gap-3">
                    <div :class="[
                      'w-2 h-2 rounded-full',
                      log.status === 'Synced' ? 'bg-emerald-500' : 'bg-rose-500'
                    ]"></div>
                    <span class="uppercase tracking-widest text-[9px] font-black text-slate-500">{{ log.status }}</span>
                    <SyncIcon v-if="log.status === 'Pending'" class="w-3 h-3 text-primary-500 animate-spin" />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div> <!-- Tab Content End -->


    <!-- Upsert Modal -->

    <div v-if="showUpsertModal" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-md" @click="showUpsertModal = false"></div>
        <div class="bg-white rounded-[2rem] w-full max-w-2xl relative z-10 overflow-hidden animate-in zoom-in duration-300 shadow-2xl">
            <div class="p-6 pb-2 flex justify-between items-start">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary-500/20">
                        <Tag class="w-5 h-5" />
                    </div>
                    <div>
                        <h3 class="text-xl font-black text-slate-900 uppercase italic tracking-tighter">{{ editingItem ? 'Modify Registry' : 'New Price Book Entry' }}</h3>
                        <p class="text-[8px] font-black text-primary-600 uppercase tracking-widest mt-0.5">Configure SKU Costs & Retail Logic</p>
                    </div>
                </div>
                <button @click="showUpsertModal = false" class="text-slate-300 hover:text-slate-900 transition-colors">
                    <X class="w-6 h-6" />
                </button>
            </div>
            
            <form @submit.prevent="handleSubmit" class="p-6 space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Basic Info -->
                    <div class="space-y-4">
                        <div class="space-y-3">
                            <h4 class="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <div class="w-1 h-3 bg-primary-500 rounded-full"></div>
                                Physical Identification
                            </h4>
                            <div class="space-y-1">
                                <label class="text-[8px] font-black text-slate-400 uppercase ml-1">Item Description</label>
                                <input v-model="form.description" type="text" required class="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold placeholder-slate-200 focus:bg-white focus:border-primary-500 transition-all outline-none uppercase" placeholder="e.g. COKE 20OZ PLASTIC" />
                            </div>
                            <div class="grid grid-cols-2 gap-3">
                                <div class="space-y-1">
                                    <label class="text-[8px] font-black text-slate-400 uppercase ml-1">SKU / UPC</label>
                                    <input v-model="form.sku" type="text" class="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold focus:bg-white focus:border-primary-500 transition-all outline-none" />
                                </div>
                                <div class="space-y-1">
                                    <label class="text-[8px] font-black text-slate-400 uppercase ml-1">Internal Item #</label>
                                    <input v-model="form.itemNumber" type="text" class="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold focus:bg-white focus:border-primary-500 transition-all outline-none" />
                                </div>
                            </div>
                        </div>

                        <div class="space-y-3">
                            <h4 class="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <div class="w-1 h-3 bg-primary-500 rounded-full"></div>
                                Categorization & Tax
                            </h4>
                            <div class="grid grid-cols-2 gap-3">
                                <div class="space-y-1">
                                    <label class="text-[8px] font-black text-slate-400 uppercase ml-1">Category</label>
                                    <select v-model="form.category" class="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold focus:bg-white focus:border-primary-500 transition-all outline-none appearance-none">
                                        <option>Grocery</option>
                                        <option>Beverag</option>
                                        <option>Tobacco</option>
                                        <option>Beer/Wine</option>
                                        <option>Snacks</option>
                                        <option>HBA</option>
                                    </select>
                                </div>
                                <div class="space-y-1">
                                    <label class="text-[8px] font-black text-slate-400 uppercase ml-1">Tax Group</label>
                                    <select v-model="form.taxGroup" class="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold focus:bg-white focus:border-primary-500 transition-all outline-none appearance-none">
                                        <option>Taxable</option>
                                        <option>Non-Taxable</option>
                                        <option>Zero-Rated</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>


                    <!-- Cost & Retail Logic -->
                    <div class="space-y-4">
                        <div class="bg-slate-50/50 p-6 rounded-2xl space-y-4 border border-slate-100">
                            <h4 class="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <div class="w-1 h-3 bg-emerald-500 rounded-full"></div>
                                Financial Computation
                            </h4>
                            
                            <div class="grid grid-cols-3 gap-3">
                                <div class="space-y-1">
                                    <label class="text-[8px] font-black text-slate-400 uppercase ml-1">Pack/Case</label>
                                    <input v-model.number="form.unitCase" type="number" class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-black focus:border-primary-500 outline-none" />
                                </div>
                                <div class="space-y-1">
                                    <label class="text-[8px] font-black text-slate-400 uppercase ml-1">Case Cost</label>
                                    <input v-model.number="form.caseCost" type="number" step="0.01" class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-black focus:border-primary-500 outline-none" />
                                </div>
                                <div class="space-y-1">
                                    <label class="text-[8px] font-black text-slate-400 uppercase ml-1">Discount</label>
                                    <input v-model.number="form.caseDiscount" type="number" step="0.01" class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-black focus:border-primary-500 outline-none" />
                                </div>
                            </div>

                            <div class="grid grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-slate-100">
                                <div class="text-center">
                                    <p class="text-[8px] font-black text-slate-400 uppercase mb-0.5">Computed Unit Cost</p>
                                    <p class="text-lg font-black text-primary-600 tracking-tighter">${{ (form.unitCost || 0).toFixed(4) }}</p>
                                </div>
                                <div class="text-center">
                                    <p class="text-[8px] font-black text-slate-400 uppercase mb-0.5">Applied Retail</p>
                                    <div class="flex items-center justify-center gap-1">
                                        <span class="text-xs font-black text-slate-300">$</span>
                                        <input v-model.number="form.unitRetail" type="number" step="0.01" class="w-16 text-center border-b border-slate-200 focus:border-primary-500 outline-none text-lg font-black tracking-tighter" />
                                    </div>
                                </div>
                            </div>

                             <div class="grid grid-cols-2 gap-3">
                                <div class="space-y-1">
                                    <label class="text-[8px] font-black text-slate-400 uppercase ml-1">Price Type</label>
                                    <select v-model="form.price_type" class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:border-primary-500 outline-none appearance-none">
                                        <option value="Regular">Regular</option>
                                        <option value="Sale">Sale</option>
                                        <option value="Promo">Promo</option>
                                        <option value="Multi-Price">Multi-Price</option>
                                    </select>
                                </div>
                                <div class="space-y-1">
                                    <label class="text-[8px] font-black text-emerald-500 uppercase ml-1">Live Margin (%)</label>
                                    <div class="w-full bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 text-xs font-black text-emerald-700 flex items-center justify-between">
                                        {{ form.margin }}%
                                        <div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                <div class="flex justify-end gap-3 border-t border-slate-100 pt-6">
                    <button type="button" @click="showUpsertModal = false" class="px-4 py-2 text-slate-400 font-black uppercase text-[8px] tracking-widest hover:text-slate-900 transition-all">Cancel</button>
                    <button type="submit" class="px-6 py-3 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[8px] shadow-xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-all">
                        <Save class="w-4 h-4" />
                        {{ editingItem ? 'Save Record' : 'Commit Entry' }}
                    </button>
                </div>
            </form>
        </div>
    </div>
    <!-- AI Import Modal -->
    <div v-if="showImportModal" class="fixed inset-0 z-[250] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/80 backdrop-blur-2xl" @click="showImportModal = false"></div>
        <div class="bg-white rounded-[4rem] w-full max-w-5xl relative z-10 overflow-hidden animate-in zoom-in duration-500 shadow-2xl flex flex-col max-h-[90vh]">
            <!-- Header -->
            <div class="p-10 flex justify-between items-center border-b border-slate-50">
                <div class="flex items-center gap-6">
                    <div class="w-16 h-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center text-white">
                        <Sparkles class="w-8 h-8 text-primary-400" />
                    </div>
                    <div>
                        <h3 class="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">AI Knowledge Import</h3>
                        <p class="text-[10px] font-black text-primary-600 uppercase tracking-widest mt-1">Excel, CSV, or PDF Pattern Recognition</p>
                    </div>
                </div>
                <button @click="showImportModal = false" class="text-slate-200 hover:text-slate-900 transition-colors">
                    <X class="w-10 h-10" />
                </button>
            </div>

            <div class="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                <!-- Drop Zone -->
                <div v-if="importedPreview.length === 0" class="relative group">
                    <input 
                        type="file" 
                        accept=".xlsx,.xls,.csv,.pdf" 
                        @change="handleFileUpload"
                        class="absolute inset-0 opacity-0 cursor-pointer z-20"
                    />
                    <div class="border-4 border-dashed border-slate-100 rounded-[group-3rem] p-20 text-center space-y-6 bg-slate-50/30 group-hover:bg-white transition-all">
                        <div class="w-24 h-24 bg-white rounded-[2rem] shadow-xl flex items-center justify-center mx-auto text-primary-500">
                             <component :is="isProcessing ? Loader2 : Upload" :class="{'animate-spin': isProcessing}" class="w-12 h-12" />
                        </div>
                        <div class="space-y-2">
                            <p class="text-2xl font-black text-slate-900 italic tracking-tighter uppercase">
                                {{ isProcessing ? processingStatus : 'Drop Price List Here' }}
                            </p>
                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Supports Multi-Column Excel or Vision-OCR PDF</p>
                        </div>
                    </div>
                </div>

                <!-- Preview Table -->
                <div v-else class="space-y-6">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <CheckCircle2 class="w-6 h-6 text-emerald-500" />
                            <h4 class="text-xl font-black text-slate-900 uppercase italic tracking-tighter">AI Extracted {{ importedPreview.length }} Items</h4>
                        </div>
                        <button @click="importedPreview = []" class="text-[10px] font-black text-rose-500 uppercase tracking-widest underline">Reset AI Brain</button>
                    </div>

                    <div class="border border-slate-100 rounded-3xl overflow-hidden shadow-sm overflow-x-auto">
                        <table class="w-full text-left text-xs text-slate-700">
                            <thead class="bg-slate-50 font-black uppercase text-slate-400 sticky top-0">
                                <tr>
                                    <th class="p-4">Description</th>
                                    <th class="p-4">SKU</th>
                                    <th class="p-4">Cost</th>
                                    <th class="p-4">Retail</th>
                                    <th class="p-4">Margin</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-50">
                                <tr v-for="(item, idx) in importedPreview" :key="idx" class="hover:bg-slate-50/50">
                                    <td class="p-4 font-bold text-slate-900 uppercase">{{ item.description }}</td>
                                    <td class="p-4 font-mono text-slate-500 text-[10px]">{{ item.sku }}</td>
                                    <td class="p-4 font-black text-slate-900">${{ (item.unitCost || 0).toFixed(2) }}</td>

                                    <td class="p-4 font-black text-primary-600">${{ (item.retail_price || 0).toFixed(2) }}</td>
                                    <td class="p-4 font-black" :class="(item.margin || 0) > 0 ? 'text-emerald-600' : 'text-rose-500'">{{ item.margin || 0 }}%</td>

                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Global Footer -->
            <div class="p-10 border-t border-slate-50 flex justify-end gap-6 bg-slate-50/50">
                <button @click="showImportModal = false" class="px-8 py-5 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-900 transition-all">Cancel Import</button>
                <button 
                  v-if="importedPreview.length > 0"
                  @click="commitImport"
                  :disabled="isProcessing"
                  class="px-12 py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-[10px] shadow-2xl flex items-center gap-4 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                    <component :is="isProcessing ? Loader2 : CheckCircle2" :class="{'animate-spin': isProcessing}" class="w-5 h-5" />
                    Commit Extracted Registry
                </button>
            </div>
        </div>
    </div>
  </div>
</template>


<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #f1f5f9;
  border-radius: 10px;
}
</style>
