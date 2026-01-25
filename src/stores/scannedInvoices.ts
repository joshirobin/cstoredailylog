import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface ScannedInvoice {
    id: string;
    date: string;
    fileName: string;
    fileUrl?: string;
    total: string;
    extractedDate: string;
    description?: string;
    accountName?: string;
    rawText: string;
    createdAt: string;
}

import { db, storage } from '../firebaseConfig';
import { collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

export const useScannedInvoicesStore = defineStore('scannedInvoices', () => {
    const scannedInvoices = ref<ScannedInvoice[]>([]);

    const fetchScannedInvoices = async () => {
        try {
            const q = query(collection(db, 'scanned_logs'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            scannedInvoices.value = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                } as ScannedInvoice;
            });
        } catch (error) {
            console.error('Failed to fetch scanned invoices:', error);
        }
    };

    const addScannedInvoice = async (invoice: Omit<ScannedInvoice, 'id' | 'createdAt'>, file?: File) => {
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
                vendor_name: invoice.fileName.split('.')[0],
                total_amount: parseFloat(invoice.total?.replace('$', '') || '0') || 0,
                status: 'Processed',
                createdAt: new Date().toISOString()
            });
            await fetchScannedInvoices();
        } catch (error) {
            console.error('Failed to save scanned invoice:', error);
            throw error;
        }
    };

    return { scannedInvoices, fetchScannedInvoices, addScannedInvoice };
});
