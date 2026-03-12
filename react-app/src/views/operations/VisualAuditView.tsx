import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuditStore, type ShiftAudit, type AuditPhoto } from '../../stores/useAuditStore';
import { useAuthStore } from '../../stores/useAuthStore';
import {
    Camera, CheckCircle2, Clock,
    ChevronRight,
    ShieldCheck, Star, Trash2, X, Loader2
} from 'lucide-react';

const VisualAuditView = () => {
    const auditStore = useAuditStore();
    const { user, userRole } = useAuthStore();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedShiftFilter, setSelectedShiftFilter] = useState<'All' | 'Morning' | 'Afternoon' | 'Night'>('All');
    const [selectedAuditForReview, setSelectedAuditForReview] = useState<ShiftAudit | null>(null);

    const initialPhotos: AuditPhoto[] = [
        { id: '1', category: 'Coffee Bar', imageUrl: '', status: 'Pending', timestamp: null },
        { id: '2', category: 'Restroom', imageUrl: '', status: 'Pending', timestamp: null },
        { id: '3', category: 'Pump Area', imageUrl: '', status: 'Pending', timestamp: null },
        { id: '4', category: 'Cooler', imageUrl: '', status: 'Pending', timestamp: null },
        { id: '5', category: 'Counter', imageUrl: '', status: 'Pending', timestamp: null },
    ];

    const [currentAudit, setCurrentAudit] = useState<{
        shift: 'Morning' | 'Afternoon' | 'Night';
        photos: AuditPhoto[];
    }>({
        shift: 'Morning',
        photos: initialPhotos
    });

    const filteredAudits = useMemo(() => {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        return auditStore.shiftAudits.filter(a => {
            const isRecent = a.createdAt >= twentyFourHoursAgo;
            if (selectedShiftFilter === 'All') return isRecent;
            return isRecent && a.shift === selectedShiftFilter;
        });
    }, [auditStore.shiftAudits, selectedShiftFilter]);

    useEffect(() => {
        auditStore.fetchAudits();
        return () => auditStore.stopSync();
    }, []);

    const triggerFileInput = (categoryId: string) => {
        setActiveCategoryId(categoryId);
        fileInputRef.current?.click();
    };

    const onFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !activeCategoryId) return;

        setIsUploading(true);
        try {
            const photo = currentAudit.photos.find(p => p.id === activeCategoryId);
            if (photo) {
                const url = await auditStore.uploadAuditImage(file, photo.category);
                const updatedPhotos = currentAudit.photos.map(p =>
                    p.id === activeCategoryId
                        ? { ...p, imageUrl: url, timestamp: new Date().toISOString(), status: 'Accepted' as const }
                        : p
                );
                setCurrentAudit({ ...currentAudit, photos: updatedPhotos });
            }
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Failed to upload image. Please check your connection.');
        } finally {
            setIsUploading(false);
            setActiveCategoryId(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const submitAudit = async () => {
        if (currentAudit.photos.some(p => !p.imageUrl)) {
            alert("Please capture all required photos for the audit.");
            return;
        }

        setIsSubmitting(true);
        try {
            await auditStore.createAudit({
                shift: currentAudit.shift,
                auditorEmail: user?.email || 'demo@cstoredaily.com',
                photos: currentAudit.photos,
                status: 'Submitted',
                date: new Date().toISOString().split('T')[0]
            });

            alert("Perfect Store Audit Submitted Successfully!");
            setCurrentAudit({
                shift: 'Morning',
                photos: initialPhotos
            });
        } catch (error) {
            alert("Failed to submit audit.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const approveAudit = async (id: string) => {
        const verifier = user?.email || 'manager@cstoredaily.com';
        await auditStore.verifyAudit(id, verifier);
        setSelectedAuditForReview(null);
        alert("Audit Verified and Approved.");
    };

    const removeAudit = async (id: string) => {
        if (userRole !== 'Admin') {
            alert("Action Denied: Only Admins can delete audit records.");
            return;
        }
        if (!confirm("Are you sure you want to permanently delete this audit record?")) return;
        await auditStore.deleteAudit(id);
        setSelectedAuditForReview(null);
        alert("Audit record removed from database.");
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-32 animate-in fade-in duration-700">
            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                capture="environment"
                onChange={onFileSelected}
            />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Camera className="w-5 h-5 text-rose-500 animate-pulse" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Visual Standards</span>
                    </div>
                    <h1 className="text-5xl font-[1000] text-slate-900 uppercase italic tracking-tighter leading-none">
                        Perfect <span className="text-rose-600">Store</span> Audit
                    </h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Visual Baselines • Zero-Friction Compliance</p>
                </div>

                <div className="flex items-center gap-4">
                    <select
                        value={currentAudit.shift}
                        onChange={(e) => setCurrentAudit({ ...currentAudit, shift: e.target.value as any })}
                        className="bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm text-sm font-black uppercase tracking-widest outline-none focus:ring-2 ring-rose-500 transition-all cursor-pointer"
                    >
                        <option>Morning</option>
                        <option>Afternoon</option>
                        <option>Night</option>
                    </select>
                    <button
                        onClick={submitAudit}
                        disabled={isSubmitting}
                        className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-900/20 flex items-center gap-2"
                    >
                        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isSubmitting ? 'Submitting...' : 'Submit Perfect Audit'}
                    </button>
                </div>
            </div>

            {/* Active Audit Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {currentAudit.photos.map((photo) => (
                    <div
                        key={photo.id}
                        onClick={() => triggerFileInput(photo.id)}
                        className="group relative aspect-square bg-slate-50 rounded-[2.5rem] border-4 border-dashed border-slate-200 overflow-hidden cursor-pointer hover:border-rose-300 hover:bg-rose-50/30 transition-all active:scale-95"
                    >
                        {isUploading && activeCategoryId === photo.id && (
                            <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
                                <Loader2 className="w-8 h-8 text-rose-500 animate-spin mb-2" />
                                <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest">Optimizing...</p>
                            </div>
                        )}
                        {photo.imageUrl ? (
                            <div className="absolute inset-0">
                                <img src={photo.imageUrl} className="w-full h-full object-cover" alt={photo.category} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                <div className="absolute bottom-6 left-6 right-6">
                                    <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1">{photo.category}</p>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                        <span className="text-xs font-bold text-white uppercase tracking-tighter">Captured</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 group-hover:text-rose-400 transition-colors px-4 text-center">
                                <Camera className="w-12 h-12 mb-4 group-hover:scale-110 transition-transform" />
                                <p className="text-[10px] font-black uppercase tracking-widest">{photo.category}</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase mt-2">Tap to Capture</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mt-12">
                <div className="lg:col-span-8 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.3em] flex items-center gap-3">
                            <Clock className="w-4 h-4 text-rose-500" /> Audit Integrity Timeline
                        </h3>

                        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                            {(['All', 'Morning', 'Afternoon', 'Night'] as const).map((shift) => (
                                <button
                                    key={shift}
                                    onClick={() => setSelectedShiftFilter(shift)}
                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${selectedShiftFilter === shift ? 'bg-white shadow-sm text-rose-600' : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    {shift}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        {filteredAudits.map((audit) => (
                            <div
                                key={audit.id}
                                onClick={() => {
                                    setSelectedAuditForReview(audit);
                                    document.getElementById('review-section')?.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="bg-white p-6 rounded-[2rem] border border-slate-50 shadow-sm hover:shadow-lg transition-all flex items-center gap-6 group cursor-pointer"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-rose-500 italic text-xl">
                                    {audit.shift[0]}
                                </div>
                                <div className="flex-1 text-left">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h4 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter leading-none">{audit.shift} Audit</h4>
                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${audit.status === 'Verified' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                                            }`}>
                                            {audit.status}
                                        </span>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        Auditor: {audit.auditorEmail?.split('@')[0] || 'Unknown'} • {formatDate(audit.createdAt)}
                                    </p>
                                </div>
                                <div className="flex gap-1">
                                    {audit.photos.slice(0, 3).map((p, i) => (
                                        <div key={i} className="w-8 h-8 rounded-lg overflow-hidden border-2 border-white shadow-sm -ml-2 first:ml-0">
                                            <img src={p.imageUrl} className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                    {audit.photos.length > 3 && (
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 -ml-2 border-2 border-white">
                                            +{audit.photos.length - 3}
                                        </div>
                                    )}
                                </div>
                                <button className="p-4 bg-slate-50 rounded-2xl text-slate-400 group-hover:bg-rose-50 group-hover:text-rose-500 transition-all">
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Review Detail Section */}
                    {selectedAuditForReview && (
                        <div id="review-section" className="mt-12 bg-white p-10 rounded-[3rem] border-4 border-slate-900 shadow-2xl space-y-8 animate-in slide-in-from-bottom duration-500 text-left">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.4em]">Audit Verification</span>
                                    <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Review: {selectedAuditForReview.shift} Audit</h2>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{formatDate(selectedAuditForReview.createdAt)} • Auditor: {selectedAuditForReview.auditorEmail}</p>
                                </div>
                                <button onClick={() => setSelectedAuditForReview(null)} className="text-slate-400 hover:text-slate-900 transition-colors uppercase text-[10px] font-black tracking-widest">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                {selectedAuditForReview.photos.map((photo) => (
                                    <div key={photo.id} className="space-y-2">
                                        <div className="aspect-square rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                                            <img src={photo.imageUrl} className="w-full h-full object-cover" />
                                        </div>
                                        <p className="text-[9px] font-black text-center uppercase tracking-widest text-slate-600">{photo.category}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-50">
                                {userRole === 'Admin' && (
                                    <button
                                        onClick={() => removeAudit(selectedAuditForReview.id)}
                                        className="bg-slate-100 text-slate-400 px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-50 hover:text-rose-600 transition-all flex items-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" /> Delete Record
                                    </button>
                                )}

                                {selectedAuditForReview.status !== 'Verified' ? (
                                    <button
                                        onClick={() => approveAudit(selectedAuditForReview.id)}
                                        className="bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-2"
                                    >
                                        <CheckCircle2 className="w-4 h-4" /> Approve & Verify Quality
                                    </button>
                                ) : (
                                    <span className="text-emerald-500 font-black uppercase text-xs tracking-widest flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4" /> Audit Verified
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Stats */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-gradient-to-br from-rose-600 to-rose-700 rounded-[3rem] p-8 text-white shadow-xl shadow-rose-200">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-black uppercase italic tracking-tighter">Integrity Check</h3>
                        </div>

                        <div className="space-y-6 text-left">
                            <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                <p className="text-xs font-bold text-rose-100 uppercase tracking-widest">Today's Compliance</p>
                                <p className="text-2xl font-black">100%</p>
                            </div>
                            <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                <p className="text-xs font-bold text-rose-100 uppercase tracking-widest">Store Karma</p>
                                <p className="text-2xl font-black text-emerald-300">+250</p>
                            </div>
                        </div>

                        <div className="mt-10 bg-white/10 backdrop-blur-md p-6 rounded-[2rem] border border-white/20 text-left">
                            <div className="flex items-center gap-3 mb-3">
                                <Star className="w-4 h-4 text-amber-300 fill-amber-300" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-rose-100">AI Quality Score</span>
                            </div>
                            <p className="text-3xl font-black tracking-tighter italic leading-none mb-2">9.8<span className="text-sm not-italic opacity-60">/10</span></p>
                            <p className="text-[9px] font-bold text-rose-100/60 leading-relaxed uppercase tracking-wider">Visual audit consistency is currently at a 30-day high.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VisualAuditView;
