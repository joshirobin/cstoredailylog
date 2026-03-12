import { useState, useRef } from 'react';

export function useAutoSave<T>(key: string, _data: T, options: { debounceMs?: number } = {}) {
    const { debounceMs = 1000 } = options;
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const loadDraft = (): T | null => {
        const saved = localStorage.getItem(`draft_${key}`);
        if (!saved) return null;
        try {
            return JSON.parse(saved);
        } catch (e) {
            return null;
        }
    };

    const clearDraft = () => {
        localStorage.removeItem(`draft_${key}`);
        setLastSaved(null);
    };

    const saveDraft = (currentData: T) => {
        setIsSaving(true);
        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            localStorage.setItem(`draft_${key}`, JSON.stringify(currentData));
            setLastSaved(new Date());
            setIsSaving(false);
        }, debounceMs);
    };

    return { loadDraft, clearDraft, saveDraft, lastSaved, isSaving };
}
