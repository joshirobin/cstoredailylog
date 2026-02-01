<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { usePricingStore, MAJOR_BRANDS } from '../../stores/pricing';
import { useAuthStore } from '../../stores/auth';
import { useLocationsStore } from '../../stores/locations';
import { 
  Plus, MapPin, 
  X,
  Search, Filter, Radar, Info,
  Navigation, Brain, ChevronUp, ChevronDown
} from 'lucide-vue-next';

const pricingStore = usePricingStore();
const authStore = useAuthStore();
const locationsStore = useLocationsStore();

const scanRadius = ref(45);
const selectedBrand = ref('All Brands');
const zipFilter = ref('');

const isLogging = ref(false);
const newLog = ref({
    stationName: '',
    brand: 'Local',
    distance: 0,
    zipCode: '',
    prices: [
        { fuelType: 'Regular', price: 0 },
        { fuelType: 'Diesel', price: 0 }
    ],
    loggedBy: authStore.user?.email?.split('@')[0] || 'Unknown'
});

const filteredCompetitors = computed(() => {
    const query = zipFilter.value.toLowerCase().trim();
    return pricingStore.competitorPrices.filter(c => {
        const matchesBrand = selectedBrand.value === 'All Brands' || (c.brand === selectedBrand.value);
        const matchesRadius = (c.distance || 0) <= scanRadius.value;
        const targetZip = String(c.zipCode || '').toLowerCase();
        const targetName = String(c.stationName || '').toLowerCase();
        const matchesSearch = !query || targetZip.includes(query) || targetName.includes(query);
        return matchesBrand && matchesRadius && matchesSearch;
    });
});

const ownPrices = [
    { type: 'Regular', current: 3.49, suggested: 3.45, change: -0.04 },
    { type: 'Plus', current: 3.79, suggested: 3.79, change: 0 },
    { type: 'Premium', current: 3.99, suggested: 3.95, change: -0.04 },
    { type: 'Diesel', current: 4.19, suggested: 4.25, change: +0.06 }
];

const handleScan = async () => {
    await pricingStore.scanPerimeter(scanRadius.value);
};

const handleSubmit = async () => {
    try {
        await pricingStore.logCompetitorPrice({
            ...newLog.value,
            distance: Number(newLog.value.distance) || 0,
            distanceStr: `${newLog.value.distance} miles`
        } as any);
        isLogging.value = false;
        newLog.value = {
            stationName: '',
            brand: 'Local',
            distance: 0,
            zipCode: '',
            prices: [
                { fuelType: 'Regular', price: 0 },
                { fuelType: 'Diesel', price: 0 }
            ],
            loggedBy: authStore.user?.email?.split('@')[0] || 'Unknown'
        };
    } catch (e) {
        alert("Failed to log price");
    }
};

const formatDate = (date: any) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric'
    }).format(d);
};

onMounted(() => pricingStore.fetchCompetitorPrices());

