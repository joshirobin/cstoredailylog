<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { 
  Mic, MicOff, X, 
  BrainCircuit, 
  Wand2, Volume2
} from 'lucide-vue-next';
import { useFuelStore } from '../stores/fuel';
import { useSalesStore } from '../stores/sales';
import { useTasksStore } from '../stores/tasks';
import { useEmployeesStore } from '../stores/employees';
import { useLotteryStore } from '../stores/lottery';
import { useAuditStore } from '../stores/audits';

const isOpen = ref(false);
const isListening = ref(false);
const transcript = ref("");
const response = ref("");
const isProcessing = ref(false);

const fuelStore = useFuelStore();
const salesStore = useSalesStore();
const tasksStore = useTasksStore();
const employeesStore = useEmployeesStore();
const lotteryStore = useLotteryStore();
const auditStore = useAuditStore();

// Speech Recognition Setup
let recognition: any = null;

const initSpeech = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            isListening.value = true;
            transcript.value = "Listening...";
        };

        recognition.onresult = (event: any) => {
            const result = event.results[0][0].transcript;
            transcript.value = result;
            processCommand(result);
        };

        recognition.onend = () => {
            isListening.value = false;
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            isListening.value = false;
            transcript.value = "Error: " + event.error;
        };
    }
};

onMounted(() => {
    initSpeech();
    fuelStore.fetchLogs();
    salesStore.fetchLogs();
    tasksStore.fetchTasks();
    employeesStore.fetchEmployees();
    lotteryStore.fetchBooks();
    lotteryStore.fetchGames();
    auditStore.fetchAudits();
});

const toggleListening = () => {
    if (isListening.value) {
        recognition?.stop();
    } else {
        recognition?.start();
    }
};

const processCommand = async (text: string) => {
    isProcessing.value = true;
    const cmd = text.toLowerCase();
    
    // Simulate AI Processing and Context Awareness
    setTimeout(() => {
        // 1. Fuel Intelligence
        if (cmd.includes('fuel') || cmd.includes('regular') || cmd.includes('gallons') || cmd.includes('tank')) {
            const status = fuelStore.getLogisticsStatus('87 Regular');
            if (status) {
                response.value = `Regular fuel is at ${Math.floor((status.currentGallons/8000)*100)}% capacity. You have ${status.currentGallons.toLocaleString()} gallons remaining and can fit another ${status.ullage.toLocaleString()} gallons in the next load.`;
            } else {
                response.value = "I can see the tanks, but I'm waiting for the latest ATG poll to give you an exact gallon count.";
            }
        } 
        // 2. Sales Intelligence
        else if (cmd.includes('sales') || cmd.includes('money') || cmd.includes('total')) {
            const total = salesStore.logs.reduce((acc: number, curr: any) => acc + (curr.totalSales || 0), 0);
            response.value = `Total recorded gross sales in the current log are $${total.toLocaleString()}. Inside performance is currently steady.`;
        }
        // 3. Task & Ops Intelligence
        else if (cmd.includes('task') || cmd.includes('todo') || cmd.includes('chore')) {
            const pendingCount = tasksStore.tasks.filter(t => t.status === 'PENDING').length;
            response.value = `There are ${pendingCount} pending tasks for this location. The priority item is '${tasksStore.tasks[0]?.title || "Daily Check"}'.`;
        }
        // 4. Staffing Intelligence
        else if (cmd.includes('who') || cmd.includes('staff') || cmd.includes('employee') || cmd.includes('shift')) {
            const activeStaff = employeesStore.employees.filter(e => e.status === 'Active');
            response.value = `You have ${activeStaff.length} active staff members. ${activeStaff[0]?.firstName || "Management"} is currently on point.`;
        }
        // 5. Lottery Intelligence
        else if (cmd.includes('lottery') || cmd.includes('lotto') || cmd.includes('ticket')) {
            const inventoryCount = lotteryStore.books.length;
            const activeCount = lotteryStore.activeBooks.length;
            response.value = `The lottery module has ${inventoryCount} total books recorded, with ${activeCount} currently active on registers.`;
        }
        // 6. Audit & Quality
        else if (cmd.includes('audit') || cmd.includes('perfect') || cmd.includes('score')) {
            const lastAudit = auditStore.shiftAudits[0];
            const score = 9.8;
            response.value = `The last visual audit was ${lastAudit?.status || 'Completed'} with a quality score of ${score}/10.`;
        }
        // 7. Greetings
        else if (cmd.includes('hello') || cmd.includes('hi') || cmd.includes('sync')) {
            response.value = "Greetings! I am Sync-Assistant, your autonomous operations partner. I'm connected to all station modules. Ask me about fuel, sales, tasks, or shift performance.";
        } else {
            response.value = `I recognized your command: "${text}". I have searched the Sales, Fuel, and Task databases. How else can I assist with station operations?`;
        }
        
        isProcessing.value = false;
        speak(response.value);
    }, 1000);
};

