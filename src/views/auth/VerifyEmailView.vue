<script setup lang="ts">
import { useAuthStore } from '../../stores/auth';
import { useRouter } from 'vue-router';
import { Mail, ArrowLeft, RefreshCw } from 'lucide-vue-next';
import { auth } from '../../firebaseConfig';
import { ref } from 'vue';

const authStore = useAuthStore();
const router = useRouter();
const resendLoading = ref(false);
const message = ref('');

const handleResend = async () => {
    resendLoading.value = true;
    message.value = '';
    try {
        await authStore.resendVerificationEmail();
        message.value = 'Verification email sent! Please check your inbox.';
    } catch (error: any) {
        message.value = 'Error sending email: ' + error.message;
    } finally {
        resendLoading.value = false;
    }
};

const handleLogout = async () => {
    await authStore.logout();
    router.push('/login');
};

const checkVerification = async () => {
    if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
            // Force update store user
            authStore.user = auth.currentUser;
            router.push('/');
        } else {
            message.value = 'Email still not verified. Please check your inbox and click the link.';
        }
    }
};
</script>

<template>
    <div class="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
        <!-- Background Decor -->
        <div class="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary-500/10 rounded-full blur-[120px] animate-pulse"></div>
        <div class="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-secondary-500/10 rounded-full blur-[120px] animate-pulse" style="animation-delay: 1s"></div>

        <div class="glass-panel p-10 w-full max-w-lg relative z-10 mx-4 border-white/40 shadow-2xl text-center">
            <div class="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-primary-600">
                <Mail class="w-8 h-8" />
            </div>
            
            <h1 class="text-2xl font-display font-black text-slate-900 mb-2 uppercase tracking-tight">Verify Your Email</h1>
            <p class="text-slate-500 mb-8">
                We've sent a verification link to <span class="font-bold text-slate-700">{{ authStore.user?.email }}</span>.<br>
                Please check your inbox and click the link to activate your account.
            </p>

            <div v-if="message" :class="message.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'" class="p-4 rounded-xl text-xs font-bold mb-6 animate-fade-in">
                {{ message }}
            </div>

            <div class="space-y-4">
                <button 
                    @click="checkVerification"
                    class="btn-primary w-full py-4 text-sm font-black tracking-[0.2em] uppercase"
                >
                    I've Verified My Email
                </button>

                <button 
                    @click="handleResend"
                    :disabled="resendLoading"
                    class="w-full py-4 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                >
                    <RefreshCw v-if="resendLoading" class="w-4 h-4 animate-spin" />
                    <span>Resend Verification Email</span>
                </button>
            
                <button 
                    @click="handleLogout"
                    class="text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 mx-auto mt-6"
                >
                    <ArrowLeft class="w-3 h-3" />
                    Back to Login
                </button>
            </div>
        </div>
    </div>
</template>
