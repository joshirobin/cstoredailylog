<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useLotteryStore, type LotteryBook } from '../../stores/lottery';
import { useAuditStore } from '../../stores/audit';
import BarcodeScanner from '../../components/BarcodeScanner.vue';
import { generatePrintTable, printDocument, exportToCSV } from '../../utils/print';
import { 
  PackagePlus, 
  ArrowRightLeft, 
  Search, 
  AlertTriangle,
  Edit2,
  RotateCcw,
  BarChart3,
  X,
  Printer,
  Download
} from 'lucide-vue-next';
import { Timestamp } from 'firebase/firestore';

const lotteryStore = useLotteryStore();
const auditStore = useAuditStore();

onMounted(async () => {
    await Promise.all([
        lotteryStore.fetchGames(),
        lotteryStore.fetchBooks()
    ]);
});

const activeTab = ref<'receive' | 'assign' | 'return' | 'summary'>('receive');

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
    ticketEnd: 0,
    commissionRate: 5 // Default 5%
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
        newBook.value.commissionRate = existingGame.commissionRate * 100;
    }
};

// Barcode scan handler for game lookup
const handleGameScanned = (scannedValue: string) => {
    newBook.value.gameNumber = scannedValue;
    lookupGame();
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
                commissionRate: (newBook.value.commissionRate || 5) / 100,
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
        
        // Audit log
        await auditStore.logAction(
            'lottery',
            'BOOK_RECEIVED',
            'lottery_book',
            {
                gameNumber: newBook.value.gameNumber,
                gameName: newBook.value.gameName,
                bookNumber: newBook.value.bookNumber,
                ticketStart: tStart,
                ticketEnd: tEnd,
                totalTickets: tEnd - tStart
            }
        );
        
        // Reset form
        newBook.value = {
             gameNumber: '',
             gameName: '',
             ticketPrice: 0,
             ticketsPerBook: 0,
             bookNumber: '',
             ticketStart: 0,
             ticketEnd: 0,
             commissionRate: 5
        };
        alert('Book received successfully!'); 
    } catch (e) {
        console.error(e);
        alert('Failed to receive book');
    }
};

// --- Assign Form ---
const selectedBookId = ref('');
const selectedRegister = ref('reg-1');
const slotNumber = ref('');

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

const handleAssignScan = (scannedValue: string) => {
    // Attempt to find book by bookNumber or maybe full barcode
    // Assuming scannedValue is the book number for now
    const book = lotteryStore.inStockBooks.find(b => b.bookNumber === scannedValue);
    if (book) {
        selectedBookId.value = book.id;
        // Optional: Play success sound or visual feedback
    } else {
        alert(`Book #${scannedValue} not found in stock.`);
    }
};

const handleAssign = async () => {
    if (!selectedBookId.value || !selectedRegister.value) return;
    try {
        const book = lotteryStore.books.find(b => b.id === selectedBookId.value);
        await lotteryStore.activateBook(selectedBookId.value, selectedRegister.value, slotNumber.value);
        
        // Audit log
        if (book) {
            await auditStore.logAction(
                'lottery',
                'BOOK_ACTIVATED',
                'lottery_book',
                {
                    bookNumber: book.bookNumber,
                    gameName: book.gameName,
                    register: selectedRegister.value,
                    slotNumber: slotNumber.value || 'N/A'
                },
                selectedBookId.value
            );
        }
        
        selectedBookId.value = '';
        slotNumber.value = '';
        alert('Book assigned successfully!');
    } catch (e) {
        alert('Failed to assign book');
    }
};

// --- Return logic ---
// --- Return logic ---
const returnNotes = ref('');
const selectedReturnBook = ref<LotteryBook | null>(null);
const returnType = ref<'FULL' | 'PARTIAL'>('FULL');
const returnStartTicket = ref(0);

const openReturnModal = (book: LotteryBook) => {
    selectedReturnBook.value = book;
    returnType.value = 'FULL';
    // Ideally, full return starts from ticketStart? Or current position?
    // Usually "Full" means "I haven't sold any". So ticketStart.
    returnStartTicket.value = book.currentTicket; 
    returnNotes.value = '';
};

const closeReturnModal = () => {
    selectedReturnBook.value = null;
};

