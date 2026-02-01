<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import {
  LayoutDashboard, Banknote, Users, ScanLine, 
  Receipt, FileText, LogOut, ChevronRight, 
  CreditCard, Droplet, Clock, CheckSquare, 
  Users2, ClipboardCheck, CalendarDays, ShieldCheck, 
  Tag, ShoppingCart, MessageSquare, 
  Truck, Activity, Target, TrendingDown, Calculator, Wallet, Trash2, ClipboardList, Shield, Store
} from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';

const route = useRoute();
const authStore = useAuthStore();

interface NavItem {
  name: string;
  href: string;
  routeName: string;
  icon: any;
}

const primaryNav: NavItem[] = [
  { name: 'Dashboard', href: '/', routeName: 'dashboard', icon: LayoutDashboard },
  { name: 'Daily Sales', href: '/sales', routeName: 'sales', icon: Banknote },
  { name: 'Ops Journal', href: '/journal', routeName: 'journal', icon: MessageSquare },
  { name: 'Fuel Inventory', href: '/fuel', routeName: 'fuel', icon: Droplet },
  { name: 'Price Book', href: '/pricebook', routeName: 'pricebook', icon: Tag },
  { name: 'Vendor Checkin', href: '/vendor-checkin', routeName: 'vendor-checkin', icon: Truck },
  { name: 'Food Safety', href: '/food-safety', routeName: 'food-safety', icon: Activity },
  { name: 'Competitor Watch', href: '/competitor-watch', routeName: 'competitor-watch', icon: Target },
  { name: 'Lottery Shrinkage', href: '/lottery-shrinkage', routeName: 'lottery-shrinkage', icon: TrendingDown },
  { name: 'Cash Predictor', href: '/cash-flow', routeName: 'cash-flow', icon: Wallet },
  { name: 'Food Waste', href: '/food-waste', routeName: 'food-waste', icon: Trash2 },
  { name: 'Clerk Terminal', href: '/clerk', routeName: 'clerk', icon: ScanLine },
  { name: 'Employee SOPs', href: '/sops', routeName: 'sops', icon: ClipboardList },
];

const dataNav: NavItem[] = [
  { name: 'Accounts', href: '/accounts', routeName: 'accounts', icon: Users },
  { name: 'Invoices', href: '/invoices', routeName: 'invoices', icon: FileText },
  { name: 'Purchases', href: '/purchases', routeName: 'purchases', icon: ShoppingCart },
  { name: 'Payments', href: '/payments', routeName: 'payments', icon: CreditCard },
  { name: 'Scan Invoice', href: '/scan', routeName: 'scan', icon: ScanLine },
];

const staffNav: NavItem[] = [
  { name: 'Employees', href: '/employees', routeName: 'employees', icon: Users2 },
  { name: 'Shift Schedule', href: '/shifts', routeName: 'shifts', icon: CalendarDays },
  { name: 'Time Clock', href: '/time-clock', routeName: 'time-clock', icon: Clock },
  { name: 'Clerk Terminal', href: '/clerk', routeName: 'clerk', icon: Calculator },
  { name: 'Task Board', href: '/tasks', routeName: 'tasks', icon: CheckSquare },
  { name: 'Checklists', href: '/checklists', routeName: 'checklists', icon: ClipboardCheck },
  { name: 'Document Vault', href: '/vault', routeName: 'vault', icon: ShieldCheck },
];

const adminNav: NavItem[] = [
  { name: 'Store Settings', href: '/settings', routeName: 'settings', icon: Store },
  { name: 'Access Control', href: '/access-control', routeName: 'access-control', icon: Shield },
];

const filteredPrimaryNav = computed(() => primaryNav.filter(item => authStore.canVisit(item.routeName)));
const filteredDataNav = computed(() => dataNav.filter(item => authStore.canVisit(item.routeName)));
const filteredStaffNav = computed(() => staffNav.filter(item => authStore.canVisit(item.routeName)));
const filteredAdminNav = computed(() => adminNav.filter(item => authStore.canVisit(item.routeName)));

