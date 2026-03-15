<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useLocationsStore } from '../../stores/locations';
import { Store, ChevronDown, Check, Plus, MapPin } from 'lucide-vue-next';

const locationsStore = useLocationsStore();
const isOpen = ref(false);

onMounted(async () => {
    await locationsStore.fetchLocations();
});

const selectLocation = (id: string) => {
    locationsStore.setActiveLocation(id);
    isOpen.value = false;
    // Optional: Refresh page or global state to reflect new store data
    window.location.reload();
};
</script>

<template>
  <div class="relative">
    <button 
      @click="isOpen = !isOpen"
      class="flex items-center gap-4 px-5 py-2.5 bg-slate-800/40 backdrop-blur-md hover:bg-slate-800/60 rounded-2xl transition-all duration-300 border border-white/5 hover:border-primary-500/30 hover:shadow-2xl hover:shadow-primary-500/5 group"
    >
      <div class="w-10 h-10 rounded-xl bg-primary-600 shadow-lg shadow-primary-500/20 flex items-center justify-center text-white group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
        <Store class="w-5 h-5" />
      </div>
      <div class="text-left hidden lg:block">
        <p class="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none mb-1.5">Active Store</p>
        <p class="text-sm font-black text-white leading-none tracking-tight">
          {{ locationsStore.activeLocation?.name || 'Loading Store...' }}
        </p>
      </div>
      <ChevronDown class="w-5 h-5 text-slate-400 group-hover:text-primary-600 transition-colors ml-2" :class="{'rotate-180': isOpen}" />
    </button>

    <!-- Dropdown -->
    <div v-if="isOpen" class="absolute left-0 mt-4 w-80 bg-white/90 backdrop-blur-2xl border border-white/20 rounded-[2rem] shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 p-3">
      <div class="p-5 border-b border-slate-100/50 mb-3 bg-slate-50/50 rounded-t-[1.5rem]">
        <h3 class="text-xs font-black text-slate-900 uppercase tracking-[0.25em] italic flex items-center gap-2">
            <MapPin class="w-4 h-4 text-primary-600" />
            Switch Location
        </h3>
      </div>
      
      <div class="space-y-1.5 max-h-80 overflow-y-auto custom-scrollbar px-1">
        <button 
          v-for="loc in locationsStore.locations" 
          :key="loc.id"
          @click="selectLocation(loc.id)"
          class="w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 group relative overflow-hidden"
          :class="loc.id === locationsStore.activeLocationId ? 'bg-primary-600 text-white shadow-xl shadow-primary-500/20 active-glow' : 'hover:bg-primary-50 text-slate-600 hover:text-primary-700'"
        >
          <div class="flex items-center gap-4 relative z-10">
            <div class="w-11 h-11 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <MapPin class="w-5 h-5" :class="loc.id === locationsStore.activeLocationId ? 'text-primary-600' : 'text-slate-400'" />
            </div>
            <div class="text-left">
              <p class="text-sm font-black border-none">{{ loc.name }}</p>
              <p class="text-[11px] opacity-70 font-bold uppercase tracking-wider">{{ loc.city }}, {{ loc.state }}</p>
            </div>
          </div>
          <Check v-if="loc.id === locationsStore.activeLocationId" class="w-5 h-5 relative z-10" />
        </button>
      </div>

      <div class="p-3 border-t border-slate-100/50 mt-3 bg-slate-50/50 rounded-b-[1.5rem]">
        <RouterLink to="/settings" @click="isOpen = false" class="flex items-center gap-4 w-full p-4 rounded-2xl hover:bg-white text-primary-600 hover:text-primary-700 transition-all font-black text-[11px] uppercase tracking-[0.2em] shadow-sm hover:shadow-md border border-transparent hover:border-primary-100">
          <Plus class="w-5 h-5" />
          Add Store Entry
        </RouterLink>
      </div>
    </div>

    <!-- Backdrop -->
    <div v-if="isOpen" @click="isOpen = false" class="fixed inset-0 z-[90] bg-slate-900/5 backdrop-blur-sm"></div>
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
  border-radius: 10px;
}
</style>
