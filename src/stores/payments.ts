import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db } from '../firebaseConfig';
import { collection, addDoc, getDocs, query, orderBy, where, doc, updateDoc, increment } from 'firebase/firestore';

export interface Payment {
    id: string;
    accountId: string;
    accountName: string; // denormalized for easier display
    amount: number;
    date: string;
    method: 'Cash' | 'Check' | 'Credit Card' | 'Bank Transfer';
    reference?: string; // Check number or transaction ID
    notes?: string;
    createdAt: string;
}

export const usePaymentsStore = defineStore('payments', () => {
    const payments = ref<Payment[]>([]);

    const fetchPayments = async () => {
        try {
            const q = query(collection(db, 'payments'), orderBy('date', 'desc'));
            const querySnapshot = await getDocs(q);
            payments.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
        } catch (error) {
            console.error('Failed to fetch payments:', error);
        }
    };

    const fetchPaymentsByAccount = async (accountId: string) => {
        try {
            const q = query(collection(db, 'payments'), where('accountId', '==', accountId), orderBy('date', 'desc'));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
        } catch (error) {
            console.error('Failed to fetch account payments:', error);
            return [];
        }
    };

    const addPayment = async (payment: Omit<Payment, 'id' | 'createdAt'>) => {
        try {
            const paymentData = {
                ...payment,
                createdAt: new Date().toISOString()
            };

            // 1. Add Payment Record
            const docRef = await addDoc(collection(db, 'payments'), paymentData);

            // 2. Update Account Balance (Decrease balance)
            const accountRef = doc(db, 'accounts', payment.accountId);
            await updateDoc(accountRef, {
                balance: increment(-Math.abs(payment.amount)), // Reduce the debt
                lastPaymentDate: payment.date
            });

            // 3. Refresh local state
            await fetchPayments();
            return docRef.id;
        } catch (error) {
            console.error('Failed to add payment:', error);
            throw error;
        }
    };

    return { payments, fetchPayments, fetchPaymentsByAccount, addPayment };
});
