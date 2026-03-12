<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { RouterView } from 'vue-router';
import Sidebar from '../components/Sidebar.vue';
import NotificationCenter from '../components/NotificationCenter.vue';
import SyncAssistant from '../components/SyncAssistant.vue';
import LocationSwitcher from '../components/dashboard/LocationSwitcher.vue';
import { Bell, Search, X, Check } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { useLocationsStore } from '../stores/locations';

const authStore = useAuthStore();
const locationsStore = useLocationsStore();

const userName = computed(() => {
  if (authStore.user?.displayName) return authStore.user.displayName;
  if (authStore.user?.email) return authStore.user.email.split('@')[0];
  return 'User';
});

const userInitials = computed(() => {
  const name = userName.value;
  if (!name) return '??';
  return name.split(' ').filter(n => n).map(n => n[0]).join('').toUpperCase().slice(0, 2);
});

// Notifications Logic
interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'welcome' | 'alert' | 'info';
}

const showNotifications = ref(false);
const notifications = ref<Notification[]>([]);

const unreadCount = computed(() => notifications.value.filter(n => !n.read).length);

const addWelcomeNotification = () => {
    // Only add if not already present
    if (notifications.value.some(n => n.type === 'welcome')) return;
    
    notifications.value.unshift({
        id: Date.now().toString(),
        title: 'New Session',
        message: `Welcome back, ${userName.value}!`,
        time: 'Just now',
        read: false,
        type: 'welcome'
    });
};

const markAllAsRead = () => {
    notifications.value.forEach(n => n.read = true);
};

const clearNotification = (id: string) => {
    notifications.value = notifications.value.filter(n => n.id !== id);
};

onMounted(async () => {
    await locationsStore.fetchLocations();
    setTimeout(() => {
        addWelcomeNotification();
    }, 1000);
});
</script>

<template>
  <div class="flex min-h-screen bg-slate-50 text-slate-900">
    <!-- Sidebar -->
    <Sidebar />
    <NotificationCenter />
    <SyncAssistant />

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Top Header -->
      <header class="h-20 border-b border-white/20 bg-white/70 backdrop-blur-2xl sticky top-0 z-30 flex items-center justify-between px-10 shadow-sm">
        <div class="flex items-center gap-6 flex-1">
          <!-- Location Switcher -->
          <LocationSwitcher v-if="!locationsStore.activeLocation?.disabledFeatures?.includes('store-selector')" />
          
          <!-- Search Bar (Premium) -->
          <div class="relative w-full max-w-md hidden md:block group">
            <Search class="absolute left-4 top-3.5 w-4 h-4 text-slate-400 group-focus-within:text-primary-600 transition-colors" />
            <input 
              type="text" 
              placeholder="Search anything..." 
              class="w-full bg-slate-100/50 border-2 border-transparent rounded-2xl py-3 pl-12 pr-4 text-sm font-bold focus:bg-white focus:border-primary-500/20 focus:ring-4 focus:ring-primary-500/5 outline-none transition-all placeholder:text-slate-400"
            >
          </div>
        </div>

        <div class="flex items-center gap-6">
          <!-- Notifications -->
          <div class="relative">
            <button 
                @click="showNotifications = !showNotifications"
                class="relative p-3 text-slate-500 hover:bg-white hover:text-primary-600 rounded-2xl transition-all shadow-sm border border-transparent hover:border-slate-100 group"
                :class="{ 'bg-white text-primary-600 shadow-lg border-primary-100': showNotifications }"
            >
                <Bell class="w-5 h-5 group-hover:rotate-12 transition-transform" />
                <span v-if="unreadCount > 0" class="absolute top-2.5 right-2.5 w-3 h-3 bg-secondary-500 rounded-full border-2 border-white animate-pulse"></span>
            </button>

            <!-- Notifications Dropdown (Premium) -->
            <transition name="page">
                <div v-if="showNotifications" class="absolute right-0 mt-4 w-96 bg-white/90 backdrop-blur-3xl border border-white/40 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] z-50 overflow-hidden">
                    <div class="p-6 border-b border-slate-100/50 flex items-center justify-between bg-slate-50/50">
                        <h3 class="font-black text-xs text-slate-900 uppercase tracking-widest italic">Live Feed</h3>
                        <button @click="markAllAsRead" class="text-[10px] text-primary-600 hover:text-primary-700 font-black uppercase tracking-widest underline">Mark All As Read</button>
                    </div>
                    <div class="max-h-[30rem] overflow-y-auto custom-scrollbar">
                        <div v-if="notifications.length === 0" class="p-10 text-center text-slate-400 italic text-sm font-medium">
                            All caught up!
                        </div>
                        <div 
                            v-for="notif in notifications" 
                            :key="notif.id"
                            class="p-5 border-b border-slate-50 last:border-0 hover:bg-white transition-all relative group cursor-pointer"
                            :class="{ 'bg-primary-500/5': !notif.read }"
                        >
                            <div class="flex gap-4">
                                <div class="w-10 h-10 rounded-xl bg-primary-600 shadow-lg shadow-primary-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                    <Check v-if="notif.type === 'welcome'" class="w-5 h-5 text-white" />
                                    <Bell v-else class="w-5 h-5 text-white" />
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center justify-between mb-1">
                                        <p class="text-xs font-black text-slate-900 truncate uppercase tracking-tight">{{ notif.title }}</p>
                                        <span class="text-[9px] font-bold text-slate-400 uppercase">{{ notif.time }}</span>
                                    </div>
                                    <p class="text-[11px] text-slate-500 font-medium line-clamp-2 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">{{ notif.message }}</p>
                                </div>
                            </div>
                            <button @click="clearNotification(notif.id)" class="absolute top-5 right-2 opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-rose-600 transition-colors">
                                <X class="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </transition>
          </div>

          <div class="h-10 w-px bg-slate-200/50"></div>
          
          <!-- User Profile -->
          <div class="flex items-center gap-4 group cursor-pointer">
            <div class="w-11 h-11 rounded-2xl bg-primary-600 flex items-center justify-center text-sm font-black text-white shadow-xl shadow-primary-500/30 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
              {{ userInitials }}
            </div>
            <div class="hidden md:block">
              <div class="text-sm font-black text-slate-900 leading-none mb-1 group-hover:text-primary-600 transition-colors uppercase tracking-tight">{{ userName }}</div>
              <div class="text-[9px] text-secondary-600 font-black uppercase tracking-[0.2em] opacity-80">
                {{ authStore.userRole || 'User' }}
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <main class="flex-1 p-8 overflow-y-auto w-full scrollbar-thin scrollbar-thumb-surface-800 scrollbar-track-transparent">
        <RouterView v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </RouterView>
      </main>
    </div>
    
    <!-- Backdrop for notifications -->
    <div v-if="showNotifications" @click="showNotifications = false" class="fixed inset-0 z-40 bg-black/5 backdrop-blur-sm md:hidden"></div>
  </div>
</template>

<style scoped>
/* Custom transitions */
.animate-in {
    animation: animate-in 0.2s ease-out;
}

@keyframes animate-in {
    from {
        opacity: 0;
        transform: translateY(-10px) scale(0.95);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

/* Hide scrollbar but keep functionality */
.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
