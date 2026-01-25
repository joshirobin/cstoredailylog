import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db } from '../firebaseConfig';
import { collection, getDocs, setDoc, doc, query, orderBy } from 'firebase/firestore';

export interface FuelEntry {
    type: string; // 'Regular', 'Plus', 'Premium', 'Diesel', etc.
    inch: number;
    beginGal: number;
    deliveryGal: number;
    soldGal: number;
    bookInv: number; // Calculated: Begin + Delivery - Sold
    endInvAtg: number;
    costPerGal: number;
    variance: number; // Calculated: EndInvAtg - BookInv
}

export interface FuelLog {
    id: string; // YYYY-MM-DD
    date: string;
    entries: FuelEntry[];
    totalVariance: number;
    notes?: string;
    atgImage?: string; // URL of the uploaded ATG scan
    updatedAt: string;
}

export const useFuelStore = defineStore('fuel', () => {
    const logs = ref<FuelLog[]>([]);

    // Default fuel types
    const defaultFuelTypes = ['Regular', 'Plus', 'Premium', 'Diesel', 'Kerosene'];

    const fetchLogs = async () => {
        try {
            const q = query(collection(db, 'fuel_logs'), orderBy('date', 'desc'));
            const querySnapshot = await getDocs(q);
            logs.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FuelLog));
        } catch (error) {
            console.error('Failed to fetch fuel logs:', error);
        }
    };

    const addLog = async (log: Omit<FuelLog, 'id'>) => {
        try {
            const date = log.date;
            await setDoc(doc(db, 'fuel_logs', date), {
                ...log,
                id: date,
                updatedAt: new Date().toISOString()
            });
            await fetchLogs();
        } catch (error) {
            console.error('Failed to save fuel log:', error);
            throw error;
        }
    };

    return { logs, defaultFuelTypes, fetchLogs, addLog };
});
