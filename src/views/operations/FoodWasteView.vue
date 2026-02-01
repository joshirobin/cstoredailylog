<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { 
  Trash2, Plus, Save, History as HistoryIcon, 
  TrendingDown, Calendar, ChevronLeft, ChevronRight,
  FileText, ArrowDownRight, LayoutGrid, 
  Soup, Sparkles, Loader2, ListChecks
} from 'lucide-vue-next';
import { useFoodWasteStore, type WasteItem, type WasteLog } from '../../stores/foodWaste';
import { useAuthStore } from '../../stores/auth';
import { useNotificationStore } from '../../stores/notifications';

const foodWasteStore = useFoodWasteStore();
const authStore = useAuthStore();
const notificationStore = useNotificationStore();

onMounted(async () => {
    await foodWasteStore.fetchLogs();
    checkExistingLog();
});

// Form State
const selectedDate = ref<string>(new Date().toISOString().split('T')[0] as string);
const notes = ref('');
const items = ref<Omit<WasteItem, 'id'>[]>([
  { name: '', quantity: 0, unit: 'Units', reason: 'Expired', costPerUnit: 0, totalCost: 0, category: 'Deli' }
]);
const isSubmitting = ref(false);
const editingLogId = ref<string | null>(null);

// UI State
const categories = ['Deli', 'Produce', 'Dairy', 'Bakery', 'Meat', 'Grocery', 'Other'];
const reasons = ['Expired', 'Damaged', 'Cooked Extra', 'Recall', 'Theft', 'Other'];
const units = ['Units', 'Lbs', 'Kg', 'Cases', 'Pans'];
const selectedFilter = ref<'today' | 'week' | 'month' | 'all'>('all');
const isWasteFocusOpen = ref(false);

const checkExistingLog = () => {
  const existing = foodWasteStore.logs.find(l => l.date === selectedDate.value);
  if (existing) {
    editingLogId.value = existing.id;
    items.value = existing.items.map(i => ({ ...i }));
    notes.value = existing.notes || '';
  } else {
    resetForm();
  }
};

watch(selectedDate, () => checkExistingLog());

const resetForm = () => {
    editingLogId.value = null;
    items.value = [{ name: '', quantity: 0, unit: 'Units', reason: 'Expired', costPerUnit: 0, totalCost: 0, category: 'Deli' }];
    notes.value = '';
};

const addItem = () => {
    items.value.push({ name: '', quantity: 0, unit: 'Units', reason: 'Expired', costPerUnit: 0, totalCost: 0, category: 'Deli' });
};

const removeItem = (idx: number) => {
    items.value.splice(idx, 1);
    if (items.value.length === 0) addItem();
};

const calculateItemTotal = (item: any) => {
    item.totalCost = (Number(item.quantity) || 0) * (Number(item.costPerUnit) || 0);
};

const totalWasteValue = computed(() => {
    return items.value.reduce((sum, item) => sum + (item.totalCost || 0), 0);
});

const saveLog = async () => {
  if (items.value.some(i => !i.name || i.quantity <= 0)) {
    notificationStore.error('Please fill in all item details and quantities', 'Form Incomplete');
    return;
  }

  isSubmitting.value = true;
  try {
    const logData = {
      date: selectedDate.value,
      items: items.value.map((i, idx) => ({ ...i, id: `item_${idx}_${Date.now()}` })),
      totalValue: totalWasteValue.value,
      submittedBy: authStore.user?.email || 'Manager',
      notes: notes.value,
      status: 'COMPLETE' as const
    };

    if (editingLogId.value) {
      await foodWasteStore.updateLog(editingLogId.value, logData);
      notificationStore.success('Waste record updated', 'Success');
    } else {
      await foodWasteStore.addLog(logData);
      notificationStore.success('New waste log recorded', 'Success');
    }
  } catch (error) {
    notificationStore.error('Failed to save waste record', 'System Error');
  } finally {
    isSubmitting.value = false;
  }
};

const navigateDate = (days: number) => {
  const date = new Date(selectedDate.value);
  date.setDate(date.getDate() + days);
  selectedDate.value = date.toISOString().split('T')[0] as string;
};

