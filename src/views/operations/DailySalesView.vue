<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useSalesStore, type DenominationCounts, type SalesLog } from '../../stores/sales';
import { 
  Save, AlertCircle, History as HistoryIcon, 
  Trash2, Calendar, 
  Edit3, ChevronLeft, ChevronRight,
  TrendingUp, Wallet,
  Sparkles, Clock, Calculator, Loader2,
  Paperclip, FileText, CheckCircle2
} from 'lucide-vue-next';
import CashDenominations from '../../components/CashDenominations.vue';
import DailyReconciliationForm from './components/DailyReconciliationForm.vue';
import PdiReconciliationForm from './components/PdiReconciliationForm.vue';
import { storage } from '../../firebaseConfig';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNotificationStore } from '../../stores/notifications';

const salesStore = useSalesStore();

onMounted(async () => {
    await salesStore.fetchLogs();
    checkExistingLog();
});

const currentLogForm = ref<Partial<SalesLog>>({
    openingCash: 0, closingCash: 0, safeCash: 0, expenses: 0, checks: [], notes: '',
    creditCardSummary: { visa: 0, mastercard: 0, amex: 0, discover: 0, other: 0, total: 0 },
    fuelSalesSummary: { regularGallons: 0, regularSales: 0, premiumGallons: 0, premiumSales: 0, dieselGallons: 0, dieselSales: 0, total: 0 },
    lotteryReconciliation: { openingBalance: 0, lotterySales: 0, lotteryPaidOut: 0, settlementsPaid: 0, endingBalance: 0 },
    safeReconciliation: { openingSafeBalance: 0, cashDrops: 0, cashRemoved: 0, endingSafeBalance: 0 },
    paidOutLog: [],
    depositSummary: { cashDeposit: 0, coins: 0, total: 0, depositBagNumber: '' },
    posZReportSummary: { insideSales: 0, fuelSales: 0, lotterySales: 0, totalSales: 0 },
    signatures: { cashierSignature: '', managerSignature: '', date: '' },
    cashSales: 0, lotteryCashSales: 0, safeCashAdded: 0, otherCashIn: 0, safeDrops: 0, lotteryPaidOut: 0, bankDeposit: 0, otherCashOut: 0
});
const openingDetails = ref<DenominationCounts | undefined>(undefined);
const closingDetails = ref<DenominationCounts | undefined>(undefined);
const safeDetails = ref<DenominationCounts | undefined>(undefined);
const isSubmitting = ref(false);
const isUploading = ref(false);
const notificationStore = useNotificationStore();

// Reports / Attachments
const lottoUrl = ref('');
const lottoFile = ref<File | null>(null);
const otherUrl = ref('');
const otherFile = ref<File | null>(null);

// UI Expansion State
const activeAuditType = ref<'opening' | 'closing' | 'safe' | null>(null);


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
           currentLogForm.value.openingCash = prevLog.closingCash;
           openingDetails.value = JSON.parse(JSON.stringify(prevLog.closingDenominations || { bills: {}, coins: {} }));
            notificationStore.info(`Carried over $${prevLog.closingCash.toFixed(2)} from ${prevLog.date}`, "Data Sync");
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
  if (currentLogForm.value.pdiForm) {
      return (currentLogForm.value.pdiForm.taxableSales || 0) + 
             (currentLogForm.value.pdiForm.nonTaxable || 0) + 
             (currentLogForm.value.pdiForm.salesTax || 0) + 
             (currentLogForm.value.pdiForm.fuelSalesTotal || 0) + 
             (currentLogForm.value.pdiForm.lotterySales || 0) + 
             (currentLogForm.value.pdiForm.otherSales || 0);
  }
  return ((currentLogForm.value.closingCash || 0) - (currentLogForm.value.openingCash || 0)) - (currentLogForm.value.expenses || 0);
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

const loadLogForEditing = (log: SalesLog) => {
    editingLogId.value = log.id;
    selectedDate.value = log.date;
    currentLogForm.value = JSON.parse(JSON.stringify(log));
    openingDetails.value = log.openingDenominations;
    closingDetails.value = log.closingDenominations;
    safeDetails.value = log.safeCashDetails;
    lottoUrl.value = log.lottoUrl || '';
    otherUrl.value = log.otherUrl || '';
    lottoFile.value = null;
    otherFile.value = null;
};

