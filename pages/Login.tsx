
import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail, createUserWithEmailAndPassword } from 'firebase/auth';

interface LoginProps {
  onLogin: (success: boolean) => void;
}

const Login: React.FC<LoginProps> = () => {
  const { settings } = useApp();
  const [view, setView] = useState<'login' | 'reset' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isResetSent, setIsResetSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (view === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else if (view === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        // Firebase Auth secure email-based reset flow
        await sendPasswordResetEmail(auth, email);
        setIsResetSent(true);
      }
    } catch (err: unknown) {
      let friendlyError = 'An error occurred. Please try again.';
      const error = err as { code?: string };
      if (error.code === 'auth/user-not-found') friendlyError = 'No owner account found with this email.';
      if (error.code === 'auth/wrong-password') friendlyError = 'Incorrect password. Please try again.';
      if (error.code === 'auth/invalid-email') friendlyError = 'Please enter a valid email address.';
      if (error.code === 'auth/too-many-requests') friendlyError = 'Too many attempts. Access is temporarily locked.';
      if (error.code === 'auth/email-already-in-use') friendlyError = 'This email is already registered. Please sign in.';
      if (error.code === 'auth/weak-password') friendlyError = 'Password should be at least 6 characters.';
      
      setError(friendlyError);
      console.error(err instanceof Error ? err.message : err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in border border-white/50">
        {/* Header Section */}
        <div className="bg-violet-600 p-8 md:p-12 text-center text-white relative">
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner overflow-hidden">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <i className="fas fa-om text-3xl text-violet-600"></i>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tighter mb-1 uppercase">
              {view === 'login' ? settings.name : view === 'signup' ? 'Create Account' : 'Account Recovery'}
            </h1>
            <p className="text-violet-100 text-[10px] font-bold tracking-[0.2em] uppercase opacity-80">
              {view === 'login' ? 'Owner Access Only' : view === 'signup' ? 'Register New Owner' : 'Password Reset Service'}
            </p>
          </div>
        </div>
        
        {/* Form Section */}
        <form onSubmit={handleSubmit} className="p-7 md:p-10 space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 text-rose-600 text-xs rounded-xl border border-rose-100 flex items-center gap-3 font-bold animate-in">
              <i className="fas fa-circle-exclamation"></i>
              <span>{error}</span>
            </div>
          )}

          {isResetSent ? (
            <div className="text-center space-y-6 animate-in">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-paper-plane text-xl"></i>
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800">Check Your Email</h3>
                <p className="text-sm text-slate-500 mt-2 font-medium">
                  We've sent a secure reset link to <span className="font-bold text-slate-700">{email}</span>.
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => { setView('login'); setIsResetSent(false); }} 
                className="w-full bg-slate-100 py-4 rounded-2xl font-black text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Return to Login
              </button>
            </div>
          ) : (
            <>
              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Admin Email
                </label>
                <div className="relative">
                  <i className="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
                  <input 
                    type="email" 
                    required 
                    className="w-full pl-11 pr-5 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-violet-100 font-bold text-sm transition-all" 
                    placeholder="owner@finance.com" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                  />
                </div>
              </div>

              {/* Password Field (only for login/signup) */}
              {view !== 'reset' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Access Key
                    </label>
                  </div>
                  <div className="relative">
                    <i className="fas fa-key absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
                    <input 
                      type="password" 
                      required 
                      className="w-full pl-11 pr-5 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-violet-100 font-bold text-sm transition-all" 
                      placeholder="••••••••" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                    />
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button 
                type="submit" 
                disabled={isLoading} 
                className="w-full bg-violet-600 text-white py-4 md:py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-violet-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isLoading ? (
                  <i className="fas fa-circle-notch fa-spin"></i>
                ) : (
                  <>
                    <i className={`fas ${view === 'login' ? 'fa-sign-in-alt' : view === 'signup' ? 'fa-user-plus' : 'fa-unlock-alt'}`}></i>
                    {view === 'login' ? 'Authenticate' : view === 'signup' ? 'Create Account' : 'Request Reset Link'}
                  </>
                )}
              </button>
              
              {/* Secondary Actions */}
              <div className="flex flex-col gap-4 text-center pt-2">
                {view === 'login' ? (
                  <>
                    <button 
                      type="button" 
                      onClick={() => setView('signup')} 
                      className="text-[10px] font-black text-violet-600 hover:text-violet-700 uppercase tracking-[0.2em] transition-colors"
                    >
                      New Owner? Create Account
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setView('reset')} 
                      className="text-[10px] font-black text-slate-400 hover:text-violet-600 uppercase tracking-[0.2em] transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </>
                ) : (
                  <button 
                    type="button" 
                    onClick={() => { setView('login'); setError(''); }} 
                    className="text-[10px] font-black text-slate-400 hover:text-violet-600 uppercase tracking-[0.2em] transition-colors"
                  >
                    <i className="fas fa-arrow-left mr-2"></i>
                    Back to Sign In
                  </button>
                )}
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default Login;
