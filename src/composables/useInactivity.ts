import { onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';

/**
 * Composable to handle user inactivity.
 * Auto-logs out the user after a specified duration of inactivity.
 * Uses localStorage to synchronize activity across tabs.
 * 
 * @param timeoutDuration Duration in milliseconds (default: 15 minutes)
 */
export function useInactivity(timeoutDuration: number = 15 * 60 * 1000) {
    const authStore = useAuthStore();
    const router = useRouter();
    const STORAGE_KEY = 'last_activity_timestamp';
    const CHECK_INTERVAL = 60 * 1000; // Check every minute
    let pollingInterval: number | null = null;

    const updateActivity = () => {
        localStorage.setItem(STORAGE_KEY, Date.now().toString());
    };

    const checkInactivity = async () => {
        // Only check if user is logged in
        if (!authStore.user) return;

        const lastActivityStr = localStorage.getItem(STORAGE_KEY);
        let lastActivity = lastActivityStr ? parseInt(lastActivityStr, 10) : Date.now();

        // Safety check if parsing failed
        if (isNaN(lastActivity)) {
            lastActivity = Date.now();
            localStorage.setItem(STORAGE_KEY, lastActivity.toString());
        }

        const now = Date.now();
        const timeSinceActivity = now - lastActivity;

        if (timeSinceActivity > timeoutDuration) {
            console.log('User inactive for too long. Logging out...');

            // Clean up storage
            localStorage.removeItem(STORAGE_KEY);

            try {
                await authStore.logout();
            } catch (error) {
                console.error('Error during inactivity logout:', error);
            } finally {
                // Force redirect to login page ensuring complete logout
                router.push('/login');
            }
        }
    };

    const setupListeners = () => {
        // Initial set
        updateActivity();

        window.addEventListener('mousemove', updateActivity);
        window.addEventListener('mousedown', updateActivity);
        window.addEventListener('keydown', updateActivity);
        window.addEventListener('touchstart', updateActivity);
        window.addEventListener('scroll', updateActivity);
        window.addEventListener('click', updateActivity);
    };

    const removeListeners = () => {
        window.removeEventListener('mousemove', updateActivity);
        window.removeEventListener('mousedown', updateActivity);
        window.removeEventListener('keydown', updateActivity);
        window.removeEventListener('touchstart', updateActivity);
        window.removeEventListener('scroll', updateActivity);
        window.removeEventListener('click', updateActivity);

        if (pollingInterval) {
            clearInterval(pollingInterval);
        }
    };

    onMounted(() => {
        setupListeners();
        // Start polling
        pollingInterval = window.setInterval(checkInactivity, CHECK_INTERVAL);
    });

    onUnmounted(() => {
        removeListeners();
    });

    return {
        updateActivity
    };
}