const cancelEdit = () => {
    editingLogId.value = null;
    resetForm();
};

const resetForm = () => {
    currentLogForm.value = {
        openingCash: 0, closingCash: 0, safeCash: 0, expenses: 0, checks: [], notes: '',
        creditCardSummary: { visa: 0, mastercard: 0, amex: 0, discover: 0, other: 0, total: 0 },
        fuelSalesSummary: { regularGallons: 0, regularSales: 0, premiumGallons: 0, premiumSales: 0, dieselGallons: 0, dieselSales: 0, total: 0 },
        lotteryReconciliation: { openingBalance: 0, lotterySales: 0, lotteryPaidOut: 0, settlementsPaid: 0, endingBalance: 0 },
        safeReconciliation: { openingSafeBalance: 0, cashDrops: 0, cashRemoved: 0, endingSafeBalance: 0 },
        paidOutLog: [],
        depositSummary: { cashDeposit: 0, coins: 0, total: 0, depositBagNumber: '' },
        posZReportSummary: { insideSales: 0, fuelSales: 0, lotterySales: 0, totalSales: 0 },
        signatures: { cashierSignature: '', managerSignature: '', date: '' },
        cashSales: 0, lotteryCashSales: 0, safeCashAdded: 0, otherCashIn: 0, safeDrops: 0, lotteryPaidOut: 0, bankDeposit: 0, otherCashOut: 0
    };
    openingDetails.value = undefined;
    closingDetails.value = undefined;
    safeDetails.value = undefined;
    lottoUrl.value = '';
    otherUrl.value = '';
    lottoFile.value = null;
    otherFile.value = null;
};

const handleLottoFile = (e: any) => {
    lottoFile.value = e.target.files[0];
};

const handleOtherFile = (e: any) => {
    otherFile.value = e.target.files[0];
};

const saveDailyLog = async () => {
  isSubmitting.value = true;
  try {
     let currentLottoUrl = lottoUrl.value;
     let currentOtherUrl = otherUrl.value;

     if (lottoFile.value) {
        isUploading.value = true;
        const sRef = storageRef(storage, `sales_reports/${selectedDate.value}_lotto_${lottoFile.value.name}`);
        await uploadBytes(sRef, lottoFile.value);
        currentLottoUrl = await getDownloadURL(sRef);
     }

     if (otherFile.value) {
        isUploading.value = true;
        const sRef = storageRef(storage, `sales_reports/${selectedDate.value}_global_${otherFile.value.name}`);
        await uploadBytes(sRef, otherFile.value);
        currentOtherUrl = await getDownloadURL(sRef);
     }

     const logData = JSON.parse(JSON.stringify({
        ...(currentLogForm.value as any),
        date: selectedDate.value,
        openingDenominations: openingDetails.value || null,
        closingDenominations: closingDetails.value || null,
        safeCashDetails: safeDetails.value || null,
        totalSales: dailySales.value || 0,
        lottoUrl: currentLottoUrl,
        otherUrl: currentOtherUrl,
        status: 'PENDING_REVIEW',
        submittedBy: 'Manager' 
     }));

     if (editingLogId.value) {
        await salesStore.updateLog(editingLogId.value, logData);
        notificationStore.success('Daily activity record updated', 'Success');
     } else {
        await salesStore.addLog(logData);
        notificationStore.success('New daily log committed to archives', 'Success');
     }
     
     resetForm();
     editingLogId.value = null;
  } catch (error) {
     console.error(error);
     notificationStore.error('System failure while saving log', 'Error');
  } finally {
     isSubmitting.value = false;
     isUploading.value = false;
  }
};

const confirmDelete = (id: string) => {
    deleteConfirmLogId.value = id;
};

const cancelDelete = () => {
    deleteConfirmLogId.value = null;
};

const deleteLog = async () => {
    if (!deleteConfirmLogId.value) return;
    try {
        await salesStore.deleteLog(deleteConfirmLogId.value);
        notificationStore.success('Record purged from archives', 'Purge Complete');
        if (editingLogId.value === deleteConfirmLogId.value) {
            cancelEdit();
        }
    } catch (e) {
        notificationStore.error('Delete failed', 'Error');
    } finally {
        deleteConfirmLogId.value = null;
    }
};

