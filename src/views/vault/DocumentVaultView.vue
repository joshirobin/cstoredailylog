<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useVaultStore, type VaultDocument } from '../../stores/vault';
import { 
  Shield, Search, Plus, 
  FileWarning, Trash2, 
  ExternalLink, Calendar,
  Lock, HardDrive, Cpu, 
  FileBox, FileDigit,
  CheckCircle2
} from 'lucide-vue-next';

import { storage } from '../../firebaseConfig';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

const vaultStore = useVaultStore();
const searchQuery = ref('');
const selectedCategory = ref('ALL');
const showUploadModal = ref(false);
const isUploading = ref(false);

onMounted(() => {
    vaultStore.fetchDocuments();
});

const categories = ['ALL', 'TRAINING', 'COMPLIANCE', 'FINANCIAL', 'LEGAL', 'MISC'];

const filteredDocs = computed(() => {
    return vaultStore.documents.filter(doc => {
        const matchesSearch = doc.title.toLowerCase().includes(searchQuery.value.toLowerCase());
        const matchesCategory = selectedCategory.value === 'ALL' || doc.category === selectedCategory.value;
        return matchesSearch && matchesCategory;
    });
});

const newDoc = ref({
    title: '',
    category: 'MISC' as VaultDocument['category'],
    expiryDate: '',
    notes: ''
});

const selectedFile = ref<File | null>(null);

const handleFileUpload = (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
        selectedFile.value = target.files[0];
    }
};

