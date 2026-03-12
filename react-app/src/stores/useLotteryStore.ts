import { create } from 'zustand';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, updateDoc, doc, query, where, Timestamp, orderBy } from 'firebase/firestore';
import { useLocationsStore } from './useLocationsStore';

export interface LotteryGame {
    id: string;
    gameNumber: string;
    gameName: string;
    ticketPrice: number;
    ticketsPerBook: number;
    commissionRate: number;
    status: 'ACTIVE' | 'INACTIVE';
}

export interface LotteryBook {
    id: string;
    gameId: string;
    gameName: string;
    bookNumber: string;
    slotNumber?: string;
    ticketStart: number;
    ticketEnd: number;
    currentTicket: number;
    status: 'IN_STOCK' | 'ACTIVE' | 'SOLD_OUT' | 'PENDING_SETTLEMENT' | 'SETTLED' | 'ARCHIVED' | 'RETURNED';
    locationId: string;
    assignedRegister?: string;
    receivedDate: any;
    activationDate?: any | null;
    settledDate?: any | null;
    returnInfo?: {
        returnDate: any;
        returnType: 'FULL' | 'PARTIAL';
        startTicket: number;
        endTicket: number;
        ticketCount: number;
        creditAmount: number;
        reason?: string;
    };
}

export interface DailyLotteryCount {
    id: string;
    date: string;
    bookId: string;
    expectedRemaining: number;
    physicalRemaining: number;
    variance: number;
    varianceAmount: number;
    reasonCode?: 'MISCOUNT' | 'DAMAGED' | 'THEFT' | 'UNKNOWN';
    locationId: string;
    notes?: string;
    approvedBy?: string;
    soldCount?: number;
    salesAmount?: number;
    slotNumber?: string;
    bookNumber?: string;
    gameName?: string;
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
    settlementDate: any;
    status: 'PENDING' | 'APPROVED';
}

interface LotteryState {
    games: LotteryGame[];
    books: LotteryBook[];
    dailyCounts: DailyLotteryCount[];
    settlements: LotterySettlement[];
    history: DailyLotteryCount[];
    loading: boolean;
    activeBooks: () => LotteryBook[];
    inStockBooks: () => LotteryBook[];
    pendingSettlements: () => LotteryBook[];
    returnedBooks: () => LotteryBook[];
    fetchGames: () => Promise<void>;
    fetchBooks: () => Promise<void>;
    addGame: (game: Omit<LotteryGame, 'id'>) => Promise<string>;
    receiveBook: (book: Omit<LotteryBook, 'id' | 'locationId'>) => Promise<void>;
    activateBook: (bookId: string, registerId: string, slotNumber?: string) => Promise<void>;
    updateBook: (bookId: string, updates: Partial<LotteryBook>) => Promise<void>;
    returnBook: (bookId: string, returnData: any) => Promise<void>;
    fetchDailyCounts: (date: string) => Promise<void>;
    fetchHistory: () => Promise<void>;
    saveDailyCounts: (counts: Omit<DailyLotteryCount, 'id' | 'locationId'>[]) => Promise<void>;
    markSoldOut: (bookId: string) => Promise<void>;
    settleBook: (bookId: string, settlementData: Omit<LotterySettlement, 'id' | 'locationId'>) => Promise<void>;
    fetchSettlements: () => Promise<void>;
}

