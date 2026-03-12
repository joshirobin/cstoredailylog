<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import logoUrl from '../assets/logo.png';
import {
  LayoutDashboard, Banknote, Users, ScanLine, 
  FileText, LogOut, ChevronRight, ChevronDown,
  CreditCard, Droplet, Clock, CheckSquare, 
  Users2, ClipboardCheck, CalendarDays, ShieldCheck, 
  Tag, ShoppingCart, MessageSquare, FileSpreadsheet, Layers, Camera,
  Truck, Activity, Calculator, Wallet, Trash2, ClipboardList, Shield, Store, Ticket,
  History as HistoryIcon, BrainCircuit, Wine
} from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { useLocationsStore } from '../stores/locations';

const route = useRoute();
const authStore = useAuthStore();
const locationsStore = useLocationsStore();

interface NavItem {
  name: string;
  href: string;
  routeName: string;
  icon: any;
  children?: { name: string, href: string, routeName: string }[];
}

const primaryNav: NavItem[] = [
  { name: 'Dashboard', href: '/', routeName: 'dashboard', icon: LayoutDashboard },
  { name: 'Daily Sales', href: '/sales', routeName: 'sales', icon: Banknote },
  { name: 'Ops Journal', href: '/journal', routeName: 'journal', icon: MessageSquare },
  { name: 'Visual Audit', href: '/visual-audit', routeName: 'visual-audit', icon: Camera },
  { 
    name: 'Fuel Inventory', 
    href: '/fuel', 
    routeName: 'fuel', 
    icon: Droplet,
    children: [
        { name: 'Audit & Tanks', href: '/fuel', routeName: 'fuel' },
        { name: 'Fuel Delivery', href: '/fuel-delivery', routeName: 'fuel-delivery' },
        { name: 'Fuel Optimizer', href: '/fuel-optimizer', routeName: 'fuel-optimizer' },
    ]
  },
  { name: 'Price Book', href: '/pricebook', routeName: 'pricebook', icon: Tag },
  { name: 'Vendor Checkin', href: '/vendor-checkin', routeName: 'vendor-checkin', icon: Truck },
  { name: 'Compliance & Safety', href: '/food-safety', routeName: 'food-safety', icon: Activity },
  { 
    name: 'Lottery Management', 
    href: '/lottery',
    routeName: 'lottery',
    icon: Ticket,
    children: [
        { name: 'Dashboard', href: '/lottery', routeName: 'lottery' },
        { name: 'Inventory', href: '/lottery/inventory', routeName: 'lottery-inventory' },
        { name: 'Reconciliation', href: '/lottery/reconciliation', routeName: 'lottery-reconciliation' },
        { name: 'Settlements', href: '/lottery/settlement', routeName: 'lottery-settlement' },
        { name: 'Shrinkage Log', href: '/lottery-shrinkage', routeName: 'lottery-shrinkage' },
    ]
  },
  { name: 'Tobacco Scan', href: '/tobacco-scan', routeName: 'tobacco-scan', icon: FileSpreadsheet },
  { name: 'Price Model', href: '/price-model', routeName: 'price-model', icon: Layers },
  { name: 'Cash Predictor', href: '/cash-flow', routeName: 'cash-flow', icon: Wallet },
  { name: 'Liquor Tracking', href: '/liquor-tracking', routeName: 'liquor-tracking', icon: Wine },
  { name: 'Food Waste', href: '/food-waste', routeName: 'food-waste', icon: Trash2 },
  { name: 'Employee SOPs', href: '/sops', routeName: 'sops', icon: ClipboardList },
  { name: 'AI & Analytics', href: '/analytics/forecasting', routeName: 'forecasting', icon: BrainCircuit },
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
  { name: 'User Access', href: '/settings/user-access', routeName: 'user-access', icon: HistoryIcon },
  { name: 'Access Control', href: '/access-control', routeName: 'access-control', icon: Shield },
];

const isFeatureEnabled = (routeName: string) => {
    const disabled = locationsStore.activeLocation?.disabledFeatures || [];
    return !disabled.includes(routeName);
};

