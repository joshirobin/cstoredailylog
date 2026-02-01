<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useFuelStore } from '../../stores/fuel';
import { 
  ArrowUp, 
  ArrowDown, 
  MoreHorizontal, 
  Zap,
  Target,
  Info
} from 'lucide-vue-next';

const fuelStore = useFuelStore();

onMounted(async () => {
    await Promise.all([
        fuelStore.fetchCurrentPrices(),
        fuelStore.fetchCompetitorPrices()
    ]);
});

const myRegularPrice = computed(() => {
    return fuelStore.currentPrices.find(p => p.type === 'Regular')?.cashPrice || 0;
});

const myMargin = computed(() => {
    return fuelStore.currentPrices.find(p => p.type === 'Regular')?.margin || 0;
});

const competitorAvg = computed(() => {
    if (fuelStore.competitorPrices.length === 0) return myRegularPrice.value - 0.05;
    const regularPrices = fuelStore.competitorPrices.map(c => {
        const p = c.prices.find(price => price.type === 'Regular');
        return p ? p.price : null;
    }).filter(p => p !== null) as number[];
    
    if (regularPrices.length === 0) return myRegularPrice.value - 0.05;
    return regularPrices.reduce((a, b) => a + b, 0) / regularPrices.length;
});

const priceDiff = computed(() => myRegularPrice.value - competitorAvg.value);
</script>

<template>
  <div class="glass-panel p-6 relative overflow-hidden group border-slate-100 bg-white/70 backdrop-blur-md">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm">
          <Target class="w-5 h-5" />
        </div>
        <div>
          <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Fuel Price Watch</h3>
          <p class="text-sm font-bold text-slate-900 mt-0.5">Regular Unl (Cash)</p>
        </div>
      </div>
      <button class="p-2 text-slate-400 hover:text-slate-900 transition-colors">
        <MoreHorizontal class="w-5 h-5" />
      </button>
    </div>

    <!-- Main Price View -->
    <div class="flex items-end justify-between mb-8">
      <div>
        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Your Price</p>
        <div class="flex items-baseline gap-1">
          <span class="text-3xl font-black text-slate-900 tracking-tighter">${{ myRegularPrice.toFixed(2) }}</span>
          <span class="text-xs font-black text-slate-400">9/10</span>
        </div>
      </div>
      
      <div :class="priceDiff <= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'" 
           class="px-3 py-2 rounded-2xl flex items-center gap-1.5 transition-colors relative">
        <ArrowDown v-if="priceDiff <= 0" class="w-4 h-4" />
        <ArrowUp v-else class="w-4 h-4" />
        <span class="text-xs font-black tabular-nums">{{ Math.abs(priceDiff * 100).toFixed(1) }}¢</span>
        <span class="text-[8px] font-bold uppercase tracking-widest">vs Market</span>
        
        <!-- Pulsing Alert if too high -->
        <div v-if="priceDiff > 0.05" class="absolute -top-2 -right-2 flex h-4 w-4">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-4 w-4 bg-rose-500 border border-white"></span>
        </div>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-2 gap-3 mb-6">
        <div class="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col gap-1">
            <span class="text-[8px] font-black text-slate-400 uppercase tracking-[0.1em]">Target Margin</span>
            <div class="flex items-center justify-between">
                <span class="text-sm font-black text-slate-900">{{ Math.round(myMargin * 100) }}¢</span>
                <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-glow shadow-emerald-500/40"></div>
            </div>
        </div>
        <div class="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col gap-1">
            <span class="text-[8px] font-black text-slate-400 uppercase tracking-[0.1em]">Market Avg</span>
            <div class="flex items-center justify-between">
                <span class="text-sm font-black text-slate-900">${{ competitorAvg.toFixed(2) }}</span>
                <Info class="w-3 h-3 text-slate-300" />
            </div>
        </div>
    </div>

    <!-- Competitor Strip -->
    <div class="space-y-3">
        <div class="flex items-center justify-between">
            <h4 class="text-[9px] font-black text-slate-900 uppercase tracking-widest italic">Nearby Competitors</h4>
            <span class="text-[8px] font-bold text-primary-600 uppercase tracking-[0.1em]">Live Sync</span>
        </div>
        <div class="space-y-2">
            <div v-for="comp in fuelStore.competitorPrices.slice(0, 2)" :key="comp.id" class="flex items-center justify-between bg-white/50 p-2.5 rounded-xl border border-slate-50 transition-all hover:bg-white hover:shadow-sm">
                <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">{{ comp.competitorName[0] }}</div>
                    <span class="text-[10px] font-bold text-slate-700">{{ comp.competitorName }}</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-xs font-black text-slate-900">${{ (comp.prices.find(p => p.type === 'Regular')?.price || 0).toFixed(2) }}</span>
                    <span class="text-[9px] font-bold text-slate-300">{{ comp.distance }}</span>
                </div>
            </div>
            
            <!-- Fallback if no competitors yet -->
            <div v-if="fuelStore.competitorPrices.length === 0" class="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-dashed border-slate-200">
                <span class="text-[9px] font-bold text-slate-400 uppercase">Awaiting survey data...</span>
                <Zap class="w-3 h-3 text-slate-300 animate-pulse" />
            </div>
        </div>
    </div>

    <!-- Background Accent -->
    <div class="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl"></div>
  </div>
</template>

<style scoped>
.shadow-glow {
    box-shadow: 0 0 10px currentColor;
}
</style>
