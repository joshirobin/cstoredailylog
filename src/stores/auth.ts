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
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, setDoc, deleteDoc } from 'firebase/firestore';
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

    const logAccess = async (userObj: any) => {
        if (isDemo.value) return;
        try {
            let ipAddress = 'Unknown';
            try {
                const response = await fetch('https://api.ipify.org?format=json');
                const data = await response.json();
                ipAddress = data.ip;
            } catch (e) {
                console.warn('Could not fetch IP address:', e);
            }

            await addDoc(collection(db, 'access_logs'), {
                uid: userObj.uid,
                email: userObj.email,
                displayName: userObj.displayName || 'Anonymous',
                ipAddress,
                timestamp: serverTimestamp(),
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                locationId: (await import('./locations')).useLocationsStore().activeLocationId || 'None'
            });
        } catch (error) {
            console.error('Failed to log access:', error);
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
                await logAccess(result.user);

                // Role-based redirect
                if (!isDemo.value) {
                    if (userRole.value === 'Cashier' || userRole.value === 'Stock Associate') {
                        router.push('/clerk');
                        return;
                    } else if (userRole.value === 'Shift Manager') {
                        router.push('/time-clock'); // Or tasks
                        return;
                    } else {
                        router.push('/store-selection');
                        return;
                    }
                } else {
                    router.push('/store-selection');
                }
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
        router.push('/store-selection');
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
            // Check for existing employee record BEFORE creating auth user?
            // Actually better to do it after to start fresh, or during merge.
            // But we need to find it by email.

            const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
            await updateProfile(userCredential.user, {
                displayName: name
            });
            await sendEmailVerification(userCredential.user, {
                url: window.location.origin + '/email-verified'
            });

            // Check if there is an existing employee record (created by Admin)
            const employeesRef = collection(db, 'employees');
            const q = query(employeesRef, where('email', '==', email));
            const querySnapshot = await getDocs(q);

            let existingData = {};
            let oldDocId = null;

            if (!querySnapshot.empty && querySnapshot.docs.length > 0) {
                const oldDoc = querySnapshot.docs[0];
                if (oldDoc) {
                    existingData = oldDoc.data();
                    oldDocId = oldDoc.id;
                    console.log('Found existing employee record:', oldDocId, existingData);
                }
            }

            // Save/Update employee profile
            // We use the Auth UID as the document ID for the final record
            const newDocRef = doc(db, 'employees', userCredential.user.uid);

            await setDoc(newDocRef, {
                ...existingData, // Preserve existing admin-set data (hourlyRate, position, etc)
                name, // Update name if user provided a better one? Or keep admin's? Let's authorize user's input for name
                email,
                role: (existingData as any).role || role, // Prefer existing role if set by admin
                createdAt: (existingData as any).createdAt || serverTimestamp(),
                uid: userCredential.user.uid,
                status: 'Active',
                // Ensure critical fields are set if missing
                firstName: name.split(' ')[0] || (existingData as any).firstName || '',
                lastName: name.split(' ').slice(1).join(' ') || (existingData as any).lastName || ''
            });

            // If we migrated from an old doc, delete the old one to avoid duplicates
            if (oldDocId && oldDocId !== userCredential.user.uid) {
                await deleteDoc(doc(db, 'employees', oldDocId));
                console.log('Deleted old employee record:', oldDocId);
            }

            // Force refresh user in store
            user.value = userCredential.user;
            userRole.value = (existingData as any).role || role;
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
            await sendEmailVerification(auth.currentUser, {
                url: window.location.origin + '/email-verified'
            });
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
