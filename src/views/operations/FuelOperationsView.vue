<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { 
  Droplet, Save, ChevronLeft, ChevronRight, 
  Loader2, Paperclip, History as HistoryIcon, 
  Plus, Send, FileText, BarChart3, TrendingUp, 
  Zap, Calendar, LayoutGrid, ArrowDownRight, ScanLine,
  AlertCircle
} from 'lucide-vue-next';
import { useFuelStore, type FuelEntry } from '../../stores/fuel';
import { useNotificationStore } from '../../stores/notifications';
import { storage } from '../../firebaseConfig';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

const fuelStore = useFuelStore();
const notificationStore = useNotificationStore();

// Navigation & Tabs
const activeTab = ref<'inventory' | 'orders' | 'invoices' | 'analytics' | 'price-watch'>('analytics');
const selectedDate = ref<string>(new Date().toISOString().split('T')[0] as string);
const isSubmitting = ref(false);

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
    // Formula: Begin Inv + Gallon Delivery - Gallon Sold = Book Inventory
    entry.bookInv = (Number(entry.beginGal) || 0) + (Number(entry.deliveryGal) || 0) - (Number(entry.soldGal) || 0);
    
    // Formula per USER: Book inventory - ATG inventory = +/- Gallons shorts/over variance
    // Note: This makes a "short" (loss) appear as a positive variance number per user request
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

