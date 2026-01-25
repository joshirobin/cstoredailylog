<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useLotteryStore, type LotteryEntry } from '../../stores/lottery';
import { Ticket, Save, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Plus, Trash2, Loader2, History } from 'lucide-vue-next';

const lotteryStore = useLotteryStore();

const selectedDate = ref<string>(new Date().toISOString().split('T')[0] as string);
const entries = ref<LotteryEntry[]>([]);
const notes = ref('');
const isSubmitting = ref(false);
const statusMessage = ref<{ type: 'success' | 'error', text: string } | null>(null);

const createEmptyEntry = () => ({
    gameName: '',
    packNumber: '',
    beginNumber: 0,
    endNumber: 0,
    soldOut: false,
    returns: 0,
    credits: 0,
    ticketPrice: 0,
    soldCount: 0,
    amount: 0,
    verified: false
});

const initializeEntries = () => {
    const existingLog = lotteryStore.logs.find(l => l.date === selectedDate.value);
    
    if (existingLog) {
        entries.value = JSON.parse(JSON.stringify(existingLog.entries));
        notes.value = existingLog.notes || '';
    } else {
        // New Log: Try to find previous day for carry-over
        // logs are already typically fetched, but ensure we search desc
        const sortedLogs = [...lotteryStore.logs].sort((a, b) => b.date.localeCompare(a.date));
        const prevLog = sortedLogs.find(l => l.date < selectedDate.value);
        
        let newEntries: LotteryEntry[] = [];
        
        if (prevLog) {
            // Carry over logic: 
            // 1. Keep games not sold out.
            // 2. Set Begin # = Prev End #.
            // 3. Set End # = Prev End # (start of shift).
            newEntries = prevLog.entries
                .filter(e => !e.soldOut && e.gameName) // Only valid active games
                .map(e => ({
                    ...createEmptyEntry(),
                    gameName: e.gameName,
                    packNumber: e.packNumber,
                    ticketPrice: e.ticketPrice,
                    beginNumber: e.endNumber,
                    endNumber: 0, // Manual entry required
                }));
        }
        
        // Fill remaining to ensure at least 30 rows
        const needed = 30 - newEntries.length;
        if (needed > 0) {
            newEntries.push(...Array.from({ length: needed }, createEmptyEntry));
        }
        
        entries.value = newEntries;
        notes.value = '';
    }
};

onMounted(async () => {
    await lotteryStore.fetchLogs();
    initializeEntries();
});

watch(selectedDate, () => {
    initializeEntries();
});

const navigateDate = (days: number) => {
  const date = new Date(selectedDate.value);
  date.setDate(date.getDate() + days);
  selectedDate.value = date.toISOString().split('T')[0] as string;
};

const isSyncing = ref(false);

const syncFromPreviousDay = async () => {
    isSyncing.value = true;
    try {
        const sortedLogs = [...lotteryStore.logs].sort((a, b) => b.date.localeCompare(a.date));
        const prevLog = sortedLogs.find(l => l.date < selectedDate.value);

        if (!prevLog) {
            statusMessage.value = { type: 'error', text: 'No previous log found to sync from.' };
            setTimeout(() => statusMessage.value = null, 3000);
            return;
        }

        const validPrevEntries = prevLog.entries.filter(e => !e.soldOut && e.gameName);
        let updatesCount = 0;

        for (const pEntry of validPrevEntries) {
            // Find existing entry by Name+Pack, or Name only
            let targetEntry = entries.value.find(e => 
                (e.gameName === pEntry.gameName && e.packNumber === pEntry.packNumber) || 
                (e.gameName === pEntry.gameName && !e.packNumber && !pEntry.packNumber)
            );

            // If not found, find first empty slot
            if (!targetEntry) {
                targetEntry = entries.value.find(e => !e.gameName);
            }

            // If no empty slot, create new
            if (!targetEntry) {
                targetEntry = createEmptyEntry();
                entries.value.push(targetEntry);
            }

            // Update fields
            targetEntry.gameName = pEntry.gameName;
            targetEntry.packNumber = pEntry.packNumber;
            targetEntry.ticketPrice = pEntry.ticketPrice;
            targetEntry.beginNumber = pEntry.endNumber;
            targetEntry.endNumber = 0; // Manual entry required
            updatesCount++;
        }

        statusMessage.value = { type: 'success', text: `Synced ${updatesCount} games from ${prevLog.date}` };
        setTimeout(() => statusMessage.value = null, 3000);

    } catch (e) {
        console.error(e);
        statusMessage.value = { type: 'error', text: 'Failed to sync.' };
    } finally {
        isSyncing.value = false;
    }
};