const filteredPrimaryNav = computed(() => {
    return primaryNav
        .filter(item => authStore.canVisit(item.routeName) && isFeatureEnabled(item.routeName))
        .map(item => {
            if (item.children) {
                return {
                    ...item,
                    children: item.children.filter(child => authStore.canVisit(child.routeName) && isFeatureEnabled(child.routeName))
                };
            }
            return item;
        });
});
const filteredDataNav = computed(() => dataNav.filter(item => authStore.canVisit(item.routeName) && isFeatureEnabled(item.routeName)));
const filteredStaffNav = computed(() => staffNav.filter(item => authStore.canVisit(item.routeName) && isFeatureEnabled(item.routeName)));
const filteredAdminNav = computed(() => adminNav.filter(item => authStore.canVisit(item.routeName) && isFeatureEnabled(item.routeName)));

const isActive = (path: string) => {
    if (path === '/' && route.path === '/') return true;
    if (path !== '/' && route.path === path) return true; // Strict for children
    if (path !== '/' && route.path.startsWith(path) && path.length > 5) return true; // Fuzzy for parents
    return false;
};

const isParentActive = (item: NavItem) => {
    if (item.href !== '/' && route.path.startsWith(item.href)) return true;
    if (item.children?.some(child => route.path === child.href)) return true;
    return false;
};

const openSubmenus = ref<Record<string, boolean>>({
    'Fuel Inventory': true // Auto-open if active
});

const toggleSubmenu = (name: string) => {
    openSubmenus.value[name] = !openSubmenus.value[name];
};
</script>

