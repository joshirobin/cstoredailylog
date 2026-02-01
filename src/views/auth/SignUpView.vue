<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { useRouter } from 'vue-router';
import { User, Mail, Lock, Loader2, UserPlus, Shield, ChevronRight } from 'lucide-vue-next';

const name = ref('');
const email = ref('');
const password = ref('');
const role = ref('Admin');
const errorMsg = ref('');
const isSubmitting = ref(false);
const authStore = useAuthStore();
const router = useRouter();

const handleRegister = async () => {
  errorMsg.value = '';
  isSubmitting.value = true;
  
  try {
    await authStore.register(email.value, password.value, name.value, role.value);
    
    // Explicitly sign out after registration so they have to login with verification
    await authStore.logout();
    
    alert('Account created successfully! A verification link has been sent to your email. Please verify your email before logging in.');
    router.push('/login');
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
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white relative overflow-hidden">
    <!-- Background Decor -->
    <div class="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary-100/30 rounded-full blur-[120px]"></div>
    <div class="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-secondary-100/30 rounded-full blur-[120px]"></div>

    <div class="glass-panel p-8 w-full max-w-md relative z-10 mx-4 border-slate-100 shadow-2xl">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-50 text-primary-600 mb-4 shadow-sm">
          <UserPlus class="w-6 h-6" />
        </div>
        <h1 class="text-3xl font-black text-slate-900 mb-2 italic uppercase tracking-tighter">Create Account</h1>
        <p class="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Join the C-Store Daily Ecosystem</p>
      </div>

      <form @submit.prevent="handleRegister" class="space-y-5">
        <div v-if="errorMsg" class="bg-rose-50 border border-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-widest p-3 rounded-xl text-center">
          {{ errorMsg }}
        </div>

        <!-- Name Field -->
        <div class="space-y-1.5">
          <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
          <div class="relative group">
            <User class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary-600 transition-colors" />
            <input 
              v-model="name" 
              type="text" 
              required 
              class="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 focus:border-primary-500 outline-none transition-all placeholder:text-slate-300" 
              placeholder="John Doe"
            />
          </div>
        </div>

        <!-- Role Selection -->
        <div class="space-y-1.5">
          <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Your Role / Position</label>
          <div class="relative group">
            <Shield class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary-600 transition-colors" />
            <select 
              v-model="role" 
              required 
              class="w-full pl-12 pr-4 py-4 bg-slate-100 border-2 border-slate-100 rounded-2xl font-black text-slate-900 focus:border-primary-500 outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="Admin">Admin (Owner/Super User)</option>
              <option value="Manager">Manager</option>
              <option value="Cashier">Cashier / Staff</option>
            </select>
            <ChevronRight class="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none rotate-90" />
          </div>
          <p class="text-[9px] font-bold text-slate-400 mt-1 ml-1 uppercase leading-tight italic">
            {{ role === 'Admin' ? 'Super Admin: Full controls over employees, inventory & financial data.' : role === 'Manager' ? 'Ops Manager: Access to all day-to-day operations & reports.' : 'Staff: Access to terminal, checklists & task boards.' }}
          </p>
        </div>

        <!-- Email Field -->
        <div class="space-y-1.5">
          <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
          <div class="relative group">
            <Mail class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary-600 transition-colors" />
            <input 
              v-model="email" 
              type="email" 
              required 
              class="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 focus:border-primary-500 outline-none transition-all placeholder:text-slate-300" 
              placeholder="name@company.com"
            />
          </div>
        </div>

        <!-- Password Field -->
        <div class="space-y-1.5">
          <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
          <div class="relative group">
            <Lock class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary-600 transition-colors" />
            <input 
              v-model="password" 
              type="password" 
              required 
              class="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 focus:border-primary-500 outline-none transition-all placeholder:text-slate-300" 
              placeholder="••••••••"
            />
          </div>
        </div>

        <button 
          type="submit" 
          :disabled="isSubmitting"
          class="btn-primary w-full py-4 rounded-2xl flex items-center justify-center gap-3 mt-4 shadow-xl shadow-primary-500/20 disabled:opacity-50"
        >
          <Loader2 v-if="isSubmitting" class="w-5 h-5 animate-spin" />
          <span class="font-black uppercase tracking-widest text-sm">{{ isSubmitting ? 'Initializing...' : 'Create My Account' }}</span>
        </button>

        <div class="text-center mt-6">
            <p class="text-sm text-slate-500">
                Already have an account? 
                <router-link to="/login" class="text-primary-600 font-bold hover:text-primary-700 transition-colors">Sign In</router-link>
            </p>
        </div>
      </form>
    </div>
  </div>
</template>
