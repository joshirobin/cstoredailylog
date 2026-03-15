import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db } from '../firebaseConfig';
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc, where } from 'firebase/firestore';
import { useLocationsStore } from './locations';

export interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    position: string;
    hireDate: string;
    status: 'Active' | 'Inactive';
    hourlyRate: number;
    pin?: string;
    role?: 'Admin' | 'Manager' | 'Assistant Manager' | 'Cashier' | 'Stocker' | 'Shift Manager';
    locationId?: string;
}

export const useEmployeesStore = defineStore('employees', () => {
    const employees = ref<Employee[]>([]);
    const loading = ref(false);

    const fetchEmployees = async () => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        loading.value = true;
        try {
            const q = query(
                collection(db, 'employees'),
                where('locationId', '==', locationsStore.activeLocationId),
                orderBy('lastName')
            );
            const querySnapshot = await getDocs(q);
            employees.value = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
        } catch (error) {
            console.error('Failed to fetch employees:', error);
        } finally {
            loading.value = false;
        }
    };

    const addEmployee = async (employee: Omit<Employee, 'id' | 'locationId'>) => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) {
            console.error('No active location selected when adding employee');
            throw new Error('No active location selected. Please select a store location first.');
        }


        try {
            console.log('Adding employee to Firebase...', { ...employee, locationId: locationsStore.activeLocationId });
            const docRef = await addDoc(collection(db, 'employees'), {
                ...employee,
                locationId: locationsStore.activeLocationId,
                hourlyRate: Number(employee.hourlyRate) || 0
            });
            console.log('Employee added with ID:', docRef.id);

            // Manually add to local state immediately for optimistic UI
            const newEmployee = {
                id: docRef.id,
                ...employee,
                locationId: locationsStore.activeLocationId,
                hourlyRate: Number(employee.hourlyRate) || 0
            } as Employee;

            employees.value.push(newEmployee);
            console.log('Optimistically added to local state. Current count:', employees.value.length);

            await fetchEmployees();
            return docRef.id;
        } catch (error) {
            console.error('Failed to add employee:', error);
            throw error;
        }
    };

    const updateEmployee = async (id: string, updates: Partial<Employee>) => {
        try {
            const employeeRef = doc(db, 'employees', id);
            await updateDoc(employeeRef, {
                ...updates,
                hourlyRate: updates.hourlyRate ? Number(updates.hourlyRate) : undefined
            });
            await fetchEmployees();
        } catch (error) {
            console.error('Failed to update employee:', error);
            throw error;
        }
    };

    const deleteEmployee = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'employees', id));
            await fetchEmployees();
        } catch (error) {
            console.error('Failed to delete employee:', error);
            throw error;
        }
    };

    const sendWelcomeEmail = async (employee: Employee) => {
        try {
            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001';
            const locationsStore = useLocationsStore();
            const storeName = locationsStore.activeLocation?.name || 'our store';
            
            const response = await fetch(`${apiBaseUrl}/api/send-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: employee.email,
                    subject: `Welcome to the team at ${storeName}!`,
                    body: `Hi ${employee.firstName},\n\n` +
                          `Welcome to the team! We are excited to have you join us at ${storeName}.\n\n` +
                          `Your digital employee portal is ready. Please follow these steps to get started:\n\n` +
                          `1. ACTIVATE ACCOUNT: Click the link below to create your secure password:\n` +
                          `${window.location.origin}/signup?email=${encodeURIComponent(employee.email)}&role=${encodeURIComponent(employee.role || 'Cashier')}&name=${encodeURIComponent(employee.firstName + ' ' + employee.lastName)}\n\n` +
                          `2. CLOCK-IN PIN: Your unique PIN for the onsite terminal is: ${employee.pin || 'Check with your Manager'}\n\n` +
                          `3. VERIFY EMAIL: After setting your password, look for a confirmation email to verify your identity.\n\n` +
                          `Once logged in, you can view your schedule, complete daily tasks, and track your hours from any device.\n\n` +
                          `We look forward to working with you!\n\n` +
                          `Best regards,\n` +
                          `${storeName} Management`
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to send welcome email');
            }

            return await response.json();
        } catch (error) {
            console.error('Error in sendWelcomeEmail:', error);
            throw error;
        }
    };

    const sendClockOutEmail = async (employee: Employee, log: any, weeklyHours?: number) => {
        try {
            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001';
            const clockIn = log.clockIn.toDate().toLocaleString();
            const clockOut = log.clockOut.toDate().toLocaleString();
            
            const response = await fetch(`${apiBaseUrl}/api/send-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: employee.email,
                    subject: 'Shift Completion Summary - Workforce Hub',
                    body: `Hi ${employee.firstName},\n\nYou have successfully clocked out. Here is your shift summary:\n\n` +
                          `- Store: ${log.locationName || 'Unknown Store'}\n` +
                          `- Role: ${employee.position}\n` +
                          `- Clock In: ${clockIn}\n` +
                          `- Clock Out: ${clockOut}\n` +
                          `- Total Duration: ${log.totalHours} hours\n` +
                          (weeklyHours !== undefined ? `- WEEKLY TOTAL: ${weeklyHours} hours\n` : '') +
                          (log.isLate ? `- Note: Late for ${log.lateMinutes} mins\n` : '') +
                          `- Estimated Shift Pay: $${(Number(log.totalHours) * employee.hourlyRate).toFixed(2)}\n\n` +
                          `Thank you for your hard work today!\n\nBest regards,\nWorkforce Hub Management`
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to send clock-out email');
            }

            return await response.json();
        } catch (error) {
            console.error('Error in sendClockOutEmail:', error);
            // Don't throw here to avoid blocking the main flow
        }
    };
    const sendScheduleEmail = async (employee: Employee, body: string, dateRange: string) => {
        try {
            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001';
            const response = await fetch(`${apiBaseUrl}/api/send-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: employee.email,
                    subject: `Work Schedule Update: ${dateRange}`,
                    body: body
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to send schedule email');
            }

            return await response.json();
        } catch (error) {
            console.error('Error in sendScheduleEmail:', error);
            throw error;
        }
    };

    return {
        employees,
        loading,
        fetchEmployees,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        sendWelcomeEmail,
        sendClockOutEmail,
        sendScheduleEmail
    };
});

