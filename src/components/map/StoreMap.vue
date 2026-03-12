<script setup lang="ts">
import { useRouter } from 'vue-router';
import { 
    Thermometer, 
    Fuel, 
    Coffee, 
    ShoppingCart, 
    Users
} from 'lucide-vue-next';

const router = useRouter();

// Props to drive the map state
// In a real implementation, these would come from a store or props
const props = defineProps<{
    zones?: {
        id: string;
        name: string;
        status: 'OK' | 'WARNING' | 'CRITICAL';
        metric?: string;
    }[]
}>();

// Internal state of zones (could be merged with props)
const mapZones = [
    { id: 'fuel_pumps', name: 'Fuel Island', icon: Fuel, x: 50, y: 350, width: 200, height: 100, route: '/fuel' },
    { id: 'coolers', name: 'Cooler Vault', icon: Thermometer, x: 300, y: 50, width: 400, height: 80, route: '/tasks' },
    { id: 'coffee', name: 'Coffee Station', icon: Coffee, x: 50, y: 50, width: 150, height: 120, route: '/tasks' },
    { id: 'register', name: 'Point of Sale', icon: ShoppingCart, x: 500, y: 300, width: 180, height: 100, route: '/shifts' },
    { id: 'restrooms', name: 'Restrooms', icon: Users, x: 750, y: 50, width: 100, height: 100, route: '/tasks' },
];

const getZoneStatus = (zoneId: string) => {
    // Default mock logic if no props provided
    if (zoneId === 'coolers') return 'WARNING'; // E.g. temp slightly high
    if (zoneId === 'fuel_pumps') return 'OK';
    if (zoneId === 'register') return 'CRITICAL'; // E.g. cash variance
    return 'OK';
};

const getZoneColor = (status: string) => {
    switch (status) {
        case 'OK': return 'fill-emerald-100/50 stroke-emerald-500 text-emerald-600';
        case 'WARNING': return 'fill-amber-100/50 stroke-amber-500 text-amber-600';
        case 'CRITICAL': return 'fill-rose-100/50 stroke-rose-500 text-rose-600 animate-pulse';
        default: return 'fill-slate-100 stroke-slate-300 text-slate-500';
    }
};

const navigateToZone = (route: string) => {
    router.push(route);
};
</script>

<template>
  <div class="w-full aspect-video bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden relative group">
    <!-- Map Canvas (SVG) -->
    <svg viewBox="0 0 900 500" class="w-full h-full bg-slate-50">
        <!-- Floor Grid Pattern -->
        <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" stroke-width="1"/>
            </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        <!-- Entrance -->
        <path d="M 400 500 L 500 500" stroke="#94a3b8" stroke-width="8" />
        <text x="450" y="490" text-anchor="middle" class="text-[10px] uppercase font-bold fill-slate-400 tracking-widest">Entrance</text>

        <!-- Dynamic Zones -->
        <g 
            v-for="zone in mapZones" 
            :key="zone.id"
            @click="navigateToZone(zone.route)"
            class="cursor-pointer transition-all duration-300 hover:opacity-80"
        >
            <!-- Zone Area -->
            <rect 
                :x="zone.x" 
                :y="zone.y" 
                :width="zone.width" 
                :height="zone.height" 
                rx="12"
                stroke-width="2"
                stroke-dasharray="4 4"
                :class="getZoneColor(getZoneStatus(zone.id))"
                class="transition-all duration-500"
            />

            <!-- Icon Container -->
            <circle 
                :cx="zone.x + zone.width/2" 
                :cy="zone.y + zone.height/2 - 10" 
                r="20" 
                fill="white" 
                filter="url(#shadow)"
            />
            
            <!-- Icon Implementation using ForeignObject for Vue Lucide Icons -->
            <foreignObject :x="zone.x + zone.width/2 - 12" :y="zone.y + zone.height/2 - 22" width="24" height="24">
                <component 
                    :is="zone.icon" 
                    class="w-6 h-6"
                    :class="getZoneStatus(zone.id) === 'CRITICAL' ? 'text-rose-500' : getZoneStatus(zone.id) === 'WARNING' ? 'text-amber-500' : 'text-slate-400'"
                />
            </foreignObject>

            <!-- Label -->
            <text 
                :x="zone.x + zone.width/2" 
                :y="zone.y + zone.height/2 + 25" 
                text-anchor="middle" 
                class="text-xs font-black uppercase tracking-wider fill-slate-600 pointer-events-none"
            >
                {{ zone.name }}
            </text>

            <!-- Status Badge (Only if attention needed) -->
            <g v-if="getZoneStatus(zone.id) !== 'OK'" class="animate-bounce">
                <circle :cx="zone.x + zone.width - 15" :cy="zone.y + 15" r="10" :class="getZoneStatus(zone.id) === 'CRITICAL' ? 'fill-rose-500' : 'fill-amber-500'" />
                <text :x="zone.x + zone.width - 15" :y="zone.y + 19" text-anchor="middle" class="fill-white font-bold text-xs">!</text>
            </g>
        </g>
    </svg>

    <!-- Legend / Overlay -->
    <div class="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-sm border border-slate-100 flex gap-4 text-xs font-bold text-slate-500">
        <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            All Good
        </div>
        <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            Attention
        </div>
        <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            Critical
        </div>
    </div>
  </div>
</template>

<style scoped>
/* Optional SVG Filters if needed, though Tailwind handles most */
</style>
