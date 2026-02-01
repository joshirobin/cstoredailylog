<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  FileText,
  CreditCard,
  Plus,
  ArrowUpRight,
  Target,
  Clock,
  ChevronRight,
  Activity
} from 'lucide-vue-next';
import { useSalesStore } from '../../stores/sales';
import { useAccountsStore } from '../../stores/accounts';
import { useInvoicesStore } from '../../stores/invoices';
import { useLocationsStore } from '../../stores/locations';
import TodaysShiftWidget from '../../components/dashboard/TodaysShiftWidget.vue';
import QuickTimeClockWidget from '../../components/dashboard/QuickTimeClockWidget.vue';
import WeatherWidget from '../../components/dashboard/WeatherWidget.vue';
import FuelPriceWatchWidget from '../../components/dashboard/FuelPriceWatchWidget.vue';

const salesStore = useSalesStore();
const accountsStore = useAccountsStore();
const invoicesStore = useInvoicesStore();
const locationsStore = useLocationsStore();

const isLoaded = ref(false);

onMounted(async () => {
    await Promise.all([
        locationsStore.fetchLocations(),
        salesStore.fetchLogs(),
        accountsStore.fetchAccounts(),
        invoicesStore.fetchInvoices()
    ]);
    setTimeout(() => isLoaded.value = true, 300);
});

// Real Data Calculations
const todayDate = new Date().toISOString().split('T')[0];

const totalSalesToday = computed(() => {
    const todayLog = salesStore.logs.find(l => l.date === todayDate);
    return todayLog ? todayLog.totalSales : 0;
});

const activeAccountsCount = computed(() => accountsStore.accounts.length);
const pendingInvoicesCount = computed(() => invoicesStore.invoices.filter(i => i.status !== 'Paid').length);

const outstandingBalance = computed(() => {
    return accountsStore.accounts.reduce((sum, acc) => {
        const balance = Number(acc.balance);
        return sum + (isNaN(balance) ? 0 : balance);
    }, 0);
});

// Chart Data (Last 7 Days)
const last7DaysSales = computed(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const log = salesStore.logs.find(l => l.date === dateStr);
        days.push({
            date: dateStr,
            label: d.toLocaleDateString('en-US', { weekday: 'short' }),
            sales: log ? log.totalSales : 0
        });
    }
    return days;
});

const maxSales = computed(() => Math.max(...last7DaysSales.value.map(d => d.sales), 1000));

