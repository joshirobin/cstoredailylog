<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useLocationsStore } from '../../stores/locations';
import { 
    Save, MapPin, Store, Building, Globe, 
    Zap, CheckCircle2, Plus, 
    ChevronRight, ArrowLeft 
} from 'lucide-vue-next';

const locationsStore = useLocationsStore();
const isSaving = ref(false);
const saveSuccess = ref(false);
const showAddModal = ref(false);

const form = ref({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: ''
});

onMounted(async () => {
    await locationsStore.fetchLocations();
    resetForm();
});

const resetForm = () => {
    if (locationsStore.activeLocation) {
        form.value = {
            name: locationsStore.activeLocation.name,
            address: locationsStore.activeLocation.address,
            city: locationsStore.activeLocation.city,
            state: locationsStore.activeLocation.state,
            zipCode: locationsStore.activeLocation.zipCode
        };
    }
};

// Sync form when active location changes, but only if not currently saving
watch(() => locationsStore.activeLocationId, () => {
    resetForm();
});

// Also watch for the actual location data once it loads
watch(() => locationsStore.activeLocation, (newVal, oldVal) => {
    // If we didn't have a location before and now we do, or if it's a completely different one
    if (newVal && (!oldVal || newVal.id !== oldVal.id)) {
        resetForm();
    }
}, { deep: true });

const handleSave = async () => {
    isSaving.value = true;
    try {
        const targetId = locationsStore.activeLocationId || locationsStore.activeLocation?.id;
        if (targetId) {
            await locationsStore.updateLocation(targetId, form.value);
            saveSuccess.value = true;
            setTimeout(() => saveSuccess.value = false, 3000);
        } else {
            alert('No active store selected to save');
        }
    } catch (error) {
        alert('Failed to save settings');
    } finally {
        isSaving.value = false;
    }
};

const newLocationForm = ref({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    status: 'Active' as const
});

const handleAddLocation = async () => {
    isSaving.value = true;
    try {
        await locationsStore.addLocation(newLocationForm.value);
        showAddModal.value = false;
        newLocationForm.value = { name: '', address: '', city: '', state: '', zipCode: '', status: 'Active' };
    } catch (error) {
        alert('Failed to add location');
    } finally {
        isSaving.value = false;
    }
};
</script>

