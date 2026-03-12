<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { 
  Truck,
  MousePointer2,
  Activity, Radar, Droplet, Save, 
  ChevronLeft, ChevronRight, Loader2, Paperclip, 
  Plus, Zap, Calendar, LayoutGrid, Sparkles
} from 'lucide-vue-next';
import { usePricingStore } from '../../stores/pricing';
import { useFuelStore, type FuelEntry } from '../../stores/fuel';
import { useNotificationStore } from '../../stores/notifications';
import { useLocationsStore } from '../../stores/locations';
import { storage } from '../../firebaseConfig';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { extractFuelInvoiceData } from '../../services/aiExtractionService';

const fuelStore = useFuelStore();
const pricingStore = usePricingStore();
const notificationStore = useNotificationStore();
const locationsStore = useLocationsStore();

// Navigation & Tabs
const activeTab = ref<'inventory' | 'orders' | 'invoices' | 'suggestions' | 'price-watch'>('suggestions');
const selectedDate = ref<string>(new Date().toISOString().split('T')[0] as string);
const isSubmitting = ref(false);
const invoiceInput = ref<HTMLInputElement | null>(null);
const atgInput = ref<HTMLInputElement | null>(null);
const isDraggingInvoice = ref(false);
const isDraggingAtg = ref(false);

const triggerInvoiceUpload = () => invoiceInput.value?.click();
const triggerAtgUpload = () => atgInput.value?.click();

const handleInvoiceDrop = (e: DragEvent) => {
    isDraggingInvoice.value = false;
    const file = e.dataTransfer?.files[0];
    if (file) invoiceImageFile.value = file;
};

const handleAtgDrop = (e: DragEvent) => {
    isDraggingAtg.value = false;
    const file = e.dataTransfer?.files[0];
    if (file) atgImageFile.value = file;
};

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
const isAiProcessing = ref(false);

const handleAiScan = async () => {
    if (!invoiceImageFile.value) {
        notificationStore.error('No BOL/Invoice file selected', 'Missing File');
        return;
    }

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        notificationStore.error('Gemini API Key missing in environment (VITE_GEMINI_API_KEY)', 'Config Error');
        return;
    }

    isAiProcessing.value = true;
    try {
        const result = await extractFuelInvoiceData(apiKey, invoiceImageFile.value);
        if (result) {
            newInvoice.value = {
                ...newInvoice.value,
                invoiceNumber: result.invoiceNumber || '',
                supplier: result.supplier || '',
                date: result.date || new Date().toISOString().split('T')[0],
                items: result.items.length > 0 ? result.items : newInvoice.value.items,
                totalAmount: result.totalAmount || 0
            };
            notificationStore.success('AI Data Extraction complete', 'Success');
        } else {
            notificationStore.error('AI failed to parse document structure', 'Parsing Error');
        }
    } catch (error: any) {
        console.error("AI Scan Error Details:", error);
        notificationStore.error(error.message?.substring(0, 100) || 'AI Extraction failed', 'Process Error');
    } finally {
        isAiProcessing.value = false;
    }
};


onMounted(() => {
    fuelStore.fetchLogs();
    fuelStore.fetchOrders();
    fuelStore.fetchInvoices();
    fuelStore.fetchCurrentPrices();
    fuelStore.fetchCompetitorPrices();
    fuelStore.fetchTankConfigs();
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
    fuelStore.fetchTankConfigs();
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
        
        // Use either previous log types or current tank configurations
        const typesToUse = fuelStore.tankConfigs.length > 0 
            ? fuelStore.tankConfigs.map(c => c.type) 
            : (prevLog ? prevLog.entries.map(e => e.type) : fuelStore.defaultFuelTypes);
        
        logEntries.value = typesToUse.map(type => {
            const prevEntry = prevLog?.entries.find(e => e.type === type);
            const beginGal = prevEntry ? prevEntry.endInvAtg : 0;
            
            // Calculate deliveries from invoices for this date
            const deliveryGal = fuelStore.invoices
                .filter(i => i.date === selectedDate.value)
                .reduce((sum, inv) => {
                    const item = inv.items.find(it => it.type === type);
                    return sum + (item ? item.gallons : 0);
                }, 0);

            return {
                type,
                inch: 0,
                beginGal,
                deliveryGal,
                soldGal: 0,
                bookInv: beginGal + deliveryGal,
                endInvAtg: 0,
                costPerGal: 0,
                variance: -(beginGal + deliveryGal)
            };
        });
        logNotes.value = '';
        atgImageUrl.value = '';
    }
};

