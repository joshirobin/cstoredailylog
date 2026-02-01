<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { useLotteryStore } from '../../stores/lottery';
import { 
  Layers, 
  AlertTriangle, 
  DollarSign, 
  Plus, 
  ClipboardCheck, 
  ArrowRight,
  Archive,
  Ticket,
  History,
  ChevronDown,
  ChevronUp
} from 'lucide-vue-next';
import { useRouter } from 'vue-router';

const lotteryStore = useLotteryStore();
const router = useRouter();

onMounted(async () => {
    await Promise.all([
        lotteryStore.fetchGames(),
        lotteryStore.fetchBooks(),
        lotteryStore.fetchHistory()
    ]);
});

const activeBookCount = computed(() => lotteryStore.activeBooks.length);
const pendingSettlementsCount = computed(() => lotteryStore.pendingSettlements.length);
const inStockCount = computed(() => lotteryStore.inStockBooks.length);

const totalActiveValue = computed(() => {
    return lotteryStore.activeBooks.reduce((sum, book) => {
        const game = lotteryStore.games.find(g => g.id === book.gameId);
        if (!game) return sum;
        const remaining = book.ticketEnd - book.currentTicket;
        return sum + (remaining * game.ticketPrice);
    }, 0);
});

const activeGames = computed(() => {
    return lotteryStore.activeBooks.map(book => {
        const game = lotteryStore.games.find(g => g.id === book.gameId);
        return {
            ...book,
            gameName: game?.gameName || book.gameName,
            price: game?.ticketPrice || 0,
            remaining: book.ticketEnd - book.currentTicket
        };
    }).sort((a, b) => (a.assignedRegister || '').localeCompare(b.assignedRegister || ''));
});

// --- History / Log Book ---
const expandedDate = ref<string | null>(null);

const toggleDate = (date: string) => {
    expandedDate.value = expandedDate.value === date ? null : date;
};

const groupedHistory = computed(() => {
    // Group history items by date
    const groups: Record<string, any[]> = {};
    lotteryStore.history.forEach(item => {
        if (!groups[item.date]) groups[item.date] = [];
        groups[item.date]!.push(item);
    });

    // Convert to array
    return Object.keys(groups).sort((a, b) => b.localeCompare(a)).map(date => {
        const items = groups[date] || [];
        const totalSales = items.reduce((sum, i) => sum + (i.salesAmount || 0), 0);
        const totalTickets = items.reduce((sum, i) => sum + (i.soldCount || 0), 0);
        
        // Enrich items with Game Name 
        const enrichedItems = items.map(i => {
             const book = lotteryStore.books.find(b => b.id === i.bookId);
             // If book not found in active list (maybe archived), we rely on... wait, usually store has all.
             // If not, we might miss name. Ideally store history would have snapshot name.
             // But we can look up by ID.
             const gameName = book?.gameName || 'Unknown Game';
             const bookNumber = book?.bookNumber || '???';
             return { ...i, gameName, bookNumber };
        });

        return {
            date,
            totalSales,
            totalTickets,
            items: enrichedItems
        };
    });
});

</script>

