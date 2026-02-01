<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useLotteryStore } from '../../stores/lottery';
import { 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Calculator,
  Upload
} from 'lucide-vue-next';
import { Timestamp } from 'firebase/firestore';

const lotteryStore = useLotteryStore();

onMounted(async () => {
    await lotteryStore.fetchBooks();
});

const selectedBookId = ref<string | null>(null);
const selectedBook = computed(() => lotteryStore.books.find(b => b.id === selectedBookId.value));

// Calculation logic
const ticketsSold = computed(() => {
    if (!selectedBook.value) return 0;
    // For a fully sold out book, sold = Total Tickets.
    // If it's partial return, logic differs. Assuming full sell-out for now.
    return (selectedBook.value.ticketEnd - selectedBook.value.ticketStart);
});

const grossSales = computed(() => {
    if (!selectedBook.value) return 0;
    const game = lotteryStore.games.find(g => g.id === selectedBook.value!.gameId);
    return ticketsSold.value * (game?.ticketPrice || 0);
});

const commission = computed(() => {
    // Assuming 5% or from game definition
    const game = lotteryStore.games.find(g => g.id === selectedBook.value?.gameId);
    return grossSales.value * (game?.commissionRate || 0.05); // Default 5%
});

const netDue = computed(() => grossSales.value - commission.value);

const handleSettle = async () => {
    if (!selectedBook.value) return;

    try {
        await lotteryStore.settleBook(selectedBook.value.id, {
            bookId: selectedBook.value.id,
            gameName: selectedBook.value.gameName,
            bookNumber: selectedBook.value.bookNumber,
            totalTickets: selectedBook.value.ticketEnd - selectedBook.value.ticketStart,
            ticketsSold: ticketsSold.value,
            grossSales: grossSales.value,
            commission: commission.value,
            netDue: netDue.value,
            settlementDate: Timestamp.now(),
            status: 'APPROVED'
        });
        selectedBookId.value = null;
        // alert('Settled!');
    } catch (e) {
        alert('Failed to settle');
    }
};
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-8 pb-12">
    <div>
        <h2 class="text-3xl font-black font-display text-slate-900 uppercase italic tracking-tighter">Book Settlement</h2>
        <p class="text-slate-500 font-bold uppercase tracking-widest text-xs mt-1">Finalize Sold Out Packs</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- List of Pending -->
        <div class="lg:col-span-1 glass-panel p-0 overflow-hidden h-fit">
            <div class="p-4 bg-slate-50 border-b border-slate-100">
                <h3 class="font-bold text-slate-900 uppercase text-xs tracking-wider">Pending Action</h3>
            </div>
            <div class="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                <div 
                    v-for="book in lotteryStore.pendingSettlements" 
                    :key="book.id"
                    @click="selectedBookId = book.id"
                    class="p-4 hover:bg-slate-50 cursor-pointer transition-colors border-l-4"
                    :class="selectedBookId === book.id ? 'border-l-primary-500 bg-primary-50/10' : 'border-l-transparent'"
                >
                    <div class="flex justify-between items-start mb-1">
                        <span class="font-black text-slate-900 font-mono">#{{ book.bookNumber }}</span>
                        <span class="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-bold uppercase">Sold Out</span>
                    </div>
                    <p class="text-xs text-slate-500 font-medium truncate">{{ book.gameName }}</p>
                </div>
                <div v-if="lotteryStore.pendingSettlements.length === 0" class="p-8 text-center">
                    <CheckCircle2 class="w-8 h-8 text-emerald-300 mx-auto mb-2" />
                    <p class="text-xs text-slate-400 font-bold uppercase tracking-wider">All Clear</p>
                </div>
            </div>
        </div>

        <!-- Detail & Action -->
        <div class="lg:col-span-2 space-y-6">
            <div v-if="selectedBook" class="glass-panel p-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div class="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                    <div>
                        <h3 class="text-xl font-bold text-slate-900 mb-1">Settlement Worksheet</h3>
                        <p class="text-sm text-slate-500">Calculating final liability for <span class="font-mono font-bold text-slate-900">#{{ selectedBook.bookNumber }}</span></p>
                    </div>
                    <div class="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <Calculator class="w-6 h-6" />
                    </div>
                </div>

                <div class="space-y-6">
                    <!-- Metrics Grid -->
                    <div class="grid grid-cols-2 gap-4">
                        <div class="p-4 rounded-xl bg-slate-50 border border-slate-100">
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Tickets</p>
                            <p class="text-lg font-mono font-bold text-slate-900">{{ ticketsSold }}</p>
                        </div>
                        <div class="p-4 rounded-xl bg-slate-50 border border-slate-100">
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Gross Sales</p>
                            <p class="text-lg font-mono font-bold text-emerald-600">${{ grossSales.toFixed(2) }}</p>
                        </div>
                        <div class="p-4 rounded-xl bg-slate-50 border border-slate-100">
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Commission (5%)</p>
                            <p class="text-lg font-mono font-bold text-primary-600">${{ commission.toFixed(2) }}</p>
                        </div>
                         <div class="p-4 rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-900/20">
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Net Due State</p>
                            <p class="text-xl font-mono font-bold text-white">${{ netDue.toFixed(2) }}</p>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div>
                         <label class="block w-full p-4 border-2 border-dashed border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors text-center group">
                            <Upload class="w-6 h-6 text-slate-300 mx-auto mb-2 group-hover:text-primary-500 transition-colors" />
                            <span class="text-xs font-bold text-slate-500 uppercase tracking-wide group-hover:text-primary-600">Attach Settlement Slip Photo</span>
                        </label>
                    </div>
                    
                    <button @click="handleSettle" class="btn-primary w-full py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
                        <FileText class="w-4 h-4" /> Confirm Settlement
                    </button>
                </div>
            </div>

            <div v-else class="h-full flex flex-col items-center justify-center text-center p-12 glass-panel opacity-60">
                <AlertCircle class="w-12 h-12 text-slate-300 mb-4" />
                <p class="text-sm font-bold text-slate-400 uppercase tracking-widest">Select a book to settle</p>
            </div>
        </div>
    </div>
  </div>
</template>
