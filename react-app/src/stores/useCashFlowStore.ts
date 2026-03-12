import { create } from 'zustand';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, query, orderBy, Timestamp, where, doc, deleteDoc } from 'firebase/firestore';
import { useLocationsStore } from './useLocationsStore';
import { useSalesStore } from './useSalesStore';

export interface PlannedTransaction {
    id?: string;
    description: string;
    amount: number;
    date: string; // ISO YYYY-MM-DD
    type: 'INFLOW' | 'OUTFLOW';
    category: 'Payroll' | 'Fuel' | 'Inventory' | 'Utilities' | 'Tax' | 'Other';
    recurring: 'NONE' | 'WEEKLY' | 'BI-WEEKLY' | 'MONTHLY';
    locationId: string;
    loggedBy: string;
    timestamp: Timestamp;
}

export interface CashSnapshot {
    date: string;
    actualInflow: number;
    actualOutflow: number;
    projectedInflow: number;
    projectedOutflow: number;
    balance: number;
}

interface CashFlowState {
    plannedTransactions: PlannedTransaction[];
    loading: boolean;
    fetchPlanned: () => Promise<void>;
    addPlanned: (tx: Omit<PlannedTransaction, 'id' | 'locationId' | 'timestamp'> & { loggedBy: string }) => Promise<void>;
    deletePlanned: (id: string) => Promise<void>;
    getProjections: () => CashSnapshot[];
}

export const useCashFlowStore = create<CashFlowState>((set, get) => ({
    plannedTransactions: [],
    loading: false,

    fetchPlanned: async () => {
        const activeLocationId = useLocationsStore.getState().activeLocationId;
        if (!activeLocationId) return;

        set({ loading: true });
        try {
            const q = query(
                collection(db, 'planned_transactions'),
                where('locationId', '==', activeLocationId),
                orderBy('date', 'asc')
            );
            const snap = await getDocs(q);
            set({ plannedTransactions: snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlannedTransaction)) });
        } catch (e) {
            console.error('Fetch Planned Error:', e);
            // Fallback for missing index
            const q2 = query(
                collection(db, 'planned_transactions'),
                where('locationId', '==', activeLocationId)
            );
            const snap2 = await getDocs(q2);
            const sorted = snap2.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlannedTransaction))
                .sort((a, b) => a.date.localeCompare(b.date));
            set({ plannedTransactions: sorted });
        } finally {
            set({ loading: false });
        }
    },

    addPlanned: async (tx) => {
        const activeLocationId = useLocationsStore.getState().activeLocationId;
        if (!activeLocationId) return;

        try {
            await addDoc(collection(db, 'planned_transactions'), {
                ...tx,
                locationId: activeLocationId,
                timestamp: Timestamp.now()
            });
            await get().fetchPlanned();
        } catch (e) {
            console.error('Add Planned Error:', e);
            throw e;
        }
    },

    deletePlanned: async (id) => {
        try {
            await deleteDoc(doc(db, 'planned_transactions', id));
            await get().fetchPlanned();
        } catch (e) {
            console.error('Delete Planned Error:', e);
            throw e;
        }
    },

    getProjections: () => {
        const salesStore = useSalesStore.getState();
        const { plannedTransactions } = get();

        const historyDays = 30;
        const projectionDays = 14;

        const last30Sales = salesStore.logs.slice(0, historyDays);
        const avgDailySales = last30Sales.length > 0
            ? last30Sales.reduce((sum, l) => sum + (l.totalSales || 0), 0) / last30Sales.length
            : 2500;

        const days: CashSnapshot[] = [];
        const now = new Date();

        // Initial simulated balance
        let runningBalance = 15000;

        for (let i = 0; i < projectionDays; i++) {
            const date = new Date();
            date.setDate(now.getDate() + i);
            const dateStr = date.toISOString().split('T')[0] as string;

            const plannedIn = plannedTransactions
                .filter(t => t.date === dateStr && t.type === 'INFLOW')
                .reduce((sum, t) => sum + t.amount, 0);

            const plannedOut = plannedTransactions
                .filter(t => t.date === dateStr && t.type === 'OUTFLOW')
                .reduce((sum, t) => sum + t.amount, 0);

            const dayOfWeek = date.getDay();
            const multiplier = (dayOfWeek === 5 || dayOfWeek === 6) ? 1.2 : 1.0;
            const projectedSales = avgDailySales * multiplier;

            const inflow = projectedSales + plannedIn;
            const outflow = plannedOut;

            runningBalance += (inflow - outflow);

            days.push({
                date: dateStr,
                actualInflow: 0,
                actualOutflow: 0,
                projectedInflow: inflow,
                projectedOutflow: outflow,
                balance: runningBalance
            });
        }

        return days;
    }
}));
