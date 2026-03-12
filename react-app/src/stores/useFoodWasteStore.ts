import { create } from 'zustand';
import { db } from '../firebaseConfig';
import { collection, getDocs, setDoc, doc, query, orderBy, deleteDoc, where } from 'firebase/firestore';
import { useLocationsStore } from './useLocationsStore';

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

interface FoodWasteState {
    logs: WasteLog[];
    loading: boolean;
    fetchLogs: () => Promise<void>;
    addLog: (log: Omit<WasteLog, 'id' | 'locationId'>) => Promise<void>;
    updateLog: (id: string, updates: Partial<Omit<WasteLog, 'id'>>) => Promise<void>;
    deleteLog: (id: string) => Promise<void>;
}

export const useFoodWasteStore = create<FoodWasteState>((set, get) => ({
    logs: [],
    loading: false,

    fetchLogs: async () => {
        const activeLocationId = useLocationsStore.getState().activeLocationId;
        if (!activeLocationId) return;

        set({ loading: true });
        try {
            const q = query(
                collection(db, 'food_waste'),
                where('locationId', '==', activeLocationId),
                orderBy('date', 'desc')
            );
            const querySnapshot = await getDocs(q);
            const logs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WasteLog));
            set({ logs, loading: false });
        } catch (error) {
            console.error('Failed to fetch food waste logs:', error);
            set({ loading: false });
        }
    },

    addLog: async (log) => {
        const activeLocationId = useLocationsStore.getState().activeLocationId;
        if (!activeLocationId) return;

        try {
            const logId = `${activeLocationId}_${log.date}_${Math.random().toString(36).substr(2, 5)}`;
            await setDoc(doc(db, 'food_waste', logId), {
                ...log,
                locationId: activeLocationId,
                updatedAt: new Date().toISOString()
            });
            await get().fetchLogs();
        } catch (error) {
            console.error('Failed to save food waste log:', error);
            throw error;
        }
    },

    updateLog: async (id, updates) => {
        try {
            const logRef = doc(db, 'food_waste', id);
            await setDoc(logRef, updates, { merge: true });
            await get().fetchLogs();
        } catch (error) {
            console.error('Failed to update food waste log:', error);
            throw error;
        }
    },

    deleteLog: async (id) => {
        try {
            await deleteDoc(doc(db, 'food_waste', id));
            await get().fetchLogs();
        } catch (error) {
            console.error('Failed to delete food waste log:', error);
            throw error;
        }
    }
}));
