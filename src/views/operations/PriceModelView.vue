<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { usePriceModelStore, type IntegratedProduct } from '../../stores/priceModel';
import { useLocationsStore } from '../../stores/locations';
import { usePriceBookStore } from '../../stores/pricebook';
import { useInventoryStore } from '../../stores/inventory';
import { 
    Tag, 
    Zap, 
    Box, 
    Percent, 
    Plus, 
    Search,
    Save,
    Sparkles,
    ChevronRight,
    ArrowRightLeft,
    Layers
} from 'lucide-vue-next';

const priceModelStore = usePriceModelStore();
const locationsStore = useLocationsStore();
const priceBookStore = usePriceBookStore();
const inventoryStore = useInventoryStore();

const searchQuery = ref('');
const selectedProduct = ref<IntegratedProduct | null>(null);
const showPromoModal = ref(false);
const isSaving = ref(false);

const filteredProducts = computed(() => {
    if (!searchQuery.value) return priceModelStore.integratedProducts.slice(0, 12);
    const q = searchQuery.value.toLowerCase();
    return priceModelStore.integratedProducts.filter(p => 
        p.description.toLowerCase().includes(q) || 
        p.sku.toLowerCase().includes(q)
    );
});

const newPrice = ref(0);
const newQty = ref(0);

const selectProduct = (p: IntegratedProduct) => {
    selectedProduct.value = p;
    newPrice.value = p.retailPrice;
    newQty.value = p.onHand;
};

const handleQuickUpdate = async () => {
    if (!selectedProduct.value) return;
    isSaving.value = true;
    try {
        if (newPrice.value !== selectedProduct.value.retailPrice) {
            await priceModelStore.updateProductPrice(selectedProduct.value.sku, newPrice.value);
        }
        if (newQty.value !== selectedProduct.value.onHand) {
            await priceModelStore.updateInventory(
                selectedProduct.value.sku, 
                locationsStore.activeLocationId || '', 
                newQty.value
            );
        }
        // Refresh local state if needed (stores usually handle this)
        selectedProduct.value = null;
    } catch (e) {
        alert("Update failed");
    } finally {
        isSaving.value = false;
    }
};

const activePromos = computed(() => priceModelStore.promotions.filter(p => p.active));

onMounted(async () => {
    loading.value = true;
    await Promise.all([
        priceBookStore.fetchItems(),
        inventoryStore.fetchItems(),
        priceModelStore.fetchPromotions()
    ]);
    loading.value = false;
});

const loading = ref(false);

