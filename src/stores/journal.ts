import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db } from '../firebaseConfig';
import {
    collection, addDoc, getDocs, query,
    orderBy, limit, Timestamp, where
} from 'firebase/firestore';
import { useLocationsStore } from './locations';

export interface JournalEntry {
    id?: string;
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

export const useJournalStore = defineStore('journal', () => {
    const entries = ref<JournalEntry[]>([]);
    const loading = ref(false);

    const fetchRecentEntries = async (limitCount = 10) => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        loading.value = true;
        try {
            const q = query(
                collection(db, 'operations_journal'),
                where('locationId', '==', locationsStore.activeLocationId),
                orderBy('createdAt', 'desc'),
                limit(limitCount)
            );
            const snapshot = await getDocs(q);
            entries.value = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as JournalEntry));
        } catch (error) {
            console.error('Failed to fetch journal entries:', error);
        } finally {
            loading.value = false;
        }
    };

    const addEntry = async (entry: Omit<JournalEntry, 'id' | 'createdAt' | 'locationId'>) => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        try {
            await addDoc(collection(db, 'operations_journal'), {
                ...entry,
                locationId: locationsStore.activeLocationId,
                createdAt: Timestamp.now(),
                resolved: false
            });
            await fetchRecentEntries();
        } catch (error) {
            console.error('Failed to add journal entry:', error);
            throw error;
        }
    };

    return {
        entries,
        loading,
        fetchRecentEntries,
        addEntry
    };
});