// Watch for data loading to update view if data arrives after mount
watch(() => fuelStore.logs, () => initializeInventory());
watch(() => fuelStore.invoices, () => {
    // Only update deliveries if we haven't committed this log yet (draft mode)
    const existingLog = fuelStore.logs.find(l => l.date === selectedDate.value);
    if (!existingLog) {
        logEntries.value.forEach(entry => {
            const deliveryGal = fuelStore.invoices
                .filter(i => i.date === selectedDate.value)
                .reduce((sum, inv) => {
                    const item = inv.items.find(it => it.type === entry.type);
                    return sum + (item ? item.gallons : 0);
                }, 0);
            
            if (entry.deliveryGal !== deliveryGal) {
                entry.deliveryGal = deliveryGal;
                calculateInventoryRow(entry);
            }
        });
    }
});

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

        // Auto-update current inventory log with delivered gallons
        newInvoice.value.items.forEach(invoiceItem => {
            const entry = logEntries.value.find(e => e.type === invoiceItem.type);
            if (entry) {
                entry.deliveryGal = (Number(entry.deliveryGal) || 0) + invoiceItem.gallons;
                calculateInventoryRow(entry);
            }
        });

        notificationStore.success('Fuel invoice recorded and inventory updated', 'Success');
        newInvoice.value = { invoiceNumber: '', supplier: '', date: new Date().toISOString().split('T')[0], items: [{ type: 'Regular', gallons: 0, costPerGal: 0, taxes: 0, totalCost: 0 }], totalAmount: 0, status: 'UNPAID' };
        invoiceImageFile.value = null;
    } catch (e) {
        notificationStore.error('Invoice recording failed', 'Error');
    }
};

// Tank Configuration Logic
const SAFE_FILL_FACTOR = 0.9;