const addGame = () => {
    entries.value.push(createEmptyEntry());
};

const removeGame = (index: number) => {
    entries.value.splice(index, 1);
};

const calculateRow = (entry: LotteryEntry) => {
    // Basic logic: Sold = End - Begin
    // Adjust for Sold Out (if sold out, maybe End is max?) - User didn't specify logic detail.
    // Assuming straightforward subtraction.
    let sold = entry.endNumber - entry.beginNumber;
    if (sold < 0) sold = 0; // protection
    
    entry.soldCount = sold;
    // User requested "Amount". Usually (Sold * Price) - Returns?
    // Let's assume Amount is simply Sales Value = (Sold * Price). 
    // Or users enter Amount manually?
    // "Amount: Sold Out: Return: Credit: Verify"
    // I'll calculate Amount if Price is present.
    entry.amount = (sold * (entry.ticketPrice || 0));
};

const totalSales = computed(() => {
    return entries.value.reduce((sum, e) => sum + (e.amount || 0), 0);
});

const saveLog = async () => {
    isSubmitting.value = true;
    try {
        await lotteryStore.addLog({
            date: selectedDate.value,
            entries: entries.value,
            totalSales: totalSales.value,
            notes: notes.value,
            updatedAt: new Date().toISOString()
        });
        statusMessage.value = { type: 'success', text: 'Lottery Log saved successfully!' };
        setTimeout(() => statusMessage.value = null, 3000);
    } catch (e) {
        statusMessage.value = { type: 'error', text: 'Failed to save log.' };
    } finally {
        isSubmitting.value = false;
    }
};
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6 pb-20">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div class="bg-secondary-500/20 p-3 rounded-lg">
           <Ticket class="w-6 h-6 text-secondary-400" />
        </div>
        <div>
           <h2 class="text-2xl font-bold font-display text-white">Lottery Reconciliation</h2>
           <p class="text-surface-400 text-sm">Track scratch-offs, packs, and daily sales.</p>
        </div>
      </div>
    </div>

    <!-- Date Navigation -->
    <div class="glass-panel p-4 flex items-center justify-between">
      <button @click="navigateDate(-1)" class="p-2 hover:bg-surface-800 rounded-lg text-surface-400 hover:text-white"><ChevronLeft /></button>
      <div class="flex flex-col items-center">
         <span class="text-xs text-surface-400 uppercase tracking-wider font-bold">Log Date</span>
         <input type="date" v-model="selectedDate" class="bg-transparent border-none text-white font-bold text-lg text-center" />
      </div>
      <button @click="navigateDate(1)" class="p-2 hover:bg-surface-800 rounded-lg text-surface-400 hover:text-white"><ChevronRight /></button>
    </div>

    <!-- Games Table -->
    <div class="glass-panel overflow-hidden">
        <div class="p-4 border-b border-surface-700/50 flex justify-between items-center">
            <h3 class="font-bold text-white">Active Packs</h3>
            <div class="flex gap-2">
                <button @click="syncFromPreviousDay" class="btn-secondary text-xs flex items-center gap-2 py-2" title="Import active games and ending numbers from previous day">
                    <Loader2 v-if="isSyncing" class="w-4 h-4 animate-spin" />
                    <History v-else class="w-4 h-4" /> 
                    <span class="hidden sm:inline">Sync Prev Day</span>
                </button>
                <button @click="addGame" class="btn-secondary text-xs flex items-center gap-2 py-2">
                    <Plus class="w-4 h-4" /> Add Game
                </button>
            </div>
        </div>
        
        <div class="overflow-x-auto">
            <table class="w-full text-sm text-left whitespace-nowrap">
                <thead class="bg-surface-800/50 text-xs text-surface-400 uppercase">
                    <tr>
                        <th class="px-2 py-3 w-12 text-center text-surface-500">S.N.</th>
                        <th class="px-2 py-3 min-w-[200px]">Game Name</th>
                        <th class="px-2 py-3 min-w-[120px]">Pack #</th>
                        <th class="px-2 py-3 w-20">Price $</th>
                        <th class="px-2 py-3 w-24 bg-surface-800/50">Begin #</th>
                        <th class="px-2 py-3 w-24 bg-surface-800/50">End #</th>
                        <th class="px-2 py-3 w-20 text-center">Sold Out?</th>
                        <th class="px-2 py-3 w-24">Return $</th>
                        <th class="px-2 py-3 w-24">Credit $</th>
                        <th class="px-2 py-3 w-28 text-right">Amount $</th>
                        <th class="px-2 py-3 w-16 text-center">Verify</th>
                        <th class="px-2 py-3 w-10"></th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-surface-700/50">
                    <tr v-for="(entry, idx) in entries" :key="idx" class="hover:bg-surface-800/30">
                        <td class="px-2 py-2 text-center text-surface-500 font-mono text-xs">{{ idx + 1 }}</td>
                        <td class="px-2 py-2"><input type="text" v-model="entry.gameName" class="input-table text-left pl-3" placeholder="Game Name" /></td>
                        <td class="px-2 py-2"><input type="text" v-model="entry.packNumber" class="input-table" placeholder="#" /></td>
                        <td class="px-2 py-2"><input type="number" v-model.number="entry.ticketPrice" @input="calculateRow(entry)" class="input-table" placeholder="0" /></td>
                        
                        <td class="px-2 py-2 bg-surface-800/20"><input type="number" v-model.number="entry.beginNumber" @input="calculateRow(entry)" class="input-table bg-surface-800/50" /></td>
                        <td class="px-2 py-2 bg-surface-800/20"><input type="number" v-model.number="entry.endNumber" @input="calculateRow(entry)" class="input-table bg-surface-800/50" /></td>
                        
                        <td class="px-2 py-2 text-center">
                            <input type="checkbox" v-model="entry.soldOut" class="h-4 w-4 rounded border-surface-600 bg-surface-800 text-primary-500 focus:ring-primary-500" />
                        </td>
                        
                        <td class="px-2 py-2"><input type="number" v-model.number="entry.returns" class="input-table" placeholder="0" /></td>
                        <td class="px-2 py-2"><input type="number" v-model.number="entry.credits" class="input-table" placeholder="0" /></td>
                        
                        <td class="px-4 py-2 text-right font-mono font-bold text-emerald-400">{{ entry.amount.toFixed(2) }}</td>
                        
                        <td class="px-2 py-2 text-center">
                             <input type="checkbox" v-model="entry.verified" class="h-4 w-4 rounded border-surface-600 bg-surface-800 text-emerald-500 focus:ring-emerald-500" />
                        </td>
                        <td class="px-2 py-2 text-center">
                            <button @click="removeGame(idx)" class="text-surface-500 hover:text-red-400 p-1"><Trash2 class="w-4 h-4" /></button>
                        </td>
                    </tr>
                    <tr v-if="entries.length === 0">
                        <td colspan="11" class="px-4 py-8 text-center text-surface-500">No active packs. Add a game to start.</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Summary & Save -->
    <div class="glass-panel p-6 flex flex-col md:flex-row items-center justify-between gap-6 sticky bottom-6 shadow-2xl border-t border-surface-700">
        <div class="text-sm text-surface-400 hidden md:block">
            <p>Ensure all "Sold Out" games are verified before closing.</p>
        </div>
        
        <div class="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
            <div class="text-right">
                <div class="text-xs text-surface-400 uppercase tracking-wide">Total Sales</div>
                <div class="text-2xl font-mono font-bold text-emerald-400">
                    ${{ totalSales.toFixed(2) }}
                </div>
            </div>
            
            <button @click="saveLog" :disabled="isSubmitting" class="btn-primary flex items-center gap-2 px-6 py-3">
                <Save v-if="!isSubmitting" class="w-5 h-5" />
                <Loader2 v-else class="w-5 h-5 animate-spin" />
                <span>{{ isSubmitting ? 'Saving...' : 'Save Log' }}</span>
            </button>
        </div>
    </div>

     <!-- Status Message -->
    <div v-if="statusMessage" class="fixed bottom-24 right-6 flex items-center gap-3 p-4 rounded-lg shadow-xl animate-in slide-in-from-bottom-5 bg-surface-800 border" :class="statusMessage.type === 'success' ? 'text-emerald-400 border-emerald-500/20' : 'text-red-400 border-red-500/20'">
       <CheckCircle2 v-if="statusMessage.type === 'success'" class="w-5 h-5" />
       <AlertCircle v-else class="w-5 h-5" />
       <span class="font-medium">{{ statusMessage.text }}</span>
    </div>

  </div>
</template>

<style scoped>
.input-table {
    @apply w-full bg-surface-900/50 border border-surface-700/50 rounded px-2 py-1.5 text-sm text-white focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-center;
}
</style>
