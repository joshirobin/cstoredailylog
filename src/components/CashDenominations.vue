<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { Calculator } from 'lucide-vue-next';

const props = defineProps<{
  label: string;
  modelValue: number | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void;
  (e: 'update:details', value: { bills: any, coins: any }): void;
}>();

const bills = ref([
  { value: 100, label: '$100', count: 0 },
  { value: 50, label: '$50', count: 0 },
  { value: 20, label: '$20', count: 0 },
  { value: 10, label: '$10', count: 0 },
  { value: 5, label: '$5', count: 0 },
  { value: 1, label: '$1', count: 0 },
]);

const coins = ref([
  { value: 1.00, label: '$1.00', count: 0 },
  { value: 0.50, label: '50¢', count: 0 },
  { value: 0.25, label: '25¢', count: 0 },
  { value: 0.10, label: '10¢', count: 0 },
  { value: 0.05, label: '5¢', count: 0 },
  { value: 0.01, label: '1¢', count: 0 },
]);

const total = computed(() => {
  const billsTotal = bills.value.reduce((acc, b) => acc + (b.count * b.value), 0);
  const coinsTotal = coins.value.reduce((acc, c) => acc + (c.count * c.value), 0);
  return Number((billsTotal + coinsTotal).toFixed(2));
});

watch(total, (newVal) => {
  emit('update:modelValue', newVal);
  
  const details = {
    bills: bills.value.reduce((acc: any, b) => { if(b.count > 0) acc[b.value] = b.count; return acc; }, {}),
    coins: coins.value.reduce((acc: any, c) => { if(c.count > 0) acc[c.value] = c.count; return acc; }, {})
  };
  emit('update:details', details);
});

watch(() => props.modelValue, (newVal) => {
  if (newVal === 0 || newVal === null) {
     if (total.value !== 0 && total.value !== newVal) {
        bills.value.forEach(b => b.count = 0);
        coins.value.forEach(c => c.count = 0);
     }
  }
});
</script>

<template>
  <div class="bg-transparent border-2 border-slate-100 rounded-3xl overflow-hidden transition-all mb-4">
    <!-- Header with Total -->
    <div class="p-6 bg-slate-50 border-b border-slate-100">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="bg-primary-100 p-3 rounded-2xl text-primary-600">
             <Calculator class="w-6 h-6" />
          </div>
          <div>
             <div class="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">{{ label }}</div>
             <div class="text-3xl font-black font-mono text-slate-900 tracking-tighter">${{ total.toFixed(2) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Denomination Inputs -->
    <div class="p-8 bg-white/50 backdrop-blur-sm">
       <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <!-- Bills -->
          <div class="space-y-4">
            <h4 class="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Paper Currency</h4>
            <div v-for="bill in bills" :key="bill.value" class="flex items-center gap-4 group">
               <span class="w-12 text-sm font-black text-slate-400 text-right italic">{{ bill.label }}</span>
               <div class="flex-1 relative">
                 <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-xs uppercase pointer-events-none">qty</span>
                 <input 
                   v-model.number="bill.count" 
                   type="number" 
                   min="0"
                   class="no-spinner w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 pl-12 text-lg font-black text-slate-900 focus:bg-white focus:border-primary-500 transition-all outline-none"
                   placeholder="0"
                 />
               </div>
               <div class="w-28 text-right">
                 <span class="text-lg font-black font-mono text-emerald-600 tracking-tighter">${{ (bill.count * bill.value).toFixed(0) }}</span>
               </div>
            </div>
          </div>

          <!-- Coins -->
          <div class="space-y-4">
             <h4 class="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Coinage / Rolls</h4>
             <div v-for="coin in coins" :key="coin.value" class="flex items-center gap-4 group">
                <span class="w-12 text-sm font-black text-slate-400 text-right italic">{{ coin.label }}</span>
                <div class="flex-1 relative">
                  <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-xs uppercase pointer-events-none">qty</span>
                  <input 
                    v-model.number="coin.count" 
                    type="number" 
                    min="0"
                    class="no-spinner w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 pl-12 text-lg font-black text-slate-900 focus:bg-white focus:border-primary-500 transition-all outline-none"
                    placeholder="0"
                  />
                </div>
                <div class="w-28 text-right">
                  <span class="text-lg font-black font-mono text-emerald-600 tracking-tighter">${{ (coin.count * coin.value).toFixed(2) }}</span>
                </div>
             </div>
          </div>
       </div>
    </div>
  </div>
</template>

<style scoped>
/* Remove number spinners */
.no-spinner::-webkit-inner-spin-button,
.no-spinner::-webkit-outer-spin-button {
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
}
.no-spinner {
  -moz-appearance: textfield;
  appearance: textfield;
}

.font-mono {
    font-family: 'JetBrains Mono', monospace;
}
</style>
