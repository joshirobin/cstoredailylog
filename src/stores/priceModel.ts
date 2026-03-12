import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { db } from '../firebaseConfig';
import {
    collection,
    getDocs,
    addDoc
} from 'firebase/firestore';
import { usePriceBookStore } from './pricebook';
import { useInventoryStore } from './inventory';

export interface Promotion {
    id: string;
    name: string;
    type: 'Markdown' | 'Multi-Buy' | 'Bundle';
    discountType: 'Percentage' | 'Fixed' | 'SetPrice';
    discountValue: number;
    requirementQty: number;
    startDate: any;
    endDate: any;
    active: boolean;
    applicableSkus: string[];
}

export interface IntegratedProduct {
    id: string; // PriceBook ID
    sku: string;
    description: string;
    category: string;
    retailPrice: number;
    cost: number;
    margin: number;
    onHand: number;
    lastUpdated: any;
    activePromotion?: Promotion;
    isTaxable: boolean;
}

export const usePriceModelStore = defineStore('priceModel', () => {
    const priceBookStore = usePriceBookStore();
    const inventoryStore = useInventoryStore();

    const promotions = ref<Promotion[]>([]);
    const loading = ref(false);

    const integratedProducts = computed<IntegratedProduct[]>(() => {
        return priceBookStore.items.map(pbItem => {
            const invItem = inventoryStore.items.find(i => i.sku === pbItem.sku);
            const activePromo = promotions.value.find(p =>
                p.active && p.applicableSkus.includes(pbItem.sku)
            );

            return {
                id: pbItem.id,
                sku: pbItem.sku,
                description: pbItem.description,
                category: pbItem.category,
                retailPrice: pbItem.retail_price,
                cost: pbItem.unitCost || 0,
                margin: pbItem.margin || 0,
                onHand: invItem?.on_hand_qty || 0,
                lastUpdated: pbItem.last_updated,
                activePromotion: activePromo,
                isTaxable: pbItem.taxGroup !== 'Non-Taxable'
            };
        });
    });

    const fetchPromotions = async () => {
        loading.value = true;
        try {
            const snap = await getDocs(collection(db, 'promotions'));
            promotions.value = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Promotion));
        } catch (e) {
            console.error('Failed to fetch promotions:', e);
            // Mock for demo
            promotions.value = [
                {
                    id: 'promo-1',
                    name: 'Summer Soda Sale',
                    type: 'Multi-Buy',
                    discountType: 'SetPrice',
                    discountValue: 3.00,
                    requirementQty: 2,
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 864000000),
                    active: true,
                    applicableSkus: ['049000028904'] // Coke 20oz
                }
            ];
        } finally {
            loading.value = false;
        }
    };

    const addPromotion = async (promo: Omit<Promotion, 'id'>) => {
        try {
            const docRef = await addDoc(collection(db, 'promotions'), promo);
            await fetchPromotions();
            return docRef.id;
        } catch (e) {
            console.error('Failed to add promotion:', e);
            throw e;
        }
    };

    const updateProductPrice = async (sku: string, newRetail: number) => {
        const item = priceBookStore.items.find(i => i.sku === sku);
        if (!item) return;

        await priceBookStore.updateItem(item.id, {
            retail_price: newRetail,
            unitRetail: newRetail // Sync both for compatibility
        });
    };

    const updateInventory = async (sku: string, locId: string, newQty: number) => {
        await inventoryStore.upsertInventoryItem({
            sku,
            locationId: locId,
            on_hand_qty: newQty
        });
    };

    return {
        integratedProducts,
        promotions,
        loading,
        fetchPromotions,
        addPromotion,
        updateProductPrice,
        updateInventory
    };
});
