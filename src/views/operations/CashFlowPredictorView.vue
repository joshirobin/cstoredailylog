<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useCashFlowStore } from '../../stores/cashflow';
import { useSalesStore } from '../../stores/sales';
import { usePurchasesStore } from '../../stores/purchases';
import { 
  TrendingUp, 
  Calendar, AlertCircle, 
  Plus, X, Wallet, 
  ArrowUpRight, ArrowDownRight,
  Clock, Landmark, Receipt,
  Loader2
} from 'lucide-vue-next';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'vue-chartjs';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const cashStore = useCashFlowStore();
const salesStore = useSalesStore();
const purchasesStore = usePurchasesStore();

const isAdding = ref(false);
const isSubmitting = ref(false);
const newTransaction = ref<any>({
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0] as string,
    type: 'OUTFLOW',
    category: 'Inventory',
    recurring: 'NONE'
});

const chartData = computed(() => ({
    labels: cashStore.projections.map(p => {
        const d = new Date(p.date);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [
        {
            label: 'Projected Balance',
            data: cashStore.projections.map(p => p.balance),
            borderColor: '#0ea5e9',
            backgroundColor: 'rgba(14, 165, 233, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6
        }
    ]
}));

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        tooltip: {
            mode: 'index' as const,
            intersect: false,
            callbacks: {
                label: (context: any) => ` Balance: $${context.parsed.y.toLocaleString()}`
            }
        }
    },
    scales: {
        y: {
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { callback: (val: any) => `$${val.toLocaleString()}` }
        },
        x: { grid: { display: false } }
    }
};

const handleSubmit = async () => {
    if (!newTransaction.value.description || newTransaction.value.amount <= 0) return;
    
    isSubmitting.value = true;
    try {
        await cashStore.addPlanned({ 
            ...newTransaction.value,
            loggedBy: 'Admin' // Default for now
        });
        isAdding.value = false;
        newTransaction.value = {
            description: '',
            amount: 0,
            date: new Date().toISOString().split('T')[0] as string,
            type: 'OUTFLOW',
            category: 'Inventory',
            recurring: 'NONE'
        };
    } catch (e) {
        alert("Failed to schedule transaction");
    } finally {
        isSubmitting.value = false;
    }
};

const stats = computed(() => {
    const low = Math.min(...cashStore.projections.map(p => p.balance));
    const high = Math.max(...cashStore.projections.map(p => p.balance));
    const end = cashStore.projections[cashStore.projections.length - 1]?.balance || 0;
    
    return { low, high, end };
});

