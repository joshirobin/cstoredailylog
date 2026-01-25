import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db } from '../firebaseConfig';
import { collection, getDocs, setDoc, doc, query, orderBy } from 'firebase/firestore';

export interface LotteryEntry {
    gameName: string;
    packNumber: string;
    beginNumber: number;
    endNumber: number;
    soldOut: boolean;
    returns: number;
    credits: number;
    ticketPrice: number;
    soldCount: number; // Calculated: End - Begin
    amount: number; // Calculated: (SoldCount * Price) - Returns? Or usually Returns are separate adjustments.
    // User Requirement: "Scan : Begin Number: End Number: Amount: Sold Out: Return: Credit: Verify."
    // Let's assume Amount is total sales value for this pack.
    verified: boolean;
}

export interface LotteryLog {
    id: string; // YYYY-MM-DD
    date: string;
    entries: LotteryEntry[];
    totalSales: number;
    notes?: string;
    updatedAt: string;
}

export const useLotteryStore = defineStore('lottery', () => {
    const logs = ref<LotteryLog[]>([]);

    const fetchLogs = async () => {
        try {
            const q = query(collection(db, 'lottery_logs'), orderBy('date', 'desc'));
            const querySnapshot = await getDocs(q);
            logs.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LotteryLog));
        } catch (error) {
            console.error('Failed to fetch lottery logs:', error);
        }
    };

    const addLog = async (log: Omit<LotteryLog, 'id'>) => {
        try {
            const date = log.date;
            await setDoc(doc(db, 'lottery_logs', date), {
                ...log,
                id: date,
                updatedAt: new Date().toISOString()
            });
            await fetchLogs();
        } catch (error) {
            console.error('Failed to save lottery log:', error);
            throw error;
        }
    };

    return { logs, fetchLogs, addLog };
});
