import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db } from '../firebaseConfig';
import { collection, addDoc, getDocs, query, orderBy, where, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { useLocationsStore } from './locations';

export interface EmployeeTask {
    id: string;
    title: string;
    description: string;
    assigneeId: string;
    assigneeName: string;
    dueDate: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
    priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
    createdAt: Timestamp;
    beginDate?: string;
    completeDate?: string;
    estimatedMinutes?: number;
    verificationType?: 'PHOTO' | 'QR' | 'NONE';
    verificationUrl?: string;
    qrCodeValue?: string;
    locationId?: string;
}


export const useTasksStore = defineStore('tasks', () => {
    const tasks = ref<EmployeeTask[]>([]);
    const loading = ref(false);

    const fetchTasks = async (assigneeId?: string) => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        loading.value = true;
        try {
            let q;
            const baseQuery = query(
                collection(db, 'tasks'),
                where('locationId', '==', locationsStore.activeLocationId)
            );

            if (assigneeId && assigneeId !== 'All') {
                q = query(baseQuery, where('assigneeId', '==', assigneeId), orderBy('createdAt', 'desc'));
            } else {
                q = query(baseQuery, orderBy('createdAt', 'desc'));
            }

            const querySnapshot = await getDocs(q);
            tasks.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmployeeTask));
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        } finally {
            loading.value = false;
        }
    };

    const addTask = async (task: Omit<EmployeeTask, 'id' | 'createdAt' | 'status' | 'locationId'>) => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        try {
            const newTask = {
                ...task,
                status: 'PENDING',
                locationId: locationsStore.activeLocationId,
                verificationType: task.verificationType || 'NONE',
                createdAt: Timestamp.now()
            };
            const docRef = await addDoc(collection(db, 'tasks'), newTask);
            await fetchTasks();
            return docRef.id;
        } catch (error) {
            console.error('Failed to add task:', error);
            throw error;
        }
    };


    const updateTaskStatus = async (id: string, newStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED', verificationData?: { verificationUrl?: string, qrCodeValue?: string }) => {
        try {
            const taskRef = doc(db, 'tasks', id);
            const updates: any = { status: newStatus };
            if (verificationData) {
                if (verificationData.verificationUrl) updates.verificationUrl = verificationData.verificationUrl;
                if (verificationData.qrCodeValue) updates.qrCodeValue = verificationData.qrCodeValue;
            }
            await updateDoc(taskRef, updates);
            const task = tasks.value.find(t => t.id === id);
            if (task) {
                task.status = newStatus;
                if (verificationData) {
                    if (verificationData.verificationUrl) task.verificationUrl = verificationData.verificationUrl;
                    if (verificationData.qrCodeValue) task.qrCodeValue = verificationData.qrCodeValue;
                }
            }
        } catch (error) {
            console.error('Failed to update task status:', error);
            throw error;
        }
    };


    const deleteTask = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'tasks', id));
            tasks.value = tasks.value.filter(t => t.id !== id);
        } catch (error) {
            console.error('Failed to delete task:', error);
            throw error;
        }
    };

    return {
        tasks,
        loading,
        fetchTasks,
        addTask,
        updateTaskStatus,
        deleteTask
    };
});
