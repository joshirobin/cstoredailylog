<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { X, Save, Eraser } from 'lucide-vue-next';

const props = defineProps<{
  onSave: (data: string) => void;
  onCancel: () => void;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const isDrawing = ref(false);
const ctx = ref<CanvasRenderingContext2D | null>(null);

const initializeCanvas = () => {
  if (!canvasRef.value) return;
  const canvas = canvasRef.value;
  ctx.value = canvas.getContext('2d');
  
  // Set display size
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;

  if (ctx.value) {
    ctx.value.strokeStyle = '#000';
    ctx.value.lineWidth = 3;
    ctx.value.lineCap = 'round';
    ctx.value.lineJoin = 'round';
  }
};

const startDrawing = (e: MouseEvent | TouchEvent) => {
  isDrawing.value = true;
  draw(e);
};

const stopDrawing = () => {
  isDrawing.value = false;
  if (ctx.value) ctx.value.beginPath();
};

const draw = (e: MouseEvent | TouchEvent) => {
  if (!isDrawing.value || !ctx.value || !canvasRef.value) return;

  const rect = canvasRef.value.getBoundingClientRect();
  let x: number, y: number;

  if (e instanceof MouseEvent) {
    x = e.clientX - rect.left;
    y = e.clientY - rect.top;
  } else if (e.touches && e.touches[0]) {
    x = e.touches[0].clientX - rect.left;
    y = e.touches[0].clientY - rect.top;
  } else {
    return;
  }

  ctx.value.lineTo(x, y);
  ctx.value.stroke();
  ctx.value.beginPath();
  ctx.value.moveTo(x, y);
};

const clear = () => {
  if (!ctx.value || !canvasRef.value) return;
  ctx.value.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);
};

const handleSave = () => {
  if (!canvasRef.value) return;
  // Check if canvas is empty (optional but good)
  const dataUrl = canvasRef.value.toDataURL();
  props.onSave(dataUrl);
};

onMounted(() => {
  initializeCanvas();
  window.addEventListener('resize', initializeCanvas);
});

onUnmounted(() => {
  window.removeEventListener('resize', initializeCanvas);
});
</script>

<template>
  <div class="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in">
    <div class="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in duration-300">
      <div class="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
        <div>
          <h3 class="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Sign Verification</h3>
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verify completion of shift tasks</p>
        </div>
        <button @click="onCancel" class="p-2 hover:bg-white rounded-lg text-slate-400 transition-all">
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="p-8 space-y-6">
        <div class="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 relative overflow-hidden h-64 cursor-crosshair">
          <canvas
            ref="canvasRef"
            class="w-full h-full touch-none"
            @mousedown="startDrawing"
            @mousemove="draw"
            @mouseup="stopDrawing"
            @mouseleave="stopDrawing"
            @touchstart.prevent="startDrawing"
            @touchmove.prevent="draw"
            @touchend.prevent="stopDrawing"
          ></canvas>
          <div v-if="!isDrawing" class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <p class="text-slate-400 font-black uppercase text-xs tracking-[0.3em]">Sign within the lines</p>
          </div>
        </div>

        <div class="flex gap-4">
          <button @click="clear" class="flex-1 py-4 rounded-xl border-2 border-slate-100 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 hover:text-slate-600 transition-all flex items-center justify-center gap-2">
            <Eraser class="w-4 h-4" />
            Clear
          </button>
          <button @click="handleSave" class="flex-[2] py-4 rounded-xl bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20">
            <Save class="w-4 h-4" />
            Save & Submit
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
