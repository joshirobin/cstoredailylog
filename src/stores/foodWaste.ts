import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db } from '../firebaseConfig';
import { collection, getDocs, setDoc, doc, query, orderBy, deleteDoc, where } from 'firebase/firestore';
import { useLocationsStore } from './locations';

export interface WasteItem {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    reason: string;
    costPerUnit: number;
    totalCost: number;
    category: string;
}

export interface WasteLog {
    id: string;
    date: string; // ISO string
    items: WasteItem[];
    totalValue: number;
    submittedBy: string;
    locationId: string;
    notes?: string;
    status: 'COMPLETE' | 'PENDING';
}

export const useFoodWasteStore = defineStore('foodWaste', () => {
    const logs = ref<WasteLog[]>([]);
    const loading = ref(false);

    const fetchLogs = async () => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        loading.value = true;
        try {
            const q = query(
                collection(db, 'food_waste'),
                where('locationId', '==', locationsStore.activeLocationId),
                orderBy('date', 'desc')
            );
            const querySnapshot = await getDocs(q);
            logs.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WasteLog));
        } catch (error) {
            console.error('Failed to fetch food waste logs:', error);
        } finally {
            loading.value = false;
        }
    };

    const addLog = async (log: Omit<WasteLog, 'id' | 'locationId'>) => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        try {
            const logId = `${locationsStore.activeLocationId}_${log.date}_${Math.random().toString(36).substr(2, 5)}`;
            await setDoc(doc(db, 'food_waste', logId), {
                ...log,
                locationId: locationsStore.activeLocationId,
                updatedAt: new Date().toISOString()
            });
            await fetchLogs();
        } catch (error) {
            console.error('Failed to save food waste log:', error);
            throw error;
        }
    };

    const updateLog = async (id: string, updates: Partial<Omit<WasteLog, 'id'>>) => {
        try {
            const logRef = doc(db, 'food_waste', id);
            await setDoc(logRef, updates, { merge: true });
            await fetchLogs();
        } catch (error) {
            console.error('Failed to update food waste log:', error);
            throw error;
        }
    };

    const deleteLog = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'food_waste', id));
            await fetchLogs();
        } catch (error) {
            console.error('Failed to delete food waste log:', error);
            throw error;
        }
    };

    return { logs, loading, fetchLogs, addLog, updateLog, deleteLog };
});
