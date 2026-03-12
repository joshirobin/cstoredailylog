<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useTobaccoStore, type TobaccoProduct } from '../../stores/tobacco';
import { 
    FileSpreadsheet, 
    ShieldCheck, 
    Zap, 
    History, 
    BarChart3, 
    Search,
    AlertCircle,
    CheckCircle2,
    Clock,
    Tag,
    ArrowUpRight,
    BrainCircuit
} from 'lucide-vue-next';

const tobaccoStore = useTobaccoStore();
const searchQuery = ref('');
const isGenerating = ref(false);

const isBlindCount = ref(false);
const blindCountIndex = ref(0);
const blindCountProducts = ref<TobaccoProduct[]>([]);
const blindCountInput = ref<number | null>(null);

const currentBlindCountProduct = computed(() => {
    if (blindCountIndex.value < blindCountProducts.value.length) {
        return blindCountProducts.value[blindCountIndex.value];
    }
    return null;
});

const startBlindCount = () => {
    // Shuffle and pick 3 products for random audit
    const shuffled = [...tobaccoStore.products].sort(() => 0.5 - Math.random());
    blindCountProducts.value = shuffled.slice(0, 3);
    blindCountIndex.value = 0;
    blindCountInput.value = null;
    isBlindCount.value = true;
};

const submitBlindCount = () => {
    if (blindCountInput.value === null) return;
    // Mock processing
    blindCountInput.value = null;
    blindCountIndex.value++;
};

const filteredProducts = computed(() => {
    if (!searchQuery.value) return tobaccoStore.products;
    const q = searchQuery.value.toLowerCase();
    return tobaccoStore.products.filter((p: TobaccoProduct) => 
        p.name.toLowerCase().includes(q) || 
        p.upc.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q)
    );
});

const handleGenerateFile = async (brand: string) => {
    isGenerating.value = true;
    try {
        await tobaccoStore.generateScanDataFile(brand);
    } catch (e) {
        alert("Failed to generate scan data file");
    } finally {
        isGenerating.value = false;
    }
};

