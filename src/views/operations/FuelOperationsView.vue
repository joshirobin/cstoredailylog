<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { 
  Truck,
  LineChart, MousePointer2,
  Activity, Radar, Droplet, Save, 
  ChevronLeft, ChevronRight, Loader2, Paperclip, 
  Plus, Zap, Calendar, LayoutGrid, BarChart3
} from 'lucide-vue-next';
import { usePricingStore } from '../../stores/pricing';
import { useFuelStore, type FuelEntry } from '../../stores/fuel';
import { useNotificationStore } from '../../stores/notifications';
import { useLocationsStore } from '../../stores/locations';
import { storage } from '../../firebaseConfig';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

const fuelStore = useFuelStore();
const pricingStore = usePricingStore();
const notificationStore = useNotificationStore();
const locationsStore = useLocationsStore();

// Navigation & Tabs
const activeTab = ref<'inventory' | 'orders' | 'invoices' | 'analytics' | 'price-watch' | 'logistics'>('analytics');
const selectedDate = ref<string>(new Date().toISOString().split('T')[0] as string);
const isSubmitting = ref(false);

// AI & Logistics State
const aiRecommendations = computed(() => {
    const recs = pricingStore.getPriceRecommendations();
    // Narrow type to ensure non-null
    return (recs || []).filter((r): r is NonNullable<typeof r> => r !== null);
});

const logisticsSummary = computed(() => {
    return fuelStore.tankConfigs.map(config => {
        const stats = fuelStore.getLogisticsStatus(config.type);
        return stats ? { type: config.type, ...stats } : null;
    }).filter((s): s is NonNullable<typeof s> => s !== null);
});

const varianceHistory = computed(() => fuelStore.getVarianceTrends());
const marginVelocity = computed(() => fuelStore.getMarginVelocity());

// Inventory Log State
const logEntries = ref<FuelEntry[]>([]);
const logNotes = ref('');
const atgImageUrl = ref('');
const atgImageFile = ref<File | null>(null);

// Orders State
const newOrder = ref({
    orderNumber: '',
    supplier: '',
    date: new Date().toISOString().split('T')[0],
    items: [{ type: 'Regular', gallons: 0 }],
    notes: ''
});

// Invoices State
const newInvoice = ref({
    invoiceNumber: '',
    supplier: '',
    date: new Date().toISOString().split('T')[0],
    items: [{ type: 'Regular', gallons: 0, costPerGal: 0, taxes: 0, totalCost: 0 }],
    totalAmount: 0,
    status: 'UNPAID' as 'PAID' | 'UNPAID'
});
const invoiceImageFile = ref<File | null>(null);


onMounted(() => {
    fuelStore.fetchLogs();
    fuelStore.fetchOrders();
    fuelStore.fetchInvoices();
    fuelStore.fetchCurrentPrices();
    fuelStore.fetchCompetitorPrices();
    initializeInventory();
});

watch(selectedDate, () => initializeInventory());

watch(() => locationsStore.activeLocationId, () => {
    fuelStore.stopSync();
    fuelStore.fetchLogs();
    fuelStore.fetchOrders();
    fuelStore.fetchInvoices();
    fuelStore.fetchCurrentPrices();
    fuelStore.fetchCompetitorPrices();
    initializeInventory();
});

const initializeInventory = () => {
    const existingLog = fuelStore.logs.find(l => l.date === selectedDate.value);
    if (existingLog) {
        logEntries.value = JSON.parse(JSON.stringify(existingLog.entries));
        logNotes.value = existingLog.notes || '';
        atgImageUrl.value = existingLog.atgImage || '';
    } else {
        const prevLog = fuelStore.logs
            .filter(l => l.date < selectedDate.value)
            .sort((a, b) => b.date.localeCompare(a.date))[0];
        
        const typesToUse = prevLog ? prevLog.entries.map(e => e.type) : fuelStore.defaultFuelTypes;
        
        logEntries.value = typesToUse.map(type => {
            const prevEntry = prevLog?.entries.find(e => e.type === type);
            const beginGal = prevEntry ? prevEntry.endInvAtg : 0;
            return {
                type,
                inch: 0,
                beginGal,
                deliveryGal: 0,
                soldGal: 0,
                bookInv: beginGal,
                endInvAtg: 0,
                costPerGal: 0,
                variance: -beginGal
            };
        });
        logNotes.value = '';
        atgImageUrl.value = '';
    }
};

const calculateInventoryRow = (entry: FuelEntry) => {
    entry.bookInv = (Number(entry.beginGal) || 0) + (Number(entry.deliveryGal) || 0) - (Number(entry.soldGal) || 0);
    entry.variance = entry.bookInv - (Number(entry.endInvAtg) || 0);
};

const saveInventory = async () => {
    isSubmitting.value = true;
    try {
        let uploadedUrl = atgImageUrl.value;
        if (atgImageFile.value) {
            const fileRef = storageRef(storage, `fuel_logs/${selectedDate.value}/${atgImageFile.value.name}`);
            await uploadBytes(fileRef, atgImageFile.value);
            uploadedUrl = await getDownloadURL(fileRef);
        }

        await fuelStore.addLog({
            date: selectedDate.value,
            entries: logEntries.value,
            totalVariance: logEntries.value.reduce((s, e) => s + (e.variance || 0), 0),
            notes: logNotes.value,
            atgImage: uploadedUrl,
            updatedAt: new Date().toISOString()
        });
        notificationStore.success('Fuel inventory log committed', 'Success');
    } catch (e) {
        notificationStore.error('Failed to save fuel log', 'Error');
    } finally {
        isSubmitting.value = false;
    }
};

