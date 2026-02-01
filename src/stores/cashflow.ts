import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useSalesStore } from './sales';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, query, orderBy, Timestamp, where, doc, deleteDoc } from 'firebase/firestore';
import { useLocationsStore } from './locations';

export interface PlannedTransaction {
    id?: string;
    description: string;
    amount: number;
    date: string; // ISO YYYY-MM-DD
    type: 'INFLOW' | 'OUTFLOW';
    category: 'Payroll' | 'Fuel' | 'Inventory' | 'Utilities' | 'Tax' | 'Other';
    recurring: 'NONE' | 'WEEKLY' | 'BI-WEEKLY' | 'MONTHLY';
    locationId: string;
    loggedBy: string; // Added loggedBy
    timestamp: Timestamp; // Added timestamp
}

export interface CashSnapshot {
    date: string;
    actualInflow: number;
    actualOutflow: number;
    projectedInflow: number;
    projectedOutflow: number;
    balance: number;
}

export const useCashFlowStore = defineStore('cashflow', () => {
    const salesStore = useSalesStore();

    const plannedTransactions = ref<PlannedTransaction[]>([]);
    const loading = ref(false);

    const fetchPlanned = async () => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        try {
            const q = query(
                collection(db, 'planned_transactions'),
                where('locationId', '==', locationsStore.activeLocationId),
                orderBy('date', 'asc')
            );
            const snap = await getDocs(q);
            plannedTransactions.value = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlannedTransaction));
        } catch (e) {
            console.error(e);
        }
    };

    const addPlanned = async (tx: Omit<PlannedTransaction, 'id' | 'locationId' | 'timestamp'> & { loggedBy: string }) => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        await addDoc(collection(db, 'planned_transactions'), {
            ...tx,
            locationId: locationsStore.activeLocationId,
            timestamp: Timestamp.now()
        });
        await fetchPlanned();
    };

    const deletePlanned = async (id: string) => {
        await deleteDoc(doc(db, 'planned_transactions', id));
        await fetchPlanned();
    };

    const projections = computed(() => {
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

            const plannedIn = plannedTransactions.value
                .filter(t => t.date === dateStr && t.type === 'INFLOW')
                .reduce((sum, t) => sum + t.amount, 0);

            const plannedOut = plannedTransactions.value
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
    });

    return {
        plannedTransactions,
        loading,
        fetchPlanned,
        addPlanned,
        deletePlanned,
        projections
    };
});
