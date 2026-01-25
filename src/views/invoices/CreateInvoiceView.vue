<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAccountsStore } from '../../stores/accounts';
import { useInvoicesStore, type InvoiceItem, type Attachment } from '../../stores/invoices';
import { 
  Plus, Trash2, Save, ArrowLeft, Paperclip, 
  Upload, Mail, X, FileImage, File as FileIcon, 
  CheckCircle2, AlertCircle, Loader2 
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const accountsStore = useAccountsStore();
const invoicesStore = useInvoicesStore();

const selectedAccountId = ref<string | number>('');
const date = ref(new Date().toISOString().split('T')[0]);
const dueDate = ref('');
const items = ref<InvoiceItem[]>([
  { id: '1', description: 'Fuel Charge', qty: 1, price: 0, total: 0 }
]);
const attachments = ref<Attachment[]>([]);
const recipientEmail = ref('');
const isSendingEmail = ref(false);
const isSavingDraft = ref(false);
const emailSent = ref(false);
const showSavedSuccess = ref(false);
const isDragging = ref(false);

const taxRate = 0.08;

// Watch for account selection to update recipient email
watch(selectedAccountId, (newId) => {
  if (newId) {
    const account = accountsStore.accounts.find(a => a.id == newId);
    if (account && account.email) {
      recipientEmail.value = account.email;
    }
  }
});

onMounted(() => {
  // Set default due date (Net 30)
  const d = new Date();
  d.setDate(d.getDate() + 30);
  dueDate.value = d.toISOString().split('T')[0] || '';

  if (route.query.scannedTotal) {
    const total = parseFloat(route.query.scannedTotal as string);
    if (items.value[0]) {
      items.value[0].price = total;
      items.value[0].total = total;
      items.value[0].description = 'Scanned Receipt Item';
    }
  }

  if (route.query.scannedDate) {
    const sDate = route.query.scannedDate as string;
    // Try to parse MM/DD/YYYY or similar
    try {
      const parsedDate = new Date(sDate);
      if (!isNaN(parsedDate.getTime())) {
        date.value = parsedDate.toISOString().split('T')[0];
      }
    } catch (e) {
      console.warn('Failed to parse scanned date:', sDate);
    }
  }
});

const subtotal = computed(() => items.value.reduce((sum, item) => sum + item.total, 0));
const tax = computed(() => subtotal.value * taxRate);
const grandTotal = computed(() => subtotal.value + tax.value);

const addItem = () => {
  items.value.push({
    id: Math.random().toString(36).substr(2, 9),
    description: '',
    qty: 1,
    price: 0,
    total: 0
  });
};

const removeItem = (index: number) => {
  if (items.value.length > 1) {
    items.value.splice(index, 1);
  }
};

const updateItemTotal = (item: InvoiceItem) => {
  item.total = item.qty * item.price;
};

const processFiles = async (files: FileList | File[]) => {
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file) continue;
    
    if (file.size > 10 * 1024 * 1024) {
      alert(`File "${file.name}" is too large. Maximum size is 10MB.`);
      continue;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      attachments.value.push({
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl: (e.target?.result as string) || ''
      });
    };
    reader.readAsDataURL(file);
  }
};

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files) {
    processFiles(target.files);
    target.value = '';
  }
};

const handleDrop = (event: DragEvent) => {
  isDragging.value = false;
  if (event.dataTransfer?.files) {
    processFiles(event.dataTransfer.files);
  }
};

const removeAttachment = (id: string) => {
  attachments.value = attachments.value.filter(a => a.id !== id);
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  else return (bytes / 1048576).toFixed(1) + ' MB';
};

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return FileImage;
  return FileIcon;
};

const validateInvoice = () => {
  if (!selectedAccountId.value) {
    alert('Please select an account');
    return false;
  }
  if (items.value.some(i => !i.description)) {
    alert('All line items must have a description');
    return false;
  }
  if (grandTotal.value <= 0) {
    alert('Invoice total must be greater than zero');
    return false;
  }
  return true;
};