const uploadDocument = async () => {
    if (!selectedFile.value) return;
    
    isUploading.value = true;
    try {
        const file = selectedFile.value;
        const fileRef = storageRef(storage, `vault/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        
        await vaultStore.addDocument({
            ...newDoc.value,
            url,
            fileName: file.name,
            fileType: file.type
        });
        
        showUploadModal.value = false;
        selectedFile.value = null;
        newDoc.value = { title: '', category: 'MISC', expiryDate: '', notes: '' };
    } catch (e) {
        console.error(e);
    } finally {
        isUploading.value = false;
    }
};

const getCategoryStyles = (cat: string) => {
    const map: Record<string, { bg: string, text: string, icon: any }> = {
        'TRAINING': { bg: 'bg-emerald-50 text-emerald-700', text: 'text-emerald-500', icon: Cpu },
        'COMPLIANCE': { bg: 'bg-primary-50 text-primary-700', text: 'text-primary-500', icon: Shield },
        'FINANCIAL': { bg: 'bg-amber-50 text-amber-700', text: 'text-amber-500', icon: FileDigit },
        'LEGAL': { bg: 'bg-rose-50 text-rose-700', text: 'text-rose-500', icon: Lock },
        'MISC': { bg: 'bg-slate-50 text-slate-700', text: 'text-slate-500', icon: FileBox },
    };
    return map[cat] || map['MISC'];
};
</script>

<template>
  <div class="space-y-10 animate-in fade-in duration-1000">
    <!-- Secure Header -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative overflow-hidden p-2">
      <div class="space-y-4">
        <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-2xl ring-4 ring-slate-100">
                <Shield class="w-6 h-6" />
            </div>
            <div>
                <h2 class="text-4xl font-black text-slate-900 italic tracking-tighter uppercase">Document Vault</h2>
                <div class="flex items-center gap-2 mt-1">
                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">End-to-End Encrypted Storage</p>
                </div>
            </div>
        </div>
        <p class="text-slate-500 font-medium max-w-xl">Centralized repository for compliance records, safety certifications, and operational financials.</p>
      </div>

      <div class="flex gap-4">
        <button 
          @click="showUploadModal = true"
          class="px-8 py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-2xl shadow-slate-900/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-4 group"
        >
          <Plus class="w-5 h-5 group-hover:rotate-90 transition-transform" />
          Ingest Document
        </button>
      </div>
    </div>

    <!-- Alert Banner for Expiring Docs -->
    <div v-if="vaultStore.expiringSoon.length > 0" class="bg-rose-50 border-2 border-rose-100 p-8 rounded-[3rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-rose-200/20">
        <div class="flex items-center gap-6">
            <div class="w-16 h-16 bg-white rounded-[1.5rem] flex items-center justify-center text-rose-500 shadow-lg">
                <FileWarning class="w-8 h-8" />
            </div>
            <div>
                <h3 class="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">{{ vaultStore.expiringSoon.length }} Critical Expirations</h3>
                <p class="text-[10px] font-black text-rose-600 uppercase tracking-widest">Compliance documents requiring immediate renewal</p>
            </div>
        </div>
        <div class="flex gap-2">
            <div v-for="doc in vaultStore.expiringSoon.slice(0, 3)" :key="doc.id" class="px-4 py-2 bg-white rounded-xl text-[10px] font-black text-slate-600 border border-rose-100">
                {{ doc.title }}
            </div>
        </div>
    </div>

    <!-- Vault Content Grid -->
    <div class="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <!-- Sidebar filters -->
        <div class="space-y-6">
            <div class="bg-white p-8 rounded-[3rem] border-2 border-slate-50 shadow-sm space-y-8">
                <div class="space-y-4">
                    <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Quick Navigation</h4>
                    <div class="space-y-2">
                        <button 
                            v-for="cat in categories" 
                            :key="cat"
                            @click="selectedCategory = cat"
                            :class="['w-full px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-left transition-all flex items-center justify-between group', selectedCategory === cat ? 'bg-slate-900 text-white shadow-xl' : 'hover:bg-slate-50 text-slate-500']"
                        >
                            <div class="flex items-center gap-3">
                                <component :is="getCategoryStyles(cat)?.icon" class="w-4 h-4" :class="selectedCategory === cat ? 'text-white' : getCategoryStyles(cat)?.text" />
                                {{ cat }}
                            </div>
                            <span v-if="selectedCategory === cat" class="w-2 h-2 rounded-full bg-primary-500"></span>
                        </button>

                    </div>
                </div>

                <div class="pt-8 border-t border-slate-50 space-y-4">
                    <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Vault Integrity</h4>
                    <div class="flex items-center gap-4 p-4 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100">
                        <Shield class="w-5 h-5" />
                        <span class="text-[10px] font-black uppercase tracking-tighter">RSA-2048 Synchronized</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Main Document Area -->
        <div class="xl:col-span-3 space-y-6">
            <div class="relative">
                <Search class="absolute left-8 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300" />
                <input 
                    v-model="searchQuery"
                    type="text" 
                    placeholder="Search document archives..." 
                    class="w-full bg-white border-4 border-slate-50 rounded-[2.5rem] pl-20 pr-10 py-8 text-xl font-black italic tracking-tighter placeholder-slate-200 focus:border-primary-100 transition-all outline-none shadow-xl shadow-slate-200/20"
                />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div v-if="vaultStore.loading" class="col-span-full py-20 text-center">
                    <div class="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                </div>
                
                <div v-else-if="filteredDocs.length === 0" class="col-span-full py-40 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                    <HardDrive class="w-16 h-16 text-slate-100 mx-auto mb-6" />
                    <p class="text-slate-300 font-bold uppercase tracking-widest">No documents found in selected frame</p>
                </div>

                <div 
                    v-for="doc in filteredDocs" 
                    :key="doc.id"
                    class="bg-white p-8 rounded-[2.5rem] border-2 border-slate-50 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group relative overflow-hidden"
                >
                    <div v-if="doc.category && getCategoryStyles(doc.category)" class="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                        <component :is="getCategoryStyles(doc.category)?.icon" class="w-32 h-32" />
                    </div>



                    <div class="flex justify-between items-start mb-6">
                        <div v-if="doc.category && getCategoryStyles(doc.category)" :class="['p-4 rounded-2xl', getCategoryStyles(doc.category)?.bg]">
                            <component :is="getCategoryStyles(doc.category)?.icon" class="w-6 h-6" />
                        </div>


                        <div class="flex gap-1">
                            <a :href="doc.url" target="_blank" class="p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:text-primary-600 transition-all">
                                <ExternalLink class="w-4 h-4" />
                            </a>
                            <button @click="vaultStore.deleteDocument(doc.id)" class="p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:text-rose-600 transition-all">
                                <Trash2 class="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div class="space-y-4 relative z-10">
                        <div>
                            <p class="text-[9px] font-black text-primary-500 uppercase tracking-widest mb-1">{{ doc.category }}</p>
                            <h3 class="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-tight">{{ doc.title }}</h3>
                        </div>
                        
                        <div class="flex items-center gap-3 py-3 border-y border-slate-50">
                            <div class="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                                <Calendar class="w-4 h-4" />
                            </div>
                            <div>
                                <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Uploaded On</p>
                                <p :class="['text-[10px] font-bold text-slate-700']">{{ doc.uploadDate && typeof doc.uploadDate.toDate === 'function' ? new Date(doc.uploadDate.toDate()).toLocaleDateString() : 'Pending' }}</p>


                            </div>
                        </div>

                        <div v-if="doc.expiryDate" :class="['p-3 rounded-2xl flex items-center gap-3', vaultStore.expiringSoon.some(d => d.id === doc.id) ? 'bg-rose-50 border border-rose-100' : 'bg-slate-50']">
                            <div :class="['w-8 h-8 rounded-lg flex items-center justify-center', vaultStore.expiringSoon.some(d => d.id === doc.id) ? 'bg-white text-rose-500 shadow-sm' : 'bg-white text-slate-400']">
                                <Lock class="w-3.5 h-3.5" />
                            </div>
                            <div>
                                <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Expires In</p>
                                <p :class="['text-[10px] font-black uppercase', vaultStore.expiringSoon.some(d => d.id === doc.id) ? 'text-rose-600' : 'text-slate-900']">{{ doc.expiryDate }}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Upload Modal -->
    <div v-if="showUploadModal" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" @click="showUploadModal = false"></div>
        <div class="bg-white rounded-[4rem] w-full max-w-2xl relative z-10 overflow-hidden animate-in zoom-in duration-500 shadow-2xl">
            <div class="p-12 pb-0 flex justify-between items-start">
                <div>
                    <h3 class="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">Document Ingestion</h3>
                    <p class="text-[10px] font-black text-primary-600 uppercase tracking-widest mt-2 flex items-center gap-2">
                        <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
                        Secure Channel Active
                    </p>
                </div>
                <button @click="showUploadModal = false" class="text-slate-200 hover:text-slate-900 transition-colors">
                    <Plus class="w-10 h-10 rotate-45" />
                </button>
            </div>
            
            <form @submit.prevent="uploadDocument" class="p-12 space-y-10">
                <div class="space-y-6">
                    <div class="space-y-2">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Document Title</label>
                        <input v-model="newDoc.title" type="text" required class="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-5 text-lg font-bold placeholder-slate-200 focus:bg-white focus:border-primary-500 transition-all outline-none" placeholder="e.g. 2024 Health Permit" />
                    </div>
                    
                    <div class="grid grid-cols-2 gap-6">
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                            <select v-model="newDoc.category" required class="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-5 text-[10px] font-black uppercase tracking-widest focus:bg-white focus:border-primary-500 transition-all outline-none">
                                <option v-for="cat in categories.filter(c => c !== 'ALL')" :key="cat" :value="cat">{{ cat }}</option>
                            </select>
                        </div>
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Expiry Date (Optional)</label>
                            <input v-model="newDoc.expiryDate" type="date" class="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-5 text-sm font-bold focus:bg-white focus:border-primary-500 transition-all outline-none" />
                        </div>
                    </div>

                    <div class="space-y-2">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Secure Media Select</label>
                        <label class="block w-full cursor-pointer group">
                            <div class="w-full bg-primary-50/30 border-4 border-dashed border-primary-100 rounded-[2.5rem] p-12 text-center group-hover:bg-primary-50 group-hover:border-primary-200 transition-all">
                                <div v-if="!selectedFile" class="space-y-4">
                                    <div class="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-primary-500/10 group-hover:scale-110 transition-transform">
                                        <FileDigit class="w-10 h-10 text-primary-500" />
                                    </div>
                                    <div>
                                        <p class="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Choose File</p>
                                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">PDF, JPG, PNG preferred</p>
                                    </div>
                                </div>
                                <div v-if="selectedFile" class="flex items-center justify-center gap-6">
                                    <div class="w-16 h-16 bg-emerald-500 text-white rounded-2xl flex items-center justify-center">
                                        <CheckCircle2 class="w-8 h-8" />
                                    </div>
                                    <div class="text-left">
                                        <p class="text-lg font-black text-emerald-600 truncate max-w-[200px]">{{ selectedFile.name }}</p>
                                        <p class="text-[10px] font-black text-slate-400">{{ (selectedFile.size / 1024 / 1024).toFixed(2) }} MB ready</p>
                                    </div>
                                </div>

                            </div>
                            <input type="file" @change="handleFileUpload" class="hidden" />
                        </label>
                    </div>
                </div>

                <button 
                  type="submit" 
                  :disabled="isUploading || !selectedFile"
                  class="w-full py-8 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xl italic tracking-tighter shadow-2xl shadow-slate-900/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-6"
                >
                    <template v-if="isUploading">
                        <div class="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                        Encrypting & Storing...
                    </template>
                    <template v-else>
                        <Lock class="w-6 h-6" />
                        Commit to Vault
                    </template>
                </button>
            </form>
        </div>
    </div>
  </div>
</template>