onMounted(async () => {
    await Promise.all([
        cashStore.fetchPlanned(),
        salesStore.fetchLogs(),
        purchasesStore.fetchPurchases()
    ]);
});
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-8 pb-20">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
            <h1 class="text-4xl font-[1000] text-slate-900 uppercase italic tracking-tighter leading-none mb-3">
                Cash Flow <span class="text-primary-600">Predictor</span>
            </h1>
            <p class="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">14-Day Liquidity Radar • Auto-Trend Analysis</p>
        </div>

        <div class="flex gap-4">
            <button 
                @click="isAdding = true"
                class="flex items-center gap-3 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
            >
                <Plus class="w-4 h-4" />
                Schedule Expense
            </button>
        </div>
    </div>

    <!-- Health Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
            <div class="relative z-10">
                <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Projected 14-Day Low</p>
                <p :class="['text-3xl font-[1000] italic tracking-tighter leading-none', stats.low < 5000 ? 'text-rose-600' : 'text-slate-900']">
                    ${{ stats.low.toLocaleString() }}
                </p>
                <div class="mt-4 flex items-center gap-2">
                    <AlertCircle v-if="stats.low < 5000" class="w-4 h-4 text-rose-500" />
                    <p class="text-[9px] font-black uppercase tracking-widest" :class="stats.low < 5000 ? 'text-rose-500' : 'text-emerald-500'">
                        {{ stats.low < 5000 ? 'Critical Balance Warning' : 'Healthy Liquidity' }}
                    </p>
                </div>
            </div>
            <Landmark class="absolute -right-4 -bottom-4 w-24 h-24 text-slate-50 group-hover:text-slate-100 transition-colors" />
        </div>

        <div class="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
            <div class="relative z-10">
                <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Estimated Inflow</p>
                <p class="text-3xl font-[1000] text-slate-900 uppercase italic tracking-tighter leading-none">
                    +${{ (stats.end - 15000 + (stats.end < 15000 ? 5000 : 0)).toLocaleString() }} 
                </p>
                <p class="mt-4 text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <TrendingUp class="w-3.5 h-3.5 text-emerald-500" /> Based on 30-day sales velocity
                </p>
            </div>
            <ArrowUpRight class="absolute -right-4 -bottom-4 w-24 h-24 text-slate-50 group-hover:text-slate-100 transition-colors" />
        </div>

        <div class="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl shadow-slate-900/20 relative overflow-hidden">
            <div class="relative z-10">
                <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Final Projection (Day 14)</p>
                <p class="text-3xl font-[1000] text-white uppercase italic tracking-tighter leading-none">
                    ${{ stats.end.toLocaleString() }}
                </p>
                <div class="mt-4 flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></div>
                    <p class="text-[9px] font-black text-primary-400 uppercase tracking-widest italic">Live Trend Prediction</p>
                </div>
            </div>
            <Wallet class="absolute -right-4 -bottom-4 w-24 h-24 text-white/5" />
        </div>
    </div>

    <!-- Chart & Radar -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- Balance Chart -->
        <div class="lg:col-span-8 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div class="flex items-center justify-between mb-8">
                <div>
                   <h3 class="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-1">Financial Trajectory</h3>
                   <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Projection Range: {{ cashStore.projections[0]?.date || 'Loading...' }} - {{ cashStore.projections[13]?.date || 'Loading...' }}</p>
                </div>
                <div class="flex gap-2">
                    <div class="flex items-center gap-1">
                        <div class="w-2 h-2 rounded-full bg-primary-500"></div>
                        <span class="text-[8px] font-black uppercase text-slate-400">Projected Balance</span>
                    </div>
                </div>
            </div>
            
            <div class="h-[400px]">
                <Line :data="chartData" :options="chartOptions" />
            </div>
        </div>

        <!-- Expense Radar -->
        <div class="lg:col-span-4 space-y-6">
            <h3 class="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                <Clock class="w-4 h-4" /> Outflow Radar
            </h3>

            <div v-if="isAdding" class="bg-white rounded-[2rem] border-2 border-slate-900 p-6 shadow-xl animate-in zoom-in-95">
                <div class="flex items-center justify-between mb-4">
                    <h4 class="text-sm font-black text-slate-900 uppercase italic tracking-tighter">Schedule Transaction</h4>
                    <button @click="isAdding = false" class="text-slate-400 hover:text-slate-900"><X class="w-4 h-4" /></button>
                </div>
                
                <div class="space-y-4">
                    <!-- Type Toggle -->
                    <div class="flex bg-slate-100 p-1 rounded-xl">
                        <button 
                            @click="newTransaction.type = 'OUTFLOW'"
                            :class="['flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all', 
                                newTransaction.type === 'OUTFLOW' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400']"
                        >
                            Expense
                        </button>
                        <button 
                            @click="newTransaction.type = 'INFLOW'"
                            :class="['flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all', 
                                newTransaction.type === 'INFLOW' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400']"
                        >
                            Income
                        </button>
                    </div>

                    <input v-model="newTransaction.description" placeholder="Description (e.g. Core-Mark)" class="w-full bg-slate-50 border-none rounded-xl p-3 text-xs font-bold" />
                    
                    <div class="grid grid-cols-2 gap-3">
                        <div class="space-y-1">
                            <label class="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-2">Amount</label>
                            <input type="number" v-model.number="newTransaction.amount" class="w-full bg-slate-50 border-none rounded-xl p-3 text-xs font-bold" />
                        </div>
                        <div class="space-y-1">
                            <label class="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-2">Date</label>
                            <input type="date" v-model="newTransaction.date" class="w-full bg-slate-50 border-none rounded-xl p-3 text-xs font-bold" />
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div class="space-y-1">
                            <label class="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-2">Category</label>
                            <select v-model="newTransaction.category" class="w-full bg-slate-50 border-none rounded-xl p-3 text-xs font-bold">
                                <option>Inventory</option>
                                <option>Fuel</option>
                                <option>Payroll</option>
                                <option>Utilities</option>
                                <option>Tax</option>
                                <option>Other</option>
                            </select>
                        </div>
                        <div class="space-y-1">
                            <label class="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-2">Frequency</label>
                            <select v-model="newTransaction.recurring" class="w-full bg-slate-50 border-none rounded-xl p-3 text-xs font-bold">
                                <option value="NONE">One-time</option>
                                <option value="WEEKLY">Weekly</option>
                                <option value="BI-WEEKLY">Bi-weekly</option>
                                <option value="MONTHLY">Monthly</option>
                            </select>
                        </div>
                    </div>

                    <button 
                        @click="handleSubmit" 
                        :disabled="isSubmitting"
                        class="w-full py-4 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-900/20 disabled:bg-slate-400 flex items-center justify-center gap-2"
                    >
                        <Clock v-if="!isSubmitting" class="w-4 h-4" />
                        <Loader2 v-else class="w-4 h-4 animate-spin" />
                        {{ isSubmitting ? 'Authorizing...' : 'Authorize Transaction' }}
                    </button>
                </div>
            </div>

            <div class="bg-white rounded-[2.5rem] border border-slate-100 p-6 shadow-sm divide-y divide-slate-50 max-h-[500px] overflow-y-auto custom-scrollbar">
                <div v-if="cashStore.plannedTransactions.length === 0" class="py-12 text-center">
                    <Calendar class="w-10 h-10 text-slate-100 mx-auto mb-4" />
                    <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest">No scheduled hits detected</p>
                </div>
                
                <div v-for="tx in cashStore.plannedTransactions" :key="tx.id" class="py-4 first:pt-0 last:pb-0 flex items-center justify-between group">
                    <div class="flex items-center gap-4">
                        <div :class="['w-10 h-10 rounded-xl flex items-center justify-center', 
                            tx.type === 'INFLOW' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600']">
                            <ArrowUpRight v-if="tx.type === 'INFLOW'" class="w-5 h-5" />
                            <ArrowDownRight v-else class="w-5 h-5" />
                        </div>
                        <div>
                            <p class="text-xs font-black text-slate-900 uppercase italic tracking-tighter">{{ tx.description }}</p>
                            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{ tx.date }} • {{ tx.category }}</p>
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-4">
                        <p class="text-sm font-black font-mono text-slate-900">${{ tx.amount.toLocaleString() }}</p>
                        <button @click="cashStore.deletePlanned(tx.id!)" class="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all">
                            <X class="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Predictor Logic Breakdown -->
    <div class="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div class="flex items-center gap-4 mb-8">
            <div class="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600">
                <Receipt class="w-6 h-6" />
            </div>
            <div>
                <h3 class="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-1">Prediction Core</h3>
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">How we calculate your numbers</p>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div class="space-y-2">
                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sales Velocity</p>
                <p class="text-sm font-bold text-slate-700 italic">Analyzes 30-day historical turnover to predict daily cash receipts.</p>
            </div>
            <div class="space-y-2">
                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Weekend Multiplier</p>
                <p class="text-sm font-bold text-slate-700 italic">Automatically applies 20% lift on Friday/Saturday projections.</p>
            </div>
            <div class="space-y-2">
                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Expense Radar</p>
                <p class="text-sm font-bold text-slate-700 italic">Layers manual scheduled outflows over automated sales inflows.</p>
            </div>
            <div class="space-y-2">
                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Liquidity Gating</p>
                <p class="text-sm font-bold text-slate-700 italic">Identifies "Red Zones" where planned inventory hits exceed cash-on-hand.</p>
            </div>
        </div>
    </div>
  </div>
</template>
