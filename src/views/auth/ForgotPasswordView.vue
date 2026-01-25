<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';

const authStore = useAuthStore();
const email = ref('');
const isSubmitting = ref(false);
const error = ref('');
const success = ref(false);

const handleReset = async () => {
    if (!email.value) return;
    
    isSubmitting.value = true;
    error.value = '';
    try {
        await authStore.resetPassword(email.value);
        success.value = true;
    } catch (e: any) {
        console.error(e);
        error.value = e.message || 'Failed to send reset email.';
    } finally {
        isSubmitting.value = false;
    }
};
</script>

<template>
    <div class="min-h-screen bg-surface-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-primary-500/30">
        <div class="sm:mx-auto sm:w-full sm:max-w-md">
            <!-- Glass Header Card -->
            <div class="glass-panel p-8 text-center space-y-4">
                <div class="inline-flex p-3 bg-primary-500/10 rounded-2xl ring-1 ring-primary-500/20">
                    <Mail class="w-8 h-8 text-primary-400" />
                </div>
                <div>
                    <h2 class="text-3xl font-extrabold text-white tracking-tight">Reset Password</h2>
                    <p class="mt-2 text-sm text-surface-400">
                        Enter your email and we'll send you a link to get back into your account.
                    </p>
                </div>
            </div>

            <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div class="glass-panel px-4 py-8 sm:px-10">
                    <div v-if="success" class="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div class="inline-flex p-4 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                            <CheckCircle2 class="w-12 h-12 text-emerald-400" />
                        </div>
                        <div class="space-y-2">
                            <h3 class="text-xl font-bold text-white">Check your email</h3>
                            <p class="text-surface-400 text-sm leading-relaxed">
                                We have sent a password reset link to <br>
                                <span class="text-white font-medium">{{ email }}</span>
                            </p>
                        </div>
                        <RouterLink to="/login" class="btn-primary w-full flex items-center justify-center gap-2">
                            <ArrowLeft class="w-4 h-4" />
                            Back to Sign In
                        </RouterLink>
                    </div>

                    <form v-else @submit.prevent="handleReset" class="space-y-6">
                        <div>
                            <label for="email" class="block text-xs font-bold text-surface-400 uppercase tracking-widest mb-2 px-1">
                                Email Address
                            </label>
                            <div class="relative group">
                                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-surface-500 group-focus-within:text-primary-400 transition-colors">
                                    <Mail class="h-5 w-5" />
                                </div>
                                <input 
                                    v-model="email" 
                                    id="email" 
                                    name="email" 
                                    type="email" 
                                    required 
                                    class="input-field block w-full pl-10 h-12"
                                    placeholder="manager@store.com"
                                />
                            </div>
                        </div>

                        <div v-if="error" class="flex items-center gap-2 text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl animate-in shake">
                            <AlertCircle class="h-5 w-5 flex-shrink-0" />
                            <p>{{ error }}</p>
                        </div>

                        <div class="space-y-4 pt-2">
                            <button 
                                type="submit" 
                                :disabled="isSubmitting"
                                class="btn-primary w-full flex justify-center py-3.5 px-4 text-sm font-bold shadow-lg shadow-primary-500/20 transition-all active:scale-[0.98]"
                            >
                                <Loader2 v-if="isSubmitting" class="w-5 h-5 animate-spin mr-2" />
                                <span v-if="!isSubmitting">Send Reset Link</span>
                                <span v-else>Sending...</span>
                            </button>

                            <RouterLink 
                                to="/login" 
                                class="flex items-center justify-center gap-2 text-sm text-surface-400 hover:text-white transition-colors py-2"
                            >
                                <ArrowLeft class="w-4 h-4" />
                                Back to Login
                            </RouterLink>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        
        <!-- Decorative Elements -->
        <div class="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
            <div class="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary-500/10 rounded-full blur-[120px]"></div>
            <div class="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary-500/10 rounded-full blur-[120px]"></div>
        </div>
    </div>
</template>

<style scoped>
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
    20%, 40%, 60%, 80% { transform: translateX(4px); }
}

.shake {
    animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
}
</style>
