import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface ScannedInvoice {
    id: string;
    date: string;
    fileName: string;
    total: string;
    extractedDate: string;
    rawText: string;
    createdAt: string;
}

import { db } from '../firebaseConfig';
import { collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';

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
                    // Handle Firestore Timestamp if needed, but we save as ISO string mostly or convert
                } as ScannedInvoice;
            });
        } catch (error) {
            console.error('Failed to fetch scanned invoices:', error);
        }
    };

    const addScannedInvoice = async (invoice: Omit<ScannedInvoice, 'id' | 'createdAt'>) => {
        try {
            await addDoc(collection(db, 'scanned_logs'), {
                fileName: invoice.fileName,
                date: invoice.date,
                extractedDate: invoice.extractedDate,
                total: invoice.total,
                rawText: invoice.rawText,
                vendor_name: invoice.fileName.split('.')[0],
                total_amount: parseFloat(invoice.total) || 0,
                status: 'Processed',
                createdAt: new Date().toISOString()
            });
            await fetchScannedInvoices();
        } catch (error) {
            console.error('Failed to save scanned invoice:', error);
        }
    };

    return { scannedInvoices, fetchScannedInvoices, addScannedInvoice };
});
