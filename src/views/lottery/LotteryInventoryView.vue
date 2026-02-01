<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useLotteryStore, type LotteryBook } from '../../stores/lottery';
import { 
  PackagePlus, 
  ArrowRightLeft, 
  Search, 
  AlertTriangle,
  Edit2
} from 'lucide-vue-next';
import { Timestamp } from 'firebase/firestore';

const lotteryStore = useLotteryStore();

onMounted(async () => {
    await Promise.all([
        lotteryStore.fetchGames(),
        lotteryStore.fetchBooks()
    ]);
});

const activeTab = ref<'receive' | 'assign'>('receive');

// --- Edit Form ---
const editingBook = ref<Partial<LotteryBook> | null>(null);
const isEditing = ref(false);

// --- Receive Form ---
const newBook = ref({
    gameNumber: '',
    gameName: '',
    ticketPrice: 0,
    ticketsPerBook: 0,
    bookNumber: '',
    ticketStart: 0,
    ticketEnd: 0
});

const totalValue = computed(() => {
    return (newBook.value.ticketPrice || 0) * (newBook.value.ticketsPerBook || 0);
});

// Auto-lookup game details when Game Number is entered
const lookupGame = () => {
    const existingGame = lotteryStore.games.find(g => g.gameNumber === newBook.value.gameNumber);
    if (existingGame) {
        newBook.value.gameName = existingGame.gameName;
        newBook.value.ticketPrice = existingGame.ticketPrice;
        newBook.value.ticketsPerBook = existingGame.ticketsPerBook;
        // Default range
        newBook.value.ticketStart = 0;
        newBook.value.ticketEnd = existingGame.ticketsPerBook;
    }
};

const handleReceive = async () => {
    if (!newBook.value.gameNumber || !newBook.value.bookNumber) return;

    try {
        // 1. Find or Create Game
        let gameId = '';
        const existingGame = lotteryStore.games.find(g => g.gameNumber === newBook.value.gameNumber);
        
        if (existingGame) {
            gameId = existingGame.id;
        } else {
            // Create new game on the fly
            gameId = await lotteryStore.addGame({
                gameNumber: newBook.value.gameNumber,
                gameName: newBook.value.gameName || 'Unknown Game',
                ticketPrice: newBook.value.ticketPrice || 0,
                ticketsPerBook: newBook.value.ticketsPerBook || 0,
                commissionRate: 0.05, // Default
                status: 'ACTIVE'
            });
        }

        if (!gameId) {
            alert('Error identifying game. Please try again.');
            return;
        }

        // 2. Receive Book
        // Use manually entered Start/End if modified, otherwise default logic
        const tStart = newBook.value.ticketStart;
        const tEnd = newBook.value.ticketEnd || newBook.value.ticketsPerBook;

        await lotteryStore.receiveBook({
            gameId: gameId,
            gameName: newBook.value.gameName,
            bookNumber: newBook.value.bookNumber,
            ticketStart: tStart,
            ticketEnd: tEnd,
            currentTicket: tStart,
            status: 'IN_STOCK',
            receivedDate: Timestamp.now()
        });
        
        // Reset form
        newBook.value.bookNumber = '';
        alert('Book received successfully!'); 
    } catch (e) {
        console.error(e);
        alert('Failed to receive book');
    }
};

// --- Assign Form ---
const selectedBookId = ref('');
const selectedRegister = ref('reg-1');

const startEdit = (book: LotteryBook) => {
    editingBook.value = { ...book };
    isEditing.value = true;
};

const saveEdit = async () => {
    if (!editingBook.value || !editingBook.value.id) return;
    
    try {
        await lotteryStore.updateBook(editingBook.value.id, {
            bookNumber: editingBook.value.bookNumber,
            gameName: editingBook.value.gameName,
            ticketStart: editingBook.value.ticketStart,
            ticketEnd: editingBook.value.ticketEnd,
            currentTicket: editingBook.value.currentTicket
        });
        isEditing.value = false;
        editingBook.value = null;
        alert('Book updated successfully');
    } catch (e) {
        console.error(e);
        alert('Failed to update book');
    }
};

const cancelEdit = () => {
    isEditing.value = false;
    editingBook.value = null;
};

// --- Lists ---
const booksQuery = ref('');
const filteredStock = computed(() => {
    return lotteryStore.inStockBooks.filter(b => 
        b.bookNumber.includes(booksQuery.value) || 
        b.gameName.toLowerCase().includes(booksQuery.value.toLowerCase())
    );
});

