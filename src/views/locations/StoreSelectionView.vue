<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useLocationsStore } from '../../stores/locations';
import { Store, MapPin, Loader2, ArrowRight } from 'lucide-vue-next';
import logoUrl from '../../assets/logo.png';

const locationsStore = useLocationsStore();
const router = useRouter();

const isLoading = ref(true);

onMounted(async () => {
  // Ensure locations are fetched
  await locationsStore.fetchLocations();
  isLoading.value = false;
});

const selectStore = (locationId: string) => {
  locationsStore.setActiveLocation(locationId);
  router.push('/');
};
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
    <!-- Background Decor -->
    <div class="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary-500/10 rounded-full blur-[120px] animate-pulse"></div>
    <div class="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-secondary-500/10 rounded-full blur-[120px] animate-pulse" style="animation-delay: 1s"></div>

    <div class="glass-panel p-10 w-full max-w-4xl relative z-10 mx-4 border-white/40">
      <div class="text-center mb-10">
        <div class="flex items-center justify-center mb-6">
          <img :src="logoUrl" alt="CStoreSync Logo" class="w-12 h-auto object-contain transition-transform duration-500 hover:scale-105" />
        </div>
        <h1 class="text-4xl font-display font-black text-slate-900 mb-3 tracking-tight italic uppercase">
          Select <span class="dynamic-highlight">Store</span>
        </h1>
        <p class="text-slate-500 text-sm font-bold tracking-widest uppercase opacity-70">
          Choose a location to open your dashboard
        </p>
      </div>

      <div v-if="isLoading" class="flex flex-col items-center justify-center py-20">
        <Loader2 class="w-12 h-12 text-primary-500 animate-spin mb-4" />
        <p class="text-slate-400 font-bold uppercase tracking-widest text-sm">Loading Locations...</p>
      </div>

      <div v-else-if="locationsStore.locations.length === 0" class="text-center py-20">
        <Store class="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 class="text-slate-600 font-bold text-xl mb-2">No Stores Found</h3>
        <p class="text-slate-400">Please contact support or create a new store.</p>
        <button @click="router.push('/')" class="mt-6 btn-primary px-8 py-3">Continue to Dashboard</button>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="location in locationsStore.locations" 
          :key="location.id"
          class="bg-white rounded-2xl p-6 border-2 border-slate-100 hover:border-primary-500/30 hover:shadow-xl hover:shadow-primary-500/10 transition-all cursor-pointer group flex flex-col h-full"
          @click="selectStore(location.id)"
        >
          <div class="flex items-start justify-between mb-4">
            <div class="w-12 h-12 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Store class="w-6 h-6" />
            </div>
            <span class="px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase"
                  :class="location.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'">
              {{ location.status }}
            </span>
          </div>
          
          <h3 class="text-xl font-black text-slate-800 mb-2 truncate" :title="location.name">{{ location.name }}</h3>
          
          <div class="flex items-start text-slate-500 text-sm mb-6 flex-grow gap-2">
            <MapPin class="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p class="line-clamp-2">{{ location.address }}, {{ location.city }}, {{ location.state }} {{ location.zipCode }}</p>
          </div>
          
          <div class="mt-auto flex items-center justify-end text-primary-600 font-bold text-sm uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
            Open Store <ArrowRight class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
