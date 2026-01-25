<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useSalesStore, type DenominationCounts, type Check } from '../../stores/sales';
import { 
  Save, AlertCircle, CheckCircle2, History as HistoryIcon, 
  Plus, Trash2, Vault, DollarSign, Calendar, 
  Edit3, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  TrendingUp, Wallet, Receipt,
  Sparkles, Clock, Calculator, Loader2,
  Paperclip, ExternalLink, FileText
} from 'lucide-vue-next';
import CashDenominations from '../../components/CashDenominations.vue';
import { storage } from '../../firebaseConfig';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

const salesStore = useSalesStore();

onMounted(async () => {
    await salesStore.fetchLogs();
    checkExistingLog();
});

const openingCash = ref<number>(0);
const closingCash = ref<number>(0);
const openingDetails = ref<DenominationCounts | undefined>(undefined);
const closingDetails = ref<DenominationCounts | undefined>(undefined);

// Safe Deposit
const safeCash = ref<number>(0);
const safeDetails = ref<DenominationCounts | undefined>(undefined);
const checks = ref<Check[]>([]);

const expenses = ref<number>(0); 
const notes = ref('');
const isSubmitting = ref(false);
const isUploading = ref(false);
const statusMessage = ref<{ type: 'success' | 'error', text: string } | null>(null);

// Reports / Attachments
const lottoUrl = ref('');
const lottoFile = ref<File | null>(null);
const otherUrl = ref('');
const otherFile = ref<File | null>(null);

// UI Expansion State
const isOpeningExpanded = ref(false);
const isClosingExpanded = ref(false);

// Date Navigation for Logic
const selectedDate = ref<string>(new Date().toISOString().split('T')[0] as string);

// Navigate ID
const navigateDate = (days: number) => {
  const date = new Date(selectedDate.value);
  date.setDate(date.getDate() + days);
  selectedDate.value = date.toISOString().split('T')[0] as string;
  checkExistingLog();
};

const checkExistingLog = () => {
   const existingLog = salesStore.logs.find(l => l.date === selectedDate.value);
   if (existingLog) {
       loadLogForEditing(existingLog);
   } else {
       resetForm();
       
       // Sync Opening Cash from previous day's Closing Cash
       const prevLog = salesStore.logs
           .filter(l => l.date < selectedDate.value)
           .sort((a, b) => b.date.localeCompare(a.date))[0];
       
       if (prevLog && prevLog.closingCash !== undefined) {
           openingCash.value = prevLog.closingCash;
           openingDetails.value = JSON.parse(JSON.stringify(prevLog.closingDenominations || { bills: [], coins: [] }));
           // Small notification to user
           statusMessage.value = { type: 'success', text: `Carried over $${prevLog.closingCash.toFixed(2)} from ${prevLog.date}` };
           setTimeout(() => statusMessage.value = null, 3000);
       }

       if (editingLogId.value && salesStore.logs.find(l => l.id === editingLogId.value)?.date !== selectedDate.value) {
           editingLogId.value = null;
       }
   }
};

// Watch for date change to load log
watch(selectedDate, () => {
    checkExistingLog();
});

// Edit mode
const editingLogId = ref<string | null>(null);

// Date filtering
type DateFilter = 'today' | 'week' | 'month' | 'year' | 'all';
const selectedFilter = ref<DateFilter>('all');
const expandedLogIds = ref<Set<string>>(new Set());

// Delete confirmation
const deleteConfirmLogId = ref<string | null>(null);

const dailySales = computed(() => {
  return (closingCash.value - openingCash.value) - expenses.value;
});

const checksTotal = computed(() => {
  return checks.value.reduce((sum, check) => sum + (check.amount || 0), 0);
});

const safeTotal = computed(() => {
  return safeCash.value + checksTotal.value;
});

// Filtered logs based on date range
const filteredLogs = computed(() => {
  const now = new Date();
  let startDate: Date;

  switch (selectedFilter.value) {
    case 'today':
      startDate = new Date(now.setHours(0, 0, 0, 0));
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      return salesStore.logs; 
  }

  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  return salesStore.getLogsByDateRange(startDate, endDate);
});

