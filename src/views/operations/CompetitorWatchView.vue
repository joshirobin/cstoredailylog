<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { usePricingStore } from '../../stores/pricing';
import { useAuthStore } from '../../stores/auth';
import { 
  Plus, MapPin, 
  X,
  Droplet, Target, ShieldCheck,
  ChevronUp, ChevronDown, Brain
} from 'lucide-vue-next';

const pricingStore = usePricingStore();
const authStore = useAuthStore();

const isLogging = ref(false);
const newLog = ref({
    stationName: '',
    distance: '0.2 miles',
    prices: [
        { fuelType: 'Regular', price: 0 },
        { fuelType: 'Diesel', price: 0 }
    ],
    loggedBy: authStore.user?.email?.split('@')[0] || 'Unknown'
});

const ownPrices = [
    { type: 'Regular', current: 3.49, suggested: 3.45, change: -0.04 },
    { type: 'Plus', current: 3.79, suggested: 3.79, change: 0 },
    { type: 'Premium', current: 3.99, suggested: 3.95, change: -0.04 },
    { type: 'Diesel', current: 4.19, suggested: 4.25, change: +0.06 }
];

const handleSubmit = async () => {
    try {
        await pricingStore.logCompetitorPrice(newLog.value);
        isLogging.value = false;
        newLog.value = {
            stationName: '',
            distance: '0.1 miles',
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
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-8 pb-20">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
            <h1 class="text-4xl font-[1000] text-slate-900 uppercase italic tracking-tighter leading-none mb-3">
                Pricing <span class="text-primary-600">Vector</span>
            </h1>
            <p class="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Competitor Intelligence • AI Price Suggestions</p>
        </div>

        <button 
            @click="isLogging = true"
            class="flex items-center gap-3 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
        >
            <Plus class="w-4 h-4" />
            Survey Competitor
        </button>
    </div>

    <!-- AI Insights Banner -->
    <div class="bg-gradient-to-r from-primary-600 to-indigo-700 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-primary-500/20">
        <div class="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div class="flex items-center gap-6">
                <div class="w-16 h-16 rounded-[1.5rem] bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                    <Brain class="w-8 h-8 text-primary-200" />
                </div>
                <div>
                   <h3 class="text-2xl font-black uppercase italic tracking-tighter leading-none mb-1">Market Position AI</h3>
                   <p class="text-xs font-bold text-primary-100 uppercase tracking-widest opacity-80 italic">Optimized margin suggestions based on 0.5mi radius survey</p>
                </div>
            </div>
            
            <div class="flex gap-4">
                <div v-for="p in ownPrices.slice(0, 2)" :key="p.type" class="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 text-center">
                    <p class="text-[8px] font-black uppercase tracking-widest mb-1 opacity-70">{{ p.type }}</p>
                    <div class="flex items-center gap-2">
                        <span class="text-xl font-black">${{ p.suggested }}</span>
                        <div :class="['flex items-center text-[10px] font-black px-1.5 py-0.5 rounded-lg', p.change < 0 ? 'bg-emerald-400/20 text-emerald-300' : p.change > 0 ? 'bg-rose-400/20 text-rose-300' : 'hidden']">
                            <component :is="p.change < 0 ? ChevronDown : ChevronUp" class="w-3 h-3" />
                            {{ Math.abs(p.change) }}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <!-- Decorative bg -->
        <div class="absolute -right-20 -top-20 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- Competitor List -->
        <div class="lg:col-span-8 space-y-6">
            <h3 class="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                <Droplet class="w-4 h-4" /> Local Market Matrix
            </h3>

            <!-- Entry Form -->
            <div v-if="isLogging" class="bg-white rounded-[2rem] border border-slate-900 border-2 p-8 animate-in slide-in-from-top-4 mb-8 shadow-xl">
               <div class="flex items-center justify-between mb-8">
                    <h3 class="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Manual Survey Log</h3>
                    <button @click="isLogging = false" class="text-slate-400 hover:text-slate-900"><X /></button>
                </div>

                <div class="space-y-6">
                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Station Name</label>
                            <input v-model="newLog.stationName" class="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold" placeholder="e.g. Shell, BP" />
                        </div>
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Distance</label>
                            <input v-model="newLog.distance" class="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold" />
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div v-for="(p, idx) in newLog.prices" :key="idx" class="space-y-2">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{{ p.fuelType }} Price</label>
                            <input type="number" step="0.01" v-model.number="p.price" class="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold" />
                        </div>
                    </div>

                    <button @click="handleSubmit" class="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase text-xs tracking-widest">Commit to Analytics</button>
                </div>
            </div>

            <div v-for="c in pricingStore.competitorPrices" :key="c.id" class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all group">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                            <MapPin class="w-5 h-5" />
                        </div>
                        <div>
                            <p class="text-lg font-black text-slate-900 uppercase italic tracking-tighter">{{ c.stationName }}</p>
                            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{ c.distance }} • {{ formatDate(c.timestamp) }}</p>
                        </div>
                    </div>
                </div>

                <div class="flex gap-4">
                    <div v-for="p in c.prices" :key="p.fuelType" class="flex-1 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{{ p.fuelType }}</p>
                        <p class="text-lg font-black text-slate-900">${{ p.price }}</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Margin Radar -->
        <div class="lg:col-span-4 space-y-6">
            <h3 class="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                <Target class="w-4 h-4" /> Internal Margin Radar
            </h3>

            <div class="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm">
                <div class="space-y-8">
                    <div v-for="p in ownPrices" :key="p.type" class="flex items-center justify-between">
                        <div>
                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{{ p.type }}</p>
                            <p class="text-xl font-mono font-black text-slate-900 leading-none">${{ p.current }}</p>
                        </div>
                        
                        <div class="text-right">
                           <p class="text-[9px] font-black text-primary-600 uppercase tracking-widest mb-1">Target</p>
                           <p class="text-sm font-black text-slate-400 leading-none italic">${{ p.suggested }}</p>
                        </div>
                    </div>
                </div>

                <div class="mt-8 pt-8 border-t border-slate-50 space-y-4">
                   <div class="flex items-center gap-3 text-xs font-bold text-slate-600 italic">
                       <ShieldCheck class="w-4 h-4 text-emerald-500" /> Authorized price changes will be broadcast to POS immediately.
                   </div>
                   <button class="w-full py-4 bg-primary-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-primary-500/20 hover:bg-primary-700 transition-all">
                       Deploy Suggested Pricing
                   </button>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>