const deleteLog = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    try {
        await foodWasteStore.deleteLog(id);
        notificationStore.success('Record purged', 'Deleted');
        if (editingLogId.value === id) resetForm();
    } catch (e) {
        notificationStore.error('Delete failed', 'Error');
    }
};

const loadLog = (log: WasteLog) => {
    selectedDate.value = log.date;
    checkExistingLog();
};

// Analytics
const dailyAverage = computed(() => {
    if (foodWasteStore.logs.length === 0) return 0;
    const total = foodWasteStore.logs.reduce((sum, l) => sum + l.totalValue, 0);
    return total / foodWasteStore.logs.length;
});

const filteredLogs = computed(() => {
    const now = new Date();
    return foodWasteStore.logs.filter(l => {
        const logDate = new Date(l.date);
        if (selectedFilter.value === 'today') return l.date === new Date().toISOString().split('T')[0];
        if (selectedFilter.value === 'week') return (now.getTime() - logDate.getTime()) < 7 * 24 * 60 * 60 * 1000;
        if (selectedFilter.value === 'month') return (now.getTime() - logDate.getTime()) < 30 * 24 * 60 * 60 * 1000;
        return true;
    });
});

const categoryDistribution = computed(() => {
    const dist: Record<string, number> = {};
    foodWasteStore.logs.forEach(log => {
        log.items.forEach(item => {
            dist[item.category] = (dist[item.category] || 0) + item.totalCost;
        });
    });
    return dist;
});
</script>