<template>
  <div class="p-6 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
    <div class="flex items-center justify-between">
        <div>
            <h1 class="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">Multi-Location Control</h1>
            <p class="text-slate-500 font-bold tracking-widest text-[11px] mt-1 uppercase flex items-center gap-2">
                <Store class="w-3 h-3 text-primary-500" />
                Manage all your operational nodes from a single hub
            </p>
        </div>
        <div class="flex gap-4">
            <button 
                @click="showAddModal = true"
                class="bg-white border-2 border-slate-100 hover:border-primary-500/30 p-4 rounded-2xl flex items-center gap-2 text-[11px] font-black uppercase tracking-widest transition-all shadow-sm"
            >
                <Plus class="w-4 h-4 text-primary-600" />
                Add New Store
            </button>
            <button 
                @click="handleSave"
                :disabled="isSaving"
                class="btn-primary py-4 px-8 flex items-center gap-2 group shadow-xl shadow-primary-500/20 disabled:opacity-50"
            >
                <Save v-if="!isSaving" class="w-4 h-4 group-hover:rotate-12 transition-transform" />
                <Zap v-else class="w-4 h-4 animate-spin" />
                Save Active Store
            </button>
        </div>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <!-- Store Sidebar List -->
        <div class="xl:col-span-1 space-y-4">
            <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Location Registry</h3>
            <div class="space-y-2">
                <button 
                    v-for="loc in locationsStore.locations" 
                    :key="loc.id"
                    @click="locationsStore.setActiveLocation(loc.id); resetForm()"
                    class="w-full p-4 rounded-[1.5rem] border-2 transition-all text-left flex items-center justify-between group"
                    :class="loc.id === locationsStore.activeLocationId ? 'bg-primary-50 border-primary-100 shadow-md translate-x-1' : 'bg-white border-slate-100 hover:border-slate-200'"
                >
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-primary-600 group-hover:scale-110 transition-transform">
                            <MapPin class="w-4 h-4" />
                        </div>
                        <div>
                            <p class="text-xs font-black text-slate-900">{{ loc.name }}</p>
                            <p class="text-[9px] font-bold text-slate-400 uppercase">{{ loc.city }}, {{ loc.state }}</p>
                        </div>
                    </div>
                    <ChevronRight class="w-4 h-4" :class="loc.id === locationsStore.activeLocationId ? 'text-primary-600' : 'text-slate-300'" />
                </button>
            </div>
        </div>

        <!-- Active Store Details -->
        <div class="xl:col-span-3 space-y-6">
            <div class="glass-panel p-8 space-y-8">
                <div class="flex items-center gap-4 border-b border-slate-100 pb-6">
                    <div class="w-14 h-14 rounded-2xl bg-primary-600 flex items-center justify-center text-white shadow-xl shadow-primary-500/20">
                        <Building class="w-7 h-7" />
                    </div>
                    <div>
                        <h2 class="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">{{ locationsStore.activeLocation?.name }} Configuration</h2>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">ID: {{ locationsStore.activeLocationId }}</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div class="space-y-6">
                        <div class="flex flex-col gap-2">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Store Label</label>
                            <input 
                                v-model="form.name"
                                type="text"
                                class="bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-900 focus:border-primary-500 outline-none transition-all"
                            />
                        </div>

                        <div class="flex flex-col gap-2">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Street Address</label>
                            <input 
                                v-model="form.address"
                                type="text"
                                class="bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-900 focus:border-primary-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div class="space-y-6">
                        <div class="grid grid-cols-2 gap-4">
                            <div class="flex flex-col gap-2">
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">City</label>
                                <input v-model="form.city" type="text" class="bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-900" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">State</label>
                                <input v-model="form.state" type="text" class="bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-900" />
                            </div>
                        </div>

                        <div class="flex flex-col gap-2">
                            <label class="text-[10px] font-black text-primary-500 uppercase tracking-widest ml-1">Postal Code (Ops Sync)</label>
                            <input 
                                v-model="form.zipCode"
                                type="text"
                                maxlength="5"
                                class="bg-slate-50 border-2 border-primary-500/20 rounded-2xl p-6 font-black text-primary-600 focus:border-primary-500 outline-none transition-all text-2xl tracking-[0.2em]"
                            />
                        </div>
                    </div>
                </div>

                <div v-if="saveSuccess" class="bg-emerald-500 text-white p-4 rounded-2xl flex items-center gap-3 shadow-lg shadow-emerald-500/20 animate-in slide-in-from-top-4 duration-500">
                    <CheckCircle2 class="w-6 h-6" />
                    <span class="font-bold uppercase tracking-widest text-xs">Active location updated and geocoded.</span>
                </div>
            </div>

            <!-- Location Meta Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="glass-panel p-6 bg-slate-900 text-white border-none relative overflow-hidden group">
                    <div class="absolute -top-10 -right-10 w-32 h-32 bg-primary-500/20 rounded-full blur-2xl group-hover:bg-primary-500/30 transition-colors"></div>
                    <h4 class="text-[10px] font-black uppercase tracking-widest text-primary-400 mb-4">Coordinate Lock</h4>
                    <div class="flex justify-between items-end">
                        <div>
                            <p class="text-2xl font-mono font-black tabular-nums">{{ locationsStore.activeLocation?.latitude?.toFixed(4) || '??.????' }}</p>
                            <p class="text-[9px] font-bold text-slate-500 uppercase">Latitude</p>
                        </div>
                        <div class="text-right">
                            <p class="text-2xl font-mono font-black tabular-nums">{{ locationsStore.activeLocation?.longitude?.toFixed(4) || '??.????' }}</p>
                            <p class="text-[9px] font-bold text-slate-500 uppercase">Longitude</p>
                        </div>
                    </div>
                </div>

                <div class="glass-panel p-6 border-slate-100 flex items-center gap-4 bg-slate-50/50">
                    <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                        <Globe class="w-6 h-6" />
                    </div>
                    <div>
                        <h4 class="text-xs font-black text-slate-900 uppercase">Status: {{ locationsStore.activeLocation?.status }}</h4>
                        <p class="text-[10px] text-slate-500 font-bold mt-1">This node is verified and transmitting real-time analytics to the central cluster.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Add Location Modal -->
    <div v-if="showAddModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-md" @click="showAddModal = false"></div>
        <div class="bg-white rounded-[3rem] w-full max-w-xl relative z-10 overflow-hidden animate-in zoom-in duration-300 shadow-2xl">
            <div class="p-8 border-b border-slate-50 flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center">
                        <Plus class="w-6 h-6" />
                    </div>
                    <h2 class="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Add New Store Node</h2>
                </div>
                <button @click="showAddModal = false" class="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                    <ArrowLeft class="w-6 h-6 text-slate-400" />
                </button>
            </div>

            <form @submit.prevent="handleAddLocation" class="p-8 space-y-6">
                <div class="space-y-4">
                    <div class="flex flex-col gap-2">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Store Name</label>
                        <input v-model="newLocationForm.name" type="text" required class="bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-900" placeholder="e.g. West Side Gas & Food" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Address</label>
                        <input v-model="newLocationForm.address" type="text" required class="bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-900" placeholder="123 Node St" />
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <input v-model="newLocationForm.city" type="text" required class="bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-900" placeholder="City" />
                        <input v-model="newLocationForm.state" type="text" required class="bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-900" placeholder="ST" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Zip Code</label>
                        <input v-model="newLocationForm.zipCode" type="text" required maxlength="5" class="bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black text-primary-600 text-xl tracking-widest" placeholder="75201" />
                    </div>
                </div>

                <div class="pt-6 border-t border-slate-50 flex gap-4">
                    <button type="button" @click="showAddModal = false" class="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[11px] tracking-widest">Cancel</button>
                    <button type="submit" :disabled="isSaving" class="flex-1 btn-primary py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-primary-500/20">
                        {{ isSaving ? 'Provisioning...' : 'Provision Store' }}
                    </button>
                </div>
            </form>
        </div>
    </div>
  </div>
</template>

<style scoped>
.glass-panel {
    background: white;
    border: 2px solid #f1f5f9;
    border-radius: 2.5rem;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #f1f5f9;
  border-radius: 10px;
}
</style>
