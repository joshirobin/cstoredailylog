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
            const response = await fetch(`${apiBaseUrl}/api/send-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: employee.email,
                    subject: 'Welcome to the Workforce Hub!',
                    body: `Hi ${employee.firstName},\n\nWelcome to the team! Your employee profile has been created.\n\nYou can use the following information to clock in and out:\n\nEmail: ${employee.email}\nClock-In PIN: ${employee.pin}\n\nPlease keep this information secure.\n\nBest regards,\nManagement`
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

    return {
        employees,
        loading,
        fetchEmployees,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        sendWelcomeEmail
    };
});

