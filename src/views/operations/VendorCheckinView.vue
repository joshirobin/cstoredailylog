<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useVendorStore } from '../../stores/vendors';
import { useAuthStore } from '../../stores/auth';
import { 
  Plus, Package, 
  AlertTriangle, 
  Search, Truck,
  ChevronRight, X
} from 'lucide-vue-next';

const vendorStore = useVendorStore();
const authStore = useAuthStore();

const isAdding = ref(false);
const searchQuery = ref('');
const newDelivery = ref({
    vendorName: '',
    invoiceNumber: '',
    deliveryDate: new Date().toISOString().split('T')[0],
    itemCountExpected: 0,
    itemCountActual: 0,
    shortages: [] as { itemName: string, missingQty: number }[],
    receivedBy: authStore.user?.email?.split('@')[0] || 'Unknown'
});

const currentShortageItem = ref('');
const currentShortageQty = ref(0);

const addShortage = () => {
    if (!currentShortageItem.value || currentShortageQty.value <= 0) return;
    newDelivery.value.shortages.push({
        itemName: currentShortageItem.value,
        missingQty: currentShortageQty.value
    });
    currentShortageItem.value = '';
    currentShortageQty.value = 0;
};

const removeShortage = (index: number) => {
    newDelivery.value.shortages.splice(index, 1);
};

const handleSubmit = async () => {
    try {
        const status = newDelivery.value.itemCountActual < newDelivery.value.itemCountExpected 
            ? 'DISCREPANCY' 
            : 'VERIFIED';
            
        if (!newDelivery.value.deliveryDate) {
            alert("Please select a delivery date");
            return;
        }

        await vendorStore.addDelivery({
            vendorName: newDelivery.value.vendorName,
            invoiceNumber: newDelivery.value.invoiceNumber,
            deliveryDate: String(newDelivery.value.deliveryDate),
            itemCountExpected: newDelivery.value.itemCountExpected,
            itemCountActual: newDelivery.value.itemCountActual,
            shortages: newDelivery.value.shortages,
            receivedBy: newDelivery.value.receivedBy,
            status
        });
        isAdding.value = false;
        newDelivery.value = {
            vendorName: '',
            invoiceNumber: '',
            deliveryDate: new Date().toISOString().split('T')[0],
            itemCountExpected: 0,
            itemCountActual: 0,
            shortages: [],
            receivedBy: authStore.user?.email?.split('@')[0] || 'Unknown'
        };
    } catch (e) {
        alert("Failed to save delivery");
    }
};

const filteredDeliveries = computed(() => {
    if (!searchQuery.value) return vendorStore.deliveries;
    const q = searchQuery.value.toLowerCase();
    return vendorStore.deliveries.filter(d => 
        d.vendorName.toLowerCase().includes(q) || 
        d.invoiceNumber.toLowerCase().includes(q)
    );
});

