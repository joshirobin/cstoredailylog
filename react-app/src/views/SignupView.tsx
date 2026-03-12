import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { User, Mail, Lock, Loader2, Shield, ChevronRight } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

export default function SignupView() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('Admin');
    const [errorMsg, setErrorMsg] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const register = useAuthStore(state => state.register);
    const logout = useAuthStore(state => state.logout);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const queryEmail = params.get('email');
        const queryRole = params.get('role');
        const queryName = params.get('name');

        if (queryEmail) setEmail(queryEmail);
        if (queryName) setName(queryName);
        if (queryRole) {
            const validRoles = ['Admin', 'Manager', 'Cashier', 'Assistant Manager', 'Shift Manager', 'Stocker'];
            if (validRoles.includes(queryRole)) {
                setRole(queryRole);
            }
        }
    }, [location]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setIsSubmitting(true);

        try {
            await register(email, password, name, role);

            // Explicitly sign out after registration so they have to login with verification
            await logout();

            alert('Account created successfully! A verification link has been sent to your email. Please verify your email before logging in.');
            navigate('/login');
        } catch (err: any) {
            if (err.code === 'auth/email-already-in-use') {
                setErrorMsg('Email is already in use.');
            } else if (err.code === 'auth/weak-password') {
                setErrorMsg('Password should be at least 6 characters.');
            } else {
                setErrorMsg(err.message || 'An error occurred during registration.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary-500/10 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-secondary-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>

            <div className="glass-panel p-10 w-full max-w-lg relative z-10 mx-4 border-white/40 shadow-2xl">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-display font-black text-slate-900 mb-3 tracking-tight italic uppercase">
                        <span className="dynamic-highlight">Join</span> Ecosystem
                    </h1>
                    <p className="text-slate-500 text-sm font-bold tracking-widest uppercase opacity-70">Register your organization</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-6">
                    {errorMsg && (
                        <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold p-4 rounded-xl text-center animate-bounce">
                            {errorMsg}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Full Name</label>
                        <div className="relative group">
                            <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-primary-600 transition-colors" />
                            <input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                type="text"
                                required
                                className="input-field w-full pl-12"
                                placeholder="John Doe"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Your Role / Position</label>
                        <div className="relative group">
                            <Shield className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-primary-600 transition-colors" />
                            <select
                                value={role}
                                onChange={e => setRole(e.target.value)}
                                required
                                className="w-full pl-12 pr-10 py-3.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-primary-500/5 focus:border-primary-500 transition-all duration-300 appearance-none cursor-pointer"
                            >
                                <option value="Admin">Admin (Owner/Super User)</option>
                                <option value="Manager">Manager</option>
                                <option value="Cashier">Cashier / Staff</option>
                            </select>
                            <ChevronRight className="absolute right-4 top-4 w-4 h-4 text-slate-400 pointer-events-none rotate-90" />
                        </div>
                        <p className="text-[9px] font-black text-secondary-600 px-2 mt-1 uppercase leading-tight italic opacity-80">
                            {role === 'Admin' ? 'Super Admin: Full controls over employees, inventory & financial data.' : role === 'Manager' ? 'Ops Manager: Access to all day-to-day operations & reports.' : 'Staff: Access to terminal, checklists & task boards.'}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Email Address</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-primary-600 transition-colors" />
                            <input
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                type="email"
                                required
                                className="input-field w-full pl-12"
                                placeholder="name@company.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Secure Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-primary-600 transition-colors" />
                            <input
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                type="password"
                                required
                                className="input-field w-full pl-12"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn-primary w-full py-4 text-sm font-black tracking-[0.2em] uppercase mt-4 flex items-center justify-center gap-2"
                    >
                        {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                        <span>{isSubmitting ? 'Creating Secure Account...' : 'Register as Organization'}</span>
                    </button>

                    <div className="text-center mt-8">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Already part of the system?
                            <Link to="/login" className="text-primary-600 font-black hover:text-primary-700 transition-colors ml-1 underline">Log In Instead</Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}
