<script setup lang="ts">
import { useRoute, RouterLink } from 'vue-router';
import { 
  LayoutDashboard, 
  Banknote, 
  Users, 
  ScanLine, 
  Receipt,
  FileText,
  LogOut,
  ChevronRight
} from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';

const route = useRoute();
const authStore = useAuthStore();

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Daily Sales', href: '/sales', icon: Banknote },
  { name: 'Accounts', href: '/accounts', icon: Users },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Scan Invoice', href: '/scan', icon: ScanLine },
];

const isActive = (path: string) => route.path === path;
</script>

<template>
  <aside class="flex flex-col w-64 bg-surface-900 border-r border-surface-800 h-screen sticky top-0">
    <div class="p-6">
      <div class="flex items-center gap-3">
        <div class="bg-primary-500 rounded-lg p-2">
          <Receipt class="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 class="font-display font-bold text-lg text-white leading-none">C-Store</h1>
          <span class="text-xs text-primary-400 font-medium tracking-wide">DAILY OPS</span>
        </div>
      </div>
    </div>

    <nav class="flex-1 px-4 space-y-1">
      <div class="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-4 px-2 mt-4">Platform</div>
      
      <RouterLink 
        v-for="item in navigation" 
        :key="item.name" 
        :to="item.href"
        class="group flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200"
        :class="isActive(item.href) ? 'bg-primary-500/10 text-primary-400' : 'text-surface-400 hover:bg-surface-800 hover:text-white'"
      >
        <div class="flex items-center gap-3">
          <component :is="item.icon" class="w-5 h-5 transition-colors" :class="isActive(item.href) ? 'text-primary-400' : 'group-hover:text-white'" />
          <span class="font-medium text-sm">{{ item.name }}</span>
        </div>
        <ChevronRight v-if="isActive(item.href)" class="w-4 h-4" />
      </RouterLink>
    </nav>

    <div class="p-4 border-t border-surface-800">
      <button 
        @click="authStore.logout"
        class="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-surface-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
      >
        <LogOut class="w-5 h-5" />
        <span class="font-medium text-sm">Sign Out</span>
      </button>
    </div>
  </aside>
</template>