const saveInvoice = async () => {
  if (!validateInvoice()) return;

  const account = accountsStore.accounts.find(a => a.id == selectedAccountId.value);
  if (!account) return;

  isSavingDraft.value = true;
  
  // Simulate network delay for a better feel
  await new Promise(resolve => setTimeout(resolve, 800));

  await invoicesStore.addInvoice({
    accountId: selectedAccountId.value as string,
    accountName: account.name,
    date: (date.value || new Date().toISOString().split('T')[0]) as string,
    dueDate: (dueDate.value || '') as string,
    items: items.value.map(i => ({ ...i })),
    subtotal: subtotal.value,
    tax: tax.value,
    total: grandTotal.value,
    status: 'Draft',
    attachments: attachments.value.length > 0 ? [...attachments.value] : undefined,
    recipientEmail: recipientEmail.value || undefined
  });

  isSavingDraft.value = false;
  showSavedSuccess.value = true;
  
  // Give user time to "accept" / see the success message
  setTimeout(() => {
    router.push('/invoices');
  }, 3000);
};

const sendEmail = async () => {
  if (!validateInvoice()) return;
  if (!recipientEmail.value) {
    alert('Please enter a recipient email address');
    return;
  }

  const account = accountsStore.accounts.find(a => a.id == selectedAccountId.value);
  if (!account) return;

  isSendingEmail.value = true;
  try {
    const invoiceId = await invoicesStore.addInvoice({
      accountId: selectedAccountId.value as string,
      accountName: account.name,
      date: (date.value || new Date().toISOString().split('T')[0]) as string,
      dueDate: (dueDate.value || '') as string,
      items: items.value.map(i => ({ ...i })),
      subtotal: subtotal.value,
      tax: tax.value,
      total: grandTotal.value,
      status: 'Draft',
      attachments: attachments.value.length > 0 ? [...attachments.value] : undefined,
      recipientEmail: recipientEmail.value
    });

    const success = await invoicesStore.sendInvoiceEmail(invoiceId, recipientEmail.value);
    if (success) {
      emailSent.value = true;
      setTimeout(() => {
        router.push('/invoices');
      }, 3000);
    }
  } catch (error) {
    alert('Failed to send email. Please try again.');
  } finally {
    isSendingEmail.value = false;
  }
};
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6 pb-20">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <button @click="router.back()" class="p-2 hover:bg-surface-800 rounded-lg text-surface-400 hover:text-white transition-colors">
          <ArrowLeft class="w-5 h-5" />
        </button>
        <div>
          <h2 class="text-2xl font-bold font-display text-white">Create Invoice</h2>
          <p class="text-surface-400 text-sm">Draft a new invoice for a house account.</p>
        </div>
      </div>
    </div>

    <div class="glass-panel p-8">
      <!-- Account & Dates -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 pb-8 border-b border-surface-700/50">
        <div class="space-y-1.5">
          <label class="text-xs font-medium text-surface-400 ml-1">Bill To</label>
          <select v-model="selectedAccountId" class="input-field w-full appearance-none">
            <option value="" disabled>Select Account</option>
            <option v-for="acc in accountsStore.accounts" :key="acc.id" :value="acc.id">
              {{ acc.name }}
            </option>
          </select>
        </div>
        <div class="space-y-1.5">
          <label class="text-xs font-medium text-surface-400 ml-1">Invoice Date</label>
          <input v-model="date" type="date" class="input-field w-full" />
        </div>
        <div class="space-y-1.5">
          <label class="text-xs font-medium text-surface-400 ml-1">Due Date</label>
          <input v-model="dueDate" type="date" class="input-field w-full" />
        </div>
      </div>

      <!-- Line Items -->
      <div class="space-y-4">
        <div class="flex items-center justify-between text-xs font-semibold text-surface-400 uppercase tracking-wider px-2">
           <span class="flex-1">Description</span>
           <span class="w-20 text-center">Qty</span>
           <span class="w-32 text-right">Unit Price</span>
           <span class="w-32 text-right">Amount</span>
           <span class="w-10"></span>
        </div>

        <div v-for="(item, index) in items" :key="item.id" class="flex items-start gap-4 p-2 rounded-xl hover:bg-surface-800/30 transition-colors">
           <div class="flex-1">
             <input 
               v-model="item.description" 
               type="text" 
               class="bg-transparent border-none w-full text-white placeholder-surface-600 focus:ring-0 sm:text-sm p-0" 
               placeholder="Item description..." 
             />
           </div>
           <div class="w-20">
             <input 
               v-model.number="item.qty" 
               @input="updateItemTotal(item)"
               type="number" 
               class="bg-surface-900/50 border border-surface-700/50 rounded-lg w-full text-center text-white text-sm py-1.5 focus:border-primary-500 transition-colors" 
             />
           </div>
           <div class="w-32">
             <div class="relative">
                <span class="absolute left-2.5 top-1.5 text-surface-500 text-xs">$</span>
                <input 
                  v-model.number="item.price" 
                  @input="updateItemTotal(item)"
                  type="number" 
                  step="0.01"
                  class="bg-surface-900/50 border border-surface-700/50 rounded-lg w-full text-right text-white text-sm py-1.5 pr-2.5 pl-6 focus:border-primary-500 transition-colors" 
                />
             </div>
           </div>
           <div class="w-32 text-right font-mono text-white text-sm py-1.5">
             ${{ item.total.toFixed(2) }}
           </div>
           <div class="w-10 flex justify-center py-1">
             <button @click="removeItem(index)" class="text-surface-500 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-400/10">
               <Trash2 class="w-4 h-4" />
             </button>
           </div>
        </div>

        <button @click="addItem" class="flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300 font-medium mt-4 px-2 py-2 rounded-lg hover:bg-primary-400/5 transition-colors group">
          <div class="p-1 rounded bg-primary-400/10 group-hover:bg-primary-400/20 transition-colors">
            <Plus class="w-3 h-3" />
          </div>
          <span>Add Line Item</span>
        </button>
      </div>

      <!-- Attachments & Email Section -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 pt-8 border-t border-surface-700/50">
        <!-- Attachments -->
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <Paperclip class="w-5 h-5 text-surface-400" />
            <h3 class="text-sm font-semibold text-white">Attachments</h3>
            <span v-if="attachments.length > 0" class="text-xs text-surface-500">({{ attachments.length }} file{{ attachments.length !== 1 ? 's' : '' }})</span>
          </div>

          <!-- Dropzone -->
          <div 
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="handleDrop"
            class="relative group"
          >
            <label 
              :class="[
                'flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300',
                isDragging ? 'border-primary-500 bg-primary-500/5' : 'border-surface-700 hover:border-surface-600 bg-surface-900/30'
              ]"
            >
              <div class="p-3 rounded-full bg-surface-800 mb-3 group-hover:scale-110 transition-transform duration-300">
                <Upload class="w-5 h-5 text-surface-400 group-hover:text-primary-400 transition-colors" />
              </div>
              <span class="text-xs font-medium text-surface-400 text-center">
                <span class="text-primary-400">Click to upload</span> or drag and drop<br/>
                JPG, PNG, PDF (Max 10MB)
              </span>
              <input 
                type="file" 
                @change="handleFileUpload" 
                multiple 
                class="hidden" 
                accept="image/*,.pdf"
              />
            </label>
          </div>

          <!-- Attached Files List -->
          <div v-if="attachments.length > 0" class="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            <div 
              v-for="attachment in attachments" 
              :key="attachment.id"
              class="flex items-center gap-3 p-3 bg-surface-900/50 border border-surface-700/50 rounded-lg hover:border-surface-600 transition-colors group"
            >
              <div class="p-2 rounded bg-surface-800 text-primary-400">
                <component :is="getFileIcon(attachment.type)" class="w-4 h-4" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-medium text-white truncate">{{ attachment.name }}</p>
                <p class="text-[10px] text-surface-500 uppercase tracking-tight">{{ formatFileSize(attachment.size) }}</p>
              </div>
              <button 
                @click="removeAttachment(attachment.id)"
                class="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 rounded text-surface-500 hover:text-red-400 transition-all"
              >
                <X class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <!-- Email -->
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <Mail class="w-5 h-5 text-surface-400" />
            <h3 class="text-sm font-semibold text-white">Email Invoice</h3>
          </div>

          <div class="space-y-4">
            <div class="space-y-1.5">
              <label class="text-xs font-medium text-surface-400 ml-1">Recipient Email</label>
              <div class="relative">
                <Mail class="absolute left-3.5 top-3 w-4 h-4 text-surface-500" />
                <input 
                  v-model="recipientEmail" 
                  type="email" 
                  class="input-field w-full pl-10" 
                  placeholder="customer@example.com"
                />
              </div>
            </div>

            <div v-if="emailSent" class="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-emerald-400 animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 class="w-5 h-5" />
              <div>
                <p class="text-sm font-semibold">Email sent!</p>
                <p class="text-xs opacity-80">Invoice successfully dispatched.</p>
              </div>
            </div>

            <!-- Draft Status Success -->
            <div v-if="showSavedSuccess" class="flex items-center gap-3 p-4 bg-primary-500/5 border border-primary-500/20 rounded-xl text-primary-400 animate-in fade-in slide-in-from-top-2">
              <Save class="w-5 h-5" />
              <div>
                <p class="text-sm font-semibold">Draft Saved!</p>
                <p class="text-xs opacity-80">Invoice added to your history.</p>
              </div>
            </div>
            
            <div v-else-if="!emailSent && !showSavedSuccess" class="p-4 bg-surface-900/30 rounded-xl border border-surface-700/50">
              <p class="text-xs text-surface-400 flex items-start gap-2">
                <AlertCircle class="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>The invoice will be saved as a draft and then sent to the recipient immediately.</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Totals & Actions -->
      <div class="mt-12 pt-8 border-t border-surface-700/50 grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
        <div class="hidden md:block">
           <p class="text-xs text-surface-500 max-w-xs">
             Submitting this invoice will update the account's current balance. You can still edit it until it's marked as paid.
           </p>
        </div>
        <div class="space-y-4">
           <div class="flex flex-col items-end space-y-2.5">
             <div class="flex justify-between w-full md:w-64 text-sm">
               <span class="text-surface-400">Subtotal</span>
               <span class="text-white font-mono">${{ subtotal.toFixed(2) }}</span>
             </div>
             <div class="flex justify-between w-full md:w-64 text-sm">
               <span class="text-surface-400">Tax (8%)</span>
               <span class="text-white font-mono">${{ tax.toFixed(2) }}</span>
             </div>
             <div class="flex justify-between w-full md:w-64 pt-3 border-t border-surface-700/50">
               <span class="text-lg font-bold text-white font-display">Grand Total</span>
               <span class="text-2xl font-bold text-emerald-400 font-mono tracking-tight">${{ grandTotal.toFixed(2) }}</span>
             </div>
           </div>
           
           <div class="flex flex-col sm:flex-row gap-3 pt-4">
              <button 
                @click="saveInvoice" 
                class="btn-secondary flex-1 flex items-center justify-center gap-2 group relative overflow-hidden"
                :disabled="isSendingEmail || isSavingDraft || showSavedSuccess || emailSent"
              >
                <div v-if="isSavingDraft" class="flex items-center gap-2">
                  <Loader2 class="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </div>
                <template v-else>
                  <Save class="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>Save Draft</span>
                </template>
              </button>
              <button 
                @click="sendEmail" 
                class="btn-primary flex-[1.5] flex items-center justify-center gap-2 group"
                :disabled="isSendingEmail || isSavingDraft || showSavedSuccess || emailSent"
              >
                <div v-if="isSendingEmail" class="flex items-center gap-2">
                  <Loader2 class="w-4 h-4 animate-spin" />
                  <span>Sending...</span>
                </div>
                <template v-else>
                  <Mail class="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  <span>Send via Email</span>
                </template>
              </button>
           </div>
        </div>
      </div>
    </div>

    <!-- Success Modal Overlay -->
    <Teleport to="body">
      <div 
        v-if="showSavedSuccess || emailSent" 
        class="success-notification-modal fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <div class="glass-panel max-w-sm w-full p-8 text-center space-y-4 animate-in fade-in zoom-in duration-300">
          <div :class="[
            'w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6',
            showSavedSuccess ? 'bg-primary-500/20 text-primary-400' : 'bg-emerald-500/20 text-emerald-400'
          ]">
            <CheckCircle2 v-if="emailSent" class="w-10 h-10" />
            <Save v-else class="w-10 h-10" />
          </div>
          
          <h3 class="text-2xl font-bold text-white font-display">
            {{ emailSent ? 'Invoice Sent!' : 'Draft Saved!' }}
          </h3>
          
          <p class="text-surface-400">
            {{ emailSent 
              ? 'Your invoice has been successfully dispatched to the recipient.' 
              : 'The invoice has been added to your drafts and is ready for later.' 
            }}
          </p>
          
          <div class="pt-6 space-y-4">
            <button 
              @click="router.push('/invoices')"
              class="w-full btn-primary py-3 flex items-center justify-center gap-2"
            >
              <span>Okay, Got it</span>
              <ArrowLeft class="w-4 h-4 rotate-180" />
            </button>

            <div class="space-y-2">
              <div class="h-1 w-full bg-surface-800 rounded-full overflow-hidden">
                <div class="h-full bg-primary-500 animate-progress-fast"></div>
              </div>
              <p class="text-[10px] text-surface-500 uppercase tracking-widest">Auto-redirecting...</p>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
@keyframes progress {
  from { width: 0%; }
  to { width: 100%; }
}

.animate-progress-fast {
  animation: progress 3.5s linear forwards;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #334155;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #475569;
}
</style>

