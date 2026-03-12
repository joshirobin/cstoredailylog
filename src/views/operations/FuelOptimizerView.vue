<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useFuelStore, type TankConfig } from '../../stores/fuel';
import { useAuthStore } from '../../stores/auth';
import { 
  Truck, AlertTriangle, 
  Gauge, 
  Calculator, Fuel, Plus, XCircle, Settings2
} from 'lucide-vue-next';

const fuelStore = useFuelStore();
const authStore = useAuthStore();

const showConfigModal = ref(false);
const editingTank = ref<Partial<TankConfig>>({
    type: 'Regular',
    capacity: 10000,
    reorderPoint: 2000,
    shutoffPoint: 300
});

onMounted(() => {
    fuelStore.fetchLogs();
    fuelStore.fetchCurrentPrices();
    fuelStore.fetchTankConfigs();
});

const handleSaveConfig = async () => {
    try {
        await fuelStore.saveTankConfig(editingTank.value as TankConfig);
        showConfigModal.value = false;
        alert('Tank Configuration Updated');
    } catch (error) {
        alert('Failed to save configuration');
    }
};

const openConfig = (tank?: TankConfig) => {
    if (tank) {
        editingTank.value = { ...tank };
    } else {
        editingTank.value = {
            type: 'Regular',
            capacity: 10000,
            reorderPoint: 2000,
            shutoffPoint: 300
        };
    }
    showConfigModal.value = true;
};

const optimizerData = computed(() => {
    return fuelStore.tankConfigs.map(config => {
        const status = fuelStore.getLogisticsStatus(config.type);
        if (!status) return null;

        const maxSafeFill = Math.floor(config.capacity * 0.90);
        const availableSpace = maxSafeFill - status.currentGallons;
        
        // Innovation: Optimized Order Size (Rounding to standard transport compartments: 2500, 3000, 4500)
        const suggestedOrder = availableSpace > 2500 ? Math.floor(availableSpace / 500) * 500 : 0;

        return {
            ...config,
            ...status,
            maxSafeFill,
            availableSpace,
            suggestedOrder,
            fillPercentage: (status.currentGallons / config.capacity) * 100
        };
    }).filter((t): t is NonNullable<typeof t> => t !== null);
});

const totalOptimizedOrder = computed(() => {
    return optimizerData.value?.reduce((acc, curr) => acc + (curr?.suggestedOrder || 0), 0) || 0;
});

