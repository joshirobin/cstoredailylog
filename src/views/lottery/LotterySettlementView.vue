<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useLotteryStore } from '../../stores/lottery';
import { useAuditStore } from '../../stores/audit';
import { generatePrintTable, printDocument, exportToCSV } from '../../utils/print';
import { 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Calculator,
  Upload,
  Printer,
  Download
} from 'lucide-vue-next';
import { Timestamp } from 'firebase/firestore';

const lotteryStore = useLotteryStore();
const auditStore = useAuditStore();

onMounted(async () => {
    await Promise.all([
        lotteryStore.fetchBooks(),
        lotteryStore.fetchSettlements()
    ]);
});

const activeTab = ref<'pending' | 'history'>('pending');

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

        // Audit log
        await auditStore.logAction(
            'lottery',
            'SETTLEMENT_CREATED',
            'settlement',
            {
                bookNumber: selectedBook.value.bookNumber,
                gameName: selectedBook.value.gameName,
                grossSales: grossSales.value,
                netDue: netDue.value
            }
        );

        selectedBookId.value = null;
        // alert('Settled!');
    } catch (e) {
        alert('Failed to settle');
    }
};
const handlePrint = () => {
    if (!selectedBook.value) return;

    const html = generatePrintTable(
        ['Item', 'Value'],
        [
            ['Book Number', selectedBook.value.bookNumber],
            ['Game Name', selectedBook.value.gameName],
            ['Total Tickets', ticketsSold.value.toString()],
            ['Gross Sales', `$${grossSales.value.toFixed(2)}`],
            ['Commission', `$${commission.value.toFixed(2)}`],
            ['Net Due', `$${netDue.value.toFixed(2)}`]
        ],
        {
            title: `Settlement Worksheet - Book #${selectedBook.value.bookNumber}`,
            orientation: 'portrait'
        }
    );
    printDocument(html);
};

const handleExport = () => {
    const headers = ['Settled Date', 'Pack Info', 'Tickets Sold', 'Gross Sales', 'Net Due', 'Status'];
    const rows = lotteryStore.settlements.map(item => [
        item.settlementDate?.seconds ? new Date(item.settlementDate.seconds * 1000).toLocaleDateString() : 'N/A',
        `#${item.bookNumber} - ${item.gameName}`,
        item.ticketsSold.toString(),
        item.grossSales.toFixed(2),
        item.netDue.toFixed(2),
        item.status || 'APPROVED'
    ]);
    exportToCSV(headers, rows, 'settlement-history.csv');
};
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-8 pb-12">
    <div class="flex items-center justify-between">
        <div>
            <h2 class="text-3xl font-black font-display text-slate-900 uppercase italic tracking-tighter">Book Settlement</h2>
            <p class="text-slate-500 font-bold uppercase tracking-widest text-xs mt-1">Finalize Sold Out Packs</p>
        </div>
        <div class="bg-slate-100 p-1 rounded-xl flex items-center">
             <button 
                @click="activeTab = 'pending'"
                class="px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all"
                :class="activeTab === 'pending' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'"
            >
                Pending
            </button>
            <button 
                @click="activeTab = 'history'"
                class="px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all"
                :class="activeTab === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'"
            >
                History
            </button>
        </div>
    </div>

    <div v-if="activeTab === 'pending'" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                    <div class="flex items-center gap-3">
                         <button @click="handlePrint" title="Print Worksheet" class="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors bg-white border border-slate-200 shadow-sm hover:text-slate-900">
                            <Printer class="w-4 h-4" />
                        </button>
                        <div class="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                            <Calculator class="w-6 h-6" />
                        </div>
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

    <div v-if="activeTab === 'history'" class="glass-panel overflow-hidden">
        <div class="p-4 border-b border-slate-100 flex justify-end">
            <button @click="handleExport" class="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 text-slate-600 transition-colors shadow-sm">
                <Download class="w-4 h-4" /> Export CSV
            </button>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full text-sm text-left whitespace-nowrap">
                <thead class="bg-slate-50 text-xs text-slate-500 uppercase font-black tracking-wider">
                    <tr>
                        <th class="px-6 py-4">Settled Date</th>
                        <th class="px-6 py-4">Pack Info</th>
                        <th class="px-6 py-4 text-center">Tickets Sold</th>
                        <th class="px-6 py-4 text-right">Gross Sales</th>
                        <th class="px-6 py-4 text-right">Net Due</th>
                        <th class="px-6 py-4 text-center">Status</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <tr v-for="item in lotteryStore.settlements" :key="item.id" class="hover:bg-slate-50 transition-colors">
                        <td class="px-6 py-4 font-mono text-slate-500">
                            {{ item.settlementDate?.seconds ? new Date(item.settlementDate.seconds * 1000).toLocaleDateString() : 'N/A' }}
                        </td>
                        <td class="px-6 py-4">
                            <div class="font-bold text-slate-900">#{{ item.bookNumber }}</div>
                            <div class="text-[10px] text-slate-500 uppercase table-cell-wrap">{{ item.gameName }}</div>
                        </td>
                        <td class="px-6 py-4 text-center font-mono font-bold">{{ item.ticketsSold }}</td>
                        <td class="px-6 py-4 text-right font-mono font-bold text-emerald-600">${{ item.grossSales.toFixed(2) }}</td>
                        <td class="px-6 py-4 text-right font-mono font-black text-slate-900">${{ item.netDue.toFixed(2) }}</td>
                        <td class="px-6 py-4 text-center">
                            <span class="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[10px] font-black uppercase tracking-wider">{{ item.status || 'APPROVED' }}</span>
                        </td>
                    </tr>
                    <tr v-if="lotteryStore.settlements.length === 0">
                        <td colspan="6" class="px-6 py-12 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">
                            No settlement history found
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
  </div>
</template>
