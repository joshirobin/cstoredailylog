import { defineStore } from 'pinia';
import { ref, markRaw } from 'vue';
import { db } from '../firebaseConfig';
import {
    collection, addDoc, getDocs, query,
    where, doc, updateDoc, Timestamp,
    setDoc, orderBy
} from 'firebase/firestore';
import { CreditCard, Briefcase, Utensils } from 'lucide-vue-next';
import { useLocationsStore } from './locations';

export type TaskType = 'boolean' | 'currency' | 'comment';

export interface ChecklistTask {
    task_id: string;
    label: string;
    required: boolean;
    type: TaskType;
    hasAttachment?: boolean;
}

export interface ChecklistSection {
    section_id: string;
    title: string;
    tasks: ChecklistTask[];
}

export interface ChecklistTemplate {
    template_id: string;
    role_id: string;
    role_title: string;
    frequency: string;
    icon: any;
    theme: {
        primary: string;
        secondary: string;
        accent: string;
        gradient: string;
        shadow: string;
    };
    sections: ChecklistSection[];
}

export interface ChecklistSubmission {
    id?: string;
    templateId: string;
    role: string;
    responses: Record<string, any>;
    progress: number;
    status: 'IN_PROGRESS' | 'COMPLETED';
    submittedAt: Timestamp | null;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
    storeId?: string;
    signatureData?: string;
    employeeId: string;
    employeeName: string;
    reviewedBy?: string;
    reviewedAt?: Timestamp;
}

// --- Templates ---
export const CASHIER_TEMPLATE: ChecklistTemplate = {
    template_id: "cashier_daily_checklist_v2",
    role_id: "cashier",
    role_title: "Cashier / Clerk",
    frequency: "Per Shift",
    icon: markRaw(CreditCard),
    theme: {
        primary: "text-emerald-700",
        secondary: "bg-emerald-50",
        accent: "border-emerald-200",
        gradient: "from-emerald-600 to-indigo-600",
        shadow: "shadow-emerald-500/30"
    },
    sections: [
        {
            section_id: "shift_start",
            title: "Shift Start",
            tasks: [
                { task_id: "clock_in", label: "Clock in using proper timekeeping method", required: true, type: "boolean" },
                { task_id: "uniform_check", label: "Wear proper uniform and name badge", required: true, type: "boolean" },
                { task_id: "review_notices", label: "Review daily notices or messages", required: true, type: "boolean" }
            ]
        },
        {
            section_id: "cash_drawer",
            title: "Cash Drawer Verification",
            tasks: [
                { task_id: "receive_drawer", label: "Receive assigned cash drawer", required: true, type: "boolean" },
                { task_id: "opening_cash_amount", label: "Count opening cash", required: true, type: "currency" },
                { task_id: "opening_balance_match", label: "Opening balance matches system", required: true, type: "boolean" }
            ]
        },
        {
            section_id: "cleanliness_sanitation",
            title: "Cleanliness & Sanitation",
            tasks: [
                { task_id: "disinfect_counter", label: "Disinfect counter, POS, card reader, and lotto terminal", required: true, type: "boolean" },
                { task_id: "clean_coffee_fountain", label: "Wipe coffee/fountain machines, clean drip trays", required: true, type: "boolean" },
                { task_id: "sweep_mop", label: "Sweep entire store, mop wet/dirty areas", required: true, type: "boolean" },
                { task_id: "empty_trash", label: "Empty all interior trash before overflow", required: true, type: "boolean" }
            ]
        },
        {
            section_id: "shift_end",
            title: "Shift-End Procedures",
            tasks: [
                { task_id: "final_cleaning", label: "Final cleaning of coffee, fountain, bathrooms, register, and sweep", required: true, type: "boolean" },
                { task_id: "balance_register", label: "Balance register, report over/short to manager", required: true, type: "boolean" },
                { task_id: "clock_out", label: "Clock out using proper timekeeping method", required: true, type: "boolean" }
            ]
        }
    ]
};

export const MANAGER_TEMPLATE: ChecklistTemplate = {
    template_id: "manager_daily",
    role_id: "manager",
    role_title: "Store Manager",
    frequency: "Daily",
    icon: markRaw(Briefcase),
    theme: {
        primary: "text-indigo-700",
        secondary: "bg-indigo-50",
        accent: "border-indigo-200",
        gradient: "from-indigo-600 to-violet-600",
        shadow: "shadow-indigo-500/30"
    },
    sections: [
        {
            section_id: "opening",
            title: "Opening Duties",
            tasks: [
                { task_id: "sales_summary", label: "Review prior day sales summary", required: true, type: "boolean" },
                { task_id: "bank_deposit", label: "Verify bank deposit completed", required: true, type: "boolean" }
            ]
        },
        {
            section_id: "closing",
            title: "Closing Duties",
            tasks: [
                { task_id: "profit_snapshot", label: "Review daily profit snapshot", required: true, type: "boolean" },
                { task_id: "sign_off", label: "Sign off all shift checklists", required: true, type: "boolean" }
            ]
        }
    ]
};

