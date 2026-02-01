import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, updateDoc, doc, query, where, Timestamp } from 'firebase/firestore';
import { useLocationsStore } from './locations';

// --- Interfaces ---

export interface LotteryGame {
    id: string;
    gameNumber: string;
    gameName: string;
    ticketPrice: number;
    ticketsPerBook: number;
    commissionRate: number; // e.g., 0.05 for 5%
    status: 'ACTIVE' | 'INACTIVE';
}

export interface LotteryBook {
    id: string;
    gameId: string;
    gameName: string; // Denormalized for query ease
    bookNumber: string;
    ticketStart: number;
    ticketEnd: number;
    currentTicket: number; // The next ticket to be sold
    status: 'IN_STOCK' | 'ACTIVE' | 'SOLD_OUT' | 'PENDING_SETTLEMENT' | 'SETTLED' | 'ARCHIVED';
    locationId: string;
    assignedRegister?: string;
    receivedDate: Timestamp;
    activationDate?: Timestamp | null;
    settledDate?: Timestamp | null;
}

export interface DailyLotteryCount {
    id: string;
    date: string; // YYYY-MM-DD
    bookId: string;
    expectedRemaining: number;
    physicalRemaining: number;
    variance: number;
    varianceAmount: number;
    reasonCode?: 'MISCOUNT' | 'DAMAGED' | 'THEFT' | 'UNKNOWN';
    locationId: string;
    notes?: string;
    approvedBy?: string;
}

export interface LotterySettlement {
    id: string;
    bookId: string;
    gameName: string;
    bookNumber: string;
    totalTickets: number;
    ticketsSold: number;
    grossSales: number;
    commission: number;
    netDue: number;
    locationId: string;
    settlementDate: Timestamp;
    status: 'PENDING' | 'APPROVED';
}

export interface OnlineLotteryReport {
    id: string;
    reportDate: string; // YYYY-MM-DD
    locationId: string;
    totalSales: number;
    payouts: number;
    commission: number;
    netDue: number;
}

// --- Store ---

