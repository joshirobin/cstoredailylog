<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../../stores/auth';
import logoUrl from '../../assets/logo.png';
import { Lock, Mail, Loader2 } from 'lucide-vue-next';

const email = ref('');
const password = ref('');
const errorMsg = ref('');
const isSubmitting = ref(false);
const authStore = useAuthStore();

const handleLogin = async () => {

  errorMsg.value = '';
  isSubmitting.value = true;
  
  try {
    await authStore.login(email.value, password.value);
    
    // router.push('/'); // Handled by authStore based on role
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
  <div class="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
    <!-- Background Decor -->
    <div class="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary-500/10 rounded-full blur-[120px] animate-pulse"></div>
    <div class="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-secondary-500/10 rounded-full blur-[120px] animate-pulse" style="animation-delay: 1s"></div>

    <div class="glass-panel p-10 w-full max-w-lg relative z-10 mx-4 border-white/40">
      <div class="text-center mb-10">
        <div class="flex items-center justify-center mb-6">
          <img :src="logoUrl" alt="CStoreSync Logo" class="w-9 h-auto object-contain transition-transform duration-500 hover:scale-105" />
        </div>
        <h1 class="text-3xl font-display font-black text-slate-900 mb-3 tracking-tight italic uppercase">
            <span class="dynamic-highlight">Cstoresync</span>
        </h1>
        <p class="text-slate-500 text-sm font-bold tracking-widest uppercase opacity-70">Sign in to your dashboard</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-6">
        <div v-if="errorMsg" class="bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold p-4 rounded-xl text-center animate-bounce">
          {{ errorMsg }}
        </div>



        <div class="space-y-2">
          <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Email Address</label>
          <div class="relative group">
            <Mail class="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-primary-600 transition-colors" />
            <input 
              v-model="email" 
              type="email" 
              required 
              class="input-field w-full pl-12" 
              placeholder="name@company.com"
            />
          </div>
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between ml-2">
            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Password</label>
            <router-link to="/forgot-password" class="text-[10px] font-black text-primary-600 hover:text-primary-700 transition-colors uppercase tracking-widest">
              Forgot?
            </router-link>
          </div>
          <div class="relative group">
            <Lock class="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-primary-600 transition-colors" />
            <input 
              v-model="password" 
              type="password" 
              required 
              class="input-field w-full pl-12" 
              placeholder="••••••••"
            />
          </div>
        </div>

        <button 
          type="submit" 
          :disabled="isSubmitting"
          class="btn-primary w-full py-4 text-sm font-black tracking-[0.2em] uppercase"
        >
          <Loader2 v-if="isSubmitting" class="w-5 h-5 animate-spin" />
          <span>{{ isSubmitting ? 'Authenticating...' : 'Enter Dashboard' }}</span>
        </button>

        <div class="relative py-6">
          <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-slate-200/50"></div></div>
          <div class="relative flex justify-center text-[10px] font-black uppercase tracking-[0.2em]"><span class="bg-white/80 backdrop-blur-md px-4 text-slate-400">Secure Access</span></div>
        </div>

        <button 
          type="button"
          @click="authStore.loginAsDemo()"
          class="w-full h-14 border-2 border-slate-100 rounded-2xl flex items-center justify-center gap-3 text-slate-600 font-black text-xs uppercase tracking-widest hover:bg-white hover:border-primary-500/20 hover:shadow-xl hover:shadow-primary-500/5 transition-all group"
        >
          <div class="w-8 h-8 bg-gradient-to-tr from-primary-600 to-secondary-500 rounded-lg flex items-center justify-center text-white text-xs group-hover:rotate-12 transition-transform">D</div>
          Try Demo Mode
        </button>

        <div class="text-center mt-8">
            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Need an account? 
                <router-link to="/signup" class="text-primary-600 font-black hover:text-primary-700 transition-colors ml-1 underline">Sign Up</router-link>
            </p>
        </div>
      </form>
    </div>
  </div>
</template>
