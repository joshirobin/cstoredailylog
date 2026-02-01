<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { 
  Clock, 
  CheckCircle2, 
  DollarSign, 
  Vault, 
  Calculator,
  Save,
  Zap,
  Plus,
  Trash2,
  ChevronRight,
  TrendingUp,
  History,
  AlertCircle
} from 'lucide-vue-next';
import CashDenominations from '../../components/CashDenominations.vue';
import { useAuthStore } from '../../stores/auth';
import { useEmployeesStore } from '../../stores/employees';
import { useSalesStore, type Check, type DenominationCounts, type SalesLog } from '../../stores/sales';
import { useTimesheetsStore } from '../../stores/timesheets';
import { useNotificationStore } from '../../stores/notifications';

const authStore = useAuthStore();
const employeesStore = useEmployeesStore();
const salesStore = useSalesStore();
const timesheetsStore = useTimesheetsStore();
const notificationStore = useNotificationStore();

const formatTime = (timestamp: any) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Live Time Registry Logic
const userActiveLog = computed(() => {
    return timesheetsStore.timeLogs.find(l => l.status === 'In Progress');
});

const elapsedDuration = computed(() => {
    if (!userActiveLog.value?.clockIn) return '0h 0m';
    const start = (userActiveLog.value.clockIn as any).toDate?.() || new Date(userActiveLog.value.clockIn as any);
    const diff = currentTimeRaw.value.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
});

const handleQuickRegistry = async () => {
    try {
        if (userActiveLog.value) {
            await timesheetsStore.clockOut(userActiveLog.value.id, userActiveLog.value.employeeId);
            notificationStore.success('Shift ended successfully', 'Time Clock');
        } else {
            const emp = employeesStore.employees.find(e => e.email === authStore.user?.email);
            if (!emp) {
                notificationStore.error('Employee profile not found for this account', 'Error');
                return;
            }
            await timesheetsStore.clockIn(emp.id, `${emp.firstName} ${emp.lastName}`);
            notificationStore.success('Shift started!', 'Time Clock');
        }
    } catch (e) {
        notificationStore.error('Failed to update time registry', 'Error');
    }
};

// UI State
const todayDate = (new Date().toISOString().split('T')[0] as string);
const isSubmitting = ref(false);
const activeTab = ref<'checkout' | 'tasks'>('checkout');
const activeAuditType = ref<'opening' | 'closing' | 'safe' | null>(null);

// Shift Data
const openingCash = ref<number>(0);
const openingDetails = ref<DenominationCounts | undefined>(undefined);
const closingCash = ref<number>(0);
const closingDetails = ref<DenominationCounts | undefined>(undefined);
const safeDrops = ref<number>(0);
const safeDetails = ref<DenominationCounts | undefined>(undefined);
const expenses = ref<number>(0);
const checks = ref<Check[]>([]);
const notes = ref('');

const totalSales = computed(() => {
    return (closingCash.value - openingCash.value) + safeDrops.value - expenses.value;
});

const checksTotal = computed(() => {
    return checks.value.reduce((sum, c) => sum + (c.amount || 0), 0);
});

// Tasks
const tasks = ref([
    { id: 'clock_in', label: 'Clock In', done: false },
    { id: 'drawer_verify', label: 'Verify Opening Drawer', done: false },
    { id: 'clean_counter', label: 'Clean POS Area', done: false },
    { id: 'stock_tobacco', label: 'Restock Tobacco/Nicotine', done: false },
    { id: 'check_bathroom', label: 'Restroom Inspection', done: false },
    { id: 'trash_empty', label: 'Empty Lobby Trash', done: false },
    { id: 'closing_count', label: 'Final Cash Count', done: false },
]);

const taskProgress = computed(() => {
    const done = tasks.value.filter(t => t.done).length;
    return Math.round((done / tasks.value.length) * 100);
});

