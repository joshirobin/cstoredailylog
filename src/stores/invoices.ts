import { defineStore } from 'pinia';
import { ref } from 'vue';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface InvoiceItem {
    id: string;
    description: string;
    qty: number;
    price: number;
    total: number;
}

export interface Attachment {
    id: string;
    name: string;
    size: number;
    type: string;
    dataUrl: string;
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
    attachments?: Attachment[];
    emailSent?: boolean;
    sentDate?: string;
    recipientEmail?: string;
}

export const useInvoicesStore = defineStore('invoices', () => {
    const invoices = ref<Invoice[]>([]);
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

    const fetchInvoices = async () => {
        try {
            const response = await fetch(`${API_URL}/invoices`);
            if (response.ok) {
                // In a production app, we'd map snake_case from DB to camelCase here
                invoices.value = await response.json();
            }
        } catch (error) {
            console.error('Failed to fetch invoices:', error);
        }
    };

    const addInvoice = async (invoice: Omit<Invoice, 'id'>) => {
        const id = `INV-${Date.now().toString().slice(-6)}`;
        try {
            const response = await fetch(`${API_URL}/invoices`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id,
                    account_id: invoice.accountId,
                    account_name: invoice.accountName,
                    date: invoice.date,
                    due_date: invoice.dueDate,
                    subtotal: invoice.subtotal,
                    tax: invoice.tax,
                    total: invoice.total,
                    status: invoice.status,
                    recipient_email: invoice.recipientEmail,
                    items: invoice.items.map(i => ({
                        description: i.description,
                        qty: i.qty,
                        price: i.price,
                        total: i.total
                    }))
                })
            });
            if (response.ok) {
                await fetchInvoices();
                // Update local account balance if needed, though server should ideally handle this
                return id;
            }
        } catch (error) {
            console.error('Failed to save invoice:', error);
        }
        return id;
    };

    const generateInvoicePDF = (invoice: Invoice) => {
        const doc = new jsPDF();
        const primaryColor = [14, 165, 233] as [number, number, number];

        doc.setFontSize(24);
        doc.setTextColor(...primaryColor);
        doc.text('INVOICE', 160, 20, { align: 'right' });

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`#${invoice.id}`, 160, 28, { align: 'right' });
        doc.text(`Date: ${invoice.date}`, 160, 33, { align: 'right' });
        doc.text(`Due: ${invoice.dueDate}`, 160, 38, { align: 'right' });

        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text('C-Store Daily Ops', 140, 20);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text('123 Gas Station Blvd', 140, 26);
        doc.text('Cityville, ST 12345', 140, 31);
        doc.text('billing@cstoredaily.com', 140, 36);

        doc.setDrawColor(200);
        doc.line(14, 45, 196, 45);
        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.text('BILL TO:', 14, 55);
        doc.setFontSize(10);
        doc.text(invoice.accountName, 14, 62);

        autoTable(doc, {
            startY: 70,
            head: [['Item Description', 'Qty', 'Unit Price', 'Amount']],
            body: invoice.items.map(item => [
                item.description,
                item.qty.toString(),
                `$${Number(item.price).toFixed(2)}`,
                `$${Number(item.total).toFixed(2)}`
            ]),
            theme: 'grid',
            headStyles: { fillColor: primaryColor },
            foot: [
                ['', '', 'Subtotal', `$${Number(invoice.subtotal).toFixed(2)}`],
                ['', '', 'Tax (8%)', `$${Number(invoice.tax).toFixed(2)}`],
                ['', '', 'Total', `$${Number(invoice.total).toFixed(2)}`]
            ],
            footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'right' },
            columnStyles: { 3: { halign: 'right' } }
        });

        doc.save(`${invoice.id}_${invoice.accountName.split(' ')[0]}.pdf`);
    };

    const attachFileToInvoice = (invoiceId: string, file: File): Promise<void> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const invoice = invoices.value.find(inv => inv.id === invoiceId);
                if (invoice) {
                    if (!invoice.attachments) {
                        invoice.attachments = [];
                    }
                    const attachment: Attachment = {
                        id: Math.random().toString(36).substr(2, 9),
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        dataUrl: e.target?.result as string
                    };
                    invoice.attachments.push(attachment);
                    resolve();
                } else {
                    reject(new Error('Invoice not found'));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    };

    const removeAttachment = (invoiceId: string, attachmentId: string) => {
        const invoice = invoices.value.find(inv => inv.id === invoiceId);
        if (invoice && invoice.attachments) {
            invoice.attachments = invoice.attachments.filter(a => a.id !== attachmentId);
        }
    };

    const sendInvoiceEmail = async (invoiceId: string, recipientEmail: string): Promise<boolean> => {
        const invoice = invoices.value.find(inv => inv.id === invoiceId);
        if (!invoice) return false;

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Update invoice locally
        invoice.emailSent = true;
        invoice.sentDate = new Date().toISOString();
        invoice.recipientEmail = recipientEmail;
        invoice.status = 'Sent';

        // In production, we'd hit PUT /api/invoices/:id here
        return true;
    };

    const removeInvoice = (id: string) => {
        invoices.value = invoices.value.filter(inv => inv.id !== id);
    };

    return { invoices, fetchInvoices, addInvoice, generateInvoicePDF, attachFileToInvoice, removeAttachment, sendInvoiceEmail, removeInvoice };
});
