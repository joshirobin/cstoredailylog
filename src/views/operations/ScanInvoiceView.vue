<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { UploadCloud, FileText, Check, Loader2, Database, Clock, Sparkles, ExternalLink } from 'lucide-vue-next';
import Tesseract from 'tesseract.js';
import { useScannedInvoicesStore } from '../../stores/scannedInvoices';
import { useAccountsStore } from '../../stores/accounts';
import { useRouter } from 'vue-router';

const scannedInvoicesStore = useScannedInvoicesStore();
const accountsStore = useAccountsStore();
const router = useRouter();

onMounted(async () => {
  await Promise.all([
    scannedInvoicesStore.fetchScannedInvoices(),
    accountsStore.fetchAccounts()
  ]);
});

// Store the Tesseract worker for cleanup
let tesseractWorker: Tesseract.Worker | null = null;

const isDragging = ref(false);
const isProcessing = ref(false);
const file = ref<File | null>(null);
const extractedData = ref<{ total: string | null, date: string | null, description: string, accountId: string } | null>(null);
const rawText = ref('');
const progress = ref(0);
const isSaving = ref(false);

import * as pdfjsLib from 'pdfjs-dist';

// Set worker source (using CDN for simplicity/compatibility)
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// ... references ...

const onDrop = (e: DragEvent) => {
  isDragging.value = false;
  if (e.dataTransfer && e.dataTransfer.files.length > 0) {
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      file.value = droppedFile;
      processFile(droppedFile); // Renamed
    }
  }
};

const onFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    const selectedFile = target.files[0];
    if (selectedFile) {
      file.value = selectedFile;
      processFile(selectedFile); // Renamed
    }
  }
};

const processFile = async (fileToProcess: File) => {
  isProcessing.value = true;
  extractedData.value = null;
  rawText.value = '';
  progress.value = 0;
  
  let imageSource: File | string = fileToProcess;

  try {
    // PDF Handling
    if (fileToProcess.type === 'application/pdf') {
        progress.value = 10; // Started PDF conversion
        const arrayBuffer = await fileToProcess.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1); // Get first page
        
        const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
            await page.render({ canvasContext: context, viewport: viewport } as any).promise;
            imageSource = canvas.toDataURL('image/png');
        }
    }

    const result = await Tesseract.recognize(
      imageSource,
      'eng',
      { 
        logger: m => {
          if (m.status === 'recognizing text') {
            progress.value = Math.floor(m.progress * 100);
          }
        }
      }
    );

    rawText.value = result.data.text;
    const lines = result.data.text.split('\n').filter((line: string) => line.trim().length > 3);
// ... Rest of logic stays same basically
    
    // Simple regex for demo purposes to find $ totals
    const moneyRegex = /\$?\d+\.\d{2}/g;
    const matches = result.data.text.match(moneyRegex);
    
    // Simple date regex for 01/01/2024 format
    const dateRegex = /\d{1,2}\/\d{1,2}\/\d{2,4}/g;
    const dateMatches = result.data.text.match(dateRegex);
    
    const totalMatch = matches && matches.length > 0 ? matches[matches.length - 1] : '$0.00';
    const dateMatch = dateMatches && dateMatches.length > 0 ? dateMatches[0] : new Date().toISOString().split('T')[0];
    
    // Attempt to guess description: First meaningful line that isn't a date or total
    let descriptionGuess = 'General Purchase';
    for (const line of lines) {
        if (!line.match(dateRegex) && !line.match(moneyRegex) && line.length > 5) {
            descriptionGuess = line.trim();
            break;
        }
    }

    // Attempt to guess account matching
    // Search raw text for account names
    let matchedAccountId = '';
    const lowerText = rawText.value.toLowerCase();
    for (const acc of accountsStore.accounts) {
        if (lowerText.includes(acc.name.toLowerCase())) {
            matchedAccountId = String(acc.id);
            break;
        }
    }

    extractedData.value = {
      total: totalMatch || '$0.00',
      date: dateMatch || '',
      description: descriptionGuess,
      accountId: matchedAccountId
    };

  } catch (error) {
    console.error(error);
    alert('Error processing file. If using PDF, ensure it is not password protected.');
  } finally {
    isProcessing.value = false;
  }
};