const verifyLog = async (id: string) => {
    try {
        await salesStore.updateLogStatus(id, 'VERIFIED');
        notificationStore.success('Log verified and frozen', 'Security');
    } catch (e) {
        notificationStore.error('Verification failed', 'Error');
    }
};

const totalSalesThisWeek = computed(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return salesStore.logs
        .filter((l: SalesLog) => new Date(l.date) >= weekAgo)
        .reduce((sum: number, l: SalesLog) => sum + (l.totalSales || 0), 0);
});

const totalSalesThisMonth = computed(() => {
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    return salesStore.logs
        .filter((l: SalesLog) => new Date(l.date) >= monthAgo)
        .reduce((sum: number, l: SalesLog) => sum + (l.totalSales || 0), 0);
});



</script>

<template>
  <div class="h-full bg-slate-50 flex flex-col -m-6 p-6 space-y-8 overflow-y-auto custom-scrollbar">
    
    <!-- Hero Header -->
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Daily Sales Registry</h1>
          <p class="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Global activity & financial audit terminal</p>
        </div>
        
        <div class="flex items-center gap-4">
          <div class="glass-card p-6 flex items-center gap-5">
            <div class="p-4 rounded-2xl bg-blue-50 text-blue-600"><Wallet class="w-5 h-5" /></div>
            <div>
              <p class="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1.5">Net Sales (7D)</p>
              <p class="text-2xl font-black font-mono tracking-tighter text-slate-900">${{ totalSalesThisWeek.toLocaleString(undefined, { minimumFractionDigits: 2 }) }}</p>
            </div>
          </div>
          <div class="glass-card p-6 flex items-center gap-5">
            <div class="p-4 rounded-2xl bg-purple-50 text-purple-600"><TrendingUp class="w-5 h-5" /></div>
            <div>
              <p class="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1.5">Net Sales (Month)</p>
              <p class="text-2xl font-black font-mono tracking-tighter text-slate-900">${{ totalSalesThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2 }) }}</p>
            </div>
          </div>
          <div class="glass-card p-6 flex items-center gap-5">
            <div class="p-4 rounded-2xl bg-amber-50 text-amber-600"><HistoryIcon class="w-5 h-5" /></div>
            <div>
              <p class="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1.5">Active Logs</p>
              <p class="text-2xl font-black font-mono tracking-tighter text-slate-900">{{ salesStore.logs.length }} records</p>
            </div>
          </div>
        </div>

      </div>

    </div>


    <!-- Layout Container -->
    <div class="grid grid-cols-1 xl:grid-cols-12 gap-10 items-start">
      
      <!-- Primary Entry Form (Left / Main) -->
      <div class="xl:col-span-9 space-y-8">
        <!-- Date Selector Card -->
        <div class="glass-panel p-6 flex flex-col sm:flex-row items-center justify-between gap-6 border-t-4 border-t-primary-500">
          <div class="flex items-center gap-4">
            <div class="p-3 bg-slate-50/50 rounded-2xl">
              <Calendar class="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <h3 class="text-slate-900 font-black text-lg leading-tight uppercase italic">{{ editingLogId ? 'Modify Record' : 'Create New Log' }}</h3>
              <p class="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Processing for: <span class="text-primary-600">{{ selectedDate }}</span></p>
            </div>
          </div>

          <div class="flex items-center bg-slate-50/50 p-1.5 rounded-2xl border border-slate-100 group transition-colors">
            <button @click="navigateDate(-1)" class="p-2.5 hover:bg-white hover:shadow-sm rounded-xl text-slate-400 hover:text-slate-900 transition-all"><ChevronLeft class="w-5 h-5" /></button>
            <input type="date" v-model="selectedDate" class="bg-transparent border-none text-slate-900 font-black text-sm focus:ring-0 px-4 w-[160px] text-center" />
            <button @click="navigateDate(1)" class="p-2.5 hover:bg-white hover:shadow-sm rounded-xl text-slate-400 hover:text-slate-900 transition-all"><ChevronRight class="w-5 h-5" /></button>
          </div>
        </div>


        <!-- Input Sections -->
        <div class="space-y-8">
          <!-- Daily Reconciliation Form -->
          <div class="glass-panel overflow-hidden mb-8">
            <PdiReconciliationForm :log="currentLogForm" :isEditable="true" />
          </div>

          <!-- Section 3: Finalization -->
          <div class="glass-panel overflow-hidden">
            <div class="px-8 py-6 border-b border-slate-100/50 flex items-center gap-5">
                <div class="p-4 rounded-2xl bg-rose-50 text-rose-500"><Calculator class="w-5 h-5" /></div>
                <h3 class="text-slate-900 font-black text-lg uppercase italic">Review & Save</h3>
            </div>

            <div class="p-6 space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div class="space-y-4">
                  <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shift Expenses / Payouts</label>
                  <div class="relative group">
                    <div class="absolute left-4 top-4 text-slate-300 group-focus-within:text-rose-500 transition-colors pointer-events-none">$</div>
                    <input v-model.number="currentLogForm.expenses" type="number" step="0.01" class="no-spinner modern-input pl-10 text-lg font-black text-rose-600 bg-rose-50/30 placeholder-rose-200" placeholder="0.00" />
                  </div>

                  <!-- Attachments Grid -->
                  <div class="grid grid-cols-2 gap-4 pt-2">
                    <!-- Lotto Report -->
                    <div class="space-y-2">
                      <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lotto Report</label>
                      <div class="flex items-center gap-2">
                         <label class="flex-1 cursor-pointer">
                            <div class="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white transition-all group">
                                <Paperclip class="w-3.5 h-3.5 text-slate-400 group-hover:text-primary-500" />
                                <span class="text-[9px] font-black text-slate-500 uppercase truncate">{{ lottoFile ? lottoFile.name : (lottoUrl ? 'Replace' : 'Attach') }}</span>
                            </div>
                            <input type="file" @change="handleLottoFile" class="hidden" accept="image/*,application/pdf" />
                         </label>
                      </div>
                    </div>
                    <!-- Other Report -->
                    <div class="space-y-2">
                      <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Global Report</label>
                      <div class="flex items-center gap-2">
                         <label class="flex-1 cursor-pointer">
                            <div class="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white transition-all group">
                                <FileText class="w-3.5 h-3.5 text-slate-400 group-hover:text-primary-500" />
                                <span class="text-[9px] font-black text-slate-500 uppercase truncate">{{ otherFile ? otherFile.name : (otherUrl ? 'Replace' : 'Attach') }}</span>
                            </div>
                            <input type="file" @change="handleOtherFile" class="hidden" accept="image/*,application/pdf" />
                         </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="space-y-4">
                   <label class="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] italic block mb-2">Detailed Reconciliation Notes</label>
                   <textarea v-model="currentLogForm.notes" class="w-full h-64 bg-slate-50 border-2 border-slate-100 rounded-3xl p-8 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-primary-500 transition-all resize-none shadow-inner leading-relaxed" placeholder="Record shift discrepancies, maintenance issues, or important management updates here..."></textarea>
                </div>
              </div>

              <div class="flex items-center gap-4 pt-4 border-t border-slate-100">
                <button v-if="editingLogId" @click="cancelEdit" class="px-8 py-4 rounded-[2rem] bg-slate-100 text-slate-500 font-extrabold uppercase italic tracking-tighter hover:bg-slate-200 transition-all">Cancel</button>
                <button 
                  @click="saveDailyLog" 
                  :disabled="isSubmitting || isUploading"
                  class="flex-1 flex items-center justify-center gap-3 py-5 rounded-[2rem] bg-slate-900 text-white font-extrabold uppercase italic tracking-widest hover:bg-black hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-50 shadow-2xl"
                >
                  <Save v-if="!isSubmitting && !isUploading" class="w-6 h-6" />
                  <Loader2 v-else class="w-6 h-6 animate-spin" />
                  <span class="text-xl tracking-tighter">{{ isUploading ? 'Uploading...' : (isSubmitting ? 'Saving...' : (editingLogId ? 'Update Activity' : 'Commit Daily Log')) }}</span>
                </button>
              </div>


              <div class="h-4"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sidebar: Right (History) -->
      <div class="xl:col-span-3 space-y-6">
        <div class="sticky top-10 space-y-6">
          <div class="glass-panel p-6 relative overflow-hidden">
             <div class="flex items-center justify-between mb-8">
                <div class="flex items-center gap-3">
                   <div class="p-2.5 bg-amber-50 text-amber-500 rounded-xl">
                      <HistoryIcon class="w-5 h-5" />
                   </div>
                   <h3 class="text-lg font-black text-slate-900 uppercase italic">Archives</h3>
                </div>

                <div class="bg-slate-100/50 px-3 py-1 rounded-full text-[10px] font-black text-slate-400 tracking-tighter">{{ filteredLogs.length }} RECORDS</div>
             </div>

             <!-- Mini Filter Tabs -->
             <div class="flex flex-wrap gap-2 mb-8">
               <button v-for="f in (['today', 'week', 'month'] as const)" :key="f"
                 @click="selectedFilter = f"
                 class="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                 :class="selectedFilter === f ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'bg-slate-50/50 text-slate-400 hover:text-primary-600'"
               >{{ f }}</button>
               <button @click="selectedFilter = 'all'" class="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all" :class="selectedFilter === 'all' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'bg-slate-50/50 text-slate-400 hover:text-primary-600'">All</button>
             </div>

             <!-- Scrolled Logs List -->
             <div class="space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                <div v-for="log in filteredLogs" :key="log.id" 
                   class="glass-card p-5 cursor-pointer relative group"
                   @click="toggleLogExpansion(log.id)"
                >
                   <div class="flex items-center justify-between">
                      <div>
                        <div class="text-[11px] font-black text-slate-900 uppercase tracking-tighter">{{ new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) }}</div>
                        <div class="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{{ new Date(log.date).toLocaleDateString(undefined, { weekday: 'long' }) }}</div>
                      </div>
                      <div class="text-right">
                        <div class="text-sm font-black tracking-tighter" :class="log.totalSales >= 0 ? 'text-emerald-600' : 'text-rose-600'">
                          ${{ log.totalSales.toFixed(2) }}
                        </div>
                        <div class="text-[8px] text-slate-400 font-black uppercase tracking-widest">Net Sales</div>
                      </div>
                   </div>

                   <!-- Status & Submitter Info -->
                   <div class="mt-4 flex items-center justify-between border-t border-slate-50 pt-4">
                      <div class="flex items-center gap-2">
                        <div class="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-500 border border-slate-200">
                          {{ log.submittedBy?.[0]?.toUpperCase() || '?' }}
                        </div>
                        <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{{ log.submittedBy || 'Manual Entry' }}</span>
                      </div>
                      
                      <div class="flex items-center gap-2">
                        <span 
                          class="px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-[0.1em]"
                          :class="log.status === 'PENDING_REVIEW' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'"
                        >
                          {{ log.status === 'PENDING_REVIEW' ? 'Pending Rev' : 'Verified' }}
                        </span>
                      </div>
                   </div>

                   <div v-if="expandedLogIds.has(log.id)" class="mt-6 border-t border-slate-100 pt-6 animate-in fade-in slide-in-from-top-4 duration-300">
                      <div class="bg-white rounded-3xl p-2 border border-slate-100 shadow-sm overflow-hidden" @click.stop="">
                          <PdiReconciliationForm v-if="log.pdiForm" :log="log" />
                          <DailyReconciliationForm v-else :log="log" />
                      </div>
                   </div>

                   <div class="flex items-center justify-end gap-3 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button v-if="log.status === 'PENDING_REVIEW'" 
                        @click.stop="verifyLog(log.id)" 
                        title="Verify Log"
                        class="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                      >
                        <CheckCircle2 class="w-4 h-4" />
                      </button>
                      <button @click.stop="loadLogForEditing(log)" class="p-2 text-slate-400 hover:text-primary-600 transition-colors"><Edit3 class="w-4 h-4" /></button>
                      <button @click.stop="confirmDelete(log.id)" class="p-2 text-slate-400 hover:text-rose-600 transition-colors"><Trash2 class="w-4 h-4" /></button>
                   </div>
                </div>
                <div v-if="filteredLogs.length === 0" class="text-center py-20">
                   <Clock class="w-10 h-10 text-slate-100 mx-auto mb-4" />
                   <p class="text-[10px] text-slate-300 font-black uppercase tracking-widest">Empty Archives Control</p>
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

    <!-- Wide Focus Audit Modal -->
    <Teleport to="body">
        <div v-if="activeAuditType" class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-10">
            <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity duration-300" @click="activeAuditType = null"></div>
            
            <div class="relative bg-white rounded-[3rem] w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col border border-slate-200">
                <!-- Modal Header -->
                <div class="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div class="flex items-center gap-5">
                        <div :class="['p-4 rounded-3xl shadow-lg', 
                            activeAuditType === 'opening' ? 'bg-emerald-500 text-white' : 
                            activeAuditType === 'closing' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white']">
                            <Calculator class="w-8 h-8" />
                        </div>
                        <div>
                            <h2 class="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">
                                {{ activeAuditType === 'opening' ? 'Opening Cash Audit' : 
                                   activeAuditType === 'closing' ? 'Shift Closing Count' : 'Vault Cash / Deposit' }}
                            </h2>
                            <p class="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Wide-View Precision Denomination Registry</p>
                        </div>
                    </div>
                    <button 
                        @click="activeAuditType = null"
                        class="px-8 py-4 bg-slate-100 hover:bg-slate-900 hover:text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-sm"
                    >
                        Save & Close View
                    </button>
                </div>

                <!-- Modal Body -->
                <div class="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-50/30">
                    <div v-if="activeAuditType === 'opening'" class="animate-in fade-in slide-in-from-bottom-5 duration-500">
                        <CashDenominations label="Morning Register" :modelValue="currentLogForm.openingCash ?? 0" @update:modelValue="(v) => currentLogForm.openingCash = v" @update:details="(d) => openingDetails = d" />
                    </div>
                    <div v-if="activeAuditType === 'closing'" class="animate-in fade-in slide-in-from-bottom-5 duration-500">
                        <CashDenominations label="End of Day Audit" :modelValue="currentLogForm.closingCash ?? 0" @update:modelValue="(v) => currentLogForm.closingCash = v" @update:details="(d) => closingDetails = d" />
                    </div>
                    <div v-if="activeAuditType === 'safe'" class="animate-in fade-in slide-in-from-bottom-5 duration-500">
                        <CashDenominations label="Deposit Details" :modelValue="currentLogForm.safeCash ?? 0" @update:modelValue="(v) => currentLogForm.safeCash = v" @update:details="(d) => safeDetails = d" />
                    </div>
                    
                    <div class="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 p-8 bg-white/50 rounded-[2.5rem] border border-slate-100">
                         <div>
                            <h4 class="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                               <Sparkles class="w-3 h-3 text-amber-500" /> Audit Best Practices
                            </h4>
                            <p class="text-[11px] text-slate-500 font-bold leading-relaxed">Please verify each denomination twice before closing. The system accounts for both loose and rolled coins automatically.</p>
                         </div>
                         <div class="text-right">
                             <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Running Session Total</p>
                             <p class="text-3xl font-black text-slate-900 tabular-nums">${{ 
                                (activeAuditType === 'opening' ? (currentLogForm.openingCash || 0) : (activeAuditType === 'closing' ? (currentLogForm.closingCash || 0) : (currentLogForm.safeCash || 0))).toFixed(2) 
                             }}</p>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    </Teleport>
  </div>
</template>

<style scoped>
.modern-input {
  @apply w-full bg-slate-50/50 border-2 border-slate-50 rounded-[1.5rem] px-6 py-4 text-slate-900 font-bold placeholder-slate-200 focus:bg-white focus:border-primary-500 hover:border-slate-100 transition-all outline-none text-sm;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  @apply bg-transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  @apply bg-slate-200 rounded-full;
}

.no-spinner::-webkit-inner-spin-button,
.no-spinner::-webkit-outer-spin-button {
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
}
.no-spinner {
  -moz-appearance: textfield;
  appearance: textfield;
}
</style>
