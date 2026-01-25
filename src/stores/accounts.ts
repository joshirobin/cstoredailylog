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

export const useAccountsStore = defineStore('accounts', () => {
    const accounts = ref<Account[]>([]);
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

    const fetchAccounts = async () => {
        try {
            const response = await fetch(`${API_URL}/accounts`);
            if (response.ok) {
                accounts.value = await response.json();
            }
        } catch (error) {
            console.error('Failed to fetch accounts:', error);
            // Optional: fallback to dummy data if needed
            accounts.value = [
                { id: 1, name: 'Green Logistics', contact: 'Mark Smith', email: 'mark@greenlog.com', phone: '555-0101', address: '123 Logistics Way', balance: 2450.50, creditLimit: 5000, status: 'Active' },
                { id: 2, name: 'City Construction', contact: 'Sarah Jones', email: 'sarah@cityconst.com', phone: '555-0102', address: '456 Builder Blvd', balance: 5120.00, creditLimit: 10000, status: 'Active' },
            ];
        }
    };

    const addAccount = async (account: Omit<Account, 'id' | 'status'>) => {
        try {
            const response = await fetch(`${API_URL}/accounts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...account, status: 'Active' })
            });
            if (response.ok) {
                await fetchAccounts();
            }
        } catch (error) {
            console.error('Failed to add account:', error);
        }
    };

    const generateStatement = (account: Account) => {
        const doc = new jsPDF();
        // ... (remaining generateStatement logic)
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
        const transactions = [
            { date: '2024-01-05', desc: 'Fuel - Truck #12', amount: 120.50 },
            { date: '2024-01-08', desc: 'Store Supplies', amount: 45.00 },
            { date: '2024-01-12', desc: 'Fuel - Truck #05', amount: 210.00 },
        ];
        autoTable(doc, {
            startY: 85,
            head: [['Date', 'Description', 'Amount']],
            body: transactions.map(t => [t.date, t.desc, `$${t.amount.toFixed(2)}`]),
            theme: 'grid',
            headStyles: { fillColor: [14, 165, 233] },
            foot: [['', 'Total Balance', `$${Number(account.balance).toFixed(2)}`]],
            footStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0], fontStyle: 'bold' }
        });
        doc.save(`Statement_${account.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return { accounts, fetchAccounts, addAccount, generateStatement };
});
