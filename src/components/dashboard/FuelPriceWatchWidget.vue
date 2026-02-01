<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useFuelStore } from '../../stores/fuel';
import { usePricingStore } from '../../stores/pricing';
import { 
  ArrowUp, 
  ArrowDown, 
  MoreHorizontal, 
  Info,
  Radar
} from 'lucide-vue-next';

const fuelStore = useFuelStore();
const pricingStore = usePricingStore();

onMounted(async () => {
    await Promise.all([
        fuelStore.fetchCurrentPrices(),
        pricingStore.fetchCompetitorPrices()
    ]);
});

const myRegularPrice = computed(() => {
    return fuelStore.currentPrices.find(p => p.type === 'Regular')?.cashPrice || 0;
});

const myMargin = computed(() => {
    return fuelStore.currentPrices.find(p => p.type === 'Regular')?.margin || 0;
});

const perimeterCompetitors = computed(() => {
    // Limit to 45 miles as requested
    return pricingStore.competitorPrices.filter(c => (c.distance || 0) <= 45);
});

const competitorAvg = computed(() => {
    if (perimeterCompetitors.value.length === 0) return myRegularPrice.value - 0.05;
    const regularPrices = perimeterCompetitors.value.map(c => {
        const p = c.prices.find(price => price.fuelType === 'Regular' || price.fuelType === 'Regular Unl');
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
          <Radar class="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Perimeter Watch (45mi)</h3>
          <p class="text-sm font-bold text-slate-900 mt-0.5">Regular Market Analysis</p>
        </div>
      </div>
      <router-link to="/operations/competitor-watch" class="p-2 text-slate-400 hover:text-slate-900 transition-colors">
        <MoreHorizontal class="w-5 h-5" />
      </router-link>
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
        <span class="text-[8px] font-bold uppercase tracking-widest">vs Perimeter</span>
        
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
            <h4 class="text-[9px] font-black text-slate-900 uppercase tracking-widest italic font-bold">Nearby Major Brands</h4>
            <span class="text-[8px] font-bold text-primary-600 uppercase tracking-[0.1em]">Verified</span>
        </div>
        <div class="space-y-2">
            <div v-for="comp in perimeterCompetitors.slice(0, 3)" :key="comp.id" class="flex items-center justify-between bg-white/50 p-2.5 rounded-xl border border-slate-50 transition-all hover:bg-white hover:shadow-sm">
                <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-black font-italic shadow-sm">{{ (comp.brand || comp.stationName)[0] }}</div>
                    <span class="text-[10px] font-bold text-slate-700 truncate max-w-[100px]">{{ comp.stationName }}</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-xs font-black text-slate-900">${{ (comp.prices.find(p => p.fuelType === 'Regular' || p.fuelType === 'Regular Unl')?.price || 0).toFixed(2) }}</span>
                    <span class="text-[8px] font-bold text-slate-400">{{ comp.distance }}mi</span>
                </div>
            </div>
            
            <!-- Fallback if no competitors yet -->
            <div v-if="perimeterCompetitors.length === 0" class="flex flex-col items-center justify-center py-4 bg-slate-50 p-2.5 rounded-xl border border-dashed border-slate-200">
                <span class="text-[9px] font-bold text-slate-400 uppercase mb-2">Perimeter Scan Required</span>
                <button @click="pricingStore.scanPerimeter(45)" class="text-[8px] font-black bg-slate-900 text-white px-3 py-1 rounded-full uppercase tracking-tighter">Start Scan</button>
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
