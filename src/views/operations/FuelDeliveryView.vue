<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useFuelStore } from '../../stores/fuel';
import { useNotificationStore } from '../../stores/notifications';
import { 
  Truck, Save, Plus, Trash2, 
  Calculator, DollarSign, TrendingUp, BarChart3,
  Calendar, MapPin, Camera, Loader2
} from 'lucide-vue-next';
import { extractFuelInvoiceData } from '../../services/aiExtractionService';

const fuelStore = useFuelStore();
const notificationStore = useNotificationStore();

const selectedDate = ref(new Date().toISOString().split('T')[0]);
const eftDate = ref(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // Default to +2 days
const supplier = ref('Fuel Logistics Inc.');
const isSubmitting = ref(false);
const isScanning = ref(false);
const manifestFile = ref<HTMLInputElement | null>(null);

interface DeliveryItem {
    type: string;
    gallons: number;
    costPerGal: number;
    retailPerGal: number;
}

const items = ref<DeliveryItem[]>([
    { type: 'Regular', gallons: 0, costPerGal: 0, retailPerGal: 0 }
]);

onMounted(async () => {
    await fuelStore.fetchTankConfigs();
    await fuelStore.fetchDeliveries();
    await fuelStore.fetchLogs();
});

const addItem = () => {
    items.value.push({ type: 'Regular', gallons: 0, costPerGal: 0, retailPerGal: 0 });
};

const removeItem = (index: number) => {
    items.value.splice(index, 1);
};

const calculatedItems = computed(() => {
    return items.value.map(item => {
        const totalCost = item.gallons * item.costPerGal;
        const totalProfit = item.gallons * (item.retailPerGal - item.costPerGal);
        const profitMargin = item.retailPerGal > 0 
            ? ((item.retailPerGal - item.costPerGal) / item.retailPerGal) * 100 
            : 0;
            
        return {
            ...item,
            totalCost,
            totalProfit,
            profitMargin
        };
    });
});

const totals = computed(() => {
    return calculatedItems.value.reduce((acc, curr) => ({
        totalGallons: acc.totalGallons + curr.gallons,
        totalAmount: acc.totalAmount + curr.totalCost,
        totalProfit: acc.totalProfit + curr.totalProfit
    }), { totalGallons: 0, totalAmount: 0, totalProfit: 0 });
});

const submitDelivery = async () => {
    if (totals.value.totalGallons <= 0) {
        notificationStore.error('Please enter delivery amounts', 'Invalid Input');
        return;
    }

    isSubmitting.value = true;
    try {
        // 1. Save the delivery record
        await fuelStore.addDelivery({
            date: selectedDate.value as string,
            eftDate: eftDate.value as string,
            supplier: supplier.value,
            items: calculatedItems.value,
            totalGallons: totals.value.totalGallons,
            totalAmount: totals.value.totalAmount,
            totalProfit: totals.value.totalProfit,
            createdAt: new Date().toISOString()
        });

        // 2. Integration: Update the fuel_logs for the selected date to reflect in cylinders
        const existingLog = fuelStore.logs.find(l => l.date === selectedDate.value);
        if (existingLog) {
            const updatedEntries = [...existingLog.entries];
            calculatedItems.value.forEach(item => {
                const entry = updatedEntries.find(e => e.type === item.type);
                if (entry) {
                    entry.deliveryGal = (Number(entry.deliveryGal) || 0) + item.gallons;
                    // Auto-calculate book inventory and variance
                    entry.bookInv = (Number(entry.beginGal) || 0) + entry.deliveryGal - (Number(entry.soldGal) || 0);
                    entry.variance = entry.bookInv - (Number(entry.endInvAtg) || 0);
                }
            });

            await fuelStore.addLog({
                ...existingLog,
                entries: updatedEntries,
                updatedAt: new Date().toISOString()
            });
        } else {
            // Create a skeleton log if it doesn't exist so it shows in the cylinders
            const entries = fuelStore.tankConfigs.map(config => {
                const delivery = calculatedItems.value.find(i => i.type === config.type);
                const deliveryGal = delivery?.gallons || 0;
                return {
                    type: config.type,
                    inch: 0,
                    beginGal: 0,
                    deliveryGal,
                    soldGal: 0,
                    bookInv: deliveryGal,
                    endInvAtg: 0,
                    costPerGal: delivery?.costPerGal || 0,
                    variance: deliveryGal
                };
            });

            await fuelStore.addLog({
                date: selectedDate.value as string,
                entries,
                totalVariance: calculatedItems.value.reduce((acc, curr) => acc + curr.gallons, 0),
                updatedAt: new Date().toISOString()
            });
        }

        notificationStore.success('Fuel delivery recorded and inventory synced', 'Success');
        
        // Reset form
        items.value = [{ type: 'Regular', gallons: 0, costPerGal: 0, retailPerGal: 0 }];
    } catch (error) {
        notificationStore.error('Failed to record delivery', 'Error');
    } finally {
        isSubmitting.value = false;
    }
};

const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
    });
};

