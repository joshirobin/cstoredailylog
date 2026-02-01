import { defineStore } from 'pinia';
import { ref } from 'vue';
import { auth } from '../firebaseConfig';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    signInAnonymously,
    sendEmailVerification,
    type User
} from 'firebase/auth';
import { useRouter } from 'vue-router';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { usePermissionsStore } from './permissions';

export const useAuthStore = defineStore('auth', () => {
    const user = ref<User | { uid: string, email: string, displayName: string, emailVerified?: boolean } | null>(null);
    const loading = ref(true);
    const router = useRouter();
    const isDemo = ref(false);
    const userRole = ref<string | null>(null);
    const permissionsStore = usePermissionsStore();

    const fetchUserRole = async (email: string) => {
        try {
            const q = query(collection(db, 'employees'), where('email', '==', email));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                if (doc && doc.exists()) {
                    userRole.value = doc.data().role || 'Cashier';
                } else {
                    userRole.value = 'Cashier';
                }
            } else if (email === 'demo@cstoredaily.com') {
                userRole.value = 'Admin';
            } else {
                userRole.value = 'Admin'; // Default to Admin for first-time setup/owners
            }
        } catch (error) {
            console.error('Failed to fetch user role:', error);
            userRole.value = 'Cashier';
        }
    };

    // Initialize auth state listener immediately
    onAuthStateChanged(auth, async (currentUser) => {
        console.log('Auth state changed:', currentUser?.email, 'isDemo:', isDemo.value);
        if (!isDemo.value || (currentUser && currentUser.isAnonymous)) {
            user.value = currentUser;
            if (currentUser?.email) {
                await fetchUserRole(currentUser.email);
                await permissionsStore.fetchPermissions();

                // Initialize locations
                const { useLocationsStore } = await import('./locations');
                const locationsStore = useLocationsStore();
                await locationsStore.fetchLocations();
            } else if (currentUser && !currentUser.isAnonymous) {
                // Logged in but no email? (e.g. phone) - fetch role by uid or default
                await fetchUserRole('default');
            } else if (!currentUser) {
                userRole.value = null;
            }
        }
        loading.value = false;
        console.log('Auth initialization complete. Role:', userRole.value);
    });

    const login = async (email: string, pass: string) => {
        loading.value = true;
        try {
            if (email === 'demo@example.com' || email === 'demo@cstoredaily.com') {
                await loginAsDemo();
                return;
            }
            isDemo.value = false; // Ensure demo mode is off
            const result = await signInWithEmailAndPassword(auth, email, pass);
            user.value = result.user;
            if (result.user.email) {
                await fetchUserRole(result.user.email);
                await permissionsStore.fetchPermissions();
            }
        } catch (error: any) {
            loading.value = false;
            throw error;
        } finally {
            loading.value = false;
        }
    };

    const loginAsDemo = async () => {
        isDemo.value = true;
        try {
            await signInAnonymously(auth);
            user.value = {
                uid: auth.currentUser?.uid || 'demo-user-123',
                email: 'demo@cstoredaily.com',
                displayName: 'Demo Manager'
            };
            userRole.value = 'Admin';
        } catch (error) {
            console.error('Demo auth failed:', error);
            // Fallback to local state if anonymous auth fails/disabled
            user.value = {
                uid: 'demo-user-123',
                email: 'demo@cstoredaily.com',
                displayName: 'Demo Manager'
            };
            userRole.value = 'Admin';
        }
        loading.value = false;
        router.push('/');
    };

    const logout = async () => {
        if (isDemo.value) {
            isDemo.value = false;
            user.value = null;
            userRole.value = null;
        } else {
            await signOut(auth);
            userRole.value = null;
            // Clear locations store data
            const { useLocationsStore } = await import('./locations');
            const locationsStore = useLocationsStore();
            locationsStore.clearData();
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

    const register = async (email: string, pass: string, name: string, role: string = 'Admin') => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
            await updateProfile(userCredential.user, {
                displayName: name
            });
            await sendEmailVerification(userCredential.user);

            // Save employee profile with selected role to Firestore
            const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
            await setDoc(doc(db, 'employees', userCredential.user.uid), {
                name,
                email,
                role,
                createdAt: serverTimestamp(),
                uid: userCredential.user.uid,
                status: 'Active'
            });

            // Force refresh user in store
            user.value = userCredential.user;
            userRole.value = role;
            await permissionsStore.fetchPermissions();
        } catch (error: any) {
            throw error;
        }
    };

    const canVisit = (pageName: string) => {
        // Admins have full access by default
        if (userRole.value === 'Admin') return true;
        if (!userRole.value) return false;

        const role = userRole.value;
        const allowedRoutes = permissionsStore.permissions[role]?.allowedRoutes || [];

        // If rules include '*', it means full access
        if (allowedRoutes.includes('*')) return true;

        return allowedRoutes.includes(pageName);
    };

    const resendVerificationEmail = async () => {
        if (auth.currentUser && !auth.currentUser.emailVerified) {
            await sendEmailVerification(auth.currentUser);
        }
    };

    return {
        user,
        userRole,
        loading,
        login,
        loginAsDemo,
        logout,
        resetPassword,
        register,
        canVisit,
        isDemo,
        resendVerificationEmail
    };
});
