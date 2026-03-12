<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useAuditStore } from '../../stores/audits';
import type { ShiftAudit, AuditPhoto } from '../../stores/audits';
import { useAuthStore } from '../../stores/auth';
import { 
  Camera, CheckCircle2, Clock, 
  ChevronRight, 
  ShieldCheck, Star, Trash2
} from 'lucide-vue-next';

const auditStore = useAuditStore();
const authStore = useAuthStore();

const fileInput = ref<HTMLInputElement | null>(null);
const activeCategoryId = ref<string | null>(null);
const isUploading = ref(false);

const selectedShiftFilter = ref<'All' | 'Morning' | 'Afternoon' | 'Night'>('All');

const filteredAudits = computed(() => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    return auditStore.shiftAudits.filter(a => {
        const isRecent = a.createdAt >= twentyFourHoursAgo;
        if (selectedShiftFilter.value === 'All') return isRecent;
        return isRecent && a.shift === selectedShiftFilter.value;
    });
});

const selectedAuditForReview = ref<ShiftAudit | null>(null);

const resetAuditForm = () => {
    currentAudit.value = {
        shift: 'Morning',
        status: 'In Progress',
        photos: [
            { id: '1', category: 'Coffee Bar', imageUrl: '', status: 'Pending', timestamp: null },
            { id: '2', category: 'Restroom', imageUrl: '', status: 'Pending', timestamp: null },
            { id: '3', category: 'Pump Area', imageUrl: '', status: 'Pending', timestamp: null },
            { id: '4', category: 'Cooler', imageUrl: '', status: 'Pending', timestamp: null },
            { id: '5', category: 'Counter', imageUrl: '', status: 'Pending', timestamp: null },
        ]
    };
};

const currentAudit = ref<Partial<ShiftAudit>>({});
resetAuditForm();

onMounted(() => {
    auditStore.fetchAudits();
});

const triggerFileInput = (categoryId: string) => {
    activeCategoryId.value = categoryId;
    fileInput.value?.click();
};

const onFileSelected = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (!target.files?.length || !activeCategoryId.value) return;

    const file = target.files[0];
    if (!file) return;
    
    const photo = currentAudit.value.photos?.find((p: AuditPhoto) => p.id === activeCategoryId.value);
    
    if (photo) {
        try {
            isUploading.value = true;
            const url = await auditStore.uploadAuditImage(file, photo.category);
            photo.imageUrl = url;
            photo.timestamp = new Date().toISOString();
            photo.status = 'Accepted';
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Fails to upload image. Please check your connection.');
        } finally {
            isUploading.value = false;
        }
    }
    
    // Reset
    target.value = '';
    activeCategoryId.value = null;
};

const submitAudit = async () => {
    if (currentAudit.value.photos?.some((p: AuditPhoto) => !p.imageUrl)) {
        alert("Please capture all required photos for the audit.");
        return;
    }
    
    const auditData = {
        shift: (currentAudit.value.shift || 'Morning') as 'Morning' | 'Afternoon' | 'Night',
        auditorEmail: authStore.user?.email || 'demo@cstoredaily.com',
        photos: (currentAudit.value.photos || []) as AuditPhoto[],
        status: 'Submitted' as const,
        date: new Date().toISOString().split('T')[0] as string
    };
    
    await auditStore.createAudit(auditData);
    
    alert("Perfect Store Audit Submitted Successfully!");
    resetAuditForm();
};

