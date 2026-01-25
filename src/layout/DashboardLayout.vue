<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { RouterView } from 'vue-router';
import Sidebar from '../components/Sidebar.vue';
import { Bell, Search, X, Check } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();

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

onMounted(() => {
    setTimeout(() => {
        addWelcomeNotification();
    }, 1000);
});
</script>

<template>
  <div class="flex min-h-screen bg-surface-950 text-white">
    <!-- Sidebar -->
    <Sidebar />

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Top Header -->
      <header class="h-16 border-b border-surface-800 bg-surface-900/50 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-8">
        <div class="flex items-center gap-4 flex-1">
          <!-- Search Bar (Visual Only) -->
          <div class="relative w-full max-w-md hidden md:block">
            <Search class="absolute left-3 top-2.5 w-4 h-4 text-surface-500" />
            <input 
              type="text" 
              placeholder="Search invoices, accounts..." 
              class="w-full bg-surface-800 border-none rounded-full py-2 pl-10 pr-4 text-sm text-white placeholder-surface-500 focus:ring-1 focus:ring-primary-500/50"
            >
          </div>
        </div>

        <div class="flex items-center gap-4">
          <!-- Notifications -->
          <div class="relative">
            <button 
                @click="showNotifications = !showNotifications"
                class="relative p-2 text-surface-400 hover:text-white transition-colors"
                :class="{ 'text-white': showNotifications }"
            >
                <Bell class="w-5 h-5" />
                <span v-if="unreadCount > 0" class="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full border border-surface-900 animate-pulse"></span>
            </button>

            <!-- Notifications Dropdown -->
            <div v-if="showNotifications" class="absolute right-0 mt-3 w-80 bg-surface-900 border border-surface-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div class="p-4 border-b border-surface-800 flex items-center justify-between">
                    <h3 class="font-bold text-sm">Notifications</h3>
                    <button @click="markAllAsRead" class="text-xs text-primary-400 hover:text-primary-300">Mark all as read</button>
                </div>
                <div class="max-h-96 overflow-y-auto">
                    <div v-if="notifications.length === 0" class="p-8 text-center text-surface-500 italic text-sm">
                        No new notifications
                    </div>
                    <div 
                        v-for="notif in notifications" 
                        :key="notif.id"
                        class="p-4 border-b border-surface-800 last:border-0 hover:bg-surface-800/50 transition-colors relative group"
                        :class="{ 'bg-primary-500/5': !notif.read }"
                    >
                        <div class="flex gap-3">
                            <div class="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                                <Check v-if="notif.type === 'welcome'" class="w-4 h-4 text-primary-400" />
                                <Bell v-else class="w-4 h-4 text-primary-400" />
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center justify-between">
                                    <p class="text-xs font-bold text-white truncate">{{ notif.title }}</p>
                                    <span class="text-[10px] text-surface-500">{{ notif.time }}</span>
                                </div>
                                <p class="text-xs text-surface-400 mt-1 line-clamp-2 leading-relaxed">{{ notif.message }}</p>
                            </div>
                        </div>
                        <button @click="clearNotification(notif.id)" class="absolute top-4 right-1 opacity-0 group-hover:opacity-100 p-1 text-surface-600 hover:text-white transition-opacity">
                            <X class="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </div>
          </div>

          <div class="h-8 w-px bg-surface-800"></div>
          
          <!-- User Profile -->
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-gradient-to-tr from-primary-500 to-secondary-500 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-primary-500/20">
              {{ userInitials }}
            </div>
            <div class="hidden md:block">
              <div class="text-sm font-bold text-white">{{ userName }}</div>
              <div class="text-[10px] text-primary-400 font-bold uppercase tracking-wider">
                {{ authStore.user?.email === 'demo@cstoredaily.com' ? 'Demo Mode' : 'Authenticated' }}
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <main class="flex-1 p-8 overflow-y-auto w-full scrollbar-thin scrollbar-thumb-surface-800 scrollbar-track-transparent">
        <RouterView v-slot="{ Component }">
          <transition 
            enter-active-class="transition-all duration-300 ease-out" 
            enter-from-class="opacity-0 translate-y-2" 
            enter-to-class="opacity-100 translate-y-0" 
            leave-active-class="transition-all duration-200 ease-in" 
            leave-from-class="opacity-100" 
            leave-to-class="opacity-0"
            mode="out-in"
          >
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
  background: #1f2937;
  border-radius: 10px;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: #374151;
}
</style>
