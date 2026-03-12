<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useForecastingStore } from '../../stores/forecasting';
import { 
    BrainCircuit,
    TrendingUp, 
    AlertTriangle, 
    CheckCircle2, 
    ArrowUpRight,
    Search,
    RefreshCw
} from 'lucide-vue-next';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'vue-chartjs';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const forecastingStore = useForecastingStore();
const activeTab = ref<'overview' | 'anomalies'>('overview');

onMounted(async () => {
    // Initial data load
    if (forecastingStore.salesForecast.length === 0) {
        await forecastingStore.generateForecast();
    }
    if (forecastingStore.anomalies.length === 0) {
        await forecastingStore.detectAnomalies();
    }
});

// --- Chart Configuration ---
const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: false
        },
        tooltip: {
            mode: 'index' as const,
            intersect: false,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            titleColor: '#1e293b',
            bodyColor: '#475569',
            borderColor: '#e2e8f0',
            borderWidth: 1,
            padding: 12,
            boxPadding: 6,
            usePointStyle: true,
            titleFont: { weight: 'bold' as const, size: 14 },
            bodyFont: { size: 13 }
        }
    },
    scales: {
        y: {
            beginAtZero: false,
            grid: {
                color: '#f1f5f9',
            },
            ticks: {
                callback: (value: any) => '$' + value,
                font: { size: 11, weight: 'bold' as const },
                color: '#94a3b8'
            }
        },
        x: {
            grid: {
                display: false
            },
            ticks: {
                font: { size: 11, weight: 'bold' as const },
                color: '#94a3b8'
            }
        }
    },
    interaction: {
        intersect: false,
        mode: 'index' as const,
    },
};

const chartData = computed(() => ({
    labels: forecastingStore.salesForecast.map(d => {
        const date = new Date(d.date);
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }),
    datasets: [
        {
            label: 'Projected Sales',
            backgroundColor: (context: any) => {
                const ctx = context.chart.ctx;
                const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                gradient.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
                gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
                return gradient;
            },
            borderColor: '#10b981',
            borderWidth: 3,
            data: forecastingStore.salesForecast.map(d => d.predictedSales),
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#10b981',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6
        }
    ]
}));

// --- Helper Functions ---
const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
};