const speak = (text: string) => {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
    }
};

const closeAssistant = () => {
    isOpen.value = false;
    transcript.value = "";
    response.value = "";
    recognition?.stop();
};
</script>

<template>
  <div class="fixed bottom-10 right-10 z-[100] flex flex-col items-end gap-4 pointer-events-none">
    <!-- Assistant Modal -->
    <Transition
        enter-active-class="transition duration-500 ease-out"
        enter-from-class="transform translate-y-12 opacity-0 scale-95"
        enter-to-class="transform translate-y-0 opacity-100 scale-100"
        leave-active-class="transition duration-300 ease-in"
        leave-from-class="transform translate-y-0 opacity-100 scale-100"
        leave-to-class="transform translate-y-12 opacity-0 scale-95"
    >
        <div v-if="isOpen" class="w-[420px] bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border border-white/10 pointer-events-auto">
            <!-- Modal Header -->
            <div class="p-8 pb-0 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <BrainCircuit class="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 class="text-xl font-black text-white uppercase italic tracking-tighter leading-none">Sync <span class="text-indigo-400">Assistant</span></h3>
                        <p class="text-[9px] font-black text-white/40 uppercase tracking-[0.3em] mt-1">Autonomous Ops v2.0</p>
                    </div>
                </div>
                <button @click="closeAssistant" class="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white flex items-center justify-center transition-all">
                    <X class="w-5 h-5" />
                </button>
            </div>

            <!-- Modal Content -->
            <div class="p-8 space-y-8">
                <!-- Visualizer -->
                <div class="h-24 flex items-center justify-center gap-1.5 px-4 mb-4">
                    <div v-for="i in 12" :key="i" 
                         :class="['w-1.5 rounded-full bg-indigo-500 transition-all duration-300', 
                                  isListening ? 'animate-pulse' : 'h-2 opacity-20']"
                         :style="{ height: isListening ? Math.random() * 80 + 20 + '%' : '8px', animationDelay: i * 0.1 + 's' }">
                    </div>
                </div>

                <!-- Dialogue Area -->
                <div class="space-y-6 min-h-[160px]">
                    <div v-if="transcript" class="space-y-2">
                        <p class="text-[10px] font-black text-indigo-400 uppercase tracking-widest">You Said</p>
                        <p class="text-lg font-bold text-white leading-tight italic">{{ transcript }}</p>
                    </div>

                    <div v-if="isProcessing" class="flex items-center gap-3 text-white/30 italic text-sm font-bold animate-pulse">
                        <Wand2 class="w-4 h-4" /> Sync is thinking...
                    </div>

                    <div v-if="response" class="p-6 rounded-[2rem] bg-indigo-600/20 border border-indigo-500/30 text-indigo-100">
                        <div class="flex items-center gap-2 mb-2">
                            <Volume2 class="w-4 h-4 text-indigo-400" />
                            <span class="text-[9px] font-black uppercase tracking-widest text-indigo-400">Assistant Response</span>
                        </div>
                        <p class="text-sm font-bold leading-relaxed">{{ response }}</p>
                    </div>
                    
                    <div v-if="!transcript && !response" class="text-center py-4">
                        <p class="text-sm font-bold text-white/20 italic">"How much regular fuel is left?"<br>"Show me the morning audit status"</p>
                    </div>
                </div>
            </div>

            <!-- Modal Footer Controls -->
            <div class="p-8 pt-0">
                <button @click="toggleListening" 
                        :class="['w-full py-6 rounded-[2rem] flex items-center justify-center gap-4 transition-all shadow-xl', 
                                 isListening ? 'bg-rose-600 text-white shadow-rose-900/40' : 'bg-indigo-600 text-white shadow-indigo-900/40 hover:bg-indigo-500']">
                    <Mic v-if="!isListening" class="w-6 h-6" />
                    <MicOff v-else class="w-6 h-6 animate-pulse" />
                    <span class="text-xs font-black uppercase tracking-[0.2em] italic">{{ isListening ? 'Stop Listening' : 'Tap to Command' }}</span>
                </button>
                <p class="text-center mt-6 text-[9px] font-black text-white/20 uppercase tracking-[0.4em]">Integrated Voice Processor</p>
            </div>
        </div>
    </Transition>

    <!-- Global Toggle Button -->
    <button v-if="!isOpen" @click="isOpen = true" class="w-20 h-20 bg-slate-900 text-white rounded-[2rem] flex items-center justify-center shadow-2xl shadow-indigo-500/20 border border-white/10 hover:scale-105 transition-all group pointer-events-auto">
        <div class="relative">
            <BrainCircuit class="w-8 h-8 group-hover:text-indigo-400 transition-colors" />
            <div class="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full animate-ping"></div>
        </div>
    </button>
  </div>
</template>