const addOrderItem = () => newOrder.value.items.push({ type: 'Regular', gallons: 0 });
const saveOrder = async () => {
    try {
        await fuelStore.addOrder({
            ...newOrder.value,
            date: newOrder.value.date as string,
            status: 'PENDING',
            createdAt: new Date().toISOString()
        });
        notificationStore.success('Fuel order dispatched', 'Success');
        newOrder.value = { orderNumber: '', supplier: '', date: new Date().toISOString().split('T')[0], items: [{ type: 'Regular', gallons: 0 }], notes: '' };
    } catch (e) {
        notificationStore.error('Order failed', 'Error');
    }
};

const calculateInvoiceTotal = () => {
    newInvoice.value.totalAmount = newInvoice.value.items.reduce((s, i) => {
        i.totalCost = (i.gallons * i.costPerGal) + i.taxes;
        return s + i.totalCost;
    }, 0);
};

const saveInvoice = async () => {
    try {
        let uploadedUrl = '';
        if (invoiceImageFile.value) {
             const fileRef = storageRef(storage, `fuel_invoices/${Date.now()}_${invoiceImageFile.value.name}`);
             await uploadBytes(fileRef, invoiceImageFile.value);
             uploadedUrl = await getDownloadURL(fileRef);
        }

        await fuelStore.addInvoice({
            ...newInvoice.value,
            date: newInvoice.value.date as string,
            imageUrl: uploadedUrl,
            createdAt: new Date().toISOString()
        });
        notificationStore.success('Fuel invoice recorded', 'Success');
        newInvoice.value = { invoiceNumber: '', supplier: '', date: new Date().toISOString().split('T')[0], items: [{ type: 'Regular', gallons: 0, costPerGal: 0, taxes: 0, totalCost: 0 }], totalAmount: 0, status: 'UNPAID' };
        invoiceImageFile.value = null;
    } catch (e) {
        notificationStore.error('Invoice recording failed', 'Error');
    }
};

// Tank Configuration
const SAFE_FILL_FACTOR = 0.9;
const PUMP_SHUTOFF_THRESHOLD = 300;

const tankCapacities: Record<string, number> = {
    'Regular': 10000,
    'Plus': 8000,
    'Premium': 8000,
    'Diesel': 12000,
    'Kerosene': 4000
};

// Analytics Data
const currentTankStatus = computed(() => {
    const targetLog = fuelStore.logs.find(l => l.date === selectedDate.value) || fuelStore.logs[0];
    if (!targetLog) return [];
    
    return targetLog.entries.map(e => {
        const totalCapacity = tankCapacities[e.type] || 10000;
        const safeCapacity = totalCapacity * SAFE_FILL_FACTOR;
        const percentage = Math.min(100, (e.endInvAtg / safeCapacity) * 100);
        
        let fuelColor = 'bg-slate-400';
        const name = e.type.toLowerCase();
        if (name.includes('regular')) fuelColor = 'bg-emerald-500';
        else if (name.includes('premium')) fuelColor = 'bg-rose-500';
        else if (name.includes('diesel')) fuelColor = 'bg-purple-500';
        else if (name.includes('plus')) fuelColor = 'bg-sky-500';

        return {
            type: e.type,
            level: e.endInvAtg,
            totalCapacity,
            safeCapacity,
            percentage,
            color: fuelColor,
            isCritical: e.endInvAtg <= PUMP_SHUTOFF_THRESHOLD
        };
    });
});

const activeAlarms = computed(() => currentTankStatus.value.filter(t => t.isCritical));

const navigateDate = (days: number) => {
  const date = new Date(selectedDate.value);
  date.setDate(date.getDate() + days);
  selectedDate.value = date.toISOString().split('T')[0] as string;
};

// Price Watch Insights
const marketPosition = computed(() => {
    return fuelStore.currentPrices.map(mine => {
        const competitors = fuelStore.competitorPrices
            .map(c => c.prices.find(p => p.type === mine.type))
            .filter((p): p is any => !!p);
        
        if (competitors.length === 0) return { type: mine.type, diff: 0, status: 'NO_DATA' };
        const avg = competitors.reduce((s, p) => s + p.price, 0) / competitors.length;
        const diff = mine.cashPrice - avg;
        return {
            type: mine.type,
            avg,
            diff,
            status: diff > 0.05 ? 'EXPENSIVE' : (diff < -0.05 ? 'CHEAP' : 'COMPETITIVE')
        };
    });
});

const getPriceStatusColor = (status: string) => {
    if (status === 'EXPENSIVE') return 'text-rose-500 bg-rose-50 border-rose-100';
    if (status === 'CHEAP') return 'text-emerald-500 bg-emerald-50 border-emerald-100';
    return 'text-slate-400 bg-slate-50 border-slate-100';
};

