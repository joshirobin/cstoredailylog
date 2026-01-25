import { defineStore } from 'pinia';
import { ref, onMounted } from 'vue';
import { auth } from '../firebaseConfig';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    type User
} from 'firebase/auth';
import { useRouter } from 'vue-router';

export const useAuthStore = defineStore('auth', () => {
    const user = ref<User | { uid: string, email: string, displayName: string } | null>(null);
    const loading = ref(true);
    const router = useRouter();
    const isDemo = ref(false);

    onMounted(() => {
        onAuthStateChanged(auth, (currentUser) => {
            if (!isDemo.value) {
                user.value = currentUser;
            }
            loading.value = false;
        });
    });

    const login = async (email: string, pass: string) => {
        try {
            if (email === 'demo@example.com') {
                // Fallback for manual demo entry if button isn't used
                await loginAsDemo();
                return;
            }
            await signInWithEmailAndPassword(auth, email, pass);
        } catch (error: any) {
            throw error;
        }
    };

    const loginAsDemo = async () => {
        isDemo.value = true;
        user.value = {
            uid: 'demo-user-123',
            email: 'demo@cstoredaily.com',
            displayName: 'Demo Manager'
        };
        loading.value = false;
        router.push('/');
    };

    const logout = async () => {
        if (isDemo.value) {
            isDemo.value = false;
            user.value = null;
        } else {
            await signOut(auth);
        }
        router.push('/login');
    };

    const resetPassword = async (email: string) => {
        try {
            await sendPasswordResetEmail(auth, email);
        } catch (error: any) {
            throw error;
        }
    };

    const register = async (email: string, pass: string, name: string) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
            await updateProfile(userCredential.user, {
                displayName: name
            });
            // Force refresh user in store
            user.value = userCredential.user;
        } catch (error: any) {
            throw error;
        }
    };

    return {
        user,
        loading,
        login,
        loginAsDemo,
        logout,
        resetPassword,
        register
    };
});
