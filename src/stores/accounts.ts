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
    const accounts = ref<Account[]>([
        { id: 1, name: 'Green Logistics', contact: 'Mark Smith', email: 'mark@greenlog.com', phone: '555-0101', address: '123 Logistics Way', balance: 2450.50, creditLimit: 5000, status: 'Active' },
        { id: 2, name: 'City Construction', contact: 'Sarah Jones', email: 'sarah@cityconst.com', phone: '555-0102', address: '456 Builder Blvd', balance: 5120.00, creditLimit: 10000, status: 'Active' },
        { id: 3, name: 'Valley Landscaping', contact: 'Mike Brown', email: 'mike@valley.com', phone: '555-0103', address: '789 Nature Ln', balance: 850.75, creditLimit: 2000, status: 'Overdue' },
        { id: 4, name: 'Red Trucking', contact: 'David Lee', email: 'david@red.com', phone: '555-0104', address: '321 Haul St', balance: 0.00, creditLimit: 5000, status: 'Inactive' },
    ]);

    const addAccount = (account: Omit<Account, 'id' | 'status'>) => {
        const newId = Math.max(...accounts.value.map(a => Number(a.id))) + 1;
        accounts.value.push({
            ...account,
            id: newId,
            status: 'Active'
        });
    };

    const generateStatement = (account: Account) => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(22);
        doc.setTextColor(14, 165, 233); // Primary Blue
        doc.text('STATEMENT', 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 30);
        doc.text(`Account #: ${account.id}`, 14, 35);

        // Business Info (Sender)
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text('C-Store Daily Ops', 140, 20);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text('123 Gas Station Blvd', 140, 26);
        doc.text('Cityville, ST 12345', 140, 31);
        doc.text('billing@cstoredaily.com', 140, 36);

        // Bill To
        doc.setDrawColor(200);
        doc.line(14, 45, 196, 45); // Horizontal line
        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.text('BILL TO:', 14, 55);
        doc.setFontSize(10);
        doc.text(account.name, 14, 62);
        doc.text(account.contact, 14, 67);
        if (account.address) doc.text(account.address, 14, 72);
        doc.text(account.email, 14, 77);

        // Generate Dummy Transactions for the PDF
        const transactions = [
            { date: '2024-01-05', desc: 'Fuel - Truck #12', amount: 120.50 },
            { date: '2024-01-08', desc: 'Store Supplies', amount: 45.00 },
            { date: '2024-01-12', desc: 'Fuel - Truck #05', amount: 210.00 },
            { date: '2024-01-15', desc: 'Maintenance Service', amount: 150.00 },
            { date: '2024-01-20', desc: 'Fuel - Truck #12', amount: 95.00 },
        ];

        // Table
        autoTable(doc, {
            startY: 85,
            head: [['Date', 'Description', 'Amount']],
            body: transactions.map(t => [t.date, t.desc, `$${t.amount.toFixed(2)}`]),
            theme: 'grid',
            headStyles: { fillColor: [14, 165, 233] }, // Primary Blue
            foot: [['', 'Total Balance', `$${account.balance.toFixed(2)}`]],
            footStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0], fontStyle: 'bold' }
        });

        // Save
        doc.save(`Statement_${account.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return { accounts, addAccount, generateStatement };
});