<template>
  <div class="max-w-7xl mx-auto space-y-8 pb-12">
    <!-- Header -->
    <div class="flex items-center justify-between">
        <div>
           <h2 class="text-3xl font-black font-display text-slate-900 uppercase italic tracking-tighter">Lottery Command</h2>
           <p class="text-slate-500 font-bold uppercase tracking-widest text-xs mt-1">Inventory • Sales • Settlement</p>
        </div>
        <button 
            @click="router.push('/lottery/reconciliation')" 
            class="btn-primary py-3 px-6 flex items-center gap-2 shadow-lg shadow-primary-500/20"
        >
            <ClipboardCheck class="w-5 h-5" />
            <span class="font-black uppercase tracking-wider text-xs">Start Daily Count</span>
        </button>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="glass-panel p-6 flex flex-col justify-between group cursor-pointer" @click="router.push('/lottery/inventory')">
            <div class="flex items-start justify-between">
                <div>
                   <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Books</p>
                   <p class="text-4xl font-black text-slate-900 tracking-tighter mt-1">{{ activeBookCount }}</p>
                </div>
                <div class="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                    <Layers class="w-5 h-5" />
                </div>
            </div>
            <div class="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-600">
                <span class="px-2 py-0.5 bg-emerald-100 rounded text-[9px] uppercase tracking-wider">Selling</span>
                <span class="text-slate-400">on floor</span>
            </div>
        </div>

        <div class="glass-panel p-6 flex flex-col justify-between">
            <div class="flex items-start justify-between">
                <div>
                   <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Floor Value</p>
                   <p class="text-4xl font-black text-slate-900 tracking-tighter mt-1">${{ totalActiveValue.toLocaleString() }}</p>
                </div>
                <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <DollarSign class="w-5 h-5" />
                </div>
            </div>
             <div class="mt-4 flex items-center gap-2 text-xs font-bold text-slate-400">
                <span>Est. potential revenue</span>
            </div>
        </div>

        <div class="glass-panel p-6 flex flex-col justify-between group cursor-pointer" @click="router.push('/lottery/settlement')">
            <div class="flex items-start justify-between">
                <div>
                   <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Settlement</p>
                   <p class="text-4xl font-black text-amber-500 tracking-tighter mt-1">{{ pendingSettlementsCount }}</p>
                </div>
                <div class="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                    <AlertTriangle class="w-5 h-5" />
                </div>
            </div>
             <div class="mt-4 flex items-center gap-2 text-xs font-bold text-amber-600">
                <span class="px-2 py-0.5 bg-amber-100 rounded text-[9px] uppercase tracking-wider">Action Req.</span>
                <span class="text-slate-400">Sold Out Books</span>
            </div>
        </div>

        <div class="glass-panel p-6 flex flex-col justify-between group cursor-pointer" @click="router.push('/lottery/inventory')">
            <div class="flex items-start justify-between">
                <div>
                   <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Back Office Stock</p>
                   <p class="text-4xl font-black text-slate-900 tracking-tighter mt-1">{{ inStockCount }}</p>
                </div>
                <div class="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform">
                    <Archive class="w-5 h-5" />
                </div>
            </div>
             <div class="mt-4 flex items-center gap-2 text-xs font-bold text-slate-400">
                <span>Books ready to activate</span>
            </div>
        </div>
    </div>

    <!-- Actions & Feeds -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Main Feed: Active Games -->
        <div class="lg:col-span-2 glass-panel p-6">
            <div class="flex items-center justify-between mb-6">
                <h3 class="text-lg font-bold font-display text-slate-900 uppercase italic">Live Games</h3>
                <button @click="router.push('/lottery/inventory')" class="text-xs font-bold text-primary-600 uppercase tracking-wider hover:underline">Manage Inventory</button>
            </div>

            <div class="overflow-hidden rounded-xl border border-slate-100">
                <table class="w-full text-sm text-left">
                    <thead class="bg-slate-50 text-xs uppercase text-slate-500 font-bold">
                        <tr>
                            <th class="px-4 py-3">Register</th>
                            <th class="px-4 py-3">Book #</th>
                            <th class="px-4 py-3">Game</th>
                            <th class="px-4 py-3 text-right">Remaining</th>
                            <th class="px-4 py-3 text-right">Value</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <tr v-for="book in activeGames.slice(0, 5)" :key="book.id" class="group hover:bg-slate-50 transition-colors">
                            <td class="px-4 py-3 font-mono text-xs text-slate-500 font-bold">
                                {{ book.assignedRegister || 'Unassigned' }}
                            </td>
                            <td class="px-4 py-3 font-mono font-bold text-slate-900">#{{ book.bookNumber }}</td>
                            <td class="px-4 py-3">
                                <div class="font-bold text-slate-700">{{ book.gameName }}</div>
                                <div class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">${{ book.price }} Ticket</div>
                            </td>
                            <td class="px-4 py-3 text-right font-mono text-slate-500">{{ book.remaining }}</td>
                            <td class="px-4 py-3 text-right font-mono font-bold text-emerald-600">${{ (book.remaining * book.price).toFixed(0) }}</td>
                        </tr>
                        <tr v-if="activeGames.length === 0">
                            <td colspan="5" class="px-4 py-8 text-center text-slate-400 text-xs uppercase tracking-widest">No active games on floor</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div class="mt-4 text-center" v-if="activeGames.length > 5">
                <button class="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary-600 transition-colors">View All Active Games</button>
            </div>
        </div>

        <!-- Sales Log Book -->
        <div class="lg:col-span-2 glass-panel p-6">
             <div class="flex items-center justify-between mb-6">
                <h3 class="text-lg font-bold font-display text-slate-900 uppercase italic flex items-center gap-2">
                    <History class="w-5 h-5 text-slate-400" />
                    Sales Log Book
                </h3>
            </div>
            
            <div class="space-y-4">
                <div v-for="day in groupedHistory" :key="day.date" class="border border-slate-100 rounded-xl overflow-hidden">
                    <div 
                        @click="toggleDate(day.date)"
                        class="p-4 bg-slate-50 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                        <div class="flex items-center gap-4">
                            <div class="font-mono font-bold text-slate-900">{{ day.date }}</div>
                            <div class="text-xs text-slate-500 font-bold uppercase tracking-wide">
                                {{ day.items.length }} Entries
                            </div>
                        </div>
                        <div class="flex items-center gap-6">
                             <div class="text-right">
                                <div class="text-[10px] uppercase font-black text-slate-400">Total Sales</div>
                                <div class="font-black text-emerald-600">${{ day.totalSales.toFixed(2) }}</div>
                            </div>
                            <component :is="expandedDate === day.date ? ChevronUp : ChevronDown" class="w-4 h-4 text-slate-400" />
                        </div>
                    </div>

                    <!-- Expanded Details -->
                    <div v-if="expandedDate === day.date" class="border-t border-slate-100">
                        <table class="w-full text-sm text-left">
                             <thead class="bg-white text-[10px] uppercase text-slate-400 font-bold">
                                <tr>
                                    <th class="px-4 py-2">Pack Info</th>
                                    <th class="px-4 py-2 text-center">Tickets Sold</th>
                                    <th class="px-4 py-2 text-right">Sales $</th>
                                    <th class="px-4 py-2 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-50">
                                <tr v-for="entry in day.items" :key="entry.id" class="hover:bg-slate-50/50">
                                    <td class="px-4 py-3">
                                        <div class="flex items-center gap-2">
                                            <span class="font-mono font-bold text-slate-900 text-xs bg-slate-100 px-1.5 py-0.5 rounded">#{{ entry.bookNumber }}</span>
                                            <span class="font-bold text-slate-700 text-xs">{{ entry.gameName }}</span>
                                        </div>
                                    </td>
                                    <td class="px-4 py-3 text-center font-mono text-slate-600 text-xs">{{ entry.soldCount }}</td>
                                    <td class="px-4 py-3 text-right font-mono font-bold text-slate-900 text-xs">${{ entry.salesAmount?.toFixed(2) }}</td>
                                    <td class="px-4 py-3 text-right">
                                         <span v-if="entry.salesAmount > 0" class="text-[9px] font-black uppercase text-emerald-500">Active Sale</span>
                                         <span v-else class="text-[9px] font-black uppercase text-slate-300">No Sales</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div v-if="groupedHistory.length === 0" class="p-8 text-center border-2 border-dashed border-slate-100 rounded-xl">
                    <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">No sales history found</p>
                </div>
            </div>
        </div>

        <!-- Quick Actions -->
        <div class="space-y-4">
            <button @click="router.push('/lottery/inventory')" class="w-full p-4 rounded-2xl bg-white border-2 border-slate-100 hover:border-primary-100 hover:shadow-lg transition-all text-left group">
                <div class="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 mb-3 group-hover:scale-110 transition-transform">
                    <Plus class="w-5 h-5" />
                </div>
                <h4 class="font-bold text-slate-900 uppercase text-sm">Receive Inventory</h4>
                <p class="text-xs text-slate-400 mt-1">Scan new books from delivery</p>
            </button>

            <button @click="router.push('/lottery/settlement')" class="w-full p-4 rounded-2xl bg-white border-2 border-slate-100 hover:border-amber-100 hover:shadow-lg transition-all text-left group">
                <div class="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 mb-3 group-hover:scale-110 transition-transform">
                    <Ticket class="w-5 h-5" />
                </div>
                <h4 class="font-bold text-slate-900 uppercase text-sm">Settle Books</h4>
                <p class="text-xs text-slate-400 mt-1">Finalize sold out packs</p>
            </button>

             <button class="w-full p-4 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg transition-all text-left group flex items-center justify-between">
                <div>
                    <h4 class="font-bold text-white uppercase text-sm">Online Reports</h4>
                    <p class="text-xs text-slate-400 mt-1">Sync terminal data</p>
                </div>
                <ArrowRight class="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
            </button>
        </div>
    </div>
  </div>
</template>
