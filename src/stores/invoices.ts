import { defineStore } from 'pinia';
import { ref } from 'vue';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAccountsStore } from './accounts';

export interface InvoiceItem {
    id: string;
    description: string;
    qty: number;
    price: number;
    total: number;
}

export interface Invoice {
    id: string;
    accountId: number | string;
    accountName: string;
    date: string;
    dueDate: string;
    items: InvoiceItem[];
    subtotal: number;
    tax: number;
    total: number;
    status: 'Draft' | 'Sent' | 'Paid';
}

export const useInvoicesStore = defineStore('invoices', () => {
    const invoices = ref<Invoice[]>([]);
    const accountsStore = useAccountsStore();

    const addInvoice = (invoice: Omit<Invoice, 'id'>) => {
        const newInvoice = {
            ...invoice,
            id: `INV-${Date.now().toString().slice(-6)}`
        };
        invoices.value.unshift(newInvoice);

        // Update Account Balance (Demo Simulation)
        const account = accountsStore.accounts.find(a => a.id == invoice.accountId);
        if (account) {
            account.balance += invoice.total;
        }

        return newInvoice.id;
    };

    const generateInvoicePDF = (invoice: Invoice) => {
        const doc = new jsPDF();
        const primaryColor = [14, 165, 233] as [number, number, number]; // #0ea5e9

        // Header
        doc.setFontSize(24);
        doc.setTextColor(...primaryColor);
        doc.text('INVOICE', 160, 20, { align: 'right' });

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`#${invoice.id}`, 160, 28, { align: 'right' });
        doc.text(`Date: ${invoice.date}`, 160, 33, { align: 'right' });
        doc.text(`Due: ${invoice.dueDate}`, 160, 38, { align: 'right' });

        // Company Info
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text('C-Store Daily Ops', 14, 20);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text('123 Gas Station Blvd', 14, 26);
        doc.text('Cityville, ST 12345', 14, 31);
        doc.text('billing@cstoredaily.com', 14, 36);

        // Bill To
        doc.setDrawColor(200);
        doc.line(14, 45, 196, 45);
        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.text('BILL TO:', 14, 55);
        doc.setFontSize(10);
        doc.text(invoice.accountName, 14, 62);
        // In real app, we'd fetch address from account ID

        // Table
        autoTable(doc, {
            startY: 70,
            head: [['Item Description', 'Qty', 'Unit Price', 'Amount']],
            body: invoice.items.map(item => [
                item.description,
                item.qty.toString(),
                `$${item.price.toFixed(2)}`,
                `$${item.total.toFixed(2)}`
            ]),
            theme: 'grid',
            headStyles: { fillColor: primaryColor },
            foot: [
                ['', '', 'Subtotal', `$${invoice.subtotal.toFixed(2)}`],
                ['', '', 'Tax (8%)', `$${invoice.tax.toFixed(2)}`],
                ['', '', 'Total', `$${invoice.total.toFixed(2)}`]
            ],
            footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'right' },
            columnStyles: { 3: { halign: 'right' } } // Right align amount column
        });

        // Save
        doc.save(`${invoice.id}_${invoice.accountName.split(' ')[0]}.pdf`);
    };

    return { invoices, addInvoice, generateInvoicePDF };
});