<template>
  <aside class="flex flex-col w-72 bg-white/70 backdrop-blur-2xl border-r border-white/20 h-screen sticky top-0 z-40">
    <div class="px-8 py-6">
      <div class="flex items-center justify-center group cursor-pointer">
        <img :src="logoUrl" alt="CStoreSync Logo" class="w-9 h-auto object-contain transition-transform duration-500 group-hover:scale-105" />
      </div>
    </div>

    <nav class="flex-1 px-6 space-y-1.5 overflow-y-auto custom-scrollbar">
      <div v-if="filteredPrimaryNav.length > 0" class="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-4 px-3 mt-8">Operations</div>
      <div v-for="item in filteredPrimaryNav" :key="item.name" class="flex flex-col">
        <template v-if="item.children">
            <button 
                @click="toggleSubmenu(item.name)"
                class="group flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 relative overflow-hidden mb-1"
                :class="isParentActive(item) ? 'bg-slate-100/50 text-primary-600' : 'text-slate-500 hover:bg-white hover:text-primary-600'"
            >
                <div class="flex items-center gap-3.5 relative z-10">
                    <component :is="item.icon" class="w-5 h-5 transition-transform duration-300" :class="isParentActive(item) ? 'text-primary-600' : 'text-slate-400 group-hover:text-primary-600'" />
                    <span class="font-bold text-sm tracking-tight">{{ item.name }}</span>
                </div>
                <component :is="openSubmenus[item.name] ? ChevronDown : ChevronRight" class="w-4 h-4 text-slate-300" />
            </button>
            <div v-if="openSubmenus[item.name]" class="flex flex-col gap-1 mb-2 pl-4 border-l-2 border-slate-100 ml-6 animate-in fade-in slide-in-from-left-2 duration-300">
                <RouterLink 
                    v-for="child in item.children" 
                    :key="child.name" 
                    :to="child.href"
                    class="group flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-300"
                    :class="isActive(child.href) ? 'bg-primary-50 text-primary-600 font-bold' : 'text-slate-400 hover:text-primary-600 hover:bg-white'"
                >
                    <span class="text-[13px] tracking-tight">{{ child.name }}</span>
                    <div v-if="isActive(child.href)" class="w-1.5 h-1.5 rounded-full bg-primary-600 animate-pulse"></div>
                </RouterLink>
            </div>
        </template>
        <RouterLink 
            v-else
            :to="item.href"
            class="group flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 relative overflow-hidden mb-1"
            :class="isActive(item.href) ? 'bg-primary-600 text-white shadow-xl shadow-primary-500/20 active-nav-glow' : 'text-slate-500 hover:bg-white hover:text-primary-600 hover:shadow-lg hover:shadow-slate-200/50'"
        >
            <div class="flex items-center gap-3.5 relative z-10">
                <component :is="item.icon" class="w-5 h-5 transition-transform duration-300 group-hover:scale-110" :class="isActive(item.href) ? 'text-white' : 'text-slate-400 group-hover:text-primary-600'" />
                <span class="font-bold text-sm tracking-tight">{{ item.name }}</span>
            </div>
            <ChevronRight v-if="isActive(item.href)" class="w-4 h-4 relative z-10 animate-pulse" />
        </RouterLink>
      </div>

      <div v-if="filteredDataNav.length > 0" class="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-4 px-3 mt-10">Financials</div>
      <RouterLink 
        v-for="item in filteredDataNav" 
        :key="item.name" 
        :to="item.href"
        class="group flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 relative overflow-hidden"
        :class="isActive(item.href) ? 'bg-primary-600 text-white shadow-xl shadow-primary-500/20 active-nav-glow' : 'text-slate-500 hover:bg-white hover:text-primary-600 hover:shadow-lg hover:shadow-slate-200/50'"
      >
        <div class="flex items-center gap-3.5 relative z-10">
          <component :is="item.icon" class="w-5 h-5 transition-transform duration-300 group-hover:scale-110" :class="isActive(item.href) ? 'text-white' : 'text-slate-400 group-hover:text-primary-600'" />
          <span class="font-bold text-sm tracking-tight">{{ item.name }}</span>
        </div>
        <ChevronRight v-if="isActive(item.href)" class="w-4 h-4 relative z-10 animate-pulse" />
      </RouterLink>

      <div v-if="filteredStaffNav.length > 0" class="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-4 px-3 mt-10">Staff Control</div>
      <RouterLink 
        v-for="item in filteredStaffNav" 
        :key="item.name" 
        :to="item.href"
        class="group flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 relative overflow-hidden"
        :class="isActive(item.href) ? 'bg-primary-600 text-white shadow-xl shadow-primary-500/20 active-nav-glow' : 'text-slate-500 hover:bg-white hover:text-primary-600 hover:shadow-lg hover:shadow-slate-200/50'"
      >
        <div class="flex items-center gap-3.5 relative z-10">
          <component :is="item.icon" class="w-5 h-5 transition-transform duration-300 group-hover:scale-110" :class="isActive(item.href) ? 'text-white' : 'text-slate-400 group-hover:text-primary-600'" />
          <span class="font-bold text-sm tracking-tight">{{ item.name }}</span>
        </div>
        <ChevronRight v-if="isActive(item.href)" class="w-4 h-4 relative z-10 animate-pulse" />
      </RouterLink>

      <div v-if="filteredAdminNav.length > 0" class="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-4 px-3 mt-10">Administration</div>
      <RouterLink 
        v-for="item in filteredAdminNav" 
        :key="item.name" 
        :to="item.href"
        class="group flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 relative overflow-hidden"
        :class="isActive(item.href) ? 'bg-primary-600 text-white shadow-xl shadow-primary-500/20 active-nav-glow' : 'text-slate-500 hover:bg-white hover:text-primary-600 hover:shadow-lg hover:shadow-slate-200/50'"
      >
        <div class="flex items-center gap-3.5 relative z-10">
          <component :is="item.icon" class="w-5 h-5 transition-transform duration-300 group-hover:scale-110" :class="isActive(item.href) ? 'text-white' : 'text-slate-400 group-hover:text-primary-600'" />
          <span class="font-bold text-sm tracking-tight">{{ item.name }}</span>
        </div>
        <ChevronRight v-if="isActive(item.href)" class="w-4 h-4 relative z-10 animate-pulse" />
      </RouterLink>
    </nav>

    <div class="p-6 border-t border-slate-100 bg-white/50">
      <button 
        @click="authStore.logout"
        class="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all duration-300 group"
      >
        <div class="p-2 rounded-xl group-hover:bg-rose-100 transition-colors">
          <LogOut class="w-5 h-5" />
        </div>
        <span class="font-bold text-sm tracking-tight">Sign Out</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.active-nav-glow::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 100%);
  pointer-events: none;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}
</style>
