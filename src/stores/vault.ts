import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { db } from '../firebaseConfig';
import {
    collection, addDoc, getDocs, deleteDoc, doc, query, Timestamp, orderBy, where
} from 'firebase/firestore';
import { useLocationsStore } from './locations';


export interface VaultDocument {
    id: string;
    title: string;
    category: 'TRAINING' | 'COMPLIANCE' | 'FINANCIAL' | 'LEGAL' | 'MISC';
    url: string;
    fileName: string;
    fileType: string;
    uploadDate: Timestamp;
    expiryDate?: string;
    locationId: string;
    notes?: string;
}

// Assuming WasteLog and related types/store are defined elsewhere or will be added to a separate file.
// For the purpose of this edit, we'll only apply changes relevant to the Vault store.
// If the user intended to merge food waste functionality into this file,
// they would need to provide the full context for WasteLog and its store definition.

export const useVaultStore = defineStore('vault', () => {
    const documents = ref<VaultDocument[]>([]);
    const loading = ref(false);

    const fetchDocuments = async () => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        loading.value = true;
        try {
            const q = query(
                collection(db, 'vault_documents'),
                where('locationId', '==', locationsStore.activeLocationId),
                orderBy('uploadDate', 'desc')
            );
            const querySnapshot = await getDocs(q);
            documents.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VaultDocument));
        } catch (error) {
            console.error('Failed to fetch documents:', error);
        } finally {
            loading.value = false;
        }
    };

    const addDocument = async (docData: Omit<VaultDocument, 'id' | 'locationId' | 'uploadDate'>) => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        try {
            // Using addDoc as it was originally, but ensuring locationId and uploadDate are set.
            // If the intent was to use setDoc with a custom ID, the docData would need to include an ID.
            const docRef = await addDoc(collection(db, 'vault_documents'), {
                ...docData,
                locationId: locationsStore.activeLocationId,
                uploadDate: Timestamp.now()
            });
            await fetchDocuments();
            return docRef.id;
        } catch (error) {
            console.error('Failed to add document:', error);
            throw error;
        }
    };

    const deleteDocument = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'vault_documents', id));
            await fetchDocuments();
        } catch (error) {
            console.error('Failed to delete document:', error);
        }
    };

    const expiringSoon = computed(() => {
        const threshold = new Date();
        threshold.setDate(threshold.getDate() + 30); // 30 days
        const thresholdISO = threshold.toISOString().split('T')[0] || '';

        return documents.value.filter(d => d.expiryDate && d.expiryDate <= thresholdISO);
    });

    return {
        documents,
        loading,
        fetchDocuments,
        addDocument,
        deleteDocument,
        expiringSoon
    };
});
