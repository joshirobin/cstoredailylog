import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db } from '../firebaseConfig';
import { useLocationsStore } from './locations';
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
    where,
    Timestamp
} from 'firebase/firestore';


export interface Vendor {
    id: string;
    name: string;
    contact?: string;
    email?: string;
    phone?: string;
    address?: string;
    category?: string;
    locationId: string;
    createdAt: any;
}

export interface PurchaseItem {
    qty: number;
    code: string;
    scanCode: string;
    description: string;
    department: string;
    priceGroup: string;
    productCategory: string;
    units: number;
    caseCost: number;
    caseDisc: number;
    costPerUnitAfterDisc: number;
    extdCaseCost: number;
    unitRetail: number;
    extdCaseRetail: number;
    size?: string;
    margin: number;
    defaultMargin?: number;
    marginAfterRebate?: number;
    totalCost: number;
}



export interface Purchase {
    id: string;
    vendorId: string;
    vendorName: string;
    invoiceNumber: string;
    date: any;
    totalAmount: number;
    items?: PurchaseItem[];
    status: 'Pending' | 'Paid' | 'Cancelled';
    fileUrl?: string;
    rawScanData?: string;
    locationId: string;
    createdAt: any;
}

export const usePurchasesStore = defineStore('purchases', () => {
    const purchases = ref<Purchase[]>([]);
    const vendors = ref<Vendor[]>([]);
    const loading = ref(false);

    const fetchVendors = async () => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        try {
            const q = query(
                collection(db, 'vendors'),
                where('locationId', '==', locationsStore.activeLocationId)
            );
            const querySnapshot = await getDocs(q);
            vendors.value = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Vendor));
        } catch (error) {
            console.error('Error fetching vendors:', error);
        }
    };

    const getOrCreateVendor = async (name: string): Promise<Vendor | null> => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return null;

        const existing = vendors.value.find(v => v.name.toLowerCase() === name.toLowerCase());
        if (existing) return existing;

        const newVendor: Omit<Vendor, 'id' | 'locationId'> = {
            name,
            createdAt: Timestamp.now()
        };

        const docRef = await addDoc(collection(db, 'vendors'), {
            ...newVendor,
            locationId: locationsStore.activeLocationId
        });
        const created = { id: docRef.id, ...newVendor, locationId: locationsStore.activeLocationId } as Vendor;
        vendors.value.push(created);
        return created;
    };

    const fetchPurchases = async () => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        loading.value = true;
        try {
            const q = query(
                collection(db, 'purchases'),
                where('locationId', '==', locationsStore.activeLocationId),
                orderBy('date', 'desc')
            );
            const querySnapshot = await getDocs(q);
            purchases.value = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Purchase));
        } catch (error) {
            console.error('Error fetching purchases:', error);
        } finally {
            loading.value = false;
        }
    };

    const calculateSuggestedRetail = (cost: number, targetMargin: number) => {
        // Retail = Cost / (1 - margin)
        if (targetMargin >= 100) return cost * 1.5;
        return cost / (1 - (targetMargin / 100));
    };

    const syncItemsToLedger = async (items: PurchaseItem[], invoiceId: string) => {
        const locationsStore = useLocationsStore();
        const activeId = locationsStore.activeLocationId;
        if (!activeId) return;

        const inventoryRef = collection(db, 'inventory_items');
        const priceBookRef = collection(db, 'price_book_items');
        const rulesRef = collection(db, 'pricing_rules');

        // Fetch rules (e.g., target margin by category)
        const rulesSnapshot = await getDocs(rulesRef);
        const rules = rulesSnapshot.docs.map(d => d.data());

        for (const item of items) {
            if (!item.scanCode) continue;

            // 1. Inventory Cost Update
            const invQ = query(inventoryRef, where('sku', '==', item.scanCode), where('locationId', '==', activeId));
            const invSnapshot = await getDocs(invQ);

            const invData = {
                locationId: activeId,
                sku: item.scanCode,
                description: item.description,
                category: item.department,
                last_cost: item.costPerUnitAfterDisc || 0,
                avg_cost: item.costPerUnitAfterDisc || 0,
                last_invoice_id: invoiceId,
                last_updated: Timestamp.now()
            };


            if (invSnapshot.empty) {
                await addDoc(inventoryRef, { ...invData, on_hand_qty: item.qty });
            } else if (invSnapshot.docs[0]) {
                const existing = invSnapshot.docs[0].data();
                const newQty = (existing.on_hand_qty || 0) + item.qty;
                await updateDoc(doc(db, 'inventory_items', invSnapshot.docs[0].id), {
                    ...invData,
                    on_hand_qty: newQty
                });
            }

            // 2 & 3. Price Book Rule Check & Suggested New Retail
            const pbQ = query(priceBookRef, where('sku', '==', item.scanCode), where('locationId', '==', activeId));
            const pbSnapshot = await getDocs(pbQ);

            const categoryRule = rules.find(r => r.scope === item.department) || { minMargin: 25 };
            const newCost = item.costPerUnitAfterDisc || 0;

            let currentRetail = item.unitRetail || 0;
            let needsApproval = false;
            let suggestedRetail = currentRetail;

            if (!pbSnapshot.empty && pbSnapshot.docs[0]) {
                const existingPb = pbSnapshot.docs[0].data();
                currentRetail = existingPb.retail_price || currentRetail;
            }

            // Calculate current margin based on new cost
            const currentMarginWithNewCost = currentRetail > 0 ? ((currentRetail - newCost) / currentRetail) * 100 : 0;

            if (currentMarginWithNewCost < categoryRule.minMargin) {
                needsApproval = true;
                suggestedRetail = Number(calculateSuggestedRetail(newCost, categoryRule.minMargin + 5).toFixed(2));
            }

            // 4 & 5. Approval & POS Sync Gating
            const pbData = {
                locationId: activeId,
                sku: item.scanCode,
                description: item.description,
                retail_price: currentRetail,
                suggested_retail: suggestedRetail,
                needs_approval: needsApproval,
                pos_sync_status: needsApproval ? 'Pending' : 'Synced',
                price_type: 'Regular',
                status: 'Active',
                last_updated: Timestamp.now()
            };

            if (pbSnapshot.empty) {
                await addDoc(priceBookRef, pbData);
            } else if (pbSnapshot.docs[0]) {
                await updateDoc(doc(db, 'price_book_items', pbSnapshot.docs[0].id), pbData);
            }
        }
    };

    const addPurchase = async (purchase: Omit<Purchase, 'id' | 'createdAt' | 'locationId'>) => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        try {
            const docRef = await addDoc(collection(db, 'purchases'), {
                ...purchase,
                locationId: locationsStore.activeLocationId,
                createdAt: Timestamp.now()
            });

            if (purchase.items && purchase.items.length > 0) {
                await syncItemsToLedger(purchase.items, docRef.id);
            }


            await fetchPurchases();
            return docRef.id;
        } catch (error) {
            console.error('Error adding purchase:', error);
            throw error;
        }
    };

    const updatePurchase = async (id: string, updates: Partial<Purchase>) => {
        try {
            const purchaseRef = doc(db, 'purchases', id);
            await updateDoc(purchaseRef, updates);

            if (updates.items && updates.items.length > 0) {
                await syncItemsToLedger(updates.items, id);
            }


            await fetchPurchases();
        } catch (error) {
            console.error('Error updating purchase:', error);
            throw error;
        }
    };

    const deletePurchase = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'purchases', id));
            await fetchPurchases();
        } catch (error) {
            console.error('Error deleting purchase:', error);
            throw error;
        }
    };

    return {
        purchases,
        vendors,
        loading,
        fetchVendors,
        getOrCreateVendor,
        fetchPurchases,
        addPurchase,
        updatePurchase,
        deletePurchase
    };
});
