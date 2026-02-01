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
    <div class="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-primary-500/30">
        <div class="sm:mx-auto sm:w-full sm:max-w-md">
            <!-- Clean Header Card -->
            <div class="bg-white border border-slate-100 rounded-[2.5rem] p-8 text-center space-y-4 shadow-sm">
                <div class="inline-flex p-4 border border-slate-100 bg-white rounded-2xl shadow-sm text-primary-500">
                    <Mail class="w-8 h-8" />
                </div>
                <div>
                    <h2 class="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Reset Access</h2>
                    <p class="mt-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        We'll send a secure link to your inbox.
                    </p>
                </div>
            </div>

            <div class="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
                <div class="bg-white border border-slate-100 rounded-[2.5rem] px-4 py-8 sm:px-10 shadow-xl shadow-slate-200/50">
                    <div v-if="success" class="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div class="inline-flex p-4 bg-emerald-50 rounded-full border border-emerald-100">
                            <CheckCircle2 class="w-12 h-12 text-emerald-500" />
                        </div>
                        <div class="space-y-2">
                            <h3 class="text-xl font-black text-slate-900 uppercase italic">Check your email</h3>
                            <p class="text-slate-500 text-sm font-bold">
                                A reset link has been dispatched to:<br>
                                <span class="text-primary-600">{{ email }}</span>
                            </p>
                        </div>
                        <RouterLink to="/login" class="btn-primary w-full flex items-center justify-center gap-2 py-4 rounded-2xl">
                            <ArrowLeft class="w-4 h-4" />
                            <span class="font-black uppercase tracking-widest text-xs">Return to Login</span>
                        </RouterLink>
                    </div>

                    <form v-else @submit.prevent="handleReset" class="space-y-6">
                        <div class="space-y-2">
                            <label for="email" class="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                                Email Address
                            </label>
                            <div class="relative group">
                                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300 group-focus-within:text-primary-500 transition-colors">
                                    <Mail class="h-5 w-5" />
                                </div>
                                <input 
                                    v-model="email" 
                                    id="email" 
                                    name="email" 
                                    type="email" 
                                    required 
                                    class="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl pl-12 pr-6 py-4 text-slate-900 font-bold placeholder-slate-200 focus:bg-white focus:border-primary-500 transition-all outline-none text-sm"
                                    placeholder="Enter your registered email"
                                />
                            </div>
                        </div>

                        <div v-if="error" class="flex items-center gap-2 text-rose-500 text-xs font-bold bg-rose-50 border border-rose-100 p-4 rounded-2xl animate-in shake">
                            <AlertCircle class="h-4 w-4 flex-shrink-0" />
                            <p class="uppercase tracking-tight">{{ error }}</p>
                        </div>

                        <div class="space-y-4 pt-2">
                            <button 
                                type="submit" 
                                :disabled="isSubmitting"
                                class="btn-primary w-full flex justify-center py-4 px-4 text-xs font-black uppercase tracking-widest shadow-xl shadow-primary-500/20 transition-all active:scale-[0.98] rounded-2xl"
                            >
                                <Loader2 v-if="isSubmitting" class="w-5 h-5 animate-spin mr-2" />
                                <span v-if="!isSubmitting">Send Reset Link</span>
                                <span v-else>Processing...</span>
                            </button>

                            <RouterLink 
                                to="/login" 
                                class="flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 hover:text-primary-500 uppercase tracking-widest transition-colors py-2"
                            >
                                <ArrowLeft class="w-3 h-3" />
                                Back to Login
                            </RouterLink>
                        </div>
                    </form>
                </div>
            </div>
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
