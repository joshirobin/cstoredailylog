<script setup lang="ts">
import { useNotificationStore } from '../stores/notifications';
import { 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  AlertTriangle, 
  X 
} from 'lucide-vue-next';

const notificationStore = useNotificationStore();

const getIcon = (type: string) => {
    switch (type) {
        case 'success': return CheckCircle2;
        case 'error': return AlertCircle;
        case 'warning': return AlertTriangle;
        default: return Info;
    }
};

const getColorClass = (type: string) => {
    switch (type) {
        case 'success': return 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400';
        case 'error': return 'border-rose-500/50 bg-rose-500/10 text-rose-400';
        case 'warning': return 'border-amber-500/50 bg-amber-500/10 text-amber-400';
        default: return 'border-blue-500/50 bg-blue-500/10 text-blue-400';
    }
};
</script>

<template>
  <div class="fixed top-20 right-6 z-[9999] flex flex-col gap-3 w-80 pointer-events-none">
    <transition-group 
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 translate-x-10 scale-95"
        enter-to-class="opacity-100 translate-x-0 scale-100"
        leave-active-class="transition-all duration-200 ease-in absolute"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-90"
        move-class="transition-all duration-300"
    >
        <div 
            v-for="notif in notificationStore.queue" 
            :key="notif.id"
            class="pointer-events-auto glass-panel p-4 border flex items-start gap-4 shadow-2xl backdrop-blur-xl"
            :class="getColorClass(notif.type)"
        >
            <component :is="getIcon(notif.type)" class="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div class="flex-1 min-w-0">
                <p v-if="notif.title" class="text-xs font-black uppercase tracking-widest mb-1">{{ notif.title }}</p>
                <p class="text-sm font-medium leading-snug">{{ notif.message }}</p>
            </div>
            <button @click="notificationStore.remove(notif.id)" class="p-1 hover:bg-white/10 rounded transition-colors">
                <X class="w-4 h-4" />
            </button>
        </div>
    </transition-group>
  </div>
</template>

<style scoped>
.glass-panel {
    background: rgba(15, 23, 42, 0.8);
}
</style>
