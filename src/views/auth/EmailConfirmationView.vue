<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { CheckCircle2, ArrowRight } from 'lucide-vue-next';

const router = useRouter();

onMounted(() => {
    // Auto-redirect after 5 seconds
    setTimeout(() => {
        router.push('/login');
    }, 5000);
});
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
    <!-- Background Decor -->
    <div class="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse"></div>
    <div class="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary-500/10 rounded-full blur-[120px] animate-pulse" style="animation-delay: 1s"></div>

    <div class="glass-panel p-10 w-full max-w-md relative z-10 mx-4 border-white/40 text-center space-y-8 animate-in zoom-in-95 duration-500">
        
        <div class="flex justify-center">
            <div class="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center shadow-lg shadow-emerald-500/10 animate-scale-in">
                <CheckCircle2 class="w-10 h-10 text-emerald-500" />
            </div>
        </div>

        <div class="space-y-2">
            <h1 class="text-3xl font-black font-display text-slate-900 uppercase italic tracking-tighter">Identity Verified</h1>
            <p class="text-slate-500 font-bold uppercase tracking-widest text-xs">Thank you for confirming your email.</p>
        </div>

        <div class="p-6 bg-slate-50 rounded-2xl border border-slate-100">
            <p class="text-sm font-medium text-slate-600 leading-relaxed">
                Your account is now fully active. You will be redirected to the secure login portal in a few moments.
            </p>
        </div>

        <button 
            @click="router.push('/login')"
            class="w-full py-4 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-2 group"
        >
            Proceed to Login <ArrowRight class="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>

    </div>
  </div>
</template>

<style scoped>
.animate-scale-in {
    animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes scaleIn {
    from { transform: scale(0); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
}
</style>
