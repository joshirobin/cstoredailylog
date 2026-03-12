<script setup lang="ts">
import { useLiquorStore } from '../../stores/liquor';
import { Wine, AlertTriangle, ShieldCheck, Edit3, Save, CheckCircle2 } from 'lucide-vue-next';
import { ref } from 'vue';

const store = useLiquorStore();
const isEditing = ref(false);

const toggleAudit = () => {
  if (isEditing.value) {
    store.performAudit();
  }
  isEditing.value = !isEditing.value;
};
</script>

<template>
  <div class="space-y-6 pb-20">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
      <div class="flex items-center gap-4">
        <div class="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
          <Wine class="w-7 h-7" />
        </div>
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Liquor & Wine Tracker</h1>
          <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">High-Risk Asset Management</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <button 
          @click="toggleAudit"
          :class="['px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2', isEditing ? 'bg-primary-500 text-white shadow-primary-500/20 hover:scale-105' : 'bg-slate-900 text-white hover:bg-slate-800']"
        >
          <Save v-if="isEditing" class="w-4 h-4" />
          <Edit3 v-else class="w-4 h-4" />
          {{ isEditing ? 'Finalize Audit' : 'Start Count' }}
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
        <div>
          <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Tracked SKUs</p>
          <p class="text-3xl font-black text-slate-900 tracking-tighter mt-1">{{ store.products.length }}</p>
        </div>
        <div class="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center">
          <ShieldCheck class="w-6 h-6" />
        </div>
      </div>
      <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
        <div>
          <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Audit Status</p>
          <p class="text-3xl font-black tracking-tighter mt-1" :class="isEditing ? 'text-amber-500' : 'text-emerald-500'">
             {{ isEditing ? 'IN PROGRESS' : 'VERIFIED' }}
          </p>
        </div>
        <div class="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center">
          <Edit3 v-if="isEditing" class="w-6 h-6" />
          <CheckCircle2 v-else class="w-6 h-6" />
        </div>
      </div>
      <div class="bg-white p-6 rounded-3xl shadow-sm border border-rose-100 flex items-center justify-between relative overflow-hidden group">
        <div class="absolute inset-0 bg-gradient-to-br from-rose-50 to-orange-50 opacity-50 z-0 group-hover:opacity-100 transition-opacity"></div>
        <div class="relative z-10">
          <p class="text-[10px] font-black uppercase tracking-widest text-rose-500">Est. Shrinkage Value</p>
          <p class="text-3xl font-black text-rose-600 tracking-tighter mt-1">${{ store.totalShrinkageValue.toFixed(2) }}</p>
        </div>
        <div class="relative z-10 w-12 h-12 bg-white text-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/10 border border-rose-100/50">
          <AlertTriangle class="w-6 h-6 animate-pulse" />
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50/50">
              <th class="p-4 pl-6 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Product</th>
              <th class="p-4 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Category</th>
              <th class="p-4 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 text-center">Expected</th>
              <th class="p-4 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 text-center">Actual Count</th>
              <th class="p-4 pr-6 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 text-right">Variance</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="product in store.products" :key="product.id" class="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
              <td class="p-4 pl-6">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Wine class="w-4 h-4 text-slate-400" />
                  </div>
                  <div>
                    <p class="text-sm font-black text-slate-900 tracking-tight">{{ product.name }}</p>
                    <p class="text-[10px] font-black tracking-widest text-slate-400">{{ product.bottleSize }}</p>
                  </div>
                </div>
              </td>
              <td class="p-4">
                <span class="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[9px] font-black uppercase tracking-widest">
                  {{ product.category }}
                </span>
              </td>
              <td class="p-4 text-center">
                <span class="text-lg font-black text-slate-300" v-if="isEditing">?</span>
                <span class="text-lg font-black text-slate-900" v-else>{{ product.expectedCount }}</span>
              </td>
              <td class="p-4 text-center">
                <template v-if="isEditing">
                  <input type="number" v-model="product.actualCount" class="w-20 bg-slate-100 border-none rounded-xl text-center font-black tracking-tighter focus:ring-2 focus:ring-primary-500" placeholder="0" />
                </template>
                <template v-else>
                   <span class="text-lg font-black text-slate-900">{{ product.actualCount !== null ? product.actualCount : '-' }}</span>
                </template>
              </td>
              <td class="p-4 pr-6 text-right">
                <template v-if="!isEditing && product.variance !== null">
                  <span 
                    :class="['px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest', product.variance < 0 ? 'bg-rose-100 text-rose-600' : (product.variance > 0 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600')]"
                  >
                    {{ product.variance > 0 ? '+' : '' }}{{ product.variance }}
                  </span>
                </template>
                <span v-else class="text-slate-300">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
