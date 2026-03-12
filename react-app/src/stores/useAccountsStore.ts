import { create } from 'zustand';
import { db } from '../firebaseConfig';
import { collection, addDoc, getDocs, query, orderBy, where } from 'firebase/firestore';
import { useLocationsStore } from './useLocationsStore';

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

interface AccountsState {
    accounts: Account[];
    loading: boolean;
    fetchAccounts: () => Promise<void>;
    addAccount: (account: Omit<Account, 'id' | 'status' | 'locationId'>) => Promise<void>;
}

export const useAccountsStore = create<AccountsState>((set) => ({
    accounts: [],
    loading: false,

    fetchAccounts: async () => {
        const activeLocationId = useLocationsStore.getState().activeLocationId;
        if (!activeLocationId) return;

        set({ loading: true });
        try {
            const q = query(
                collection(db, 'accounts'),
                where('locationId', '==', activeLocationId),
                orderBy('name')
            );
            const querySnapshot = await getDocs(q);
            const docs = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Account));
            set({ accounts: docs, loading: false });
        } catch (error) {
            console.error('Failed to fetch accounts:', error);
            set({ loading: false });
        }
    },

    addAccount: async (account) => {
        const activeLocationId = useLocationsStore.getState().activeLocationId;
        if (!activeLocationId) return;

        set({ loading: true });
        try {
            await addDoc(collection(db, 'accounts'), {
                ...account,
                locationId: activeLocationId,
                status: 'Active',
                balance: Number(account.balance) || 0,
                creditLimit: Number(account.creditLimit) || 0
            });
            await useAccountsStore.getState().fetchAccounts();
        } catch (error) {
            console.error('Failed to add account:', error);
            set({ loading: false });
        }
    }
}));
