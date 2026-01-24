<script setup lang="ts">
import { RouterView } from 'vue-router';
import Sidebar from '../components/Sidebar.vue';
import { Bell, Search } from 'lucide-vue-next';
</script>

<template>
  <div class="flex min-h-screen bg-surface-950 text-white">
    <!-- Sidebar -->
    <Sidebar />

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Top Header -->
      <header class="h-16 border-b border-surface-800 bg-surface-900/50 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-8">
        <div class="flex items-center gap-4 flex-1">
          <!-- Search Bar (Visual Only) -->
          <div class="relative w-full max-w-md hidden md:block">
            <Search class="absolute left-3 top-2.5 w-4 h-4 text-surface-500" />
            <input 
              type="text" 
              placeholder="Search invoices, accounts..." 
              class="w-full bg-surface-800 border-none rounded-full py-2 pl-10 pr-4 text-sm text-white placeholder-surface-500 focus:ring-1 focus:ring-primary-500/50"
            >
          </div>
        </div>

        <div class="flex items-center gap-4">
          <button class="relative p-2 text-surface-400 hover:text-white transition-colors">
            <Bell class="w-5 h-5" />
            <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-surface-900"></span>
          </button>
          <div class="h-8 w-px bg-surface-800"></div>
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-500 to-secondary-500 flex items-center justify-center text-xs font-bold text-white">
              JD
            </div>
            <div class="hidden md:block">
              <div class="text-sm font-medium text-white">John Doe</div>
              <div class="text-xs text-surface-400">Store Manager</div>
            </div>
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <main class="flex-1 p-8 overflow-y-auto w-full">
        <RouterView v-slot="{ Component }">
          <transition 
            enter-active-class="transition-all duration-300 ease-out" 
            enter-from-class="opacity-0 translate-y-2" 
            enter-to-class="opacity-100 translate-y-0" 
            leave-active-class="transition-all duration-200 ease-in" 
            leave-from-class="opacity-100" 
            leave-to-class="opacity-0"
            mode="out-in"
          >
            <component :is="Component" />
          </transition>
        </RouterView>
      </main>
    </div>
  </div>
</template>