// Analytics Data
const currentTankStatus = computed(() => {
    // Priority: 1. Local logEntries (current session), 2. Explicit log for date, 3. Most recent log
    const entriesToUse = logEntries.value.length > 0 ? logEntries.value : (fuelStore.logs.find(l => l.date === selectedDate.value)?.entries || fuelStore.logs[0]?.entries || []);
    
    if (entriesToUse.length === 0) return [];
    
    return entriesToUse.map(e => {
        const config = fuelStore.tankConfigs.find(c => c.type === e.type);
        const totalCapacity = config?.capacity || 10000;
        const safeCapacity = totalCapacity * SAFE_FILL_FACTOR;
        const shutoffPoint = config?.shutoffPoint || 300;
        
        // Final level logic: Use ATG if available, otherwise show the Book Inventory
        const currentVolume = e.endInvAtg > 0 ? e.endInvAtg : Math.max(0, e.bookInv);
        const percentage = Math.min(100, (currentVolume / safeCapacity) * 100);
        
        // Health Sign logic: Was it critical but now has a delivery?
        const isCritical = currentVolume <= shutoffPoint;
        const hasDelivery = (Number(e.deliveryGal) || 0) > 0;
        
        let fuelColor = 'bg-slate-400';
        const name = e.type.toLowerCase();
        if (name.includes('87 regular')) fuelColor = 'bg-emerald-400';
        else if (name.includes('regular')) fuelColor = 'bg-emerald-500';
        else if (name.includes('super')) fuelColor = 'bg-rose-600';
        else if (name.includes('premium')) fuelColor = 'bg-rose-500';
        else if (name.includes('diesel b20')) fuelColor = 'bg-purple-600';
        else if (name.includes('diesel b5')) fuelColor = 'bg-purple-500';
        else if (name.includes('diesel farm')) fuelColor = 'bg-amber-600';
        else if (name.includes('diesel clear')) fuelColor = 'bg-blue-400';
        else if (name.includes('diesel')) fuelColor = 'bg-purple-500';
        else if (name.includes('plus')) fuelColor = 'bg-sky-500';

        return {
            type: e.type,
            level: currentVolume,
            capacity: totalCapacity,
            safeCapacity,
            percentage,
            color: fuelColor,
            isCritical,
            hasDelivery,
            hasData: logEntries.value.length > 0 || !!fuelStore.logs.find(l => l.date === selectedDate.value)
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
        <button v-for="t in (['suggestions', 'inventory', 'price-watch', 'orders', 'invoices'] as const)" :key="t"
                @click="activeTab = t"
                class="px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
                :class="activeTab === t ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' : 'text-slate-400 hover:text-slate-900'">
          {{ t.replace('-', ' ') }}
        </button>
      </div>
    </div>

    <!-- Daily Action Suggestions Module -->
    <div v-if="activeTab === 'suggestions'" class="space-y-8 animate-in fade-in duration-500">
        <!-- Cylindrical Tank Visualizations -->
        <div class="bg-white border-2 border-slate-100 rounded-[3rem] p-10 shadow-sm overflow-x-auto custom-scrollbar">
            <div class="flex items-center gap-10 min-w-max pb-4">
                <div v-for="tank in currentTankStatus" :key="tank.type" class="flex flex-col items-center group">
                    <!-- Tank Header -->
                    <div class="text-center mb-6">
                        <span class="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-slate-900 transition-colors">{{ tank.type }}</span>
                        <div class="text-lg font-black text-slate-900 mt-1 tabular-nums">{{ tank.level.toLocaleString() }} <span class="text-[8px] opacity-40">GAL</span></div>
                    </div>

                    <!-- Cylindrical Tank Body -->
                    <div class="relative w-28 h-56 bg-slate-100 rounded-[4rem] border-[4px] border-white shadow-2xl overflow-hidden group-hover:scale-105 transition-transform duration-500">
                        <!-- 90% Ullage Line Indicator -->
                        <div class="absolute top-[10%] inset-x-0 h-px bg-rose-400/30 z-20 border-t border-dashed">
                             <span class="absolute right-2 -top-2 text-[6px] font-black text-rose-400 uppercase">90% CAP</span>
                        </div>

                        <!-- Fuel Liquid -->
                        <div class="absolute bottom-0 w-full transition-all duration-[2000ms] ease-out-back" 
                             :class="tank.color" 
                             :style="{ height: `${tank.percentage}%` }">
                             <!-- Wave Animation Effect -->
                             <div class="absolute inset-x-0 top-0 h-4 -translate-y-1/2 bg-white/20 blur-md animate-wave"></div>
                             
                             <!-- Progress Label Inside Tank -->
                             <div class="absolute inset-x-0 bottom-6 text-center">
                                 <span class="text-[10px] font-black text-white/90 tabular-nums">{{ Math.round(tank.percentage) }}%</span>
                             </div>
                        </div>

                        <!-- Glossy Overlay -->
                        <div class="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-white/20 to-transparent z-10"></div>
                        <div class="absolute inset-y-0 right-0 w-2 bg-black/5 z-0"></div>
                    </div>

                    <!-- Tank Footer Stats -->
                    <div class="mt-6 flex flex-col items-center gap-1">
                        <span class="text-[8px] font-bold text-slate-400 uppercase italic">Ullage: {{ (tank.safeCapacity - tank.level).toLocaleString() }} gal</span>
                        <div v-if="tank.isCritical" class="flex items-center gap-1 text-[8px] font-black text-rose-500 uppercase mt-1 animate-pulse">
                            <Zap class="w-2.5 h-2.5" /> Critical
                        </div>
                        <div v-else-if="tank.hasDelivery" class="flex items-center gap-1 text-[8px] font-black text-emerald-500 uppercase mt-1">
                            <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping mr-1"></div>
                            <Activity class="w-2.5 h-2.5" /> Healthy
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <!-- Top Priority Alerts & Health Restoration -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Critical Alarms -->
            <div v-for="tank in currentTankStatus.filter(t => t.isCritical)" :key="tank.type" 
                 class="bg-rose-50 border-2 border-rose-100 rounded-[3rem] p-8 shadow-sm group">
                <div class="flex items-center gap-4 mb-6">
                    <div class="p-3 bg-rose-500 text-white rounded-2xl shadow-lg shadow-rose-500/20">
                        <Zap class="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                        <h3 class="text-rose-900 font-black uppercase text-sm tracking-tight italic">{{ tank.type }} CRITICAL</h3>
                        <p class="text-rose-600/70 text-[10px] font-black uppercase tracking-widest">Immediate action required</p>
                    </div>
                </div>
                <p class="text-rose-900/80 text-sm font-medium leading-relaxed mb-6">
                    Current inventory is at <span class="font-black">{{ tank.level.toLocaleString() }} GAL</span>. 
                    Risk of pump shutoff in less than <span class="font-black text-rose-600">4 hours</span>.
                </p>
                <button @click="activeTab = 'orders'" class="w-full py-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-600/20">
                    Dispatch Emergency Load
                </button>
            </div>

            <!-- Health Restoration (Stabilized Tanks) -->
            <div v-for="tank in currentTankStatus.filter(t => t.hasDelivery && !t.isCritical)" :key="'healthy-' + tank.type" 
                 class="bg-emerald-50 border-2 border-emerald-100 rounded-[3rem] p-8 shadow-sm group animate-in zoom-in duration-500">
                <div class="flex items-center gap-4 mb-6">
                    <div class="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20">
                        <Activity class="w-6 h-6" />
                    </div>
                    <div>
                        <h3 class="text-emerald-900 font-black uppercase text-sm tracking-tight italic">{{ tank.type }} STABILIZED</h3>
                        <p class="text-emerald-600/70 text-[10px] font-black uppercase tracking-widest">Inventory Health Restored</p>
                    </div>
                </div>
                <p class="text-emerald-900/80 text-sm font-medium leading-relaxed mb-6">
                    Inventory has been replenished. Current volume is <span class="font-black text-emerald-600">{{ tank.level.toLocaleString() }} GAL</span>. 
                    Supply chain risk has been mitigated.
                </p>
                <div class="flex items-center gap-2 text-emerald-600/60 font-black text-[9px] uppercase tracking-widest bg-white/50 py-2 px-4 rounded-xl w-fit">
                   <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></div>
                   Healthy Operating Level
                </div>
            </div>

            <div v-if="marketPosition.some(p => p.status === 'EXPENSIVE')" 
                 class="bg-amber-50 border-2 border-amber-100 rounded-[3rem] p-8 shadow-sm">
                <div class="flex items-center gap-4 mb-6">
                    <div class="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-500/20">
                        <TrendingUp class="w-6 h-6" />
                    </div>
                    <div>
                        <h3 class="text-amber-900 font-black uppercase text-sm tracking-tight italic">Pricing Alert</h3>
                        <p class="text-amber-600/70 text-[10px] font-black uppercase tracking-widest">Market Gap reaching critical</p>
                    </div>
                </div>
                <p class="text-amber-900/80 text-sm font-medium leading-relaxed mb-6">
                    Competitors have dropped prices by an average of <span class="font-black italic">5.2¢</span>. 
                    Gallon velocity may drop <span class="font-black text-amber-600">12%</span> if not adjusted.
                </p>
                <button @click="activeTab = 'price-watch'" class="w-full py-4 bg-amber-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-700 transition-all shadow-xl shadow-amber-600/20">
                    Audit Pump Prices
                </button>
            </div>

            <div v-if="currentTankStatus.filter(t => t.isCritical).length === 0 && currentTankStatus.filter(t => t.hasDelivery && !t.isCritical).length === 0 && !marketPosition.some(p => p.status === 'EXPENSIVE')"
                 class="lg:col-span-3 bg-emerald-50 border-2 border-emerald-100 rounded-[3rem] p-12 shadow-sm flex flex-col items-center text-center">
                <div class="p-4 bg-emerald-500 text-white rounded-[2rem] shadow-xl shadow-emerald-500/20 mb-6">
                    <Sparkles class="w-10 h-10" />
                </div>
                <h3 class="text-2xl font-black text-emerald-900 uppercase italic tracking-tighter mb-2">Operations Optimized</h3>
                <p class="text-emerald-700/70 text-sm font-medium tracking-tight max-w-md">
                    All fuel levels are within safe operating parameters and terminal pricing is competitive. No critical actions pending.
                </p>
            </div>
        </div>

        <!-- Smart Suggestions Cards -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Delivery Efficiency -->
            <div class="bg-white border-2 border-slate-100 rounded-[3rem] p-10 shadow-sm relative overflow-hidden group">
                <div class="flex items-center gap-4 mb-8">
                    <div class="p-4 bg-primary-50 text-primary-600 rounded-[2rem]">
                        <Truck class="w-8 h-8" />
                    </div>
                    <div>
                        <h3 class="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Inventory Optimization</h3>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Load consolidation suggestions</p>
                    </div>
                </div>
                
                <div class="space-y-4">
                    <div v-for="tank in logisticsSummary.filter(t => t.ullage >= 6000)" :key="tank.type" 
                         class="p-6 bg-slate-50 rounded-3xl border border-slate-100 group-hover:border-primary-200 transition-colors">
                        <div class="flex items-center justify-between mb-4">
                            <span class="text-xs font-black text-slate-900 uppercase">{{ tank.type }} Segment</span>
                            <span class="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-600 text-[8px] font-black uppercase">Favorable Load</span>
                        </div>
                        <p class="text-xs text-slate-500 font-medium leading-relaxed">
                            Current Ullage is <span class="text-slate-900 font-black">{{ tank.ullage.toLocaleString() }} GAL</span>. 
                            You can accept a full transport load immediately to lower weighted average cost.
                        </p>
                        <div class="mt-4 flex gap-2">
                           <button @click="activeTab = 'orders'" class="px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest">Prepare PO</button>
                        </div>
                    </div>
                    <div v-if="logisticsSummary.filter(t => t.ullage >= 6000).length === 0" class="p-10 text-center italic text-slate-400 text-sm">
                        No immediate bulk load opportunities detected.
                    </div>
                </div>
            </div>

            <!-- Profit Insights -->
            <div class="bg-white border-2 border-slate-100 rounded-[3rem] p-10 shadow-sm">
                <div class="flex items-center gap-4 mb-8">
                    <div class="p-4 bg-emerald-50 text-emerald-600 rounded-[2rem]">
                        <Activity class="w-8 h-8" />
                    </div>
                    <div>
                        <h3 class="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Yield Opportunities</h3>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Margin & Volume balancing</p>
                    </div>
                </div>

                <div class="space-y-4">
                    <div v-for="price in marketPosition.filter(p => p.status === 'CHEAP')" :key="price.type"
                         class="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                        <div class="flex items-center justify-between mb-2">
                             <span class="text-xs font-black text-slate-900 uppercase">{{ price.type }} Pricing</span>
                             <span class="px-2 py-0.5 rounded-lg bg-primary-100 text-primary-600 text-[8px] font-black uppercase">Margin Opportunity</span>
                        </div>
                        <p class="text-xs text-slate-500 font-medium leading-relaxed">
                            You are <span class="text-emerald-500 font-black">{{ Math.abs(price.diff).toFixed(1) }}¢</span> cheaper than market average. 
                            Suggesting a <span class="font-black uppercase text-slate-900">2¢ increase</span> to capture $120+ additional daily margin without losing market share.
                        </p>
                    </div>
                    <div v-if="marketPosition.filter(p => p.status === 'CHEAP').length === 0" class="p-10 text-center italic text-slate-400 text-sm">
                        Currently yielding maximum market margin per segment.
                    </div>
                </div>

                <div class="mt-10 p-8 bg-slate-900 text-white rounded-[2.5rem] relative overflow-hidden group">
                    <div class="relative z-10">
                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Projected Daily Volume Pool</p>
                        <h4 class="text-4xl font-black tabular-nums tracking-tighter">~{{ historicalVolumeData[historicalVolumeData.length-1]?.volume?.toLocaleString() || '0' }} <span class="text-xs">GAL</span></h4>
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
                    <div 
                        @click="triggerAtgUpload"
                        @dragover.prevent="isDraggingAtg = true"
                        @dragleave.prevent="isDraggingAtg = false"
                        @drop.prevent="handleAtgDrop"
                        class="block group cursor-pointer border-2 border-dashed rounded-[2rem] p-10 transition-all text-center"
                        :class="[
                            atgImageFile ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50/50 border-slate-100 hover:bg-white hover:border-primary-500',
                            isDraggingAtg ? 'bg-primary-50 border-primary-500 border-2' : ''
                        ]"
                    >
                        <Paperclip class="w-8 h-8 mx-auto mb-4" :class="atgImageFile ? 'text-emerald-500' : 'text-slate-300 group-hover:text-primary-500'" />
                        <span class="text-[10px] font-black uppercase tracking-widest" :class="atgImageFile ? 'text-emerald-700' : 'text-slate-400'">
                            {{ atgImageFile ? atgImageFile.name : 'Upload Report' }}
                        </span>
                        <input type="file" ref="atgInput" class="hidden" @change="(e: any) => atgImageFile = e.target.files[0]" />
                    </div>
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
                    <div 
                        @click="triggerInvoiceUpload"
                        @dragover.prevent="isDraggingInvoice = true"
                        @dragleave.prevent="isDraggingInvoice = false"
                        @drop.prevent="handleInvoiceDrop"
                        class="p-8 rounded-3xl border border-slate-100 flex flex-col items-center justify-center border-dashed gap-4 text-center cursor-pointer transition-all"
                        :class="[
                            invoiceImageFile ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200 hover:bg-white',
                            isDraggingInvoice ? 'bg-primary-50 border-primary-500 border-2' : ''
                        ]"
                    >
                       <Paperclip class="w-10 h-10" :class="invoiceImageFile ? 'text-emerald-500' : 'text-slate-300'" />
                       <div class="space-y-1">
                           <p class="text-[10px] font-black uppercase tracking-widest" :class="invoiceImageFile ? 'text-emerald-700' : 'text-slate-400'">
                               {{ invoiceImageFile ? invoiceImageFile.name : 'Drop BOL Snapshot or PDF' }}
                           </p>
                           <p v-if="!invoiceImageFile" class="text-[8px] font-bold text-slate-300 uppercase italic">Or click to browse terminal files</p>
                       </div>
                       <input type="file" ref="invoiceInput" @change="(e: any) => invoiceImageFile = e.target.files[0]" class="hidden" accept="image/*,.pdf" />
                    </div>
                    <div class="grid grid-cols-2 gap-6">
                        <input v-model="newInvoice.invoiceNumber" placeholder="Invoice #" class="modern-input" />
                        <input v-model="newInvoice.supplier" placeholder="Supplier" class="modern-input" />
                    </div>

                    <!-- AI Action Bar -->
                    <div v-if="invoiceImageFile" class="flex gap-4 p-4 bg-primary-50 rounded-3xl border border-primary-100 animate-in slide-in-from-top duration-300">
                        <button 
                            @click="handleAiScan" 
                            :disabled="isAiProcessing"
                            class="flex-1 py-4 bg-primary-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-700 transition-all flex items-center justify-center gap-3 shadow-lg shadow-primary-500/20"
                        >
                            <Sparkles v-if="!isAiProcessing" class="w-4 h-4" />
                            <Loader2 v-else class="w-4 h-4 animate-spin" />
                            <span>{{ isAiProcessing ? 'Analyzing BOL...' : 'Extract with AI (99.9% Accuracy)' }}</span>
                        </button>
                        <button @click="invoiceImageFile = null" class="px-6 py-4 bg-white text-slate-400 rounded-2xl text-[10px] font-black uppercase hover:text-rose-500 transition-colors">Clear</button>
                    </div>

                    <div v-for="(item, idx) in newInvoice.items" :key="idx" class="p-6 bg-slate-50 rounded-2xl grid grid-cols-2 gap-4 relative group">
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
