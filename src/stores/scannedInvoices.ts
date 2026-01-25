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
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

    const fetchScannedInvoices = async () => {
        try {
            const response = await fetch(`${API_URL}/scanned-logs`);
            if (response.ok) {
                scannedInvoices.value = await response.json();
            }
        } catch (error) {
            console.error('Failed to fetch scanned invoices:', error);
        }
    };

    const addScannedInvoice = async (invoice: Omit<ScannedInvoice, 'id' | 'createdAt'>) => {
        try {
            const response = await fetch(`${API_URL}/scanned-logs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vendor_name: invoice.fileName.split('.')[0], // fallback if vendor not parsed
                    date: invoice.extractedDate || invoice.date,
                    total_amount: parseFloat(invoice.total) || 0,
                    raw_text: invoice.rawText,
                    status: 'Processed'
                })
            });
            if (response.ok) {
                await fetchScannedInvoices();
            }
        } catch (error) {
            console.error('Failed to save scanned invoice:', error);
        }
    };

    return { scannedInvoices, fetchScannedInvoices, addScannedInvoice };
});
