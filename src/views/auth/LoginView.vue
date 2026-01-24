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
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-900 to-surface-800 relative overflow-hidden">
    <!-- Background Decor -->
    <div class="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary-500/20 rounded-full blur-[120px]"></div>
    <div class="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-secondary-500/20 rounded-full blur-[120px]"></div>

    <div class="glass-panel p-8 w-full max-w-md relative z-10 mx-4 border-surface-700/50">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-500/10 text-primary-400 mb-4">
          <Lock class="w-6 h-6" />
        </div>
        <h1 class="text-2xl font-display font-bold text-white mb-2">Welcome Back</h1>
        <p class="text-surface-400 text-sm">Sign in to your dashboard</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-5">
        <div v-if="errorMsg" class="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg text-center">
          {{ errorMsg }}
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-medium text-surface-400 ml-1">Email Address</label>
          <div class="relative">
            <Mail class="absolute left-3 top-2.5 w-5 h-5 text-surface-500" />
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
          <label class="text-xs font-medium text-surface-400 ml-1">Password</label>
          <div class="relative">
            <Lock class="absolute left-3 top-2.5 w-5 h-5 text-surface-500" />
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
        
        <div class="relative flex py-2 items-center">
            <div class="flex-grow border-t border-surface-700"></div>
            <span class="flex-shrink-0 mx-4 text-xs text-surface-500">Or try without account</span>
            <div class="flex-grow border-t border-surface-700"></div>
        </div>

        <button 
          type="button" 
          @click="authStore.loginAsDemo()"
          class="btn-secondary w-full flex items-center justify-center gap-2"
        >
          <span>Enter Demo Mode (No Auth)</span>
        </button>
      </form>
      
      <div class="mt-6 text-center text-xs text-surface-500">
        Demo Account: <span class="text-surface-400">admin@cstoredaily.com</span>
      </div>
    </div>
  </div>
</template>
