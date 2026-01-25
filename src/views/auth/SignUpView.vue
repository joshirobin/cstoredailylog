<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { useRouter } from 'vue-router';
import { User, Mail, Lock, Loader2, UserPlus } from 'lucide-vue-next';

const name = ref('');
const email = ref('');
const password = ref('');
const errorMsg = ref('');
const isSubmitting = ref(false);
const authStore = useAuthStore();
const router = useRouter();

const handleRegister = async () => {
  errorMsg.value = '';
  isSubmitting.value = true;
  
  try {
    await authStore.register(email.value, password.value, name.value);
    router.push('/');
  } catch (err: any) {
    if (err.code === 'auth/email-already-in-use') {
      errorMsg.value = 'Email is already in use.';
    } else if (err.code === 'auth/weak-password') {
      errorMsg.value = 'Password should be at least 6 characters.';
    } else {
      errorMsg.value = err.message || 'An error occurred during registration.';
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
          <UserPlus class="w-6 h-6" />
        </div>
        <h1 class="text-2xl font-display font-bold text-white mb-2">Create Account</h1>
        <p class="text-surface-400 text-sm">Join C-Store Daily Ops</p>
      </div>

      <form @submit.prevent="handleRegister" class="space-y-5">
        <div v-if="errorMsg" class="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg text-center">
          {{ errorMsg }}
        </div>

        <!-- Name Field -->
        <div class="space-y-1.5">
          <label class="text-xs font-medium text-surface-400 ml-1">Full Name</label>
          <div class="relative">
            <User class="absolute left-3 top-2.5 w-5 h-5 text-surface-500" />
            <input 
              v-model="name" 
              type="text" 
              required 
              class="input-field w-full pl-10" 
              placeholder="John Doe"
            />
          </div>
        </div>

        <!-- Email Field -->
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

        <!-- Password Field -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between ml-1">
            <label class="text-xs font-medium text-surface-400">Password</label>
            <router-link to="/forgot-password" class="text-xs font-semibold text-primary-400 hover:text-primary-300 transition-colors">
              Forgot password?
            </router-link>
          </div>
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
          <span>{{ isSubmitting ? 'Creating account...' : 'Create Account' }}</span>
        </button>

        <div class="text-center mt-6">
            <p class="text-sm text-surface-400">
                Already have an account? 
                <router-link to="/login" class="text-primary-400 font-bold hover:text-primary-300 transition-colors">Sign In</router-link>
            </p>
        </div>
      </form>
    </div>
  </div>
</template>
