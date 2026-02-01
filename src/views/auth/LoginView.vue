<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { useRouter } from 'vue-router';
import { Lock, Mail, Loader2 } from 'lucide-vue-next';

const email = ref('');
const password = ref('');
const errorMsg = ref('');
const isSubmitting = ref(false);
const authStore = useAuthStore();
const router = useRouter();

const handleLogin = async () => {
  errorMsg.value = '';
  isSubmitting.value = true;
  
  try {
    await authStore.login(email.value, password.value);
    router.push('/');
  } catch (err: any) {
    if (err.code === 'auth/invalid-credential') {
      errorMsg.value = 'Invalid email or password.';
    } else {
      errorMsg.value = 'An error occurred. Please try again.';
    }
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white relative overflow-hidden">
    <!-- Background Decor -->
    <div class="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary-100/30 rounded-full blur-[120px]"></div>
    <div class="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-secondary-100/30 rounded-full blur-[120px]"></div>

    <div class="glass-panel p-8 w-full max-w-md relative z-10 mx-4 border-slate-100">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-50 text-primary-600 mb-4">
          <Lock class="w-6 h-6" />
        </div>
        <h1 class="text-2xl font-display font-bold text-slate-900 mb-2">Welcome Back</h1>
        <p class="text-slate-500 text-sm">Sign in to your dashboard</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-5">
        <div v-if="errorMsg" class="bg-red-50 border border-red-100 text-red-700 text-sm p-3 rounded-lg text-center">
          {{ errorMsg }}
        </div>

        <div v-if="authStore.user && !authStore.user.emailVerified && !authStore.isDemo" class="bg-amber-50 border border-amber-100 text-amber-800 text-sm p-3 rounded-lg text-center">
             Your email is not verified. 
             <button @click="authStore.resendVerificationEmail()" class="underline font-bold hover:text-amber-900">Resend Link</button>
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-medium text-slate-500 ml-1">Email Address</label>
          <div class="relative">
            <Mail class="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
            <input 
              v-model="email" 
              type="email" 
              required 
              class="input-field w-full pl-10" 
              placeholder="name@company.com"
            />
          </div>
        </div>

        <div class="space-y-1.5">
          <div class="flex items-center justify-between ml-1">
            <label class="text-xs font-medium text-slate-500">Password</label>
            <router-link to="/forgot-password" class="text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors">
              Forgot password?
            </router-link>
          </div>
          <div class="relative">
            <Lock class="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
            <input 
              v-model="password" 
              type="password" 
              required 
              class="input-field w-full pl-10" 
              placeholder="••••••••"
            />
          </div>
        </div>

        <button 
          type="submit" 
          :disabled="isSubmitting"
          class="btn-primary w-full flex items-center justify-center gap-2 mt-2"
        >
          <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin" />
          <span>{{ isSubmitting ? 'Signing in...' : 'Sign In' }}</span>
        </button>

        <div class="relative py-4">
          <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-slate-200"></div></div>
          <div class="relative flex justify-center text-xs uppercase"><span class="bg-white px-2 text-slate-400">Or continue with</span></div>
        </div>

        <button 
          type="button"
          @click="authStore.loginAsDemo()"
          class="w-full h-11 border border-slate-200 rounded-xl flex items-center justify-center gap-2 text-slate-700 font-semibold hover:bg-slate-50 transition-all"
        >
          <div class="w-5 h-5 bg-gradient-to-tr from-primary-500 to-secondary-500 rounded flex items-center justify-center text-white text-[10px]">D</div>
          Demo Mode
        </button>

        <div class="text-center mt-6">
            <p class="text-sm text-slate-500">
                Don't have an account? 
                <router-link to="/signup" class="text-primary-600 font-bold hover:text-primary-700 transition-colors">Sign Up</router-link>
            </p>
        </div>
      </form>
    </div>
  </div>
</template>
