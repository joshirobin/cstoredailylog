import { create } from 'zustand';
import { db } from '../firebaseConfig';
import {
    collection, addDoc, getDocs, query,
    orderBy, limit, Timestamp, where
} from 'firebase/firestore';
import { useLocationsStore } from './useLocationsStore';

export interface JournalEntry {
    id: string;
    content: string;
    type: 'handover' | 'maintenance' | 'incident' | 'general';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    authorName: string;
    authorId: string;
    locationId: string;
    createdAt: any;
    resolved?: boolean;
    resolvedAt?: any;
}

interface JournalState {
    entries: JournalEntry[];
    loading: boolean;
    fetchRecentEntries: (limitCount?: number) => Promise<void>;
    addEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt' | 'locationId'>) => Promise<void>;
}

export const useJournalStore = create<JournalState>((set, get) => ({
    entries: [],
    loading: false,

    fetchRecentEntries: async (limitCount = 50) => {
        const activeLocationId = useLocationsStore.getState().activeLocationId;
        if (!activeLocationId) return;

        set({ loading: true });
        try {
            const q = query(
                collection(db, 'operations_journal'),
                where('locationId', '==', activeLocationId),
                orderBy('createdAt', 'desc'),
                limit(limitCount)
            );
            const snapshot = await getDocs(q);
            const entries = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as JournalEntry));
            set({ entries });
        } catch (error) {
            console.error('Failed to fetch journal entries:', error);
            // Fallback for missing index
            const q2 = query(
                collection(db, 'operations_journal'),
                where('locationId', '==', activeLocationId)
            );
            const snapshot2 = await getDocs(q2);
            const entries2 = snapshot2.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as JournalEntry)).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, limitCount);
            set({ entries: entries2 });
        } finally {
            set({ loading: false });
        }
    },

    addEntry: async (entry) => {
        const activeLocationId = useLocationsStore.getState().activeLocationId;
        if (!activeLocationId) return;

        try {
            await addDoc(collection(db, 'operations_journal'), {
                ...entry,
                locationId: activeLocationId,
                createdAt: Timestamp.now(),
                resolved: false
            });
            await get().fetchRecentEntries();
        } catch (error) {
            console.error('Failed to add journal entry:', error);
            throw error;
        }
    }
}));
