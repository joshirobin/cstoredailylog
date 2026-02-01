<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useLotteryStore, type DailyLotteryCount } from '../../stores/lottery';
import { 
  Save, 
  CheckCircle2, 
  Loader2
} from 'lucide-vue-next';

const lotteryStore = useLotteryStore();

const today = new Date().toISOString().split('T')[0];
const selectedDate = ref(today);
const isSubmitting = ref(false);
const isFinalized = ref(false);

interface DailyCountRow extends Omit<Partial<DailyLotteryCount>, 'variance' | 'varianceAmount' | 'physicalRemaining'> {
    _bookNumber?: string;
    _gameName?: string;
    _ticketPrice?: number;
    // New fields
    startTicket: number;
    endTicket: number;
    soldCount: number;
    salesAmount: number;
    // Mapped for DB
    physicalRemaining: number;
    variance: number; 
    varianceAmount: number;
    
    bookId?: string;
    expectedRemaining?: number;
    reasonCode?: 'MISCOUNT' | 'DAMAGED' | 'THEFT' | 'UNKNOWN';
    notes?: string;
}

const counts = ref<DailyCountRow[]>([]);

// Initialize form with active books
const initializeCounts = () => {
    // Ideally check if counts already exist for this date
    // For now, load active books template
    counts.value = lotteryStore.activeBooks.map(book => {
        const expected = book.ticketEnd - book.currentTicket;
        return {
            bookId: book.id,
            _bookNumber: book.bookNumber,
            _gameName: book.gameName,
            _ticketPrice: lotteryStore.games.find(g => g.id === book.gameId)?.ticketPrice || 0,
            
            date: selectedDate.value,
            
            // Workflow Fields
            startTicket: book.currentTicket,
            endTicket: book.currentTicket, // Default to start (0 sales)
            soldCount: 0,
            salesAmount: 0,

            // DB Fields
            expectedRemaining: expected,
            physicalRemaining: expected,
            variance: 0,
            varianceAmount: 0,
            reasonCode: undefined,
            notes: ''
        };
    });
};

onMounted(async () => {
    await Promise.all([
        lotteryStore.fetchBooks(),
        lotteryStore.fetchGames()
    ]);
    initializeCounts();
});

const calculateRow = (idx: number) => {
    const row = counts.value[idx];
    if (!row) return;

    if (row.endTicket === undefined) return;

    // Sales = End - Start
    const sold = row.endTicket - row.startTicket;
    row.soldCount = sold > 0 ? sold : 0;
    
    // Amount
    row.salesAmount = row.soldCount * (row._ticketPrice || 0);

    // Update DB compatible fields logic if we revert to "Remaining" logic
    // Book End - Current End # = Remaining
    const book = lotteryStore.activeBooks.find(b => b.id === row.bookId);
    if (book) {
        row.physicalRemaining = book.ticketEnd - row.endTicket;
    }
    
    // Variance: In this workflow, "Variance" is essentially checking if the 
    // Manual End # matches system expectation (if we had one). 
    // Here we treat the input as Truth. So Variance is 0 for "Calculated" vs "Actual".
    row.variance = 0; 
    row.varianceAmount = 0;
};

const totalSalesAmount = computed(() => {
    return counts.value.reduce((sum, row) => sum + (row.salesAmount || 0), 0);
});

const totalTicketsSold = computed(() => {
    return counts.value.reduce((sum, row) => sum + (row.soldCount || 0), 0);
});


