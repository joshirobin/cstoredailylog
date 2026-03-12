<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { useRouter, useRoute } from 'vue-router';
import logoUrl from '../../assets/logo.png';
import { User, Mail, Lock, Loader2, Shield, ChevronRight } from 'lucide-vue-next';

const name = ref('');
const email = ref('');
const password = ref('');
const role = ref('Admin');
const errorMsg = ref('');
const isSubmitting = ref(false);
const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

onMounted(() => {
    if (route.query.email) {
        email.value = route.query.email as string;
    }
    if (route.query.role) {
        // Ensure role is valid
        const validRoles = ['Admin', 'Manager', 'Cashier', 'Assistant Manager', 'Shift Manager', 'Stocker'];
        const queryRole = route.query.role as string;
        if (validRoles.includes(queryRole)) {
             role.value = queryRole;
        }
    }
    if (route.query.name) {
        name.value = route.query.name as string;
    }
});

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
  <div class="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
    <!-- Background Decor -->
    <div class="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary-500/10 rounded-full blur-[120px] animate-pulse"></div>
    <div class="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-secondary-500/10 rounded-full blur-[120px] animate-pulse" style="animation-delay: 1s"></div>

    <div class="glass-panel p-10 w-full max-w-lg relative z-10 mx-4 border-white/40 shadow-2xl">
      <div class="text-center mb-10">
        <div class="flex items-center justify-center mb-6">
          <img :src="logoUrl" alt="CStoreSync Logo" class="w-9 h-auto object-contain transition-transform duration-500 hover:scale-105" />
        </div>
        <h1 class="text-3xl font-display font-black text-slate-900 mb-3 tracking-tight italic uppercase">
            <span class="dynamic-highlight">Join</span> Ecosystem
        </h1>
        <p class="text-slate-500 text-sm font-bold tracking-widest uppercase opacity-70">Register your organization</p>
      </div>

      <form @submit.prevent="handleRegister" class="space-y-6">
        <div v-if="errorMsg" class="bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold p-4 rounded-xl text-center animate-bounce">
          {{ errorMsg }}
        </div>

        <!-- Name Field -->
        <div class="space-y-2">
          <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Full Name</label>
          <div class="relative group">
            <User class="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-primary-600 transition-colors" />
            <input 
              v-model="name" 
              type="text" 
              required 
              class="input-field w-full pl-12" 
              placeholder="John Doe"
            />
          </div>
        </div>

        <!-- Role Selection -->
        <div class="space-y-2">
          <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Your Role / Position</label>
          <div class="relative group">
            <Shield class="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-primary-600 transition-colors" />
            <select 
              v-model="role" 
              required 
              class="w-full pl-12 pr-10 py-3.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-primary-500/5 focus:border-primary-500 transition-all duration-300 appearance-none cursor-pointer"
            >
              <option value="Admin">Admin (Owner/Super User)</option>
              <option value="Manager">Manager</option>
              <option value="Cashier">Cashier / Staff</option>
            </select>
            <ChevronRight class="absolute right-4 top-4 w-4 h-4 text-slate-400 pointer-events-none rotate-90" />
          </div>
          <p class="text-[9px] font-black text-secondary-600 px-2 mt-1 uppercase leading-tight italic opacity-80">
            {{ role === 'Admin' ? 'Super Admin: Full controls over employees, inventory & financial data.' : role === 'Manager' ? 'Ops Manager: Access to all day-to-day operations & reports.' : 'Staff: Access to terminal, checklists & task boards.' }}
          </p>
        </div>

        <!-- Email Field -->
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

        <!-- Password Field -->
        <div class="space-y-2">
          <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Secure Password</label>
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
          class="btn-primary w-full py-4 text-sm font-black tracking-[0.2em] uppercase mt-4"
        >
          <Loader2 v-if="isSubmitting" class="w-5 h-5 animate-spin" />
          <span>{{ isSubmitting ? 'Creating Secure Account...' : 'Register as Organization' }}</span>
        </button>

        <div class="text-center mt-8">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Already part of the system? 
                <router-link to="/login" class="text-primary-600 font-black hover:text-primary-700 transition-colors ml-1 underline">Log In Instead</router-link>
            </p>
        </div>
      </form>
    </div>
  </div>
</template>
