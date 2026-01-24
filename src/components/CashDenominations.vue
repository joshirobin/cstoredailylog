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
  
  // Format details for storage
  const details = {
    bills: bills.value.reduce((acc: any, b) => { if(b.count > 0) acc[b.value] = b.count; return acc; }, {}),
    coins: coins.value.reduce((acc: any, c) => { if(c.count > 0) acc[c.value] = c.count; return acc; }, {})
  };
  emit('update:details', details);
});

// Watch external model changes (e.g. reset)
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
  <div class="bg-surface-900/30 border border-surface-700/50 rounded-xl overflow-hidden transition-all">
    <!-- Header with Total -->
    <div class="p-4 bg-surface-800/30 border-b border-surface-700/50">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="bg-primary-500/10 p-2 rounded-lg text-primary-400">
             <Calculator class="w-5 h-5" />
          </div>
          <div>
             <div class="text-xs text-surface-400 font-medium uppercase tracking-wide">{{ label }}</div>
             <div class="text-xl font-bold font-mono text-white">${{ total.toFixed(2) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Denomination Inputs - Always Visible -->
    <div class="p-4 bg-surface-900/50">
       <div class="grid grid-cols-2 gap-6">
          <!-- Bills -->
          <div class="space-y-3">
            <h4 class="text-xs font-semibold text-surface-400 uppercase mb-2">Bills</h4>
            <div v-for="bill in bills" :key="bill.value" class="flex items-center gap-3">
               <span class="w-10 text-sm font-medium text-surface-300 text-right">{{ bill.label }}</span>
               <div class="flex-1 relative">
                 <span class="absolute left-3 top-1.5 text-surface-600 text-xs">x</span>
                 <input 
                   v-model.number="bill.count" 
                   type="number" 
                   min="0"
                   class="w-full bg-surface-800 border border-surface-700 rounded px-3 py-2 pl-6 text-base text-white focus:ring-1 focus:ring-primary-500/50 focus:border-primary-500"
                 />
               </div>
               <div class="w-24 text-right text-xs font-mono text-surface-400">
                 <span v-if="bill.count > 0">{{ bill.value }} × {{ bill.count }} = </span>
                 <span class="text-white font-medium">${{ (bill.count * bill.value).toFixed(0) }}</span>
               </div>
            </div>
          </div>

          <!-- Coins -->
          <div class="space-y-3">
            <h4 class="text-xs font-semibold text-surface-400 uppercase mb-2">Coins</h4>
            <div v-for="coin in coins" :key="coin.value" class="flex items-center gap-3">
               <span class="w-10 text-sm font-medium text-surface-300 text-right">{{ coin.label }}</span>
               <div class="flex-1 relative">
                 <span class="absolute left-3 top-1.5 text-surface-600 text-xs">x</span>
                 <input 
                   v-model.number="coin.count" 
                   type="number" 
                   min="0"
                   class="w-full bg-surface-800 border border-surface-700 rounded px-3 py-2 pl-6 text-base text-white focus:ring-1 focus:ring-primary-500/50 focus:border-primary-500"
                 />
               </div>
               <div class="w-24 text-right text-xs font-mono text-surface-400">
                 <span v-if="coin.count > 0">{{ coin.value.toFixed(2) }} × {{ coin.count }} = </span>
                 <span class="text-white font-medium">${{ (coin.count * coin.value).toFixed(2) }}</span>
               </div>
            </div>
          </div>
       </div>
    </div>
  </div>
</template>