const isActive = (path: string) => {
    if (path === '/' && route.path === '/') return true;
    if (path !== '/' && route.path.startsWith(path)) return true;
    return false;
};
</script>

<template>
  <aside class="flex flex-col w-64 bg-white border-r border-slate-100 h-screen sticky top-0">
    <div class="p-6">
      <div class="flex items-center gap-3">
        <div class="bg-primary-600 rounded-lg p-2 shadow-lg shadow-primary-500/20">
          <Receipt class="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 class="font-display font-bold text-lg text-slate-900 leading-none">C-Store</h1>
          <span class="text-xs text-primary-600 font-bold tracking-wide">DAILY OPS</span>
        </div>
      </div>
    </div>

    <nav class="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
      <div v-if="filteredPrimaryNav.length > 0" class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-3 mt-6">Operations</div>
      <RouterLink 
        v-for="item in filteredPrimaryNav" 
        :key="item.name" 
        :to="item.href"
        class="group flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200"
        :class="isActive(item.href) ? 'bg-primary-50 text-primary-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'"
      >
        <div class="flex items-center gap-3">
          <component :is="item.icon" class="w-5 h-5 transition-colors" :class="isActive(item.href) ? 'text-primary-600' : 'group-hover:text-slate-900'" />
          <span class="font-semibold text-sm">{{ item.name }}</span>
        </div>
        <ChevronRight v-if="isActive(item.href)" class="w-4 h-4" />
      </RouterLink>

      <div v-if="filteredDataNav.length > 0" class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-3 mt-6">Financials</div>
      <RouterLink 
        v-for="item in filteredDataNav" 
        :key="item.name" 
        :to="item.href"
        class="group flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200"
        :class="isActive(item.href) ? 'bg-primary-50 text-primary-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'"
      >
        <div class="flex items-center gap-3">
          <component :is="item.icon" class="w-5 h-5 transition-colors" :class="isActive(item.href) ? 'text-primary-600' : 'group-hover:text-slate-900'" />
          <span class="font-semibold text-sm">{{ item.name }}</span>
        </div>
        <ChevronRight v-if="isActive(item.href)" class="w-4 h-4" />
      </RouterLink>

      <div v-if="filteredStaffNav.length > 0" class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-3 mt-6">Staff Control</div>
      <RouterLink 
        v-for="item in filteredStaffNav" 
        :key="item.name" 
        :to="item.href"
        class="group flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200"
        :class="isActive(item.href) ? 'bg-primary-50 text-primary-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'"
      >
        <div class="flex items-center gap-3">
          <component :is="item.icon" class="w-5 h-5 transition-colors" :class="isActive(item.href) ? 'text-primary-600' : 'group-hover:text-slate-900'" />
          <span class="font-semibold text-sm">{{ item.name }}</span>
        </div>
        <ChevronRight v-if="isActive(item.href)" class="w-4 h-4" />
      </RouterLink>
      <div v-if="filteredAdminNav.length > 0" class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-3 mt-6">Administration</div>
      <RouterLink 
        v-for="item in filteredAdminNav" 
        :key="item.name" 
        :to="item.href"
        class="group flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200"
        :class="isActive(item.href) ? 'bg-primary-50 text-primary-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'"
      >
        <div class="flex items-center gap-3">
          <component :is="item.icon" class="w-5 h-5 transition-colors" :class="isActive(item.href) ? 'text-primary-600' : 'group-hover:text-slate-900'" />
          <span class="font-semibold text-sm">{{ item.name }}</span>
        </div>
        <ChevronRight v-if="isActive(item.href)" class="w-4 h-4" />
      </RouterLink>
    </nav>

    <div class="p-4 border-t border-slate-100">
      <button 
        @click="authStore.logout"
        class="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
      >
        <LogOut class="w-5 h-5" />
        <span class="font-medium text-sm">Sign Out</span>
      </button>
    </div>
  </aside>
</template>