export const useLotteryStore = defineStore('lottery', () => {
    // State
    const games = ref<LotteryGame[]>([]);
    const books = ref<LotteryBook[]>([]);
    const dailyCounts = ref<DailyLotteryCount[]>([]);
    const settlements = ref<LotterySettlement[]>([]);
    // const onlineReports = ref<OnlineLotteryReport[]>([]); // Unused
    const loading = ref(false);

    // Getters
    const activeBooks = computed(() => books.value.filter(b => b.status === 'ACTIVE'));
    const inStockBooks = computed(() => books.value.filter(b => b.status === 'IN_STOCK'));
    const pendingSettlements = computed(() => books.value.filter(b => b.status === 'SOLD_OUT' || b.status === 'PENDING_SETTLEMENT'));

    // Actions

    // 1. Games Management
    const fetchGames = async () => {
        loading.value = true;
        try {
            const q = query(collection(db, 'lottery_games'), where('status', '==', 'ACTIVE'));
            const snap = await getDocs(q);
            games.value = snap.docs.map(d => ({ id: d.id, ...d.data() } as LotteryGame));
        } catch (e) {
            console.error('Fetch Games Error:', e);
        } finally {
            loading.value = false;
        }
    };

    const addGame = async (game: Omit<LotteryGame, 'id'>) => {
        try {
            const docRef = await addDoc(collection(db, 'lottery_games'), game);
            await fetchGames();
            return docRef.id;
        } catch (e) {
            console.error('Add Game Error:', e);
            throw e;
        }
    };

    // 2. Inventory (Books)
    const fetchBooks = async () => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        loading.value = true;
        try {
            const q = query(
                collection(db, 'lottery_books'),
                where('locationId', '==', locationsStore.activeLocationId),
                where('status', '!=', 'ARCHIVED')
            );
            const snap = await getDocs(q);
            books.value = snap.docs.map(d => ({ id: d.id, ...d.data() } as LotteryBook));
        } catch (e) {
            console.error('Fetch Books Error:', e);
        } finally {
            loading.value = false;
        }
    };

    const receiveBook = async (book: Omit<LotteryBook, 'id' | 'locationId'>) => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        try {
            await addDoc(collection(db, 'lottery_books'), {
                ...book,
                locationId: locationsStore.activeLocationId
            });
            await fetchBooks();
        } catch (e) {
            console.error('Receive Book Error:', e);
            throw e;
        }
    };

    const activateBook = async (bookId: string, registerId: string) => {
        try {
            const bookRef = doc(db, 'lottery_books', bookId);
            await updateDoc(bookRef, {
                status: 'ACTIVE',
                assignedRegister: registerId,
                activationDate: Timestamp.now()
            });
            await fetchBooks();
        } catch (e) {
            console.error('Activate Book Error:', e);
            throw e;
        }
    };

    // 3. Daily Counts & Reconciliation
    const fetchDailyCounts = async (date: string) => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        try {
            const q = query(
                collection(db, 'lottery_daily_counts'),
                where('locationId', '==', locationsStore.activeLocationId),
                where('date', '==', date)
            );
            const snap = await getDocs(q);
            dailyCounts.value = snap.docs.map(d => ({ id: d.id, ...d.data() } as DailyLotteryCount));
        } catch (e) {
            console.error('Fetch Counts Error:', e);
        }
    };

    const history = ref<DailyLotteryCount[]>([]);

    const fetchHistory = async () => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        try {
            const q = query(
                collection(db, 'lottery_daily_counts'),
                where('locationId', '==', locationsStore.activeLocationId)
            );
            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as DailyLotteryCount));
            // Client-side sort desc by date
            history.value = data.sort((a, b) => b.date.localeCompare(a.date));
        } catch (e) {
            console.error('Fetch History Error:', e);
        }
    };

    const saveDailyCounts = async (counts: Omit<DailyLotteryCount, 'id' | 'locationId'>[]) => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        try {
            for (const count of counts) {
                await addDoc(collection(db, 'lottery_daily_counts'), {
                    ...count,
                    locationId: locationsStore.activeLocationId
                });

                const book = books.value.find(b => b.id === count.bookId);
                if (book) {
                    const newCurrent = book.ticketEnd - count.physicalRemaining;
                    if (newCurrent > book.currentTicket) {
                        const bookRef = doc(db, 'lottery_books', count.bookId);
                        await updateDoc(bookRef, { currentTicket: newCurrent });
                    }
                }
            }
            await fetchBooks();
        } catch (e) {
            console.error('Save Counts Error:', e);
            throw e;
        }
    };

    const markSoldOut = async (bookId: string) => {
        try {
            const bookRef = doc(db, 'lottery_books', bookId);
            await updateDoc(bookRef, {
                status: 'PENDING_SETTLEMENT',
                currentTicket: 0,
            });
            await fetchBooks();
        } catch (e) {
            console.error('Mark Sold Out Error:', e);
            throw e;
        }
    };

    // 4. Settlement
    const settleBook = async (bookId: string, settlementData: Omit<LotterySettlement, 'id' | 'locationId'>) => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        try {
            await addDoc(collection(db, 'lottery_settlements'), {
                ...settlementData,
                locationId: locationsStore.activeLocationId
            });
            const bookRef = doc(db, 'lottery_books', bookId);
            await updateDoc(bookRef, {
                status: 'SETTLED',
                settledDate: Timestamp.now()
            });
            await fetchBooks();
        } catch (e) {
            console.error('Settle Book Error:', e);
            throw e;
        }
    };

    const updateBook = async (bookId: string, updates: Partial<LotteryBook>) => {
        try {
            const bookRef = doc(db, 'lottery_books', bookId);
            await updateDoc(bookRef, updates);
            await fetchBooks();
        } catch (e) {
            console.error('Update Book Error:', e);
            throw e;
        }
    };

    // 5. Online Lottery
    const saveOnlineReport = async (report: Omit<OnlineLotteryReport, 'id' | 'locationId'>) => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        try {
            await addDoc(collection(db, 'online_lottery_reports'), {
                ...report,
                locationId: locationsStore.activeLocationId
            });
        } catch (e) {
            console.error('Save Online Report Error:', e);
            throw e;
        }
    };

    return {
        games,
        books,
        dailyCounts,
        settlements,
        activeBooks,
        inStockBooks,
        pendingSettlements,
        loading,
        fetchGames,
        addGame,
        fetchBooks,
        receiveBook,
        activateBook,
        fetchDailyCounts,
        saveDailyCounts,
        markSoldOut,
        settleBook,
        updateBook,
        saveOnlineReport,
        history,
        fetchHistory
    };
});