// SVG Path for Main Revenue Chart
const revenuePath = computed(() => {
    const width = 400;
    const height = 120;
    if (last7DaysSales.value.length < 2) return "";
    const points = last7DaysSales.value.map((d, i) => {
        const x = (i / 6) * width;
        const y = height - (d.sales / (maxSales.value * 1.1)) * height;
        return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
});

const revenueAreaPath = computed(() => {
    const path = revenuePath.value;
    if (!path) return "";
    return `${path} L 400,120 L 0,120 Z`;
});

const recentLogs = computed(() => {
    return [...salesStore.logs]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5);
});
</script>

<template>
  <div class="p-2 sm:p-4 lg:p-6 space-y-6 max-w-[1800px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000">
    
    <!-- Top KPI Strip (Uber-Compact) -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Revenue Card -->
        <div class="glass-panel p-4 flex items-center gap-4 relative overflow-hidden group">
            <div class="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div class="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600 group-hover:scale-110 transition-transform duration-500 shadow-lg shadow-primary-500/10">
                <DollarSign class="w-6 h-6" />
            </div>
            <div>
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Today's Revenue</p>
                <p class="text-2xl font-black text-slate-900 tracking-tighter">${{ totalSalesToday.toLocaleString(undefined, { minimumFractionDigits: 0 }) }}</p>
            </div>
            <Activity class="absolute right-4 w-4 h-4 text-emerald-500" />
        </div>

        <!-- A/R Card -->
        <div class="glass-panel p-4 flex items-center gap-4 group">
            <div class="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 group-hover:rotate-12 transition-transform shadow-lg shadow-rose-500/10">
                <CreditCard class="w-6 h-6" />
            </div>
            <div>
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Outstanding A/R</p>
                <p class="text-2xl font-black text-rose-600 tracking-tighter">${{ outstandingBalance.toLocaleString(undefined, { maximumFractionDigits: 0 }) }}</p>
            </div>
        </div>

        <!-- Customer Card -->
        <div class="glass-panel p-4 flex items-center gap-4 group">
            <div class="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:-translate-y-1 transition-transform shadow-lg shadow-emerald-500/10">
                <Users class="w-6 h-6" />
            </div>
            <div>
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Accounts</p>
                <p class="text-2xl font-black text-emerald-600 tracking-tighter">{{ activeAccountsCount }}</p>
            </div>
        </div>

        <!-- Alerts Card -->
        <div class="glass-panel p-4 flex items-center gap-4 group">
            <div class="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-lg shadow-amber-500/10">
                <FileText class="w-6 h-6" />
            </div>
            <div>
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Bills</p>
                <p class="text-2xl font-black text-slate-900 tracking-tighter">{{ pendingInvoicesCount }}</p>
            </div>
        </div>
    </div>

    <!-- Main Content Bento Grid -->
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        <!-- Large Chart Section -->
        <div class="xl:col-span-2 glass-panel p-8 relative overflow-hidden flex flex-col justify-between min-h-[400px]">
            <div class="absolute top-0 right-0 p-12 opacity-5">
                <TrendingUp class="w-64 h-64 text-primary-500" />
            </div>
            
            <div class="flex items-center justify-between relative z-10 mb-8">
                <div>
                    <h2 class="text-3xl font-black text-slate-900 tracking-tight font-display italic uppercase">Sales Performance</h2>
                    <p class="text-slate-500 text-xs font-bold tracking-widest flex items-center gap-2 mt-1">
                        <span class="w-3 h-3 rounded-full bg-primary-500 ring-4 ring-primary-500/20"></span>
                        LAST 7 DAYS ANALYTICS
                    </p>
                </div>
                <div class="flex gap-2">
                    <button class="bg-slate-100 hover:bg-slate-200 p-2 rounded-lg text-slate-700 transition-all"><ArrowUpRight class="w-4 h-4" /></button>
                </div>
            </div>

            <!-- Custom Revenue Area Chart -->
            <div class="relative flex-1 w-full mt-4 group">
                <svg viewBox="0 0 400 120" class="w-full h-full preserve-3d">
                    <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="rgb(59, 130, 246)" stop-opacity="0.2" />
                            <stop offset="100%" stop-color="rgb(59, 130, 246)" stop-opacity="0" />
                        </linearGradient>
                    </defs>
                    <path :d="revenueAreaPath" fill="url(#areaGradient)" class="transition-all duration-1000" />
                    <path :d="revenuePath" fill="none" stroke="#3b82f6" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
                    
                    <!-- Dynamic Points -->
                    <circle v-for="(d, i) in last7DaysSales" :key="i" 
                        :cx="(i/6)*400" 
                        :cy="120 - (d.sales/(maxSales*1.1))*120" 
                        r="4" 
                        fill="#3b82f6"
                        class="hover:r-6 transition-all cursor-pointer"
                    >
                        <title>{{ d.label }}: ${{ d.sales }}</title>
                    </circle>
                </svg>

                <!-- Labels -->
                <div class="flex justify-between mt-4 px-1">
                    <div v-for="d in last7DaysSales" :key="d.date" class="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                        {{ d.label }}
                    </div>
                </div>
            </div>
            
            <!-- Quick Summary Bar -->
            <div class="mt-8 flex items-center gap-8 border-t border-slate-100 pt-6 relative z-10">
                <div class="flex flex-col">
                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Avg Daily</span>
                    <span class="text-xl font-bold text-slate-900 tracking-tighter">${{ (salesStore.logs.reduce((s, l) => s + l.totalSales, 0) / (salesStore.logs.length || 1)).toFixed(0) }}</span>
                </div>
                <div class="h-8 w-px bg-slate-100"></div>
                <div class="flex flex-col">
                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Highest Day</span>
                    <span class="text-xl font-bold text-emerald-600 tracking-tighter">${{ maxSales.toFixed(0) }}</span>
                </div>
                <div class="flex-1"></div>
                <RouterLink to="/sales" class="btn-primary py-2 px-6 text-[10px] font-black tracking-[0.2em] shadow-none flex items-center gap-2 uppercase">
                    Full History <ChevronRight class="w-4 h-4" />
                </RouterLink>
            </div>
        </div>

        <!-- Rigth Column: Performance Gauge & Actions -->
        <div class="space-y-6">
            <!-- Fuel Price Watch Widget -->
            <FuelPriceWatchWidget />

            <!-- Weather Widget -->
            <WeatherWidget />

            <!-- Time Clock Widget -->
            <QuickTimeClockWidget />

            <!-- Quick Action Grid -->
            <div class="grid grid-cols-2 gap-3">
                <button @click="$router.push('/sales')" class="p-6 rounded-3xl bg-white border border-slate-100 hover:border-primary-500/30 hover:bg-slate-50 transition-all text-center group shadow-sm">
                    <Plus class="w-8 h-8 text-primary-600 mx-auto mb-2 group-hover:scale-125 transition-all" />
                    <span class="text-[10px] font-bold text-slate-500 block tracking-widest uppercase group-hover:text-slate-900">New Sale</span>
                </button>
                <button @click="$router.push('/fuel')" class="p-6 rounded-3xl bg-white border border-slate-100 hover:border-primary-500/30 hover:bg-slate-50 transition-all text-center group shadow-sm">
                    <Target class="w-8 h-8 text-primary-600 mx-auto mb-2 group-hover:scale-125 transition-all" />
                    <span class="text-[10px] font-bold text-slate-500 block tracking-widest uppercase group-hover:text-slate-900">Fuel Log</span>
                </button>
                <button @click="$router.push('/payments')" class="p-6 rounded-3xl bg-white border border-slate-100 hover:border-primary-500/30 hover:bg-slate-50 transition-all text-center group shadow-sm">
                    <DollarSign class="w-8 h-8 text-primary-600 mx-auto mb-2 group-hover:scale-125 transition-all" />
                    <span class="text-[10px] font-bold text-slate-500 block tracking-widest uppercase group-hover:text-slate-900">Payments</span>
                </button>
                <button @click="$router.push('/invoices')" class="p-6 rounded-3xl bg-white border border-slate-100 hover:border-primary-500/30 hover:bg-slate-50 transition-all text-center group shadow-sm">
                    <FileText class="w-8 h-8 text-primary-600 mx-auto mb-2 group-hover:scale-125 transition-all" />
                    <span class="text-[10px] font-bold text-slate-500 block tracking-widest uppercase group-hover:text-slate-900">Invoices</span>
                </button>
            </div>

            <!-- Todays Staff Widget -->
            <TodaysShiftWidget class="xl:h-[450px]" />
        </div>
    </div>

    <!-- Bottom History Strip -->
    <div class="glass-panel p-6">
        <div class="flex items-center justify-between mb-6">
            <h3 class="text-sm font-black text-slate-900 italic tracking-[0.2em] uppercase flex items-center gap-2">
                <Clock class="w-4 h-4 text-primary-600" />
                Latest Settlements
            </h3>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div v-for="log in recentLogs" :key="log.id" class="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-primary-200 hover:shadow-lg transition-all">
                <div class="flex justify-between items-start mb-2">
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-primary-100 text-primary-700 uppercase tracking-tighter">{{ new Date(log.date).toLocaleDateString('en-US', { weekday: 'short' }) }}</span>
                    <span class="text-[11px] font-black text-emerald-600 tracking-tighter">${{ log.totalSales.toFixed(0) }}</span>
                </div>
                <p class="text-[11px] font-bold text-slate-900 truncate">{{ new Date(log.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) }}</p>
                <div class="mt-2 h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div class="bg-emerald-500 h-full" :style="{ width: Math.min((log.totalSales/maxSales)*100, 100) + '%' }"></div>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
.font-display {
    font-family: 'Outfit', sans-serif;
}

.preserve-3d {
    transform-style: preserve-3d;
}

@keyframes animate-in {
    from { opacity: 0; transform: translateY(10px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
}

.animate-in {
    animation: animate-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
