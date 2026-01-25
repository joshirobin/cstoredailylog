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

        // Simulate email sending (in production, use EmailJS, SendGrid, or Firebase Cloud Functions)
        console.log('📧 Sending email...');
        console.log('To:', recipientEmail);
        console.log('Subject:', `Invoice ${invoice.id}`);
        console.log('Invoice Details:', {
            id: invoice.id,
            accountName: invoice.accountName,
            total: `$${invoice.total.toFixed(2)}`,
            dueDate: invoice.dueDate,
            attachments: invoice.attachments?.length || 0
        });

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Update invoice status
        invoice.emailSent = true;
        invoice.sentDate = new Date().toISOString();
        invoice.recipientEmail = recipientEmail;
        invoice.status = 'Sent';

        console.log('✅ Email sent successfully!');
        return true;
    };

    const removeInvoice = (id: string) => {
        invoices.value = invoices.value.filter(inv => inv.id !== id);
    };

    return { invoices, addInvoice, generateInvoicePDF, attachFileToInvoice, removeAttachment, sendInvoiceEmail, removeInvoice };
});
