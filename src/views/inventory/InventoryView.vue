<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useInventoryStore } from '../../stores/inventory';

import { 
  Package, Search, Filter, Plus, 
  AlertTriangle, 
  Trash2, Edit2, BarChart3, 
  ShoppingCart, RefreshCw, ShieldCheck
} from 'lucide-vue-next';
import { useLocationsStore } from '../../stores/locations';


const inventoryStore = useInventoryStore();
const locationsStore = useLocationsStore();
const searchQuery = ref('');
const selectedCategory = ref('All');
const showAddModal = ref(false);

onMounted(() => {
    inventoryStore.fetchItems();
});

const categories = computed(() => {
    const cats = new Set(inventoryStore.items.map(i => i.category));
    return ['All', ...Array.from(cats)];
});

const filteredItems = computed(() => {
    return inventoryStore.items.filter(item => {
        const matchesSearch = (item.description || '').toLowerCase().includes(searchQuery.value.toLowerCase()) || 
                             item.sku.toLowerCase().includes(searchQuery.value.toLowerCase());
        const matchesCategory = selectedCategory.value === 'All' || item.category === selectedCategory.value;
        return matchesSearch && matchesCategory;
    });
});

const generateAutoOrder = () => {
    const lowStock = inventoryStore.lowStockItems;
    if (lowStock.length === 0) {
        alert("Inventory levels optimal. No auto-order required.");
        return;
    }
    
    const orderList = lowStock.map((i: any) => `${i.description || 'Item'}: Reorder 24 Units (Critical Alert)`).join('\n');
    alert(`Generated Order for ${lowStock.length} items:\n\n${orderList}`);
};

const itemForm = ref({
    sku: '',
    description: '',
    category: 'Grocery',
    on_hand_qty: 0,
    last_cost: 0,
    avg_cost: 0
});

const handleAddItem = async () => {
    if (!locationsStore.activeLocationId) {
        alert("Please select a store location first.");
        return;
    }
    await inventoryStore.addItem({
        ...itemForm.value,
        locationId: locationsStore.activeLocationId,
        last_invoice_id: 'MANUAL'
    } as any);
    showAddModal.value = false;
    itemForm.value = {
        sku: '',
        description: '',
        category: 'Grocery',
        on_hand_qty: 0,
        last_cost: 0,
        avg_cost: 0
    };
};



</script>

