import { defineStore } from 'pinia';
import { ref } from 'vue';
import jsPDF from 'jspdf';
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
}

import { db } from '../firebaseConfig';
import { collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';

export const useAccountsStore = defineStore('accounts', () => {
    const accounts = ref<Account[]>([]);

    const fetchAccounts = async () => {
        try {
            const q = query(collection(db, 'accounts'), orderBy('name'));
            const querySnapshot = await getDocs(q);
            accounts.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
        } catch (error) {
            console.error('Failed to fetch accounts:', error);
        }
    };

    const addAccount = async (account: Omit<Account, 'id' | 'status'>) => {
        try {
            await addDoc(collection(db, 'accounts'), {
                ...account,
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
        doc.save(`Statement_${account.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return { accounts, fetchAccounts, addAccount, generateStatement };
});