const triggerScan = () => manifestFile.value?.click();

const handleAiScan = async (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    isScanning.value = true;
    try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            notificationStore.error('Gemini API key not configured', 'Config Error');
            return;
        }

        const data = await extractFuelInvoiceData(apiKey, file);
        if (data) {
            supplier.value = data.supplier || supplier.value;
            selectedDate.value = data.date || selectedDate.value;
            
            // Map extracted items to our structure
            items.value = data.items.map(item => ({
                type: item.type,
                gallons: item.gallons,
                costPerGal: item.costPerGal,
                retailPerGal: 0 // Will be filled manually or from existing prices
            }));

            notificationStore.success('Manifest data extracted successfully', 'AI Ready');
        }
    } catch (error) {
        notificationStore.error('Could not interpret manifest BOL', 'Scan Failed');
    } finally {
        isScanning.value = false;
        if (manifestFile.value) manifestFile.value.value = '';
    }
};
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-10 pb-40">
    <!-- Header Section -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-8 animate-in fade-in slide-in-from-top-4 duration-700">
      <div>
        <div class="flex items-center gap-3 mb-4">
          <div class="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200">
            <Truck class="w-6 h-6" />
          </div>
          <div>
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Terminal Operations</span>
            <h1 class="text-4xl font-[1000] text-slate-900 uppercase italic tracking-tighter leading-none">Fuel Delivery <span class="text-indigo-600">Logger</span></h1>
          </div>
        </div>
        <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Record Shipments • Direct Inventory Integration • Margin Audit</p>
      </div>

      <div class="flex gap-4">
        <input type="file" ref="manifestFile" @change="handleAiScan" accept="image/*,.pdf" class="hidden" />
        <button @click="triggerScan" 
                :disabled="isScanning"
                class="bg-white px-8 py-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3 hover:bg-slate-50 transition-all group">
          <div class="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform">
            <Camera v-if="!isScanning" class="w-5 h-5" />
            <Loader2 v-else class="w-5 h-5 animate-spin" />
          </div>
          <div class="text-left">
            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Automated Flow</p>
            <p class="text-[13px] font-black text-slate-900 leading-none">Scan Manifest BOL</p>
          </div>
        </button>

        <div class="bg-white px-8 py-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-6">
          <div class="text-right">
            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Payload</p>
            <p class="text-2xl font-black text-slate-900 tracking-tighter">{{ totals.totalGallons.toLocaleString() }} <span class="text-sm opacity-40">GAL</span></p>
          </div>
          <div v-if="totals.totalAmount > 0" class="flex items-center gap-6">
            <div class="w-px h-10 bg-slate-100"></div>
            <div class="text-right">
              <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Value</p>
              <p class="text-2xl font-black text-slate-900 tracking-tighter">${{ totals.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-10">
      <!-- Main Entry Form -->
      <div class="lg:col-span-8 space-y-8 animate-in fade-in slide-in-from-left-4 duration-700 delay-100">
        <div class="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 opacity-50 z-0"></div>
          
          <div class="relative z-10">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10 pb-10 border-b border-slate-50 text-slate-900">
              <div class="space-y-3">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-2">
                  <Calendar class="w-3.5 h-3.5" /> Delivery Date
                </label>
                <input type="date" v-model="selectedDate" class="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-sm focus:ring-2 ring-indigo-500 transition-all" />
              </div>
              <div class="space-y-3">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-2">
                  <DollarSign class="w-3.5 h-3.5" /> EFT Draft Date
                </label>
                <input type="date" v-model="eftDate" class="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-sm focus:ring-2 ring-indigo-500 transition-all" />
              </div>
              <div class="space-y-3">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-2">
                  <MapPin class="w-3.5 h-3.5" /> Supplier / Terminal
                </label>
                <input type="text" v-model="supplier" class="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-sm focus:ring-2 ring-indigo-500 transition-all" placeholder="Enter supplier name..." />
              </div>
            </div>

            <div class="space-y-6">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-black text-slate-900 uppercase italic tracking-tighter">Manifest Items</h3>
                <button @click="addItem" class="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all">
                  <Plus class="w-3.5 h-3.5" /> Add Fuel Type
                </button>
              </div>

              <div v-for="(item, index) in items" :key="index" 
                   class="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-5 gap-4 p-6 bg-slate-50/50 rounded-3xl border border-slate-50 hover:border-indigo-100 hover:bg-white hover:shadow-lg transition-all group relative">
                
                <div class="flex flex-col gap-2">
                  <label class="text-[8px] font-black text-slate-300 uppercase tracking-widest ml-1">Dump / Type</label>
                  <select v-model="item.type" class="bg-white border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 ring-indigo-500 shadow-sm text-slate-900">
                    <option v-for="type in fuelStore.defaultFuelTypes" :key="type">{{ type }}</option>
                  </select>
                </div>

                <div class="flex flex-col gap-2">
                  <label class="text-[8px] font-black text-slate-300 uppercase tracking-widest ml-1">Gallons</label>
                  <input type="number" v-model.number="item.gallons" class="bg-white border-none rounded-xl px-4 py-3 text-xs font-black focus:ring-2 ring-indigo-500 shadow-sm text-slate-900" placeholder="0" />
                </div>

                <div class="flex flex-col gap-2">
                  <label class="text-[8px] font-black text-slate-300 uppercase tracking-widest ml-1">Cost / Gal</label>
                  <div class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-[10px]">$</span>
                    <input type="number" step="0.0001" v-model.number="item.costPerGal" class="w-full bg-white border-none rounded-xl pl-6 pr-4 py-3 text-xs font-black focus:ring-2 ring-indigo-500 shadow-sm text-slate-900" placeholder="0.0000" />
                  </div>
                </div>

                <div class="flex flex-col gap-2">
                  <label class="text-[8px] font-black text-slate-300 uppercase tracking-widest ml-1">Retail / Gal</label>
                  <div class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-[10px]">$</span>
                    <input type="number" step="0.001" v-model.number="item.retailPerGal" class="w-full bg-white border-none rounded-xl pl-6 pr-4 py-3 text-xs font-black focus:ring-2 ring-indigo-500 shadow-sm text-slate-900" placeholder="0.000" />
                  </div>
                </div>

                <div class="flex items-end justify-end">
                   <button v-if="items.length > 1" @click="removeItem(index)" class="p-3 text-slate-300 hover:text-rose-500 transition-colors">
                     <Trash2 class="w-5 h-5" />
                   </button>
                </div>

                <!-- Financial Mini-Pulse -->
                <div v-if="item.gallons > 0 && item.costPerGal > 0" class="col-span-full mt-4 flex items-center gap-6 px-4 py-3 bg-white/50 rounded-2xl border border-slate-50 animate-in fade-in zoom-in duration-300">
                  <div class="flex items-center gap-2">
                    <TrendingUp class="w-3.5 h-3.5 text-emerald-500" />
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Margin:</span>
                    <span class="text-[10px] font-black text-emerald-600">{{ (calculatedItems[index]?.profitMargin || 0).toFixed(1) }}%</span>
                  </div>
                  <div class="flex items-center gap-2 border-l border-slate-100 pl-6">
                    <BarChart3 class="w-3.5 h-3.5 text-indigo-500" />
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Load Profit:</span>
                    <span class="text-[10px] font-black text-indigo-600">${{ (calculatedItems[index]?.totalProfit || 0).toLocaleString(undefined, { maximumFractionDigits: 0 }) }}</span>
                  </div>
                  <div class="flex items-center gap-2 border-l border-slate-100 pl-6">
                    <DollarSign class="w-3.5 h-3.5 text-slate-400" />
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fuel Cost:</span>
                    <span class="text-[10px] font-black text-slate-900">${{ (calculatedItems[index]?.totalCost || 0).toLocaleString(undefined, { maximumFractionDigits: 0 }) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-12 flex justify-end">
              <button @click="submitDelivery" 
                      :disabled="isSubmitting"
                      class="px-12 py-5 bg-slate-900 text-white rounded-[2rem] font-[1000] uppercase italic tracking-[0.2em] text-xs hover:bg-black transition-all shadow-2xl shadow-slate-900/40 flex items-center gap-4 group">
                <template v-if="!isSubmitting">
                  <Save class="w-5 h-5 group-hover:scale-110 transition-transform" />
                  Commit Delivery Manifest
                </template>
                <template v-else>
                  <Loader2 class="w-5 h-5 animate-spin" />
                  Recording Data...
                </template>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Sidebar: Recent History & Intelligence -->
      <div class="lg:col-span-4 space-y-8 animate-in fade-in slide-in-from-right-4 duration-700 delay-200">
        <!-- Yield Analytics Card -->
        <div class="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden">
          <div class="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl"></div>
          <div class="relative z-10">
            <div class="flex items-center gap-3 mb-6">
              <Calculator class="w-5 h-5 text-indigo-400" />
              <h3 class="text-xs font-black uppercase tracking-widest text-indigo-300">Delivery Yield Pool</h3>
            </div>
            <p class="text-[9px] font-black text-white/50 uppercase tracking-[0.2em] mb-1">Maneuverable Profit recorded</p>
            <div class="text-5xl font-[1000] italic tracking-tighter leading-none mb-4">
              ${{ totals.totalProfit.toLocaleString(undefined, { maximumFractionDigits: 0 }) }}
            </div>
            <p class="text-[10px] font-bold text-indigo-200/60 leading-relaxed">
              Based on recent retail parity. This profit is realized over the life of the inventory pool.
            </p>
          </div>
        </div>

        <!-- Detailed Delivery Log -->
        <div class="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm overflow-hidden">
          <div class="flex items-center justify-between mb-8">
            <h3 class="text-sm font-black text-slate-900 uppercase italic tracking-tighter">Manifest Audit Trail</h3>
            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Master Logs</span>
          </div>

          <div class="space-y-6">
            <div v-for="delivery in fuelStore.deliveries" :key="delivery.id" class="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-50 hover:bg-white hover:shadow-xl transition-all group">
              <div class="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <Truck class="w-5 h-5 text-indigo-500" />
                  </div>
                  <div>
                    <p class="text-[10px] font-black text-slate-900 uppercase italic leading-none truncate w-40">{{ delivery.supplier }}</p>
                    <p class="text-[8px] font-black text-slate-400 mt-1 uppercase tracking-widest">Manifest ID: {{ delivery.id.substring(0,8) }}</p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Cost</p>
                  <p class="text-sm font-black text-slate-900 tabular-nums">${{ delivery.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 }) }}</p>
                </div>
              </div>

              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div class="space-y-1">
                  <p class="text-[7px] font-black text-slate-400 uppercase tracking-widest">Delivery Date</p>
                  <p class="text-[10px] font-bold text-slate-700">{{ formatDate(delivery.date) }}</p>
                </div>
                <div class="space-y-1">
                  <p class="text-[7px] font-black text-slate-400 uppercase tracking-widest">EFT Draft Date</p>
                  <p class="text-[10px] font-bold text-indigo-600">{{ delivery.eftDate ? formatDate(delivery.eftDate) : 'N/A' }}</p>
                </div>
                <div class="space-y-1">
                  <p class="text-[7px] font-black text-slate-400 uppercase tracking-widest">Total Volume</p>
                  <p class="text-[10px] font-bold text-slate-700">{{ delivery.totalGallons.toLocaleString() }} GAL</p>
                </div>
                <div class="space-y-1 text-right">
                  <p class="text-[7px] font-black text-slate-400 uppercase tracking-widest">Retail Profit</p>
                  <p class="text-[10px] font-black text-emerald-600">${{ delivery.totalProfit.toLocaleString(undefined, { maximumFractionDigits: 0 }) }}</p>
                </div>
              </div>

              <div class="pt-4 border-t border-slate-50">
                <div class="flex flex-wrap gap-2">
                   <div v-for="item in delivery.items" :key="item.type" class="px-3 py-1 bg-white rounded-lg border border-slate-100 flex items-center gap-2">
                     <span class="text-[8px] font-black text-slate-400 uppercase">{{ item.type }}:</span>
                     <span class="text-[9px] font-black text-slate-700">${{ item.retailPerGal.toFixed(3) }}</span>
                     <span class="text-[7px] font-bold text-emerald-500 italic">({{ item.profitMargin.toFixed(1) }}%)</span>
                   </div>
                </div>
              </div>
            </div>

            <div v-if="fuelStore.deliveries.length === 0" class="py-10 text-center text-slate-300 italic text-xs">
              No recent manifests recorded.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modern-input-small {
  @apply w-full bg-white border-none rounded-xl px-4 py-3 text-xs font-black focus:ring-2 ring-indigo-500 shadow-sm text-slate-900 outline-none;
}

input[type=number]::-webkit-inner-spin-button, 
input[type=number]::-webkit-outer-spin-button { 
  -webkit-appearance: none; 
  margin: 0; 
}

.no-spinner {
  -moz-appearance: textfield;
  appearance: textfield;
}

@keyframes wave {
  0% { transform: translateX(-100%) translateY(-50%); }
  100% { transform: translateX(100%) translateY(-50%); }
}

.animate-wave {
  animation: wave 3s infinite linear;
}
</style>
