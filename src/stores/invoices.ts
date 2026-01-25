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

import { db } from '../firebaseConfig';
import { collection, getDocs, setDoc, updateDoc, doc, query, orderBy, deleteDoc } from 'firebase/firestore';

export const useInvoicesStore = defineStore('invoices', () => {
    const invoices = ref<Invoice[]>([]);

    const fetchInvoices = async () => {
        try {
            // Sort by createdAt desc, fallback to date desc (client side if needed, but here queries are simple)
            const q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            // If query is empty, try sorting by date
            if (querySnapshot.empty) {
                const fallbackSnapshot = await getDocs(query(collection(db, 'invoices'), orderBy('date', 'desc')));
                invoices.value = fallbackSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
            } else {
                invoices.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
            }
        } catch (error) {
            console.error('Failed to fetch invoices:', error);
        }
    };

    const fetchInvoicesByAccount = async (accountId: string) => {
        try {
            const { where } = await import('firebase/firestore');
            // Try querying. Note: Composite index might be needed for where() + orderBy()
            // Just filtering in memory if list is small, or use simple query.
            // Let's use Firestore query.
            const q = query(collection(db, 'invoices'), where('accountId', '==', accountId));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
        } catch (error) {
            console.error('Failed to fetch account invoices:', error);
            return [];
        }
    };

    const addInvoice = async (invoice: Omit<Invoice, 'id'>) => {
        const id = `INV-${Date.now().toString().slice(-6)}`;
        try {
            await setDoc(doc(db, 'invoices', id), {
                id,
                accountId: invoice.accountId,
                accountName: invoice.accountName,
                date: invoice.date,
                dueDate: invoice.dueDate,
                subtotal: invoice.subtotal,
                tax: invoice.tax,
                total: invoice.total,
                status: invoice.status,
                recipientEmail: invoice.recipientEmail,
                items: invoice.items.map(i => ({ ...i })),
                attachments: invoice.attachments || [],
                createdAt: new Date().toISOString()
            });

            // Update Account Balance
            // We need to import increment dynamically or at top-level. 
            // It's cleaner to use the imported functions if available.
            // Let's assume we can add update logic here.
            const { increment } = await import('firebase/firestore');
            const accountRef = doc(db, 'accounts', String(invoice.accountId));
            await updateDoc(accountRef, {
                balance: increment(Number(invoice.total) || 0)
            });

            await fetchInvoices();
            return id;
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

    const attachFileToInvoice = async (invoiceId: string, file: File): Promise<void> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const dataUrl = e.target?.result as string;
                const attachment: Attachment = {
                    id: Math.random().toString(36).substr(2, 9),
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    dataUrl
                };

                // Update Firestore
                try {
                    const invoiceRef = doc(db, 'invoices', invoiceId);
                    // We need to get the current attachments first or use arrayUnion
                    // But arrayUnion with large objects (base64) is fine?
                    // Let's just find the local invoice and update it then save whole array or use arrayUnion
                    // arrayUnion is safer for concurrency
                    const { arrayUnion } = await import('firebase/firestore');
                    await updateDoc(invoiceRef, {
                        attachments: arrayUnion(attachment)
                    });

                    // Update local state
                    const invoice = invoices.value.find(inv => inv.id === invoiceId);
                    if (invoice) {
                        if (!invoice.attachments) invoice.attachments = [];
                        invoice.attachments.push(attachment);
                    }
                    resolve();
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    };

    const removeAttachment = async (invoiceId: string, attachmentId: string) => {
        const invoice = invoices.value.find(inv => inv.id === invoiceId);
        if (invoice && invoice.attachments) {
            const attachmentToRemove = invoice.attachments.find(a => a.id === attachmentId);
            if (!attachmentToRemove) return;

            try {
                const { arrayRemove } = await import('firebase/firestore');
                const invoiceRef = doc(db, 'invoices', invoiceId);
                await updateDoc(invoiceRef, {
                    attachments: arrayRemove(attachmentToRemove)
                });
                invoice.attachments = invoice.attachments.filter(a => a.id !== attachmentId);
            } catch (error) {
                console.error('Failed to remove attachment:', error);
            }
        }
    };

    const sendInvoiceEmail = async (invoiceId: string, recipientEmail: string): Promise<boolean> => {
        try {
            const invoiceRef = doc(db, 'invoices', invoiceId);
            await updateDoc(invoiceRef, {
                emailSent: true,
                sentDate: new Date().toISOString(),
                recipientEmail,
                status: 'Sent'
            });
            await fetchInvoices(); // Refresh local state
            return true;
        } catch (error) {
            console.error('Failed to update invoice status:', error);
            return false;
        }
    };

    const removeInvoice = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'invoices', id));
            invoices.value = invoices.value.filter(inv => inv.id !== id);
        } catch (error) {
            console.error('Failed to delete invoice:', error);
        }
    };

    return { invoices, fetchInvoices, fetchInvoicesByAccount, addInvoice, generateInvoicePDF, attachFileToInvoice, removeAttachment, sendInvoiceEmail, removeInvoice };
});