export const useLotteryStore = create<LotteryState>((set, get) => ({
    games: [],
    books: [],
    dailyCounts: [],
    settlements: [],
    history: [],
    loading: false,

    activeBooks: () => get().books.filter(b => b.status === 'ACTIVE'),
    inStockBooks: () => get().books.filter(b => b.status === 'IN_STOCK'),
    pendingSettlements: () => get().books.filter(b => b.status === 'SOLD_OUT' || b.status === 'PENDING_SETTLEMENT'),
    returnedBooks: () => get().books.filter(b => b.status === 'RETURNED'),

    fetchGames: async () => {
        set({ loading: true });
        try {
            const q = query(collection(db, 'lottery_games'), where('status', '==', 'ACTIVE'));
            const snap = await getDocs(q);
            set({ games: snap.docs.map(d => ({ id: d.id, ...d.data() } as LotteryGame)) });
        } catch (e) {
            console.error('Fetch Games Error:', e);
        } finally {
            set({ loading: false });
        }
    },

    fetchBooks: async () => {
        const activeLocationId = useLocationsStore.getState().activeLocationId;
        if (!activeLocationId) return;

        set({ loading: true });
        try {
            const q = query(
                collection(db, 'lottery_books'),
                where('locationId', '==', activeLocationId),
                where('status', '!=', 'ARCHIVED')
            );
            const snap = await getDocs(q);
            set({ books: snap.docs.map(d => ({ id: d.id, ...d.data() } as LotteryBook)) });
        } catch (e) {
            console.error('Fetch Books Error:', e);
        } finally {
            set({ loading: false });
        }
    },

    addGame: async (game) => {
        try {
            const docRef = await addDoc(collection(db, 'lottery_games'), game);
            get().fetchGames();
            return docRef.id;
        } catch (e) {
            console.error('Add Game Error:', e);
            throw e;
        }
    },

    receiveBook: async (book) => {
        const activeLocationId = useLocationsStore.getState().activeLocationId;
        if (!activeLocationId) return;

        try {
            await addDoc(collection(db, 'lottery_books'), {
                ...book,
                locationId: activeLocationId,
                receivedDate: Timestamp.now()
            });
            get().fetchBooks();
        } catch (e) {
            console.error('Receive Book Error:', e);
            throw e;
        }
    },

    activateBook: async (bookId, registerId, slotNumber) => {
        try {
            const bookRef = doc(db, 'lottery_books', bookId);
            await updateDoc(bookRef, {
                status: 'ACTIVE',
                assignedRegister: registerId,
                slotNumber: slotNumber || null,
                activationDate: Timestamp.now()
            });
            get().fetchBooks();
        } catch (e) {
            console.error('Activate Book Error:', e);
            throw e;
        }
    },

    updateBook: async (bookId, updates) => {
        try {
            const bookRef = doc(db, 'lottery_books', bookId);
            await updateDoc(bookRef, updates);
            get().fetchBooks();
        } catch (e) {
            console.error('Update Book Error:', e);
            throw e;
        }
    },

    returnBook: async (bookId, returnData) => {
        try {
            const bookRef = doc(db, 'lottery_books', bookId);
            await updateDoc(bookRef, {
                status: 'RETURNED',
                returnInfo: {
                    ...returnData,
                    returnDate: Timestamp.now()
                }
            });
            get().fetchBooks();
        } catch (e) {
            console.error('Return Book Error:', e);
            throw e;
        }
    },

    fetchDailyCounts: async (date) => {
        const activeLocationId = useLocationsStore.getState().activeLocationId;
        if (!activeLocationId) return;

        try {
            const q = query(
                collection(db, 'lottery_daily_counts'),
                where('locationId', '==', activeLocationId),
                where('date', '==', date)
            );
            const snap = await getDocs(q);
            set({ dailyCounts: snap.docs.map(d => ({ id: d.id, ...d.data() } as DailyLotteryCount)) });
        } catch (e) {
            console.error('Fetch Counts Error:', e);
        }
    },

    fetchHistory: async () => {
        const activeLocationId = useLocationsStore.getState().activeLocationId;
        if (!activeLocationId) return;

        try {
            const q = query(
                collection(db, 'lottery_daily_counts'),
                where('locationId', '==', activeLocationId),
                orderBy('date', 'desc')
            );
            const snap = await getDocs(q);
            set({ history: snap.docs.map(d => ({ id: d.id, ...d.data() } as DailyLotteryCount)) });
        } catch (e) {
            // Fallback if index is building or something
            console.error('Fetch History Error:', e);
            const q2 = query(
                collection(db, 'lottery_daily_counts'),
                where('locationId', '==', activeLocationId)
            );
            const snap2 = await getDocs(q2);
            const sorted = snap2.docs.map(d => ({ id: d.id, ...d.data() } as DailyLotteryCount))
                .sort((a, b) => b.date.localeCompare(a.date));
            set({ history: sorted });
        }
    },

    saveDailyCounts: async (counts) => {
        const activeLocationId = useLocationsStore.getState().activeLocationId;
        if (!activeLocationId) return;

        try {
            for (const count of counts) {
                await addDoc(collection(db, 'lottery_daily_counts'), {
                    ...count,
                    locationId: activeLocationId
                });

                const book = get().books.find(b => b.id === count.bookId);
                if (book) {
                    const newCurrent = (count as any).physicalRemaining !== undefined ? (book.ticketEnd - count.physicalRemaining) : (count as any).endTicket || book.currentTicket;

                    if (newCurrent >= book.currentTicket) {
                        const bookRef = doc(db, 'lottery_books', count.bookId);
                        const updates: any = { currentTicket: newCurrent };

                        if (newCurrent >= book.ticketEnd) {
                            updates.status = 'SOLD_OUT';
                        }

                        await updateDoc(bookRef, updates);
                    }
                }
            }
            get().fetchBooks();
        } catch (e) {
            console.error('Save Counts Error:', e);
            throw e;
        }
    },

    markSoldOut: async (bookId: string) => {
        try {
            const bookRef = doc(db, 'lottery_books', bookId);
            await updateDoc(bookRef, {
                status: 'PENDING_SETTLEMENT'
            });
            get().fetchBooks();
        } catch (e) {
            console.error('Mark Sold Out Error:', e);
            throw e;
        }
    },

    settleBook: async (bookId, settlementData) => {
        const activeLocationId = useLocationsStore.getState().activeLocationId;
        if (!activeLocationId) return;

        try {
            await addDoc(collection(db, 'lottery_settlements'), {
                ...settlementData,
                locationId: activeLocationId,
                settlementDate: Timestamp.now()
            });
            const bookRef = doc(db, 'lottery_books', bookId);
            await updateDoc(bookRef, {
                status: 'SETTLED',
                settledDate: Timestamp.now()
            });
            get().fetchBooks();
        } catch (e) {
            console.error('Settle Book Error:', e);
            throw e;
        }
    },

    fetchSettlements: async () => {
        const activeLocationId = useLocationsStore.getState().activeLocationId;
        if (!activeLocationId) return;

        try {
            const q = query(
                collection(db, 'lottery_settlements'),
                where('locationId', '==', activeLocationId)
            );
            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as LotterySettlement));
            set({ settlements: data.sort((a, b) => (b.settlementDate?.seconds || 0) - (a.settlementDate?.seconds || 0)) });
        } catch (e) {
            console.error('Fetch Settlements Error:', e);
        }
    }
}));