const handleSubmit = async () => {
    // Validation
    const missingReasons = counts.value.some(r => r.variance !== 0 && !r.reasonCode);
    if (missingReasons) {
        alert('Please provide a reason for all variances before submitting.');
        return;
    }

    // Confirmation
    if (!confirm(`Are you sure you want to finalize counts?\n\nTotal Sales: $${totalSalesAmount.value.toFixed(2)}\nTickets Sold: ${totalTicketsSold.value}\n\nThis will update the inventory log.`)) {
        return;
    }

    isSubmitting.value = true;
    try {
        // Sanitize data for Firestore
        // 1. Remove UI-only fields (underscore prefixed)
        // 2. Remove undefined values (like reasonCode)
        // 3. Filter: Only save records that have SALES (or were explicitly modified/have notes)
        //    This keeps the Log Book clean, only showing active changes.
        const activeCounts = counts.value.filter(c => c.soldCount > 0 || c.notes);

        if (activeCounts.length === 0) {
            if(!confirm('No sales recorded. Do you want to proceed saving an empty report?')) {
                isSubmitting.value = false;
                return;
            }
        }

        const payload = activeCounts.map(c => {
            const { 
                _bookNumber, 
                _gameName, 
                _ticketPrice, 
                startTicket, 
                endTicket, 
                soldCount, 
                salesAmount, 
                ...dbFields 
            } = c;
            
            // Ensure strict types for numbers
            const clean: any = {
                ...dbFields,
                date: selectedDate.value, // Ensure date matches selector
                physicalRemaining: Number(dbFields.physicalRemaining),
                variance: Number(dbFields.variance),
                varianceAmount: Number(dbFields.varianceAmount),
                expectedRemaining: Number(dbFields.expectedRemaining),
                // We need to save the sales data effectively, even if not in original schema properly
                // The store handles saving "DailyLotteryCount".
                // We should ensure start/end/sold are preserved in the generic object if the store supports it, 
                // OR map them to standard fields.
                // Looking at store types, if startTicket/endTicket/soldCount aren't in DailyLotteryCount, they might be lost?
                // Let's assume the store simply saves the object it gets. 
                // We'll explicitly include them.
                startTicket,
                endTicket,
                soldCount,
                salesAmount
            };

            // Remove undefined reasonCode
            if (clean.reasonCode === undefined) {
                delete clean.reasonCode;
            }
            // Remove undefined notes if empty
            if (!clean.notes) {
                delete clean.notes;
            }

            return clean;
        });

        await lotteryStore.saveDailyCounts(payload);
        isFinalized.value = true;
    } catch (e) {
        console.error(e);
        alert('Failed to save counts. Check console for details.');
    } finally {
        isSubmitting.value = false;
    }
};

