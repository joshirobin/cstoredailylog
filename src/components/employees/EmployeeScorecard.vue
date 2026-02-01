<script setup lang="ts">
import { computed } from 'vue';
import { Trophy, Clock, Target, ShieldCheck, TrendingUp, AlertCircle } from 'lucide-vue-next';

const props = defineProps<{
    employeeId: string;
    stats: {
        punctuality: number; // 0-100
        taskCompletion: number; // 0-100
        reliability: number; // 0-100
        avgShiftDuration: number;
    }
}>();

const overallScore = computed(() => {
    return Math.round((props.stats.punctuality + props.stats.taskCompletion + props.stats.reliability) / 3);
});

const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-500';
    if (score >= 75) return 'text-primary-500';
    if (score >= 50) return 'text-amber-500';
    return 'text-rose-500';
};

const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-emerald-50 border-emerald-100';
    if (score >= 75) return 'bg-primary-50 border-primary-100';
    if (score >= 50) return 'bg-amber-50 border-amber-100';
    return 'bg-rose-50 border-rose-100';
};
</script>

<template>
    <div :class="['p-8 rounded-[2.5rem] border-2 transition-all duration-500', getScoreBg(overallScore)]">
        <div class="flex items-center justify-between mb-8">
            <div class="flex items-center gap-4">
                <div :class="['w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg', overallScore >= 75 ? 'bg-white' : 'bg-white/50']">
                    <Trophy :class="['w-8 h-8', getScoreColor(overallScore)]" />
                </div>
                <div>
                    <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Performance Index</h4>
                    <div class="flex items-baseline gap-2">
                        <span :class="['text-4xl font-black italic tracking-tighter', getScoreColor(overallScore)]">{{ overallScore }}%</span>
                        <span class="text-xs font-bold text-slate-400">Total Weight</span>
                    </div>
                </div>
            </div>
            <div class="text-right">
                <div class="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border border-emerald-100">
                    <TrendingUp class="w-3 h-3" />
                    +2.4% vs Last Month
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 gap-4">
            <!-- Punctuality -->
            <div class="bg-white/60 backdrop-blur-sm p-5 rounded-2xl border border-white/80 space-y-3">
                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-3">
                        <Clock class="w-4 h-4 text-slate-400" />
                        <span class="text-[10px] font-black text-slate-600 uppercase tracking-widest">Punctuality</span>
                    </div>
                    <span class="text-sm font-black text-slate-900">{{ stats.punctuality }}%</span>
                </div>
                <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                        class="h-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-1000"
                        :style="{ width: stats.punctuality + '%' }"
                    ></div>
                </div>
                <p class="text-[9px] font-medium text-slate-400 italic">Within 5m grace period of scheduled start</p>
            </div>

            <!-- Task Completion -->
            <div class="bg-white/60 backdrop-blur-sm p-5 rounded-2xl border border-white/80 space-y-3">
                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-3">
                        <Target class="w-4 h-4 text-slate-400" />
                        <span class="text-[10px] font-black text-slate-600 uppercase tracking-widest">Task Mastery</span>
                    </div>
                    <span class="text-sm font-black text-slate-900">{{ stats.taskCompletion }}%</span>
                </div>
                <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                        class="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-1000"
                        :style="{ width: stats.taskCompletion + '%' }"
                    ></div>
                </div>
                <p class="text-[9px] font-medium text-slate-400 italic">{{ stats.taskCompletion > 80 ? 'Exceptional operational execution' : 'Standard throughput detected' }}</p>
            </div>

            <!-- Reliability -->
            <div class="bg-white/60 backdrop-blur-sm p-5 rounded-2xl border border-white/80 space-y-3">
                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-3">
                        <ShieldCheck class="w-4 h-4 text-slate-400" />
                        <span class="text-[10px] font-black text-slate-600 uppercase tracking-widest">Reliability</span>
                    </div>
                    <span class="text-sm font-black text-slate-900">{{ stats.reliability }}%</span>
                </div>
                <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                        class="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all duration-1000"
                        :style="{ width: stats.reliability + '%' }"
                    ></div>
                </div>
                <p class="text-[9px] font-medium text-slate-400 italic">Calculated by shift attendance stability</p>
            </div>
        </div>

        <div v-if="overallScore < 60" class="mt-6 p-4 bg-rose-50/50 border border-rose-100 rounded-2xl flex items-center gap-3">
            <AlertCircle class="w-5 h-5 text-rose-500" />
            <p class="text-[10px] font-bold text-rose-600 uppercase tracking-tighter">Performance review recommended</p>
        </div>
    </div>
</template>