const selectAuditForReview = (audit: ShiftAudit) => {
    selectedAuditForReview.value = audit;
    // Scroll to review section
    setTimeout(() => {
        document.getElementById('review-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
};

const approveAudit = async (id: string) => {
    const verifier = authStore.user?.email || 'manager@cstoredaily.com';
    await auditStore.verifyAudit(id, verifier);
    selectedAuditForReview.value = null;
    alert("Audit Verified and Approved.");
};

const removeAudit = async (id: string) => {
    if (authStore.userRole !== 'Admin') {
        alert("Action Denied: Only Admins can delete audit records.");
        return;
    }
    if (!confirm("Are you sure you want to permanently delete this audit record?")) return;
    await auditStore.deleteAudit(id);
    selectedAuditForReview.value = null;
    alert("Audit record removed from database.");
};

const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-8 pb-32">
    <!-- Hidden File Input for Image Capture -->
    <input 
        type="file" 
        ref="fileInput" 
        class="hidden" 
        accept="image/*" 
        capture="environment"
        @change="onFileSelected"
    >

    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
            <div class="flex items-center gap-3 mb-2">
                <Camera class="w-5 h-5 text-rose-500 animate-pulse" />
                <span class="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Visual Standards</span>
            </div>
            <h1 class="text-5xl font-[1000] text-slate-900 uppercase italic tracking-tighter leading-none">
                Perfect <span class="text-rose-600">Store</span> Audit
            </h1>
            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Visual Baselines • Zero-Friction Compliance</p>
        </div>

        <div class="flex items-center gap-4">
            <select v-model="currentAudit.shift" class="bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm text-sm font-black uppercase tracking-widest outline-none focus:ring-2 ring-rose-500 transition-all">
                <option>Morning</option>
                <option>Afternoon</option>
                <option>Night</option>
            </select>
            <button @click="submitAudit" class="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-900/20">
                Submit Perfect Audit
            </button>
        </div>
    </div>

    <!-- Active Audit Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div v-for="photo in currentAudit.photos" :key="photo.id" 
             @click="triggerFileInput(photo.id)"
             class="group relative aspect-square bg-slate-50 rounded-[2.5rem] border-4 border-dashed border-slate-200 overflow-hidden cursor-pointer hover:border-rose-300 hover:bg-rose-50/30 transition-all active:scale-95">
            
            <!-- Uploading Spinner -->
            <div v-if="isUploading && activeCategoryId === photo.id" class="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
                <div class="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                <p class="text-[8px] font-black text-rose-500 uppercase tracking-widest">Optimizing...</p>
            </div>
            <div v-if="photo.imageUrl" class="absolute inset-0">
                <img :src="photo.imageUrl" class="w-full h-full object-cover" alt="Audit Photo" />
                <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div class="absolute bottom-6 left-6 right-6">
                    <p class="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1">{{ photo.category }}</p>
                    <div class="flex items-center gap-2">
                        <CheckCircle2 class="w-4 h-4 text-emerald-400" />
                        <span class="text-xs font-bold text-white uppercase tracking-tighter">Captured</span>
                    </div>
                </div>
            </div>

            <div v-else class="absolute inset-0 flex flex-col items-center justify-center text-slate-300 group-hover:text-rose-400 transition-colors">
                <Camera class="w-12 h-12 mb-4 group-hover:scale-110 transition-transform" />
                <p class="text-[10px] font-black uppercase tracking-widest px-4 text-center">{{ photo.category }}</p>
                <p class="text-[8px] font-bold text-slate-400 uppercase mt-2">Tap to Capture</p>
            </div>
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 mt-12">
        <div class="lg:col-span-8 space-y-6">
            <div class="flex items-center justify-between">
                <h3 class="text-xs font-black text-slate-900 uppercase tracking-[0.3em] flex items-center gap-3">
                    <Clock class="w-4 h-4 text-rose-500" /> Audit Integrity Timeline
                </h3>
                
                <div class="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                    <button 
                        v-for="shift in ['All', 'Morning', 'Afternoon', 'Night']" 
                        :key="shift"
                        @click="selectedShiftFilter = shift as any"
                        :class="['px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all', 
                                 selectedShiftFilter === shift ? 'bg-white shadow-sm text-rose-600' : 'text-slate-400 hover:text-slate-600']"
                    >
                        {{ shift }}
                    </button>
                </div>
            </div>
            
            <div class="space-y-4">
                <div v-for="audit in filteredAudits" :key="audit.id" 
                     @click="selectAuditForReview(audit)"
                     class="bg-white p-6 rounded-[2rem] border border-slate-50 shadow-sm hover:shadow-lg transition-all flex items-center gap-6 group cursor-pointer">
                    <div class="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-rose-500 italic text-xl">
                        {{ audit.shift[0] }}
                    </div>
                    <div class="flex-1">
                        <div class="flex items-center gap-3 mb-1">
                            <h4 class="text-lg font-black text-slate-900 uppercase italic tracking-tighter leading-none">{{ audit.shift }} Audit</h4>
                            <span :class="['text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md', audit.status === 'Verified' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600']">
                                {{ audit.status }}
                            </span>
                        </div>
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Auditor: {{ audit.auditorEmail?.split('@')[0] || 'Unknown' }} • {{ formatDate(audit.createdAt) }}
                        </p>
                    </div>
                    <div class="flex gap-1">
                        <div v-for="(p, i) in audit.photos.slice(0, 3)" :key="i" class="w-8 h-8 rounded-lg overflow-hidden border-2 border-white shadow-sm -ml-2 first:ml-0">
                            <img :src="p.imageUrl" class="w-full h-full object-cover" />
                        </div>
                        <div v-if="audit.photos.length > 3" class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 -ml-2 border-2 border-white">
                            +{{ audit.photos.length - 3 }}
                        </div>
                    </div>
                    <button class="p-4 bg-slate-50 rounded-2xl text-slate-400 group-hover:bg-rose-50 group-hover:text-rose-500 transition-all">
                        <ChevronRight class="w-5 h-5" />
                    </button>
                </div>
            </div>

            <!-- Review / Detail Section -->
            <div v-if="selectedAuditForReview" id="review-section" class="mt-12 bg-white p-10 rounded-[3rem] border-4 border-slate-900 shadow-2xl space-y-8 animate-in slide-in-from-bottom duration-500">
                <div class="flex items-center justify-between">
                    <div>
                        <span class="text-[10px] font-black text-rose-500 uppercase tracking-[0.4em]">Audit Verification</span>
                        <h2 class="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Review: {{ selectedAuditForReview.shift }} Audit</h2>
                        <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{ formatDate(selectedAuditForReview.createdAt) }} • Auditor: {{ selectedAuditForReview.auditorEmail }}</p>
                    </div>
                    <button @click="selectedAuditForReview = null" class="text-slate-400 hover:text-slate-900 transition-colors uppercase text-[10px] font-black tracking-widest">Close Review</button>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div v-for="photo in selectedAuditForReview.photos" :key="photo.id" class="space-y-2">
                        <div class="aspect-square rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                            <img :src="photo.imageUrl" class="w-full h-full object-cover" />
                        </div>
                        <p class="text-[9px] font-black text-center uppercase tracking-widest text-slate-600">{{ photo.category }}</p>
                    </div>
                </div>

                <div class="flex items-center justify-end gap-4 pt-6 border-t border-slate-50">
                    <button v-if="authStore.userRole === 'Admin'"
                            @click="removeAudit(selectedAuditForReview.id)"
                            class="bg-slate-100 text-slate-400 px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-50 hover:text-rose-600 transition-all flex items-center gap-2">
                        <Trash2 class="w-4 h-4" /> Delete Record
                    </button>

                    <button v-if="selectedAuditForReview.status !== 'Verified'" 
                            @click="approveAudit(selectedAuditForReview.id)" 
                            class="bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-2">
                        <CheckCircle2 class="w-4 h-4" /> Approve & Verify Store Quality
                    </button>
                    <span v-else class="text-emerald-500 font-black uppercase text-xs tracking-widest flex items-center gap-2">
                        <ShieldCheck class="w-4 h-4" /> This audit has been verified
                    </span>
                </div>
            </div>
        </div>

        <div class="lg:col-span-4 space-y-6">
            <div class="bg-gradient-to-br from-rose-600 to-rose-700 rounded-[3rem] p-8 text-white shadow-xl shadow-rose-200">
                <div class="flex items-center gap-4 mb-8">
                    <div class="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                        <ShieldCheck class="w-6 h-6" />
                    </div>
                    <h3 class="text-xl font-black uppercase italic tracking-tighter">Integrity Check</h3>
                </div>
                
                <div class="space-y-6">
                    <div class="flex items-center justify-between border-b border-white/10 pb-4">
                        <p class="text-xs font-bold text-rose-100 uppercase tracking-widest">Today's Compliance</p>
                        <p class="text-2xl font-black">100%</p>
                    </div>
                    <div class="flex items-center justify-between border-b border-white/10 pb-4">
                        <p class="text-xs font-bold text-rose-100 uppercase tracking-widest">Store Karma</p>
                        <p class="text-2xl font-black text-emerald-300">+250</p>
                    </div>
                </div>

                <div class="mt-10 bg-white/10 backdrop-blur-md p-6 rounded-[2rem] border border-white/20">
                    <div class="flex items-center gap-3 mb-3">
                        <Star class="w-4 h-4 text-amber-300 fill-amber-300" />
                        <span class="text-[10px] font-black uppercase tracking-widest text-rose-100">AI Quality Score</span>
                    </div>
                    <p class="text-3xl font-black tracking-tighter italic leading-none mb-2">9.8<span class="text-sm not-italic opacity-60">/10</span></p>
                    <p class="text-[9px] font-bold text-rose-100/60 leading-relaxed uppercase tracking-wider">Visual audit consistency is currently at a 30-day high.</p>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>
