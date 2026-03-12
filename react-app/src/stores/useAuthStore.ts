import { create } from 'zustand';
import {
    User,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    signInAnonymously
} from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

interface AuthState {
    user: User | null;
    userRole: string | null;
    loading: boolean;
    isDemo: boolean;
    login: (email: string, pass: string) => Promise<void>;
    loginAsDemo: () => Promise<void>;
    logout: () => Promise<void>;
    register: (email: string, pass: string, name: string, role?: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => {
    // We attach the listener immediately when the store is initialized
    onAuthStateChanged(auth, async (currentUser) => {
        const { isDemo } = get();
        if (!isDemo || (currentUser && currentUser.isAnonymous)) {
            set({ user: currentUser });
            if (currentUser?.email) {
                await fetchUserRole(currentUser.email);
            } else if (!currentUser) {
                set({ userRole: null });
            }
        }
        set({ loading: false });
    });

    const fetchUserRole = async (email: string) => {
        try {
            const q = query(collection(db, 'employees'), where('email', '==', email));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const docSnap = querySnapshot.docs[0];
                set({ userRole: docSnap.data().role || 'Cashier' });
            } else if (email === 'demo@cstoredaily.com') {
                set({ userRole: 'Admin' });
            } else {
                set({ userRole: 'Admin' });
            }
        } catch (error) {
            console.error('Failed to fetch user role:', error);
            set({ userRole: 'Cashier' });
        }
    };

    const logAccess = async (userObj: User) => {
        const { isDemo } = get();
        if (isDemo) return;
        try {
            let ipAddress = 'Unknown';
            try {
                const response = await fetch('https://api.ipify.org?format=json');
                const data = await response.json();
                ipAddress = data.ip;
            } catch (e) {
                console.warn('Could not fetch IP address', e);
            }

            await addDoc(collection(db, 'access_logs'), {
                uid: userObj.uid,
                email: userObj.email,
                displayName: userObj.displayName || 'Anonymous',
                ipAddress,
                timestamp: serverTimestamp(),
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                locationId: 'Pending' // Would pull from a location store
            });
        } catch (error) {
            console.error('Failed to log access:', error);
        }
    };

    return {
        user: null,
        userRole: null,
        loading: true,
        isDemo: false,

        login: async (email, pass) => {
            set({ loading: true, isDemo: false });
            try {
                if (email === 'demo@example.com' || email === 'demo@cstoredaily.com') {
                    await get().loginAsDemo();
                    return;
                }
                const result = await signInWithEmailAndPassword(auth, email, pass);
                set({ user: result.user });
                if (result.user.email) {
                    await fetchUserRole(result.user.email);
                    await logAccess(result.user);
                }
            } catch (error) {
                set({ loading: false });
                throw error;
            } finally {
                set({ loading: false });
            }
        },

        loginAsDemo: async () => {
            set({ isDemo: true, loading: true });
            try {
                await signInAnonymously(auth);
                set({
                    user: auth.currentUser as User,
                    userRole: 'Admin',
                    loading: false
                });
            } catch (error) {
                console.error('Demo auth failed:', error);
                set({ loading: false });
            }
        },

        logout: async () => {
            const { isDemo } = get();
            if (isDemo) {
                set({ isDemo: false, user: null, userRole: null });
            } else {
                await signOut(auth);
                set({ userRole: null });
            }
        },

        register: async (email: string, pass: string, name: string, role: string = 'Admin') => {
            // Basic implementation reflecting the Vue version
            const { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } = await import('firebase/auth');
            const { doc, setDoc } = await import('firebase/firestore');

            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
                await updateProfile(userCredential.user, {
                    displayName: name
                });
                await sendEmailVerification(userCredential.user, {
                    url: window.location.origin + '/email-verified'
                });

                const newDocRef = doc(db, 'employees', userCredential.user.uid);
                await setDoc(newDocRef, {
                    name,
                    email,
                    role,
                    createdAt: serverTimestamp(),
                    uid: userCredential.user.uid,
                    status: 'Active',
                    firstName: name.split(' ')[0] || '',
                    lastName: name.split(' ').slice(1).join(' ') || ''
                });

                set({ user: userCredential.user, userRole: role });
            } catch (error) {
                throw error;
            }
        }
    };
});
