<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useLotteryStore } from '../../stores/lottery';
import { 
  TrendingUp, 
  ChevronLeft,
  DollarSign,
  Ticket,
  AlertOctagon,
  BarChart3,
  Sparkles
} from 'lucide-vue-next';
import { useRouter } from 'vue-router';

const router = useRouter();
const lotteryStore = useLotteryStore();

onMounted(async () => {
    await Promise.all([
        lotteryStore.fetchGames(),
        lotteryStore.fetchBooks(),
        lotteryStore.fetchHistory(),
        lotteryStore.fetchDailyCounts((new Date().toISOString().split('T')[0]) as string) // In case we want today's specifically
    ]);
});

// Calculate metrics from history
const totalRevenue = computed(() => {
    return lotteryStore.history.reduce((sum, item) => sum + (item.salesAmount || 0), 0);
});

const totalTicketsSold = computed(() => {
    return lotteryStore.history.reduce((sum, item) => sum + (item.soldCount || 0), 0);
});

// Revenue trends (by date)
const revenueDates = computed(() => {
    const datesMap: Record<string, number> = {};
    lotteryStore.history.forEach(item => {
        const currentAmount = datesMap[item.date] || 0;
        datesMap[item.date] = currentAmount + (item.salesAmount || 0);
    });
    
    // Sort oldest to newest for a chart if needed
    return Object.entries(datesMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, amount]) => ({ date, amount }));
});

// Top games
const topGames = computed(() => {
    const gamesMap: Record<string, { name: string, tickets: number, sales: number }> = {};
    
    lotteryStore.history.forEach(item => {
        if (!gamesMap[item.bookId]) {
            const book = lotteryStore.books.find(b => b.id === item.bookId);
            gamesMap[item.bookId] = { 
                name: book?.gameName || 'Unknown Game', 
                tickets: 0, 
                sales: 0 
            };
        }
        // Use non-null assertion since we just ensured it exists above
        const stats = gamesMap[item.bookId]!;
        stats.tickets += item.soldCount || 0;
        stats.sales += item.salesAmount || 0;
    });

    return Object.values(gamesMap)
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5); // Top 5
});

// Variance Analysis
const variances = computed(() => {
    return lotteryStore.history.filter(h => h.variance !== 0);
});

const totalVarianceAmount = computed(() => {
    return variances.value.reduce((sum, v) => sum + (v.varianceAmount || 0), 0);
});

// AI Insights Generator
const aiInsights = computed(() => {
    const insights: { id: string, title: string, description: string, type: 'positive' | 'warning' | 'neutral' }[] = [];
    
    // 1. Slow moving inventory (No sales in 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const slowGames = lotteryStore.activeBooks.filter(book => {
         const recentSales = lotteryStore.history.filter(h => h.bookId === book.id && new Date(h.date) > thirtyDaysAgo);
         return recentSales.length === 0;
    });

    if (slowGames.length > 0) {
        insights.push({
            id: 'slow-moving',
            title: 'Stagnant Inventory Detected',
            description: `You have ${slowGames.length} active packs that haven't registered sales in the last 30 days. Consider moving them to a more visible slot or preparing them for return.`,
            type: 'warning'
        });
    }

    // 2. High performing game
    if (topGames.value.length > 0) {
        const top = topGames.value[0];
        if (top) {
            insights.push({
                id: 'high-performer',
                title: 'Top Performer Identified',
                description: `${top.name} is driving the most revenue ($${top.sales.toFixed(2)}). Ensure you have ample backup stock in the safe to prevent out-of-stocks.`,
                type: 'positive'
            });
        }
    }

    // 3. Variance Analysis
    if (totalVarianceAmount.value && totalVarianceAmount.value < -100) {
         insights.push({
            id: 'high-variance',
            title: 'Critical Shrinkage Warning',
            description: `Your total variance loss ($${Math.abs(totalVarianceAmount.value).toFixed(2)}) is unusually high. An immediate audit of high-value bins is recommended.`,
            type: 'warning'
        });
    }

    if (insights.length === 0) {
        insights.push({
            id: 'all-good',
            title: 'System Optimal',
            description: 'Sales are tracking normally with no abnormal inventory patterns detected.',
            type: 'neutral'
        });
    }

    return insights;
});

