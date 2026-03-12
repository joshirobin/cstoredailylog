import { useState } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { Lock, Mail, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function LoginView() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const login = useAuthStore(state => state.login);
    const loginAsDemo = useAuthStore(state => state.loginAsDemo);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setIsSubmitting(true);

        try {
            await login(email, password);
            navigate('/'); // Typically redirect depending on role, simple route for now
        } catch (err: any) {
            if (err.code === 'auth/invalid-credential') {
                setErrorMsg('Invalid email or password.');
            } else {
                setErrorMsg('An error occurred. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDemoLogin = async () => {
        await loginAsDemo();
        navigate('/');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary-500/10 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-secondary-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>

            <div className="glass-panel p-10 w-full max-w-lg relative z-10 mx-4 border-white/40">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-display font-black text-slate-900 mb-3 tracking-tight italic uppercase">
                        <span className="dynamic-highlight">Cstoresync</span>
                    </h1>
                    <p className="text-slate-500 text-sm font-bold tracking-widest uppercase opacity-70">Sign in to your dashboard</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    {errorMsg && (
                        <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold p-4 rounded-xl text-center animate-bounce">
                            {errorMsg}
                        </div>
                    )}

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
                        <div className="flex items-center justify-between ml-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Password</label>
                            <Link to="/forgot-password" className="text-[10px] font-black text-primary-600 hover:text-primary-700 transition-colors uppercase tracking-widest">
                                Forgot?
                            </Link>
                        </div>
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
                        className="btn-primary w-full py-4 text-sm font-black tracking-[0.2em] uppercase flex items-center justify-center gap-2"
                    >
                        {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                        <span>{isSubmitting ? 'Authenticating...' : 'Enter Dashboard'}</span>
                    </button>

                    <div className="relative py-6">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200/50"></div></div>
                        <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.2em]"><span className="bg-white/80 backdrop-blur-md px-4 text-slate-400">Secure Access</span></div>
                    </div>

                    <button
                        type="button"
                        onClick={handleDemoLogin}
                        className="w-full h-14 border-2 border-slate-100 rounded-2xl flex items-center justify-center gap-3 text-slate-600 font-black text-xs uppercase tracking-widest hover:bg-white hover:border-primary-500/20 hover:shadow-xl hover:shadow-primary-500/5 transition-all group"
                    >
                        <div className="w-8 h-8 bg-gradient-to-tr from-primary-600 to-secondary-500 rounded-lg flex items-center justify-center text-white text-xs group-hover:rotate-12 transition-transform">D</div>
                        Try Demo Mode
                    </button>

                    <div className="text-center mt-8">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Need an account?
                            <Link to="/signup" className="text-primary-600 font-black hover:text-primary-700 transition-colors ml-1 underline">Sign Up</Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}