const toggleLogExpansion = (logId: string) => {
  if (expandedLogIds.value.has(logId)) {
    expandedLogIds.value.delete(logId);
  } else {
    expandedLogIds.value.add(logId);
  }
};

const loadLogForEditing = (log: any) => {
  editingLogId.value = log.id;
  openingCash.value = log.openingCash;
  openingDetails.value = log.openingDenominations;
  closingCash.value = log.closingCash;
  closingDetails.value = log.closingDenominations;
  expenses.value = log.expenses;
  notes.value = log.notes || '';
  safeCash.value = log.safeCash || 0;
  safeDetails.value = log.safeCashDetails;
  checks.value = log.checks || [];
  lottoUrl.value = log.lottoReport || '';
  otherUrl.value = log.otherReport || '';
  lottoFile.value = null;
  otherFile.value = null;

  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
};

const cancelEdit = () => {
  editingLogId.value = null;
  resetForm();
};

const resetForm = () => {
  openingCash.value = 0;
  closingCash.value = 0;
  openingDetails.value = undefined;
  closingDetails.value = undefined;
  safeCash.value = 0;
  safeDetails.value = undefined;
  checks.value = [];
  expenses.value = 0;
  notes.value = '';
  lottoUrl.value = '';
  otherUrl.value = '';
  lottoFile.value = null;
  otherFile.value = null;
};

const confirmDelete = (logId: string) => {
  deleteConfirmLogId.value = logId;
};

const cancelDelete = () => {
  deleteConfirmLogId.value = null;
};

const deleteLog = () => {
  if (deleteConfirmLogId.value) {
    salesStore.deleteLog(deleteConfirmLogId.value);
    deleteConfirmLogId.value = null;
    statusMessage.value = { type: 'success', text: 'Log deleted successfully!' };
    setTimeout(() => { statusMessage.value = null; }, 3000);
  }
};

const handleLottoFile = (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) lottoFile.value = target.files[0];
};

const handleOtherFile = (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) otherFile.value = target.files[0];
};

const addCheck = () => {
  checks.value.push({ number: '', amount: 0 });
};

const removeCheck = (index: number) => {
  checks.value.splice(index, 1);
};

const totalSalesThisWeek = computed(() => {
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  return salesStore.logs
    .filter(l => new Date(l.date) >= lastWeek)
    .reduce((sum, l) => sum + (l.totalSales || 0), 0);
});

const totalSalesThisMonth = computed(() => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  return salesStore.logs
    .filter(l => new Date(l.date) >= startOfMonth)
    .reduce((sum, l) => sum + (l.totalSales || 0), 0);
});

