<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { 
  Sun, 
  Cloud, 
  CloudRain, 
  CloudSun, 
  CloudDrizzle, 
  Snowflake, 
  Zap,
  Wind,
  Droplets,
  Thermometer,
  Lightbulb
} from 'lucide-vue-next';
import { useLocationsStore } from '../../stores/locations';
import { fetchWeather, type WeatherData } from '../../services/weatherService';

const locationsStore = useLocationsStore();
const weather = ref<WeatherData | null>(null);
const loading = ref(true);

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'Sun': return Sun;
    case 'CloudSun': return CloudSun;
    case 'CloudRain': return CloudRain;
    case 'CloudDrizzle': return CloudDrizzle;
    case 'Snowflake': return Snowflake;
    case 'Zap': return Zap;
    default: return Cloud;
  }
};

const updateWeather = async () => {
  loading.value = true;
  const loc = locationsStore.activeLocation;
  
  // Default to Dallas, TX coordinates only if absolutely no location data
  const lat = Number(loc?.latitude) || 32.7767;
  const lon = Number(loc?.longitude) || -96.7970;
  
  // Ensure we have valid numbers before fetching
  if (isNaN(lat) || isNaN(lon) || (lat === 0 && lon === 0)) {
     console.warn('Invalid coordinates for location, using defaults.');
  }

  weather.value = await fetchWeather(lat, lon);
  loading.value = false;
};

// Initial load
onMounted(async () => {
  if (!locationsStore.activeLocationId) {
    await locationsStore.fetchLocations();
  }
  await updateWeather();
});

// React to location changes
watch(() => locationsStore.activeLocationId, async () => {
    await updateWeather();
});
</script>

<template>
  <div class="glass-panel overflow-hidden relative group transition-all duration-500 hover:shadow-2xl hover:shadow-primary-500/10 border-slate-100">
    <!-- Shimmer Loader -->
    <div v-if="loading" class="p-6 space-y-4 animate-pulse">
      <div class="flex justify-between">
        <div class="h-8 w-24 bg-slate-100 rounded-lg"></div>
        <div class="h-12 w-12 bg-slate-100 rounded-xl"></div>
      </div>
      <div class="h-10 w-48 bg-slate-100 rounded-lg"></div>
      <div class="space-y-2">
        <div class="h-4 w-full bg-slate-50 rounded"></div>
        <div class="h-4 w-2/3 bg-slate-50 rounded"></div>
      </div>
    </div>

    <template v-else-if="weather">
      <!-- Background Glow -->
      <div class="absolute -top-12 -right-12 w-32 h-32 bg-primary-100/30 rounded-full blur-3xl group-hover:bg-primary-200/40 transition-colors"></div>

      <div class="p-6 relative z-10">
        <!-- Header -->
        <div class="flex justify-between items-start mb-4">
          <div>
            <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Local Ops Weather</h3>
            <p class="text-sm font-bold text-slate-900 mt-0.5">{{ locationsStore.activeLocation?.city }}, {{ locationsStore.activeLocation?.state }}</p>
          </div>
          <div class="p-3 rounded-2xl bg-gradient-to-br from-white to-slate-50 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform duration-500">
            <component :is="getIcon(weather.icon)" class="w-6 h-6" :class="weather.isDay ? 'text-amber-500' : 'text-indigo-400'" />
          </div>
        </div>

        <!-- Main Temp -->
        <div class="flex items-baseline gap-2 mb-6">
          <span class="text-5xl font-black text-slate-900 tracking-tighter">{{ weather.temp }}°</span>
          <div class="flex flex-col">
            <span class="text-sm font-bold text-slate-900">{{ weather.condition }}</span>
            <span class="text-[10px] font-medium text-slate-400">{{ weather.description }}</span>
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-3 gap-2 mb-6">
          <div class="bg-slate-50/50 p-2 rounded-xl border border-slate-100/50 flex flex-col items-center">
            <Wind class="w-3.5 h-3.5 text-slate-400 mb-1" />
            <span class="text-[10px] font-black text-slate-900">{{ weather.windSpeed }}<span class="text-[8px] font-bold text-slate-400 ml-0.5">mph</span></span>
          </div>
          <div class="bg-slate-50/50 p-2 rounded-xl border border-slate-100/50 flex flex-col items-center">
            <Droplets class="w-3.5 h-3.5 text-slate-400 mb-1" />
            <span class="text-[10px] font-black text-slate-900">{{ weather.humidity }}<span class="text-[8px] font-bold text-slate-400 ml-0.5">%</span></span>
          </div>
          <div class="bg-slate-50/50 p-2 rounded-xl border border-slate-100/50 flex flex-col items-center">
            <Thermometer class="w-3.5 h-3.5 text-slate-400 mb-1" />
            <span class="text-[10px] font-black text-slate-900">{{ weather.precip }}<span class="text-[8px] font-bold text-slate-400 ml-0.5">in</span></span>
          </div>
        </div>

        <!-- Manager Insight -->
        <div class="p-4 rounded-2xl bg-primary-600/5 border border-primary-100 flex gap-3 group/insight hover:bg-primary-600/10 transition-colors">
          <div class="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white flex-shrink-0 group-hover/insight:scale-110 transition-transform">
            <Lightbulb class="w-4 h-4" />
          </div>
          <div>
            <span class="text-[9px] font-black text-primary-600 uppercase tracking-widest block mb-0.5">Ops Strategy</span>
            <p class="text-[11px] font-bold text-slate-700 leading-tight">{{ weather.insight }}</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.glass-panel {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
}
</style>
