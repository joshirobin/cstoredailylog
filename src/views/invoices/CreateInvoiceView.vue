<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAccountsStore } from '../../stores/accounts';
import { useInvoicesStore, type InvoiceItem } from '../../stores/invoices';
import { Plus, Trash2, Save, FileText, ArrowLeft } from 'lucide-vue-next';

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

const taxRate = 0.08;

// Auto-fill from Scan if parameters exist
onMounted(() => {
  // Set default due date (Net 30)
  const d = new Date();
  d.setDate(d.getDate() + 30);
  dueDate.value = d.toISOString().split('T')[0] || '';

  if (route.query.scannedTotal) {
    const total = parseFloat(route.query.scannedTotal as string);
    // Reverse calc tax for simplicity or just put it all in one line
    if (items.value[0]) {
      items.value[0].price = total;
      items.value[0].total = total;
      items.value[0].description = 'Scanned Receipt Item (Check attachment)';
    }
    
    // Attempt to match date
    if (route.query.scannedDate) {
       // logic to parse various date formats if needed
       // for now just leave default or alert user
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

const saveInvoice = () => {
  if (!selectedAccountId.value) {
    alert('Please select an account');
    return;
  }

  const account = accountsStore.accounts.find(a => a.id == selectedAccountId.value);
  if (!account) return;

  const defaultDate = new Date().toISOString().split('T')[0];
  const invoiceId = invoicesStore.addInvoice({
    accountId: selectedAccountId.value,
    accountName: account.name,
    date: (date.value || defaultDate) as string,
    dueDate: (dueDate.value || '') as string,
    items: items.value.map(i => ({ ...i })), // copy
    subtotal: subtotal.value,
    tax: tax.value,
    total: grandTotal.value,
    status: 'Sent'
  });

  // Ask to generate PDF immediately
  if (confirm('Invoice saved! Generate PDF now?')) {
    const inv = invoicesStore.invoices.find(i => i.id === invoiceId);
    if (inv) invoicesStore.generateInvoicePDF(inv);
  }

  router.push('/accounts');
};
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <div class="flex items-center gap-4">
      <button @click="router.back()" class="p-2 hover:bg-surface-800 rounded-lg text-surface-400 hover:text-white transition-colors">
        <ArrowLeft class="w-5 h-5" />
      </button>
      <div>
        <h2 class="text-2xl font-bold font-display text-white">Create Invoice</h2>
        <p class="text-surface-400 text-sm">Draft a new invoice for a house account.</p>
      </div>
    </div>

    <div class="glass-panel p-8">
      <!-- Header Info -->
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

        <div v-for="(item, index) in items" :key="item.id" class="flex items-start gap-4 p-2 rounded-lg hover:bg-surface-800/30 transition-colors">
           <div class="flex-1">
             <input v-model="item.description" type="text" class="bg-transparent border-none w-full text-white placeholder-surface-600 focus:ring-0 sm:text-sm p-0" placeholder="Item description..." />
           </div>
           <div class="w-20">
             <input 
               v-model.number="item.qty" 
               @input="updateItemTotal(item)"
               type="number" 
               class="bg-surface-900 border border-surface-700 rounded w-full text-center text-white text-sm py-1" 
             />
           </div>
           <div class="w-32">
             <div class="relative">
                <span class="absolute left-2 top-1.5 text-surface-500 text-xs">$</span>
                <input 
                  v-model.number="item.price" 
                  @input="updateItemTotal(item)"
                  type="number" 
                  step="0.01"
                  class="bg-surface-900 border border-surface-700 rounded w-full text-right text-white text-sm py-1 pr-2 pl-5" 
                />
             </div>
           </div>
           <div class="w-32 text-right font-mono text-white text-sm py-1.5">
             ${{ item.total.toFixed(2) }}
           </div>
           <div class="w-10 flex justify-center">
             <button @click="removeItem(index)" class="text-surface-500 hover:text-red-400 transition-colors">
               <Trash2 class="w-4 h-4" />
             </button>
           </div>
        </div>

        <button @click="addItem" class="flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300 font-medium mt-2 px-2">
          <Plus class="w-4 h-4" />
          <span>Add Line Item</span>
        </button>
      </div>

      <!-- Footer / Totals -->
      <div class="mt-8 pt-8 border-t border-surface-700/50 flex flex-col items-end space-y-3">
         <div class="flex justify-between w-64 text-sm">
           <span class="text-surface-400">Subtotal</span>
           <span class="text-white font-mono">${{ subtotal.toFixed(2) }}</span>
         </div>
         <div class="flex justify-between w-64 text-sm">
           <span class="text-surface-400">Tax (8%)</span>
           <span class="text-white font-mono">${{ tax.toFixed(2) }}</span>
         </div>
         <div class="flex justify-between w-64 text-lg font-bold">
           <span class="text-white">Total</span>
           <span class="text-emerald-400 font-mono">${{ grandTotal.toFixed(2) }}</span>
         </div>
         
         <div class="pt-6 flex gap-4">
           <button class="btn-secondary flex items-center gap-2">
             <FileText class="w-4 h-4" />
             <span>Save as Draft</span>
           </button>
           <button @click="saveInvoice" class="btn-primary flex items-center gap-2">
             <Save class="w-4 h-4" />
             <span>Save & Send</span>
           </button>
         </div>
      </div>
    </div>
  </div>
</template>