<template>
  <div class="h-full bg-slate-50 flex flex-col -m-6 p-6 space-y-8 overflow-y-auto custom-scrollbar">
    
    <!-- Hero Header -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
      <div>
        <h1 class="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Food Waste Registry</h1>
        <p class="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Shrinkage control & deli loss audit</p>
      </div>
      
      <div class="flex items-center gap-4">
        <div class="stats-card bg-white border border-slate-100 p-4 rounded-3xl flex items-center gap-4 shadow-sm">
          <div class="w-10 h-10 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center">
            <TrendingDown class="w-5 h-5" />
          </div>
          <div>
            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">MTD Waste Value</p>
            <p class="text-lg font-black text-slate-900">${{ foodWasteStore.logs.filter(l => l.date.startsWith(new Date().toISOString().slice(0, 7))).reduce((s, l) => s + l.totalValue, 0).toFixed(2) }}</p>
          </div>
        </div>
        <div class="stats-card bg-white border border-slate-100 p-4 rounded-3xl flex items-center gap-4 shadow-sm">
          <div class="w-10 h-10 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center">
            <LayoutGrid class="w-5 h-5" />
          </div>
          <div>
            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Average Loss/Log</p>
            <p class="text-lg font-black text-slate-900">${{ dailyAverage.toFixed(2) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Layout -->
    <div class="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
      
      <!-- Entry Section -->
      <div class="xl:col-span-8 space-y-6">
        
        <!-- Date Control -->
        <div class="bg-white border border-slate-200 rounded-[2.5rem] p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
          <div class="flex items-center gap-4">
            <div class="p-3 bg-slate-100 rounded-2xl">
              <Calendar class="w-6 h-6 text-slate-500" />
            </div>
            <div>
              <h3 class="text-slate-900 font-black text-lg uppercase italic leading-none">{{ editingLogId ? 'Modify Record' : 'Log New Waste' }}</h3>
              <p class="text-[10px] font-black text-primary-600 uppercase tracking-widest mt-1.5">{{ selectedDate === new Date().toISOString().split('T')[0] ? 'Recording Today' : 'Archived Entry' }}</p>
            </div>
          </div>

          <div class="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 group">
            <button @click="navigateDate(-1)" class="p-2.5 hover:bg-white hover:shadow-sm rounded-xl text-slate-400 hover:text-slate-900 transition-all"><ChevronLeft class="w-5 h-5" /></button>
            <input type="date" v-model="selectedDate" class="bg-transparent border-none text-slate-900 font-black text-sm focus:ring-0 px-4 w-[160px] text-center" />
            <button @click="navigateDate(1)" class="p-2.5 hover:bg-white hover:shadow-sm rounded-xl text-slate-400 hover:text-slate-900 transition-all"><ChevronRight class="w-5 h-5" /></button>
          </div>
        </div>

        <!-- Summary Toggle Card (Replacing Inline List) -->
        <div class="flex flex-col gap-6">
          <div 
            @click="isWasteFocusOpen = true"
            class="group bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 cursor-pointer hover:border-rose-100 hover:bg-rose-50/20 transition-all shadow-sm flex items-center justify-between"
          >
            <div class="flex items-center gap-6">
              <div class="w-16 h-16 rounded-[1.5rem] bg-rose-50 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-rose-500/10">
                <Soup class="w-8 h-8" />
              </div>
              <div>
                <h3 class="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Food Loss Focus View</h3>
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{{ items.length }} Items Registered in current audit</p>
              </div>
            </div>
            <div class="flex items-center gap-8">
               <div class="text-right">
                  <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Session Total</p>
                  <p class="text-3xl font-black text-rose-500 tabular-nums">${{ totalWasteValue.toFixed(2) }}</p>
               </div>
               <div class="p-4 bg-slate-900 text-white rounded-2xl group-hover:bg-rose-500 transition-colors">
                  <ListChecks class="w-5 h-5" />
               </div>
            </div>
          </div>

          <!-- Notes Section -->
          <div class="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
             <label class="text-[10px] font-black text-slate-900 uppercase tracking-widest italic block mb-4 flex items-center gap-2">
               <FileText class="w-3.5 h-3.5 text-primary-500" /> Additional Context / Incident Details
             </label>
             <textarea v-model="notes" class="w-full h-32 bg-slate-50 border border-slate-100 rounded-3xl p-6 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-primary-500 transition-all resize-none shadow-inner" placeholder="Record reasons for large disposals, temperature failures, or damaged delivery notes..."></textarea>
          </div>

          <!-- Action Bar -->
          <div class="flex items-center gap-4">
              <button @click="resetForm" class="px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-3xl transition-all">Reset Entry</button>
              <button 
                @click="saveLog" 
                :disabled="isSubmitting"
                class="flex-1 flex items-center justify-center gap-3 py-5 bg-slate-900 hover:bg-black text-white rounded-[2rem] text-sm font-black uppercase tracking-widest transition-all shadow-2xl disabled:opacity-50"
              >
                <Save v-if="!isSubmitting" class="w-5 h-5" />
                <Loader2 v-else class="w-5 h-5 animate-spin" />
                {{ isSubmitting ? 'Syncing...' : 'Commit Daily Waste log' }}
              </button>
          </div>
        </div>
      </div>

      <!-- Sidebar / History section -->
      <div class="xl:col-span-4 space-y-6">
        
        <!-- Category Stats -->
        <div class="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
           <div class="flex items-center gap-3 mb-8">
              <div class="p-2.5 bg-primary-50 text-primary-500 rounded-2xl">
                <Soup class="w-5 h-5" />
              </div>
              <h3 class="text-lg font-black text-slate-900 uppercase italic">Loss by Category</h3>
           </div>
           
           <div class="space-y-4">
              <div v-for="(val, cat) in categoryDistribution" :key="cat" class="space-y-2">
                 <div class="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                    <span class="text-slate-500">{{ cat }}</span>
                    <span class="text-slate-900">${{ val.toFixed(2) }}</span>
                 </div>
                 <div class="h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                    <div class="h-full bg-primary-500 transition-all duration-1000" 
                         :style="{ width: `${(val / (totalWasteValue || 1)) * 100}%` }"></div>
                 </div>
              </div>
              <div v-if="Object.keys(categoryDistribution).length === 0" class="text-center py-6 text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">No data available</div>
           </div>
        </div>

        <!-- History Log -->
        <div class="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm flex flex-col max-h-[1000px]">
           <div class="flex items-center justify-between mb-8">
               <div class="flex items-center gap-3">
                  <div class="p-2.5 bg-amber-50 text-amber-500 rounded-2xl">
                    <HistoryIcon class="w-5 h-5" />
                  </div>
                  <h3 class="text-lg font-black text-slate-900 uppercase italic">Waste Archives</h3>
               </div>
               <div class="px-3 py-1 bg-slate-100 rounded-full text-[9px] font-black text-slate-400">{{ filteredLogs.length }} RECORDS</div>
           </div>

           <!-- Archive Filters -->
           <div class="flex flex-wrap gap-2 mb-8">
              <button v-for="f in (['today', 'week', 'month', 'all'] as const)" :key="f"
                      @click="selectedFilter = f"
                      class="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                      :class="selectedFilter === f ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'bg-slate-50 text-slate-400 hover:text-slate-900'">
                {{ f }}
              </button>
           </div>

           <div class="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
              <div v-for="log in filteredLogs" :key="log.id" 
                   @click="loadLog(log)"
                   class="group p-5 bg-white border border-slate-100 hover:border-slate-300 hover:bg-slate-50 rounded-[2rem] transition-all cursor-pointer shadow-sm relative overflow-hidden">
                
                <div class="relative z-10 flex items-center justify-between mb-4">
                   <div>
                      <h4 class="text-xs font-black text-slate-900 uppercase tracking-tighter">{{ new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) }}</h4>
                      <p class="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">{{ new Date(log.date).toLocaleDateString(undefined, { weekday: 'long' }) }}</p>
                   </div>
                   <div class="text-right">
                      <p class="text-sm font-black text-rose-500 tabular-nums">${{ log.totalValue.toFixed(2) }}</p>
                      <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Net Loss</p>
                   </div>
                </div>

                <div class="flex items-center justify-between border-t border-slate-100/50 pt-4">
                   <div class="flex items-center gap-2">
                      <div class="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-500 border border-slate-200 uppercase">
                        {{ log.submittedBy?.[0] || '?' }}
                      </div>
                      <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[100px]">{{ log.submittedBy }}</span>
                   </div>
                   <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button @click.stop="deleteLog(log.id)" class="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                        <Trash2 class="w-3.5 h-3.5" />
                      </button>
                      <ArrowDownRight class="w-3.5 h-3.5 text-slate-300" />
                   </div>
                </div>
              </div>

              <div v-if="filteredLogs.length === 0" class="text-center py-20 flex flex-col items-center">
                 <Trash2 class="w-12 h-12 text-slate-100 mb-4" />
                 <p class="text-[10px] text-slate-300 font-black uppercase tracking-widest italic leading-relaxed">No waste records found for the selected period</p>
              </div>
           </div>
        </div>

      </div>
    </div>

    <!-- Wide Focus Audit Modal -->
    <Teleport to="body">
        <div v-if="isWasteFocusOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-10">
            <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300" @click="isWasteFocusOpen = false"></div>
            
            <div class="relative bg-white rounded-[3rem] w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col border border-slate-200">
                <!-- Modal Header -->
                <div class="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div class="flex items-center gap-5">
                        <div class="p-4 rounded-3xl bg-rose-500 text-white shadow-lg shadow-rose-500/20">
                            <Trash2 class="w-8 h-8" />
                        </div>
                        <div>
                            <h2 class="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">
                                Itemized Loss Audit
                            </h2>
                            <p class="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Wide-View Precision Shrinkage Registry</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-4">
                        <button @click="addItem" class="flex items-center gap-2 px-8 py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/10">
                           <Plus class="w-4 h-4" /> Add Item Row
                        </button>
                        <button 
                            @click="isWasteFocusOpen = false"
                            class="px-8 py-4 bg-slate-900 text-white hover:bg-black rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                        >
                            Return to Log
                        </button>
                    </div>
                </div>

                <!-- Modal Body -->
                <div class="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-50/30">
                    <div class="space-y-6">
                        <div v-for="(item, idx) in items" :key="idx" 
                             class="p-8 bg-white rounded-[2.5rem] border border-slate-100 relative group transition-all hover:bg-white hover:shadow-2xl hover:border-slate-200 animate-in slide-in-from-bottom-4 duration-500"
                             :style="{ animationDelay: `${idx * 50}ms` }">
                          
                          <button @click="removeItem(idx)" class="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-white border border-slate-100 text-slate-300 hover:text-rose-500 hover:border-rose-100 flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all z-20">
                            <Trash2 class="w-5 h-5" />
                          </button>

                          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
                            <!-- Item Name & Category -->
                            <div class="lg:col-span-4 space-y-3">
                              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Product Description</label>
                              <div class="flex gap-4">
                                <select v-model="item.category" class="w-32 h-14 bg-slate-50 border-2 border-slate-50 rounded-2xl px-4 text-[10px] font-black uppercase outline-none focus:bg-white focus:border-rose-500 transition-all">
                                  <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
                                </select>
                                <input v-model="item.name" type="text" placeholder="e.g. Deli Hot Sandwich" 
                                       class="flex-1 h-14 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 text-sm font-bold outline-none focus:bg-white focus:border-rose-500 transition-all" />
                              </div>
                            </div>

                            <!-- Qty & Unit -->
                            <div class="lg:col-span-3 space-y-3">
                              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantity Lost</label>
                              <div class="flex gap-4">
                                <input v-model.number="item.quantity" type="number" @input="calculateItemTotal(item)"
                                       class="w-full h-14 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 text-sm font-black outline-none focus:bg-white focus:border-rose-500 transition-all no-spinner" />
                                <select v-model="item.unit" class="w-28 h-14 bg-slate-50 border-2 border-slate-50 rounded-2xl px-4 text-[10px] font-black uppercase outline-none focus:bg-white focus:border-rose-500 transition-all">
                                  <option v-for="u in units" :key="u" :value="u">{{ u }}</option>
                                </select>
                              </div>
                            </div>

                            <!-- Cost & Reason -->
                            <div class="lg:col-span-3 space-y-3">
                              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit Value & Reason</label>
                              <div class="flex gap-4">
                                <div class="relative flex-1">
                                  <span class="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 font-black pointer-events-none">$</span>
                                  <input v-model.number="item.costPerUnit" type="number" step="0.01" @input="calculateItemTotal(item)"
                                         class="w-full h-14 bg-slate-50 border-2 border-slate-50 rounded-2xl pl-10 pr-6 text-sm font-bold outline-none focus:bg-white focus:border-rose-500 transition-all no-spinner" />
                                </div>
                                <select v-model="item.reason" class="w-full h-14 bg-slate-50 border-2 border-slate-50 rounded-2xl px-4 text-[10px] font-black uppercase outline-none focus:bg-white focus:border-rose-500 transition-all">
                                  <option v-for="r in reasons" :key="r" :value="r">{{ r }}</option>
                                </select>
                              </div>
                            </div>

                            <!-- Total -->
                            <div class="lg:col-span-2 space-y-3">
                              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Loss Value</label>
                              <div class="h-14 flex items-center justify-end px-6 bg-rose-50 rounded-2xl text-base font-black text-rose-600 border border-rose-100 tabular-nums shadow-inner">
                                ${{ (item.totalCost || 0).toFixed(2) }}
                              </div>
                            </div>
                          </div>
                        </div>
                    </div>
                    
                    <!-- Footer Analytics -->
                    <div class="mt-10 p-10 bg-white/50 rounded-[3rem] border-2 border-slate-100 flex items-center justify-between">
                         <div class="flex items-center gap-10">
                            <div>
                                <h4 class="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                                   <Sparkles class="w-3 h-3 text-amber-500" /> Accuracy Policy
                                </h4>
                                <p class="text-[11px] text-slate-500 font-bold leading-relaxed max-w-sm">Please ensure all disposals are categorized correctly. Deli items must be logged by 10:00 PM unless expired earlier.</p>
                            </div>
                            <div class="h-12 w-px bg-slate-200"></div>
                            <div>
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Item Count</p>
                                <p class="text-2xl font-black text-slate-900">{{ items.length }} Records</p>
                            </div>
                         </div>
                         <div class="text-right">
                             <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Audit Session Total</p>
                             <p class="text-4xl font-black text-slate-900 tabular-nums shadow-glow shadow-rose-500/5">${{ totalWasteValue.toFixed(2) }}</p>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    </Teleport>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 9999px;
}

.stats-card {
  @apply transition-all hover:translate-y-[-4px] hover:shadow-xl duration-300;
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
