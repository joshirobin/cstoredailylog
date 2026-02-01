import { defineStore } from 'pinia';
import { ref } from 'vue';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface Account {
    id: number | string;
    name: string;
    contact: string;
    email: string;
    phone?: string;
    address?: string;
    balance: number;
    creditLimit: number;
    status: 'Active' | 'Overdue' | 'Inactive';
    locationId?: string;
}

import { db } from '../firebaseConfig';
import { collection, addDoc, getDocs, query, orderBy, where } from 'firebase/firestore';
import { useLocationsStore } from './locations';

export const useAccountsStore = defineStore('accounts', () => {
    const accounts = ref<Account[]>([]);

    const fetchAccounts = async () => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        try {
            const q = query(
                collection(db, 'accounts'),
                where('locationId', '==', locationsStore.activeLocationId),
                orderBy('name')
            );
            const querySnapshot = await getDocs(q);
            accounts.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
        } catch (error) {
            console.error('Failed to fetch accounts:', error);
        }
    };

    const addAccount = async (account: Omit<Account, 'id' | 'status' | 'locationId'>) => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        try {
            await addDoc(collection(db, 'accounts'), {
                ...account,
                locationId: locationsStore.activeLocationId,
                status: 'Active',
                balance: Number(account.balance) || 0,
                creditLimit: Number(account.creditLimit) || 0
            });
            await fetchAccounts();
        } catch (error) {
            console.error('Failed to add account:', error);
        }
    };

    const generateStatement = (account: Account, transactions: any[]) => {
        const doc = new jsPDF();
        // ... (rest of setup)
        doc.setFontSize(22);
        doc.setTextColor(14, 165, 233);
        doc.text('STATEMENT', 14, 20);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 30);
        doc.text(`Account #: ${account.id}`, 14, 35);
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
        doc.text(account.name, 14, 62);
        doc.text(account.contact, 14, 67);
        if (account.address) doc.text(account.address, 14, 72);
        doc.text(account.email, 14, 77);

        autoTable(doc, {
            startY: 85,
            head: [['Date', 'Description', 'Ref', 'Amount', 'Type']],
            body: transactions.map(t => [
                t.date,
                t.desc,
                t.ref || '-',
                `$${Math.abs(t.amount).toFixed(2)}`,
                t.amount < 0 ? 'PAYMENT' : 'INVOICE'
            ]),
            theme: 'grid',
            headStyles: { fillColor: [14, 165, 233] },
            // Highlight payments rows?
            didParseRow: (data: any) => {
                if (data.row.raw[4] === 'PAYMENT') {
                    data.row.styles.textColor = [22, 163, 74]; // Green for payments
                }
            },
            foot: [['', '', '', 'Total Balance', `$${Number(account.balance).toFixed(2)}`]],
            footStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0], fontStyle: 'bold' }
        } as any);

        return doc;
    };

    const downloadStatement = (account: Account, transactions: any[]) => {
        const doc = generateStatement(account, transactions);
        doc.save(`Statement_${account.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const sendStatementEmail = async (account: Account, transactions: any[]) => {
        try {
            const doc = generateStatement(account, transactions);
            const pdfBase64 = doc.output('datauristring');

            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001'}/api/send-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: account.email,
                    subject: `Account Statement - ${account.name}`,
                    body: `Hello ${account.contact},\n\nPlease find your latest account statement attached.\n\nCurrent Balance: $${account.balance.toFixed(2)}\n\nThank you for your business!`,
                    attachments: [
                        {
                            name: `Statement_${account.name.replace(/\s+/g, '_')}.pdf`,
                            data: pdfBase64,
                            type: 'application/pdf'
                        }
                    ]
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to send email');
            }

            return true;
        } catch (error: any) {
            console.error('Failed to send statement email:', error);
            throw error;
        }
    };

    return { accounts, fetchAccounts, addAccount, generateStatement, downloadStatement, sendStatementEmail };
});
