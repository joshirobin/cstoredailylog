<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useLotteryStore } from '../../stores/lottery';
import { 
  AlertTriangle, ShieldCheck, 
  TrendingDown, Search,
  History, ArrowUpRight,
  Filter
} from 'lucide-vue-next';

const lotteryStore = useLotteryStore();

const searchQuery = ref('');

const shrinkageMetrics = computed(() => {
    const totalVariance = lotteryStore.history.reduce((sum, h) => sum + h.variance, 0);
    const totalAmount = lotteryStore.history.reduce((sum, h) => sum + h.varianceAmount, 0);
    const highRiskGames = [...new Set(lotteryStore.history.filter(h => h.variance < 0).map(h => h.bookId))].length;
    
    return {
        totalVariance,
        totalAmount,
        highRiskGames
    };
});

const filteredHistory = computed(() => {
    if (!searchQuery.value) return lotteryStore.history;
    const q = searchQuery.value.toLowerCase();
    return lotteryStore.history.filter(h => 
        h.bookId.toLowerCase().includes(q) || 
        h.date.includes(q)
    );
});

onMounted(async () => {
    await lotteryStore.fetchHistory();
    await lotteryStore.fetchBooks();
});
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-8 pb-20">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
            <h1 class="text-4xl font-[1000] text-slate-900 uppercase italic tracking-tighter leading-none mb-3">
                Lottery <span class="text-emerald-600">Shrinkage</span>
            </h1>
            <p class="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Theft Detection • Inventory Shrinkage Analysis</p>
        </div>

        <div class="flex items-center gap-4">
            <div class="bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm">
                <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-tight">Net Variance</p>
                <p :class="['text-xl font-black italic tracking-tighter leading-none', shrinkageMetrics.totalAmount < 0 ? 'text-rose-600' : 'text-emerald-600']">
                    ${{ shrinkageMetrics.totalAmount.toFixed(2) }}
                </p>
            </div>
        </div>
    </div>

    <!-- Shrinkage Analytics Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div class="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 mb-6">
                <AlertTriangle class="w-6 h-6" />
            </div>
            <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Missing Tickets</h3>
            <p class="text-3xl font-[1000] text-slate-900 uppercase italic tracking-tighter leading-none">
                {{ Math.abs(shrinkageMetrics.totalVariance) }} <span class="text-xs text-slate-300">UT</span>
            </p>
            <p class="mt-4 text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1">
                <TrendingDown class="w-3 h-3" /> High Risk Detected
            </p>
        </div>

        <div class="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div class="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 mb-6">
                <Filter class="w-6 h-6" />
            </div>
            <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">High Risk Books</h3>
            <p class="text-3xl font-[1000] text-slate-900 uppercase italic tracking-tighter leading-none">
                {{ shrinkageMetrics.highRiskGames }} <span class="text-xs text-slate-300">BN</span>
            </p>
            <p class="mt-4 text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-1">
                <ArrowUpRight class="w-3 h-3" /> Requires Audit
            </p>
        </div>

        <div class="bg-white p-8 rounded-[2.5rem] border border-slate-900 border-2 shadow-2xl shadow-slate-900/10">
            <div class="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white mb-6 font-black italic">
               SH
            </div>
            <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Shift Protection</h3>
            <p class="text-lg font-black text-slate-900 uppercase italic tracking-tighter leading-tight">
                Mandatory Shift Change Verification Active
            </p>
            <p class="mt-4 text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck class="w-4 h-4 text-emerald-500" /> Digital Chain of Custody
            </p>
        </div>
    </div>

    <!-- History Audit -->
    <div class="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div class="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400">
                    <History class="w-5 h-5" />
                </div>
                <h3 class="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Discrepancy Audit Log</h3>
            </div>
            
            <!-- Search -->
            <div class="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-slate-100">
                <Search class="w-4 h-4 text-slate-300" />
                <input v-model="searchQuery" placeholder="Filter audit trail..." class="bg-transparent border-none text-[10px] font-black uppercase tracking-widest focus:ring-0" />
            </div>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full text-left">
                <thead class="bg-slate-50/50">
                    <tr>
                        <th class="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                        <th class="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Book ID</th>
                        <th class="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Expected</th>
                        <th class="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actual</th>
                        <th class="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Variance</th>
                        <th class="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amt</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-50">
                    <tr v-for="h in filteredHistory" :key="h.id" class="hover:bg-slate-50/50 transition-colors">
                        <td class="px-8 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest">{{ h.date }}</td>
                        <td class="px-8 py-4">
                            <div class="flex items-center gap-3">
                                <div class="w-2 h-2 rounded-full" :class="h.variance < 0 ? 'bg-rose-500' : 'bg-emerald-500'"></div>
                                <span class="text-xs font-black text-slate-700 font-mono">{{ h.bookId }}</span>
                            </div>
                        </td>
                        <td class="px-8 py-4 text-xs font-bold text-slate-400">{{ h.expectedRemaining }}</td>
                        <td class="px-8 py-4 text-xs font-bold text-slate-900">{{ h.physicalRemaining }}</td>
                        <td class="px-8 py-4">
                            <span :class="['text-xs font-black', h.variance < 0 ? 'text-rose-600' : 'text-emerald-600']">
                                {{ h.variance > 0 ? '+' : '' }}{{ h.variance }}
                            </span>
                        </td>
                        <td class="px-8 py-4 text-right">
                            <span :class="['text-xs font-black font-mono', h.varianceAmount < 0 ? 'text-rose-600' : 'text-emerald-600']">
                                {{ h.varianceAmount < 0 ? '-' : '' }}${{ Math.abs(h.varianceAmount).toFixed(2) }}
                            </span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
  </div>
</template>
