<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Check, Sparkles, Loader2 } from 'lucide-vue-next';
import { useAccountsStore } from '../../stores/accounts';

const router = useRouter();
const accountsStore = useAccountsStore();

const isScanning = ref(false);
const showSuccess = ref(false);

const form = ref({
  businessName: '',
  contactName: '',
  email: '',
  phone: '',
  address: '',
  creditLimit: 5000,
});

// Simulated AI Scan
const simulateScan = () => {
  isScanning.value = true;
  setTimeout(() => {
    form.value = {
      businessName: 'Acme Trucking Co.',
      contactName: 'John Smith',
      email: 'billing@acmetrucking.com',
      phone: '555-0123',
      address: '123 Industrial Pkwy, Springfield',
      creditLimit: 10000,
    };
    isScanning.value = false;
    showSuccess.value = true;
    setTimeout(() => showSuccess.value = false, 3000);
  }, 2000); // 2-second fake processing delay
};

const handleSave = () => {
  accountsStore.addAccount({
    name: form.value.businessName,
    contact: form.value.contactName,
    email: form.value.email,
    phone: form.value.phone,
    address: form.value.address,
    balance: 0,
    creditLimit: form.value.creditLimit
  });
  router.push('/accounts');
};
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <div class="flex items-center justify-between">
      <div>
         <h2 class="text-2xl font-bold font-display text-white">New Account</h2>
         <p class="text-surface-400 text-sm">Create a new house charge account manually or by scanning ID.</p>
      </div>
      <button 
        @click="simulateScan" 
        :disabled="isScanning"
        class="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
      >
        <Loader2 v-if="isScanning" class="w-4 h-4 animate-spin" />
        <Sparkles v-else class="w-4 h-4 text-yellow-300" />
        <span>{{ isScanning ? 'AI Processing...' : 'Auto-Fill from ID' }}</span>
      </button>
    </div>

    <div v-if="showSuccess" class="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-lg flex items-center gap-3">
      <Check class="w-5 h-5" />
      <span>Successfully extracted data from ID! Please review the details below.</span>
    </div>

    <div class="glass-panel p-8">
      <form @submit.prevent="handleSave" class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-1.5 pt-2">
            <label class="text-xs font-medium text-surface-400 ml-1">Business Name</label>
            <input v-model="form.businessName" type="text" class="input-field w-full" placeholder="e.g. Green Logistics" required />
          </div>
          <div class="space-y-1.5 pt-2">
            <label class="text-xs font-medium text-surface-400 ml-1">Contact Person</label>
            <input v-model="form.contactName" type="text" class="input-field w-full" placeholder="e.g. Mark Smith" required />
          </div>
          <div class="space-y-1.5 pt-2">
            <label class="text-xs font-medium text-surface-400 ml-1">Email Address</label>
            <input v-model="form.email" type="email" class="input-field w-full" placeholder="invoices@company.com" required />
          </div>
          <div class="space-y-1.5 pt-2">
            <label class="text-xs font-medium text-surface-400 ml-1">Phone Number</label>
            <input v-model="form.phone" type="tel" class="input-field w-full" placeholder="(555) 123-4567" />
          </div>
          <div class="md:col-span-2 space-y-1.5 pt-2">
            <label class="text-xs font-medium text-surface-400 ml-1">Billing Address</label>
            <input v-model="form.address" type="text" class="input-field w-full" placeholder="1234 Main St, City, ST 12345" />
          </div>
           <div class="space-y-1.5 pt-2">
            <label class="text-xs font-medium text-surface-400 ml-1">Credit Limit</label>
            <div class="relative">
              <span class="absolute left-3 top-2.5 text-surface-500">$</span>
              <input v-model.number="form.creditLimit" type="number" class="input-field w-full pl-8" />
            </div>
          </div>
        </div>

        <div class="pt-6 border-t border-surface-700/50 flex justify-end gap-4">
          <button type="button" @click="router.back()" class="text-surface-400 hover:text-white font-medium text-sm px-4">Cancel</button>
          <button type="submit" class="btn-primary">Create Account</button>
        </div>
      </form>
    </div>
  </div>
</template>