onMounted(() => vendorStore.fetchDeliveries());
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-8 pb-20">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
            <h1 class="text-4xl font-[1000] text-slate-900 uppercase italic tracking-tighter leading-none mb-3">
                Vendor <span class="text-indigo-600">Receiving</span>
            </h1>
            <p class="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Supply Chain Integrity • Loss Prevention</p>
        </div>

        <button 
            @click="isAdding = true"
            class="flex items-center gap-3 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
        >
            <Plus class="w-4 h-4" />
            New Check-in
        </button>
    </div>

    <!-- Search -->
    <div class="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
        <Search class="w-5 h-5 text-slate-300 ml-2" />
        <input 
            v-model="searchQuery"
            placeholder="Search manifests, vendors, or invoices..."
            class="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold uppercase tracking-widest text-slate-900"
        />
        <div class="hidden md:flex items-center gap-2 px-4 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
            <Truck class="w-3.5 h-3.5 text-slate-400" />
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{{ filteredDeliveries.length }} Shipments</span>
        </div>
    </div>

    <div v-if="isAdding" class="bg-white rounded-[2.5rem] border border-slate-900 border-2 p-8 animate-in slide-in-from-top-4">
        <div class="flex items-center justify-between mb-8">
            <h3 class="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Manifest Verification</h3>
            <button @click="isAdding = false" class="text-slate-400 hover:text-slate-900"><X /></button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div class="space-y-2">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendor Name</label>
                <input v-model="newDelivery.vendorName" class="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold" placeholder="e.g. CORE-MARK, PEPSI" />
            </div>
            <div class="space-y-2">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice #</label>
                <input v-model="newDelivery.invoiceNumber" class="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold" placeholder="INV-0000" />
            </div>
            <div class="space-y-2">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expected Boxes</label>
                <input type="number" v-model.number="newDelivery.itemCountExpected" class="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold" />
            </div>
            <div class="space-y-2">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Actual Received</label>
                <input type="number" v-model.number="newDelivery.itemCountActual" class="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold" />
            </div>
        </div>

        <!-- Shortages Section -->
        <div class="mb-8 p-6 bg-slate-50 rounded-3xl border border-slate-100">
            <h4 class="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                <AlertTriangle class="w-4 h-4 text-orange-500" />
                Discrepancy Log
            </h4>
            
            <div class="flex gap-4 mb-4">
                <input v-model="currentShortageItem" class="flex-1 bg-white border-slate-200 rounded-xl p-2 text-xs" placeholder="Item description..." />
                <input type="number" v-model.number="currentShortageQty" class="w-24 bg-white border-slate-200 rounded-xl p-2 text-xs" placeholder="Qty" />
                <button @click="addShortage" class="px-4 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase">Add</button>
            </div>

            <div class="space-y-2">
                <div v-for="(s, idx) in newDelivery.shortages" :key="idx" class="flex items-center justify-between bg-white border border-slate-100 p-3 rounded-xl">
                    <span class="text-xs font-bold text-slate-700">{{ s.itemName }}</span>
                    <div class="flex items-center gap-4">
                        <span class="text-xs font-black text-rose-500 uppercase">Short {{ s.missingQty }}</span>
                        <button @click="removeShortage(idx)" class="text-slate-300 hover:text-rose-500"><X class="w-4 h-4" /></button>
                    </div>
                </div>
            </div>
        </div>

        <button 
            @click="handleSubmit"
            class="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20"
        >
            Authorize Check-in
        </button>
    </div>

    <!-- History List -->
    <div class="space-y-4">
        <div v-for="d in filteredDeliveries" :key="d.id" class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all group">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="flex items-center gap-4">
                    <div :class="['w-12 h-12 rounded-2xl flex items-center justify-center', d.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600']">
                        <Package v-if="d.status === 'VERIFIED'" class="w-6 h-6" />
                        <AlertTriangle v-else class="w-6 h-6" />
                    </div>
                    <div>
                        <h3 class="text-lg font-black text-slate-900 uppercase italic tracking-tighter">{{ d.vendorName }}</h3>
                        <div class="flex items-center gap-3">
                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inv: {{ d.invoiceNumber }}</span>
                            <div class="w-1 h-1 bg-slate-200 rounded-full"></div>
                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{{ d.deliveryDate }}</span>
                        </div>
                    </div>
                </div>

                <div class="flex flex-wrap items-center gap-4">
                    <div class="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                        <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-tight">Verification Status</p>
                        <p class="text-[10px] font-black text-slate-900 uppercase tracking-widest">{{ d.itemCountActual }}/{{ d.itemCountExpected }} Boxes</p>
                    </div>

                    <div :class="['px-4 py-2 rounded-xl border font-black uppercase text-[10px] tracking-widest', 
                        d.status === 'VERIFIED' ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-rose-100 border-rose-200 text-rose-700']">
                        {{ d.status }}
                    </div>

                    <button class="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-all">
                        <ChevronRight class="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>