// Sold Out Handling
const markRowSoldOut = (idx: number) => {
    const row = counts.value[idx];
    if (row && row.bookId) {
        // Find book 
        const book = lotteryStore.activeBooks.find(b => b.id === row.bookId);
        if (book) {
            row.endTicket = book.ticketEnd;
            calculateRow(idx);
        }
    }
};
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-6 pb-20">
    <!-- Header -->
    <div class="flex items-center justify-between">
        <div>
           <h2 class="text-3xl font-black font-display text-slate-900 uppercase italic tracking-tighter">Daily Count</h2>
           <p class="text-slate-500 font-bold uppercase tracking-widest text-xs mt-1">Reconciliation & Variance Check</p>
        </div>
        <div class="px-4 py-2 bg-slate-100 rounded-lg font-mono font-bold text-slate-600">
            {{ selectedDate }}
        </div>
    </div>

    <!-- Main Table -->
    <div v-if="!isFinalized" class="glass-panel overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-sm text-left whitespace-nowrap">
                <thead class="bg-slate-50 text-xs text-slate-500 uppercase font-black tracking-wider">
                    <tr>
                        <th class="px-4 py-4">Pack Info</th>
                        <th class="px-4 py-4 text-center">Begin #</th>
                        <th class="px-4 py-4 w-32 text-center bg-blue-50/50 text-blue-800">End #</th>
                        <th class="px-4 py-4 text-center">Sold</th>
                        <th class="px-4 py-4 text-right">Total $</th>
                        <th class="px-4 py-4 w-48">Notes</th>
                        <th class="px-4 py-4 w-12"></th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <tr v-for="(row, idx) in counts" :key="idx" class="hover:bg-slate-50 transition-colors group">
                        <!-- Pack Info -->
                        <td class="px-4 py-3">
                            <div class="flex items-center gap-3">
                                <div class="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded">#{{ row._bookNumber }}</div>
                                <div>
                                    <div class="font-bold text-slate-700 text-xs">{{ row._gameName }}</div>
                                    <div class="text-[10px] text-slate-400 font-bold uppercase">${{ row._ticketPrice }} Ticket</div>
                                </div>
                            </div>
                        </td>

                        <!-- Begin # -->
                        <td class="px-4 py-3 text-center font-mono text-slate-500">
                            {{ row.startTicket }}
                        </td>

                        <!-- End # Input -->
                        <td class="px-4 py-2 bg-blue-50/30">
                            <input 
                                type="number" 
                                v-model.number="row.endTicket" 
                                @input="calculateRow(idx)"
                                class="w-full text-center font-mono font-bold text-slate-900 bg-white border border-slate-200 rounded-lg py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all shadow-sm"
                            />
                        </td>

                        <!-- Sold Count -->
                        <td class="px-4 py-3 text-center font-mono font-bold text-slate-900">
                            {{ row.soldCount }}
                        </td>

                         <!-- Total $ -->
                        <td class="px-4 py-3 text-right font-mono font-black text-emerald-600">
                            ${{ row.salesAmount.toFixed(2) }}
                        </td>

                         <!-- Notes -->
                        <td class="px-4 py-2">
                            <input 
                                v-model="row.notes"
                                type="text"
                                placeholder="..."
                                class="w-full bg-slate-50 border-transparent rounded text-xs focus:bg-white focus:border-slate-200"
                            />
                        </td>

                        <!-- Quick Actions -->
                         <td class="px-4 py-2 text-center">
                            <button @click="markRowSoldOut(idx)" class="text-[10px] font-black uppercase text-amber-500 hover:text-amber-700 hover:underline" title="Mark as fully sold out">
                                Sold Out
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Footer Summary (Active Mode) -->
    <div v-if="!isFinalized" class="glass-panel p-6 flex items-center justify-between sticky bottom-6 shadow-2xl border-t-2 border-emerald-500 shadow-emerald-500/10">
        <div class="flex items-center gap-4">
             <div class="w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-50 text-emerald-500">
                <CheckCircle2 class="w-6 h-6" />
             </div>
             <div>
                <h4 class="font-bold text-slate-900 uppercase text-sm tracking-wide">Daily Totals</h4>
                <p class="text-xs text-slate-500">
                    Total Lottery Sales: <span class="font-black text-emerald-600 text-lg ml-1">${{ totalSalesAmount.toFixed(2) }}</span>
                </p>
             </div>
        </div>

        <button 
            @click="handleSubmit" 
            :disabled="isSubmitting"
            class="px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-slate-900 text-white shadow-slate-900/30"
        >
            <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin" />
            <Save v-else class="w-4 h-4" />
            {{ isSubmitting ? 'Saving...' : 'Finalize Counts' }}
        </button>
    </div>

    <!-- Success Summary (Finalized Mode) -->
    <div v-else class="max-w-xl mx-auto space-y-6">
        <div class="glass-panel p-12 text-center space-y-6 border-t-4 border-emerald-500">
            <div class="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 mb-6 shadow-xl shadow-emerald-500/20">
                <CheckCircle2 class="w-10 h-10" />
            </div>
            
            <h3 class="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Count Finalized</h3>
            <p class="text-slate-500 font-medium">Data for <span class="font-bold text-slate-900">{{ selectedDate }}</span> has been successfully saved.</p>

            <div class="grid grid-cols-2 gap-4 py-8 border-y border-slate-100">
                <div class="p-4 rounded-2xl bg-slate-50">
                    <p class="text-xs font-bold uppercase text-slate-400 tracking-widest mb-1">Total Sales</p>
                    <p class="text-3xl font-black text-emerald-600 tracking-tight">${{ totalSalesAmount.toFixed(2) }}</p>
                </div>
                <div class="p-4 rounded-2xl bg-slate-50">
                    <p class="text-xs font-bold uppercase text-slate-400 tracking-widest mb-1">Tickets Sold</p>
                    <p class="text-3xl font-black text-slate-900 tracking-tight">{{ totalTicketsSold }}</p>
                </div>
            </div>

            <button @click="$router.push('/lottery')" class="btn-primary w-full py-4 text-xs font-black uppercase tracking-widest bg-slate-900 hover:bg-slate-800">
                Return to Dashboard
            </button>
        </div>
    </div>
  </div>
</template>