const handleAssign = async () => {
    if (!selectedBookId.value || !selectedRegister.value) return;
    try {
        await lotteryStore.activateBook(selectedBookId.value, selectedRegister.value);
        selectedBookId.value = '';
        alert('Book assigned successfully!');
    } catch (e) {
        alert('Failed to assign book');
    }
};
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-8 pb-12">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 class="text-3xl font-black font-display text-slate-900 uppercase italic tracking-tighter">Inventory Control</h2>
           <p class="text-slate-500 font-bold uppercase tracking-widest text-xs mt-1">Receive & Activate Stock</p>
        </div>

        <div class="bg-slate-100 p-1 rounded-xl flex items-center">
            <button 
                @click="activeTab = 'receive'"
                class="px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all"
                :class="activeTab === 'receive' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'"
            >
                Receive Stock
            </button>
            <button 
                @click="activeTab = 'assign'"
                class="px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all"
                :class="activeTab === 'assign' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'"
            >
                Activate Book
            </button>
        </div>
    </div>

    <!-- Receive Panel -->
    <div v-if="activeTab === 'receive'" class="space-y-6">
        <div class="glass-panel p-8">
            <h3 class="text-lg font-bold font-display text-slate-900 uppercase italic flex items-center gap-2 mb-6">
                <PackagePlus class="w-5 h-5 text-primary-600" />    
                Scan New Delivery
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Manual Entry Form -->
                <div class="space-y-4">
                    <!-- Game Info Row -->
                     <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="label text-xs font-bold uppercase text-slate-500">Game #</label>
                            <input 
                                type="text" 
                                v-model="newBook.gameNumber" 
                                @blur="lookupGame"
                                placeholder="000"
                                class="input-field w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900 focus:ring-2 focus:ring-primary-500" 
                            />
                        </div>
                        <div>
                            <label class="label text-xs font-bold uppercase text-slate-500">Game Name</label>
                            <input 
                                type="text" 
                                v-model="newBook.gameName" 
                                placeholder="e.g. Lucky 7s"
                                class="input-field w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900" 
                            />
                        </div>
                    </div>

                    <!-- Pack & Price Row -->
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="label text-xs font-bold uppercase text-slate-500">Pack #</label>
                            <input 
                                type="text" 
                                v-model="newBook.bookNumber" 
                                placeholder="Scan Pack Barcode"
                                class="input-field w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900" 
                            />
                        </div>
                         <div>
                            <label class="label text-xs font-bold uppercase text-slate-500">Pack Cost ($)</label>
                            <div class="p-3 rounded-xl bg-slate-100 font-bold text-slate-500 border border-slate-200">
                                ${{ totalValue.toFixed(2) }}
                            </div>
                        </div>
                    </div>

                    <!-- Metrics Row -->
                     <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="label text-xs font-bold uppercase text-slate-500">Ticket Price</label>
                            <div class="relative">
                                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                <input 
                                    type="number" 
                                    v-model.number="newBook.ticketPrice" 
                                    class="input-field w-full pl-6 p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900" 
                                />
                            </div>
                        </div>
                        <div>
                            <label class="label text-xs font-bold uppercase text-slate-500">Tickets / Pack</label>
                             <input 
                                type="number" 
                                v-model.number="newBook.ticketsPerBook" 
                                class="input-field w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900" 
                            />
                        </div>
                    </div>

                    <!-- Range Row -->
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="label text-xs font-bold uppercase text-slate-500">Begin #</label>
                            <input 
                                type="number" 
                                v-model.number="newBook.ticketStart" 
                                class="input-field w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900" 
                            />
                        </div>
                        <div>
                            <label class="label text-xs font-bold uppercase text-slate-500">End #</label>
                             <input 
                                type="number" 
                                v-model.number="newBook.ticketEnd" 
                                class="input-field w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900" 
                            />
                        </div>
                    </div>

                    <button @click="handleReceive" :disabled="!newBook.gameNumber || !newBook.bookNumber" class="btn-primary w-full py-3 flex items-center justify-center gap-2 font-black uppercase tracking-wider text-xs mt-4">
                        Confirm Receive
                    </button>
                </div>

                <!-- Recent Activity Feed (Mock) -->
                <div class="border-l border-slate-100 pl-6 hidden md:block">
                     <h4 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Stock Overview</h4>
                     <div class="space-y-2">
                        <div class="flex justify-between items-center p-3 bg-slate-50 rounded-xl group" v-for="book in lotteryStore.inStockBooks" :key="book.id">
                            <div>
                                <div class="font-bold text-slate-900 text-sm">#{{ book.bookNumber }}</div>
                                <div class="text-[10px] text-slate-500 uppercase">{{ book.gameName }}</div>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="px-2 py-1 bg-slate-200 text-slate-600 rounded text-[9px] font-bold uppercase">In Stock</span>
                                <button @click="startEdit(book)" class="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded transition-all text-slate-500">
                                    <Edit2 class="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                     </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Edit Modal -->
    <div v-if="isEditing && editingBook" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full space-y-6">
            <h3 class="text-xl font-black font-display text-slate-900 italic uppercase">Edit Book Details</h3>
            
            <div class="space-y-4">
                <div>
                    <label class="label text-xs font-bold uppercase text-slate-500">Book / Pack #</label>
                    <input type="text" v-model="editingBook.bookNumber" class="input-field w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900" />
                </div>
                 <div>
                    <label class="label text-xs font-bold uppercase text-slate-500">Game Name</label>
                    <input type="text" v-model="editingBook.gameName" class="input-field w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900" />
                </div>
                <div class="grid grid-cols-2 gap-4">
                     <div>
                        <label class="label text-xs font-bold uppercase text-slate-500">Begin #</label>
                        <input type="number" v-model.number="editingBook.currentTicket" class="input-field w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900" />
                    </div>
                     <div>
                        <label class="label text-xs font-bold uppercase text-slate-500">End #</label>
                        <input type="number" v-model.number="editingBook.ticketEnd" class="input-field w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900" />
                    </div>
                </div>
            </div>

            <div class="flex gap-4 pt-4">
                <button @click="cancelEdit" class="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl">Cancel</button>
                <button @click="saveEdit" class="flex-1 py-3 font-bold bg-primary-600 text-white rounded-xl shadow-lg shadow-primary-500/30 hover:bg-primary-700">Save Changes</button>
            </div>
        </div>
    </div>

    <!-- Assign Panel -->
    <div v-if="activeTab === 'assign'" class="space-y-6">
        <div class="glass-panel p-8">
            <h3 class="text-lg font-bold font-display text-slate-900 uppercase italic flex items-center gap-2 mb-6">
                <ArrowRightLeft class="w-5 h-5 text-primary-600" />    
                Assign to Register
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-4">
                     <div>
                        <label class="label text-xs font-bold uppercase text-slate-500">Select Book from Inventory</label>
                        <select v-model="selectedBookId" class="input-field w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900">
                            <option value="">Select in-stock book...</option>
                            <option v-for="book in lotteryStore.inStockBooks" :key="book.id" :value="book.id">
                                #{{ book.bookNumber }} - {{ book.gameName }}
                            </option>
                        </select>
                    </div>
                     <div>
                        <label class="label text-xs font-bold uppercase text-slate-500">Assign To Location</label>
                        <select v-model="selectedRegister" class="input-field w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900">
                             <option value="reg-1">Register 1</option>
                             <option value="reg-2">Register 2</option>
                             <option value="bin-1">Counter Bin 1</option>
                             <option value="machine-1">Vending Machine</option>
                        </select>
                    </div>

                    <button @click="handleAssign" :disabled="!selectedBookId" class="btn-primary w-full py-3 flex items-center justify-center gap-2 font-black uppercase tracking-wider text-xs bg-slate-900 hover:bg-slate-800">
                        Activate Book
                    </button>
                </div>

                 <div class="bg-amber-50 rounded-xl p-6 border border-amber-100">
                    <div class="flex items-start gap-4">
                        <AlertTriangle class="w-6 h-6 text-amber-500 shrink-0" />
                        <div>
                            <h4 class="font-bold text-amber-900">Activation Note</h4>
                            <p class="text-sm text-amber-800 mt-1 leading-relaxed">
                                Once activated, this book will immediately appear in the Daily Reconciliation for sales tracking.
                                Ensure the book is physically placed in the correct slot.
                            </p>
                        </div>
                    </div>
                 </div>
            </div>
        </div>

        <!-- Inventory List -->
        <div class="glass-panel overflow-hidden">
            <div class="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 class="font-bold text-slate-900">Back Room Inventory</h3>
                <div class="relative">
                    <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input v-model="booksQuery" type="text" placeholder="Search books..." class="pl-9 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-100 w-64" />
                </div>
            </div>
            <table class="w-full text-sm text-left">
                <thead class="bg-slate-50 text-xs uppercase text-slate-500 font-bold">
                    <tr>
                        <th class="px-6 py-4">Book #</th>
                        <th class="px-6 py-4">Game</th>
                        <th class="px-6 py-4">Status</th>
                        <th class="px-6 py-4 text-right">Start Ticket</th>
                        <th class="px-6 py-4 text-right">Received</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <tr v-for="book in filteredStock" :key="book.id" class="hover:bg-slate-50 transition-colors">
                        <td class="px-6 py-4 font-mono font-bold text-slate-900">#{{ book.bookNumber }}</td>
                        <td class="px-6 py-4 font-medium">{{ book.gameName }}</td>
                        <td class="px-6 py-4">
                            <span class="px-2 py-1 rounded bg-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider">In Stock</span>
                        </td>
                        <td class="px-6 py-4 text-right font-mono text-slate-500">{{ book.ticketStart }}</td>
                        <td class="px-6 py-4 text-right text-xs text-slate-500">{{ book.receivedDate?.toDate().toLocaleDateString() }}</td>
                    </tr>
                    <tr v-if="filteredStock.length === 0">
                        <td colspan="5" class="px-6 py-8 text-center text-slate-400 text-xs uppercase tracking-widest">No stock matches filter</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
  </div>
</template>