const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-6 duration-1000">
    <!-- Sophisticated Command Header -->
    <div class="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
        <div>
            <div class="flex items-center gap-3 mb-3">
                <div class="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-primary-400 border border-slate-800 shadow-2xl">
                    <Zap class="w-5 h-5 fill-current" />
                </div>
                <span class="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Unified Price Intelligence</span>
            </div>
            <h1 class="text-5xl font-[1000] text-slate-900 uppercase italic tracking-tighter leading-none">
                Integrated <span class="text-primary-600">Price</span> Model
            </h1>
            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mt-3 flex items-center gap-2">
                <Layers class="w-4 h-4 text-indigo-500" />
                Synchronizing Price Book, Live Inventory & Active Promotions
            </p>
        </div>

        <div class="flex flex-wrap gap-3">
            <button class="flex items-center gap-3 px-6 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all shadow-sm">
                <Sparkles class="w-4 h-4 text-primary-500" />
                AI Strategy
            </button>
            <button @click="showPromoModal = true" class="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-900/20">
                <Plus class="w-4 h-4" />
                New Promotion
            </button>
        </div>
    </div>

    <!-- Main Workspace Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- Search & Discovery Column -->
        <div class="lg:col-span-8 space-y-6">
            <div class="relative group">
                <Search class="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 group-focus-within:text-primary-500 transition-colors" />
                <input 
                    v-model="searchQuery"
                    placeholder="Search by SKU, Description or Category..."
                    class="w-full bg-white border-4 border-slate-50 rounded-[2.5rem] pl-16 pr-8 py-6 text-xl font-black italic tracking-tighter placeholder-slate-200 focus:border-primary-100 transition-all outline-none shadow-xl shadow-slate-200/20"
                />
            </div>

            <!-- Integrated Product Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                    v-for="product in filteredProducts" 
                    :key="product.id"
                    @click="selectProduct(product)"
                    :class="[
                        'bg-white p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer group hover:shadow-2xl relative overflow-hidden',
                        selectedProduct?.id === product.id ? 'border-primary-500 ring-4 ring-primary-50/50 shadow-2xl scale-[1.02]' : 'border-slate-50 border-transparent hover:border-slate-100'
                    ]"
                >
                    <!-- Status Decoration -->
                    <div v-if="product.activePromotion" class="absolute top-0 right-0 px-4 py-1.5 bg-rose-500 text-white text-[8px] font-black uppercase tracking-widest rounded-bl-2xl">
                        Promo Active
                    </div>

                    <div class="flex flex-col h-full space-y-4">
                        <div class="flex justify-between items-start">
                            <div>
                                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{{ product.category }}</p>
                                <h3 class="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-tight group-hover:text-primary-600 transition-colors">
                                    {{ product.description }}
                                </h3>
                                <p class="text-[10px] font-mono font-bold text-slate-300 mt-1 uppercase">{{ product.sku }}</p>
                            </div>
                        </div>

                        <div class="grid grid-cols-3 gap-2 pt-4 border-t border-slate-50">
                            <div>
                                <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Retail</p>
                                <p class="text-lg font-black text-slate-900 italic tracking-tighter">{{ formatCurrency(product.retailPrice) }}</p>
                            </div>
                            <div class="border-x border-slate-50 px-2">
                                <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">On Hand</p>
                                <p :class="['text-lg font-black italic tracking-tighter', product.onHand < 5 ? 'text-rose-500' : 'text-slate-900']">
                                    {{ product.onHand }}
                                </p>
                            </div>
                            <div class="text-right">
                                <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Margin</p>
                                <p class="text-lg font-black text-emerald-600 italic tracking-tighter">{{ product.margin }}%</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Empty State -->
            <div v-if="filteredProducts.length === 0" class="py-20 text-center bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-100">
                <Box class="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <p class="text-xl font-black text-slate-300 uppercase italic tracking-tighter">No items found in perimeter</p>
            </div>
        </div>

        <!-- Management Panel -->
        <div class="lg:col-span-4 space-y-6">
            <!-- Quick Edit Console -->
            <div class="bg-slate-900 rounded-[3rem] p-8 text-white relative overflow-hidden shadow-2xl sticky top-8">
                <!-- Abstract Background -->
                <div class="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-[80px]"></div>
                <div class="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[40px]"></div>

                <div class="relative z-10 space-y-8">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 backdrop-blur-md">
                            <ArrowRightLeft class="w-6 h-6 text-primary-400" />
                        </div>
                        <div>
                            <h3 class="text-xl font-black uppercase italic tracking-tighter">Quick Controller</h3>
                            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active SKU: {{ selectedProduct?.sku || 'None' }}</p>
                        </div>
                    </div>

                    <div v-if="selectedProduct" class="space-y-8 animate-in slide-in-from-right-4">
                        <!-- Price Input -->
                        <div class="space-y-3">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Live Retail Price</label>
                            <div class="relative group">
                                <div class="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-black text-white/20 italic">$</div>
                                <input 
                                    v-model.number="newPrice"
                                    type="number" 
                                    step="0.01"
                                    class="w-full bg-white/5 border border-white/10 rounded-[1.5rem] py-8 pl-20 pr-8 text-5xl font-black italic tracking-tighter text-white focus:bg-white/10 transition-all outline-none"
                                />
                            </div>
                        </div>

                        <!-- Inventory Input -->
                        <div class="space-y-3">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Inventory Adjustment</label>
                            <div class="flex items-center gap-4">
                                <input 
                                    v-model.number="newQty"
                                    type="number" 
                                    class="flex-1 bg-white/5 border border-white/10 rounded-[1.5rem] py-6 px-8 text-2xl font-black text-white focus:bg-white/10 transition-all outline-none"
                                />
                                <div class="px-6 py-6 bg-primary-600/20 text-primary-400 rounded-[1.5rem] font-black border border-primary-500/30">
                                    Units
                                </div>
                            </div>
                        </div>

                        <!-- Action -->
                        <button 
                            @click="handleQuickUpdate"
                            :disabled="isSaving"
                            class="w-full py-6 bg-primary-600 hover:bg-primary-700 text-white rounded-[2rem] font-black uppercase text-sm tracking-widest shadow-xl shadow-primary-500/20 transition-all flex items-center justify-center gap-4 group"
                        >
                            <Save v-if="!isSaving" class="w-5 h-5 group-hover:scale-110 transition-transform" />
                            <span v-else class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            {{ isSaving ? 'Committing...' : 'Synchonize Update' }}
                        </button>
                    </div>

                    <div v-else class="py-20 text-center opacity-50 space-y-4">
                        <Tag class="w-12 h-12 mx-auto text-slate-400" />
                        <p class="text-xs font-black uppercase tracking-[0.3em] max-w-[200px] mx-auto leading-relaxed">Select a product from the left to engage pricing controller</p>
                    </div>
                </div>
            </div>

            <!-- Promotion Summary -->
             <div class="bg-white rounded-[3rem] border border-slate-100 p-8 shadow-sm">
                <h3 class="text-xs font-black text-slate-900 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                    <Percent class="w-4 h-4 text-rose-500" /> Live Promotions
                </h3>
                <div class="space-y-4">
                    <div v-for="promo in activePromos" :key="promo.id" class="p-5 bg-rose-50 rounded-[2rem] border border-rose-100 flex items-center justify-between group cursor-help">
                        <div>
                            <p class="text-sm font-black text-rose-900 uppercase italic tracking-tighter">{{ promo.name }}</p>
                            <p class="text-[9px] font-black text-rose-400 uppercase tracking-widest mt-1">{{ promo.type }} • Qty: {{ promo.requirementQty }}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-lg font-black text-rose-600 italic tracking-tighter">-${{ promo.discountValue.toFixed(2) }}</p>
                            <ChevronRight class="w-4 h-4 text-rose-300 ml-auto" />
                        </div>
                    </div>

                    <div v-if="activePromos.length === 0" class="py-10 text-center opacity-40">
                        <p class="text-[10px] font-black uppercase tracking-widest">No active sales vectors</p>
                    </div>
                </div>
             </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
.font-mono {
    font-family: 'JetBrains Mono', monospace;
}
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>
