import { defineStore } from 'pinia';
import { ref } from 'vue';
import { jsPDF } from 'jspdf';
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
    locationId?: string;
}

import { db, storage } from '../firebaseConfig';
import { collection, getDocs, setDoc, updateDoc, doc, query, orderBy, deleteDoc, where } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useLocationsStore } from './locations';

export const useInvoicesStore = defineStore('invoices', () => {
    const invoices = ref<Invoice[]>([]);

    const fetchInvoices = async () => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        try {
            const q = query(
                collection(db, 'invoices'),
                where('locationId', '==', locationsStore.activeLocationId),
                orderBy('createdAt', 'desc')
            );
            const querySnapshot = await getDocs(q);
            invoices.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
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

    const addInvoice = async (invoice: Omit<Invoice, 'id' | 'locationId'>) => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        const id = `INV-${Date.now().toString().slice(-6)}`;
        try {
            // Upload attachments to Storage first
            const processedAttachments: Attachment[] = [];
            if (invoice.attachments && invoice.attachments.length > 0) {
                for (const att of invoice.attachments) {
                    if (att.dataUrl.startsWith('data:')) {
                        // It's a base64 data URL, upload to Storage
                        try {
                            const res = await fetch(att.dataUrl);
                            const blob = await res.blob();
                            const fileRef = storageRef(storage, `invoices/${id}/${att.name}`);
                            const snapshot = await uploadBytes(fileRef, blob);
                            const downloadUrl = await getDownloadURL(snapshot.ref);
                            processedAttachments.push({
                                ...att,
                                dataUrl: downloadUrl
                            });
                        } catch (uploadErr) {
                            console.error(`Failed to upload attachment ${att.name}:`, uploadErr);
                            // Keep original dataUrl as fallback if upload fails, 
                            // though this might still trigger Firestore limit.
                            processedAttachments.push(att);
                        }
                    } else {
                        processedAttachments.push(att);
                    }
                }
            }

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
                locationId: locationsStore.activeLocationId,
                items: invoice.items.map(i => ({ ...i })),
                attachments: processedAttachments,
                createdAt: new Date().toISOString()
            });

            // Update Account Balance
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

    const generateInvoicePDF = async (invoice: Invoice) => {
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

        // Add Attachments (Receipts) as additional pages
        if (invoice.attachments && invoice.attachments.length > 0) {
            for (const attachment of invoice.attachments) {
                if (attachment.type.startsWith('image/')) {
                    doc.addPage();
                    // Add a small header for the attachment
                    doc.setFontSize(14);
                    doc.setTextColor(...primaryColor);
                    doc.text(`Attachment: ${attachment.name}`, 14, 15);

                    try {
                        let dataUrl = attachment.dataUrl;
                        if (dataUrl.startsWith('http')) {
                            // Fetch content if it's a URL
                            const res = await fetch(dataUrl);
                            const blob = await res.blob();
                            dataUrl = await new Promise((resolve) => {
                                const reader = new FileReader();
                                reader.onloadend = () => resolve(reader.result as string);
                                reader.readAsDataURL(blob);
                            });
                        }

                        // Fit image to page (approx 180mm wide, keeping aspect ratio)
                        const imgProps = doc.getImageProperties(dataUrl);
                        const pageWidth = doc.internal.pageSize.getWidth();
                        const pageHeight = doc.internal.pageSize.getHeight();
                        const margin = 14;
                        const maxWidth = pageWidth - (margin * 2);
                        const maxHeight = pageHeight - 30; // some space for header

                        let width = imgProps.width;
                        let height = imgProps.height;

                        const ratio = width / height;

                        if (width > maxWidth) {
                            width = maxWidth;
                            height = width / ratio;
                        }

                        if (height > maxHeight) {
                            height = maxHeight;
                            width = height * ratio;
                        }

                        doc.addImage(dataUrl, 'JPEG', margin, 25, width, height);
                    } catch (e) {
                        console.error('Failed to add image to PDF:', e);
                        doc.setFontSize(10);
                        doc.setTextColor(200, 0, 0);
                        doc.text('Error: Could not render image attachment.', 14, 25);
                    }
                }
            }
        }

        return doc;
    };

    const downloadInvoicePDF = async (invoice: Invoice) => {
        const doc = await generateInvoicePDF(invoice);
        doc.save(`${invoice.id}_${invoice.accountName.split(' ')[0]}.pdf`);
    };

    const attachFileToInvoice = async (invoiceId: string, file: File): Promise<void> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const dataUrl = e.target?.result as string;

                // Update Firestore
                try {
                    // Upload to Storage
                    const response = await fetch(dataUrl);
                    const blob = await response.blob();
                    const fileRef = storageRef(storage, `invoices/${invoiceId}/${file.name}`);
                    await uploadBytes(fileRef, blob);
                    const downloadUrl = await getDownloadURL(fileRef);

                    const attachment: Attachment = {
                        id: Math.random().toString(36).substr(2, 9),
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        dataUrl: downloadUrl
                    };

                    const invoiceRef = doc(db, 'invoices', invoiceId);
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

    const sendInvoiceEmail = async (invoiceId: string, recipientEmail: string, invoiceOverride?: Invoice): Promise<boolean> => {
        try {
            const invoice = invoiceOverride || invoices.value.find(inv => inv.id === invoiceId);
            if (!invoice) {
                console.error(`Send Email failed: Invoice ${invoiceId} not found.`);
                throw new Error('Invoice not found. Please try again or refresh.');
            }

            const pdfDoc = await generateInvoicePDF(invoice);
            const pdfBase64 = pdfDoc.output('datauristring');

            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001'}/api/send-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: recipientEmail,
                    subject: `Invoice ${invoice.id} from C-Store Daily`,
                    body: `Hello,\n\nPlease find attached invoice ${invoice.id} for ${invoice.accountName}.\n\nTotal Due: $${invoice.total.toFixed(2)}\nDue Date: ${invoice.dueDate}\n\nThank you for your business!`,
                    attachments: [
                        {
                            name: `${invoice.id}.pdf`,
                            data: pdfBase64,
                            type: 'application/pdf'
                        },
                        ...(invoice.attachments || []).map(a => ({
                            name: a.name,
                            data: a.dataUrl,
                            type: a.type
                        }))
                    ]
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to send email');
            }

            const invoiceRef = doc(db, 'invoices', invoice.id);
            await updateDoc(invoiceRef, {
                emailSent: true,
                sentDate: new Date().toISOString(),
                recipientEmail,
                status: 'Sent'
            });
            await fetchInvoices(); // Refresh local state
            return true;
        } catch (error: any) {
            console.error('Failed to send invoice email:', error);
            throw error;
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

    return { invoices, fetchInvoices, fetchInvoicesByAccount, addInvoice, generateInvoicePDF, downloadInvoicePDF, attachFileToInvoice, removeAttachment, sendInvoiceEmail, removeInvoice };
});
