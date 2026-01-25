<script setup lang="ts">
import { ref, computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useInvoicesStore, type Invoice } from '../../stores/invoices';
import { 
  Plus, Search, Filter, FileText, Mail, 
  Paperclip, MoreHorizontal, Download, 
  Trash2, Eye, Calendar, User, 
  CheckCircle2, Clock, AlertCircle
} from 'lucide-vue-next';
import { useNotificationStore } from '../../stores/notifications';

const invoicesStore = useInvoicesStore();
const notificationStore = useNotificationStore();
const searchQuery = ref('');
const statusFilter = ref('All');

const filteredInvoices = computed(() => {
  return invoicesStore.invoices.filter(invoice => {
    const matchesSearch = 
      invoice.accountName.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      invoice.id.toLowerCase().includes(searchQuery.value.toLowerCase());
    
    const matchesStatus = statusFilter.value === 'All' || invoice.status === statusFilter.value;
    
    return matchesSearch && matchesStatus;
  });
});

const getStatusClass = (status: string) => {
  switch (status) {
    case 'Paid': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'Sent': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'Draft': return 'bg-surface-700/50 text-surface-400 border-surface-600';
    case 'Overdue': return 'bg-red-500/10 text-red-400 border-red-500/20';
    default: return 'bg-surface-700/50 text-surface-400 border-surface-600';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'Paid': return CheckCircle2;
    case 'Sent': return Mail;
    case 'Draft': return Clock;
    case 'Overdue': return AlertCircle;
    default: return Clock;
  }
};

const handleDownloadPDF = (invoice: Invoice) => {
  invoicesStore.downloadInvoicePDF(invoice);
};

const handleSendEmail = async (invoice: Invoice) => {
  if (!invoice.recipientEmail) {
    notificationStore.error('No recipient email found for this invoice.');
    return;
  }
  try {
    const success = await invoicesStore.sendInvoiceEmail(invoice.id, invoice.recipientEmail);
    if (success) {
      notificationStore.success('Email sent successfully!', 'Invoice Sent');
    }
  } catch (error: any) {
    notificationStore.error(error.message || 'Failed to send email.', 'Email Error');
  }
};

const handleRemove = (id: string) => {
  if (confirm('Are you sure you want to delete this invoice?')) {
    invoicesStore.removeInvoice(id);
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold font-display text-white">Invoices</h2>
        <p class="text-surface-400 text-sm">Manage, track, and send invoices to your customers.</p>
      </div>
      <RouterLink to="/invoices/new" class="btn-primary flex items-center justify-center gap-2">
        <Plus class="w-4 h-4" />
        <span>Create Invoice</span>
      </RouterLink>
    </div>

    <!-- Filters & Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Search -->
      <div class="md:col-span-2 relative">
        <Search class="absolute left-3 top-2.5 w-5 h-5 text-surface-500" />
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Search by account name or invoice ID..." 
          class="input-field w-full pl-10"
        />
      </div>
      <!-- Status Filter -->
      <div class="relative">
        <Filter class="absolute left-3 top-2.5 w-5 h-5 text-surface-500" />
        <select v-model="statusFilter" class="input-field w-full pl-10 appearance-none">
          <option value="All">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="Sent">Sent</option>
          <option value="Paid">Paid</option>
        </select>
      </div>
    </div>

    <!-- Invoices Table -->
    <div class="glass-panel overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-surface-800/50 text-surface-400 uppercase tracking-wider text-xs font-semibold">
            <tr>
              <th class="px-6 py-4">Invoice</th>
              <th class="px-6 py-4">Customer</th>
              <th class="px-6 py-4">Date / Due</th>
              <th class="px-6 py-4">Amount</th>
              <th class="px-6 py-4">Status</th>
              <th class="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-800">
            <tr v-if="filteredInvoices.length === 0">
              <td colspan="6" class="px-6 py-12 text-center">
                <div class="flex flex-col items-center gap-3">
                  <div class="p-3 rounded-full bg-surface-800 text-surface-500">
                    <FileText class="w-8 h-8" />
                  </div>
                  <p class="text-surface-400 font-medium">No invoices found matching your criteria.</p>
                  <RouterLink to="/invoices/new" class="text-primary-400 hover:text-primary-300 text-sm font-medium">Create your first invoice</RouterLink>
                </div>
              </td>
            </tr>
            <tr v-for="invoice in filteredInvoices" :key="invoice.id" class="hover:bg-surface-800/30 transition-colors group">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="p-2 rounded bg-surface-800 text-primary-400 group-hover:bg-primary-500/10 group-hover:text-primary-300 transition-colors">
                    <FileText class="w-4 h-4" />
                  </div>
                  <div>
                    <div class="font-bold text-white tracking-tight">{{ invoice.id }}</div>
                    <div class="flex items-center gap-1.5 mt-0.5">
                      <Paperclip v-if="invoice.attachments?.length" class="w-3 h-3 text-surface-500" />
                      <span v-if="invoice.attachments?.length" class="text-[10px] text-surface-500 font-medium">{{ invoice.attachments.length }} file(s)</span>
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <User class="w-3.5 h-3.5 text-surface-500" />
                  <span class="font-medium text-surface-200">{{ invoice.accountName }}</span>
                </div>
                <div v-if="invoice.recipientEmail" class="text-[10px] text-surface-500 mt-0.5 ml-5">{{ invoice.recipientEmail }}</div>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2 text-surface-300">
                  <Calendar class="w-3.5 h-3.5" />
                  <span>{{ formatDate(invoice.date) }}</span>
                </div>
                <div class="text-[10px] text-surface-500 mt-0.5 ml-5">Due {{ formatDate(invoice.dueDate) }}</div>
              </td>
              <td class="px-6 py-4">
                <div class="font-mono font-bold text-white">{{ formatCurrency(invoice.total) }}</div>
                <div class="text-[10px] text-surface-500 mt-0.5">Incl. Tax</div>
              </td>
              <td class="px-6 py-4">
                <span 
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
                  :class="getStatusClass(invoice.status)"
                >
                  <component :is="getStatusIcon(invoice.status)" class="w-3 h-3" />
                  {{ invoice.status }}
                </span>
                <div v-if="invoice.emailSent" class="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                  <CheckCircle2 class="w-3 h-3" />
                  Sent on {{ formatDate(invoice.sentDate || '') }}
                </div>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    @click="handleDownloadPDF(invoice)"
                    class="p-2 text-surface-400 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-colors" 
                    title="Download PDF"
                  >
                    <Download class="w-4 h-4" />
                  </button>
                  <button 
                    @click="handleSendEmail(invoice)"
                    class="p-2 text-surface-400 hover:text-secondary-400 hover:bg-secondary-500/10 rounded-lg transition-colors" 
                    title="Send Email"
                    :disabled="invoice.status === 'Paid'"
                  >
                    <Mail class="w-4 h-4" />
                  </button>
                  <div class="h-4 w-px bg-surface-700 mx-1"></div>
                  <button 
                    @click="handleRemove(invoice.id)"
                    class="p-2 text-surface-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" 
                    title="Delete Invoice"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                  <button class="p-2 text-surface-400 hover:text-white hover:bg-surface-700 rounded-lg transition-colors">
                    <Eye class="w-4 h-4" />
                  </button>
                </div>
                <div class="group-hover:hidden">
                  <MoreHorizontal class="w-4 h-4 text-surface-500 ml-auto mr-3" />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