// Tank Configuration (90% Safe Fill / Ullage Rule)
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
    // Priority: 1. Log for selectedDate, 2. Latest log in store, 3. Empty status
    const targetLog = fuelStore.logs.find(l => l.date === selectedDate.value) || fuelStore.logs[0];
    if (!targetLog) return [];
    
    return targetLog.entries.map(e => {
        const totalCapacity = tankCapacities[e.type] || 10000;
        const safeCapacity = totalCapacity * SAFE_FILL_FACTOR;
        const percentage = Math.min(100, (e.endInvAtg / safeCapacity) * 100);
        
        // Color mapping based on user request
        let fuelColor = 'bg-slate-400';
        const name = e.type.toLowerCase();
        
        if (name.includes('regular')) fuelColor = 'bg-emerald-500';
        else if (name.includes('premium')) fuelColor = 'bg-rose-500';
        else if (name.includes('diesel') && name.includes('clear')) fuelColor = 'bg-purple-500';
        else if (name.includes('diesel')) fuelColor = 'bg-green-600';
        else if (name.includes('plus')) fuelColor = 'bg-sky-500';
        else if (name.includes('kerosene')) fuelColor = 'bg-amber-500';

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

// Mock AI Scan for Fuel Invoice
const simulateScan = () => {
    notificationStore.info('Processing fuel invoice AI scan...', 'AI Intelligence');
    setTimeout(() => {
        newInvoice.value.invoiceNumber = 'FUEL-' + Math.floor(Math.random() * 90000 + 10000);
        newInvoice.value.supplier = 'Refinery Prime Resources';
        newInvoice.value.items = [
            { type: 'Regular', gallons: 8500, costPerGal: 2.84, taxes: 124.50, totalCost: 24264.50 },
            { type: 'Diesel', gallons: 3000, costPerGal: 3.12, taxes: 85.00, totalCost: 9445.00 }
        ];
        calculateInvoiceTotal();
        notificationStore.success('Invoice data extracted successfully', 'AI Complete');
    }, 2000);
};

// Price Watch Insights
const marketPosition = computed(() => {
    const insights = fuelStore.currentPrices.map(mine => {
        const competitors = fuelStore.competitorPrices
            .map(c => c.prices.find(p => p.type === mine.type))
            .filter(p => !!p) as { type: string, price: number }[];
        
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
    
    return insights;
});

const getPriceStatusColor = (status: string) => {
    if (status === 'EXPENSIVE') return 'text-rose-500 bg-rose-50 border-rose-100';
    if (status === 'CHEAP') return 'text-emerald-500 bg-emerald-50 border-emerald-100';
    return 'text-slate-400 bg-slate-50 border-slate-100';
};

const removeCompetitor = (id: string) => {
    if (confirm('Remove this competitor from market tracking?')) {
        fuelStore.deleteCompetitor(id);
        notificationStore.success('Competitor removed', 'Success');
    }
};

const addNewCompetitor = () => {
    fuelStore.updateCompetitorPrice({ 
        competitorName: 'New Station', 
        distance: '0.5 mi', 
        prices: fuelStore.defaultFuelTypes.slice(0, 3).map(type => ({ type, price: 2.99 })),
        updatedAt: new Date().toISOString()
    });
};

const estimatedDailyProfit = computed(() => {
    if (fuelStore.currentPrices.length === 0) return 0;
    const totalMargin = fuelStore.currentPrices.reduce((s, p) => s + p.margin, 0) / fuelStore.currentPrices.length;
    const estVolume = 3500; // Mock average daily volume
    return totalMargin * estVolume;
});

// Historical Volume Analytics
const historicalVolumeData = computed(() => {
    const last14Days = Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (13 - i));
        return d.toISOString().split('T')[0];
    }) as string[];

    return last14Days.map(dateStr => {
        const log = fuelStore.logs.find(l => l.date === dateStr);
        const totalSold = log ? log.entries.reduce((s, e) => s + (Number(e.soldGal) || 0), 0) : 0;
        const totalVariance = log ? log.totalVariance : 0;
        const dateObj = new Date(dateStr);
        
        // If no log exists and it's not today, generate a realistic baseline for the dashboard logic
        const baseline = totalSold > 0 ? totalSold : (8000 + Math.sin(dateObj.getTime()) * 1000);
        
        return {
            date: dateStr,
            displayDate: dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            volume: baseline,
            variance: totalVariance,
            hasData: !!log
        };
    });
});

const maxVolume = computed(() => Math.max(...historicalVolumeData.value.map(d => d.volume), 10000));

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
          <p class="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Global logistics & tank inventory management</p>
        </div>
      </div>
      
      <div class="flex items-center gap-4 bg-white p-2 rounded-3xl border border-slate-100 shadow-sm overflow-x-auto no-scrollbar">
        <button v-for="t in (['analytics', 'inventory', 'price-watch', 'orders', 'invoices'] as const)" :key="t"
                @click="activeTab = t"
                class="px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
                :class="activeTab === t ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' : 'text-slate-400 hover:text-slate-900'">
          {{ t.replace('-', ' ') }}
        </button>
      </div>
    </div>

    <!-- Analytics / Tank Chart View -->
    <div v-if="activeTab === 'analytics'" class="space-y-8 animate-in fade-in duration-500">
        
        <!-- Pump Shutoff Global Alarm -->
        <div v-if="activeAlarms.length > 0" class="bg-rose-50 border-2 border-rose-100 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-rose-500/10 animate-pulse-subtle">
            <div class="flex items-center gap-6">
                <div class="w-16 h-16 bg-rose-500 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-rose-500/30">
                    <AlertCircle class="w-8 h-8 animate-bounce" />
                </div>
                <div>
                    <h2 class="text-xl font-black text-rose-900 uppercase italic tracking-tighter leading-none">Pump Shutoff Alert</h2>
                    <p class="text-[11px] font-bold text-rose-600 uppercase tracking-widest mt-2">Critical low volume detected (≤ 300 GAL) in {{ activeAlarms.length }} tanks. High risk of pump cavitation.</p>
                </div>
            </div>
            <div class="flex gap-2">
                <div v-for="alarm in activeAlarms" :key="alarm.type" class="px-4 py-2 bg-white rounded-xl border border-rose-200 text-[10px] font-black text-rose-700 uppercase">
                    {{ alarm.type }}: {{ alarm.level.toLocaleString() }} GAL
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div v-for="tank in currentTankStatus" :key="tank.type" class="bg-white border-2 border-slate-100 rounded-[3rem] p-8 shadow-sm group hover:border-slate-200 transition-all">
                <div class="flex items-center justify-between mb-8">
                   <div class="p-3 rounded-2xl bg-slate-50 text-slate-400 group-hover:text-slate-900 transition-colors">
                      <Zap class="w-6 h-6" />
                   </div>
                   <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">{{ tank.type }}</span>
                </div>

                <!-- Cylindrical Tank Vis (Enhanced Glassmorphism) -->
                <div class="relative w-36 h-64 mx-auto mb-8 bg-slate-100 rounded-[2.5rem] border-[6px] border-white shadow-[inset_0_10px_30px_rgba(0,0,0,0.05),0_20px_40px_-20px_rgba(0,0,0,0.1)] overflow-hidden group-hover:scale-105 transition-all duration-700">
                    <!-- Glass Texture Overlay -->
                    <div class="absolute inset-0 z-20 pointer-events-none">
                        <div class="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-black/5"></div>
                        <div class="absolute top-0 left-1/4 w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                        <div class="absolute top-4 left-4 right-4 h-1 bg-white/30 rounded-full blur-[1px]"></div>
                    </div>
                    
                    <!-- Liquid Fill -->
                    <div class="absolute bottom-0 w-full transition-all duration-[2500ms] ease-out-back" 
                         :class="tank.color" 
                         :style="{ height: `${tank.percentage}%` }">
                         
                         <!-- Liquid Depth Gradient -->
                         <div class="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/30"></div>
                         
                         <!-- Surface Effect -->
                         <div class="absolute top-0 left-0 w-full h-6 -translate-y-1/2 overflow-hidden">
                             <div class="absolute inset-0 bg-white/40 blur-sm animate-wave"></div>
                             <div class="absolute inset-x-0 top-1/2 h-0.5 bg-white/60 blur-[1px]"></div>
                         </div>
                         
                         <!-- Internal Depth Glow -->
                         <div class="absolute inset-x-4 bottom-4 top-4 border-l border-white/10 blur-[1px]"></div>
                         
                         <!-- Dynamic Bubbles (High Quality) -->
                         <div v-for="b in 8" :key="b" 
                              class="absolute w-1.5 h-1.5 bg-white/40 rounded-full animate-bubble opacity-0 group-hover:opacity-100 transition-opacity"
                              :style="{ 
                                left: `${15 + Math.random() * 70}%`, 
                                bottom: `${Math.random() * 40}%`,
                                animationDelay: `${Math.random() * 8}s`,
                                animationDuration: `${4 + Math.random() * 6}s`
                              }">
                         </div>
                    </div>

                    <!-- Level Scale Markers (3D etched look) -->
                    <div class="absolute inset-y-8 right-3 flex flex-col justify-between items-end z-10 opacity-40 pointer-events-none">
                        <div v-for="m in 10" :key="m" class="w-2 border-t border-slate-400 group-hover:w-3 transition-all"></div>
                    </div>

                    <!-- Digital Level Readout -->
                    <div class="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                        <div class="bg-white/90 backdrop-blur-xl px-4 py-2 rounded-2xl shadow-[0_10px_20px_rgba(0,0,0,0.1)] border border-white flex flex-col items-center group-hover:scale-110 transition-transform duration-500">
                            <span class="text-2xl font-black text-slate-900 tabular-nums leading-none" :class="tank.isCritical ? 'text-rose-600' : ''">{{ Math.round(tank.percentage) }}<span class="text-[10px] ml-0.5">%</span></span>
                            <div v-if="tank.isCritical" class="flex items-center gap-1 mt-1">
                                <AlertCircle class="w-2.5 h-2.5 text-rose-500 fill-rose-50" />
                                <span class="text-[7px] font-black text-rose-500 uppercase tracking-tighter">LOW LEVEL</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="space-y-3 text-center border-t border-slate-50 pt-6">
                    <div class="flex flex-col">
                        <span class="text-lg font-black text-slate-900 tabular-nums" :class="tank.isCritical ? 'text-rose-600' : ''">{{ tank.level.toLocaleString() }} <span class="text-[10px] text-slate-400 font-bold">GAL</span></span>
                        <div class="flex items-center justify-center gap-2 mt-1">
                            <div class="w-1.5 h-1.5 rounded-full" :class="tank.color"></div>
                            <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Safe: {{ tank.safeCapacity.toLocaleString() }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
           <div class="lg:col-span-8 bg-white border-2 border-slate-100 rounded-[3rem] p-10 shadow-sm">
               <div class="flex items-center justify-between mb-10">
                   <div>
                       <h3 class="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Volume Performance</h3>
                       <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">14-day historical volume analytics</p>
                   </div>
                   <div class="flex items-center gap-4">
                       <BarChart3 class="w-5 h-5 text-slate-300" />
                   </div>
               </div>
               
               <div class="h-80 flex items-end justify-between gap-3 px-2">
                  <div v-for="day in historicalVolumeData" :key="day.date" class="flex-1 group relative">
                      <!-- Volume Tooltip -->
                      <div class="absolute -top-16 left-1/2 -translate-x-1/2 bg-slate-900 text-white p-3 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-40 shadow-2xl scale-75 group-hover:scale-100 origin-bottom">
                         <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{{ day.displayDate }}</p>
                         <p class="text-xs font-black tabular-nums">{{ day.volume.toLocaleString() }} GAL</p>
                         <div v-if="day.variance !== 0" class="mt-1 flex items-center gap-1">
                             <div class="w-1.5 h-1.5 rounded-full" :class="day.variance > 0 ? 'bg-rose-500' : 'bg-emerald-500'"></div>
                             <span class="text-[8px] font-bold uppercase" :class="day.variance > 0 ? 'text-rose-400' : 'text-emerald-400'">{{ Math.abs(day.variance).toFixed(1) }} VAR</span>
                         </div>
                      </div>

                      <!-- Progress Bar Container -->
                      <div class="w-full bg-slate-50 rounded-2xl overflow-hidden hover:bg-slate-100 transition-colors border-x border-t border-slate-100/50" 
                           :style="{ height: `${(day.volume / maxVolume) * 100}%` }">
                           <!-- Gradient Fill -->
                           <div class="absolute inset-0 bg-gradient-to-t from-primary-600 to-primary-400 opacity-20 group-hover:opacity-100 transition-all duration-500"></div>
                           
                           <!-- Animated Highlight (Pulse) -->
                           <div v-if="day.hasData" class="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-transparent animate-shimmer"></div>
                           
                           <!-- Base Line -->
                           <div class="absolute bottom-0 inset-x-0 h-1 bg-primary-600 opacity-40"></div>
                      </div>
                      
                      <div class="mt-4 text-center">
                          <p class="text-[7px] font-black text-slate-400 uppercase tracking-widest">{{ day.displayDate.split(' ')[0] }}</p>
                          <p class="text-[9px] font-black text-slate-900 mt-0.5 leading-none">{{ day.displayDate.split(' ')[1] }}</p>
                      </div>
                  </div>
               </div>
           </div>

           <div class="lg:col-span-4 space-y-8">
               <div class="bg-slate-900 text-white rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group">
                   <TrendingUp class="absolute -bottom-6 -right-6 w-48 h-48 opacity-5 group-hover:scale-110 transition-transform duration-700" />
                   <div class="relative z-10">
                       <p class="text-[10px] font-black text-primary-400 uppercase tracking-widest mb-2">Fuel Purchase Power</p>
                       <h3 class="text-3xl font-black uppercase italic tracking-tighter">Inventory Valuation</h3>
                       <div class="mt-10 space-y-6">
                           <div class="flex items-center justify-between border-b border-white/10 pb-4">
                               <span class="text-xs font-bold text-white/50">Stored Value</span>
                               <span class="text-xl font-black tabular-nums">$92,440.00</span>
                           </div>
                           <div class="flex items-center justify-between border-b border-white/10 pb-4">
                               <span class="text-xs font-bold text-white/50">MTD Deliveries</span>
                               <span class="text-xl font-black tabular-nums">42,000 GAL</span>
                           </div>
                           <div class="flex items-center justify-between">
                               <span class="text-xs font-bold text-white/50">Avg Cost/Gal</span>
                               <span class="text-xl font-black tabular-nums font-mono">$2.82</span>
                           </div>
                       </div>
                   </div>
               </div>
           </div>
        </div>
    </div>

    <!-- Inventory Logging View -->
    <div v-if="activeTab === 'inventory'" class="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start animate-in fade-in slide-in-from-bottom-5 duration-500">
        <div class="xl:col-span-8 space-y-8">
            <!-- Date Navigation Header -->
            <div class="bg-white border-2 border-slate-100 rounded-[2.5rem] p-6 flex items-center justify-between shadow-sm">
                <div class="flex items-center gap-4">
                    <div class="p-3 bg-primary-50 text-primary-600 rounded-2xl">
                        <Calendar class="w-6 h-6" />
                    </div>
                    <div>
                        <h3 class="text-lg font-black text-slate-900 uppercase italic leading-none">Terminal Sync Date</h3>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{{ selectedDate }}</p>
                    </div>
                </div>
                <div class="flex items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                    <button @click="navigateDate(-1)" class="p-2.5 hover:bg-white hover:text-slate-900 rounded-xl text-slate-400"><ChevronLeft /></button>
                    <input type="date" v-model="selectedDate" class="bg-transparent border-none text-slate-900 font-black text-sm w-[150px] text-center" />
                    <button @click="navigateDate(1)" class="p-2.5 hover:bg-white hover:text-slate-900 rounded-xl text-slate-400"><ChevronRight /></button>
                </div>
            </div>

            <!-- Main Inventory Card -->
            <div class="bg-white border-2 border-slate-100 rounded-[3rem] overflow-hidden shadow-sm">
                <div class="px-10 py-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                    <div class="flex items-center gap-4">
                        <LayoutGrid class="w-6 h-6 text-slate-400" />
                        <h3 class="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Underground Tank Audit</h3>
                    </div>
                    <button @click="saveInventory" :disabled="isSubmitting" class="group px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center gap-3">
                        <Save v-if="!isSubmitting" class="w-4 h-4" />
                        <Loader2 v-else class="w-4 h-4 animate-spin" />
                        <span>Commit Audit</span>
                    </button>
                </div>

                <div class="p-0 overflow-x-auto">
                    <table class="w-full text-left">
                        <thead class="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                            <tr>
                                <th class="px-10 py-6">Fuel Type</th>
                                <th class="px-6 py-6 text-center">Opening (Gal)</th>
                                <th class="px-6 py-6 text-center">Delivery</th>
                                <th class="px-6 py-6 text-center">Sold (Gal)</th>
                                <th class="px-6 py-6 text-center">Book Inventory</th>
                                <th class="px-6 py-6 text-center bg-primary-50/30">ATG Inventory</th>
                                <th class="px-10 py-6 text-right">Short/Over</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            <tr v-for="entry in logEntries" :key="entry.type" class="group hover:bg-slate-50/50 transition-colors">
                                <td class="px-10 py-6">
                                    <div class="flex items-center gap-4">
                                        <div class="w-2 h-2 rounded-full bg-primary-500 shadow-glow shadow-primary-500/40"></div>
                                        <span class="text-sm font-black text-slate-900">{{ entry.type }}</span>
                                    </div>
                                </td>
                                <td class="px-4 py-4"><input type="number" v-model.number="entry.beginGal" @input="calculateInventoryRow(entry)" class="modern-input-small text-center opacity-60" /></td>
                                <td class="px-4 py-4"><input type="number" v-model.number="entry.deliveryGal" @input="calculateInventoryRow(entry)" class="modern-input-small text-center" /></td>
                                <td class="px-4 py-4"><input type="number" v-model.number="entry.soldGal" @input="calculateInventoryRow(entry)" class="modern-input-small text-center" /></td>
                                <td class="px-4 py-4"><div class="text-center text-xs font-black text-slate-400">{{ entry.bookInv.toLocaleString() }}</div></td>
                                <td class="px-4 py-4 border-x border-slate-100/50 bg-primary-50/10"><input type="number" v-model.number="entry.endInvAtg" @input="calculateInventoryRow(entry)" class="modern-input-small text-center border-primary-200 focus:border-primary-500 shadow-sm" /></td>
                                <td class="px-10 py-6 text-right">
                                    <div class="flex flex-col items-end">
                                        <span class="text-sm font-black tabular-nums transition-all" :class="entry.variance > 0 ? 'text-rose-500' : (entry.variance < 0 ? 'text-emerald-500' : 'text-slate-300')">
                                            {{ Math.abs(entry.variance).toFixed(0) }} 
                                            {{ entry.variance > 0 ? 'SHORT' : (entry.variance < 0 ? 'OVER' : 'BAL') }}
                                        </span>
                                        <span class="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-1">Variance</span>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div class="xl:col-span-4 space-y-8">
            <!-- ATG Scan Widget -->
            <div class="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
                <h3 class="text-sm font-black text-slate-900 uppercase italic tracking-tighter mb-6">ATG Terminal Snapshot</h3>
                <div class="space-y-6">
                    <label class="block group cursor-pointer">
                        <div class="flex flex-col items-center justify-center h-48 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] group-hover:bg-white group-hover:border-primary-500 transition-all">
                            <Paperclip class="w-8 h-8 text-slate-300 group-hover:text-primary-500 mb-4 transition-colors" />
                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-900">{{ atgImageFile ? atgImageFile.name : 'Attach Daily Stick Report' }}</span>
                        </div>
                        <input type="file" class="hidden" @change="(e: any) => atgImageFile = e.target.files[0]" />
                    </label>
                    <textarea v-model="logNotes" class="modern-input h-32 text-xs" placeholder="Operational notes (e.g. Tank 04 service underway...)"></textarea>
                </div>
            </div>

            <!-- Recent Highlights -->
            <div class="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-sm shadow-sm">
                <div class="flex items-center gap-3 mb-8">
                    <HistoryIcon class="w-5 h-5 text-slate-400" />
                    <h3 class="text-sm font-black text-slate-900 uppercase italic tracking-tighter">Inventory Pulse</h3>
                </div>
                <div class="space-y-6">
                    <div v-for="log in fuelStore.logs.slice(0, 3)" :key="log.id" class="flex items-center justify-between pb-6 border-b border-slate-50 last:border-0 last:pb-0">
                        <div>
                            <p class="text-xs font-black text-slate-900">{{ new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric'}) }}</p>
                            <p class="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">{{ log.entries.length }} Tanks Recorded</p>
                        </div>
                        <span class="text-xs font-black" :class="log.totalVariance < 0 ? 'text-rose-500' : 'text-emerald-500'">{{ log.totalVariance.toFixed(1) }} gal</span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Orders View -->
    <div v-if="activeTab === 'orders'" class="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in fade-in slide-in-from-right-10 duration-500">
        <div class="lg:col-span-7 space-y-8">
            <div class="bg-white border-2 border-slate-100 rounded-[3rem] p-10 shadow-sm relative overflow-hidden">
                <div class="absolute top-0 right-0 p-10 text-slate-50 pointer-events-none -mr-10 -mt-10">
                    <Send class="w-32 h-32" />
                </div>

                <div class="relative z-10 space-y-10">
                    <div>
                        <h3 class="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Dispatch New Load</h3>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Automated fuel replenishment request</p>
                    </div>

                    <div class="grid grid-cols-2 gap-8">
                        <div class="space-y-3">
                           <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Supplier / Terminal</label>
                           <input v-model="newOrder.supplier" type="text" placeholder="e.g. Mansfield Oil" class="modern-input" />
                        </div>
                        <div class="space-y-3">
                           <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Order # Reference</label>
                           <input v-model="newOrder.orderNumber" type="text" placeholder="PO-102930" class="modern-input" />
                        </div>
                    </div>

                    <div class="space-y-6">
                        <div class="flex items-center justify-between">
                           <h4 class="text-[10px] font-black text-slate-900 uppercase tracking-widest italic">Product Cargo List</h4>
                           <button @click="addOrderItem" class="text-[10px] font-black uppercase text-primary-600 hover:text-primary-800 flex items-center gap-2">
                             <Plus class="w-4 h-4" /> Add Fuel Type
                           </button>
                        </div>
                        
                        <div v-for="(item, idx) in newOrder.items" :key="idx" class="flex gap-6 animate-in slide-in-from-left-4" :style="{animationDelay: `${idx*100}ms`}">
                           <select v-model="item.type" class="w-48 h-14 bg-slate-50 border-2 border-slate-50 rounded-2xl px-4 text-xs font-black uppercase outline-none focus:bg-white focus:border-primary-500 transition-all">
                              <option v-for="t in fuelStore.defaultFuelTypes" :key="t" :value="t">{{ t }}</option>
                           </select>
                           <div class="relative flex-1">
                              <span class="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase tracking-widest">GALLONS</span>
                              <input v-model.number="item.gallons" type="number" class="modern-input pr-24" />
                           </div>
                        </div>
                    </div>

                    <div class="pt-8 border-t border-slate-50 flex justify-end">
                       <button @click="saveOrder" class="px-12 py-5 bg-slate-900 text-white rounded-[2rem] text-sm font-black uppercase tracking-widest hover:bg-primary-600 transition-all shadow-2xl flex items-center gap-4">
                          <Send class="w-5 h-5" /> Dispatch Load Order
                       </button>
                    </div>
                </div>
            </div>
        </div>

        <div class="lg:col-span-5">
            <div class="bg-white border-2 border-slate-100 rounded-[3rem] p-10 shadow-sm min-h-[500px]">
                <div class="flex items-center justify-between mb-10">
                   <h3 class="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Active Dispatches</h3>
                   <div class="px-4 py-1.5 bg-amber-50 text-amber-600 text-[10px] font-black rounded-full uppercase">{{ fuelStore.orders.filter(o => o.status === 'PENDING').length }} PENDING</div>
                </div>

                <div class="space-y-6">
                   <div v-for="order in fuelStore.orders" :key="order.id" class="p-6 bg-slate-50/50 hover:bg-white rounded-3xl border border-transparent hover:border-slate-100 transition-all cursor-pointer group">
                       <div class="flex items-center justify-between mb-4">
                          <div>
                             <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">REQ-{{ order.orderNumber }}</span>
                             <h4 class="text-sm font-black text-slate-900">{{ order.supplier }}</h4>
                          </div>
                          <div class="text-right">
                             <span class="text-sm font-black tabular-nums">{{ order.items.reduce((s, i) => s + i.gallons, 0).toLocaleString() }} gal</span>
                             <p class="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Cargo</p>
                          </div>
                       </div>
                       <div class="flex items-center justify-between border-t border-slate-100 pt-4">
                          <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest">{{ new Date(order.date).toLocaleDateString() }}</span>
                          <span class="px-3 py-1 bg-white border border-slate-200 rounded-full text-[8px] font-black text-slate-500 uppercase tracking-widest">{{ order.status }}</span>
                       </div>
                   </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Invoices & Deliveries View -->
    <div v-if="activeTab === 'invoices'" class="grid grid-cols-1 xl:grid-cols-12 gap-10 animate-in fade-in duration-500">
        <div class="xl:col-span-8 flex flex-col gap-10">
            <!-- Scan Hero -->
            <div class="bg-gradient-to-br from-primary-600 to-indigo-700 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden group">
                <div class="absolute top-0 right-0 p-12 opacity-10 group-hover:rotate-12 transition-transform duration-700">
                   <ScanLine class="w-64 h-64" />
                </div>
                
                <div class="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                   <div class="max-w-md">
                      <div class="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-xs font-black uppercase tracking-widest mb-6">
                         <Zap class="w-4 h-4 text-amber-400" /> AI Powered Logistics
                      </div>
                      <h2 class="text-4xl font-black uppercase italic tracking-tighter leading-none mb-6">Audit Fuel Delivery Snapshot</h2>
                      <p class="text-primary-100 text-sm font-bold leading-relaxed mb-8 opacity-80">Sync refinery bills instantly. Drop your invoice image here for automated extraction of gallons, pricing, and environmental fees.</p>
                      
                      <div class="flex items-center gap-4">
                         <button @click="simulateScan" class="px-10 py-5 bg-white text-primary-600 rounded-[2rem] text-sm font-black uppercase tracking-widest shadow-2xl shadow-indigo-900/40 hover:scale-105 transition-all">Launch AI Audit</button>
                         <label class="px-10 py-5 bg-white/10 hover:bg-white/20 rounded-[2rem] text-sm font-black uppercase tracking-widest border border-white/20 transition-all cursor-pointer">
                            Sync Photo
                            <input type="file" @change="(e: any) => invoiceImageFile = e.target.files[0]" class="hidden" accept="image/*" />
                         </label>
                      </div>
                   </div>

                   <div class="w-full md:w-64 h-80 bg-black/20 rounded-3xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center p-8 text-center group-hover:border-white/40 transition-all">
                      <div class="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
                         <Paperclip class="w-8 h-8 opacity-50" />
                      </div>
                      <p class="text-[10px] font-black uppercase tracking-widest opacity-60">{{ invoiceImageFile ? invoiceImageFile.name : 'Pipeline Receipt Pending' }}</p>
                   </div>
                </div>
            </div>

            <!-- Manual Entry / Results Form -->
            <div class="bg-white border-2 border-slate-100 rounded-[3rem] p-10 shadow-sm space-y-10">
                <div class="flex items-center justify-between">
                    <div>
                        <h3 class="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Delivery Details</h3>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Manual verification of extracted refinery data</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div class="space-y-3">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Invoice Number</label>
                        <input v-model="newInvoice.invoiceNumber" type="text" class="modern-input" />
                    </div>
                    <div class="space-y-3">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fuel Supplier</label>
                        <input v-model="newInvoice.supplier" type="text" class="modern-input" />
                    </div>
                    <div class="space-y-3">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Status</label>
                        <select v-model="newInvoice.status" class="modern-input text-xs font-black uppercase tracking-widest">
                            <option value="UNPAID">Unpaid / Awaiting Check</option>
                            <option value="PAID">Paid / ACH Success</option>
                        </select>
                    </div>
                </div>

                <div class="space-y-6">
                    <div v-for="(item, idx) in newInvoice.items" :key="idx" class="p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                        <div class="space-y-2">
                           <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest">Type</label>
                           <select v-model="item.type" class="modern-input h-12 text-[10px] font-black uppercase">
                              <option v-for="t in fuelStore.defaultFuelTypes" :key="t" :value="t">{{ t }}</option>
                           </select>
                        </div>
                        <div class="space-y-2">
                           <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest">Net Gallons</label>
                           <input v-model.number="item.gallons" type="number" @input="calculateInvoiceTotal" class="modern-input h-12 no-spinner" />
                        </div>
                        <div class="space-y-2">
                           <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest">CPG (Cost Per Gal)</label>
                           <input v-model.number="item.costPerGal" type="number" step="0.001" @input="calculateInvoiceTotal" class="modern-input h-12 no-spinner" />
                        </div>
                        <div class="space-y-2">
                           <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest">Subtotal</label>
                           <div class="h-12 bg-white border border-slate-100 rounded-xl flex items-center justify-end px-4 text-sm font-black text-slate-900 shadow-inner italic">
                              ${{ (item.gallons * item.costPerGal).toLocaleString(undefined, { minimumFractionDigits: 2 }) }}
                           </div>
                        </div>
                    </div>
                </div>

                <div class="flex flex-col md:flex-row items-center justify-between gap-6 pt-10 border-t border-slate-100">
                    <div>
                       <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Refinery Total (Inc Environmental Fees)</p>
                       <h3 class="text-4xl font-black text-slate-900 tabular-nums shadow-glow shadow-primary-500/5">${{ newInvoice.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 }) }}</h3>
                    </div>
                    <button @click="saveInvoice" class="w-full md:w-auto px-12 py-5 bg-slate-900 text-white rounded-[2rem] text-sm font-black uppercase tracking-widest hover:bg-black transition-all shadow-2xl flex items-center justify-center gap-4">
                       <Save class="w-5 h-5" /> Commit Delivery Record
                    </button>
                </div>
            </div>
        </div>

        <div class="xl:col-span-4 space-y-10">
            <div class="bg-white border-2 border-slate-100 rounded-[3rem] p-10 shadow-sm flex flex-col h-full min-h-[600px]">
                <div class="flex items-center justify-between mb-10">
                   <h3 class="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Bill Log</h3>
                   <FileText class="w-5 h-5 text-slate-300" />
                </div>

                <div class="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                   <div v-for="inv in fuelStore.invoices" :key="inv.id" class="p-6 bg-slate-50/50 rounded-3xl border border-transparent hover:border-slate-100 hover:bg-white transition-all cursor-pointer group">
                       <div class="flex items-center justify-between mb-4">
                          <div>
                             <span class="text-[8px] font-black text-slate-300 uppercase tracking-widest block mb-1">TXN-{{ inv.invoiceNumber }}</span>
                             <h4 class="text-xs font-black text-slate-900">{{ inv.supplier }}</h4>
                          </div>
                          <div class="text-right">
                             <p class="text-sm font-black tabular-nums">${{ inv.totalAmount.toLocaleString() }}</p>
                             <span class="text-[8px] font-black uppercase tracking-widest" :class="inv.status === 'PAID' ? 'text-emerald-500' : 'text-rose-500'">{{ inv.status }}</span>
                          </div>
                       </div>
                       <div class="flex items-center justify-between pt-4 border-t border-white/80">
                          <p class="text-[9px] font-bold text-slate-400">{{ new Date(inv.date).toLocaleDateString() }}</p>
                          <ArrowDownRight class="w-4 h-4 text-slate-300" />
                       </div>
                   </div>
                </div>
            </div>
        </div>
    </div>
    <!-- Price Watch Management View -->
    <div v-if="activeTab === 'price-watch'" class="grid grid-cols-1 xl:grid-cols-12 gap-10 animate-in fade-in slide-in-from-bottom-5 duration-500">
        <!-- Your Prices Management -->
        <div class="xl:col-span-12 bg-white border-2 border-slate-100 rounded-[3rem] p-10 shadow-sm">
            <div class="flex items-center justify-between mb-10">
                <div>
                    <h3 class="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Your Current Pricing</h3>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Manage live pump prices across all fuel types</p>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div v-for="price in fuelStore.currentPrices" :key="price.type" class="p-8 rounded-[2.5rem] border-2 border-slate-50 hover:border-primary-100 transition-all group relative overflow-hidden">
                    <!-- Price Alert Badge -->
                    <div v-if="marketPosition.find(p => p.type === price.type)" 
                         class="absolute top-4 right-4 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border"
                         :class="getPriceStatusColor(marketPosition.find(p => p.type === price.type)?.status || '')">
                         {{ marketPosition.find(p => p.type === price.type)?.status }}
                    </div>

                    <div class="flex items-center justify-between mb-6">
                        <span class="text-xs font-black text-slate-900 uppercase tracking-widest">{{ price.type }}</span>
                        <div class="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <TrendingUp class="w-4 h-4" />
                        </div>
                    </div>

                    <div class="space-y-4">
                        <div class="space-y-2">
                            <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Cash Price</label>
                            <div class="relative">
                                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                <input v-model.number="price.cashPrice" type="number" step="0.01" class="modern-input h-12 pl-8 text-sm" @change="fuelStore.updateCurrentPrice(price)" />
                            </div>
                        </div>
                        <div class="space-y-2">
                            <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Credit Price</label>
                            <div class="relative">
                                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                <input v-model.number="price.creditPrice" type="number" step="0.01" class="modern-input h-12 pl-8 text-sm" @change="fuelStore.updateCurrentPrice(price)" />
                            </div>
                        </div>
                        <div class="flex items-center justify-between pt-4 border-t border-slate-50">
                            <div class="flex flex-col">
                                <span class="text-[10px] font-bold text-slate-400">Current Margin</span>
                                <span class="text-[8px] font-black text-slate-300 uppercase">vs Avg: {{ (marketPosition.find(p => p.type === price.type)?.diff || 0) > 0 ? '+' : '' }}{{ ((marketPosition.find(p => p.type === price.type)?.diff || 0) * 100).toFixed(1) }}¢</span>
                            </div>
                            <span class="text-sm font-black text-emerald-600">{{ (price.margin * 100).toFixed(1) }}¢</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Competitor Tracking -->
        <div class="xl:col-span-8 bg-white border-2 border-slate-100 rounded-[3rem] p-10 shadow-sm">
            <div class="flex items-center justify-between mb-10">
                <div>
                    <h3 class="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Market Survey</h3>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Daily competitor price tracking (Last 24 Hours)</p>
                </div>
                <button @click="addNewCompetitor" class="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-600 transition-all flex items-center gap-2">
                    <Plus class="w-4 h-4" /> Add Station
                </button>
            </div>

            <div class="space-y-6">
                <div v-for="comp in fuelStore.competitorPrices" :key="comp.id" class="p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 group">
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-xl font-black text-slate-300">{{ comp.competitorName[0] }}</div>
                                <div class="flex flex-col">
                                    <input v-model="comp.competitorName" class="bg-transparent border-none text-lg font-black text-slate-900 outline-none p-0 focus:ring-0 h-7" @change="fuelStore.updateCompetitorPrice(comp)" />
                                    <div class="flex items-center gap-1 group/dist">
                                        <input v-model="comp.distance" class="bg-transparent border-none text-[9px] font-bold text-slate-400 uppercase tracking-widest outline-none p-0 focus:ring-0 w-16" @change="fuelStore.updateCompetitorPrice(comp)" />
                                        <span class="text-[9px] font-bold text-slate-300 uppercase opacity-0 group-hover/dist:opacity-100 transition-opacity">edit dist</span>
                                    </div>
                                </div>
                        </div>
                        <div class="flex items-center gap-6">
                            <div class="flex items-center gap-3">
                                <div v-for="p in comp.prices" :key="p.type" class="bg-white px-4 py-2 rounded-xl border border-slate-100 flex flex-col items-center">
                                    <span class="text-[8px] font-black text-slate-400 uppercase mb-1">{{ p.type }}</span>
                                    <div class="flex items-baseline gap-0.5">
                                        <span class="text-slate-400 text-[10px] font-bold">$</span>
                                        <input v-model.number="p.price" type="number" step="0.01" class="w-16 bg-transparent border-none p-0 text-sm font-black text-slate-900 text-center focus:ring-0" @change="fuelStore.updateCompetitorPrice(comp)" />
                                    </div>
                                </div>
                            </div>
                            <button @click="removeCompetitor(comp.id)" class="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                                <AlertCircle class="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
                
                <div v-if="fuelStore.competitorPrices.length === 0" class="flex flex-col items-center justify-center py-20 text-slate-300">
                    <Zap class="w-12 h-12 mb-4 opacity-10" />
                    <p class="text-sm font-black uppercase tracking-widest">No market data recorded</p>
                </div>
            </div>
        </div>

        <div class="xl:col-span-4 bg-slate-900 text-white rounded-[3rem] p-10 shadow-2xl relative overflow-hidden flex flex-col justify-between">
            <div class="relative z-10">
                <p class="text-[10px] font-black text-primary-400 uppercase tracking-widest mb-2">Market Sentiment</p>
                <h3 class="text-3xl font-black uppercase italic tracking-tighter mb-8 text-white">Price Sensitivity</h3>
                
                <div class="space-y-8">
                    <div v-for="insight in marketPosition.slice(0, 2)" :key="insight.type" class="p-6 bg-white/5 rounded-3xl border border-white/10">
                          <div class="flex items-center justify-between mb-4">
                             <span class="text-[10px] font-black uppercase text-white/50">{{ insight.type }} Market Position</span>
                             <span class="px-3 py-1 rounded-full text-[8px] font-black uppercase italic"
                                   :class="insight.status === 'CHEAP' ? 'bg-emerald-500 text-white' : (insight.status === 'EXPENSIVE' ? 'bg-rose-500 text-white' : 'bg-slate-500 text-white')">
                                {{ insight.status }}
                             </span>
                          </div>
                          <p class="text-xs font-medium text-white/80 leading-relaxed" v-if="insight.status !== 'NO_DATA'">
                             Your {{ insight.type }} price is currently {{ Math.abs(insight.diff * 100).toFixed(1) }}¢ {{ insight.diff > 0 ? 'above' : 'below' }} the local average.
                             {{ insight.status === 'CHEAP' ? 'Optimal volume capture expected.' : (insight.status === 'EXPENSIVE' ? 'Risk of volume loss to neighbors.' : 'Balanced competitive stance.') }}
                          </p>
                    </div>

                    <div class="p-6 bg-white/5 rounded-3xl border border-white/10">
                         <div class="flex items-center justify-between mb-4">
                            <span class="text-[10px] font-black uppercase text-white/50">Profit Forecast</span>
                         </div>
                         <div class="flex items-end justify-between">
                            <span class="text-4xl font-black tabular-nums text-white">${{ estimatedDailyProfit.toLocaleString(undefined, { maximumFractionDigits: 0 }) }}</span>
                            <span class="text-[10px] font-bold text-primary-400 uppercase tracking-widest">est. daily pull</span>
                         </div>
                    </div>
                </div>
            </div>

            <div class="mt-10 p-6 bg-primary-600 rounded-[2.5rem] shadow-xl shadow-primary-500/20 group cursor-pointer transition-all hover:scale-105">
                <div class="flex items-center gap-4 mb-3">
                    <div class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                        <ArrowUpRight class="w-4 h-4 text-white" />
                    </div>
                    <span class="text-[10px] font-black uppercase tracking-widest text-white">Price Recommendation</span>
                </div>
                <p class="text-sm font-black text-white italic">"Increase Premium by 2.0¢ at 6:00 AM based on competitor Shell closure."</p>
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

.stats-card {
  @apply transition-all hover:translate-y-[-4px] duration-300;
}

.shadow-glow {
    box-shadow: 0 0 20px rgba(var(--primary-500-rgb), 0.2);
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

@keyframes bubble {
    0% { transform: translateY(0) scale(1); opacity: 0; }
    20% { opacity: 0.6; }
    100% { transform: translateY(-100px) scale(1.5); opacity: 0; }
}

.animate-bubble {
    animation: bubble linear infinite;
}

.ease-out-back {
    transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes pulse-subtle {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.95; transform: scale(0.998); }
}

@keyframes wave {
    0% { transform: translateX(-50%) skewX(0deg); }
    50% { transform: translateX(0%) skewX(10deg); }
    100% { transform: translateX(-50%) skewX(0deg); }
}

.animate-wave {
    animation: wave 10s ease-in-out infinite;
    width: 200%;
}

@keyframes shimmer {
    0% { transform: translateY(100%); }
    100% { transform: translateY(-100%); }
}

.animate-shimmer {
    animation: shimmer 3s linear infinite;
}
</style>
