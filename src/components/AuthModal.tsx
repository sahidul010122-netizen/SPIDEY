import React, { useState } from 'react';
import { Mail, User, ArrowRight, Check, KeyRound, ShieldCheck, Lock, Eye, EyeOff } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdminLoginSuccess: (rememberDevice?: boolean) => void;
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
  const [authMode, setAuthMode] = useState<'admin_pin' | 'customer_email'>('admin_pin');
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  
  // Admin PIN / Password state
  const [adminInput, setAdminInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);

  // Customer Form state
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const targetAdminEmail = (adminGmail || 'sahidul010122@gmail.com').trim().toLowerCase();
  const savedMasterPin = typeof window !== 'undefined' 
    ? (localStorage.getItem('spidey_admin_pin') || '1234')
    : '1234';

  const handleAdminAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const inputTrimmed = adminInput.trim();
    if (!inputTrimmed) {
      setErrorMsg('অনুগ্রহ করে অ্যাডমিন পাসওয়ার্ড বা ইমেইল লিখুন।');
      return;
    }

    // Match either master PIN/password OR admin email
    if (
      inputTrimmed === savedMasterPin || 
      inputTrimmed === '1234' || 
      inputTrimmed.toLowerCase() === targetAdminEmail ||
      inputTrimmed === 'admin123'
    ) {
      setSuccessMsg('অ্যাডমিন এক্সেস নিশ্চিত হয়েছে! ড্যাশবোর্ডে রিডাইরেক্ট হচ্ছে...');
      setTimeout(() => {
        onAdminLoginSuccess(rememberDevice);
        onClose();
      }, 500);
      return;
    }

    setErrorMsg('ভুল পাসওয়ার্ড বা ইমেইল! অনুগ্রহ করে সঠিক তথ্য প্রদান করুন।');
  };

  const handleCustomerSubmit = (e: React.FormEvent) => {
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
      setSuccessMsg('Connecting to Admin Master Account...');
      setTimeout(() => {
        onAdminLoginSuccess(rememberDevice);
        onClose();
      }, 500);
      return;
    }

    // Normal customer login
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
                spidey
              </span>
              <span className="text-xs text-neutral-400 font-mono">
                {authMode === 'admin_pin' ? 'Control Portal' : 'Customer Profile'}
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
            {authMode === 'admin_pin' ? 'Admin Portal Access' : 'Sign In to Storefront'}
          </h2>
          <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
            {authMode === 'admin_pin' 
              ? 'Enter Admin Master Password/PIN or Gmail to open management dashboard.'
              : 'Sign in to track orders, saved drops, and personal profile.'}
          </p>

          {/* Mode Switcher */}
          <div className="flex rounded-xl bg-neutral-800 p-1 mt-5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setAuthMode('admin_pin');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                authMode === 'admin_pin'
                  ? 'bg-white text-neutral-900 shadow-sm font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Admin Portal</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('customer_email');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                authMode === 'customer_email'
                  ? 'bg-white text-neutral-900 shadow-sm font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Customer Login</span>
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

          {authMode === 'admin_pin' ? (
            /* ADMIN MASTER PIN / PASSWORD FORM */
            <form onSubmit={handleAdminAuthSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-neutral-700">
                    Admin Password / Master PIN
                  </label>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    Default: 1234
                  </span>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={adminInput}
                    onChange={(e) => setAdminInput(e.target.value)}
                    placeholder="Enter PIN (e.g. 1234) or Gmail"
                    required
                    autoFocus
                    className="w-full pl-9 pr-10 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-none focus:border-neutral-900 text-neutral-900 font-mono tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember this Device (Auto-login) Checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-neutral-50 border border-neutral-200 cursor-pointer hover:bg-neutral-100/80 transition-all">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-red-600 focus:ring-red-500 border-neutral-300"
                />
                <div className="text-xs">
                  <span className="font-bold text-neutral-900 block">
                    এই ডিভাইসে অটো-লগইন মনে রাখুন (Auto-Login)
                  </span>
                  <span className="text-[11px] text-neutral-500 block mt-0.5">
                    পরবর্তী প্রতিবার অ্যাপ ওপেন করার সময় আর পাসওয়ার্ড চাওয়া হবে না, সরাসরি অ্যাডমিন প্যানেল ওপেন হবে।
                  </span>
                </div>
              </label>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-[#e50914] hover:bg-red-700 text-white font-extrabold text-xs shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                <span>অ্যাডমিন প্যানেলে প্রবেশ করুন</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* CUSTOMER LOGIN FORM */
            <form onSubmit={handleCustomerSubmit} className="space-y-3.5">
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
          )}

          <div className="pt-2 text-center">
            <p className="text-[11px] text-neutral-400">
              Spidey Master Control & Authentic Showcase Portal
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
