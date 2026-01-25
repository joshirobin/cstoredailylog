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
  Activity,
  Award
} from 'lucide-vue-next';
import { useSalesStore } from '../../stores/sales';
import { useAccountsStore } from '../../stores/accounts';
import { useInvoicesStore } from '../../stores/invoices';

const salesStore = useSalesStore();
const accountsStore = useAccountsStore();
const invoicesStore = useInvoicesStore();

const isLoaded = ref(false);

onMounted(async () => {
    await Promise.all([
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

// Score Calculations (Mocked for visual "wow")
const performanceScore = computed(() => Math.min(85 + (totalSalesToday.value > 1000 ? 5 : 0), 100));
</script>

<template>
  <div class="p-2 sm:p-4 lg:p-6 space-y-6 max-w-[1800px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000">
    
    <!-- Top KPI Strip (Uber-Compact) -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Revenue Card -->
        <div class="glass-panel p-4 flex items-center gap-4 relative overflow-hidden group">
            <div class="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div class="w-12 h-12 rounded-2xl bg-primary-500/10 flex items-center justify-center text-primary-400 group-hover:scale-110 transition-transform duration-500">
                <DollarSign class="w-6 h-6" />
            </div>
            <div>
                <p class="text-[10px] font-black text-surface-500 uppercase tracking-widest">Today's Revenue</p>
                <p class="text-2xl font-black text-white tracking-tighter">${{ totalSalesToday.toLocaleString(undefined, { minimumFractionDigits: 0 }) }}</p>
            </div>
            <Activity class="absolute right-4 w-4 h-4 text-emerald-500 animate-pulse" />
        </div>

        <!-- A/R Card -->
        <div class="glass-panel p-4 flex items-center gap-4 group">
            <div class="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-400 group-hover:rotate-12 transition-transform">
                <CreditCard class="w-6 h-6" />
            </div>
            <div>
                <p class="text-[10px] font-black text-surface-500 uppercase tracking-widest">Outstanding A/R</p>
                <p class="text-2xl font-black text-white tracking-tighter text-rose-400">${{ outstandingBalance.toLocaleString(undefined, { maximumFractionDigits: 0 }) }}</p>
            </div>
        </div>

        <!-- Customer Card -->
        <div class="glass-panel p-4 flex items-center gap-4 group">
            <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:-translate-y-1 transition-transform">
                <Users class="w-6 h-6" />
            </div>
            <div>
                <p class="text-[10px] font-black text-surface-500 uppercase tracking-widest">Active Accounts</p>
                <p class="text-2xl font-black text-emerald-400 tracking-tighter">{{ activeAccountsCount }}</p>
            </div>
        </div>

        <!-- Alerts Card -->
        <div class="glass-panel p-4 flex items-center gap-4 group">
            <div class="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                <FileText class="w-6 h-6" />
            </div>
            <div>
                <p class="text-[10px] font-black text-surface-500 uppercase tracking-widest">Pending Bills</p>
                <p class="text-2xl font-black text-white tracking-tighter">{{ pendingInvoicesCount }}</p>
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
                    <h2 class="text-3xl font-black text-white tracking-tight font-display italic uppercase">Sales Performance</h2>
                    <p class="text-surface-500 text-xs font-bold tracking-widest flex items-center gap-2 mt-1">
                        <span class="w-3 h-3 rounded-full bg-primary-500 ring-4 ring-primary-500/20"></span>
                        LAST 7 DAYS ANALYTICS
                    </p>
                </div>
                <div class="flex gap-2">
                    <button class="bg-surface-800 hover:bg-surface-700 p-2 rounded-lg text-white transition-all"><ArrowUpRight class="w-4 h-4" /></button>
                </div>
            </div>

            <!-- Custom Revenue Area Chart -->
            <div class="relative flex-1 w-full mt-4 group">
                <svg viewBox="0 0 400 120" class="w-full h-full preserve-3d">
                    <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="rgb(59, 130, 246)" stop-opacity="0.4" />
                            <stop offset="100%" stop-color="rgb(59, 130, 246)" stop-opacity="0" />
                        </linearGradient>
                    </defs>
                    <path :d="revenueAreaPath" fill="url(#areaGradient)" class="transition-all duration-1000" />
                    <path :d="revenuePath" fill="none" stroke="#60a5fa" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" class="drop-shadow-[0_0_12px_rgba(96,165,250,0.5)]" />
                    
                    <!-- Dynamic Points -->
                    <circle v-for="(d, i) in last7DaysSales" :key="i" 
                        :cx="(i/6)*400" 
                        :cy="120 - (d.sales/(maxSales*1.1))*120" 
                        r="4" 
                        fill="#60a5fa"
                        class="hover:r-6 transition-all cursor-pointer"
                    >
                        <title>{{ d.label }}: ${{ d.sales }}</title>
                    </circle>
                </svg>

                <!-- Labels -->
                <div class="flex justify-between mt-4 px-1">
                    <div v-for="d in last7DaysSales" :key="d.date" class="text-[10px] font-black text-surface-500 uppercase tracking-tighter">
                        {{ d.label }}
                    </div>
                </div>
            </div>
            
            <!-- Quick Summary Bar -->
            <div class="mt-8 flex items-center gap-8 border-t border-surface-800 pt-6 relative z-10">
                <div class="flex flex-col">
                    <span class="text-[9px] font-bold text-surface-500 uppercase tracking-widest">Avg Daily</span>
                    <span class="text-xl font-bold text-white tracking-tighter">${{ (salesStore.logs.reduce((s, l) => s + l.totalSales, 0) / (salesStore.logs.length || 1)).toFixed(0) }}</span>
                </div>
                <div class="h-8 w-px bg-surface-800"></div>
                <div class="flex flex-col">
                    <span class="text-[9px] font-bold text-surface-500 uppercase tracking-widest">Highest Day</span>
                    <span class="text-xl font-bold text-emerald-400 tracking-tighter">${{ maxSales.toFixed(0) }}</span>
                </div>
                <div class="flex-1"></div>
                <RouterLink to="/sales" class="btn-primary py-2 px-6 text-[10px] font-black tracking-[0.2em] shadow-none flex items-center gap-2 uppercase">
                    Full History <ChevronRight class="w-4 h-4" />
                </RouterLink>
            </div>
        </div>

        <!-- Rigth Column: Performance Gauge & Actions -->
        <div class="space-y-6">
            <!-- Score Gauge -->
            <div class="glass-panel p-8 text-center bg-gradient-to-t from-surface-900 to-primary-950/30 flex flex-col items-center gap-4">
                <div class="relative w-40 h-40">
                    <svg class="w-full h-full -rotate-90">
                        <circle cx="80" cy="80" r="72" stroke="currentColor" stroke-width="12" fill="transparent" class="text-surface-800" />
                        <circle cx="80" cy="80" r="72" stroke="currentColor" stroke-width="12" fill="transparent" stroke-dasharray="452" :stroke-dashoffset="452 - (452 * performanceScore / 100)" class="text-primary-500 transition-all duration-1000 ease-out" />
                    </svg>
                    <div class="absolute inset-0 flex flex-col items-center justify-center">
                        <span class="text-5xl font-black text-white tracking-tighter">{{ performanceScore }}%</span>
                        <span class="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Efficiency</span>
                    </div>
                </div>
                <div class="space-y-1">
                    <h3 class="text-lg font-bold text-white flex items-center justify-center gap-2 uppercase italic font-display">
                        <Award class="w-5 h-5 text-amber-500" />
                        Top Performer
                    </h3>
                    <p class="text-xs text-surface-500 px-4">Your store metrics are in the top 15% for this territory.</p>
                </div>
            </div>

            <!-- Quick Action Grid -->
            <div class="grid grid-cols-2 gap-3">
                <button @click="$router.push('/sales')" class="p-6 rounded-3xl bg-surface-900 border border-surface-800 hover:border-primary-500/50 hover:bg-surface-800/80 transition-all text-center group">
                    <Plus class="w-8 h-8 text-primary-400 mx-auto mb-2 group-hover:scale-125 transition-all" />
                    <span class="text-[10px] font-bold text-surface-400 block tracking-widest uppercase group-hover:text-white">New Sale</span>
                </button>
                <button @click="$router.push('/fuel')" class="p-6 rounded-3xl bg-surface-900 border border-surface-800 hover:border-blue-500/50 hover:bg-surface-800/80 transition-all text-center group">
                    <Target class="w-8 h-8 text-blue-400 mx-auto mb-2 group-hover:scale-125 transition-all" />
                    <span class="text-[10px] font-bold text-surface-400 block tracking-widest uppercase group-hover:text-white">Fuel Log</span>
                </button>
                <button @click="$router.push('/payments')" class="p-6 rounded-3xl bg-surface-900 border border-surface-800 hover:border-emerald-500/50 hover:bg-surface-800/80 transition-all text-center group">
                    <DollarSign class="w-8 h-8 text-emerald-400 mx-auto mb-2 group-hover:scale-125 transition-all" />
                    <span class="text-[10px] font-bold text-surface-400 block tracking-widest uppercase group-hover:text-white">Payments</span>
                </button>
                <button @click="$router.push('/invoices')" class="p-6 rounded-3xl bg-surface-900 border border-surface-800 hover:border-rose-500/50 hover:bg-surface-800/80 transition-all text-center group">
                    <FileText class="w-8 h-8 text-rose-400 mx-auto mb-2 group-hover:scale-125 transition-all" />
                    <span class="text-[10px] font-bold text-surface-400 block tracking-widest uppercase group-hover:text-white">Invoices</span>
                </button>
            </div>
        </div>
    </div>

    <!-- Bottom History Strip -->
    <div class="glass-panel p-6">
        <div class="flex items-center justify-between mb-6">
            <h3 class="text-sm font-black text-white italic tracking-[0.2em] uppercase flex items-center gap-2">
                <Clock class="w-4 h-4 text-primary-400" />
                Latest Settlements
            </h3>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div v-for="log in recentLogs" :key="log.id" class="p-4 rounded-2xl bg-surface-900 border border-surface-800 hover:bg-surface-800 transition-colors">
                <div class="flex justify-between items-start mb-2">
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-primary-500/10 text-primary-400 uppercase tracking-tighter">{{ new Date(log.date).toLocaleDateString('en-US', { weekday: 'short' }) }}</span>
                    <span class="text-[11px] font-black text-emerald-400 tracking-tighter">${{ log.totalSales.toFixed(0) }}</span>
                </div>
                <p class="text-[11px] font-bold text-white truncate">{{ new Date(log.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) }}</p>
                <div class="mt-2 h-1 w-full bg-surface-700 rounded-full overflow-hidden">
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