</script>

<template>
  <div class="max-w-7xl mx-auto space-y-8 pb-12">
    <!-- Header -->
    <div class="flex items-center gap-4">
        <button @click="router.push('/lottery')" class="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <ChevronLeft class="w-6 h-6 text-slate-400" />
        </button>
        <div>
           <h2 class="text-3xl font-black font-display text-slate-900 uppercase italic tracking-tighter">Analytics & Reports</h2>
           <p class="text-slate-500 font-bold uppercase tracking-widest text-xs mt-1">Sales Trends & Performance</p>
        </div>
    </div>

    <!-- AI Insights Panel -->
    <div class="glass-panel p-6 border-l-4 border-indigo-500 relative overflow-hidden">
        <!-- Background decoration -->
        <div class="absolute -right-12 -top-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl rounded-full"></div>
        
        <div class="flex items-center gap-2 mb-6 relative">
            <Sparkles class="w-5 h-5 text-indigo-500" />
            <h3 class="font-bold font-display text-slate-900 uppercase italic">AI Powered Insights</h3>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative">
            <div v-for="insight in aiInsights" :key="insight.id" 
                class="p-5 rounded-xl border flex flex-col gap-2 transition-transform hover:scale-[1.02]"
                :class="{
                    'bg-emerald-50/50 border-emerald-100': insight.type === 'positive',
                    'bg-rose-50/50 border-rose-100': insight.type === 'warning',
                    'bg-slate-50/50 border-slate-100': insight.type === 'neutral'
                }"
            >
                <div class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full" 
                        :class="{
                            'bg-emerald-500': insight.type === 'positive',
                            'bg-rose-500': insight.type === 'warning',
                            'bg-slate-400': insight.type === 'neutral'
                        }"
                    ></div>
                    <h4 class="text-xs font-black uppercase tracking-widest"
                        :class="{
                            'text-emerald-700': insight.type === 'positive',
                            'text-rose-700': insight.type === 'warning',
                            'text-slate-700': insight.type === 'neutral'
                        }"
                    >{{ insight.title }}</h4>
                </div>
                <p class="text-sm text-slate-600 font-medium leading-relaxed">{{ insight.description }}</p>
            </div>
        </div>
    </div>

    <!-- Overview Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="glass-panel p-6 flex items-center justify-between">
            <div>
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Historical Sales</p>
                <p class="text-4xl font-black text-emerald-600 tracking-tighter mt-1">${{ totalRevenue.toFixed(2) }}</p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <DollarSign class="w-6 h-6" />
            </div>
        </div>

        <div class="glass-panel p-6 flex items-center justify-between">
            <div>
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Tickets Sold</p>
                <p class="text-4xl font-black text-slate-900 tracking-tighter mt-1">{{ totalTicketsSold.toLocaleString() }}</p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Ticket class="w-6 h-6" />
            </div>
        </div>

        <div class="glass-panel p-6 flex items-center justify-between">
            <div>
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Variance Loss</p>
                <p class="text-4xl font-black text-rose-500 tracking-tighter mt-1">${{ totalVarianceAmount.toFixed(2) }}</p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
                <AlertOctagon class="w-6 h-6" />
            </div>
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Revenue Trends -->
        <div class="glass-panel p-6">
            <div class="flex items-center gap-3 mb-6">
                <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <TrendingUp class="w-4 h-4" />
                </div>
                <h3 class="font-bold font-display text-slate-900 uppercase italic">Revenue Trends (Daily)</h3>
            </div>
            
            <div class="space-y-4">
                <div v-for="day in revenueDates" :key="day.date" class="flex items-center justify-between p-3 flex-wrap hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                    <div class="font-mono font-bold text-slate-700">{{ day.date }}</div>
                    <div class="flex items-center gap-4">
                        <div class="h-2 bg-emerald-100 rounded-full w-32 md:w-48 overflow-hidden">
                            <!-- Simple visual bar, scaled to max revenue -->
                            <div class="h-full bg-emerald-500 rounded-full" :style="{ width: `${(day.amount / Math.max(...revenueDates.map(d => d.amount))) * 100}%` }"></div>
                        </div>
                        <div class="font-mono font-black text-emerald-600 min-w-[80px] text-right">${{ day.amount.toFixed(2) }}</div>
                    </div>
                </div>
                <div v-if="revenueDates.length === 0" class="text-center py-8 text-slate-400 text-xs font-bold uppercase tracking-widest">
                    No revenue data available
                </div>
            </div>
        </div>

        <!-- Top Performing Games -->
        <div class="glass-panel p-6">
            <div class="flex items-center gap-3 mb-6">
                <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <BarChart3 class="w-4 h-4" />
                </div>
                <h3 class="font-bold font-display text-slate-900 uppercase italic">Top Performing Games</h3>
            </div>

            <div class="space-y-4">
                 <div v-for="(game, idx) in topGames" :key="game.name" class="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                    <div class="flex items-center gap-4">
                        <div class="w-6 h-6 rounded bg-slate-100 text-slate-400 flex items-center justify-center font-black text-xs">{{ idx + 1 }}</div>
                        <div class="font-bold text-slate-700">{{ game.name }}</div>
                    </div>
                    <div class="text-right">
                        <div class="font-black text-slate-900">${{ game.sales.toFixed(2) }}</div>
                        <div class="text-[10px] font-bold text-slate-400 uppercase">{{ game.tickets }} Tickets</div>
                    </div>
                </div>
                <div v-if="topGames.length === 0" class="text-center py-8 text-slate-400 text-xs font-bold uppercase tracking-widest">
                    No game data available
                </div>
            </div>
        </div>
    </div>

    <!-- Variance Analysis Report -->
    <div class="glass-panel p-6">
        <div class="flex items-center gap-3 mb-6">
            <div class="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center">
                <AlertOctagon class="w-4 h-4" />
            </div>
            <h3 class="font-bold font-display text-slate-900 uppercase italic">Variance Analysis Report</h3>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
                <thead class="bg-slate-50 text-xs uppercase text-slate-500 font-bold">
                    <tr>
                        <th class="px-4 py-3">Date</th>
                        <th class="px-4 py-3">Register / Slot</th>
                        <th class="px-4 py-3 text-right">Variance #</th>
                        <th class="px-4 py-3 text-right">Variance $</th>
                        <th class="px-4 py-3">Reason</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <tr v-for="item in variances" :key="item.id" class="hover:bg-slate-50 transition-colors">
                        <td class="px-4 py-3 font-mono text-slate-600">{{ item.date }}</td>
                        <td class="px-4 py-3">
                            <span class="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 font-bold">Slot {{ item.slotNumber || '?' }}</span>
                        </td>
                        <td class="px-4 py-3 text-right font-mono font-bold" :class="item.variance < 0 ? 'text-rose-500' : 'text-emerald-500'">
                            {{ item.variance > 0 ? '+' : '' }}{{ item.variance }}
                        </td>
                        <td class="px-4 py-3 text-right font-mono font-black" :class="(item.varianceAmount || 0) < 0 ? 'text-rose-600' : 'text-emerald-600'">
                            {{ (item.varianceAmount || 0) > 0 ? '+' : '' }}${{ item.varianceAmount?.toFixed(2) || '0.00' }}
                        </td>
                        <td class="px-4 py-3">
                            <div class="flex items-center gap-2">
                                <span v-if="item.reasonCode" class="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded" 
                                    :class="{
                                        'bg-rose-100 text-rose-700': item.reasonCode === 'THEFT',
                                        'bg-amber-100 text-amber-700': item.reasonCode === 'DAMAGED',
                                        'bg-slate-200 text-slate-700': item.reasonCode === 'UNKNOWN' || item.reasonCode === 'MISCOUNT'
                                    }"
                                >{{ item.reasonCode }}</span>
                                <span class="text-xs text-slate-500">{{ item.notes || 'No notes' }}</span>
                            </div>
                        </td>
                    </tr>
                    <tr v-if="variances.length === 0">
                        <td colspan="5" class="px-4 py-8 text-center text-slate-400 text-xs uppercase tracking-widest">No variances recorded</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
  </div>
</template>