onMounted(async () => {
    await Promise.all([
        employeesStore.fetchEmployees(),
        salesStore.fetchLogs(),
        timesheetsStore.fetchTimeLogs()
    ]);
    
    const myEmp = employeesStore.employees.find(e => e.email === authStore.user?.email);
    if (myEmp) {
        await timesheetsStore.fetchTimeLogs(myEmp.id);
    }
    
    const existingLog = salesStore.logs.find(l => l.date === todayDate);
    if (existingLog) {
        openingCash.value = existingLog.openingCash;
        closingCash.value = existingLog.closingCash;
        safeDrops.value = existingLog.safeCash || 0;
        expenses.value = existingLog.expenses;
        checks.value = existingLog.checks || [];
        notes.value = existingLog.notes || '';
    } else {
        const prevLog = salesStore.logs
            .filter(l => l.date < todayDate)
            .sort((a, b) => b.date.localeCompare(a.date))[0];
        
        if (prevLog) {
            openingCash.value = prevLog.closingCash;
            notificationStore.info(`Carried over $${prevLog.closingCash.toFixed(2)} from ${prevLog.date}`, "Sync");
        }
    }
});

const addCheck = () => checks.value.push({ number: '', amount: 0 });
const removeCheck = (index: number) => checks.value.splice(index, 1);

const saveShift = async () => {
    isSubmitting.value = true;
    try {
        const logData: Omit<SalesLog, 'id' | 'locationId'> = {
            date: todayDate,
            openingCash: Number(openingCash.value) || 0,
            openingDenominations: openingDetails.value,
            closingCash: Number(closingCash.value) || 0,
            closingDenominations: closingDetails.value,
            safeCash: Number(safeDrops.value) || 0,
            safeCashDetails: safeDetails.value,
            expenses: Number(expenses.value) || 0,
            totalSales: Number(totalSales.value) || 0,
            notes: notes.value,
            checks: checks.value.length > 0 ? checks.value : undefined,
            safeTotal: (Number(safeDrops.value) || 0) + checksTotal.value,
            submittedBy: authStore.user?.email || 'Unknown',
            status: 'PENDING_REVIEW'
        };

        const existing = salesStore.logs.find(l => l.date === todayDate);
        if (existing) {
            await salesStore.updateLog(existing.id, logData);
        } else {
            await salesStore.addLog(logData);
        }
        notificationStore.success('Shift report submitted for manager review!', 'Success');
    } catch (e) {
        notificationStore.error('Failed to save shift report.', 'Error');
    } finally {
        isSubmitting.value = false;
    }
};

const currentTimeRaw = ref(new Date());
const currentTime = ref(new Date().toLocaleTimeString());
setInterval(() => {
    currentTimeRaw.value = new Date();
    currentTime.value = new Date().toLocaleTimeString();
}, 1000);
</script>

