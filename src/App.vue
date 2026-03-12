<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useInactivity } from './composables/useInactivity';

// Initialize inactivity tracker (15 minutes default)
useInactivity();
</script>

<template>
  <RouterView />
</template>
