<template>
  <div class="barcode-scanner">
    <div v-if="!isScanning" class="scanner-trigger">
      <button 
        @click="startScanning" 
        class="btn-scan flex items-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg"
      >
        <ScanBarcode class="w-5 h-5" />
        {{ buttonText }}
      </button>
    </div>

    <!-- Scanner Modal -->
    <div v-if="isScanning" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <div class="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        <div class="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 class="text-lg font-bold text-slate-900">Scan Barcode/QR Code</h3>
            <p class="text-sm text-slate-500">Position the code within the frame</p>
          </div>
          <button @click="stopScanning" class="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600">
            <X class="w-5 h-5" />
          </button>
        </div>
        
        <div class="p-6">
          <div id="qr-reader" class="rounded-xl overflow-hidden border-2 border-slate-200"></div>
          
          <div class="mt-4 p-4 bg-slate-50 rounded-xl">
            <p class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Or Enter Manually</p>
            <input 
              v-model="manualInput"
              @keyup.enter="handleManualInput"
              type="text" 
              placeholder="Type book number and press Enter"
              class="w-full p-3 rounded-lg border border-slate-200 font-mono font-bold"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import { Html5Qrcode } from 'html5-qrcode';
import { ScanBarcode, X } from 'lucide-vue-next';

const props = defineProps<{
  buttonText?: string;
}>();

const emit = defineEmits<{
  scanned: [value: string];
}>();

const isScanning = ref(false);
const manualInput = ref('');
let html5QrCode: Html5Qrcode | null = null;

const startScanning = async () => {
  isScanning.value = true;
  
  // Wait for DOM to render
  await new Promise(resolve => setTimeout(resolve, 100));
  
  try {
    html5QrCode = new Html5Qrcode("qr-reader");
    
    await html5QrCode.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 250, height: 250 }
      },
      (decodedText) => {
        emit('scanned', decodedText);
        stopScanning();
      },
      (_errorMessage) => {
        // Ignore scanning errors (happens frequently)
      }
    );
  } catch (err) {
    console.error('Scanner error:', err);
    alert('Unable to start camera. Please check permissions or enter manually.');
  }
};

const stopScanning = async () => {
  if (html5QrCode) {
    try {
      await html5QrCode.stop();
      html5QrCode.clear();
    } catch (err) {
      console.error('Error stopping scanner:', err);
    }
  }
  isScanning.value = false;
  manualInput.value = '';
};

const handleManualInput = () => {
  if (manualInput.value.trim()) {
    emit('scanned', manualInput.value.trim());
    stopScanning();
  }
};

onUnmounted(() => {
  stopScanning();
});
</script>

<style scoped>
#qr-reader {
  width: 100%;
}
</style>
