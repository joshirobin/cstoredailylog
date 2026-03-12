<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useLotteryStore, type DailyLotteryCount } from '../../stores/lottery';
import { useAuditStore } from '../../stores/audit';
import { useAutoSave } from '../../composables/useAutoSave';
import { generatePrintTable, printDocument, exportToCSV } from '../../utils/print';
import { 
  Save, 
  CheckCircle2, 
  Loader2,
  Printer,
  Download,
  RotateCcw
} from 'lucide-vue-next';

const lotteryStore = useLotteryStore();
const auditStore = useAuditStore();

const today = new Date().toISOString().split('T')[0];
const selectedDate = ref(today);
const isSubmitting = ref(false);
const isFinalized = ref(false);

const totalPayouts = ref(0);
const actualCash = ref(0);

interface DailyCountRow extends Omit<Partial<DailyLotteryCount>, 'variance' | 'varianceAmount' | 'physicalRemaining'> {
    // Display Helpers
    _gameName: string;
    _bookNumber: string;
    _slotNumber?: string;
    _ticketPrice: number;

    // Reconciliation Fields
    startTicket: number; // Previous End
    endTicket: number;   // Current End (Input)
    soldCount: number;
    salesAmount: number;
    
    // DB Fields
    id?: string;
    physicalRemaining?: number;
    variance?: number;
    varianceAmount?: number;
    
    bookId?: string;
    expectedRemaining?: number;
    reasonCode?: 'MISCOUNT' | 'DAMAGED' | 'THEFT' | 'UNKNOWN';
    notes?: string;
}

const counts = ref<DailyCountRow[]>([]);

// --- Auto Save Setup ---
const { 
    loadDraft, 
    clearDraft, 
    lastSaved, 
    isSaving: isAutoSaving 
} = useAutoSave<DailyCountRow[]>(
    'daily_reconciliation', 
    counts,
    { debounceMs: 1000 }
);

// Format last saved time
const lastSavedText = computed(() => {
    if (!lastSaved.value) return '';
    return lastSaved.value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
});


// Initialize form with active books
const initializeCounts = async () => {
    isFinalized.value = false;

    // 1. Try to load finalized data from Backend (if we were editing a past date)
    // For now, we assume "Today" is always a new entry or draft.
    // TODO: Fetch existing daily report if exists to allow "Editing"

    // 2. Check for local Draft
    const draft = loadDraft();
    if (draft && draft.length > 0) {
        // Validate draft date matches selected date
        // (Assuming all rows have same date)
        if (draft[0]?.date === selectedDate.value) {
            console.log("Restored draft for", selectedDate.value);
            counts.value = draft;
            return;
        }
    }

    // 3. Fallback: Initialize from Active Inventory
    loadActiveInventory();
};

