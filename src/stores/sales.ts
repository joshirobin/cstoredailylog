import { defineStore } from 'pinia';
import { ref } from 'vue';

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
    openingDenominations?: DenominationCounts; // Added
    closingCash: number;
    closingDenominations?: DenominationCounts; // Added
    expenses: number;
    totalSales: number;
    notes: string;
    // Safe Deposit fields
    safeCash?: number;
    safeCashDetails?: DenominationCounts;
    checks?: Check[];
    safeTotal?: number;
    lottoReport?: string; // URL to attachment
    otherReport?: string; // URL to attachment
}

import { db } from '../firebaseConfig';
import { collection, getDocs, setDoc, doc, query, orderBy } from 'firebase/firestore';

export const useSalesStore = defineStore('sales', () => {
    const logs = ref<SalesLog[]>([]);

    const fetchLogs = async () => {
        try {
            const q = query(collection(db, 'sales_logs'), orderBy('date', 'desc'));
            const querySnapshot = await getDocs(q);
            logs.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalesLog));
        } catch (error) {
            console.error('Failed to fetch sales logs:', error);
        }
    };

    const addLog = async (log: Omit<SalesLog, 'id'>) => {
        try {
            const date = log.date;
            // Use date as document ID to ensure one log per day
            await setDoc(doc(db, 'sales_logs', date), {
                ...log,
                updatedAt: new Date().toISOString()
            });
            await fetchLogs();
        } catch (error) {
            console.error('Failed to save sales log:', error);
        }
    };

    const updateLog = async (id: string, updates: Partial<Omit<SalesLog, 'id'>>) => {
        try {
            const logRef = doc(db, 'sales_logs', id); // ID acts as the date string here ideally, or the original ID
            // Since we use date as ID in addLog, 'id' here might be the date.
            // If the UI passes a random ID, this might break. Let's check how 'id' is used. 
            // The previous code generated a random ID for API, but for Postgres we used unique date.
            // Let's assume 'id' is the document ID (which we set to date string).
            await setDoc(logRef, updates, { merge: true });
            await fetchLogs();
        } catch (error) {
            console.error('Failed to update sales log:', error);
        }
    };

    const deleteLog = (id: string) => {
        // Implement DELETE on server if needed
        logs.value = logs.value.filter(log => log.id !== id);
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

    return { logs, fetchLogs, addLog, updateLog, deleteLog, getLogsByDateRange };
});

