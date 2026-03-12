import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface LiquorProduct {
  id: string;
  name: string;
  category: 'Vodka' | 'Whiskey' | 'Tequila' | 'Wine' | 'Beer';
  bottleSize: string;
  expectedCount: number;
  actualCount: number | null;
  variance: number | null;
  price: number;
}

export const useLiquorStore = defineStore('liquor', () => {
    const products = ref<LiquorProduct[]>([
        { id: 'L1', name: 'Titos Handmade Vodka', category: 'Vodka', bottleSize: '1.75L', expectedCount: 12, actualCount: null, variance: null, price: 29.99 },
        { id: 'L2', name: 'Jack Daniels Black', category: 'Whiskey', bottleSize: '750ml', expectedCount: 8, actualCount: null, variance: null, price: 24.99 },
        { id: 'L3', name: 'Patron Silver', category: 'Tequila', bottleSize: '750ml', expectedCount: 5, actualCount: null, variance: null, price: 45.99 },
        { id: 'L4', name: 'Josh Cellars Cabernet', category: 'Wine', bottleSize: '750ml', expectedCount: 18, actualCount: null, variance: null, price: 14.99 },
        { id: 'L5', name: 'Modelo Especial 12pk', category: 'Beer', bottleSize: '12oz cans', expectedCount: 24, actualCount: null, variance: null, price: 16.99 },
    ]);

    const performAudit = () => {
        products.value.forEach(p => {
            if (p.actualCount !== null) {
                p.variance = p.actualCount - p.expectedCount;
            }
        });
    }

    const totalShrinkageValue = computed(() => {
        return products.value.reduce((acc, p) => {
            if (p.variance && p.variance < 0) {
                return acc + (Math.abs(p.variance) * p.price);
            }
            return acc;
        }, 0);
    });

    return { products, performAudit, totalShrinkageValue };
});