const loadActiveInventory = () => {
    counts.value = lotteryStore.activeBooks.map(book => {
        const expected = book.ticketEnd - book.currentTicket;
        return {
            bookId: book.id,
            _bookNumber: book.bookNumber,
            _slotNumber: book.slotNumber,
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

const resetForm = () => {
    if(confirm('Are you sure you want to clear this form? This will remove all entered data.')) {
        clearDraft();
        loadActiveInventory();
    }
};

onMounted(async () => {
    await Promise.all([
        lotteryStore.fetchBooks(),
        lotteryStore.fetchGames()
    ]);
    initializeCounts();
});

watch(selectedDate, () => {
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

    // Update DB compatible fields logic
    const book = lotteryStore.activeBooks.find(b => b.id === row.bookId);
    if (book) {
        row.physicalRemaining = book.ticketEnd - row.endTicket;
    }
    
    row.variance = 0; 
    row.varianceAmount = 0;
};

const totalSalesAmount = computed(() => {
    return counts.value.reduce((sum, row) => sum + (row.salesAmount || 0), 0);
});

const totalTicketsSold = computed(() => {
    return counts.value.reduce((sum, row) => sum + (row.soldCount || 0), 0);
});

const netExpectedCash = computed(() => {
    return totalSalesAmount.value - totalPayouts.value;
});

const cashVariance = computed(() => {
    return actualCash.value - netExpectedCash.value;
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
                _slotNumber,
                _ticketPrice, 
                startTicket,  
                endTicket, 
                soldCount, 
                salesAmount, 
                ...dbFields 
            } = c;
            
            const clean: any = {
                ...dbFields,
                date: selectedDate.value,
                variance: Number(dbFields.variance),
                varianceAmount: Number(dbFields.varianceAmount),
                expectedRemaining: Number(dbFields.expectedRemaining),
                slotNumber: _slotNumber || null,
                startTicket,
                endTicket,
                soldCount,
                salesAmount
            };

            if (clean.reasonCode === undefined) delete clean.reasonCode;
            if (!clean.notes) delete clean.notes;

            return clean;
        });

        await lotteryStore.saveDailyCounts(payload);
        
        // Audit log
        await auditStore.logAction(
            'lottery',
            'COUNT_FINALIZED',
            'daily_count',
            {
                date: selectedDate.value,
                totalSales: totalSalesAmount.value,
                totalTickets: totalTicketsSold.value,
                booksCount: activeCounts.length,
                payouts: totalPayouts.value,
                expectedCash: netExpectedCash.value,
                actualCash: actualCash.value,
                cashVariance: cashVariance.value
            }
        );
        
        // Clear draft on success
        clearDraft();
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
        const book = lotteryStore.activeBooks.find(b => b.id === row.bookId);
        if (book) {
            row.endTicket = book.ticketEnd;
            calculateRow(idx);
        }
    }
};

// --- Print & Export ---
const handlePrint = () => {
    const headers = ['Slot', 'Book #', 'Game', 'Begin', 'End', 'Sold', 'Sales $', 'Notes'];
    const rows = counts.value.map(c => [
        c._slotNumber || '-',
        c._bookNumber,
        c._gameName,
        c.startTicket,
        c.endTicket,
        c.soldCount,
        `$${c.salesAmount.toFixed(2)}`,
        c.notes || ''
    ]);

    const html = generatePrintTable(headers, rows, {
        title: `Lottery Daily Count - ${selectedDate.value}`,
        orientation: 'portrait'
    });
    
    printDocument(html);
};

const handleExport = () => {
    const headers = ['Slot', 'Book #', 'Game', 'Begin', 'End', 'Sold', 'Sales $', 'Notes'];
    const rows = counts.value.map(c => [
        c._slotNumber || '-',
        c._bookNumber,
        c._gameName,
        c.startTicket,
        c.endTicket,
        c.soldCount,
        c.salesAmount.toFixed(2),
        c.notes || ''
    ]);
    
    exportToCSV(headers, rows, `lottery-count-${selectedDate.value}.csv`);
};
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-6 pb-20">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 class="text-3xl font-black font-display text-slate-900 uppercase italic tracking-tighter">Daily Count</h2>
           <div class="flex items-center gap-3 mt-1">
                <p class="text-slate-500 font-bold uppercase tracking-widest text-xs">Reconciliation & Variance Check</p>
                <div v-if="lastSaved" class="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full animate-in fade-in">
                    <CheckCircle2 class="w-3 h-3" />
                    Saved {{ lastSavedText }}
                </div>
                <div v-if="isAutoSaving" class="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full animate-in fade-in">
                    <Loader2 class="w-3 h-3 animate-spin" />
                    Saving...
                </div>
           </div>
        </div>
        
        <div class="flex items-center gap-3">
             <div class="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                <button @click="handlePrint" title="Print" class="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
                    <Printer class="w-4 h-4" />
                </button>
                <div class="w-px h-6 bg-slate-200 mx-1"></div>
                <button @click="handleExport" title="Export CSV" class="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
                    <Download class="w-4 h-4" />
                </button>
                <div class="w-px h-6 bg-slate-200 mx-1"></div>
                 <button @click="resetForm" title="Reset Form" class="p-2 hover:bg-rose-50 rounded-lg text-rose-500 transition-colors">
                    <RotateCcw class="w-4 h-4" />
                </button>
            </div>

            <div class="px-4 py-2 bg-slate-100 rounded-lg font-mono font-bold text-slate-600">
                {{ selectedDate }}
            </div>
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
                                <div v-if="row._slotNumber" class="font-mono font-black text-slate-500 bg-slate-200 px-2 py-1 rounded text-xs">{{ row._slotNumber }}</div>
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

    <!-- Cash Reconciliation Section -->
    <div v-if="!isFinalized" class="glass-panel p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div class="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
            <div>
                <h3 class="text-xl font-bold font-display text-slate-900 uppercase italic">Cash Reconciliation</h3>
                <p class="text-sm text-slate-500 mb-0 font-bold uppercase tracking-widest mt-1">Verify funds against terminal payouts</p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                <DollarSign class="w-6 h-6" />
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <!-- Payouts Entry -->
            <div class="space-y-2">
                <label class="text-xs font-black uppercase tracking-widest text-slate-400 block ml-1">Total Payouts (-)</label>
                <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span class="text-slate-400 font-black">$</span>
                    </div>
                    <input 
                        v-model.number="totalPayouts" 
                        type="number" 
                        placeholder="0.00"
                        class="w-full pl-8 pr-4 py-4 bg-white border-2 border-slate-100 focus:border-amber-400 focus:ring-amber-400 focus:ring-4 focus:ring-opacity-20 rounded-xl font-mono font-black text-rose-500 text-lg transition-all"
                    >
                </div>
            </div>

            <!-- Expected Output -->
            <div class="space-y-2">
                <label class="text-xs font-black uppercase tracking-widest text-slate-400 block ml-1">Net Expected Cash</label>
                <div class="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-mono font-black text-slate-600 text-lg">
                    ${{ netExpectedCash.toFixed(2) }}
                </div>
            </div>

            <!-- Actual Drop -->
            <div class="space-y-2 lg:col-span-1">
                <label class="text-xs font-black uppercase tracking-widest text-slate-400 block ml-1">Actual Cash Drop</label>
                <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span class="text-slate-400 font-black">$</span>
                    </div>
                    <input 
                        v-model.number="actualCash" 
                        type="number" 
                        placeholder="0.00"
                        class="w-full pl-8 pr-4 py-4 bg-white border-2 border-slate-100 focus:border-emerald-400 focus:ring-emerald-400 focus:ring-4 focus:ring-opacity-20 rounded-xl font-mono font-black text-slate-900 text-lg transition-all"
                    >
                </div>
            </div>

            <!-- Variance Output -->
            <div class="space-y-2 lg:col-span-1">
                <label class="text-xs font-black uppercase tracking-widest text-slate-400 block ml-1">Cash Variance</label>
                <div class="w-full px-4 py-4 border-2 rounded-xl font-mono font-black text-lg transition-colors flex justify-between"
                    :class="{
                        'bg-emerald-50 border-emerald-100 text-emerald-600': cashVariance === 0 && actualCash > 0,
                        'bg-rose-50 border-rose-100 text-rose-600': cashVariance !== 0 && actualCash > 0,
                        'bg-slate-50 border-slate-100 text-slate-400': !actualCash,
                    }"
                >
                    <span>{{ cashVariance > 0 ? '+' : '' }}${{ cashVariance.toFixed(2) }}</span>
                    <span v-if="cashVariance === 0 && actualCash > 0" class="text-xs uppercase font-black bg-emerald-200 text-emerald-700 px-2 py-1 rounded inline-flex items-center">Perfect</span>
                    <span v-else-if="cashVariance < 0" class="text-xs uppercase font-black bg-rose-200 text-rose-700 px-2 py-1 rounded inline-flex items-center">Short</span>
                    <span v-else-if="cashVariance > 0" class="text-xs uppercase font-black bg-emerald-200 text-emerald-700 px-2 py-1 rounded inline-flex items-center">Over</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Footer Summary (Active Mode) -->
    <div v-if="!isFinalized" class="glass-panel p-6 flex items-center justify-between sticky bottom-6 shadow-2xl border-t-2 border-emerald-500 shadow-emerald-500/10 z-50">
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

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 py-8 border-y border-slate-100">
                <div class="p-4 rounded-2xl bg-slate-50">
                    <p class="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-1">Total Sales</p>
                    <p class="text-2xl font-black text-emerald-600 tracking-tight">${{ totalSalesAmount.toFixed(2) }}</p>
                </div>
                <div class="p-4 rounded-2xl bg-slate-50">
                    <p class="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-1">Tickets Sold</p>
                    <p class="text-2xl font-black text-slate-900 tracking-tight">{{ totalTicketsSold }}</p>
                </div>
                 <div class="p-4 rounded-2xl bg-slate-50">
                    <p class="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-1">Payouts Paid</p>
                    <p class="text-2xl font-black text-rose-500 tracking-tight">-${{ totalPayouts.toFixed(2) }}</p>
                </div>
                 <div class="p-4 rounded-2xl bg-slate-50" :class="cashVariance === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'">
                    <p class="text-[10px] font-bold uppercase tracking-widest mb-1" :class="cashVariance === 0 ? 'text-emerald-400' : 'text-rose-400'">Cash Variance</p>
                    <p class="text-2xl font-black tracking-tight flex items-center justify-center gap-1">
                        {{ cashVariance > 0 ? '+' : '' }}${{ cashVariance.toFixed(2) }}
                    </p>
                </div>
            </div>

            <button @click="$router.push('/lottery')" class="btn-primary w-full py-4 text-xs font-black uppercase tracking-widest bg-slate-900 hover:bg-slate-800">
                Return to Dashboard
            </button>
        </div>
    </div>
  </div>
</template>
