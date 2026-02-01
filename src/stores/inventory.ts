import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { db } from '../firebaseConfig';
import { collection, addDoc, getDocs, updateDoc, doc, query, where, Timestamp } from 'firebase/firestore';
import { useLocationsStore } from './locations';

export interface InventoryItem {
    id: string;
    locationId: string;
    sku: string;
    description?: string;
    category?: string;
    on_hand_qty: number;
    last_cost: number;
    avg_cost: number;
    last_invoice_id?: string;
    last_updated?: any;
}

export const useInventoryStore = defineStore('inventory', () => {
    const items = ref<InventoryItem[]>([]);
    const loading = ref(false);

    const fetchItems = async (locId?: string) => {
        const locationsStore = useLocationsStore();
        const activeId = locId || locationsStore.activeLocationId;
        if (!activeId) return;

        loading.value = true;
        try {
            const q = query(collection(db, 'inventory_items'), where('locationId', '==', activeId));
            const querySnapshot = await getDocs(q);
            items.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
        } catch (error) {
            console.error('Failed to fetch inventory:', error);
        } finally {
            loading.value = false;
        }
    };

    const getItemBySku = async (sku: string, locId: string): Promise<InventoryItem | null> => {
        const q = query(
            collection(db, 'inventory_items'),
            where('sku', '==', sku),
            where('locationId', '==', locId)
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty || !snapshot.docs[0]) return null;
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as InventoryItem;
    };

    const upsertInventoryItem = async (item: Partial<InventoryItem> & { sku: string; locationId: string }) => {
        try {
            const existing = await getItemBySku(item.sku, item.locationId);
            if (existing) {
                const itemRef = doc(db, 'inventory_items', existing.id);
                await updateDoc(itemRef, {
                    ...item,
                    last_updated: Timestamp.now()
                });
            } else {
                await addDoc(collection(db, 'inventory_items'), {
                    ...item,
                    last_updated: Timestamp.now()
                });
            }
            await fetchItems(item.locationId);
        } catch (error) {
            console.error('Failed to upsert inventory item:', error);
            throw error;
        }
    };

    const lowStockItems = computed(() => {
        return items.value.filter(item => (item.on_hand_qty || 0) <= 5);
    });

    const inventoryValue = computed(() => {
        return items.value.reduce((total, item) => total + (item.on_hand_qty * item.last_cost), 0);
    });

    return {
        items,
        loading,
        fetchItems,
        getItemBySku,
        upsertInventoryItem,
        addItem: upsertInventoryItem, // Alias for View compatibility
        lowStockItems,
        inventoryValue
    };

});
