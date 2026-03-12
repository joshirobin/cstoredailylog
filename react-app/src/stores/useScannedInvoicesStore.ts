import { create } from 'zustand';
import { db, storage } from '../firebaseConfig';
import { collection, addDoc, getDocs, query, orderBy, where } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useLocationsStore } from './useLocationsStore';

export interface ScannedInvoice {
    id: string;
    date: string; // Selection date
    fileName: string;
    fileUrl?: string;
    total: string;
    extractedDate: string; // Date found in scan
    description?: string;
    accountName?: string;
    rawText: string;
    createdAt: string;
    locationId?: string;
}

interface ScannedInvoicesState {
    scannedInvoices: ScannedInvoice[];
    pendingScan: any | null;
    loading: boolean;
    setPendingScan: (data: any) => void;
    fetchScannedInvoices: () => Promise<void>;
    addScannedInvoice: (invoice: Omit<ScannedInvoice, 'id' | 'createdAt' | 'locationId'>, file?: File) => Promise<void>;
}

export const useScannedInvoicesStore = create<ScannedInvoicesState>((set, get) => ({
    scannedInvoices: [],
    pendingScan: null,
    loading: false,

    setPendingScan: (data) => set({ pendingScan: data }),

    fetchScannedInvoices: async () => {
        const activeLocationId = useLocationsStore.getState().activeLocationId;
        if (!activeLocationId) return;

        set({ loading: true });
        try {
            const q = query(
                collection(db, 'scanned_logs'),
                where('locationId', '==', activeLocationId),
                orderBy('createdAt', 'desc')
            );
            const querySnapshot = await getDocs(q);
            const docs = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as ScannedInvoice));
            set({ scannedInvoices: docs, loading: false });
        } catch (error) {
            console.error('Failed to fetch scanned invoices:', error);
            set({ loading: false });
        }
    },

    addScannedInvoice: async (invoice, file) => {
        const activeLocationId = useLocationsStore.getState().activeLocationId;
        if (!activeLocationId) return;

        set({ loading: true });
        try {
            let fileUrl = '';

            if (file) {
                const fileRef = storageRef(storage, `scanned_invoices/${Date.now()}_${file.name}`);
                const snapshot = await uploadBytes(fileRef, file);
                fileUrl = await getDownloadURL(snapshot.ref);
            }

            await addDoc(collection(db, 'scanned_logs'), {
                fileName: invoice.fileName,
                fileUrl: fileUrl,
                date: invoice.date,
                extractedDate: invoice.extractedDate,
                total: invoice.total,
                description: invoice.description || '',
                accountName: invoice.accountName || '',
                rawText: invoice.rawText,
                locationId: activeLocationId,
                createdAt: new Date().toISOString()
            });

            await get().fetchScannedInvoices();
        } catch (error) {
            console.error('Failed to save scanned invoice:', error);
            set({ loading: false });
            throw error;
        }
    }
}));
