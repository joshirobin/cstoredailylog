<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useFuelStore, type FuelEntry } from '../../stores/fuel';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebaseConfig';
import { Droplet, Save, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Loader2, Paperclip, ExternalLink, History, Clock } from 'lucide-vue-next';

const fuelStore = useFuelStore();

const selectedDate = ref<string>(new Date().toISOString().split('T')[0] as string);
const entries = ref<FuelEntry[]>([]);
const notes = ref('');
const atgImageUrl = ref('');
const atgImageFile = ref<File | null>(null);
const isUploading = ref(false);
const isSubmitting = ref(false);
const statusMessage = ref<{ type: 'success' | 'error', text: string } | null>(null);

// Entries handled here

const getLatestLogBefore = (date: string) => {
    return fuelStore.logs
        .filter(l => l.date < date)
        .sort((a: any, b: any) => b.date.localeCompare(a.date))[0];
};

const initializeEntries = () => {
    // If log exists for date, load it. Else, init from default types.
    const existingLog = fuelStore.logs.find(l => l.date === selectedDate.value);
    
    if (existingLog) {
        entries.value = JSON.parse(JSON.stringify(existingLog.entries)); 
        notes.value = existingLog.notes || '';
        atgImageUrl.value = existingLog.atgImage || '';
    } else {
        const prevLog = getLatestLogBefore(selectedDate.value);
        const typesToUse = prevLog ? prevLog.entries.map((e: any) => e.type) : fuelStore.defaultFuelTypes;
        
        // Initialize defaults
        entries.value = typesToUse.map((type: string) => {
            const prevEntry = prevLog?.entries.find((e: any) => e.type === type);
            const beginGal = prevEntry ? prevEntry.endInvAtg : 0;
            return {
                type,
                inch: 0,
                beginGal: beginGal,
                deliveryGal: 0,
                soldGal: 0,
                bookInv: beginGal,
                endInvAtg: 0,
                costPerGal: 0,
                variance: -beginGal
            };
        });

        notes.value = '';
        atgImageUrl.value = '';
    }
    atgImageFile.value = null; 
};

// Sync with previous day manual helper
const syncWithPrevious = () => {
    const prevLog = getLatestLogBefore(selectedDate.value);
    if (!prevLog) {
        statusMessage.value = { type: 'error', text: 'No previous log found to sync from.' };
        setTimeout(() => statusMessage.value = null, 3000);
        return;
    }

    // Update existing or add missing
    prevLog.entries.forEach((prevEntry: any) => {
        let entry = entries.value.find((e: any) => e.type === prevEntry.type);
        if (entry) {
            entry.beginGal = prevEntry.endInvAtg;
            calculateRow(entry);
        } else {
            // If this type wasn't in our current list, add it
            entries.value.push({
                type: prevEntry.type,
                inch: 0,
                beginGal: prevEntry.endInvAtg,
                deliveryGal: 0,
                soldGal: 0,
                bookInv: prevEntry.endInvAtg,
                endInvAtg: 0,
                costPerGal: 0,
                variance: -prevEntry.endInvAtg
            });
        }
    });

    statusMessage.value = { type: 'success', text: `Synced ${prevLog.entries.length} fuel types from ${prevLog.date}.` };
    setTimeout(() => statusMessage.value = null, 3000);
};

const hasSyncMismatch = computed(() => {
    const prevLog = getLatestLogBefore(selectedDate.value);
    if (!prevLog) return false;
    
    return entries.value.some((entry: any) => {
        const prevEntry = prevLog.entries.find((e: any) => e.type === entry.type);
        return prevEntry && (Number(entry.beginGal) !== Number(prevEntry.endInvAtg));
    });
});

const refreshData = async () => {
    await fuelStore.fetchLogs();
    initializeEntries();
    statusMessage.value = { type: 'success', text: 'Data refreshed from server.' };
    setTimeout(() => statusMessage.value = null, 2000);
};

onMounted(async () => {
    await fuelStore.fetchLogs();
    initializeEntries();
});

watch(selectedDate, () => {
    initializeEntries();
});

