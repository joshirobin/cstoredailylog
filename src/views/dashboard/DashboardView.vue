<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  FileText,
  CreditCard,
  Plus,
  UserPlus
} from 'lucide-vue-next';
import { useSalesStore } from '../../stores/sales';
import { useAccountsStore } from '../../stores/accounts';
import { useInvoicesStore } from '../../stores/invoices';

const salesStore = useSalesStore();
const accountsStore = useAccountsStore();
const invoicesStore = useInvoicesStore();

onMounted(async () => {
    await Promise.all([
        salesStore.fetchLogs(),
        accountsStore.fetchAccounts(),
        invoicesStore.fetchInvoices()
    ]);
});

// Real Data Calculations
const todayDate = new Date().toISOString().split('T')[0];

const totalSalesToday = computed(() => {
    const todayLog = salesStore.logs.find(l => l.date === todayDate);
    return todayLog ? todayLog.totalSales : 0;
});

const activeAccountsCount = computed(() => accountsStore.accounts.length);

const pendingInvoicesCount = computed(() => {
    return invoicesStore.invoices.filter(i => i.status !== 'Paid').length;
});

const outstandingBalance = computed(() => {
    // Total Balance of all charge accounts
    return accountsStore.accounts.reduce((sum, acc) => {
        const balance = Number(acc.balance);
        return sum + (isNaN(balance) ? 0 : balance);
    }, 0);
});


// Mock Data for Dashboard (Mapped to Real Computeds)
const stats = computed(() => [
  { 
    title: 'Total Sales Today', 
    value: `$${totalSalesToday.value.toFixed(2)}`, 
    change: 'Today', 
    trend: 'neutral',
    icon: DollarSign,
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10'
  },
  { 
    title: 'Active Accounts', 
    value: activeAccountsCount.value.toString(), 
    change: 'Total', 
    trend: 'neutral',
    icon: Users,
    color: 'text-primary-400',
    bg: 'bg-primary-400/10'
  },
  { 
    title: 'Pending Invoices', 
    value: pendingInvoicesCount.value.toString(), 
    change: 'Unpaid', 
    trend: 'neutral',
    icon: FileText,
    color: 'text-amber-400',
    bg: 'bg-amber-400/10'
  },
  { 
    title: 'Outstanding Balance', 
    value: `$${outstandingBalance.value.toFixed(2)}`, 
    change: 'Total Owed', 
    trend: 'neutral',
    icon: CreditCard,
    color: 'text-secondary-400',
    bg: 'bg-secondary-400/10'
  },
]);

const recentActivity: any[] = []; // Can populate with recent logs/invoices later if needed
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold font-display text-white">Dashboard Overview</h2>
        <p class="text-surface-400 text-sm">Welcome back, here's what's happening today.</p>
      </div>
      <div class="flex gap-3">
        <button class="btn-secondary text-sm py-2 px-4">Download Report</button>
        <button class="btn-primary text-sm py-2 px-4">+ New Sale</button>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div v-for="stat in stats" :key="stat.title" class="glass-card p-6 border-l-4" :class="`border-l-${stat.color.split('-')[1]}-500`">
        <div class="flex items-center justify-between mb-4">
          <div :class="`p-2 rounded-lg ${stat.bg}`">
            <component :is="stat.icon" :class="`w-6 h-6 ${stat.color}`" />
          </div>
          <div class="flex items-center text-xs font-medium gap-1" :class="stat.trend === 'up' ? 'text-emerald-400' : 'text-rose-400'">
            <span>{{ stat.change }}</span>
            <component :is="stat.trend === 'up' ? TrendingUp : TrendingDown" class="w-3 h-3" />
          </div>
        </div>
        <h3 class="text-surface-400 text-sm font-medium">{{ stat.title }}</h3>
        <p class="text-2xl font-bold text-white mt-1">{{ stat.value }}</p>
      </div>
    </div>

    <!-- Content Split -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Recent Activity -->
      <div class="lg:col-span-2 glass-panel p-6">
        <h3 class="text-lg font-bold text-white mb-6">Recent Activity</h3>
        <div class="space-y-6">
          <div v-for="item in recentActivity" :key="item.id" class="flex items-start gap-4">
            <div class="mt-1 w-2 h-2 rounded-full bg-primary-500"></div>
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <p class="text-white font-medium text-sm">{{ item.action }}</p>
                <span class="text-xs text-surface-500">{{ item.time }}</span>
              </div>
              <p class="text-xs text-surface-400 mt-0.5">by {{ item.user }}</p>
            </div>
            <div v-if="item.amount" class="text-white font-mono text-sm font-medium bg-surface-800 px-2 py-1 rounded">
              {{ item.amount }}
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="glass-panel p-6">
        <h3 class="text-lg font-bold text-white mb-6">Quick Actions</h3>
        <div class="space-y-3">
          <button class="w-full text-left p-3 rounded-lg bg-surface-800/50 hover:bg-surface-800 transition-colors flex items-center gap-3 group">
            <div class="bg-blue-500/20 p-2 rounded-md text-blue-400 group-hover:text-blue-300">
              <Plus class="w-5 h-5" />
            </div>
            <div>
              <div class="font-medium text-white text-sm">Add Transaction</div>
              <div class="text-xs text-surface-500">Record a new sale manually</div>
            </div>
          </button>
           <button class="w-full text-left p-3 rounded-lg bg-surface-800/50 hover:bg-surface-800 transition-colors flex items-center gap-3 group">
            <div class="bg-purple-500/20 p-2 rounded-md text-purple-400 group-hover:text-purple-300">
              <UserPlus class="w-5 h-5" />
            </div>
             <div>
              <div class="font-medium text-white text-sm">Create Account</div>
              <div class="text-xs text-surface-500">Onboard a new client</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
