import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db } from '../firebaseConfig';
import { collection, getDocs, setDoc, doc, query, orderBy, deleteDoc, where } from 'firebase/firestore';
import { useLocationsStore } from './locations';
import { useAuthStore } from './auth';

export interface DenominationCounts {
    bills: { [key: string]: number }; // e.g. "100": 5
    coins: { [key: string]: number }; // e.g. "0.25": 40
}

export interface Check {
    number: string;
    amount: number;
}

export interface SalesLog {
    id: string;
    date: string; // ISO string
    openingCash: number;
    openingDenominations?: DenominationCounts;
    closingCash: number;
    closingDenominations?: DenominationCounts;
    expenses: number;
    totalSales: number;
    notes: string;
    safeCash?: number;
    safeCashDetails?: DenominationCounts;
    checks?: Check[];
    safeTotal?: number;
    lottoUrl?: string;
    otherUrl?: string;
    submittedBy?: string;
    status?: 'PENDING_REVIEW' | 'VERIFIED';
    locationId: string;
}

export const useSalesStore = defineStore('sales', () => {
    const logs = ref<SalesLog[]>([]);

    const fetchLogs = async () => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        try {
            const q = query(
                collection(db, 'sales_logs'),
                where('locationId', '==', locationsStore.activeLocationId),
                orderBy('date', 'desc')
            );
            const querySnapshot = await getDocs(q);
            logs.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalesLog));
        } catch (error) {
            console.error('Failed to fetch sales logs:', error);
        }
    };

    const addLog = async (log: Omit<SalesLog, 'id' | 'locationId'>) => {
        const locationsStore = useLocationsStore();
        const authStore = useAuthStore();
        if (!locationsStore.activeLocationId) return;

        try {
            const date = log.date;
            // Use composite key or unique id for multi-location
            const logId = `${locationsStore.activeLocationId}_${date}`;
            await setDoc(doc(db, 'sales_logs', logId), {
                ...log,
                locationId: locationsStore.activeLocationId,
                submittedBy: authStore.user?.email || 'unknown',
                updatedAt: new Date().toISOString()
            });
            await fetchLogs();
        } catch (error) {
            console.error('Failed to save sales log:', error);
        }
    };

    const updateLog = async (id: string, updates: Partial<Omit<SalesLog, 'id'>>) => {
        try {
            const logRef = doc(db, 'sales_logs', id);
            await setDoc(logRef, updates, { merge: true });
            await fetchLogs();
        } catch (error) {
            console.error('Failed to update sales log:', error);
        }
    };

    const deleteLog = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'sales_logs', id));
            await fetchLogs();
        } catch (error) {
            console.error('Failed to delete sales log:', error);
        }
    };

    const updateLogStatus = async (id: string, status: 'PENDING_REVIEW' | 'VERIFIED') => {
        try {
            const logRef = doc(db, 'sales_logs', id);
            await setDoc(logRef, { status, updatedStatusAt: new Date().toISOString() }, { merge: true });
            await fetchLogs();
        } catch (error) {
            console.error('Failed to update log status:', error);
        }
    };

    const getLogsByDateRange = (startDate: Date, endDate: Date) => {
        const toYMD = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const start = toYMD(startDate);
        const end = toYMD(endDate);

        return logs.value.filter(log => {
            return log.date >= start && log.date <= end;
        });
    };

    return {
        logs,
        fetchLogs,
        addLog,
        updateLog,
        deleteLog,
        getLogsByDateRange,
        updateLogStatus
    };
});