watch(() => locationsStore.activeLocationId, () => {
    pricingStore.fetchCompetitorPrices();
});
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-8 pb-32">
    <!-- Sophisticated Header -->
    <div class="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
            <div class="flex items-center gap-3 mb-2">
                <Radar class="w-5 h-5 text-primary-500 animate-pulse" />
                <span class="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Integrated Intelligence</span>
            </div>
            <h1 class="text-5xl font-[1000] text-slate-900 uppercase italic tracking-tighter leading-none">
                Fuel <span class="text-primary-600">Perimeter</span> Watch
            </h1>
            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Active Radius: {{ scanRadius }} Miles Around {{ locationsStore.activeLocation?.name || 'Store' }}</p>
        </div>

        <div class="flex flex-wrap gap-3">
            <button 
                @click="isLogging = true"
                class="flex items-center gap-3 px-6 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all shadow-sm"
            >
                <Plus class="w-4 h-4" />
                Manual Survey
            </button>
            <button 
                @click="handleScan"
                :disabled="pricingStore.loading"
                class="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-900/20 disabled:opacity-50"
            >
                <Radar v-if="!pricingStore.loading" class="w-4 h-4" />
                <span v-else class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Scan 45mi Perimeter
            </button>
        </div>
    </div>

    <!-- AI Insights Banner -->
    <div class="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
        <!-- Abstract Decoration -->
        <div class="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-[100px]"></div>
        <div class="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]"></div>

        <div class="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
            <div class="flex items-center gap-8">
                <div class="w-20 h-20 rounded-[2rem] bg-white/5 backdrop-blur-xl flex items-center justify-center border border-white/10 shadow-inner">
                    <Brain class="w-10 h-10 text-primary-400" />
                </div>
                <div>
                   <h3 class="text-3xl font-black uppercase italic tracking-tighter leading-none mb-2">Market Velocity Matrix</h3>
                   <div class="flex items-center gap-2 text-primary-300">
                       <Info class="w-4 h-4" />
                       <p class="text-[10px] font-black uppercase tracking-widest opacity-80">AI Suggestion Engine active for 45mi radius</p>
                   </div>
                </div>
            </div>
            
            <div class="flex flex-wrap gap-4">
                <div v-for="p in ownPrices" :key="p.type" class="bg-white/5 backdrop-blur-md px-8 py-4 rounded-3xl border border-white/10 text-center min-w-[140px] hover:bg-white/10 transition-colors">
                    <p class="text-[9px] font-black uppercase tracking-widest mb-1 text-slate-400">{{ p.type }}</p>
                    <div class="flex items-center justify-center gap-3">
                        <span class="text-2xl font-black tracking-tighter">${{ p.suggested }}</span>
                        <div v-if="p.change !== 0" :class="['flex items-center text-[10px] font-black px-2 py-0.5 rounded-lg shadow-sm', p.change < 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400']">
                            <component :is="p.change < 0 ? ChevronDown : ChevronUp" class="w-3 h-3" />
                            {{ Math.abs(p.change).toFixed(2) }}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Main Radar & Matrix -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <!-- Controls & Filters Sidebar -->
        <div class="lg:col-span-4 space-y-6">
            <div class="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm space-y-8 sticky top-6">
                <h3 class="text-xs font-black text-slate-900 uppercase tracking-[0.3em] flex items-center gap-3 underline decoration-primary-500 decoration-4 underline-offset-8">
                    <Filter class="w-4 h-4" /> Radar Calibration
                </h3>

                <!-- Radius Slider -->
                <div class="space-y-4">
                    <div class="flex justify-between items-end">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Search Radius</label>
                        <span class="text-xl font-black text-primary-600">{{ scanRadius }}mi</span>
                    </div>
                    <input type="range" v-model.number="scanRadius" min="1" max="100" class="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary-600" />
                    <div class="flex justify-between text-[8px] font-black text-slate-300 uppercase tracking-widest">
                        <span>Local (1mi)</span>
                        <span>Extended (100mi)</span>
                    </div>
                </div>

                <!-- Brand Filter -->
                <div class="space-y-4">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Competitive Brand</label>
                    <select v-model="selectedBrand" class="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 ring-primary-500 transition-all outline-none">
                        <option>All Brands</option>
                        <option v-for="brand in MAJOR_BRANDS" :key="brand">{{ brand }}</option>
                    </select>
                </div>

                <!-- Zip/Search Filter -->
                <div class="space-y-4">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Locality / Station Search</label>
                    <div class="relative">
                        <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input v-model="zipFilter" placeholder="Search zip or station name..." class="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 ring-primary-500 transition-all outline-none" />
                    </div>
                </div>

                <!-- Deployment Action -->
                <div class="pt-8 border-t border-slate-50">
                    <button class="w-full py-5 bg-primary-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary-500/30 hover:bg-primary-700 hover:scale-[1.02] active:scale-[0.98] transition-all">
                        Deploy Matrix Pricing
                    </button>
                    <p class="text-[9px] font-bold text-slate-400 text-center mt-4 uppercase tracking-widest">Authorized by {{ authStore.user?.email }}</p>
                </div>
            </div>
        </div>

        <!-- Matrix List -->
        <div class="lg:col-span-8 space-y-8">
            <h3 class="text-xs font-black text-slate-900 uppercase tracking-[0.3em] flex items-center gap-3">
                <Navigation class="w-4 h-4 text-primary-500" /> Perimeter Intelligence Results 
                <span class="ml-auto text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{{ filteredCompetitors.length }} Stations Tracked</span>
            </h3>

            <!-- Manual Log Form Modal-like -->
            <div v-if="isLogging" class="bg-white rounded-[3rem] border-4 border-slate-900 p-10 animate-in zoom-in-95 duration-300 shadow-2xl sticky top-6 z-20">
               <div class="flex items-center justify-between mb-10">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                            <Plus class="w-6 h-6" />
                        </div>
                        <h3 class="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">New Field Survey</h3>
                    </div>
                    <button @click="isLogging = false" class="p-3 bg-slate-100 rounded-2xl text-slate-400 hover:text-slate-900 transition-colors"><X /></button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <div class="space-y-6">
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Station Identity</label>
                            <input v-model="newLog.stationName" class="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold" placeholder="e.g. Kwik Trip #45" />
                        </div>
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Brand Parent</label>
                            <select v-model="newLog.brand" class="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold">
                                <option v-for="b in MAJOR_BRANDS" :key="b">{{ b }}</option>
                                <option>Local</option>
                            </select>
                        </div>
                    </div>
                    <div class="space-y-6">
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Proximity (Miles)</label>
                            <input type="number" step="0.1" v-model.number="newLog.distance" class="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold" />
                        </div>
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Location Zip</label>
                            <input v-model="newLog.zipCode" class="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold" placeholder="Optional" />
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-6 mb-10">
                    <div v-for="(p, idx) in newLog.prices" :key="idx" class="space-y-2 bg-slate-50 p-6 rounded-[2rem]">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{{ p.fuelType }} Market Price</label>
                        <div class="relative mt-2">
                            <span class="absolute left-0 top-1/2 -translate-y-1/2 text-3xl font-black text-slate-300 italic">$</span>
                            <input type="number" step="0.01" v-model.number="p.price" class="w-full bg-transparent border-none p-0 pl-10 text-4xl font-black text-slate-900 tracking-tighter outline-none" />
                        </div>
                    </div>
                </div>

                <button @click="handleSubmit" class="w-full py-5 bg-primary-600 text-white rounded-[2rem] font-black uppercase text-sm tracking-[0.2em] shadow-xl shadow-primary-500/20 hover:bg-primary-700 transition-all">Ingest Survey Data</button>
            </div>

            <!-- List of Competitors -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div v-for="c in filteredCompetitors" :key="c.id" class="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-primary-100 transition-all group relative overflow-hidden">
                    <!-- Brand Highlight -->
                    <div class="absolute top-0 right-0 w-32 h-32 bg-slate-50/50 -mr-10 -mt-10 rounded-full group-hover:bg-primary-50/50 transition-colors"></div>
                    
                    <div class="relative z-10 flex flex-col h-full">
                        <div class="flex items-start justify-between mb-6">
                            <div class="flex items-center gap-4">
                                <div class="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xl italic shadow-lg shadow-slate-900/10">
                                    {{ (c.brand || c.stationName)[0] }}
                                </div>
                                <div>
                                    <p class="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-1 group-hover:text-primary-600 transition-colors">{{ c.stationName }}</p>
                                    <div class="flex flex-wrap items-center gap-2">
                                        <div class="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                                            <MapPin class="w-3 h-3 text-primary-500" />
                                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{{ c.distanceStr }}</p>
                                        </div>
                                        <div v-if="c.zipCode" class="flex items-center gap-1.5 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                                            <Navigation class="w-2.5 h-2.5 text-indigo-500" />
                                            <p class="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{{ c.zipCode }}</p>
                                        </div>
                                        <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest">• {{ c.brand }}</p>
                                    </div>
                                </div>
                            </div>
                            <span class="text-[8px] font-bold text-slate-300 uppercase tracking-widest">{{ formatDate(c.timestamp) }}</span>
                        </div>

                        <div class="mt-auto grid grid-cols-2 gap-4 pt-6 border-t border-slate-50">
                            <div v-for="p in c.prices" :key="p.fuelType" class="space-y-1">
                                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-70">{{ p.fuelType }}</p>
                                <p class="text-2xl font-black font-mono text-slate-900 tracking-tighter">${{ p.price }}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Empty State -->
                <div v-if="filteredCompetitors.length === 0" class="col-span-full py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                    <div class="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-6 text-slate-300">
                        <Radar class="w-10 h-10" />
                    </div>
                    <h3 class="text-xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">No Radar Signal</h3>
                    <p class="text-xs font-bold text-slate-400 uppercase tracking-widest max-w-xs mx-auto">Expand your scan radius or try searching for a specific brand/zip.</p>
                    <button @click="handleScan" class="mt-8 px-8 py-4 bg-primary-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest">Forced Discovery</button>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
.font-mono {
    font-family: 'JetBrains Mono', monospace;
}
</style>
