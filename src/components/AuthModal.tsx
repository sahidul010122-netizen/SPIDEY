import React, { useState } from 'react';
import { Mail, User, ArrowRight, Check, Sparkles } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdminLoginSuccess: () => void;
  onCustomerLoginSuccess: (user: { name: string; email: string }) => void;
  adminGmail: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAdminLoginSuccess,
  onCustomerLoginSuccess,
  adminGmail
}) => {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const targetAdminEmail = (adminGmail || 'sahidul010122@gmail.com').trim().toLowerCase();

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = fullName.trim() || trimmedEmail.split('@')[0];

    if (!trimmedEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    // Check if the entered email matches the admin's secret Gmail
    if (trimmedEmail === targetAdminEmail) {
      setSuccessMsg('Connecting to account...');
      setTimeout(() => {
        onAdminLoginSuccess();
        onClose();
      }, 500);
      return;
    }

    // Normal customer login or signup
    // The customer stays strictly on the storefront without accessing the admin page
    setSuccessMsg(`Welcome, ${trimmedName}! You are signed in.`);
    setTimeout(() => {
      onCustomerLoginSuccess({ name: trimmedName, email: trimmedEmail });
      onClose();
    }, 600);
  };

  return (
    <div
      id="auth-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        id="auth-modal-card"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl border border-neutral-200/90 shadow-2xl overflow-hidden my-auto"
      >
        {/* Header with Red Accent */}
        <div className="p-6 sm:p-7 bg-neutral-900 text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded bg-[#e50914] text-white text-[11px] font-bold tracking-wider font-mono uppercase">
                orifake
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-white text-xs tracking-wider uppercase font-mono"
            >
              ✕ Close
            </button>
          </div>

          <h2 className="text-xl font-bold mt-4 tracking-tight">
            {activeTab === 'signin' ? 'Sign In to Your Account' : 'Create an Account'}
          </h2>
          <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
            Enter your email address to access your drops, saved items, and order preferences.
          </p>

          {/* Clean Sign In / Sign Up Selector */}
          <div className="flex rounded-xl bg-neutral-800 p-1 mt-5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                activeTab === 'signin'
                  ? 'bg-white text-neutral-900 shadow-sm font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('signup');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                activeTab === 'signup'
                  ? 'bg-white text-neutral-900 shadow-sm font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-7 space-y-4">
          
          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-3.5">
            {activeTab === 'signup' && (
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-none focus:border-neutral-900 text-neutral-900"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  autoFocus
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-none focus:border-neutral-900 text-neutral-900 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <span>{activeTab === 'signin' ? 'Continue with Email' : 'Create Account'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="pt-2 text-center">
            <p className="text-[11px] text-neutral-400">
              By continuing, you agree to ORIFAKE terms and privacy policy.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