// Watch logs for external changes (e.g., from other sessions or after saving)
watch(() => fuelStore.logs, (newLogs) => {
    // Only auto-initialize if we aren't currently editing a log that has unsaved changes
    // For simplicity, we'll just check if it's a new log case
    const existingLog = newLogs.find(l => l.date === selectedDate.value);
    if (!existingLog) {
        initializeEntries();
    }
}, { deep: true });

const navigateDate = (days: number) => {
  const date = new Date(selectedDate.value);
  date.setDate(date.getDate() + days);
  selectedDate.value = date.toISOString().split('T')[0] as string;
};

const handleFileSelect = (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
        atgImageFile.value = target.files[0];
    }
};

const calculateRow = (entry: FuelEntry) => {
    entry.bookInv = (Number(entry.beginGal) || 0) + (Number(entry.deliveryGal) || 0) - (Number(entry.soldGal) || 0);
    entry.variance = (Number(entry.endInvAtg) || 0) - entry.bookInv;
};

const totalVariance = computed(() => {
    return entries.value.reduce((sum, e) => sum + (e.variance || 0), 0);
});

const saveLog = async () => {
    isSubmitting.value = true;
    try {
        let uploadedUrl = atgImageUrl.value;
            
        if (atgImageFile.value) {
            isUploading.value = true;
            const fileRef = storageRef(storage, `fuel_logs/${selectedDate.value}/${atgImageFile.value.name}-${Date.now()}`);
            await uploadBytes(fileRef, atgImageFile.value);
            uploadedUrl = await getDownloadURL(fileRef);
            isUploading.value = false;
        }

        await fuelStore.addLog({
            date: selectedDate.value,
            entries: entries.value,
            totalVariance: totalVariance.value,
            notes: notes.value,
            atgImage: uploadedUrl,
            updatedAt: new Date().toISOString()
        });
        
        atgImageUrl.value = uploadedUrl;
        atgImageFile.value = null;

        statusMessage.value = { type: 'success', text: 'Fuel Log saved successfully!' };
        setTimeout(() => statusMessage.value = null, 3000);
    } catch (e) {
        console.error(e);
        statusMessage.value = { type: 'error', text: 'Failed to save log.' };
    } finally {
        isSubmitting.value = false;
        isUploading.value = false;
    }
};
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div class="bg-primary-50 p-3 rounded-lg shadow-lg shadow-primary-500/10">
           <Droplet class="w-6 h-6 text-primary-600" />
        </div>
        <div>
           <h2 class="text-2xl font-bold font-display text-slate-900">Fuel Inventory Log</h2>
           <p class="text-slate-500 text-sm">Track stick readings, deliveries, and variances daily.</p>
        </div>
      </div>
    </div>

    <!-- Date Navigation -->
    <div class="glass-panel p-4 flex items-center justify-between">
      <button @click="navigateDate(-1)" class="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900 transition-colors"><ChevronLeft /></button>
      <div class="flex flex-col items-center">
         <span class="text-xs text-slate-400 uppercase tracking-wider font-bold">Log Date</span>
         <div class="flex items-center gap-2">
            <input type="date" v-model="selectedDate" class="bg-transparent border-none text-slate-900 font-bold text-lg text-center focus:ring-0 cursor-pointer" />
            <button @click="refreshData" title="Refresh logs from server" class="text-slate-400 hover:text-primary-600 transition-colors">
                <Clock class="w-4 h-4" />
            </button>
         </div>
      </div>
      <button @click="navigateDate(1)" class="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900 transition-colors"><ChevronRight /></button>
    </div>

    <!-- Sync Warning Banner -->
    <div v-if="hasSyncMismatch" class="bg-amber-50 border border-amber-100 rounded-lg p-4 flex items-center justify-between text-amber-700 animate-in fade-in slide-in-from-top-2">
       <div class="flex items-center gap-3">
           <AlertCircle class="w-5 h-5" />
           <div>
               <p class="text-sm font-bold">Inventory Mismatch Detected</p>
               <p class="text-xs opacity-80">Beginning Inventory does not match the previous day's Ending Inventory.</p>
           </div>
       </div>
       <button @click="syncWithPrevious" class="bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-1.5 rounded-md text-xs font-bold transition-colors flex items-center gap-2">
           <History class="w-3.5 h-3.5" />
           Sync with Previous Day
       </button>
    </div>

    <!-- Inventory Table -->
    <div class="glass-panel overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
                <thead class="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                    <tr>
                        <th class="px-4 py-3 min-w-[150px]">Fuel Type</th>
                        <th class="px-4 py-3 min-w-[110px]">Inch (Stick)</th>
                        <th class="px-4 py-3 min-w-[130px]">
                            <div class="flex items-center gap-2">
                                Begin Gal
                                <button @click="syncWithPrevious" title="Sync with previous day" class="text-primary-600 hover:text-primary-700 transition-colors">
                                    <History class="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </th>
                        <th class="px-4 py-3 min-w-[130px]">Delivery Gal</th>
                        <th class="px-4 py-3 min-w-[130px]">Sold Gal</th>
                        <th class="px-4 py-3 min-w-[130px] bg-slate-100/50 text-center">Book Inv</th>
                        <th class="px-4 py-3 min-w-[130px]">End Inv (ATG)</th>
                        <th class="px-4 py-3 min-w-[130px]">Cost/Gal</th>
                        <th class="px-4 py-3 min-w-[110px] text-right">Variance</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 whitespace-nowrap">
                    <tr v-for="entry in entries" :key="entry.type" class="hover:bg-slate-50 transition-colors">
                        <td class="px-4 py-3 font-medium text-slate-900">{{ entry.type }}</td>
                        <td class="px-2 py-2"><input type="number" v-model.number="entry.inch" class="input-table" placeholder="0" /></td>
                        <td class="px-2 py-2"><input type="number" v-model.number="entry.beginGal" @input="calculateRow(entry)" class="input-table" placeholder="0" /></td>
                        <td class="px-2 py-2"><input type="number" v-model.number="entry.deliveryGal" @input="calculateRow(entry)" class="input-table" placeholder="0" /></td>
                        <td class="px-2 py-2"><input type="number" v-model.number="entry.soldGal" @input="calculateRow(entry)" class="input-table" placeholder="0" /></td>
                        <td class="px-4 py-3 font-mono text-slate-500 bg-slate-100/50">{{ entry.bookInv }}</td>
                        <td class="px-2 py-2"><input type="number" v-model.number="entry.endInvAtg" @input="calculateRow(entry)" class="input-table" placeholder="0" /></td>
                         <td class="px-2 py-2"><input type="number" v-model.number="entry.costPerGal" step="0.001" class="input-table" placeholder="0.00" /></td>
                        <td class="px-4 py-3 text-right font-mono font-bold" :class="entry.variance < 0 ? 'text-red-600' : 'text-emerald-600'">
                            {{ entry.variance }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Summary & Save -->
    <div class="glass-panel p-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
             <div class="space-y-2">
                 <label class="text-xs text-slate-500 uppercase tracking-wide">Notes</label>
                 <textarea v-model="notes" class="input-field w-full h-24" placeholder="Tank maintenance, leakage check..."></textarea>
             </div>
             
             <div class="space-y-2">
                 <label class="text-xs text-slate-500 uppercase tracking-wide">ATG Scan Copy</label>
                 <div class="flex gap-4 items-start">
                     <!-- File Input -->
                     <label class="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-colors relative space-y-1">
                         <div class="flex flex-col items-center justify-center pt-5 pb-6 text-slate-400">
                             <Paperclip v-if="!atgImageFile" class="w-6 h-6 mb-1" />
                             <span v-if="!atgImageFile" class="text-xs">Attach File</span>
                             <span v-else class="text-xs font-medium text-slate-900 px-2 text-center break-all">{{ atgImageFile.name }}</span>
                         </div>
                         <input type="file" class="hidden" @change="handleFileSelect" accept="image/*,.pdf" />
                     </label>

                     <!-- Existing Image Preview -->
                     <div v-if="atgImageUrl" class="relative group w-24 h-24 flex-shrink-0 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                         <img :src="atgImageUrl" alt="ATG Scan" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                         <a :href="atgImageUrl" target="_blank" class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                             <ExternalLink class="w-5 h-5 text-white" />
                         </a>
                     </div>
                 </div>
             </div>
        </div>
        
        <div class="flex items-center justify-between border-t border-slate-100 pt-6">
            <div class="flex items-center gap-6"> 
                 <div>
                    <div class="text-xs text-slate-500 uppercase tracking-wide">Total Variance</div>
                    <div class="text-2xl font-mono font-bold" :class="totalVariance < 0 ? 'text-red-600' : 'text-emerald-600'">
                        {{ totalVariance }}
                    </div>
                 </div>
            </div>
            
            <button @click="saveLog" :disabled="isSubmitting" class="btn-primary flex items-center gap-2 px-6 py-3">
                <Save v-if="!isSubmitting && !isUploading" class="w-5 h-5" />
                <Loader2 v-else class="w-5 h-5 animate-spin" />
                <span>{{ isUploading ? 'Uploading...' : (isSubmitting ? 'Saving...' : 'Save Log') }}</span>
            </button>
        </div>
    </div>
        <!-- Status Message -->
    <div v-if="statusMessage" class="flex items-center gap-3 p-4 rounded-lg animate-in fade-in slide-in-from-bottom-2" :class="statusMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'">
       <CheckCircle2 v-if="statusMessage.type === 'success'" class="w-5 h-5" />
       <AlertCircle v-else class="w-5 h-5" />
       <span class="font-medium">{{ statusMessage.text }}</span>
    </div>

    <!-- Recent Logs Section -->
    <div class="glass-panel overflow-hidden mt-12 shadow-sm">
        <div class="px-6 py-4 border-b border-slate-100">
            <h3 class="text-lg font-bold text-slate-900 uppercase tracking-wider text-sm flex items-center gap-2">
                <History class="w-4 h-4 text-primary-600" />
                Recent Logs Activity
            </h3>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
                <thead class="bg-slate-50 text-xs text-slate-500 uppercase tracking-widest">
                    <tr>
                        <th class="px-6 py-3 font-bold">Date</th>
                        <th class="px-6 py-3 font-bold">Total Variance</th>
                        <th class="px-6 py-3 font-bold">Notes</th>
                        <th class="px-6 py-3 text-center font-bold">ATG Scan</th>
                        <th class="px-6 py-3 text-right font-bold">Action</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <tr v-for="log in fuelStore.logs.slice(0, 10)" :key="log.date" 
                        class="hover:bg-primary-50 cursor-pointer transition-colors group" 
                        @click="selectedDate = log.date">
                        <td class="px-6 py-4 font-medium" :class="selectedDate === log.date ? 'text-primary-600 font-bold' : 'text-slate-700'">
                            {{ log.date }}
                            <span v-if="selectedDate === log.date" class="ml-2 text-[10px] bg-primary-100 text-primary-700 border border-primary-200 px-1.5 py-0.5 rounded-full">ACTIVE</span>
                        </td>
                        <td class="px-6 py-4 font-mono font-bold" :class="log.totalVariance < 0 ? 'text-red-600' : 'text-emerald-600'">
                            {{ log.totalVariance }}
                        </td>
                        <td class="px-6 py-4 text-slate-500 truncate max-w-[200px] italic">{{ log.notes || 'No notes' }}</td>
                        <td class="px-6 py-4 text-center">
                            <div v-if="log.atgImage" class="bg-primary-50 w-8 h-8 rounded-full flex items-center justify-center mx-auto group-hover:bg-primary-100 transition-colors">
                                <Paperclip class="w-4 h-4 text-primary-600" />
                            </div>
                            <span v-else class="text-slate-200">-</span>
                        </td>
                        <td class="px-6 py-4 text-right">
                            <button class="text-slate-300 group-hover:text-primary-600 transition-colors">
                                <ChevronRight class="w-5 h-5" />
                            </button>
                        </td>
                    </tr>
                    <tr v-if="fuelStore.logs.length === 0">
                        <td colspan="5" class="px-6 py-12 text-center text-surface-500 italic flex flex-col items-center gap-2">
                            <div class="bg-surface-800 p-3 rounded-full mb-2">
                                <History class="w-6 h-6 text-surface-600" />
                            </div>
                            No fuel logs have been saved yet.
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
  </div>
</template>

<style scoped>
.input-table {
    @apply w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-sm text-slate-900 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-right transition-all;
}
</style>
