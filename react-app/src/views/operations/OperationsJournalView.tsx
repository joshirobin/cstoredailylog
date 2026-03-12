import { useState, useEffect, useMemo } from 'react';
import { useJournalStore, type JournalEntry } from '../../stores/useJournalStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useNotificationStore } from '../../stores/useNotificationStore';
import {
    MessageSquare, AlertTriangle, Send,
    Info, Search, ChevronRight,
    User, CheckCircle2, Wrench, Loader2
} from 'lucide-react';

const OperationsJournalView = () => {
    const journalStore = useJournalStore();
    const authStore = useAuthStore();
    const notificationStore = useNotificationStore();

    const [newNote, setNewNote] = useState('');
    const [selectedType, setSelectedType] = useState<JournalEntry['type']>('general');
    const [selectedPriority, setSelectedPriority] = useState<JournalEntry['priority']>('medium');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const entryTypes = [
        { id: 'general', label: 'General Note', icon: Info, bg: 'bg-blue-50', text: 'text-blue-600' },
        { id: 'handover', label: 'Shift Handover', icon: MessageSquare, bg: 'bg-indigo-50', text: 'text-indigo-600' },
        { id: 'maintenance', label: 'Maintenance', icon: Wrench, bg: 'bg-orange-50', text: 'text-orange-600' },
        { id: 'incident', label: 'Critical Incident', icon: AlertTriangle, bg: 'bg-rose-50', text: 'text-rose-600' }
    ] as const;

    const priorityLevels = [
        { id: 'low', label: 'Normal', color: 'bg-slate-100 text-slate-600' },
        { id: 'medium', label: 'Important', color: 'bg-amber-100 text-amber-600' },
        { id: 'high', label: 'High Priority', color: 'bg-orange-100 text-orange-600' },
        { id: 'urgent', label: 'Urgent Alert', color: 'bg-rose-100 text-rose-600' }
    ] as const;

    const filteredEntries = useMemo(() => {
        if (!searchQuery) return journalStore.entries;
        const q = searchQuery.toLowerCase();
        return journalStore.entries.filter(e =>
            e.content.toLowerCase().includes(q) ||
            e.authorName.toLowerCase().includes(q) ||
            e.type.includes(q)
        );
    }, [searchQuery, journalStore.entries]);

    const handleSubmit = async () => {
        if (!newNote.trim()) return;

        setIsSubmitting(true);
        try {
            await journalStore.addEntry({
                content: newNote,
                type: selectedType,
                priority: selectedPriority,
                authorName: authStore.user?.email?.split('@')[0] || 'Unknown User',
                authorId: authStore.user?.uid || 'unknown'
            });
            setNewNote('');
            setSelectedType('general');
            setSelectedPriority('medium');
            notificationStore.success('Entry committed to journal', 'Sync Active');
        } catch (e) {
            notificationStore.error('Failed to submit entry', 'Network Error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDate = (date: any) => {
        if (!date) return '';
        const d = date.toDate ? date.toDate() : new Date(date);
        return new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            month: 'short',
            day: 'numeric'
        }).format(d);
    };

    useEffect(() => {
        journalStore.fetchRecentEntries(50);
    }, []);

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-[1000] text-slate-900 uppercase italic tracking-tighter leading-none mb-3">
                        Operations <span className="text-blue-600">Journal</span>
                    </h1>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Command Center Log • Real-time Compliance</p>
                </div>

                <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Sync Active</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Input Panel */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 p-8 sticky top-8">
                        <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter mb-6">New Entry</h3>

                        <div className="space-y-6">
                            {/* Type Selector */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Category Vector</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {entryTypes.map((type) => (
                                        <button
                                            key={type.id}
                                            onClick={() => setSelectedType(type.id as any)}
                                            className={`p-3 rounded-2xl border transition-all flex flex-col gap-2 items-start ${selectedType === type.id ? 'bg-slate-900 border-slate-900' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}
                                        >
                                            <type.icon className={`w-4 h-4 ${selectedType === type.id ? 'text-blue-400' : type.text}`} />
                                            <span className={`text-[9px] font-black uppercase tracking-widest text-left ${selectedType === type.id ? 'text-white' : 'text-slate-600'}`}>
                                                {type.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Priority */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Priority Level</label>
                                <div className="flex flex-wrap gap-2">
                                    {priorityLevels.map((p) => (
                                        <button
                                            key={p.id}
                                            onClick={() => setSelectedPriority(p.id as any)}
                                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${selectedPriority === p.id ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Data Payload</label>
                                <textarea
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    placeholder="Type shift notes, incident details, or hand-over tasks..."
                                    className="w-full h-40 bg-slate-50 border-none rounded-[1.5rem] p-5 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-300 resize-none outline-none"
                                ></textarea>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !newNote.trim()}
                                className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-900/20 disabled:opacity-50"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                {isSubmitting ? 'Transmitting...' : 'Commit to Journal'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Timeline */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Search & Filters */}
                    <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <Search className="w-5 h-5 text-slate-300 ml-2" />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter operations log..."
                            className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold uppercase tracking-widest text-slate-900 outline-none"
                        />
                        <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{filteredEntries.length} Logs</span>
                        </div>
                    </div>

                    {/* Feed */}
                    <div className="space-y-6 relative">
                        {/* Timeline Thread */}
                        <div className="absolute left-6 top-10 bottom-10 w-px bg-slate-100 hidden md:block"></div>

                        {journalStore.loading && filteredEntries.length === 0 && (
                            <div className="py-32 text-center">
                                <Loader2 className="w-10 h-10 animate-spin mx-auto text-blue-500" />
                                <p className="text-sm font-black uppercase text-slate-400 tracking-widest mt-4">Initializing Feed...</p>
                            </div>
                        )}

                        {!journalStore.loading && filteredEntries.length === 0 && (
                            <div className="py-32 text-center opacity-20">
                                <MessageSquare className="w-20 h-20 mx-auto mb-4" />
                                <p className="text-2xl font-black uppercase italic tracking-tighter">No vectors committed</p>
                            </div>
                        )}

                        {filteredEntries.map((entry) => (
                            <div
                                key={entry.id}
                                className="relative pl-0 md:pl-16 group"
                            >
                                {/* Timeline Node */}
                                <div className={`absolute left-[20px] top-6 w-2 h-2 rounded-full border-2 border-white ring-4 ring-slate-50 z-10 hidden md:block ${entry.priority === 'urgent' ? 'bg-rose-500 ring-rose-50' : (entry.priority === 'high' ? 'bg-orange-500 ring-orange-50' : 'bg-slate-300 ring-slate-50')}`}>
                                </div>

                                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500 overflow-hidden">
                                    <div className="flex items-center justify-between px-8 py-4 bg-slate-50/50 border-b border-slate-50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400">
                                                <User className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-900 uppercase italic tracking-tighter">{entry.authorName}</p>
                                                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{formatDate(entry.createdAt)}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${priorityLevels.find(p => p.id === entry.priority)?.color || 'bg-slate-50'}`}>
                                                {entry.priority}
                                            </span>
                                            <div className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border bg-white ${entryTypes.find(t => t.id === entry.type)?.text || 'text-slate-400'}`}>
                                                {entry.type}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-8">
                                        <p className="text-sm font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">
                                            {entry.content}
                                        </p>
                                    </div>

                                    <div className="px-8 py-4 border-t border-slate-50 bg-slate-50/30 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-all">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-slate-300" />
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Acknowledge Vector</span>
                                        </div>
                                        <button className="text-[9px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">
                                            Detail Matrix <ChevronRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OperationsJournalView;