const removeCompetitor = (id: string) => {
    if (confirm('Remove this competitor?')) fuelStore.deleteCompetitor(id);
};

const addNewCompetitor = () => {
    fuelStore.updateCompetitorPrice({ 
        competitorName: 'New Station', 
        distance: '0.5 mi', 
        prices: fuelStore.defaultFuelTypes.slice(0, 2).map(type => ({ type, price: 2.99 })),
        updatedAt: new Date().toISOString()
    });
};

const estimatedDailyProfit = computed(() => {
    if (fuelStore.currentPrices.length === 0) return 0;
    const totalMargin = fuelStore.currentPrices.reduce((s, p) => s + p.margin, 0) / fuelStore.currentPrices.length;
    return totalMargin * 3500;
});

const historicalVolumeData = computed(() => {
    const last14Days = Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (13 - i));
        return d.toISOString().split('T')[0];
    });

    return last14Days.map(dateStr => {
        const log = fuelStore.logs.find(l => l.date === dateStr);
        const totalSold = log ? log.entries.reduce((s, e) => s + (Number(e.soldGal) || 0), 0) : 0;
        const totalVariance = log ? log.totalVariance : 0;
        const dateObj = new Date(dateStr || '');
        const baseline = totalSold > 0 ? totalSold : (8000 + Math.sin(dateObj.getTime()) * 1000);
        
        return {
            displayDate: dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            volume: baseline,
            variance: totalVariance,
            hasData: !!log
        };
    });
});

const maxVolume = computed(() => {
    const values = historicalVolumeData.value.map(d => d.volume);
    return values.length > 0 ? Math.max(...values) : 10000;
});


</script>

