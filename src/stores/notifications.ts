import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface Notification {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    title?: string;
    message: string;
    duration?: number;
}

export const useNotificationStore = defineStore('notifications', () => {
    const queue = ref<Notification[]>([]);

    const notify = (notif: Omit<Notification, 'id'>) => {
        const id = Math.random().toString(36).substring(2, 9);
        const newNotif = { ...notif, id };
        queue.value.push(newNotif as Notification);

        if (notif.duration !== 0) {
            setTimeout(() => {
                remove(id);
            }, notif.duration || 5000);
        }
    };

    const remove = (id: string) => {
        queue.value = queue.value.filter(n => n.id !== id);
    };

    const success = (message: string, title?: string) => notify({ type: 'success', message, title });
    const error = (message: string, title?: string) => notify({ type: 'error', message, title });
    const info = (message: string, title?: string) => notify({ type: 'info', message, title });

    return { queue, notify, remove, success, error, info };
});
