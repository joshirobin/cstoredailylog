import { create } from 'zustand';

interface NotificationState {
    addNotification: (message: string, type: 'success' | 'error' | 'info', title?: string) => void;
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
}

export const useNotificationStore = create<NotificationState>()((_set) => ({
    addNotification: (message, type, title) => {
        console.log(`[${type.toUpperCase()}] ${title ? title + ': ' : ''}${message}`);
        alert(`[${type.toUpperCase()}] ${title ? title + ': ' : ''}${message}`);
    },
    success: (message, title) => {
        console.log(`[SUCCESS] ${title ? title + ': ' : ''}${message}`);
        // Optionally wrap with toast in real app
        alert(`[SUCCESS] ${title ? title + ': ' : ''}${message}`);
    },
    error: (message, title) => {
        console.error(`[ERROR] ${title ? title + ': ' : ''}${message}`);
        alert(`[ERROR] ${title ? title + ': ' : ''}${message}`);
    },
    info: (message, title) => {
        console.log(`[INFO] ${title ? title + ': ' : ''}${message}`);
    }
}));