const handleReturnScan = (scannedValue: string) => {
    // Attempt to find book
    const book = lotteryStore.books
        .filter(b => b.status === 'IN_STOCK' || b.status === 'PENDING_SETTLEMENT')
        .find(b => b.bookNumber === scannedValue);
        
    if (book) {
        openReturnModal(book);
    } else {
        alert(`Book #${scannedValue} not found or not eligible for return.`);
    }
};

const computedReturnCount = computed(() => {
    if (!selectedReturnBook.value) return 0;
    
    // Logic:
    // Full: Return Entire Pack (TicketStart to TicketEnd)
    // Partial: Return Remaining (StartTicket to TicketEnd)
    
    const start = returnType.value === 'FULL' ? selectedReturnBook.value.ticketStart : returnStartTicket.value;
    const end = selectedReturnBook.value.ticketEnd;
    
    // Ensure logical
    if (start > end) return 0;
    return end - start;
});

const computedCreditValue = computed(() => {
    if (!selectedReturnBook.value) return 0;
    const game = lotteryStore.games.find(g => g.id === selectedReturnBook.value?.gameId);
    if (!game) return 0;
    return computedReturnCount.value * game.ticketPrice;
});

const handleReturnSubmit = async () => {
    if (!selectedReturnBook.value) return;
    try {
        await lotteryStore.returnBook(selectedReturnBook.value.id, {
            returnType: returnType.value,
            startTicket: returnType.value === 'FULL' ? selectedReturnBook.value.ticketStart : returnStartTicket.value,
            endTicket: selectedReturnBook.value.ticketEnd,
            ticketCount: computedReturnCount.value,
            creditAmount: computedCreditValue.value,
            reason: returnNotes.value
        });
        
        // Audit log
        await auditStore.logAction(
            'lottery',
            'BOOK_RETURNED',
            'lottery_book',
            {
                bookNumber: selectedReturnBook.value.bookNumber,
                gameName: selectedReturnBook.value.gameName,
                returnType: returnType.value,
                ticketCount: computedReturnCount.value,
                creditAmount: computedCreditValue.value,
                reason: returnNotes.value
            },
            selectedReturnBook.value.id
        );
        
        alert('Book returned successfully');
        closeReturnModal();
    } catch (e) {
        alert('Failed to return book');
    }
};

// --- Summary logic ---
const inventorySummary = computed(() => {
    const summary: Record<string, any> = {};
    lotteryStore.books.forEach(book => {
        if (!summary[book.gameName]) {
            summary[book.gameName] = { 
                name: book.gameName, 
                inStock: 0, 
                active: 0, 
                settled: 0, 
                returned: 0,
                total: 0
            };
        }
        const s = summary[book.gameName];
        if (book.status === 'IN_STOCK') s.inStock++;
        else if (book.status === 'ACTIVE') s.active++;
        else if (book.status === 'SETTLED') s.settled++;
        else if (book.status === 'RETURNED') s.returned++;
        s.total++;
    });
    return Object.values(summary);
});

// --- Print & Export ---
const handlePrintSummary = () => {
    const headers = ['Game Name', 'In Stock', 'Active', 'Settled', 'Returned', 'Total'];
    const rows = inventorySummary.value.map(s => [
        s.name,
        s.inStock.toString(),
        s.active.toString(),
        s.settled.toString(),
        s.returned.toString(),
        s.total.toString()
    ]);

    const html = generatePrintTable(headers, rows, {
        title: 'Lottery Inventory Summary',
        orientation: 'portrait',
        includeTimestamp: true,
        includeLocation: true
    });

    printDocument(html);
};

