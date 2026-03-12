import { create } from 'zustand';

export interface Task {
    id: string;
    title: string;
    description: string;
    assignedTo: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
    priority: 'LOW' | 'NORMAL' | 'URGENT';
}

interface TasksState {
    tasks: Task[];
    loading: boolean;
    fetchTasks: (employeeId: string) => Promise<void>;
    updateTaskStatus: (taskId: string, status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED') => Promise<void>;
}

export const useTasksStore = create<TasksState>((set) => ({
    tasks: [
        { id: '1', title: 'Clean coffee station', description: 'Wipe down counters and refill stirrers.', assignedTo: '1', status: 'PENDING', priority: 'NORMAL' },
        { id: '2', title: 'Restock cups', description: 'Check all cup sizes and lids.', assignedTo: '1', status: 'PENDING', priority: 'URGENT' },
    ],
    loading: false,
    fetchTasks: async (_employeeId) => {
        set({ loading: true });
        setTimeout(() => set({ loading: false }), 200);
    },
    updateTaskStatus: async (taskId, status) => {
        set(state => ({
            tasks: state.tasks.map(t => t.id === taskId ? { ...t, status } : t)
        }));
    }
}));