<template>
  <div class="space-y-10 animate-in fade-in duration-700">
    <!-- Header -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
      <div class="space-y-2">
        <div class="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full w-fit">
          <Package class="w-3.5 h-3.5 text-primary-500" />
          <span class="text-[10px] uppercase tracking-widest font-black text-slate-400">Inventory Distribution</span>
        </div>
        <h2 class="text-4xl font-black text-slate-900 italic tracking-tighter uppercase">Stock Control Center</h2>
        <p class="text-slate-500 font-medium max-w-lg">Manage SKU logistics, automated procurement, and margin analytics.</p>
      </div>

      <div class="flex gap-4 w-full md:w-auto">
        <button 
          @click="generateAutoOrder"
          class="flex-1 md:flex-none px-6 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <ShoppingCart class="w-4 h-4" />
          Auto-Procurement
        </button>
        <button 
          @click="showAddModal = true"
          class="flex-1 md:flex-none px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-slate-900/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Plus class="w-4 h-4" />
          New SKU Register
        </button>
      </div>
    </div>

    <!-- Quick Insights -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-white p-8 rounded-[2.5rem] border-2 border-slate-50 shadow-sm flex items-center gap-6">
            <div class="w-16 h-16 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center">
                <BarChart3 class="w-8 h-8" />
            </div>
            <div>
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Valuation</p>
                <p class="text-3xl font-black text-slate-900 tracking-tighter">${{ inventoryStore.inventoryValue.toLocaleString() }}</p>
            </div>
        </div>
        <div class="bg-white p-8 rounded-[2.5rem] border-2 border-slate-50 shadow-sm flex items-center gap-6">
            <div :class="['w-16 h-16 rounded-2xl flex items-center justify-center', inventoryStore.lowStockItems.length > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600']">
                <AlertTriangle class="w-8 h-8" />
            </div>
            <div>
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Low Stock Alerts</p>
                <p class="text-3xl font-black text-slate-900 tracking-tighter">{{ inventoryStore.lowStockItems.length }} Units</p>
            </div>
        </div>
        <div class="bg-white p-8 rounded-[2.5rem] border-2 border-slate-50 shadow-sm flex items-center gap-6">
            <div class="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <RefreshCw class="w-8 h-8" />
            </div>
            <div>
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock Turnover</p>
                <p class="text-3xl font-black text-slate-900 tracking-tighter">14.2%</p>
            </div>
        </div>
    </div>

    <!-- Toolbar -->
    <div class="flex flex-col md:flex-row gap-4">
        <div class="relative flex-1">
            <Search class="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
            <input 
                v-model="searchQuery"
                type="text" 
                placeholder="Scan or Search SKU..." 
                class="w-full bg-white border-2 border-slate-50 rounded-2xl pl-16 pr-6 py-5 text-slate-900 font-bold placeholder-slate-200 focus:border-primary-500 transition-all outline-none"
            />
        </div>
        <div class="flex gap-4">
            <select v-model="selectedCategory" class="bg-white border-2 border-slate-50 rounded-2xl px-8 py-5 text-slate-900 font-black uppercase tracking-widest text-[10px] outline-none hover:border-slate-200 transition-all cursor-pointer">
                <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
            </select>
            <button class="bg-white border-2 border-slate-50 rounded-2xl px-6 py-5 text-slate-400 hover:text-slate-900 transition-all">
                <Filter class="w-5 h-5" />
            </button>
        </div>
    </div>

    <!-- Inventory Table -->
    <div class="bg-white rounded-[3rem] border-2 border-slate-50 overflow-hidden shadow-2xl">
        <div class="overflow-x-auto">
            <table class="w-full text-left">
                <thead>
                    <tr class="bg-slate-50/50">
                        <th class="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Product Details</th>
                        <th class="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">SKU/Vector</th>
                        <th class="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Available</th>
                        <th class="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Price / Margin</th>
                        <th class="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                        <th class="px-8 py-6"></th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-50">
                    <tr v-if="inventoryStore.items.length === 0" class="hover:bg-slate-50/50 transition-colors">
                        <td colspan="6" class="px-8 py-20 text-center">
                            <Package class="w-12 h-12 text-slate-100 mx-auto mb-4" />
                            <p class="text-slate-300 font-black uppercase text-xs tracking-widest">No inventory synchronized in frame</p>
                        </td>
                    </tr>
                    <tr v-for="item in filteredItems" :key="item.id" class="hover:bg-slate-50/50 transition-colors group">
                        <td class="px-8 py-6">
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black">
                                    {{ (item.description || 'I')[0] }}
                                </div>
                                <div>
                                    <p class="font-black text-slate-900 uppercase italic tracking-tighter">{{ item.description || 'Unknown Item' }}</p>
                                    <p class="text-[9px] font-black text-primary-600 uppercase tracking-widest">{{ item.category || 'Uncategorized' }}</p>
                                </div>
                            </div>
                        </td>
                        <td class="px-8 py-6">
                            <code class="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-mono text-slate-600">{{ item.sku }}</code>
                        </td>
                        <td class="px-8 py-6">
                            <div class="flex items-center gap-3">
                                <span :class="['text-xl font-black tracking-tighter', (item.on_hand_qty || 0) <= 5 ? 'text-amber-500' : 'text-slate-900']">
                                    {{ item.on_hand_qty }}
                                </span>
                                <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Units</span>
                            </div>
                        </td>
                        <td class="px-8 py-6">
                            <div class="space-y-1">
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Last Cost</p>
                                <p class="text-sm font-black text-slate-900">${{ (item.last_cost || 0).toFixed(2) }}</p>
                                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Avg: ${{ (item.avg_cost || 0).toFixed(2) }}</p>
                            </div>
                        </td>
                        <td class="px-8 py-6">
                            <div v-if="(item.on_hand_qty || 0) <= 5" class="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-600 rounded-full border border-amber-100">
                                <AlertTriangle class="w-3 h-3" />
                                <span class="text-[9px] font-black uppercase tracking-widest">Low Stock</span>
                            </div>
                            <div v-else class="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                                <ShieldCheck class="w-3 h-3" />
                                <span class="text-[9px] font-black uppercase tracking-widest">Optimal</span>
                            </div>
                        </td>
                        <td class="px-8 py-6 text-right">
                            <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button class="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-primary-600 hover:border-primary-100 transition-all shadow-sm">
                                    <Edit2 class="w-4 h-4" />
                                </button>
                                <button class="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-rose-600 hover:border-rose-100 transition-all shadow-sm">
                                    <Trash2 class="w-4 h-4" />
                                </button>
                            </div>
                        </td>
                    </tr>

                </tbody>
            </table>
        </div>
    </div>

    <!-- Add Item Modal -->
    <div v-if="showAddModal" class="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-md" @click="showAddModal = false"></div>
        <div class="bg-white rounded-[3.5rem] w-full max-w-2xl relative z-10 overflow-hidden animate-in zoom-in duration-300 shadow-2xl">
            <div class="p-10 pb-0 flex justify-between items-start">
                <div>
                    <h3 class="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">SKU Registration</h3>
                    <p class="text-[10px] font-black text-primary-600 uppercase tracking-widest mt-1">Initialize New Product Vector</p>
                </div>
                <button @click="showAddModal = false" class="text-slate-400 hover:text-slate-900">
                    <Trash2 class="w-6 h-6" />
                </button>
            </div>
            
            <form @submit.prevent="handleAddItem" class="p-10 space-y-8">
                <div class="grid grid-cols-2 gap-6">
                    <div class="space-y-2">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SKU / Barcode</label>
                        <input v-model="itemForm.sku" type="text" required class="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 text-sm font-bold placeholder-slate-200 focus:bg-white focus:border-primary-500 transition-all outline-none" placeholder="000-0000-000" />
                    </div>
                    <div class="space-y-2">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Product Description</label>
                        <input v-model="itemForm.description" type="text" required class="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 text-sm font-bold placeholder-slate-200 focus:bg-white focus:border-primary-500 transition-all outline-none" placeholder="Premium Fuel Additive" />
                    </div>
                    <div class="space-y-2">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                        <select v-model="itemForm.category" required class="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 text-sm font-bold focus:bg-white focus:border-primary-500 transition-all outline-none">
                            <option value="Fuel">Fuel</option>
                            <option value="Beverage">Beverage</option>
                            <option value="Snacks">Snacks</option>
                            <option value="Auto">Auto</option>
                            <option value="Tobacco">Tobacco</option>
                            <option value="Grocery">Grocery</option>
                        </select>
                    </div>
                    <div class="space-y-2">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Initial Quantity</label>
                        <input v-model.number="itemForm.on_hand_qty" type="number" required class="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 text-sm font-bold focus:bg-white focus:border-primary-500 transition-all outline-none" />
                    </div>
                    <div class="space-y-2">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cost Price ($)</label>
                        <input v-model.number="itemForm.last_cost" type="number" step="0.01" required class="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 text-sm font-bold focus:bg-white focus:border-primary-500 transition-all outline-none" />
                    </div>
                    <div class="space-y-2">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Avg Cost ($)</label>
                        <input v-model.number="itemForm.avg_cost" type="number" step="0.01" required class="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 text-sm font-bold focus:bg-white focus:border-primary-500 transition-all outline-none" />
                    </div>

                </div>

                <div class="flex gap-4">
                    <button type="button" @click="showAddModal = false" class="flex-1 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black uppercase text-xs tracking-widest transition-all">Abort</button>
                    <button type="submit" class="flex-[2] py-5 bg-slate-900 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-slate-900/20 hover:scale-[1.02] transition-all">Commit SKU</button>
                </div>
            </form>
        </div>
    </div>
  </div>
</template>
