import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db } from '../firebaseConfig';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { useLocationsStore } from './locations';


export interface SOPStep {
    id: string;
    title: string;
    description: string;
    importance: 'Critical' | 'Standard' | 'Optional';
}

export interface SOP {
    id: string;
    locationId: string;
    role: 'Admin' | 'Manager' | 'Assistant Manager' | 'Cashier' | 'Stocker' | 'Shift Manager';
    title: string;
    category: 'Opening' | 'Closing' | 'Daily Operations' | 'Safety' | 'Customer Service' | 'Inventory';
    description: string;
    steps: SOPStep[];
    iconName?: string; // Store icon name instead of component
}

export const useSOPStore = defineStore('sop', () => {
    const sops = ref<SOP[]>([]);
    const loading = ref(false);

    const fetchSOPs = async () => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        loading.value = true;
        try {
            const q = query(
                collection(db, 'sops'),
                where('locationId', '==', locationsStore.activeLocationId),
                orderBy('title')
            );
            const querySnapshot = await getDocs(q);
            sops.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SOP));
        } catch (error) {
            console.error('Failed to fetch SOPs:', error);
        } finally {
            loading.value = false;
        }
    };

    const addSOP = async (sop: Omit<SOP, 'id' | 'locationId'>) => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        try {
            const docRef = await addDoc(collection(db, 'sops'), {
                ...sop,
                locationId: locationsStore.activeLocationId
            });
            await fetchSOPs();
            return docRef.id;
        } catch (error) {
            console.error('Failed to add SOP:', error);
            throw error;
        }
    };

    const updateSOP = async (id: string, updates: Partial<SOP>) => {
        try {
            await updateDoc(doc(db, 'sops', id), updates);
            await fetchSOPs();
        } catch (error) {
            console.error('Failed to update SOP:', error);
            throw error;
        }
    };

    const deleteSOP = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'sops', id));
            await fetchSOPs();
        } catch (error) {
            console.error('Failed to delete SOP:', error);
            throw error;
        }
    };

    const getSOPsByRole = (role: string) => {
        return sops.value.filter(s => s.role === role);
    };

    return {
        sops,
        loading,
        fetchSOPs,
        addSOP,
        updateSOP,
        deleteSOP,
        getSOPsByRole
    };
});
