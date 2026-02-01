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
      class="flex items-center gap-3 px-4 py-2 bg-slate-100/50 hover:bg-slate-100 rounded-2xl transition-all border border-transparent hover:border-slate-200 group"
    >
      <div class="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-primary-600 group-hover:scale-110 transition-transform">
        <Store class="w-4 h-4" />
      </div>
      <div class="text-left hidden lg:block">
        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Active Store</p>
        <p class="text-xs font-bold text-slate-900 leading-none">
          {{ locationsStore.activeLocation?.name || 'Loading Store...' }}
        </p>
      </div>
      <ChevronDown class="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors ml-1" />
    </button>

    <!-- Dropdown -->
    <div v-if="isOpen" class="absolute left-0 mt-3 w-72 bg-white border border-slate-200 rounded-[2rem] shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 p-2">
      <div class="p-4 border-b border-slate-50 mb-2">
        <h3 class="text-xs font-black text-slate-900 uppercase tracking-widest italic">Switch Location</h3>
      </div>
      
      <div class="space-y-1 max-h-64 overflow-y-auto custom-scrollbar p-1">
        <button 
          v-for="loc in locationsStore.locations" 
          :key="loc.id"
          @click="selectLocation(loc.id)"
          class="w-full flex items-center justify-between p-3 rounded-2xl transition-all group"
          :class="loc.id === locationsStore.activeLocationId ? 'bg-primary-50 text-primary-600' : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'"
        >
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                <MapPin class="w-4 h-4" :class="loc.id === locationsStore.activeLocationId ? 'text-primary-600' : 'text-slate-400'" />
            </div>
            <div class="text-left">
              <p class="text-xs font-bold">{{ loc.name }}</p>
              <p class="text-[10px] opacity-60 font-medium">{{ loc.city }}, {{ loc.state }}</p>
            </div>
          </div>
          <Check v-if="loc.id === locationsStore.activeLocationId" class="w-4 h-4" />
        </button>
      </div>

      <div class="p-2 border-t border-slate-50 mt-2">
        <RouterLink to="/settings" @click="isOpen = false" class="flex items-center gap-3 w-full p-3 rounded-2xl hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition-all font-bold text-[11px] uppercase tracking-widest">
          <Plus class="w-4 h-4" />
          Add Store Entry
        </RouterLink>
      </div>
    </div>

    <!-- Backdrop -->
    <div v-if="isOpen" @click="isOpen = false" class="fixed inset-0 z-[90]"></div>
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
