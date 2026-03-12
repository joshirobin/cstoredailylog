import { ref, watch, unref, type Ref } from 'vue';

export interface DraftData {
    key: string;
    data: any;
    timestamp: number;
}

/**
 * Composable for auto-saving drafts to localStorage
 */
export function useAutoSave<T>(
    key: string,
    data: T | Ref<T>,
    options: {
        debounceMs?: number;
        enabled?: boolean;
    } = {}
) {
    const { debounceMs = 2000, enabled = true } = options;

    const lastSaved = ref<Date | null>(null);
    const isSaving = ref(false);
    let saveTimeout: number | null = null;

    /**
     * Save draft to localStorage
     */
    const saveDraft = () => {
        if (!enabled) return;

        try {
            const draft: DraftData = {
                key,
                data: unref(data),
                timestamp: Date.now()
            };
            localStorage.setItem(`draft_${key}`, JSON.stringify(draft));
            lastSaved.value = new Date();
            isSaving.value = false;
        } catch (error) {
            console.error('Failed to save draft:', error);
            isSaving.value = false;
        }
    };

    /**
     * Load draft from localStorage
     */
    const loadDraft = (): T | null => {
        try {
            const stored = localStorage.getItem(`draft_${key}`);
            if (!stored) return null;

            const draft: DraftData = JSON.parse(stored);

            // Check if draft is less than 24 hours old
            const age = Date.now() - draft.timestamp;
            if (age > 24 * 60 * 60 * 1000) {
                clearDraft();
                return null;
            }

            return draft.data as T;
        } catch (error) {
            console.error('Failed to load draft:', error);
            return null;
        }
    };

    /**
     * Clear draft from localStorage
     */
    const clearDraft = () => {
        try {
            localStorage.removeItem(`draft_${key}`);
            lastSaved.value = null;
        } catch (error) {
            console.error('Failed to clear draft:', error);
        }
    };

    /**
     * Check if draft exists
     */
    const hasDraft = (): boolean => {
        return localStorage.getItem(`draft_${key}`) !== null;
    };

    /**
     * Get draft age in minutes
     */
    const getDraftAge = (): number | null => {
        try {
            const stored = localStorage.getItem(`draft_${key}`);
            if (!stored) return null;

            const draft: DraftData = JSON.parse(stored);
            return Math.floor((Date.now() - draft.timestamp) / (1000 * 60));
        } catch {
            return null;
        }
    };

    // Auto-save on data changes
    if (enabled) {
        watch(
            () => data,
            () => {
                isSaving.value = true;

                if (saveTimeout) {
                    clearTimeout(saveTimeout);
                }

                saveTimeout = setTimeout(() => {
                    saveDraft();
                }, debounceMs);
            },
            { deep: true }
        );
    }

    return {
        saveDraft,
        loadDraft,
        clearDraft,
        hasDraft,
        getDraftAge,
        lastSaved,
        isSaving
    };
}