const saveDailyLog = async () => {
  if (openingCash.value === 0 && closingCash.value === 0) {
    statusMessage.value = { type: 'error', text: 'Please enter details for Opening and Closing cash.' };
    return;
  }

  isSubmitting.value = true;
  statusMessage.value = null;

  try {
    let finalLottoUrl = lottoUrl.value;
    let finalOtherUrl = otherUrl.value;

    if (lottoFile.value || otherFile.value) {
        isUploading.value = true;
        
        if (lottoFile.value) {
            const fileRef = storageRef(storage, `sales_reports/${selectedDate.value}/lotto-${lottoFile.value.name}-${Date.now()}`);
            await uploadBytes(fileRef, lottoFile.value);
            finalLottoUrl = await getDownloadURL(fileRef);
        }
        
        if (otherFile.value) {
            const fileRef = storageRef(storage, `sales_reports/${selectedDate.value}/other-${otherFile.value.name}-${Date.now()}`);
            await uploadBytes(fileRef, otherFile.value);
            finalOtherUrl = await getDownloadURL(fileRef);
        }
        isUploading.value = false;
    }

    const logData = {
        date: selectedDate.value,
        openingCash: Number(openingCash.value) || 0,
        openingDenominations: openingDetails.value,
        closingCash: Number(closingCash.value) || 0,
        closingDenominations: closingDetails.value,
        expenses: Number(expenses.value) || 0,
        totalSales: Number(dailySales.value) || 0,
        notes: notes.value || '',
        safeCash: Number(safeCash.value) || 0,
        safeCashDetails: safeDetails.value,
        checks: checks.value.length > 0 ? checks.value : undefined,
        safeTotal: Number(safeTotal.value) || 0,
        lottoReport: finalLottoUrl,
        otherReport: finalOtherUrl
    };

    if (editingLogId.value) {
      await salesStore.updateLog(editingLogId.value, logData);
      statusMessage.value = { type: 'success', text: 'Daily sales log updated successfully!' };
      editingLogId.value = null;
    } else {
      await salesStore.addLog(logData);
      statusMessage.value = { type: 'success', text: 'Daily sales log saved successfully!' };
    }
    
    resetForm();
    setTimeout(() => { statusMessage.value = null; }, 3000);
    
  } catch (error) {
    console.error("Error saving sales log: ", error);
    statusMessage.value = { type: 'error', text: 'Failed to save log. Please try again.' };
  } finally {
    isSubmitting.value = false;
    isUploading.value = false;
  }
};
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-10 pb-20">
    <!-- Premium Header & Quick Stats -->
    <div class="space-y-8">
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div class="space-y-2">
          <div class="flex items-center gap-2 px-3 py-1 bg-primary-500/10 border border-primary-500/20 rounded-full w-fit">
            <Sparkles class="w-3.5 h-3.5 text-primary-400" />
            <span class="text-[10px] uppercase tracking-widest font-bold text-primary-400">Financial Suite</span>
          </div>
          <h2 class="text-4xl font-extrabold font-display text-white tracking-tight">Daily <span class="text-primary-400">Sales</span></h2>
          <p class="text-surface-400 text-base max-w-md">Precision tracking for your shift operations, denominations, and safe deposits.</p>
        </div>

        <!-- Hero Sales Widget -->
        <div class="glass-card p-1 pr-6 flex items-center gap-6 group hover:border-emerald-500/30 transition-all duration-500">
          <div class="bg-gradient-to-br from-emerald-500 to-teal-600 p-5 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] group-hover:scale-105 transition-transform">
            <TrendingUp class="w-8 h-8 text-white" />
          </div>
          <div>
            <div class="text-[10px] text-surface-400 uppercase tracking-[0.2em] font-bold mb-1">Today's Performance</div>
            <div class="text-3xl font-black font-mono tracking-tighter" :class="dailySales >= 0 ? 'text-emerald-400' : 'text-rose-400'">
              ${{ dailySales.toFixed(2) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Stats Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div class="stats-card bg-surface-800/20">
          <div class="stats-icon bg-blue-500/10 text-blue-400"><Wallet class="w-5 h-5" /></div>
          <div>
            <p class="stats-label">Net Sales (7D)</p>
            <p class="stats-value">${{ totalSalesThisWeek.toLocaleString(undefined, { minimumFractionDigits: 2 }) }}</p>
          </div>
        </div>
        <div class="stats-card bg-surface-800/20">
          <div class="stats-icon bg-purple-500/10 text-purple-400"><TrendingUp class="w-5 h-5" /></div>
          <div>
            <p class="stats-label">Net Sales (Month)</p>
            <p class="stats-value">${{ totalSalesThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2 }) }}</p>
          </div>
        </div>
        <div class="stats-card bg-surface-800/20">
          <div class="stats-icon bg-amber-500/10 text-amber-400"><HistoryIcon class="w-5 h-5" /></div>
          <div>
            <p class="stats-label">Active Logs</p>
            <p class="stats-value">{{ salesStore.logs.length }} records</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Layout Container -->
    <div class="grid grid-cols-1 xl:grid-cols-12 gap-10 items-start">
      
      <!-- Primary Entry Form (Left / Main) -->
      <div class="xl:col-span-8 space-y-8">
        <!-- Date Selector Card -->
        <div class="glass-panel p-6 flex flex-col sm:flex-row items-center justify-between gap-6 border-t-2 border-t-primary-500">
          <div class="flex items-center gap-4">
            <div class="p-3 bg-primary-500/10 rounded-xl">
              <Calendar class="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <h3 class="text-white font-bold text-lg leading-tight">{{ editingLogId ? 'Modify Record' : 'Create New Log' }}</h3>
              <p class="text-surface-500 text-xs">Processing for: <span class="text-primary-400 font-semibold">{{ selectedDate }}</span></p>
            </div>
          </div>

          <div class="flex items-center bg-surface-900/50 p-1.5 rounded-xl border border-surface-700/50 group focus-within:border-primary-500/50 transition-colors">
            <button @click="navigateDate(-1)" class="p-2.5 hover:bg-surface-800 rounded-lg text-surface-400 hover:text-white transition-all"><ChevronLeft class="w-5 h-5" /></button>
            <input type="date" v-model="selectedDate" class="bg-transparent border-none text-white font-bold text-sm focus:ring-0 px-4 w-[160px] text-center" />
            <button @click="navigateDate(1)" class="p-2.5 hover:bg-surface-800 rounded-lg text-surface-400 hover:text-white transition-all"><ChevronRight class="w-5 h-5" /></button>
          </div>
        </div>

        <!-- Input Sections -->
        <div class="space-y-8">
          <!-- Section 1: Cash Operations -->
          <div class="section-card">
            <div class="section-header">
              <div class="section-icon bg-emerald-500/10 text-emerald-400"><DollarSign class="w-5 h-5" /></div>
              <h3 class="text-white font-bold text-lg">Register Balance</h3>
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
              <div class="space-y-4">
                <div 
                  class="flex items-center justify-between px-3 py-2.5 bg-surface-900/50 rounded-xl cursor-pointer hover:bg-surface-800 transition-all border border-transparent hover:border-surface-700"
                  @click="isOpeningExpanded = !isOpeningExpanded"
                >
                   <div class="flex items-center gap-2">
                     <span class="text-xs uppercase tracking-widest font-bold text-surface-400">Opening Cash</span>
                     <component :is="isOpeningExpanded ? ChevronUp : ChevronDown" class="w-4 h-4 text-surface-500" />
                   </div>
                   <span class="text-sm font-mono font-bold text-emerald-400">${{ openingCash.toFixed(2) }}</span>
                </div>
                <div v-if="isOpeningExpanded" class="animate-in fade-in slide-in-from-top-2 duration-300">
                  <CashDenominations label="Morning Count" v-model="openingCash" @update:details="(d) => openingDetails = d" />
                </div>
              </div>
              <div class="space-y-4">
                <div 
                  class="flex items-center justify-between px-3 py-2.5 bg-surface-900/50 rounded-xl cursor-pointer hover:bg-surface-800 transition-all border border-transparent hover:border-surface-700"
                  @click="isClosingExpanded = !isClosingExpanded"
                >
                   <div class="flex items-center gap-2">
                     <span class="text-xs uppercase tracking-widest font-bold text-surface-400">Closing Cash</span>
                     <component :is="isClosingExpanded ? ChevronUp : ChevronDown" class="w-4 h-4 text-surface-500" />
                   </div>
                   <span class="text-sm font-mono font-bold text-primary-400">${{ closingCash.toFixed(2) }}</span>
                </div>
                <div v-if="isClosingExpanded" class="animate-in fade-in slide-in-from-top-2 duration-300">
                  <CashDenominations label="End of Shift" v-model="closingCash" @update:details="(d) => closingDetails = d" />
                </div>
              </div>
            </div>
          </div>

          <!-- Section 2: Safe & Checks -->
          <div class="section-card">
            <div class="section-header justify-between">
              <div class="flex items-center gap-4">
                <div class="section-icon bg-amber-500/10 text-amber-400"><Vault class="w-5 h-5" /></div>
                <h3 class="text-white font-bold text-lg">Safe Deposit</h3>
              </div>
              <div class="text-right">
                <span class="text-[10px] text-surface-500 uppercase font-bold block mb-0.5">Deposit Total</span>
                <span class="text-lg font-mono font-bold text-amber-400">${{ safeTotal.toFixed(2) }}</span>
              </div>
            </div>
            
            <div class="p-6 space-y-8">
              <CashDenominations label="Deposit Pickup" v-model="safeCash" @update:details="(d) => safeDetails = d" />
              
              <div class="bg-surface-900/40 rounded-2xl p-6 border border-surface-800">
                <div class="flex items-center justify-between mb-6">
                  <div class="flex items-center gap-3">
                    <Receipt class="w-4 h-4 text-surface-400" />
                    <h4 class="text-sm font-bold text-surface-200">Checks & Money Orders</h4>
                  </div>
                  <button @click="addCheck" class="text-[10px] font-bold uppercase tracking-wider text-primary-400 hover:text-primary-300 flex items-center gap-2 transition-colors">
                    <Plus class="w-3.5 h-3.5" /> Add New
                  </button>
                </div>

                <div v-if="checks.length > 0" class="space-y-4">
                  <div v-for="(check, idx) in checks" :key="idx" class="flex items-center gap-4 animate-in slide-in-from-left-4 duration-300">
                    <div class="flex-1 relative group">
                      <div class="absolute left-3 top-3 text-surface-600 group-focus-within:text-primary-400 transition-colors">#</div>
                      <input v-model="check.number" type="text" placeholder="Check Number" class="modern-input pl-8" />
                    </div>
                    <div class="w-32 relative group">
                      <div class="absolute left-3 top-3 text-surface-600 group-focus-within:text-emerald-400 transition-colors">$</div>
                      <input v-model.number="check.amount" type="number" step="0.01" class="modern-input pl-8 text-right font-mono" />
                    </div>
                    <button @click="removeCheck(idx)" class="p-3 text-surface-600 hover:text-rose-400 hover:bg-rose-400/10 rounded-xl transition-all"><Trash2 class="w-4.5 h-4.5" /></button>
                  </div>
                  <div class="pt-4 border-t border-surface-800 flex justify-between items-center text-xs font-bold uppercase tracking-widest text-surface-500">
                    <span>Subtotal</span>
                    <span class="text-white font-mono text-sm">${{ checksTotal.toFixed(2) }}</span>
                  </div>
                </div>
                <div v-else class="text-center py-6 text-surface-600 text-xs italic">No checks recorded for this log</div>
              </div>
            </div>
          </div>

          <!-- Section 3: Finalization -->
          <div class="section-card">
            <div class="section-header"><div class="section-icon bg-rose-500/10 text-rose-400"><Calculator class="w-5 h-5" /></div><h3 class="text-white font-bold text-lg">Review & Save</h3></div>
            <div class="p-6 space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div class="space-y-4">
                  <label class="text-xs font-bold text-surface-400 uppercase tracking-widest">Shift Expenses / Payouts</label>
                  <div class="relative group">
                    <div class="absolute left-4 top-4 text-surface-600 group-focus-within:text-rose-400 transition-colors">$</div>
                    <input v-model.number="expenses" type="number" step="0.01" class="modern-input pl-10 text-lg font-bold text-rose-400 bg-rose-500/5 placeholder-rose-500/20" placeholder="0.00" />
                  </div>

                  <!-- Attachments Grid -->
                  <div class="grid grid-cols-2 gap-4 pt-2">
                    <!-- Lotto Report -->
                    <div class="space-y-2">
                      <label class="text-[10px] font-bold text-surface-500 uppercase tracking-wider">Lotto Cash Report</label>
                      <div class="flex items-center gap-2">
                         <label class="flex-1 cursor-pointer">
                            <div class="flex items-center gap-2 px-3 py-2 bg-surface-900 border border-surface-800 rounded-xl hover:bg-surface-800 transition-colors group">
                                <Paperclip class="w-3.5 h-3.5 text-surface-500 group-hover:text-primary-400" />
                                <span class="text-[10px] text-surface-400 truncate">{{ lottoFile ? lottoFile.name : (lottoUrl ? 'Replace Report' : 'Attach Report') }}</span>
                            </div>
                            <input type="file" @change="handleLottoFile" class="hidden" accept="image/*,application/pdf" />
                         </label>
                         <a v-if="lottoUrl" :href="lottoUrl" target="_blank" class="p-2 bg-primary-500/10 text-primary-400 rounded-xl hover:bg-primary-500/20 transition-colors">
                            <ExternalLink class="w-3.5 h-3.5" />
                         </a>
                      </div>
                    </div>
                    <!-- Other Report -->
                    <div class="space-y-2">
                      <label class="text-[10px] font-bold text-surface-500 uppercase tracking-wider">Other Report</label>
                      <div class="flex items-center gap-2">
                         <label class="flex-1 cursor-pointer">
                            <div class="flex items-center gap-2 px-3 py-2 bg-surface-900 border border-surface-800 rounded-xl hover:bg-surface-800 transition-colors group">
                                <FileText class="w-3.5 h-3.5 text-surface-500 group-hover:text-primary-400" />
                                <span class="text-[10px] text-surface-400 truncate">{{ otherFile ? otherFile.name : (otherUrl ? 'Replace Report' : 'Attach Report') }}</span>
                            </div>
                            <input type="file" @change="handleOtherFile" class="hidden" accept="image/*,application/pdf" />
                         </label>
                         <a v-if="otherUrl" :href="otherUrl" target="_blank" class="p-2 bg-primary-500/10 text-primary-400 rounded-xl hover:bg-primary-500/20 transition-colors">
                            <ExternalLink class="w-3.5 h-3.5" />
                         </a>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="space-y-3">
                   <label class="text-xs font-bold text-surface-400 uppercase tracking-widest">Internal Notes</label>
                   <textarea v-model="notes" class="modern-input min-h-[160px] py-4 leading-relaxed" placeholder="Record any shift discrepancies or important updates..."></textarea>
                </div>
              </div>

              <div class="flex items-center gap-4 pt-4 border-t border-surface-800">
                <button v-if="editingLogId" @click="cancelEdit" class="px-6 py-4 rounded-2xl bg-surface-800 text-white font-bold hover:bg-surface-700 transition-all">Cancel</button>
                <button 
                  @click="saveDailyLog" 
                  :disabled="isSubmitting || isUploading"
                  class="flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-bold shadow-lg shadow-primary-500/20 hover:shadow-primary-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50"
                >
                  <Save v-if="!isSubmitting && !isUploading" class="w-5 h-5" />
                  <Loader2 v-else class="w-5 h-5 animate-spin" />
                  <span>{{ isUploading ? 'Uploading Files...' : (isSubmitting ? 'Processing...' : (editingLogId ? 'Update Activity' : 'Commit Daily Log')) }}</span>
                </button>
              </div>

              <div v-if="statusMessage" 
                class="flex items-center gap-3 p-4 rounded-2xl animate-in fade-in zoom-in duration-300"
                :class="statusMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'"
              >
                <CheckCircle2 v-if="statusMessage.type === 'success'" class="w-5 h-5" />
                <AlertCircle v-else class="w-5 h-5" />
                <span class="font-bold text-sm">{{ statusMessage.text }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sidebar: Right (History) -->
      <div class="xl:col-span-4 space-y-6">
        <div class="sticky top-10 space-y-6">
          <div class="glass-panel p-6 border-b-2 border-b-amber-500">
             <div class="flex items-center justify-between mb-8">
                <div class="flex items-center gap-3">
                   <HistoryIcon class="w-5 h-5 text-amber-400" />
                   <h3 class="text-lg font-bold text-white">Archives</h3>
                </div>
                <div class="bg-surface-800 px-3 py-1 rounded-full text-[10px] font-bold text-surface-400 tracking-tighter">{{ filteredLogs.length }} RECORDS</div>
             </div>

             <!-- Mini Filter Tabs -->
             <div class="flex flex-wrap gap-2 mb-8">
               <button v-for="f in (['today', 'week', 'month'] as const)" :key="f"
                 @click="selectedFilter = f"
                 class="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                 :class="selectedFilter === f ? 'bg-amber-500 text-black' : 'bg-surface-800 text-surface-400 hover:text-white'"
               >{{ f }}</button>
               <button @click="selectedFilter = 'all'" class="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all" :class="selectedFilter === 'all' ? 'bg-amber-500 text-black' : 'bg-surface-800 text-surface-400 hover:text-white'">All</button>
             </div>

             <!-- Scrolled Logs List -->
             <div class="space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                <div v-for="log in filteredLogs" :key="log.id" 
                  class="group relative bg-surface-900/40 hover:bg-surface-800/80 rounded-2xl border border-surface-800 hover:border-surface-600 transition-all duration-300 p-5 cursor-pointer"
                  @click="toggleLogExpansion(log.id)"
                >
                   <div class="flex items-center justify-between">
                      <div>
                        <div class="text-xs font-bold text-white">{{ new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) }}</div>
                        <div class="text-[10px] text-surface-500 font-medium uppercase tracking-widest mt-0.5">{{ new Date(log.date).toLocaleDateString(undefined, { weekday: 'long' }) }}</div>
                      </div>
                      <div class="text-right">
                        <div class="text-sm font-black font-mono tracking-tighter" :class="log.totalSales >= 0 ? 'text-emerald-400' : 'text-rose-400'">
                          ${{ log.totalSales.toFixed(2) }}
                        </div>
                        <div class="text-[8px] text-surface-600 font-black uppercase">Net Sales</div>
                      </div>
                   </div>

                   <div class="flex items-center justify-end gap-3 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button @click.stop="loadLogForEditing(log)" class="p-2 text-surface-500 hover:text-primary-400 transition-colors"><Edit3 class="w-4 h-4" /></button>
                      <button @click.stop="confirmDelete(log.id)" class="p-2 text-surface-500 hover:text-rose-400 transition-colors"><Trash2 class="w-4 h-4" /></button>
                   </div>
                </div>
                <div v-if="filteredLogs.length === 0" class="text-center py-20">
                   <Clock class="w-8 h-8 text-surface-800 mx-auto mb-3" />
                   <p class="text-xs text-surface-600 font-medium uppercase tracking-widest">Empty Archives</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Modal Overlay -->
    <div v-if="deleteConfirmLogId" class="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] animate-in fade-in duration-300">
      <div class="glass-panel p-8 max-w-sm w-full mx-4 border-2 border-rose-500/20 scale-in-center">
        <div class="text-center space-y-4 mb-8">
          <div class="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle class="w-8 h-8 text-rose-400" />
          </div>
          <h3 class="text-xl font-bold text-white">Permanently Delete?</h3>
          <p class="text-sm text-surface-400">This action will remove all data for this record and cannot be undone.</p>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <button @click="cancelDelete" class="py-3 rounded-xl bg-surface-800 text-white font-bold hover:bg-surface-700 transition-all">Cancel</button>
          <button @click="deleteLog" class="py-3 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-500 shadow-lg shadow-rose-900/20 transition-all">Confirm</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-card {
  @apply glass-panel p-5 flex items-center gap-5 border-none transition-all hover:translate-y-[-2px] hover:shadow-xl duration-300;
}
.stats-icon {
  @apply p-3.5 rounded-2xl;
}
.stats-label {
  @apply text-xs text-surface-500 font-bold uppercase tracking-wider mb-0.5;
}
.stats-value {
  @apply text-xl font-black font-mono text-white tracking-tight;
}

.section-card {
  @apply glass-panel p-0 border-none overflow-hidden bg-surface-900/20;
}
.section-header {
  @apply px-6 py-5 bg-surface-800/30 border-b border-surface-800 flex items-center gap-4;
}
.section-icon {
  @apply p-3 rounded-xl;
}

.modern-input {
  @apply w-full bg-surface-900 border border-surface-800 rounded-2xl px-5 py-3.5 text-white placeholder-surface-700 focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 hover:border-surface-700 transition-all outline-none;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  @apply bg-transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  @apply bg-surface-800 rounded-full;
}
</style>
