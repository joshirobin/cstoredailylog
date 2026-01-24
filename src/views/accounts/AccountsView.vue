<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { UserPlus, FileText, Mail, MoreHorizontal } from 'lucide-vue-next';
import { useAccountsStore, type Account } from '../../stores/accounts';

const accountsStore = useAccountsStore();

const handleGeneratePDF = (account: Account) => {
  accountsStore.generateStatement(account);
};

const handleEmail = (account: Account) => {
  alert(`Simulated: Emailing statement to ${account.email}`);
};
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold font-display text-white">House Charge Accounts</h2>
        <p class="text-surface-400 text-sm">Manage business customers and generate statements.</p>
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
          <thead class="bg-surface-800/50 text-surface-400 uppercase tracking-wider text-xs font-semibold">
            <tr>
              <th class="px-6 py-4">Business Name</th>
              <th class="px-6 py-4">Contact</th>
              <th class="px-6 py-4">Current Balance</th>
              <th class="px-6 py-4">Status</th>
              <th class="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-800">
            <tr v-for="account in accountsStore.accounts" :key="account.id" class="hover:bg-surface-800/30 transition-colors">
              <td class="px-6 py-4">
                <div class="font-medium text-white">{{ account.name }}</div>
                <div class="text-surface-500 text-xs">{{ account.email }}</div>
              </td>
              <td class="px-6 py-4 text-surface-300">{{ account.contact }}</td>
              <td class="px-6 py-4 font-mono font-medium text-white">${{ account.balance.toFixed(2) }}</td>
              <td class="px-6 py-4">
                <span 
                  class="px-2.5 py-1 rounded-full text-xs font-medium border"
                  :class="{
                    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20': account.status === 'Active',
                    'bg-amber-500/10 text-amber-400 border-amber-500/20': account.status === 'Overdue',
                    'bg-surface-700/50 text-surface-400 border-surface-600': account.status === 'Inactive'
                  }"
                >
                  {{ account.status }}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                   <button 
                    @click="handleGeneratePDF(account)"
                    class="p-2 text-surface-400 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-colors" 
                    title="Generate Statement"
                  >
                    <FileText class="w-4 h-4" />
                  </button>
                  <button 
                    @click="handleEmail(account)"
                    class="p-2 text-surface-400 hover:text-secondary-400 hover:bg-secondary-500/10 rounded-lg transition-colors" 
                    title="Email Invoice"
                  >
                    <Mail class="w-4 h-4" />
                  </button>
                  <button class="p-2 text-surface-500 hover:text-white rounded-lg transition-colors">
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