const getStatusColor = (percent: number) => {
    if (percent < 20) return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
    if (percent < 40) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
};
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-8 pb-32">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
            <div class="flex items-center gap-3 mb-2">
                <Gauge class="w-5 h-5 text-indigo-500 animate-pulse" />
                <span class="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Logistics Intelligence</span>
            </div>
            <h1 class="text-5xl font-[1000] text-slate-900 uppercase italic tracking-tighter leading-none">
                Ullage <span class="text-indigo-600">Optimizer</span>
            </h1>
            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Prevent Overfills • Maximize Delivery Efficiency</p>
        </div>

        <div class="bg-white px-8 py-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-6">
            <div class="text-right">
                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Suggested Total Load</p>
                <p class="text-2xl font-black text-slate-900 tracking-tighter">{{ totalOptimizedOrder.toLocaleString() }} <span class="text-sm">GAL</span></p>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                <Truck class="w-6 h-6" />
            </div>
        </div>
    </div>

    <!-- Strategy Card -->
    <div class="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
        <div class="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px]"></div>
        <div class="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
            <div class="max-w-2xl">
                <h2 class="text-3xl font-black uppercase italic tracking-tighter mb-4">The 90% Safe-Fill Protocol</h2>
                <p class="text-indigo-100/70 text-sm font-medium leading-relaxed">
                    Our AI calculates "Ullage" based on a strict 90% capacity limit to prevent hazardous overfills. 
                    Recommended order sizes are rounded to standard tanker compartments (500 gal increments) to minimize freight costs and transport dead-head.
                </p>
            </div>
            <div class="flex gap-4">
                <div class="bg-white/10 backdrop-blur-md p-6 rounded-[2rem] border border-white/10 text-center min-w-[160px]">
                    <p class="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1">Active Tanks</p>
                    <p class="text-3xl font-black">{{ optimizerData.length }}</p>
                </div>
                <div class="bg-emerald-500/20 backdrop-blur-md p-6 rounded-[2rem] border border-emerald-500/20 text-center min-w-[160px]">
                    <p class="text-[9px] font-black text-emerald-300 uppercase tracking-widest mb-1">Risk Level</p>
                    <p class="text-3xl font-black uppercase italic tracking-tighter">Low</p>
                </div>
            </div>
        </div>
    </div>

    <!-- Optimization Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div v-for="tank in optimizerData" :key="tank.type" 
             class="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
            
            <div class="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Fuel class="w-24 h-24" />
            </div>

            <div class="relative z-10">
                <div class="flex items-start justify-between mb-8">
                    <div>
                        <h3 class="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-1">{{ tank.type }}</h3>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Capacity: {{ tank.capacity }} gal</p>
                    </div>
                    <div :class="['px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border', getStatusColor(tank.fillPercentage)]">
                        {{ Math.floor(tank.fillPercentage) }}% Full
                    </div>
                    
                    <button v-if="authStore.userRole === 'Admin'" 
                            @click="openConfig(tank)"
                            class="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-indigo-600 transition-colors">
                        <Settings2 class="w-4 h-4" />
                    </button>
                </div>

                <div class="space-y-6">
                    <!-- Current Level Visual -->
                    <div class="h-4 bg-slate-100 rounded-full overflow-hidden">
                        <div class="h-full bg-indigo-600 transition-all duration-1000" :style="{ width: tank.fillPercentage + '%' }"></div>
                    </div>

                    <!-- Metrics Grid -->
                    <div class="grid grid-cols-2 gap-4">
                        <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Current</p>
                            <p class="text-xl font-black text-slate-900 tracking-tighter">{{ tank.currentGallons.toLocaleString() }} <span class="text-[10px]">gal</span></p>
                        </div>
                        <div class="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                            <p class="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Ullage (90%)</p>
                            <p class="text-xl font-black text-indigo-600 tracking-tighter">{{ tank.availableSpace.toLocaleString() }} <span class="text-[10px]">gal</span></p>
                        </div>
                    </div>

                    <!-- Order Recommendation -->
                    <div v-if="tank.suggestedOrder > 0" class="bg-slate-900 rounded-2xl p-6 text-white scale-100 group-hover:scale-[1.02] transition-transform">
                        <div class="flex items-center gap-3 mb-2">
                            <Calculator class="w-4 h-4 text-indigo-400" />
                            <p class="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-300">Optimized Order</p>
                        </div>
                        <p class="text-3xl font-black tracking-tighter italic leading-none">{{ tank.suggestedOrder.toLocaleString() }} <span class="text-sm not-italic opacity-60">GAL</span></p>
                        <p class="text-[10px] font-bold text-white/50 mt-2">Rounding to load compatibility</p>
                    </div>

                    <div v-if="tank.isCritical" class="flex items-center gap-3 p-4 bg-rose-50 rounded-2xl border border-rose-100 text-rose-600">
                        <AlertTriangle class="w-5 h-5 flex-shrink-0 animate-bounce" />
                        <p class="text-[10px] font-black uppercase tracking-widest leading-tight">Critical Reorder threshold reached. Order now to avoid shutoff in {{ tank.hoursToShutoff }}h.</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Add Tank Placeholder -->
        <button v-if="authStore.userRole === 'Admin'"
                @click="openConfig()"
                class="bg-slate-50 border-4 border-dashed border-slate-200 rounded-[3rem] p-8 flex flex-col items-center justify-center text-slate-300 hover:text-indigo-500 hover:border-indigo-200 transition-all group">
            <div class="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                <Plus class="w-8 h-8" />
            </div>
            <p class="text-xs font-black uppercase tracking-[0.3em]">Provision New Tank</p>
        </button>
    </div>

    <!-- Admin Tank Config Modal -->
    <div v-if="showConfigModal" class="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
        <div class="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-12 duration-500">
            <div class="p-10">
                <div class="flex items-center justify-between mb-8">
                    <div>
                        <span class="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em]">Administration</span>
                        <h3 class="text-3xl font-[1000] text-slate-900 uppercase italic tracking-tighter">Tank Configuration</h3>
                    </div>
                    <button @click="showConfigModal = false" class="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-rose-500 transition-all">
                        <XCircle class="w-6 h-6" />
                    </button>
                </div>

                <div class="space-y-6">
                    <div class="grid grid-cols-2 gap-6">
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Fuel Type</label>
                            <select v-model="editingTank.type" class="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 ring-indigo-500 transition-all">
                                <option v-for="type in fuelStore.defaultFuelTypes" :key="type">{{ type }}</option>
                            </select>
                        </div>
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Total Capacity (GAL)</label>
                            <input type="number" v-model="editingTank.capacity" class="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 ring-indigo-500 transition-all" />
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-6">
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Reorder Point (GAL)</label>
                            <input type="number" v-model="editingTank.reorderPoint" class="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 ring-indigo-500 transition-all" />
                        </div>
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Shutoff Point (GAL)</label>
                            <input type="number" v-model="editingTank.shutoffPoint" class="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 ring-indigo-500 transition-all" />
                        </div>
                    </div>

                    <p class="text-[9px] font-bold text-slate-400 uppercase leading-relaxed text-center px-10">
                        Configuring these parameters affects the automated logistics intelligence and ullage safety calculations for the entire facility.
                    </p>
                </div>

                <div class="mt-10 flex gap-4">
                    <button @click="showConfigModal = false" class="flex-1 bg-slate-50 text-slate-400 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-100 transition-all">
                        Cancel
                    </button>
                    <button @click="handleSaveConfig" class="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200">
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>