const handleExportSummary = () => {
    const headers = ['Game Name', 'In Stock', 'Active', 'Settled', 'Returned', 'Total'];
    const rows = inventorySummary.value.map(s => [
        s.name,
        s.inStock,
        s.active,
        s.settled,
        s.returned,
        s.total
    ]);

    const today = new Date().toISOString().split('T')[0];
    exportToCSV(headers, rows, `lottery-inventory-${today}.csv`);
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
                class="px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all"
                :class="activeTab === 'receive' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'"
            >
                Receive
            </button>
            <button 
                @click="activeTab = 'assign'"
                class="px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all"
                :class="activeTab === 'assign' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'"
            >
                Activate
            </button>
            <button 
                @click="activeTab = 'return'"
                class="px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all"
                :class="activeTab === 'return' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'"
            >
                Return
            </button>
            <button 
                @click="activeTab = 'summary'"
                class="px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all"
                :class="activeTab === 'summary' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'"
            >
                Summary
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

            <!-- Barcode Scanner -->
            <div class="mb-6">
                <BarcodeScanner 
                    button-text="📷 Scan Game Number" 
                    @scanned="handleGameScanned"
                />
            </div>

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
                     <div class="grid grid-cols-3 gap-4">
                        <div>
                            <label class="label text-xs font-bold uppercase text-slate-500">Price</label>
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
                            <label class="label text-xs font-bold uppercase text-slate-500">Tix / Pack</label>
                             <input 
                                type="number" 
                                v-model.number="newBook.ticketsPerBook" 
                                class="input-field w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900" 
                            />
                        </div>
                        <div>
                            <label class="label text-xs font-bold uppercase text-slate-500">Comm %</label>
                            <div class="relative">
                                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                                <input 
                                    type="number" 
                                    v-model.number="newBook.commissionRate" 
                                    class="input-field w-full p-3 pr-8 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900" 
                                />
                            </div>
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
                        
                        <!-- Scanner Helper -->
                        <div class="mb-2">
                             <BarcodeScanner 
                                button-text="Scan Book to Select" 
                                @scanned="handleAssignScan"
                                :stop-on-scan="true"
                            />
                        </div>

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
                     <div>
                        <label class="label text-xs font-bold uppercase text-slate-500">Slot Number (Optional)</label>
                        <input 
                            type="text" 
                            v-model="slotNumber" 
                            placeholder="e.g. A-14, 05, etc."
                            class="input-field w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900" 
                        />
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

        <!-- Inventory List (Only for Assign Tab) -->
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

    <!-- Return Panel -->
    <div v-if="activeTab === 'return'" class="space-y-6">
        <div class="glass-panel p-8">
            <h3 class="text-lg font-bold font-display text-slate-900 uppercase italic flex items-center gap-2 mb-6">
                <RotateCcw class="w-5 h-5 text-rose-600" />    
                Return Books to Lottery Office
            </h3>
            
            <div class="mb-6">
                <BarcodeScanner 
                    button-text="Scan Book to Return" 
                    @scanned="handleReturnScan"
                    :stop-on-scan="true"
                />
            </div>
            
            <div class="overflow-hidden rounded-xl border border-slate-100">
                <table class="w-full text-sm text-left">
                    <thead class="bg-slate-50 text-xs uppercase text-slate-500 font-bold">
                        <tr>
                            <th class="px-6 py-4">Book #</th>
                            <th class="px-6 py-4">Game</th>
                            <th class="px-6 py-4">Current Status</th>
                            <th class="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <tr v-for="book in lotteryStore.books.filter(b => b.status === 'IN_STOCK' || b.status === 'PENDING_SETTLEMENT')" :key="book.id">
                            <td class="px-6 py-4 font-mono font-bold text-slate-900">#{{ book.bookNumber }}</td>
                            <td class="px-6 py-4">{{ book.gameName }}</td>
                            <td class="px-6 py-4">
                                <span class="px-2 py-1 rounded bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-wider">{{ book.status }}</span>
                            </td>
                            <td class="px-6 py-4 text-right">
                                <button @click="openReturnModal(book)" class="px-4 py-2 bg-rose-50 text-rose-600 text-xs font-bold rounded-lg hover:bg-rose-100 transition-colors">Return Pack</button>
                            </td>
                        </tr>
                        <tr v-if="lotteryStore.books.filter(b => b.status === 'IN_STOCK' || b.status === 'PENDING_SETTLEMENT').length === 0">
                            <td colspan="4" class="px-6 py-8 text-center text-slate-400 text-xs uppercase tracking-widest">No returnable stock available</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Return Details Modal (Inline Overlay for now or just panel below) -->
            <div v-if="selectedReturnBook" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                <div class="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                    <div class="p-6 border-b border-slate-100 flex justify-between items-center">
                        <div>
                            <h3 class="text-lg font-bold text-slate-900">Return Details</h3>
                            <p class="text-sm text-slate-500">Processing return for <span class="font-mono font-bold text-slate-900">#{{ selectedReturnBook.bookNumber }}</span></p>
                        </div>
                        <button @click="closeReturnModal" class="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600">
                            <X class="w-5 h-5" />
                        </button>
                    </div>
                    
                    <div class="p-6 space-y-6">
                        <!-- Return Type -->
                        <div class="grid grid-cols-2 gap-4">
                            <label class="cursor-pointer">
                                <input type="radio" v-model="returnType" value="FULL" class="peer sr-only" />
                                <div class="p-4 rounded-xl border-2 border-slate-100 peer-checked:border-rose-500 peer-checked:bg-rose-50 transition-all text-center">
                                    <span class="block font-bold text-slate-900 peer-checked:text-rose-700">Full Pack</span>
                                    <span class="text-[10px] text-slate-400 uppercase tracking-wider">Unsold / Damaged</span>
                                </div>
                            </label>
                            <label class="cursor-pointer">
                                <input type="radio" v-model="returnType" value="PARTIAL" class="peer sr-only" />
                                <div class="p-4 rounded-xl border-2 border-slate-100 peer-checked:border-rose-500 peer-checked:bg-rose-50 transition-all text-center">
                                    <span class="block font-bold text-slate-900 peer-checked:text-rose-700">Partial Pack</span>
                                    <span class="text-[10px] text-slate-400 uppercase tracking-wider">Remaining Tickets</span>
                                </div>
                            </label>
                        </div>

                        <!-- Ticket Range -->
                        <div v-if="returnType === 'PARTIAL'" class="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <label class="label text-xs font-bold uppercase text-slate-500 mb-2 block">Returning From Ticket #</label>
                            <div class="flex items-center gap-4">
                                <input 
                                    type="number" 
                                    v-model.number="returnStartTicket" 
                                    class="input-field flex-1 p-3 rounded-xl border border-slate-200 font-bold text-slate-900"
                                />
                                <span class="text-slate-400 font-bold">to {{ selectedReturnBook.ticketEnd }}</span>
                            </div>
                            <p class="text-xs text-slate-400 mt-2">
                                Returning <span class="font-bold text-rose-600">{{ computedReturnCount }}</span> tickets
                            </p>
                        </div>

                        <!-- Credit Calculation -->
                        <div class="flex items-center justify-between p-4 bg-rose-50 rounded-xl border border-rose-100">
                            <span class="text-xs font-bold text-rose-700 uppercase tracking-wider">Est. Credit Value</span>
                            <span class="text-2xl font-black text-rose-600">${{ computedCreditValue.toFixed(2) }}</span>
                        </div>

                        <!-- Notes -->
                        <div>
                             <label class="label text-xs font-bold uppercase text-slate-500">Reason / Notes</label>
                             <input type="text" v-model="returnNotes" placeholder="e.g. Game Ended, Damaged, Theft" class="input-field w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900" />
                        </div>
                    </div>

                    <div class="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
                        <button @click="closeReturnModal" class="flex-1 py-3 font-bold text-slate-500 hover:bg-white rounded-xl">Cancel</button>
                        <button @click="handleReturnSubmit" class="flex-1 py-3 font-bold bg-rose-600 text-white rounded-xl shadow-lg shadow-rose-500/30 hover:bg-rose-700">
                            Confirm Return
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Returned History -->
        <div class="glass-panel p-4">
             <h4 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Recently Returned Packs</h4>
             <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div v-for="book in lotteryStore.returnedBooks" :key="book.id" class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                     <div class="flex items-center justify-between">
                         <span class="font-mono font-bold text-slate-900">#{{ book.bookNumber }}</span>
                         <span class="text-[9px] font-black text-rose-400 uppercase tracking-widest">Returned</span>
                     </div>
                     <p class="text-[10px] text-slate-500 mt-1 uppercase">{{ book.gameName }}</p>
                 </div>
             </div>
        </div>
    </div>

    <!-- Summary Panel -->
    <div v-if="activeTab === 'summary'" class="space-y-6">
        <div class="glass-panel p-8">
            <div class="flex items-center justify-between mb-6">
                <h3 class="text-lg font-bold font-display text-slate-900 uppercase italic flex items-center gap-2">
                    <BarChart3 class="w-5 h-5 text-emerald-600" />    
                    Total Inventory Summary
                </h3>
                
                <!-- Print & Export Buttons -->
                <div class="flex items-center gap-2">
                    <button 
                        @click="handlePrintSummary"
                        class="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 flex items-center gap-2 text-sm font-bold transition-colors"
                    >
                        <Printer class="w-4 h-4" />
                        Print
                    </button>
                    <button 
                        @click="handleExportSummary"
                        class="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 flex items-center gap-2 text-sm font-bold transition-colors"
                    >
                        <Download class="w-4 h-4" />
                        Export CSV
                    </button>
                </div>
            </div>

            <div class="overflow-hidden rounded-2xl border border-slate-100">
                <table class="w-full text-sm text-left">
                    <thead class="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-widest">
                        <tr>
                            <th class="px-6 py-4">Game Name</th>
                            <th class="px-6 py-4 text-center">In Stock</th>
                            <th class="px-6 py-4 text-center">Active</th>
                            <th class="px-6 py-4 text-center">Settled</th>
                            <th class="px-6 py-4 text-center">Returned</th>
                            <th class="px-6 py-4 text-right">Grand Total</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <tr v-for="s in inventorySummary" :key="s.name" class="hover:bg-slate-50 transition-colors">
                            <td class="px-6 py-4 font-bold text-slate-900">{{ s.name }}</td>
                            <td class="px-6 py-4 text-center font-mono text-slate-500">{{ s.inStock }}</td>
                            <td class="px-6 py-4 text-center font-mono text-emerald-600 font-bold">{{ s.active }}</td>
                            <td class="px-6 py-4 text-center font-mono text-slate-500">{{ s.settled }}</td>
                            <td class="px-6 py-4 text-center font-mono text-rose-400">{{ s.returned }}</td>
                            <td class="px-6 py-4 text-right font-mono font-black text-slate-900">{{ s.total }}</td>
                        </tr>
                    </tbody>
                    <tfoot class="bg-slate-50">
                        <tr class="font-black text-slate-900 uppercase text-[10px]">
                            <td class="px-6 py-4">Company Totals</td>
                            <td class="px-6 py-4 text-center">{{ inventorySummary.reduce((sum, s) => sum + s.inStock, 0) }}</td>
                            <td class="px-6 py-4 text-center text-emerald-600">{{ inventorySummary.reduce((sum, s) => sum + s.active, 0) }}</td>
                            <td class="px-6 py-4 text-center">{{ inventorySummary.reduce((sum, s) => sum + s.settled, 0) }}</td>
                            <td class="px-6 py-4 text-center text-rose-400">{{ inventorySummary.reduce((sum, s) => sum + s.returned, 0) }}</td>
                            <td class="px-6 py-4 text-right text-lg tracking-tighter italic">
                                {{ inventorySummary.reduce((sum, s) => sum + s.total, 0) }}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <!-- Visual Breakdown (Glass Cards) -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                <div class="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm text-center">
                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">In Stock</p>
                    <p class="text-2xl font-black text-slate-900 tracking-tighter">{{ inventorySummary.reduce((sum, s) => sum + s.inStock, 0) }}</p>
                </div>
                <div class="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 shadow-sm text-center">
                    <p class="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Active</p>
                    <p class="text-2xl font-black text-emerald-600 tracking-tighter">{{ inventorySummary.reduce((sum, s) => sum + s.active, 0) }}</p>
                </div>
                <div class="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm text-center">
                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Settled</p>
                    <p class="text-2xl font-black text-slate-900 tracking-tighter">{{ inventorySummary.reduce((sum, s) => sum + s.settled, 0) }}</p>
                </div>
                <div class="p-4 rounded-2xl bg-rose-50 border border-rose-100 shadow-sm text-center">
                    <p class="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-1">Returned</p>
                    <p class="text-2xl font-black text-rose-600 tracking-tighter">{{ inventorySummary.reduce((sum, s) => sum + s.returned, 0) }}</p>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>