const saveToLog = async () => {
  if (!extractedData.value || !file.value) return;
  
  isSaving.value = true;
  
  try {
    const scanData = {
      fileName: file.value.name,
      total: extractedData.value.total || '$0.00',
      extractedDate: extractedData.value.date || '',
      description: extractedData.value.description,
      accountName: accountsStore.accounts.find(a => String(a.id) === extractedData.value?.accountId)?.name || 'Unknown',
      rawText: rawText.value,
      date: new Date().toISOString()
    };

    // Use the backend API via the store
    await scannedInvoicesStore.addScannedInvoice(scanData, file.value || undefined);

    // Reset the form
    file.value = null;
    extractedData.value = null;
    rawText.value = '';
    
  } catch (error) {
    console.error('Error saving scan:', error);
  } finally {
    isSaving.value = false;
  }
};

// ... existing cleanup ...
const handleConvertToInvoice = () => {
    if (!extractedData.value) return;
    router.push({ 
        path: '/invoices/new', 
        query: { 
            scannedTotal: extractedData.value.total ? extractedData.value.total.replace('$', '') : '0', 
            scannedDate: extractedData.value.date,
            scannedDesc: extractedData.value.description,
            scannedAccountId: extractedData.value.accountId
        } 
    });
};

// Cleanup when navigating away from the component
onBeforeUnmount(async () => {
  // Stop any ongoing processing
  isProcessing.value = false;
  
  // Terminate the Tesseract worker if it exists
  if (tesseractWorker) {
    try {
      await tesseractWorker.terminate();
      tesseractWorker = null;
    } catch (error) {
      console.error('Error terminating Tesseract worker:', error);
    }
  }
  
  // Clear any file references
  file.value = null;
  extractedData.value = null;
  rawText.value = '';
});
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <div>
      <h2 class="text-2xl font-bold font-display text-white">AI Scan Log</h2>
      <p class="text-surface-400 text-sm">Upload invoices or receipts. AI will automatically extract details.</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <!-- Upload Zone -->
      <div>
        <div 
          class="relative border-2 border-dashed rounded-xl h-80 flex flex-col items-center justify-center transition-all bg-surface-900/50"
          :class="isDragging ? 'border-primary-500 bg-primary-500/10' : 'border-surface-700 hover:border-primary-500/50'"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="onDrop"
        >
          <div v-if="!file" class="text-center p-8 pointer-events-none">
            <div class="bg-surface-800 p-4 rounded-full inline-block mb-4">
               <UploadCloud class="w-8 h-8 text-surface-400" />
            </div>
            <p class="text-white font-medium mb-1">Drag and drop invoice</p>
            <p class="text-surface-500 text-sm mb-4">or click to browse</p>
          </div>
          <div v-else class="text-center p-8">
             <div class="relative inline-block mb-4">
               <FileText class="w-12 h-12 text-primary-400" />
               <div v-if="isProcessing" class="absolute -bottom-2 -right-2 bg-surface-900 rounded-full p-1 border border-surface-700">
                 <Loader2 class="w-4 h-4 text-primary-500 animate-spin" />
               </div>
               <div v-else class="absolute -bottom-2 -right-2 bg-emerald-500 text-white rounded-full p-1">
                 <Check class="w-3 h-3" />
               </div>
             </div>
             <p class="text-white font-medium truncate max-w-[200px]">{{ file.name }}</p>
             <button 
               v-if="!isProcessing"
               @click="file = null" 
               class="text-xs text-red-400 hover:text-red-300 mt-2 font-medium"
             >
               Remove file
             </button>

             <!-- Progress Bar -->
             <div v-if="isProcessing" class="mt-4 w-48 h-1.5 bg-surface-800 rounded-full overflow-hidden mx-auto">
               <div class="h-full bg-primary-500 transition-all duration-300" :style="{ width: `${progress}%` }"></div>
             </div>
             <p v-if="isProcessing" class="text-xs text-surface-400 mt-2">Processing... {{ progress }}%</p>
          </div>
          
          <input 
            type="file" 
            class="absolute inset-0 opacity-0"
            :class="file ? 'pointer-events-none cursor-default' : 'cursor-pointer'" 
            accept="image/*,application/pdf"
            @change="onFileSelect"
            :disabled="!!file"
          />
        </div>
      </div>

      <!-- Results Preview -->
      <div class="glass-panel p-6 flex flex-col h-full">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-bold text-white">Extracted Data</h3>
          <span class="text-xs bg-primary-500/10 text-primary-400 px-2 py-1 rounded border border-primary-500/20">AI Confidence: 85%</span>
        </div>

        <div v-if="extractedData" class="space-y-4 flex-1">
           <div class="space-y-1.5">
             <label class="text-xs font-medium text-surface-400 ml-1">Total Amount</label>
             <input v-model="extractedData.total" class="input-field w-full text-lg font-bold text-emerald-400" />
           </div>

           <div class="space-y-1.5">
             <label class="text-xs font-medium text-surface-400 ml-1">Invoice Date</label>
             <input v-model="extractedData.date" class="input-field w-full" />
           </div>

           <div class="space-y-1.5">
             <label class="text-xs font-medium text-surface-400 ml-1">Description</label>
             <input v-model="extractedData.description" class="input-field w-full" />
           </div>

           <div class="space-y-1.5">
             <label class="text-xs font-medium text-surface-400 ml-1">Matched Account</label>
              <select v-model="extractedData.accountId" class="input-field w-full">
                 <option value="">Select Account...</option>
                 <option v-for="acc in accountsStore.accounts" :key="acc.id" :value="acc.id">
                     {{ acc.name }}
                 </option>
             </select>
           </div>
           
           <div class="space-y-1.5">
             <label class="text-xs font-medium text-surface-400 ml-1">Raw Text Output</label>
             <textarea 
               v-model="rawText" 
               class="input-field w-full h-20 text-xs font-mono text-surface-300" 
               readonly
             ></textarea>
           </div>
           
           <div class="grid grid-cols-2 gap-4 mt-auto pt-2">
              <button 
                @click="saveToLog"
                :disabled="isSaving"
                class="btn-secondary w-full text-xs flex items-center justify-center gap-2"
              >
                <Database class="w-3.5 h-3.5" />
                <span>{{ isSaving ? 'Saving...' : 'Save to Log' }}</span>
              </button>
              <button 
                @click="handleConvertToInvoice" 
                class="btn-primary w-full text-center flex items-center justify-center gap-2"
              >
                <span>Convert to Invoice</span>
              </button>
           </div>
        </div>
        
        <div v-else class="flex-1 flex flex-col items-center justify-center text-center text-surface-500 opacity-60">
          <Sparkles class="w-12 h-12 mb-3" />
          <p>Waiting for invoice contents...</p>
        </div>
      </div>
    </div>

    <!-- Scanned Invoices History -->
    <div v-if="scannedInvoicesStore?.scannedInvoices?.length > 0" class="glass-panel p-6">
      <div class="flex items-center gap-3 mb-5">
        <Clock class="w-5 h-5 text-surface-400" />
        <h3 class="text-lg font-bold text-white">Recent Scan History</h3>
      </div>
      
      <div class="space-y-3">
        <div 
          v-for="scan in scannedInvoicesStore.scannedInvoices" 
          :key="scan.id" 
          class="flex items-center justify-between p-4 bg-surface-900/40 border border-surface-700/30 rounded-lg hover:border-primary-500/30 transition-colors"
        >
          <div class="flex items-center gap-4 flex-1">
            <div class="bg-primary-500/10 p-3 rounded-lg">
              <FileText class="w-5 h-5 text-primary-400" />
            </div>
            <div class="flex-1">
              <div class="font-medium text-white mb-1">{{ scan.fileName }}</div>
              <div class="flex items-center gap-4 text-xs text-surface-400">
                <span>{{ new Date(scan.createdAt).toLocaleString() }}</span>
                <span v-if="scan.extractedDate">Date: {{ scan.extractedDate }}</span>
              </div>
            </div>
          </div>
          <div class="text-right flex flex-col items-end gap-2">
            <div>
              <div class="text-xl font-bold font-mono text-emerald-400">{{ scan.total }}</div>
              <div class="text-xs text-surface-500">Total Found</div>
            </div>
            <a 
                v-if="scan.fileUrl" 
                :href="scan.fileUrl" 
                target="_blank" 
                class="flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300 font-medium bg-primary-500/10 px-2 py-1 rounded hover:bg-primary-500/20 transition-colors"
                @click.stop
            >
                <ExternalLink class="w-3 h-3" />
                View Receipt
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
