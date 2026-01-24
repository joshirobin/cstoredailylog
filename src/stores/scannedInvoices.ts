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

export const useScannedInvoicesStore = defineStore('scannedInvoices', () => {
    const scannedInvoices = ref<ScannedInvoice[]>([]);

    const addScannedInvoice = (invoice: Omit<ScannedInvoice, 'id' | 'createdAt'>) => {
        const newInvoice = {
            ...invoice,
            id: Math.random().toString(36).substr(2, 9),
            createdAt: new Date().toISOString()
        };
        scannedInvoices.value.unshift(newInvoice);
        return newInvoice.id;
    };

    return { scannedInvoices, addScannedInvoice };
});
