<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { usePaymentsStore } from '../../stores/payments';
import { Plus, Search, Calendar, CreditCard, DollarSign } from 'lucide-vue-next';

const router = useRouter();
const paymentsStore = usePaymentsStore();
const searchQuery = ref('');

onMounted(async () => {
    await paymentsStore.fetchPayments();
});

const filteredPayments = computed(() => {
    return paymentsStore.payments.filter(p => 
        p.accountName.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        p.reference?.toLowerCase().includes(searchQuery.value.toLowerCase())
    );
});
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold font-display text-slate-900">Payments</h2>
        <p class="text-slate-500 text-sm">Track all incoming payments from accounts.</p>
      </div>
      <button @click="router.push('/payments/new')" class="btn-primary flex items-center gap-2">
        <Plus class="w-4 h-4" />
        Record Payment
      </button>
    </div>

    <div class="glass-panel p-4 flex gap-4">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Search by account or reference..." 
          class="pl-10 input-field w-full"
        />
      </div>
    </div>

    <div class="glass-panel overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-100 text-slate-400 text-xs uppercase tracking-wider">
              <th class="p-4 font-medium">Date</th>
              <th class="p-4 font-medium">Account</th>
              <th class="p-4 font-medium">Method</th>
              <th class="p-4 font-medium">Reference</th>
              <th class="p-4 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="payment in filteredPayments" :key="payment.id" class="group hover:bg-slate-50 transition-colors">
              <td class="p-4 text-sm text-slate-900">
                <div class="flex items-center gap-2">
                  <Calendar class="w-4 h-4 text-slate-400" />
                  {{ new Date(payment.date).toLocaleDateString() }}
                </div>
              </td>
              <td class="p-4 text-sm text-slate-900 font-medium">{{ payment.accountName }}</td>
              <td class="p-4 text-sm text-slate-600">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 border border-slate-100">
                    <CreditCard v-if="payment.method === 'Credit Card'" class="w-3 h-3" />
                    <DollarSign v-else class="w-3 h-3" />
                    {{ payment.method }}
                </span>
              </td>
              <td class="p-4 text-sm text-slate-500 font-mono">{{ payment.reference || '-' }}</td>
              <td class="p-4 text-sm font-bold text-emerald-600 text-right">${{ payment.amount.toFixed(2) }}</td>
            </tr>
            <tr v-if="filteredPayments.length === 0">
                <td colspan="5" class="p-8 text-center text-slate-500">
                    No payments found.
                </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
