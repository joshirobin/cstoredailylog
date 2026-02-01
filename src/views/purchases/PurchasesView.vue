<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { usePurchasesStore, type Purchase } from '../../stores/purchases';
import { 
  Search, Plus, Pencil, Trash2, 
  ShoppingCart, Save, X, 
  Upload, Loader2, Sparkles,
  Calendar, Building2, Hash,
  FileText
} from 'lucide-vue-next';


import { createWorker } from 'tesseract.js';

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

// Set worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const purchasesStore = usePurchasesStore();
const searchQuery = ref('');
const showUpsertModal = ref(false);
const showScanModal = ref(false);
const editingPurchase = ref<Purchase | null>(null);
const showTxtModal = ref(false);
const rawTxtInput = ref('');


const isProcessing = ref(false);
const processingStatus = ref('');

const form = ref<Omit<Purchase, 'id' | 'createdAt' | 'locationId'>>({
  vendorId: '',
  vendorName: '',
  invoiceNumber: '',
  date: new Date().toISOString().split('T')[0],
  totalAmount: 0,
  status: 'Pending',
  items: []
});

onMounted(async () => {
  await purchasesStore.fetchVendors();
  await purchasesStore.fetchPurchases();
});

const filteredPurchases = computed(() => {
  return purchasesStore.purchases.filter(p => 
    p.vendorName.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    p.invoiceNumber.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const openAddModal = () => {
  editingPurchase.value = null;
  form.value = {
    vendorId: '',
    vendorName: '',
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
    totalAmount: 0,
    status: 'Pending',
    items: []
  };
  showUpsertModal.value = true;
};

const openEditModal = (purchase: Purchase) => {
  editingPurchase.value = purchase;
  const { id, createdAt, locationId, ...rest } = purchase;
  form.value = { 
    ...rest,
    date: purchase.date?.toDate ? purchase.date.toDate().toISOString().split('T')[0] : (purchase.date as any)
  };
  showUpsertModal.value = true;
};

const handleSubmit = async () => {
  try {
    // If vendorName is provided but no vendorId, create/get the vendor
    if (form.value.vendorName && !form.value.vendorId) {
        const vendor = await purchasesStore.getOrCreateVendor(form.value.vendorName);
        if (vendor) {
            form.value.vendorId = vendor.id;
        }
    }

    if (editingPurchase.value) {
      await purchasesStore.updatePurchase(editingPurchase.value.id, form.value);
    } else {
      await purchasesStore.addPurchase(form.value);
    }
    showUpsertModal.value = false;
  } catch (error) {
    alert('Failed to save purchase');
  }
};

const deletePurchase = async (id: string) => {
  if (confirm('Are you sure you want to delete this purchase record?')) {
    await purchasesStore.deletePurchase(id);
  }
};

const handleTxtImport = async () => {
    if (!rawTxtInput.value.trim()) return;
    
    const lines = rawTxtInput.value.split('\n');
    const detectedItems: any[] = [];
    let detectedVendor = "Unknown Vendor";
    let detectedInv = "";
    let detectedDate = new Date().toISOString().split('T')[0];

    lines.forEach(line => {
        const type = line.charAt(0);
        
        if (type === 'A') {
            // Header: AVENDOR                        7191704   20260122
            detectedVendor = line.substring(1, 31).trim() || "Unknown Vendor";
            detectedInv = line.substring(31, 41).trim();
            const dateStr = line.substring(41, 49).trim();
            if (dateStr.length === 8) {
                detectedDate = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
            }
        } else if (type === 'B') {
            // Item: B01230000007SD CAMEL BLUE BOX        012057010242  0000100000301129
            const itemCode = line.substring(1, 12).trim();
            const desc = line.substring(12, 37).trim();
            const sku = line.substring(37, 49).trim();
            const units = parseInt(line.substring(51, 57)) || 1;
            const qty = parseInt(line.substring(57, 63)) || 1;
            const price = parseInt(line.substring(63)) / 100 || 0;
            
            detectedItems.push({

                qty: qty,
                code: itemCode,
                scanCode: sku,
                description: desc.toUpperCase(),
                department: line.includes('CAMEL') || line.includes('MARLB') || line.includes('ZYN') ? 'TOBACCO' : 'GROCERY',
                priceGroup: '',
                productCategory: '',
                units: units,
                caseCost: price,
                caseDisc: 0,
                costPerUnitAfterDisc: price / (units || 1),
                extdCaseCost: price * qty,
                unitRetail: Number(((price / (units || 1)) * 1.35).toFixed(2)),
                extdCaseRetail: Number(((price / (units || 1)) * 1.35 * units * qty).toFixed(2)),
                size: '',
                margin: 35,
                defaultMargin: 35,
                marginAfterRebate: 0,
                totalCost: price * qty
            });
        } else if (line.startsWith('CTAX')) {
            // CTAXSales Tax                000255
            const feeDesc = line.substring(4, 29).trim();
            const amount = parseInt(line.substring(29)) / 100 || 0;
            
            detectedItems.push({
                qty: 1,
                code: 'FEE',
                scanCode: '',
                description: feeDesc.toUpperCase(),
                department: 'ADJUSTMENT',
                priceGroup: '',
                productCategory: '',
                units: 1,
                caseCost: amount,
                caseDisc: 0,
                costPerUnitAfterDisc: amount,
                extdCaseCost: amount,
                unitRetail: amount,
                extdCaseRetail: amount,
                size: '',
                margin: 0,
                defaultMargin: 0,
                marginAfterRebate: 0,
                totalCost: amount
            });
        }
    });

    form.value = {
        vendorId: '',
        vendorName: detectedVendor,
        invoiceNumber: detectedInv,
        date: detectedDate,
        totalAmount: Number(detectedItems.reduce((sum, i) => sum + i.totalCost, 0).toFixed(2)),
        status: 'Pending',
        items: detectedItems
    };

    showTxtModal.value = false;
    rawTxtInput.value = '';
    showUpsertModal.value = true;
};

// AI Scan Logic

const handleFileUpload = async (event: any) => {
    const file = event.target.files[0];
    if (!file) return;

    isProcessing.value = true;
    processingStatus.value = `Advanced Vision AI analyzing ${file.name}...`;

    try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        let fullRawText = "";
        const maxPages = Math.min(pdf.numPages, 5); // Scan up to 5 pages for robustness

        for (let i = 1; i <= maxPages; i++) {
            processingStatus.value = `Reading Page ${i} of ${pdf.numPages}...`;
            const page = await pdf.getPage(i);
            
            // 1. Digital Text Extraction with Layout Preservation
            const textContent = await page.getTextContent();
            
            // Group items by their vertical position (Y-coordinate) to rebuild rows correctly
            const items = textContent.items as any[];
            const rows: Record<number, string> = {};
            
            items.forEach((item) => {
                const y = Math.round(item.transform[5]); // Y coordinate
                if (!rows[y]) rows[y] = "";
                rows[y] += item.str + " ";
            });
            
            // Sort rows from top to bottom
            const sortedY = Object.keys(rows).map(Number).sort((a, b) => b - a);
            let pageText = sortedY.map(y => rows[y]).join("\n");

            // 2. OCR Fallback for Scanned Images
            if (pageText.trim().length < 100) {
                processingStatus.value = `Page ${i} appears scanned. Running OCR...`;
                const viewport = page.getViewport({ scale: 2.0 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                if (context) {
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    await page.render({ canvasContext: context, viewport }).promise;
                    
                    const worker = await createWorker('eng');
                    const { data: { text: ocrText } } = await worker.recognize(canvas.toDataURL('image/png'));
                    await worker.terminate();
                    pageText = ocrText;
                }
            }
            
            fullRawText += pageText + "\n--- PAGE BREAK ---\n";
        }

        const lines = fullRawText.split('\n');
        
        // --- DATA MATCHING ENGINE ---
        
        // 1. Vendor Selection (Prioritize known vendors)
        let detectedVendor = "";
        const knownVendors = purchasesStore.vendors.map(v => v.name);
        for (const vendor of knownVendors) {
            if (fullRawText.toLowerCase().includes(vendor.toLowerCase())) {
                detectedVendor = vendor;
                break;
            }
        }
        
        if (!detectedVendor) {
            // Fallback to top of document logic
            const topLines = lines.slice(0, 10).filter(l => l.trim().length > 3);
            detectedVendor = topLines[0]?.trim() || "Unknown Vendor";
        }

        // 2. Total Amount Extraction
        const totalPatterns = [
            /(?:Total|Amount Due|Balance|Sum|Grand Total|Net Amount|Amt)[\s:]*[\$]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2}))/i,
            /(?:TOTAL|TOTAL DUE)[\s]*[\$]?\s*(\d{1,}\.\d{2})/
        ];
        
        let detectedTotal = 0;
        for (const pattern of totalPatterns) {
            const match = fullRawText.match(pattern);
            if (match && match[1]) {
                detectedTotal = parseFloat(match[1].replace(/,/g, ''));
                break;
            }
        }


        // 3. Invoice/Reference Extraction
        const invPatterns = [
            /(?:Invoice|Inv|Order|ID|Ref|Document)[\s#:]*([A-Z0-9\-]{4,20})/i,
            /Invoice\s*No\.?\s*([A-Z0-9\-]+)/i
        ];
        let detectedInv = "";
        for (const pattern of invPatterns) {
            const match = fullRawText.match(pattern);
            if (match && match[1]) {
                detectedInv = match[1];
                break;
            }
        }


        // 4. Date Extraction
        const datePatterns = [
            /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
            /([A-Z][a-z]{2,8}\s\d{1,2},?\s\d{4})/,
            /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/
        ];
        let detectedDate = new Date().toISOString().split('T')[0];
        for (const pattern of datePatterns) {
            const match = fullRawText.match(pattern);
            if (match && match[1]) {
                try {
                    const parsed = new Date(match[1]);
                    if (!isNaN(parsed.getTime())) {
                        detectedDate = parsed.toISOString().split('T')[0];
                        break;
                    }
                } catch(e) {}
            }
        }

        // 5. High-Precision Line Item Parsing
        const detectedItems: any[] = [];
        lines.forEach(line => {
             // Look for rows that look like: [SKU/Code] [Description] [Qty] [Price/Amount]
             const skuMatch = line.match(/\b(\d{5,14})\b/);
             const moneyMatch = line.match(/(\d+\.\d{2,3})/g);
             
             // A valid line must have at least one money value and a description/code
             if (moneyMatch && moneyMatch.length >= 1) {
                 // Clean description: remove prices, codes, and special chars
                 let desc = line
                    .replace(/\b\d{5,14}\b/g, '')
                    .replace(/\d+\.\d{2,3}/g, '')
                    .replace(/[\$\#\*\-\:\,]/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();

                 // Ignore technical lines or short noise
                 if (desc.length > 4 && !line.toLowerCase().includes('total') && !line.toLowerCase().includes('subtotal')) {
                    const primaryPrice = parseFloat(moneyMatch[0]);
                    const secondaryPrice = moneyMatch[1] ? parseFloat(moneyMatch[1]) : primaryPrice * 1.5;

                    detectedItems.push({
                        qty: 1,
                        code: skuMatch ? skuMatch[0].substring(0, 8) : '',
                        scanCode: skuMatch ? skuMatch[0] : '',
                        description: desc.substring(0, 45).toUpperCase(),
                        department: 'GROCERY',
                        priceGroup: '',
                        productCategory: '',
                        units: 1,
                        caseCost: primaryPrice,
                        caseDisc: 0,
                        costPerUnitAfterDisc: primaryPrice,
                        extdCaseCost: primaryPrice,
                        unitRetail: Number(secondaryPrice.toFixed(2)),
                        extdCaseRetail: Number(secondaryPrice.toFixed(2)),
                        size: '',
                        margin: Number((((secondaryPrice - primaryPrice) / secondaryPrice) * 100).toFixed(2)),
                        defaultMargin: 35,
                        marginAfterRebate: 0,
                        totalCost: primaryPrice
                    });
                 }
             }
        });

        // 6. Validation & Cleanup
        if (detectedItems.length > 0 && detectedTotal === 0) {
            detectedTotal = detectedItems.reduce((sum, item) => sum + item.totalCost, 0);
        }

        form.value = {
            vendorId: '',
            vendorName: detectedVendor,
            invoiceNumber: detectedInv,
            date: detectedDate,
            totalAmount: Number(detectedTotal.toFixed(2)),
            status: 'Pending',
            items: detectedItems
        };

        showScanModal.value = false;
        showUpsertModal.value = true;

    } catch (error: any) {
        console.error('Advanced Scan Error:', error);
        alert('AI Parsing Error: This document format could not be fully analyzed. Please verify data manually.');
    } finally {
        isProcessing.value = false;
    }
};


</script>

<template>
  <div class="space-y-8 animate-in fade-in duration-700 p-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
          <ShoppingCart class="w-6 h-6" />
        </div>
        <div>
          <h2 class="text-2xl font-bold text-slate-900 tracking-tight">Purchases</h2>
          <div class="flex items-center gap-2 mt-1">
            <span class="px-2 py-0.5 bg-primary-100 text-primary-700 text-[10px] font-bold uppercase tracking-wider rounded-md">Accounts Payable</span>
            <p class="text-[10px] font-medium text-slate-400 uppercase tracking-wider">v1.1 Standard</p>
          </div>
        </div>
      </div>

      <div class="flex gap-3">
        <button 
          @click="showScanModal = true"
          class="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-bold text-xs shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"
        >
          <Sparkles class="w-4 h-4 text-primary-500" />
          AI Invoice Scan
        </button>
        <button 
          @click="showTxtModal = true"
          class="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-bold text-xs shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"
        >
          <FileText class="w-4 h-4 text-emerald-500" />
          Import TXT
        </button>

        <button 
          @click="openAddModal"
          class="px-4 py-2.5 bg-slate-900 text-white rounded-lg font-bold text-xs shadow-sm hover:bg-slate-800 transition-all flex items-center gap-2"
        >
          <Plus class="w-4 h-4" />
          Manual Entry
        </button>
      </div>
    </div>


    <!-- Stats Row -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-1">
        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">MTD Purchases</p>
        <p class="text-2xl font-bold text-slate-900">
          ${{ purchasesStore.purchases.reduce((acc, p) => acc + p.totalAmount, 0).toLocaleString() }}
        </p>
      </div>
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-1 border-l-primary-500 border-l-4">
        <p class="text-[10px] font-bold text-primary-500 uppercase tracking-wider">Pending Payment</p>
        <p class="text-2xl font-bold text-slate-900">
          ${{ purchasesStore.purchases.filter(p => p.status === 'Pending').reduce((acc, p) => acc + p.totalAmount, 0).toLocaleString() }}
        </p>
      </div>
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Vendors</p>
          <p class="text-2xl font-bold text-slate-900">{{ purchasesStore.vendors.length }} Active</p>
      </div>
    </div>


    <!-- Search & Filters -->
    <div class="relative">
        <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input 
            v-model="searchQuery"
            type="text" 
            placeholder="Search by vendor, invoice number or date..." 
            class="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all outline-none shadow-sm"
        />
    </div>


    <!-- Master Table -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto custom-scrollbar">
        <table class="w-full text-left border-collapse">
            <thead>
                <tr class="bg-slate-50 border-b border-slate-200">
                    <th class="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vendor Entity</th>
                    <th class="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reference</th>
                    <th class="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Timeline</th>
                    <th class="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Amount Due</th>
                    <th class="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                    <th class="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
                <tr v-for="purchase in filteredPurchases" :key="purchase.id" class="hover:bg-slate-50 transition-all group">
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                <Building2 class="w-4 h-4" />
                            </div>
                            <div class="flex flex-col">
                                <span class="text-sm font-bold text-slate-900">{{ purchase.vendorName }}</span>
                                <span class="text-[9px] font-medium text-slate-400 uppercase tracking-wider">Authorized Supplier</span>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <span class="text-xs font-mono font-medium text-slate-600">{{ purchase.invoiceNumber || 'N/A' }}</span>
                    </td>
                    <td class="px-6 py-4">
                        <span class="text-xs font-medium text-slate-600">
                            {{ purchase.date?.toDate ? purchase.date.toDate().toLocaleDateString() : new Date(purchase.date).toLocaleDateString() }}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-center">
                        <span class="text-sm font-bold text-slate-900">${{ purchase.totalAmount.toFixed(2) }}</span>
                    </td>
                    <td class="px-6 py-4">
                        <div class="flex justify-center">
                            <span :class="[
                                'px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider',
                                purchase.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 
                                purchase.status === 'Cancelled' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                            ]">
                                {{ purchase.status }}
                            </span>
                        </div>
                    </td>
                    <td class="px-6 py-4 text-right">
                        <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button @click="openEditModal(purchase)" class="p-2 text-slate-400 hover:text-slate-900 transition-all">
                                <Pencil class="w-4 h-4" />
                            </button>
                            <button @click="deletePurchase(purchase.id)" class="p-2 text-slate-400 hover:text-rose-600 transition-all">
                                <Trash2 class="w-4 h-4" />
                            </button>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>

        <div v-if="filteredPurchases.length === 0" class="p-20 text-center">
            <Loader2 v-if="purchasesStore.loading" class="w-12 h-12 text-primary-500 animate-spin mx-auto" />
            <div v-else class="space-y-4">
                <ShoppingCart class="w-16 h-16 text-slate-100 mx-auto" />
                <p class="text-2xl font-black text-slate-200 uppercase italic tracking-tighter">No Purchases Recorded</p>
            </div>
        </div>
    </div>

    <!-- Upsert Modal -->
    <div v-if="showUpsertModal" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" @click="showUpsertModal = false"></div>
        <div class="bg-white rounded-xl w-full max-w-[95vw] h-[90vh] flex flex-col relative z-10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <!-- Modal Header -->
            <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-white">
                        <ShoppingCart class="w-5 h-5" />
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-slate-900">{{ editingPurchase ? 'Modify Record' : 'Record Purchase' }}</h3>
                        <p class="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Accounts Payable Ledger</p>
                    </div>
                </div>
                <button @click="showUpsertModal = false" class="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                    <X class="w-5 h-5" />
                </button>
            </div>

            
            <form @submit.prevent="handleSubmit" class="flex-1 flex flex-col overflow-hidden">
                <div class="flex-1 overflow-y-auto p-6 space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <!-- Basic Info Group -->
                        <div class="md:col-span-2 grid grid-cols-2 gap-4">
                            <div class="col-span-2 space-y-1.5">
                                <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vendor Name</label>
                                <div class="relative">
                                    <Building2 class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input v-model="form.vendorName" list="vendor-list" type="text" required class="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all" placeholder="Search or Type Vendor" />
                                    <datalist id="vendor-list">
                                        <option v-for="v in purchasesStore.vendors" :key="v.id" :value="v.name"></option>
                                    </datalist>
                                </div>
                            </div>

                            <div class="space-y-1.5">
                                <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Invoice #</label>
                                <div class="relative">
                                    <Hash class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input v-model="form.invoiceNumber" type="text" class="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all" placeholder="REF-001" />
                                </div>
                            </div>
                            <div class="space-y-1.5">
                                <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Bill Date</label>
                                <div class="relative">
                                    <Calendar class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input v-model="form.date" type="date" required class="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all" />
                                </div>
                            </div>
                        </div>

                        <!-- Financials Group -->
                        <div class="bg-slate-900 rounded-xl p-5 space-y-4">
                            <div class="space-y-1.5">
                                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Liability</label>
                                <div class="relative">
                                    <div class="absolute left-4 top-1/2 -translate-y-1/2 text-primary-500 font-bold text-xl">$</div>
                                    <input v-model.number="form.totalAmount" step="0.01" type="number" required class="w-full bg-white/10 border border-white/20 rounded-lg pl-10 pr-4 py-3 text-2xl font-bold text-white focus:border-primary-500 outline-none transition-all" />
                                </div>
                            </div>

                            <div class="space-y-1.5">
                                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
                                <div class="grid grid-cols-3 gap-2">
                                    <button 
                                        type="button"
                                        v-for="s in ['Pending', 'Paid', 'Cancelled']" 
                                        :key="s"
                                        @click="form.status = s as any"
                                        :class="[
                                            'py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all',
                                            form.status === s ? 'bg-primary-500 text-white shadow-sm' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                        ]"
                                    >
                                        {{ s }}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>


                <!-- Line Items Section -->
                <div class="space-y-4">
                    <div class="flex items-center justify-between px-1">
                        <div class="space-y-0.5">
                            <h4 class="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <div class="w-1 h-3 bg-primary-500 rounded-full"></div>
                                Audit Data Matrix
                            </h4>
                            <p class="text-[9px] font-medium text-slate-400 uppercase">
                                *Item changes within 15 days reflect in Price Book
                            </p>
                        </div>
                        <button 
                            type="button" 
                            @click="form.items?.push({ qty: 1, code: '', scanCode: '', description: 'NEW ITEM', department: '', priceGroup: '', productCategory: '', units: 1, caseCost: 0, caseDisc: 0, costPerUnitAfterDisc: 0, extdCaseCost: 0, unitRetail: 0, extdCaseRetail: 0, margin: 0, totalCost: 0 })"
                            class="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-slate-200 transition-all border border-slate-200"
                        >
                            + Add Line
                        </button>
                    </div>

                    <div class="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm overflow-x-auto custom-scrollbar">
                        <table class="w-full text-left whitespace-nowrap min-w-[1500px]">
                            <thead class="bg-slate-50 text-[9px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10">


                                <tr>
                                    <th class="p-4 border-r border-slate-800">Qty</th>
                                    <th class="p-4 border-r border-slate-800">Code</th>
                                    <th class="p-4 border-r border-slate-800">Scan Code</th>
                                    <th class="p-4 border-r border-slate-800 shrink-0 min-w-[200px]">Item Description</th>
                                    <th class="p-4 border-r border-slate-800">Department</th>
                                    <th class="p-4 border-r border-slate-800">Price Group</th>
                                    <th class="p-4 border-r border-slate-800">Category</th>
                                    <th class="p-4 border-r border-slate-800">Units</th>
                                    <th class="p-4 border-r border-slate-800">Case Cost</th>
                                    <th class="p-4 border-r border-slate-800 text-rose-400">Case Disc</th>
                                    <th class="p-4 border-r border-slate-800 text-emerald-400">Cost/Unit</th>
                                    <th class="p-4 border-r border-slate-800">Extd Cost</th>
                                    <th class="p-4 border-r border-slate-800 text-primary-400">Unit Retail</th>
                                    <th class="p-4 border-r border-slate-800 text-primary-300">Extd Retail</th>
                                    <th class="p-4 border-r border-slate-800">Size</th>
                                    <th class="p-4 border-r border-slate-800">Margin</th>
                                    <th class="p-4 border-r border-slate-800 text-slate-500">Def.</th>
                                    <th class="p-4 border-r border-slate-800 text-emerald-500">Post-Reb.</th>
                                    <th class="p-4 text-right">Delete</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 bg-white">
                                <tr v-for="(item, idx) in form.items" :key="idx" class="group hover:bg-slate-50 transition-colors">
                                    <td class="p-2 border-r border-slate-50">
                                        <input v-model.number="item.qty" type="number" class="w-12 bg-transparent border-none text-center font-black text-slate-900 text-[11px]" />
                                    </td>
                                    <td class="p-2 border-r border-slate-50">
                                        <input v-model="item.code" type="text" class="w-16 bg-transparent border-none font-mono text-slate-500 text-[10px]" />
                                    </td>
                                    <td class="p-2 border-r border-slate-50">
                                        <input v-model="item.scanCode" type="text" class="w-28 bg-transparent border-none font-mono text-slate-500 text-[10px]" />
                                    </td>
                                    <td class="p-2 border-r border-slate-50">
                                        <input v-model="item.description" type="text" class="w-full bg-transparent border-none font-black text-slate-900 uppercase text-[11px]" />
                                    </td>
                                    <td class="p-2 border-r border-slate-50">
                                        <select v-model="item.department" class="bg-transparent border-none text-[10px] font-bold text-slate-500 appearance-none">
                                            <option>GROCERY</option>
                                            <option>SOFT DRINKS</option>
                                            <option>TOBACCO</option>
                                            <option>BEER</option>
                                        </select>
                                    </td>
                                    <td class="p-2 border-r border-slate-50">
                                        <input v-model="item.priceGroup" type="text" class="w-16 bg-transparent border-none text-[10px] font-bold text-slate-500" />
                                    </td>
                                    <td class="p-2 border-r border-slate-50">
                                        <input v-model="item.productCategory" type="text" class="w-20 bg-transparent border-none text-[10px] font-bold text-slate-500" />
                                    </td>
                                    <td class="p-2 border-r border-slate-50">
                                        <input v-model.number="item.units" type="number" class="w-10 bg-transparent border-none text-center font-bold text-slate-700 text-[10px]" />
                                    </td>
                                    <td class="p-2 border-r border-slate-50">
                                        <input v-model.number="item.caseCost" type="number" step="0.001" class="w-16 bg-transparent border-none text-right font-black text-slate-900 text-[11px]" />
                                    </td>
                                    <td class="p-2 border-r border-slate-50">
                                        <input v-model.number="item.caseDisc" type="number" step="0.001" class="w-16 bg-transparent border-none text-right font-bold text-rose-500 text-[10px]" />
                                    </td>
                                    <td class="p-2 border-r border-slate-50 text-center">
                                        <span class="text-[11px] font-black text-emerald-600">
                                            ${{ ((item.caseCost - item.caseDisc) / (item.units || 1)).toFixed(3) }}
                                        </span>
                                    </td>
                                    <td class="p-2 border-r border-slate-50 text-center">
                                        <span class="text-[11px] font-black text-slate-900">
                                            ${{ (item.caseCost * item.qty).toFixed(3) }}
                                        </span>
                                    </td>
                                    <td class="p-2 border-r border-slate-50">
                                        <input v-model.number="item.unitRetail" type="number" step="0.01" class="w-16 bg-slate-50/50 border border-primary-100 rounded px-2 py-1 text-right font-black text-primary-600 text-[11px]" />
                                    </td>
                                    <td class="p-2 border-r border-slate-50 text-center text-[10px] font-bold text-primary-400">
                                        ${{ (item.unitRetail * item.units * item.qty).toFixed(2) }}
                                    </td>
                                    <td class="p-2 border-r border-slate-50">
                                        <input v-model="item.size" type="text" class="w-12 bg-transparent border-none text-center text-[10px] font-bold text-slate-400" />
                                    </td>
                                    <td class="p-2 border-r border-slate-50 text-center">
                                        <span :class="[
                                            'text-[11px] font-black',
                                            ((item.unitRetail - ((item.caseCost - item.caseDisc) / (item.units || 1))) / (item.unitRetail || 1) * 100) > 30 ? 'text-emerald-500' : 'text-rose-500'
                                        ]">
                                            {{ ((item.unitRetail - ((item.caseCost - item.caseDisc) / (item.units || 1))) / (item.unitRetail || 1) * 100).toFixed(2) }}%
                                        </span>
                                    </td>
                                    <td class="p-2 border-r border-slate-50 text-center text-[9px] font-bold text-slate-300 italic">
                                        43.68%
                                    </td>
                                    <td class="p-2 border-r border-slate-50 text-center text-[10px] font-black text-emerald-500">
                                        {{ ((item.unitRetail - ((item.caseCost - item.caseDisc) / (item.units || 1))) / (item.unitRetail || 1) * 100).toFixed(2) }}%
                                    </td>
                                    <td class="p-2 text-right">
                                        <button type="button" @click="form.items?.splice(idx, 1)" class="p-2 text-slate-200 hover:text-rose-500 transition-colors">
                                            <Trash2 class="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                </div>
            </div>
        </div>

            <!-- Form Actions -->


                <div class="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                    <button type="button" @click="showUpsertModal = false" class="px-4 py-2 text-slate-500 font-bold uppercase text-[10px] tracking-wider hover:text-slate-900">Cancel</button>
                    <button type="submit" class="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold uppercase tracking-wider text-[10px] shadow-sm flex items-center gap-2 hover:bg-slate-800 transition-all">
                        <Save class="w-3.5 h-3.5" />
                        {{ editingPurchase ? 'Update Record' : 'Save Purchase' }}
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- AI Scan Modal -->
    <div v-if="showScanModal" class="fixed inset-0 z-[300] flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" @click="showScanModal = false"></div>
        <div class="bg-white rounded-xl w-full max-w-md relative z-10 p-8 text-center space-y-6 animate-in zoom-in-95 duration-200">
            <div class="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-primary-500">
                 <component :is="isProcessing ? Loader2 : Sparkles" :class="{'animate-spin': isProcessing}" class="w-8 h-8" />
            </div>
            
            <div class="space-y-2">
                <h3 class="text-xl font-bold text-slate-900">Vision AI Scanner</h3>
                <p class="text-xs font-medium text-slate-500 leading-relaxed">
                    {{ isProcessing ? processingStatus : 'Upload an invoice PDF to auto-detect vendor and line item details.' }}
                </p>
            </div>

            <div v-if="!isProcessing" class="relative group">
                <input 
                    type="file" 
                    accept=".pdf,.jpg,.jpeg,.png"
                    @change="handleFileUpload"
                    class="absolute inset-0 opacity-0 cursor-pointer z-20"
                />
                <div class="px-6 py-3 bg-slate-900 text-white rounded-lg font-bold uppercase tracking-wider text-[10px] shadow-sm group-hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                    <Upload class="w-4 h-4" />
                    Select Document
                </div>
            </div>
        </div>
    </div>

    <!-- TXT Import Modal -->
    <div v-if="showTxtModal" class="fixed inset-0 z-[300] flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" @click="showTxtModal = false"></div>
        <div class="bg-white rounded-xl w-full max-w-2xl relative z-10 flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center text-white">
                        <FileText class="w-5 h-5" />
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-slate-900">Manual TXT Import</h3>
                        <p class="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Fixed-Width Flat File Parser</p>
                    </div>
                </div>
                <button @click="showTxtModal = false" class="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                    <X class="w-5 h-5" />
                </button>
            </div>
            
            <div class="p-6 space-y-4">
                <p class="text-xs text-slate-500 leading-relaxed">
                    Paste the raw vendor data below. The parser will automatically extract vendor info, invoice numbers, and line items from A, B, and CTAX record formats.
                </p>
                <textarea 
                    v-model="rawTxtInput"
                    placeholder="AVENDOR...&#10;B0123..."
                    class="w-full h-64 bg-slate-50 border border-slate-200 rounded-lg p-4 font-mono text-[11px] outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 transition-all font-semibold"
                ></textarea>
            </div>

            <div class="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                <button @click="showTxtModal = false" class="px-4 py-2 text-slate-500 font-bold uppercase text-[10px] tracking-wider">Cancel</button>
                <button 
                    @click="handleTxtImport"
                    class="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold uppercase tracking-wider text-[10px] shadow-sm hover:bg-emerald-700 transition-all"
                >
                    Parse & Import
                </button>
            </div>
        </div>
    </div>

  </div>

</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  height: 6px;
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #f1f5f9;
  border-radius: 10px;
}
</style>