const formatDate = (date: any) => {
    if (!date) return '';
    const d = date instanceof Date ? date : (date.toDate ? date.toDate() : new Date(date));
    return new Intl.DateTimeFormat('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(d);
};

onMounted(() => {
    tobaccoStore.fetchScanLogs();
});
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans">
    <!-- Sophisticated Header -->
    <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
            <div class="flex items-center gap-3 mb-2">
                <div class="px-2 py-0.5 bg-primary-100 text-primary-600 rounded text-[10px] font-black uppercase tracking-widest">Revenue Optimizer</div>
                <span class="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Scan Data v4.2</span>
            </div>
            <h1 class="text-5xl font-[1000] text-slate-900 uppercase italic tracking-tighter leading-none">
                Tobacco <span class="text-primary-600">Scan</span> Manager
            </h1>
            <p class="text-sm font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                <ShieldCheck class="w-4 h-4 text-emerald-500" /> 
                Certified for Altria & RJ Reynolds Digital Rebate Programs
            </p>
        </div>

        <div class="flex flex-wrap gap-3">
            <button 
                @click="startBlindCount"
                class="flex items-center gap-3 px-6 py-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-100 transition-all shadow-sm"
            >
                <BrainCircuit class="w-4 h-4 text-emerald-500" />
                AI Blind Count
            </button>
            <button 
                @click="handleGenerateFile('Altria')"
                :disabled="isGenerating"
                class="flex items-center gap-3 px-6 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all shadow-sm"
            >
                <FileSpreadsheet class="w-4 h-4 text-blue-500" />
                Altria Export
            </button>
            <button 
                @click="handleGenerateFile('RJ Reynolds')"
                :disabled="isGenerating"
                class="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-900/20 disabled:opacity-50"
            >
                <Zap v-if="!isGenerating" class="w-4 h-4 text-yellow-400" />
                <span v-else class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Transmit All Data
            </button>
        </div>
    </div>

    <!-- Analytics Dashboard -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 font-display">
        <div class="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-24 h-24 bg-primary-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
            <div class="relative z-10">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Weekly Rebate</p>
                <h3 class="text-3xl font-black text-slate-900 font-mono italic tracking-tighter tabular-nums">${{ tobaccoStore.stats.estimatedRebate.toFixed(2) }}</h3>
                <div class="flex items-center gap-1.5 mt-2 text-emerald-500">
                    <ArrowUpRight class="w-3.5 h-3.5" />
                    <span class="text-[10px] font-black uppercase tracking-widest">+12.4% vs LY</span>
                </div>
            </div>
        </div>

        <div class="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
            <div class="relative z-10">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Packs Scanned</p>
                <h3 class="text-3xl font-black text-slate-900 font-mono italic tracking-tighter tabular-nums">{{ tobaccoStore.stats.totalPacksThisWeek }}</h3>
                <div class="flex items-center gap-1.5 mt-2 text-blue-500">
                    <BarChart3 class="w-3.5 h-3.5" />
                    <span class="text-[10px] font-black uppercase tracking-widest">Active Velocity</span>
                </div>
            </div>
        </div>

        <div class="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
            <div class="relative z-10">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Compliance Rate</p>
                <h3 class="text-3xl font-black text-slate-900 font-mono italic tracking-tighter tabular-nums">{{ tobaccoStore.stats.complianceRate }}%</h3>
                <div class="flex items-center gap-1.5 mt-2 text-emerald-500">
                    <CheckCircle2 class="w-3.5 h-3.5" />
                    <span class="text-[10px] font-black uppercase tracking-widest">Audit Ready</span>
                </div>
            </div>
        </div>

        <div class="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
            <div class="relative z-10">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pending Sync</p>
                <h3 class="text-3xl font-black text-slate-900 font-mono italic tracking-tighter tabular-nums">{{ tobaccoStore.stats.pendingTransmissions }}</h3>
                <div class="flex items-center gap-1.5 mt-2 text-rose-500">
                    <Clock class="w-3.5 h-3.5" />
                    <span class="text-[10px] font-black uppercase tracking-widest">Requires Action</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <!-- Products & Search -->
        <div class="lg:col-span-8 space-y-6">
            <div class="flex items-center justify-between">
                <h3 class="text-xs font-black text-slate-900 uppercase tracking-[0.3em] flex items-center gap-3">
                    <Tag class="w-4 h-4 text-primary-500" /> Eligible Product Catalog
                </h3>
                <div class="relative">
                    <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        v-model="searchQuery" 
                        placeholder="Search UPC or Brand..." 
                        class="bg-white border border-slate-100 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold uppercase tracking-widest focus:ring-2 ring-primary-500/20 transition-all outline-none"
                    />
                </div>
            </div>

            <div class="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr class="bg-slate-50/50">
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Intelligence</th>
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Manufacturer</th>
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Price</th>
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Rebate State</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            <tr v-for="product in filteredProducts" :key="product.id" class="group hover:bg-slate-50/50 transition-colors">
                                <td class="px-8 py-6">
                                    <div class="flex items-center gap-4">
                                        <div class="w-12 h-12 rounded-xl bg-slate-100 flex flex-col items-center justify-center font-mono text-[8px] font-bold text-slate-400">
                                            <div class="w-6 h-0.5 bg-slate-300 mb-0.5"></div>
                                            <div class="w-6 h-0.5 bg-slate-300 mb-0.5"></div>
                                            <div class="w-6 h-0.5 bg-slate-300"></div>
                                            UPC
                                        </div>
                                        <div>
                                            <p class="font-black text-slate-900 uppercase tracking-tight text-sm">{{ product.name }}</p>
                                            <p class="text-[10px] font-mono font-bold text-slate-400 tracking-widest">{{ product.upc }}</p>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-8 py-6">
                                    <span :class="[
                                        'px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border',
                                        product.brand === 'Altria' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                                        product.brand === 'RJ Reynolds' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-600 border-slate-100'
                                    ]">
                                        {{ product.brand }}
                                    </span>
                                </td>
                                <td class="px-8 py-6">
                                    <span class="font-mono font-black text-slate-900 tabular-nums">${{ product.price.toFixed(2) }}</span>
                                </td>
                                <td class="px-8 py-6 text-right">
                                    <div v-if="product.eligibleForRebate" class="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                                        <div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                        <span class="text-[10px] font-black uppercase tracking-widest">Active Eligibility</span>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div v-if="filteredProducts.length === 0" class="py-20 text-center">
                    <Search class="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p class="text-lg font-black text-slate-300 uppercase italic tracking-tighter">No vectors found</p>
                </div>
            </div>
        </div>

        <!-- Side Panels -->
        <div class="lg:col-span-4 space-y-8">
            <!-- Active Promotions -->
            <div class="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[3rem] p-8 text-white relative overflow-hidden shadow-xl">
                 <div class="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                 <h3 class="text-xs font-black uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                    <Tag class="w-4 h-4 text-indigo-400" /> Active Promotions
                 </h3>

                 <div class="space-y-4 relative z-10">
                    <div v-for="promo in tobaccoStore.promotions" :key="promo.id" class="bg-white/10 backdrop-blur-md rounded-[2rem] p-6 border border-white/10 hover:bg-white/15 transition-all group">
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <p class="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">{{ promo.brand }}</p>
                                <p class="font-black uppercase italic tracking-tighter text-lg leading-tight">{{ promo.name }}</p>
                            </div>
                            <div class="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-xl text-[10px] font-black border border-emerald-500/30">
                                ACTIVE
                            </div>
                        </div>
                        <div class="flex items-center justify-between pt-4 border-t border-white/10">
                            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{{ promo.requirement }}</span>
                            <span class="text-xl font-black text-emerald-400 font-mono">-${{ promo.discountAmount.toFixed(2) }}</span>
                        </div>
                    </div>
                 </div>
            </div>

            <!-- Transmission History -->
            <div class="space-y-4 font-display">
                <h3 class="text-xs font-black text-slate-900 uppercase tracking-[0.3em] flex items-center gap-3 px-2">
                    <History class="w-4 h-4 text-primary-500" /> Transmission Log
                </h3>
                
                <div class="space-y-3">
                    <div v-for="log in tobaccoStore.scanLogs" :key="log.id" class="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                        <div class="flex items-center gap-4">
                            <div :class="[
                                'w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110',
                                log.status === 'Transmitted' ? 'bg-emerald-50 text-emerald-500' : 
                                log.status === 'Pending' ? 'bg-amber-50 text-amber-500' : 'bg-rose-50 text-rose-500'
                            ]">
                                <CheckCircle2 v-if="log.status === 'Transmitted'" class="w-6 h-6" />
                                <Clock v-else-if="log.status === 'Pending'" class="w-6 h-6" />
                                <AlertCircle v-else class="w-6 h-6" />
                            </div>
                            <div>
                                <div class="flex items-center gap-2">
                                    <p class="text-[10px] font-black text-slate-900 uppercase tracking-widest">{{ log.status }}</p>
                                    <span class="text-[8px] font-black text-slate-300 uppercase tracking-widest">• ID: {{ log.id }}</span>
                                </div>
                                <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{{ formatDate(log.timestamp) }}</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="text-sm font-black text-slate-900 font-mono tracking-tighter tabular-nums">${{ log.totalRebate.toFixed(2) }}</p>
                            <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{{ log.totalPacks }} Packs</p>
                        </div>
                    </div>
                </div>

                <button class="w-full py-4 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] hover:bg-slate-100 hover:text-slate-600 transition-all">
                    View Full Transmission Audit
                </button>
            </div>
        </div>
    </div>
    <!-- AI Blind Count Modal -->
    <div v-if="isBlindCount" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
            <div class="absolute top-0 right-0 w-48 h-48 bg-emerald-50 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <div class="relative z-10">
                <h2 class="text-3xl font-[1000] text-slate-900 uppercase italic tracking-tighter leading-none mb-2">AI Blind Audit</h2>
                <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-2">
                    <BrainCircuit class="w-4 h-4 text-emerald-500" /> System-Directed Variance Check
                </p>
                
                <div v-if="currentBlindCountProduct">
                    <div class="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 mb-6 text-center shadow-inner">
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Please count the following item:</p>
                        <h3 class="text-2xl font-black text-slate-900 tracking-tight">{{ currentBlindCountProduct.name }}</h3>
                        <p class="text-xs font-mono font-bold text-slate-400 mt-2">{{ currentBlindCountProduct.upc }}</p>
                    </div>
                    
                    <div class="relative mb-8">
                        <input 
                            type="number" 
                            v-model="blindCountInput" 
                            @keyup.enter="submitBlindCount"
                            class="w-full h-24 bg-white border-2 border-slate-100 rounded-[2rem] text-center text-4xl font-black tabular-nums tracking-tighter focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all outline-none shadow-sm"
                            placeholder="0"
                            autofocus
                        />
                    </div>
                    
                    <button 
                        @click="submitBlindCount"
                        class="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-900/20 hover:-translate-y-1"
                    >
                        Submit Count
                    </button>
                </div>
                
                <div v-else class="text-center py-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div class="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
                        <CheckCircle2 class="w-12 h-12" />
                    </div>
                    <h3 class="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">Audit Complete</h3>
                    <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-8">Variances logged for manager review</p>
                    <button 
                        @click="isBlindCount = false"
                        class="px-8 py-4 bg-slate-100 text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all hover:scale-105"
                    >
                        Close Audit
                    </button>
                </div>
            </div>
            
            <!-- Close button if needed -->
            <button v-if="currentBlindCountProduct" @click="isBlindCount = false" class="absolute top-6 right-6 p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all z-20">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        </div>
    </div>
  </div>
</template>

<style scoped>
.font-mono {
    font-family: 'JetBrains Mono', monospace;
}
</style>