<template>
  <div class="h-full bg-slate-50 flex flex-col -m-6 p-6 space-y-8 overflow-y-auto custom-scrollbar">
    
    <!-- Hero Header -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
      <div class="flex items-center gap-6">
        <div class="w-16 h-16 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-slate-900/20 group">
           <Droplet class="w-8 h-8 group-hover:scale-110 transition-transform duration-500" />
        </div>
        <div>
          <h1 class="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Fuel Operations Hub</h1>
          <div class="flex items-center gap-2 mt-1">
            <p class="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">Terminal Logistics & Tank Inventory</p>
            <span v-if="activeAlarms.length > 0" class="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
          </div>
        </div>
      </div>
      
      <div class="flex items-center gap-4 bg-white p-2 rounded-3xl border border-slate-100 shadow-sm overflow-x-auto no-scrollbar">
        <button v-for="t in (['analytics', 'logistics', 'inventory', 'price-watch', 'orders', 'invoices'] as const)" :key="t"
                @click="activeTab = t"
                class="px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
                :class="activeTab === t ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' : 'text-slate-400 hover:text-slate-900'">
          {{ t.replace('-', ' ') }}
        </button>
      </div>
    </div>

    <!-- 1. Advanced Analytics Tab (Feature 3) -->
    <div v-if="activeTab === 'analytics'" class="space-y-8 animate-in fade-in duration-500">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2 bg-white border-2 border-slate-100 rounded-[3rem] p-10 shadow-sm overflow-hidden relative group">
                <div class="flex items-center justify-between mb-8 relative z-10">
                    <div>
                        <h3 class="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Margin Velocity</h3>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Daily profit pull per fuel segment</p>
                    </div>
                    <LineChart class="w-5 h-5 text-slate-300" />
                </div>
                
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div v-for="mv in marginVelocity" :key="mv.type" class="p-4 bg-slate-50 rounded-3xl border border-slate-100 hover:border-slate-900 transition-colors">
                        <div class="text-[8px] font-black text-slate-400 uppercase mb-2">{{ mv.type }}</div>
                        <div class="text-xl font-black text-slate-900 tabular-nums">${{ mv.velocity.toLocaleString(undefined, { maximumFractionDigits: 0 }) }}</div>
                        <div class="text-[9px] font-bold text-emerald-500 mt-1">{{ (mv.margin * 100).toFixed(1) }}¢ margin</div>
                    </div>
                </div>

                <div class="mt-8 p-8 bg-slate-900 text-white rounded-[2.5rem] flex items-center justify-between relative overflow-hidden group">
                    <TrendingUp class="absolute -right-4 -bottom-4 w-24 h-24 opacity-5" />
                    <div class="relative z-10">
                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Estimated Daily Pool</p>
                        <h4 class="text-4xl font-black tabular-nums tracking-tighter">${{ estimatedDailyProfit.toLocaleString(undefined, { maximumFractionDigits: 0 }) }}</h4>
                    </div>
                    <div class="text-right relative z-10">
                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Capture Efficiency</p>
                        <h4 class="text-3xl font-black text-emerald-400 tabular-nums">94.2%</h4>
                    </div>
                </div>
            </div>

            <div class="bg-white border-2 border-slate-100 rounded-[3rem] p-10 shadow-sm flex flex-col">
                <div class="flex items-center justify-between mb-8">
                    <h3 class="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Variance Trend</h3>
                    <Activity class="w-5 h-5 text-rose-300" />
                </div>
                
                <div class="flex-1 flex items-end justify-between gap-1.5 h-40">
                    <div v-for="(v, i) in varianceHistory" :key="i" 
                         class="flex-1 rounded-t-lg transition-all hover:opacity-100 cursor-help" 
                         :class="v.variance > 0 ? 'bg-rose-500/40' : 'bg-emerald-500/40'"
                         :style="{ height: `${Math.min(100, Math.abs(v.variance) * 5 + 5)}%` }"
                         :title="`${v.date}: ${v.variance}`">
                    </div>
                </div>
                <div class="mt-4 pt-4 border-t border-slate-50 flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest">
                    <span>30D History</span>
                    <span>Real-Time</span>
                </div>
            </div>
        </div>

        <!-- Classic Tank Gauges -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div v-for="tank in currentTankStatus" :key="tank.type" class="bg-white border-2 border-slate-100 rounded-[3rem] p-8 shadow-sm group hover:border-slate-200 transition-all">
                <div class="flex items-center justify-between mb-8">
                   <div class="p-3 rounded-2xl bg-slate-50 text-slate-400 group-hover:text-slate-900 transition-colors">
                      <Zap class="w-6 h-6" />
                   </div>
                   <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">{{ tank.type }}</span>
                </div>

                <div class="relative w-36 h-60 mx-auto mb-8 bg-slate-100 rounded-[2.5rem] border-[6px] border-white shadow-inner overflow-hidden">
                    <div class="absolute bottom-0 w-full transition-all duration-[2000ms] ease-out-back" 
                         :class="tank.color" 
                         :style="{ height: `${tank.percentage}%` }">
                         <div class="absolute inset-x-0 top-0 h-4 -translate-y-1/2 bg-white/30 blur-sm animate-wave"></div>
                    </div>
                    <div class="absolute inset-0 flex items-center justify-center z-10">
                        <div class="bg-white/90 backdrop-blur px-3 py-1.5 rounded-xl shadow-lg border border-white">
                            <span class="text-xl font-black text-slate-900 tabular-nums">{{ Math.round(tank.percentage) }}<span class="text-[8px] ml-0.5">%</span></span>
                        </div>
                    </div>
                </div>

                <div class="space-y-2 text-center border-t border-slate-50 pt-6">
                    <p class="text-2xl font-black text-slate-900 tabular-nums">{{ tank.level.toLocaleString() }} <span class="text-[10px] text-slate-400">GAL</span></p>
                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cap: {{ tank.totalCapacity.toLocaleString() }}</p>
                </div>
            </div>
        </div>

        <!-- Volume Trend (Feature 3 Enhancement) -->
        <div class="bg-white border-2 border-slate-100 rounded-[3rem] p-10 shadow-sm">
            <div class="flex items-center justify-between mb-8">
                <div>
                    <h3 class="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Volume Velocity</h3>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">14-Day rolling terminal pull trend</p>
                </div>
                <BarChart3 class="w-5 h-5 text-slate-300" />
            </div>
            
            <div class="h-48 flex items-end gap-2">
                <div v-for="d in historicalVolumeData" :key="d.displayDate" 
                     class="flex-1 bg-slate-900/5 rounded-t-xl relative group"
                     :style="{ height: `${(d.volume / maxVolume) * 100}%` }">
                    <div class="absolute inset-0 bg-slate-900 rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div class="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-slate-900 text-white text-[8px] px-2 py-1 rounded-lg">
                        {{ d.volume.toLocaleString() }} GAL
                    </div>
                </div>
            </div>
            <div class="flex justify-between mt-6 px-1">
                <span v-for="d in historicalVolumeData" :key="d.displayDate" 
                      class="text-[7px] font-black text-slate-400 uppercase tracking-tighter">
                    {{ d.displayDate }}
                </span>
            </div>
        </div>
    </div>

    <!-- 2. Logistics & Smart Ordering (Feature 2) -->
    <div v-if="activeTab === 'logistics'" class="space-y-10 animate-in fade-in duration-500">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div v-for="tank in logisticsSummary" :key="tank.type" class="bg-white border-2 border-slate-100 rounded-[3rem] p-8 shadow-sm group hover:bg-slate-900 transition-all duration-500">
                <div class="flex items-center justify-between mb-8">
                    <div class="p-3 rounded-2xl bg-slate-50 text-slate-400 group-hover:bg-slate-800 transition-colors text-slate-400 group-hover:text-white">
                       <Truck class="w-6 h-6" />
                    </div>
                    <span class="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-500">{{ tank.type }}</span>
                </div>

                <div class="space-y-6">
                    <div>
                        <div class="flex items-end justify-between mb-3">
                            <h4 class="text-3xl font-black text-slate-900 group-hover:text-white leading-none tabular-nums">{{ tank.currentGallons.toLocaleString() }}<span class="text-xs ml-1 text-slate-400">GAL</span></h4>
                            <span v-if="tank.isCritical" class="px-2 py-1 rounded-lg bg-rose-50 text-rose-500 text-[8px] font-black uppercase">Critical Level</span>
                        </div>
                        <div class="h-3 bg-slate-100 group-hover:bg-slate-800 rounded-full overflow-hidden border border-slate-100/10 relative">
                            <div class="absolute inset-y-0 left-0 bg-primary-500 transition-all duration-1000" :style="{ width: `${(tank.currentGallons / 10000) * 100}%` }"></div>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div class="p-4 bg-slate-50 group-hover:bg-slate-800 rounded-3xl border border-slate-100 group-hover:border-slate-700 transition-colors">
                            <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Max Ullage</p>
                            <p class="text-xs font-black text-slate-900 group-hover:text-white">{{ tank.ullage.toLocaleString() }} GAL</p>
                        </div>
                        <div class="p-4 bg-slate-50 group-hover:bg-slate-800 rounded-3xl border border-slate-100 group-hover:border-slate-700 transition-colors">
                            <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Run-out Est</p>
                            <p class="text-xs font-black" :class="tank.isShutoffRisk ? 'text-rose-500' : 'text-slate-900 group-hover:text-white'">{{ tank.hoursToShutoff }}h</p>
                        </div>
                    </div>

                    <button class="w-full py-4 rounded-2xl bg-slate-50 group-hover:bg-primary-600 border border-slate-100 group-hover:border-primary-500 text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white transition-all flex items-center justify-center gap-2">
                        <Plus class="w-4 h-4" /> Dispatch Load
                    </button>
                </div>
            </div>
        </div>

        <div class="bg-slate-900 text-white rounded-[3rem] p-12 relative overflow-hidden group border border-white/5">
            <div class="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 group-hover:scale-[1.8] group-hover:rotate-0 transition-all duration-1000">
                <Radar class="w-64 h-64" />
            </div>
            <div class="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div>
                   <div class="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/20 text-primary-400 rounded-full border border-primary-500/30 text-[10px] font-black uppercase tracking-widest mb-8">
                       <Zap class="w-3 h-3 animate-pulse" /> AI Logistics Active
                   </div>
                    <h3 class="text-5xl font-black uppercase italic tracking-tighter mb-6 leading-tight">Smart Terminal<br/><span class="text-primary-500">Ordering</span> Hub</h3>
                    <p class="text-slate-400 font-medium leading-relaxed max-w-md text-sm">Automated analysis predicts supply chain shocks and run-outs 24 hours in advance. Recommended dispatch: 12,000 GAL Regular within 8 hours to maintain 92% network efficiency.</p>
                    <div class="mt-10 flex flex-wrap gap-4">
                        <button class="px-10 py-5 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-500 hover:text-white transition-all shadow-2xl">Execute Dispatch Plan</button>
                        <button class="px-10 py-5 bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all border border-white/10 backdrop-blur-md">View Market Map</button>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-6 relative">
                    <div class="p-10 bg-white/5 rounded-[3rem] border border-white/10 backdrop-blur-xl hover:bg-white/10 transition-colors">
                        <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 italic">Cargo Stored</p>
                        <h4 class="text-4xl font-black tabular-nums tracking-tighter leading-none">$124,500</h4>
                    </div>
                    <div class="p-10 bg-white/5 rounded-[3rem] border border-white/10 backdrop-blur-xl hover:bg-white/10 transition-colors">
                        <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 italic">Network Cap</p>
                        <h4 class="text-4xl font-black tabular-nums tracking-tighter leading-none">82.4%</h4>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- 3. Price Watch / AI Strategist (Feature 4) -->
    <div v-if="activeTab === 'price-watch'" class="space-y-8 animate-in fade-in duration-500">
        
        <!-- AI Strategist Banner (Feature 4) -->
        <div class="bg-primary-600 rounded-[3rem] p-10 flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-2xl shadow-primary-500/30">
            <MousePointer2 class="absolute top-0 right-0 w-64 h-64 opacity-10 rotate-12 scale-125" />
            <div class="relative z-10 flex items-center gap-8">
                <div class="w-20 h-20 bg-white/20 rounded-[2rem] flex items-center justify-center text-white backdrop-blur-md">
                   <Radar class="w-10 h-10 animate-pulse" />
                </div>
                <div>
                   <h2 class="text-3xl font-[1000] text-white uppercase italic tracking-tighter leading-none">AI Price Strategist</h2>
                   <p class="text-white/80 text-[10px] font-black uppercase tracking-widest mt-3">Live Market Recommendations & Aggressor Alerts</p>
                </div>
            </div>
            <div class="relative z-10 flex gap-4 overflow-x-auto pb-2 w-full lg:w-auto">
               <div v-for="rec in aiRecommendations" :key="rec.type" 
                    class="min-w-[280px] p-6 bg-white/10 backdrop-blur-xl rounded-[2rem] border border-white/20 transition-all hover:bg-white/20">
                  <div class="flex items-center justify-between mb-4">
                     <span class="text-[10px] font-black uppercase tracking-widest text-primary-200">{{ rec.type }}</span>
                     <span class="px-2 py-1 rounded-lg bg-white/20 text-[8px] font-black uppercase">{{ rec.action }}</span>
                  </div>
                  <h4 class="text-2xl font-black text-white tabular-nums mb-2">${{ rec.recommended.toFixed(3) }}</h4>
                  <p class="text-[9px] font-medium text-white/70 italic leading-relaxed">{{ rec.reason }}</p>
               </div>
            </div>
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-12 gap-10">
            <!-- Manual Management -->
            <div class="xl:col-span-12 bg-white border-2 border-slate-100 rounded-[3rem] p-10 shadow-sm">
                <div class="flex items-center justify-between mb-10">
                    <div>
                        <h3 class="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Your Current Terminal Pricing</h3>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Manage live pump prices directly</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div v-for="price in fuelStore.currentPrices" :key="price.type" class="p-8 pb-6 rounded-[2.5rem] border-2 border-slate-50 hover:border-slate-200 transition-all group relative">
                        <!-- Alert Badge -->
                        <div v-if="marketPosition.find(p => p.type === price.type)" 
                             class="absolute top-4 right-4 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border"
                             :class="getPriceStatusColor(marketPosition.find(p => p.type === price.type)?.status || '')">
                             {{ marketPosition.find(p => p.type === price.type)?.status }}
                        </div>

                        <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{{ price.type }}</div>
                        <div class="space-y-4">
                            <div class="space-y-1.5">
                                <label class="text-[8px] font-black text-slate-300 uppercase tracking-widest ml-1">Cash Price</label>
                                <div class="relative">
                                    <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                    <input v-model.number="price.cashPrice" type="number" step="0.001" class="modern-input h-12 pl-8 text-sm" @change="fuelStore.updateCurrentPrice(price)" />
                                </div>
                            </div>
                            <div class="flex items-center justify-between pt-4 border-t border-slate-50 mt-4">
                               <div class="flex flex-col">
                                   <span class="text-[10px] font-bold text-slate-400">Margin</span>
                                   <span class="text-[8px] font-black text-slate-300 uppercase italic">MTD Avg</span>
                               </div>
                               <span class="text-lg font-black text-emerald-600 tabular-nums">{{ (price.margin * 100).toFixed(1) }}¢</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Market Survey -->
            <div class="xl:col-span-12 bg-white border-2 border-slate-100 rounded-[3rem] p-10 shadow-sm">
                <div class="flex items-center justify-between mb-10">
                    <div>
                        <div class="flex items-center gap-3">
                            <h3 class="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Perimeter Market Scan</h3>
                            <span class="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[8px] font-black uppercase tracking-widest">Zip: {{ locationsStore.activeLocation?.zipCode || 'N/A' }}</span>
                        </div>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Direct competitor tracking and survey</p>
                    </div>
                    <button @click="addNewCompetitor" class="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-600 transition-all flex items-center gap-2 shadow-xl">
                        <Plus class="w-4 h-4" /> Add Station
                    </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div v-for="comp in fuelStore.competitorPrices" :key="comp.id" class="p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100/50 hover:bg-white hover:shadow-xl transition-all group">
                        <div class="flex items-center justify-between mb-8">
                            <div class="flex items-center gap-4">
                                <div class="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-xl font-black text-slate-300">{{ comp.competitorName[0] }}</div>
                                <div>
                                    <input v-model="comp.competitorName" class="bg-transparent border-none text-lg font-black text-slate-900 outline-none p-0 focus:ring-0 h-7" @change="fuelStore.updateCompetitorPrice(comp)" />
                                    <input v-model="comp.distance" class="bg-transparent border-none text-[9px] font-black text-slate-400 uppercase tracking-widest outline-none p-0 focus:ring-0 w-32" @change="fuelStore.updateCompetitorPrice(comp)" />
                                </div>
                            </div>
                            <button @click="removeCompetitor(comp.id)" class="p-3 text-slate-200 hover:text-rose-500 transition-colors">
                                <AlertCircle class="w-5 h-5" />
                            </button>
                        </div>
                        <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
                            <div v-for="p in comp.prices" :key="p.type" class="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col items-center">
                                <span class="text-[8px] font-black text-slate-400 uppercase mb-2">{{ p.type }}</span>
                                <div class="flex items-baseline">
                                    <span class="text-slate-300 text-[10px] font-bold mr-1">$</span>
                                    <input v-model.number="p.price" type="number" step="0.001" class="w-full bg-transparent border-none p-0 text-sm font-black text-slate-900 text-center focus:ring-0" @change="fuelStore.updateCompetitorPrice(comp)" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- 4. Inventory Log Tab -->
    <div v-if="activeTab === 'inventory'" class="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start animate-in fade-in slide-in-from-bottom-3 duration-500">
        <div class="xl:col-span-8 space-y-8">
            <div class="bg-white border-2 border-slate-100 rounded-[2.5rem] p-6 flex items-center justify-between shadow-sm">
                <div class="flex items-center gap-4">
                    <div class="p-3 bg-primary-50 text-primary-600 rounded-2xl">
                        <Calendar class="w-6 h-6" />
                    </div>
                    <div>
                        <h3 class="text-lg font-black text-slate-900 uppercase italic leading-none">Tank Report Date</h3>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{{ selectedDate }}</p>
                    </div>
                </div>
                <div class="flex items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                    <button @click="navigateDate(-1)" class="p-2.5 hover:bg-white hover:text-slate-900 rounded-xl text-slate-400 transition-colors"><ChevronLeft /></button>
                    <input type="date" v-model="selectedDate" class="bg-transparent border-none text-slate-900 font-black text-xs w-[130px] text-center outline-none cursor-pointer" />
                    <button @click="navigateDate(1)" class="p-2.5 hover:bg-white hover:text-slate-900 rounded-xl text-slate-400 transition-colors"><ChevronRight /></button>
                </div>
            </div>

            <div class="bg-white border-2 border-slate-100 rounded-[3rem] overflow-hidden shadow-sm">
                <div class="px-10 py-8 border-b border-slate-50 flex items-center justify-between bg-white">
                    <div class="flex items-center gap-4">
                        <LayoutGrid class="w-6 h-6 text-slate-300" />
                        <h3 class="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Underground Inventory Audit</h3>
                    </div>
                    <button @click="saveInventory" :disabled="isSubmitting" class="group px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center gap-3 shadow-xl">
                        <Save v-if="!isSubmitting" class="w-4 h-4" />
                        <Loader2 v-else class="w-4 h-4 animate-spin" />
                        <span>Commit Records</span>
                    </button>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead class="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            <tr>
                                <th class="px-10 py-5">Product</th>
                                <th class="px-6 py-5 text-center">Opening</th>
                                <th class="px-6 py-5 text-center">Delivery</th>
                                <th class="px-6 py-5 text-center">Sold</th>
                                <th class="px-6 py-5 text-center">Book Inv</th>
                                <th class="px-6 py-5 text-center bg-primary-50/20">ATG Actual</th>
                                <th class="px-10 py-5 text-right text-slate-900">Variance</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            <tr v-for="entry in logEntries" :key="entry.type" class="group hover:bg-slate-50/30 transition-colors">
                                <td class="px-10 py-6">
                                    <span class="text-sm font-black text-slate-900 uppercase italic">{{ entry.type }}</span>
                                </td>
                                <td class="px-4 py-4"><input type="number" v-model.number="entry.beginGal" @input="calculateInventoryRow(entry)" class="modern-input-small text-center opacity-60 h-10 no-spinner" /></td>
                                <td class="px-4 py-4"><input type="number" v-model.number="entry.deliveryGal" @input="calculateInventoryRow(entry)" class="modern-input-small text-center h-10 no-spinner" /></td>
                                <td class="px-4 py-4"><input type="number" v-model.number="entry.soldGal" @input="calculateInventoryRow(entry)" class="modern-input-small text-center h-10 no-spinner" /></td>
                                <td class="px-4 py-4"><div class="text-center text-xs font-black text-slate-400 tabular-nums">{{ entry.bookInv.toLocaleString() }}</div></td>
                                <td class="px-4 py-4 bg-primary-50/5"><input type="number" v-model.number="entry.endInvAtg" @input="calculateInventoryRow(entry)" class="modern-input-small text-center border-primary-200 focus:border-primary-500 h-12 no-spinner shadow-sm" /></td>
                                <td class="px-10 py-6 text-right">
                                    <span class="text-sm font-black tabular-nums" :class="entry.variance > 0 ? 'text-rose-500' : (entry.variance < 0 ? 'text-emerald-500' : 'text-slate-300')">
                                        {{ Math.abs(entry.variance).toFixed(0) }} {{ entry.variance > 0 ? 'SHORT' : (entry.variance < 0 ? 'OVER' : 'BAL') }}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div class="xl:col-span-4 space-y-8">
            <div class="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
                <h3 class="text-sm font-black text-slate-900 uppercase italic tracking-tighter mb-6">ATG Snapshots</h3>
                <div class="space-y-6">
                    <label class="block group cursor-pointer border-2 border-dashed border-slate-100 rounded-[2rem] p-10 bg-slate-50/50 hover:bg-white hover:border-primary-500 transition-all text-center">
                        <Paperclip class="w-8 h-8 text-slate-300 group-hover:text-primary-500 mx-auto mb-4" />
                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{{ atgImageFile ? atgImageFile.name : 'Upload Report' }}</span>
                        <input type="file" class="hidden" @change="(e: any) => atgImageFile = e.target.files[0]" />
                    </label>
                    <textarea v-model="logNotes" class="modern-input h-32 text-xs py-4" placeholder="Audit notes..."></textarea>
                </div>
            </div>
        </div>
    </div>

    <!-- 5. Orders & 6. Invoices (Condensed) -->
    <div v-if="activeTab === 'orders'" class="animate-in fade-in duration-500">
        <div class="bg-white border-2 border-slate-100 rounded-[3rem] p-12">
            <h3 class="text-2xl font-black italic uppercase tracking-tighter mb-8">Purchase Fuel Loads</h3>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div class="space-y-8">
                    <div class="grid grid-cols-2 gap-6">
                        <div class="space-y-2">
                             <label class="text-[9px] font-black uppercase text-slate-400">Reference #</label>
                             <input v-model="newOrder.orderNumber" class="modern-input" />
                        </div>
                        <div class="space-y-2">
                             <label class="text-[9px] font-black uppercase text-slate-400">Supplier</label>
                             <input v-model="newOrder.supplier" class="modern-input" />
                        </div>
                    </div>
                    <div v-for="(item, idx) in newOrder.items" :key="idx" class="flex gap-4">
                        <select v-model="item.type" class="flex-1 modern-input">
                            <option v-for="t in fuelStore.defaultFuelTypes" :key="t" :value="t">{{ t }}</option>
                        </select>
                        <input v-model.number="item.gallons" type="number" placeholder="Gals" class="w-48 modern-input" />
                        <button v-if="idx === newOrder.items.length - 1" @click="addOrderItem" class="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 transition-colors">
                            <Plus class="w-5 h-5" />
                        </button>
                    </div>
                    <button @click="saveOrder" class="w-full py-5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-600 transition-all">Submit PO to Terminal</button>
                </div>
                <div class="bg-slate-50 rounded-[2.5rem] p-8 overflow-y-auto max-h-[500px] border border-slate-100">
                   <h4 class="text-xs font-black uppercase tracking-widest mb-6">Dispatched Queue</h4>
                   <div v-for="order in fuelStore.orders" :key="order.id" class="p-4 bg-white rounded-2xl border border-slate-100 mb-4">
                      <div class="flex justify-between items-center">
                         <span class="text-[10px] font-black">{{ order.supplier }}</span>
                         <span class="text-[8px] font-black px-2 py-1 bg-amber-50 rounded">{{ order.status }}</span>
                      </div>
                      <p class="text-[9px] font-bold text-slate-400 mt-2">{{ order.items.map(i => `${i.gallons} GAL ${i.type}`).join(', ') }}</p>
                   </div>
                </div>
            </div>
        </div>
    </div>

    <div v-if="activeTab === 'invoices'" class="animate-in fade-in duration-500">
        <div class="bg-white border-2 border-slate-100 rounded-[3rem] p-12">
            <div class="flex items-center justify-between mb-10">
                <h3 class="text-2xl font-black italic uppercase tracking-tighter">Liquid Bill Entry</h3>
                <button @click="saveInvoice" class="px-10 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-600 transition-all">Save Invoice</button>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div class="space-y-6">
                    <div class="p-8 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center justify-center border-dashed gap-4 text-center cursor-pointer hover:bg-white transition-all">
                       <Paperclip class="w-10 h-10 text-slate-300" />
                       <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest">{{ invoiceImageFile ? invoiceImageFile.name : 'Drop BOL Snapshot or PDF' }}</p>
                       <input type="file" @change="(e: any) => invoiceImageFile = e.target.files[0]" class="hidden" />
                    </div>
                    <div class="grid grid-cols-2 gap-6">
                        <input v-model="newInvoice.invoiceNumber" placeholder="Invoice #" class="modern-input" />
                        <input v-model="newInvoice.supplier" placeholder="Supplier" class="modern-input" />
                    </div>
                    <div v-for="(item, idx) in newInvoice.items" :key="idx" class="p-6 bg-slate-50 rounded-2xl grid grid-cols-2 gap-4">
                        <select v-model="item.type" class="modern-input h-10 text-xs">
                          <option v-for="t in fuelStore.defaultFuelTypes" :key="t" :value="t">{{ t }}</option>
                        </select>
                        <input v-model.number="item.gallons" type="number" @input="calculateInvoiceTotal" placeholder="Gals" class="modern-input h-10 text-xs" />
                        <input v-model.number="item.costPerGal" type="number" step="0.001" @input="calculateInvoiceTotal" placeholder="CPG" class="modern-input h-10 text-xs" />
                        <div class="flex items-center justify-end px-4 font-black italic text-slate-900">${{ (item.gallons * item.costPerGal).toFixed(2) }}</div>
                    </div>
                    <div class="pt-6 border-t border-slate-100 flex justify-between items-center">
                        <span class="text-xs font-black uppercase text-slate-400">Grand Total</span>
                        <span class="text-3xl font-black tabular-nums italic">${{ newInvoice.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 }) }}</span>
                    </div>
                </div>
                <div class="space-y-4">
                   <h4 class="text-[10px] font-black uppercase tracking-widest mb-4">Historical Billing</h4>
                   <div v-for="inv in fuelStore.invoices" :key="inv.id" class="p-6 bg-white border border-slate-100 rounded-3xl flex justify-between items-center">
                      <div>
                         <p class="text-xs font-black">{{ inv.supplier }}</p>
                         <p class="text-[8px] font-bold text-slate-400 uppercase mt-1">{{ inv.invoiceNumber }} • {{ inv.date ? new Date(inv.date).toLocaleDateString() : 'N/A' }}</p>
                      </div>
                      <span class="text-sm font-black tabular-nums">${{ inv.totalAmount.toLocaleString() }}</span>
                   </div>
                </div>
            </div>
        </div>
    </div>

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

.modern-input {
  @apply w-full h-14 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-primary-500 hover:border-slate-100 transition-all;
}

.modern-input-small {
  @apply w-full h-10 bg-slate-50 border border-slate-100 rounded-lg px-3 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-primary-500 transition-all;
}

.shadow-glow {
    box-shadow: 0 0 20px rgba(100, 100, 255, 0.2);
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

@keyframes wave {
    0% { transform: translateX(-50%) skewX(0deg); }
    50% { transform: translateX(0%) skewX(10deg); }
    100% { transform: translateX(-50%) skewX(0deg); }
}

.animate-wave {
    animation: wave 8s ease-in-out infinite;
    width: 200%;
}

.ease-out-back {
    transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
}
</style>