const getSeverityStyles = (severity: string) => {
    switch(severity) {
        case 'CRITICAL': return 'bg-rose-100 text-rose-700 border-rose-200';
        case 'HIGH': return 'bg-orange-100 text-orange-700 border-orange-200';
        case 'MEDIUM': return 'bg-amber-100 text-amber-700 border-amber-200';
        default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
};

</script>

<template>
  <div class="max-w-7xl mx-auto space-y-8 pb-20">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
            <div class="flex items-center gap-3 mb-2">
                <div class="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                    <BrainCircuit class="w-6 h-6" />
                </div>
                <h1 class="text-3xl font-black font-display text-slate-900 uppercase italic tracking-tighter">AI Command Center</h1>
            </div>
            <p class="text-slate-500 font-bold uppercase tracking-widest text-xs">Predictive Analytics & Anomaly Detection</p>
        </div>
        
        <div class="flex items-center gap-3">
            <button 
                @click="forecastingStore.generateForecast()" 
                class="btn-secondary flex items-center gap-2"
                :disabled="forecastingStore.loading"
            >
                <RefreshCw class="w-4 h-4" :class="{'animate-spin': forecastingStore.loading}" />
                Update Predictions
            </button>
        </div>
    </div>

    <!-- Key Metrics (Predictions) -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Next 7 Days Forecast -->
        <div class="glass-panel p-6 relative overflow-hidden group">
            <div class="absolute right-0 top-0 p-32 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/10 transition-all"></div>
            
            <div class="flex justify-between items-start mb-4 relative">
                <div>
                    <h3 class="text-xs font-black uppercase text-slate-400 tracking-widest mb-1">7-Day Forecast</h3>
                    <div class="text-3xl font-black text-slate-900 tracking-tight">
                        {{ formatCurrency(forecastingStore.salesForecast.reduce((acc, curr) => acc + curr.predictedSales, 0)) }}
                    </div>
                </div>
                <div class="p-2 bg-emerald-100 rounded-xl text-emerald-600">
                    <TrendingUp class="w-5 h-5" />
                </div>
            </div>
            
            <div class="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 py-1 px-2 rounded-lg w-fit">
                <ArrowUpRight class="w-3 h-3" />
                <span>+12.5% vs Last Week</span>
            </div>
        </div>

        <!-- Detected Anomalies -->
        <div class="glass-panel p-6 relative overflow-hidden group border-l-4 border-rose-500">
             <div class="absolute right-0 top-0 p-32 bg-rose-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-rose-500/10 transition-all"></div>
            
            <div class="flex justify-between items-start mb-4 relative">
                <div>
                    <h3 class="text-xs font-black uppercase text-slate-400 tracking-widest mb-1">Active Alerts</h3>
                    <div class="text-3xl font-black text-slate-900 tracking-tight">
                        {{ forecastingStore.anomalies.filter(a => a.status === 'NEW').length }}
                    </div>
                </div>
                <div class="p-2 bg-rose-100 rounded-xl text-rose-600">
                    <AlertTriangle class="w-5 h-5" />
                </div>
            </div>
            
            <p class="text-xs text-rose-600 font-bold mt-2">Requires immediate attention</p>
        </div>

        <!-- Inventory Optimization -->
        <div class="glass-panel p-6 relative overflow-hidden group">
             <div class="absolute right-0 top-0 p-32 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/10 transition-all"></div>
            
            <div class="flex justify-between items-start mb-4 relative">
                <div>
                    <h3 class="text-xs font-black uppercase text-slate-400 tracking-widest mb-1">Reorder Suggestions</h3>
                    <div class="text-3xl font-black text-slate-900 tracking-tight">8 Items</div>
                </div>
                <div class="p-2 bg-blue-100 rounded-xl text-blue-600">
                    <Search class="w-5 h-5" />
                </div>
            </div>
            
            <p class="text-xs text-slate-400 font-bold mt-2">Based on predictive demand models</p>
        </div>
    </div>

    <!-- Main Content Tabs -->
    <div class="flex gap-8 border-b border-slate-200">
        <button 
            @click="activeTab = 'overview'" 
            class="pb-4 font-bold text-sm uppercase tracking-wider transition-all border-b-2"
            :class="activeTab === 'overview' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-400 hover:text-slate-600'"
        >
            Sales Forecast
        </button>
        <button 
            @click="activeTab = 'anomalies'" 
            class="pb-4 font-bold text-sm uppercase tracking-wider transition-all border-b-2"
            :class="activeTab === 'anomalies' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-400 hover:text-slate-600'"
        >
             Anomaly Detection 
             <span class="ml-2 bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full text-[10px] font-black" v-if="forecastingStore.anomalies.length > 0">{{ forecastingStore.anomalies.length }}</span>
        </button>
    </div>

    <!-- SALES FORECAST TAB -->
    <div v-show="activeTab === 'overview'" class="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div class="glass-panel p-6 h-[400px]">
             <div class="flex items-center justify-between mb-6">
                <h3 class="text-lg font-bold text-slate-900">Projected Revenue (Next 7 Days)</h3>
                <div class="flex gap-2 text-xs font-bold text-slate-500">
                    <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> Predicted</span>
                    <span class="flex items-center gap-1 ml-3 dashed border-b border-slate-300"><span class="w-2 h-2 rounded-full bg-slate-300"></span> Historical Avg</span>
                </div>
             </div>
             <div class="h-[300px] w-full">
                <Line :data="chartData" :options="chartOptions" />
             </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div class="glass-panel p-6">
                <h3 class="font-bold text-slate-900 mb-4">AI Insights</h3>
                <div class="space-y-4">
                    <div class="flex gap-4 items-start p-4 bg-purple-50 rounded-xl border border-purple-100">
                         <div class="p-2 bg-white rounded-lg shadow-sm text-purple-600 shrink-0">
                            <BrainCircuit class="w-5 h-5" />
                        </div>
                        <div>
                            <h4 class="font-bold text-purple-900 text-sm">Weekend Surge Expected</h4>
                            <p class="text-xs text-purple-700 mt-1 leading-relaxed">
                                Our models predict a <span class="font-black">20% increase</span> in beverage sales this Saturday due to projected high temperatures (85°F).
                                
                                <br/><br/>
                                <span class="font-bold uppercase text-[10px] tracking-widest text-purple-500">Action Item</span>
                                <br/>
                                Ensure cooler stock levels are at 100% capacity by Friday night.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
             <div class="glass-panel p-6">
                <h3 class="font-bold text-slate-900 mb-4">Inventory Recommendations</h3>
                 <div class="space-y-4">
                    <div class="flex justify-between items-center p-3 border-b border-slate-100">
                        <div class="flex items-center gap-3">
                            <img src="https://ui-avatars.com/api/?name=Red+Bull&background=random" class="w-8 h-8 rounded-lg" />
                            <div>
                                <h4 class="font-bold text-sm text-slate-900">Energy Drinks</h4>
                                <p class="text-[10px] text-slate-500 uppercase font-bold">Category</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <span class="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">Order +5 Cases</span>
                        </div>
                    </div>
                     <div class="flex justify-between items-center p-3 border-b border-slate-100">
                        <div class="flex items-center gap-3">
                            <img src="https://ui-avatars.com/api/?name=Ice&background=random" class="w-8 h-8 rounded-lg" />
                            <div>
                                <h4 class="font-bold text-sm text-slate-900">Ice Bags (10lb)</h4>
                                <p class="text-[10px] text-slate-500 uppercase font-bold">General</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <span class="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">Order +20 Units</span>
                        </div>
                    </div>
                 </div>
            </div>
        </div>
    </div>

    <!-- ANOMALIES TAB -->
    <div v-show="activeTab === 'anomalies'" class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div v-if="forecastingStore.anomalies.length === 0" class="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <CheckCircle2 class="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 class="font-bold text-slate-900">System Healthy</h3>
            <p class="text-sm text-slate-500">No anomalies detected in the last 24 hours.</p>
        </div>

        <div v-else class="grid gap-4">
            <div 
                v-for="anomaly in forecastingStore.anomalies" 
                :key="anomaly.id"
                class="glass-panel p-6 flex flex-col md:flex-row gap-6 relative overflow-hidden"
                :class="{'opacity-60': anomaly.status === 'RESOLVED'}"
            >
                <!-- Severity Line -->
                <div class="absolute left-0 top-0 bottom-0 w-1" :class="(getSeverityStyles(anomaly.severity).split(' ')[0] || '').replace('bg-', 'bg-')"></div>

                <div class="shrink-0 pt-1">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center" :class="getSeverityStyles(anomaly.severity)">
                        <AlertTriangle class="w-5 h-5" />
                    </div>
                </div>

                <div class="flex-1">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-2">
                            <h3 class="font-bold text-slate-900">{{ anomaly.metric }}</h3>
                            <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider" :class="getSeverityStyles(anomaly.severity)">
                                {{ anomaly.severity }} Risk
                            </span>
                        </div>
                        <span class="text-xs font-mono text-slate-400">{{ new Date(anomaly.detectedAt).toLocaleString() }}</span>
                    </div>
                    
                    <p class="text-sm text-slate-600 leading-relaxed font-medium mb-4">{{ anomaly.description }}</p>
                    
                    <div class="flex gap-8 text-xs mb-4 p-3 bg-slate-50 rounded-lg border border-slate-100 max-w-md">
                        <div>
                            <span class="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">Expected Pattern</span>
                            <span class="font-mono font-black text-slate-700 text-lg">{{ anomaly.expectedValue }}</span>
                        </div>
                        <div class="w-px bg-slate-200"></div>
                        <div>
                             <span class="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">Actual Reading</span>
                             <span class="font-mono font-black text-rose-600 text-lg">{{ anomaly.actualValue }}</span>
                        </div>
                         <div class="w-px bg-slate-200"></div>
                         <div>
                             <span class="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">Deviation</span>
                             <span class="font-mono font-black text-rose-600 text-lg">
                                {{ Math.round(((anomaly.actualValue - anomaly.expectedValue) / anomaly.expectedValue) * 100) }}%
                             </span>
                        </div>
                    </div>

                    <div class="flex gap-3" v-if="anomaly.status !== 'RESOLVED'">
                        <button 
                            @click="forecastingStore.resolveAnomaly(anomaly.id)"
                            class="text-xs font-bold px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                        >
                            Mark as Resolved
                        </button>
                        <button 
                            class="text-xs font-bold px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            Investigate
                        </button>
                    </div>
                    <div v-else class="flex items-center gap-2 text-emerald-600 font-bold text-xs">
                        <CheckCircle2 class="w-4 h-4" />
                        Resolved
                    </div>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>