<template>
  <div class="h-full bg-slate-50 flex flex-col -m-6 p-4 space-y-4">
    <!-- Compact Header -->
    <header class="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
        <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/20">
                <Calculator class="w-5 h-5" />
            </div>
            <div>
                <h1 class="text-sm font-black text-slate-900 uppercase tracking-tighter">Clerk Terminal</h1>
                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Shift Session: {{ todayDate }}</p>
            </div>
        </div>

        <div class="flex items-center gap-6">
            <div class="text-right">
                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Digital Clock</p>
                <p class="text-sm font-black text-primary-600 tabular-nums">{{ currentTime }}</p>
            </div>
            <div class="h-8 w-px bg-slate-100"></div>
            <div class="flex items-center gap-2">
                <div class="text-right">
                    <p class="text-[10px] font-black text-slate-900 leading-none">{{ authStore.user?.email?.split('@')[0] || 'User' }}</p>
                    <p class="text-[8px] font-bold text-emerald-500 uppercase tracking-widest mt-1">Status: Active</p>
                </div>
                <div class="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-xs font-bold">
                    {{ authStore.user?.email?.[0]?.toUpperCase() || '?' }}
                </div>
            </div>
        </div>
    </header>

    <div class="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-4 overflow-hidden">
        <!-- Dashboard Content -->
        <main class="xl:col-span-8 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-1">
            
            <!-- Tab Switcher -->
            <div class="flex items-center gap-1 bg-slate-200/50 p-1 rounded-lg w-fit">
                <button 
                    @click="activeTab = 'checkout'"
                    class="px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all"
                    :class="activeTab === 'checkout' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
                >Shift Balance</button>
                <button 
                    @click="activeTab = 'tasks'"
                    class="px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all"
                    :class="activeTab === 'tasks' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
                >Task Log ({{ taskProgress }}%)</button>
            </div>

            <!-- Checkout Section -->
            <div v-if="activeTab === 'checkout'" class="space-y-4 animate-in fade-in duration-300">
                <!-- Hero Sales Stat -->
                <div class="bg-slate-900 rounded-2xl p-6 text-white relative overflow-hidden group">
                    <div class="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <TrendingUp class="w-32 h-32" />
                    </div>
                    <div>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Shift Performance</p>
                        <h2 class="text-4xl font-black font-mono tracking-tighter">${{ totalSales.toFixed(2) }}</h2>
                    </div>
                    <div class="mt-6 grid grid-cols-4 gap-4">
                        <div class="bg-white/5 rounded-xl p-3 border border-white/5">
                            <p class="text-[8px] font-black text-slate-400 uppercase mb-1">Opening</p>
                            <p class="text-xs font-bold">${{ openingCash.toFixed(0) }}</p>
                        </div>
                        <div class="bg-white/5 rounded-xl p-3 border border-white/5">
                            <p class="text-[8px] font-black text-slate-400 uppercase mb-1">Safe Drops</p>
                            <p class="text-xs font-bold">${{ safeDrops.toFixed(0) }}</p>
                        </div>
                        <div class="bg-white/5 rounded-xl p-3 border border-white/5">
                            <p class="text-[8px] font-black text-slate-400 uppercase mb-1">Expenses</p>
                            <p class="text-xs font-bold text-rose-400">-${{ expenses.toFixed(0) }}</p>
                        </div>
                        <div class="bg-white/5 rounded-xl p-3 border border-white/5">
                            <p class="text-[8px] font-black text-slate-400 uppercase mb-1">Closing</p>
                            <p class="text-xs font-bold">${{ closingCash.toFixed(0) }}</p>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Cash Reconciliation -->
                    <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-sm">
                        <div class="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <DollarSign class="w-4 h-4 text-emerald-500" />
                                <h3 class="text-[10px] font-black text-slate-900 uppercase tracking-widest">Register Settlement</h3>
                            </div>
                        </div>
                        <div class="p-4 space-y-4">
                            <div class="space-y-4">
                                <div 
                                    @click="activeAuditType = 'opening'"
                                    class="flex items-center justify-between px-4 py-4 bg-transparent rounded-2xl cursor-pointer hover:bg-slate-100 transition-all border-2 border-slate-100 group"
                                >
                                    <div class="flex items-center gap-3">
                                        <div class="p-2 bg-emerald-50 rounded-lg text-emerald-600 group-hover:scale-110 transition-transform">
                                            <Calculator class="w-4 h-4" />
                                        </div>
                                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer">Opening Balance Audit</label>
                                    </div>
                                    <div class="flex items-center gap-3">
                                        <span class="text-base font-black text-emerald-600">${{ openingCash.toFixed(2) }}</span>
                                        <Plus class="w-4 h-4 text-slate-300" />
                                    </div>
                                </div>
                            </div>

                            <div class="space-y-4">
                                <div 
                                    @click="activeAuditType = 'closing'"
                                    class="flex items-center justify-between px-4 py-4 bg-transparent rounded-2xl cursor-pointer hover:bg-slate-100 transition-all border-2 border-slate-100 group"
                                >
                                    <div class="flex items-center gap-3">
                                        <div class="p-2 bg-primary-50 rounded-lg text-primary-600 group-hover:scale-110 transition-transform">
                                            <Calculator class="w-4 h-4" />
                                        </div>
                                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer">Closing Balance Audit</label>
                                    </div>
                                    <div class="flex items-center gap-3">
                                        <span class="text-base font-black text-primary-600">${{ closingCash.toFixed(2) }}</span>
                                        <Plus class="w-4 h-4 text-slate-300" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Drops & Payouts -->
                    <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-sm">
                        <div class="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <Vault class="w-4 h-4 text-amber-500" />
                                <h3 class="text-[10px] font-black text-slate-900 uppercase tracking-widest">Drops & Payouts</h3>
                            </div>
                        </div>
                        <div class="p-4 space-y-4">
                            <div class="space-y-4">
                                <div 
                                    @click="activeAuditType = 'safe'"
                                    class="flex items-center justify-between px-4 py-3 bg-transparent rounded-xl cursor-pointer hover:bg-slate-50 transition-all border border-slate-100/50"
                                >
                                    <div class="flex items-center gap-2">
                                        <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Safe Drops / Vault</label>
                                        <Plus class="w-3 h-3 text-slate-400" />
                                    </div>
                                    <span class="text-sm font-black text-amber-600">${{ safeDrops.toFixed(2) }}</span>
                                </div>
                            </div>
                            
                            <div class="space-y-1.5">
                                <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Payouts / Expenses</label>
                                <div class="relative">
                                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 font-bold pointer-events-none">$</span>
                                    <input v-model.number="expenses" type="number" step="0.01" class="no-spinner w-full h-10 bg-slate-50 border border-rose-50 rounded-lg pl-8 pr-4 text-sm font-bold text-rose-600 focus:bg-white focus:border-rose-500 transition-all outline-none" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Checks & Money Orders -->
                    <div class="md:col-span-2 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-sm">
                        <div class="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <History class="w-4 h-4 text-primary-500" />
                                <h3 class="text-[10px] font-black text-slate-900 uppercase tracking-widest">Checks & Non-Cash Items</h3>
                            </div>
                            <button @click="addCheck" class="text-[10px] font-black uppercase text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors">
                                <Plus class="w-3 h-3" /> Add Check
                            </button>
                        </div>
                        <div class="p-4">
                            <div v-if="checks.length > 0" class="space-y-2">
                                <div v-for="(check, idx) in checks" :key="idx" class="flex gap-2 animate-in slide-in-from-left-2 duration-300">
                                    <input v-model="check.number" placeholder="Check/MO #" class="flex-1 h-9 bg-slate-50 border border-slate-100 rounded-lg px-3 text-xs font-bold outline-none focus:bg-white focus:border-primary-500" />
                                    <div class="relative w-32">
                                        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs pointer-events-none">$</span>
                                        <input v-model.number="check.amount" type="number" step="0.01" class="no-spinner w-full h-9 bg-slate-50 border border-slate-100 rounded-lg pl-6 pr-3 text-xs font-bold text-right outline-none focus:bg-white focus:border-emerald-500" />
                                    </div>
                                    <button @click="removeCheck(idx)" class="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 class="w-4 h-4" /></button>
                                </div>
                                <div class="pt-2 border-t border-slate-50 flex justify-between items-center px-2">
                                    <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Checks Subtotal</span>
                                    <span class="text-sm font-black text-slate-900">${{ checksTotal.toFixed(2) }}</span>
                                </div>
                            </div>
                            <div v-else class="text-center py-6">
                                <p class="text-[10px] font-bold text-slate-300 uppercase italic">No checks recorded for this shift</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Final Notes -->
                <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <label class="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] ml-1 block mb-3 italic">Handover Notes & Observations</label>
                    <textarea v-model="notes" class="w-full h-48 bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-primary-500 transition-all resize-none shadow-inner" placeholder="Standard field for variance explanations or shift notes..."></textarea>
                </div>

                <!-- Action Bar -->
                <div class="pt-4 border-t border-slate-200 flex justify-end gap-3">
                    <button class="px-6 py-3 rounded-xl bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Clear Form</button>
                    <button 
                        @click="saveShift"
                        :disabled="isSubmitting"
                        class="flex-1 max-w-[300px] py-4 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl shadow-slate-900/10 disabled:opacity-50"
                    >
                        <Save v-if="!isSubmitting" class="w-4 h-4" />
                        <span v-else class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                        {{ isSubmitting ? 'Processing...' : 'Submit Shift Final' }}
                    </button>
                </div>
            </div>

            <!-- Tasks Section -->
            <div v-if="activeTab === 'tasks'" class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-300">
                <div class="p-6 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                    <div>
                        <h3 class="text-base font-black text-slate-900 uppercase italic tracking-tighter">Shift Checklist</h3>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Status: {{ taskProgress }}% COMPLETE</p>
                    </div>
                    <div class="w-12 h-12 flex items-center justify-center relative">
                        <svg class="w-12 h-12 transform -rotate-90">
                            <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="4" fill="transparent" class="text-slate-100" />
                            <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="4" fill="transparent" 
                                class="text-emerald-500 transition-all duration-1000"
                                :stroke-dasharray="2 * Math.PI * 20"
                                :stroke-dashoffset="2 * Math.PI * 20 * (1 - taskProgress / 100)"
                                stroke-linecap="round"
                            />
                        </svg>
                        <div class="absolute text-[10px] font-black text-slate-900">{{ taskProgress }}%</div>
                    </div>
                </div>
                <div class="p-6 space-y-3">
                    <div 
                        v-for="task in tasks" 
                        :key="task.id"
                        @click="task.done = !task.done"
                        class="flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer group"
                        :class="task.done ? 'bg-emerald-50/30 border-emerald-100' : 'bg-white border-slate-100 hover:border-slate-300'"
                    >
                        <div class="flex items-center gap-4">
                            <div 
                                class="w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all"
                                :class="task.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200 group-hover:border-primary-500'"
                            >
                                <CheckCircle2 v-if="task.done" class="w-4 h-4" />
                            </div>
                            <span class="text-sm font-bold transition-all" :class="task.done ? 'text-emerald-700' : 'text-slate-600'">{{ task.label }}</span>
                        </div>
                        <span v-if="task.done" class="text-[9px] font-black uppercase text-emerald-500 tracking-widest">Verified</span>
                    </div>
                </div>
                <div class="p-6 bg-slate-50 border-t border-slate-100 text-center">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Automated shift log syncing active</p>
                </div>
            </div>
        </main>

        <!-- Sidebar Widgets -->
        <aside class="xl:col-span-4 space-y-4 overflow-y-auto custom-scrollbar pr-1 pb-4">
            
            <!-- Quick Time Clock -->
            <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
                <div class="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                    <Clock class="w-24 h-24" />
                </div>
                <div class="relative z-10 flex flex-col items-center text-center">
                    <div :class="['w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg transition-all', 
                        userActiveLog ? 'bg-emerald-50 text-emerald-600 shadow-emerald-500/10' : 'bg-slate-50 text-slate-400 shadow-slate-500/10']">
                        <Clock class="w-8 h-8" :class="userActiveLog ? 'animate-pulse' : ''" />
                    </div>
                    <h3 class="text-lg font-black text-slate-900 uppercase italic tracking-tighter">Time Registry</h3>
                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        {{ userActiveLog ? 'Shift in Progress' : 'No Active Session' }}
                    </p>
                    
                    <div class="mt-6 w-full space-y-3">
                         <div v-if="userActiveLog" class="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
                             <div class="text-left">
                                 <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Shift Started</p>
                                 <p class="text-xs font-bold text-slate-900">{{ formatTime(userActiveLog.clockIn) }}</p>
                             </div>
                             <div class="w-px h-6 bg-slate-200"></div>
                             <div class="text-right">
                                 <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Elapsed</p>
                                 <p class="text-xs font-bold text-primary-600 tabular-nums">{{ elapsedDuration }}</p>
                             </div>
                         </div>
                         <button 
                            @click="handleQuickRegistry"
                            :disabled="timesheetsStore.loading"
                            class="w-full py-4 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-900/10 disabled:opacity-50"
                         >
                            {{ userActiveLog ? 'End My Shift' : 'Clock In Now' }}
                         </button>
                    </div>
                </div>
            </div>

            <!-- Operations Feed -->
            <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-hidden flex flex-col">
                <div class="flex items-center gap-3 mb-6">
                    <div class="bg-amber-50 p-2 rounded-lg text-amber-600">
                        <Zap class="w-4 h-4" />
                    </div>
                    <h3 class="text-sm font-black text-slate-900 uppercase italic tracking-tighter">Feed Indicators</h3>
                </div>
                <div class="space-y-4">
                    <div v-for="i in 4" :key="i" class="flex gap-4 items-start pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                        <div class="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div>
                        <div class="min-w-0">
                            <p class="text-xs font-bold text-slate-800 line-clamp-1 leading-tight">Lottery Reconciliation Sync Complete</p>
                            <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 block">3m ago — Automated</span>
                        </div>
                    </div>
                </div>
                <button class="mt-6 w-full py-2 bg-slate-50 border border-slate-100 rounded-xl text-[9px] font-black uppercase text-slate-400 hover:text-slate-900 transition-all flex items-center justify-center gap-2">
                    View Full Audit <ChevronRight class="w-3 h-3" />
                </button>
            </div>

            <!-- Urgent Alerts -->
            <div class="bg-rose-50 border border-rose-100 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
                 <div class="flex items-center gap-4">
                     <div class="w-10 h-10 rounded-xl bg-white border border-rose-100 text-rose-500 flex items-center justify-center shrink-0">
                        <AlertCircle class="w-5 h-5" />
                     </div>
                     <div>
                         <h4 class="text-xs font-black text-rose-900 uppercase tracking-tighter">Stationary Alert</h4>
                         <p class="text-[10px] font-bold text-rose-600 leading-tight mt-1 truncate">Fuel low at Station 04</p>
                     </div>
                 </div>
            </div>
        </aside>
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
                            activeAuditType === 'closing' ? 'bg-indigo-500 text-white' : 'bg-amber-500 text-white']">
                            <Calculator class="w-8 h-8" />
                        </div>
                        <div>
                            <h2 class="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">
                                {{ activeAuditType === 'opening' ? 'Opening Balance Focus' : 
                                   activeAuditType === 'closing' ? 'Shift Closing Audit' : 'Vault / Safe Deposit' }}
                            </h2>
                            <p class="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mt-1">High-Precision Denomination Entry</p>
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
                        <CashDenominations label="Starting Register" v-model="openingCash" @update:details="(d) => openingDetails = d" />
                    </div>
                    <div v-if="activeAuditType === 'closing'" class="animate-in fade-in slide-in-from-bottom-5 duration-500">
                        <CashDenominations label="End of Shift Audit" v-model="closingCash" @update:details="(d) => closingDetails = d" />
                    </div>
                    <div v-if="activeAuditType === 'safe'" class="animate-in fade-in slide-in-from-bottom-5 duration-500">
                        <CashDenominations label="Vault Transfer Details" v-model="safeDrops" @update:details="(d) => safeDetails = d" />
                    </div>
                    
                    <!-- Quick Tips / Guidelines -->
                    <div class="mt-10 grid grid-cols-3 gap-6">
                        <div class="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm">
                            <h4 class="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Accuracy Check</h4>
                            <p class="text-[11px] text-slate-400 font-bold leading-relaxed">Ensure all physical bills match the quantity entered. Discrepancies over $1.00 must be noted.</p>
                        </div>
                        <div class="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm">
                            <h4 class="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Coin Policy</h4>
                            <p class="text-[11px] text-slate-400 font-bold leading-relaxed">Include all loose change and rolled coins currently in the register drawer.</p>
                        </div>
                        <div class="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm">
                            <h4 class="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Auto-Save</h4>
                            <p class="text-[11px] text-slate-400 font-bold leading-relaxed">Your counts are automatically buffered and saved when you return to the main terminal.</p>
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

.font-mono {
    font-family: 'JetBrains Mono', monospace;
}
</style>
