<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { UserPlus, FileText, Mail, MoreHorizontal } from 'lucide-vue-next';
import { useAccountsStore, type Account } from '../../stores/accounts';

import { useInvoicesStore } from '../../stores/invoices';
import { usePaymentsStore } from '../../stores/payments';
import { useNotificationStore } from '../../stores/notifications';

const accountsStore = useAccountsStore();
const invoicesStore = useInvoicesStore();
const paymentsStore = usePaymentsStore();
const notificationStore = useNotificationStore();

const handleGeneratePDF = async (account: Account) => {
  // Fetch data
  const invoices = await invoicesStore.fetchInvoicesByAccount(String(account.id));
  const payments = await paymentsStore.fetchPaymentsByAccount(String(account.id));

  // Map to common format
  const invoiceTxns = invoices.map(i => ({
      date: i.date,
      desc: `Invoice #${i.id} - ${i.status.toUpperCase()}`,
      ref: i.id,
      amount: i.total
  }));

  const paymentTxns = payments.map(p => ({
      date: p.date,
      desc: `Payment - ${p.method}`,
      ref: p.reference,
      amount: -Math.abs(p.amount)
  }));

  // Combine and Sort
  const transactions = [...invoiceTxns, ...paymentTxns].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  accountsStore.downloadStatement(account, transactions);
};

const handleEmail = async (account: Account) => {
  // Fetch transactions first
  const invoices = await invoicesStore.fetchInvoicesByAccount(String(account.id));
  const payments = await paymentsStore.fetchPaymentsByAccount(String(account.id));
  
  const invoiceTxns = invoices.map(i => ({ date: i.date, desc: `Invoice #${i.id}`, ref: i.id, amount: i.total }));
  const paymentTxns = payments.map(p => ({ date: p.date, desc: `Payment - ${p.method}`, ref: p.reference, amount: -Math.abs(p.amount) }));
  const transactions = [...invoiceTxns, ...paymentTxns].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (!account.email) {
    notificationStore.error('No email address found for this account.');
    return;
  }

  try {
    const success = await accountsStore.sendStatementEmail(account, transactions);
    if (success) {
      notificationStore.success(`Statement sent successfully to ${account.email}`, 'Success');
    }
  } catch (error: any) {
    notificationStore.error(error.message || 'Failed to send statement email.', 'Email Error');
  }
};
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold font-display text-slate-900">House Charge Accounts</h2>
        <p class="text-slate-500 text-sm">Manage business customers and generate statements.</p>
      </div>
      <RouterLink to="/accounts/new" class="btn-primary flex items-center gap-2 text-sm">
        <UserPlus class="w-4 h-4" />
        <span>New Account</span>
      </RouterLink>
    </div>

    <!-- Accounts Table -->
    <div class="glass-panel overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-slate-500 uppercase tracking-wider text-xs font-semibold">
            <tr>
              <th class="px-6 py-4">Business Name</th>
              <th class="px-6 py-4">Contact</th>
              <th class="px-6 py-4">Current Balance</th>
              <th class="px-6 py-4">Status</th>
              <th class="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="account in accountsStore.accounts" :key="account.id" class="hover:bg-slate-50 transition-colors">
              <td class="px-6 py-4">
                <div class="font-medium text-slate-900">{{ account.name }}</div>
                <div class="text-slate-500 text-xs">{{ account.email }}</div>
              </td>
              <td class="px-6 py-4 text-slate-600">{{ account.contact }}</td>
              <td class="px-6 py-4 font-mono font-medium text-slate-900">${{ account.balance.toFixed(2) }}</td>
              <td class="px-6 py-4">
                <span 
                  class="px-2.5 py-1 rounded-full text-xs font-medium border"
                  :class="{
                    'bg-emerald-50 text-emerald-700 border-emerald-100': account.status === 'Active',
                    'bg-amber-50 text-amber-700 border-amber-100': account.status === 'Overdue',
                    'bg-slate-100 text-slate-600 border-slate-200': account.status === 'Inactive'
                  }"
                >
                  {{ account.status }}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                   <button 
                    @click="handleGeneratePDF(account)"
                    class="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" 
                    title="Generate Statement"
                  >
                    <FileText class="w-4 h-4" />
                  </button>
                  <button 
                    @click="handleEmail(account)"
                    class="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" 
                    title="Email Statement"
                  >
                    <Mail class="w-4 h-4" />
                  </button>
                  <button class="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
                    <MoreHorizontal class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