export const KITCHEN_TEMPLATE: ChecklistTemplate = {
    template_id: "kitchen_daily",
    role_id: "kitchen_mgr",
    role_title: "Kitchen Manager",
    frequency: "Daily",
    icon: markRaw(Utensils),
    theme: {
        primary: "text-orange-700",
        secondary: "bg-orange-50",
        accent: "border-orange-200",
        gradient: "from-orange-500 to-red-500",
        shadow: "shadow-orange-500/30"
    },
    sections: [
        {
            section_id: "opening",
            title: "Kitchen Opening",
            tasks: [
                { task_id: "temps_log", label: "Log equipment temperatures", required: true, type: "boolean" },
                { task_id: "prep_tasks", label: "Assign prep tasks", required: true, type: "boolean" }
            ]
        },
        {
            section_id: "closing",
            title: "Kitchen Closing",
            tasks: [
                { task_id: "deep_clean", label: "Deep clean surfaces", required: true, type: "boolean" },
                { task_id: "waste_report", label: "Submit food waste report", required: true, type: "comment" }
            ]
        }
    ]
};

export const ALL_TEMPLATES = [CASHIER_TEMPLATE, MANAGER_TEMPLATE, KITCHEN_TEMPLATE];

export const useChecklistsStore = defineStore('checklists', () => {
    const currentSubmission = ref<ChecklistSubmission | null>(null);
    const submissions = ref<ChecklistSubmission[]>([]);
    const loading = ref(false);

    const fetchChecklist = async (role: string) => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        loading.value = true;
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const q = query(
                collection(db, 'checklists'),
                where('locationId', '==', locationsStore.activeLocationId),
                where('role', '==', role),
                where('updatedAt', '>=', Timestamp.fromDate(today))
            );

            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty && querySnapshot.docs[0]) {
                const docData = querySnapshot.docs[0].data();
                currentSubmission.value = {
                    id: querySnapshot.docs[0].id,
                    ...docData
                } as ChecklistSubmission;
            } else {
                currentSubmission.value = null;
            }
        } catch (error) {
            console.error('Failed to fetch checklist:', error);
        } finally {
            loading.value = false;
        }
    };

    const fetchAllChecklists = async () => {
        const locationsStore = useLocationsStore();
        if (!locationsStore.activeLocationId) return;

        loading.value = true;
        try {
            const q = query(
                collection(db, 'checklists'),
                where('locationId', '==', locationsStore.activeLocationId),
                orderBy('updatedAt', 'desc')
            );
            const querySnapshot = await getDocs(q);
            submissions.value = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as ChecklistSubmission));
        } catch (error) {
            console.error('Failed to fetch submissions:', error);
        } finally {
            loading.value = false;
        }
    };

    const saveChecklist = async (submission: Partial<ChecklistSubmission>) => {
        try {
            const updatedAt = Timestamp.now();
            if (submission.id) {
                const docRef = doc(db, 'checklists', submission.id);
                await updateDoc(docRef, {
                    ...submission,
                    updatedAt
                });
                if (currentSubmission.value && currentSubmission.value.id === submission.id) {
                    currentSubmission.value = {
                        ...currentSubmission.value,
                        ...submission,
                        updatedAt
                    } as ChecklistSubmission;
                }
            } else {
                const locationsStore = useLocationsStore();
                const createdAt = Timestamp.now();
                const docData = {
                    ...submission,
                    locationId: locationsStore.activeLocationId,
                    createdAt,
                    updatedAt
                };
                const docRef = await addDoc(collection(db, 'checklists'), docData);
                const newSubmission = { id: docRef.id, ...docData } as ChecklistSubmission;
                currentSubmission.value = newSubmission;
                return docRef.id;
            }
        } catch (error) {
            console.error('Failed to save checklist:', error);
            throw error;
        }
    };

    const submitChecklist = async (submission: ChecklistSubmission) => {
        try {
            const docRef = submission.id
                ? doc(db, 'checklists', submission.id)
                : doc(collection(db, 'checklists'));

            const updatedAt = Timestamp.now();
            const submittedAt = Timestamp.now();

            const finalData = {
                ...submission,
                status: 'COMPLETED' as const,
                submittedAt,
                updatedAt
            };

            const { id, ...payload } = finalData;
            await setDoc(docRef, payload, { merge: true });
            currentSubmission.value = { id: docRef.id, ...finalData };
        } catch (error) {
            console.error('Failed to submit checklist:', error);
            throw error;
        }
    };

    const reviewChecklist = async (id: string, reviewerName: string) => {
        try {
            const docRef = doc(db, 'checklists', id);
            const reviewedAt = Timestamp.now();
            await updateDoc(docRef, {
                reviewedBy: reviewerName,
                reviewedAt: reviewedAt
            });

            // Update local state
            const index = submissions.value.findIndex(s => s.id === id);
            if (index !== -1 && submissions.value[index]) {
                const updated = { ...submissions.value[index] };
                updated.reviewedBy = reviewerName;
                updated.reviewedAt = reviewedAt;
                submissions.value[index] = updated as ChecklistSubmission;
            }
        } catch (error) {
            console.error('Failed to review checklist:', error);
            throw error;
        }
    };

    return {
        currentSubmission,
        submissions,
        loading,
        fetchChecklist,
        fetchAllChecklists,
        saveChecklist,
        submitChecklist,
        reviewChecklist
    };
});
