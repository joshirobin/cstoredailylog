<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { usePaymentsStore } from '../../stores/payments';
import { useAccountsStore } from '../../stores/accounts';
import { Loader2, ArrowLeft, DollarSign } from 'lucide-vue-next';

const router = useRouter();
const paymentsStore = usePaymentsStore();
const accountsStore = useAccountsStore();

const isSubmitting = ref(false);
const form = ref({
    accountId: '',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    method: 'Check' as const,
    reference: '',
    notes: ''
});

onMounted(async () => {
    await accountsStore.fetchAccounts();
});

const selectedAccount = computed(() => accountsStore.accounts.find(a => a.id === form.value.accountId));

const handleSubmit = async () => {
    if (!form.value.accountId || form.value.amount <= 0) return;

    isSubmitting.value = true;
    try {
        await paymentsStore.addPayment({
            accountId: form.value.accountId,
            accountName: selectedAccount.value?.name || 'Unknown',
            date: form.value.date as string,
            amount: Number(form.value.amount),
            method: form.value.method,
            reference: form.value.reference,
            notes: form.value.notes
        });
        router.push('/payments');
    } catch (e) {
        console.error(e);
        // handle error
    } finally {
        isSubmitting.value = false;
    }
};
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <div class="flex items-center gap-4">
        <button @click="router.back()" class="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900 transition-colors">
            <ArrowLeft class="w-5 h-5" />
        </button>
        <div>
            <h2 class="text-2xl font-bold font-display text-slate-900">Record Payment</h2>
            <p class="text-slate-500 text-sm">Add a new payment to an account.</p>
        </div>
    </div>

    <div class="glass-panel p-8">
        <form @submit.prevent="handleSubmit" class="space-y-6">
            <!-- Account Selection -->
            <div class="space-y-1.5">
                <label class="text-xs font-medium text-slate-500 ml-1">Account</label>
                <select v-model="form.accountId" class="input-field w-full" required>
                    <option value="" disabled>Select an account</option>
                    <option v-for="account in accountsStore.accounts" :key="account.id" :value="account.id">
                        {{ account.name }} (Balance: ${{ Number(account.balance).toFixed(2) }})
                    </option>
                </select>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-1.5">
                    <label class="text-xs font-medium text-slate-500 ml-1">Payment Date</label>
                    <input v-model="form.date" type="date" class="input-field w-full" required />
                </div>
                <div class="space-y-1.5">
                    <label class="text-xs font-medium text-slate-500 ml-1">Amount</label>
                    <div class="relative">
                        <span class="absolute left-3 top-2.5 text-slate-400">
                           <DollarSign class="w-4 h-4" />
                        </span>
                        <input v-model.number="form.amount" type="number" step="0.01" min="0.01" class="input-field w-full pl-9" required placeholder="0.00" />
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-1.5">
                    <label class="text-xs font-medium text-slate-500 ml-1">Payment Method</label>
                     <select v-model="form.method" class="input-field w-full" required>
                        <option value="Cash">Cash</option>
                        <option value="Check">Check</option>
                        <option value="Credit Card">Credit Card</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                </div>
                <div class="space-y-1.5">
                    <label class="text-xs font-medium text-slate-500 ml-1">Reference No. (Check #)</label>
                    <input v-model="form.reference" type="text" class="input-field w-full" placeholder="e.g. 1024" />
                </div>
            </div>

            <div class="space-y-1.5">
                <label class="text-xs font-medium text-slate-500 ml-1">Notes</label>
                <textarea v-model="form.notes" class="input-field w-full min-h-[100px]" placeholder="Optional transaction notes..."></textarea>
            </div>

            <div class="pt-6 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" @click="router.back()" class="btn-secondary">Cancel</button>
                <button type="submit" :disabled="isSubmitting" class="btn-primary flex items-center gap-2 min-w-[120px] justify-center">
                    <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin" />
                    <span v-else>Save Payment</span>
                </button>
            </div>
        </form>
    </div>
  </div>
</template>
