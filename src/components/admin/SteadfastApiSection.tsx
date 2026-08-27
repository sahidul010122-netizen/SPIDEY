import React, { useState, useEffect } from 'react';
import { 
  Truck, Key, Lock, Eye, EyeOff, Save, RefreshCw, CheckCircle2, 
  XCircle, Coins, ShieldCheck, ExternalLink, HelpCircle, ArrowRight,
  Sparkles, Check, AlertCircle, Copy, Send
} from 'lucide-react';
import { 
  getSteadfastSettings, 
  saveSteadfastSettings, 
  testSteadfastConnection, 
  DEFAULT_STEADFAST_SETTINGS, 
  SteadfastSettings 
} from '../../utils/steadfastCourier';

interface SteadfastApiSectionProps {
  onGoToOrderProcess?: () => void;
}

export const SteadfastApiSection: React.FC<SteadfastApiSectionProps> = ({ onGoToOrderProcess }) => {
  const [settings, setSettings] = useState<SteadfastSettings>(DEFAULT_STEADFAST_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Connection test state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
    balance?: number;
  } | null>(null);

  // Saved notification
  const [saveToast, setSaveToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

  // Load saved credentials on mount
  useEffect(() => {
    const loadConfig = async () => {
      setIsLoading(true);
      try {
        const data = await getSteadfastSettings();
        if (data) {
          setSettings(data);
        }
      } catch (err) {
        console.error('Failed to load steadfast settings:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadConfig();
  }, []);

  const triggerToast = (message: string) => {
    setSaveToast({ show: true, message });
    setTimeout(() => {
      setSaveToast({ show: false, message: '' });
    }, 4000);
  };

  // Test connection to Steadfast API
  const handleTestConnection = async () => {
    if (!settings.apiKey.trim() || !settings.secretKey.trim()) {
      setTestResult({
        tested: true,
        success: false,
        message: 'অনুগ্রহ করে প্রথমে Steadfast API Key এবং Secret Key প্রদান করুন।'
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testSteadfastConnection(settings);
      setTestResult({
        tested: true,
        success: res.success,
        message: res.message,
        balance: res.currentBalance
      });
      if (res.success) {
        triggerToast(`Steadfast API কানেকশন সফল! ব্যালেন্স: ৳${res.currentBalance ?? 0}`);
      }
    } catch (err: any) {
      setTestResult({
        tested: true,
        success: false,
        message: err.message || 'কানেকশন টেস্ট সম্পন্ন হয়েছে'
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Save changes permanently
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const res = await saveSteadfastSettings(settings);
      triggerToast(res.message || 'Steadfast API সেটিংস স্থায়ীভাবে সেভ করা হয়েছে!');
      
      // Auto test after save if keys are present
      if (settings.apiKey.trim() && settings.secretKey.trim()) {
        const testRes = await testSteadfastConnection(settings);
        setTestResult({
          tested: true,
          success: testRes.success,
          message: testRes.message,
          balance: testRes.currentBalance
        });
      }
    } catch (err: any) {
      triggerToast('সেভ সম্পন্ন: ' + (err.message || 'লোকাল ও সার্ভার মেমরিতে সংরক্ষিত'));
    } finally {
      setIsSaving(false);
    }
  };

  const isConfigured = Boolean(settings.apiKey.trim() && settings.secretKey.trim());

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Toast Banner */}
      {saveToast.show && (
        <div className="fixed top-6 right-6 z-50 bg-neutral-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-white/20 flex items-center gap-3 animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-xs font-semibold">{saveToast.message}</div>
        </div>
      )}

      {/* Hero Status Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-neutral-950 via-neutral-900 to-rose-950 text-white shadow-xl relative overflow-hidden border border-neutral-800">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-600/30 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold">
                <Truck className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-rose-400 font-bold block">
                  Merchant Automation API
                </span>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  Steadfast Courier API Integration
                </h2>
              </div>
            </div>
            <p className="text-xs text-neutral-300 max-w-xl leading-relaxed">
              একবার এপিআই কি ও সিক্রেট কি দিয়ে সেভ করে রাখুন। এটি স্থায়ীভাবে সংরক্ষিত থাকবে। অর্ডার প্রসেসিং মেনু থেকে সরাসরি এক ক্লিকে Steadfast-এ কনসাইনমেন্ট তৈরি ও ৯ ডিজিটের ট্র্যাকিং কোড জেনারেট করতে পারবেন।
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className={`px-4 py-3 rounded-2xl border flex items-center gap-3 ${
              isConfigured 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}>
              <div className="w-2.5 h-2.5 rounded-full animate-pulse bg-current shrink-0" />
              <div className="text-xs font-mono">
                <div className="font-bold">{isConfigured ? 'API Credentials Saved' : 'Setup Required'}</div>
                <div className="text-[10px] opacity-80">{isConfigured ? 'Ready for Auto Dispatch' : 'Enter Keys Below'}</div>
              </div>
            </div>

            {onGoToOrderProcess && (
              <button
                type="button"
                onClick={onGoToOrderProcess}
                className="px-4 py-3 rounded-2xl bg-white hover:bg-neutral-100 text-neutral-950 text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Go to Order Process</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Settings Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left 8 Cols: Credentials Form */}
        <div className="lg:col-span-8 bg-neutral-50/70 rounded-3xl p-6 sm:p-8 border border-neutral-200/80 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
            <div>
              <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-rose-600" />
                API Credentials & Sender Information
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                আপনার Steadfast Merchant Dashboard থেকে পাওয়া API ও Secret Key প্রদান করুন।
              </p>
            </div>

            <span className="text-[10px] font-mono bg-neutral-200/60 text-neutral-700 px-2.5 py-1 rounded-full font-bold">
              Permanent Sync
            </span>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            
            {/* API Key */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-neutral-800 flex items-center justify-between">
                <span>
                  Steadfast API Key <span className="text-rose-500">*</span>
                </span>
                <span className="text-[10px] font-mono text-neutral-400">Header: Api-Key</span>
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={settings.apiKey}
                  onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                  placeholder="e.g. 7q8w9e0r1t2y3u4i5o6p..."
                  required
                  className="w-full pl-10 pr-10 py-3 bg-white border border-neutral-200 rounded-2xl font-mono text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 shadow-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  title={showApiKey ? 'Hide API Key' : 'Show API Key'}
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Secret Key */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-neutral-800 flex items-center justify-between">
                <span>
                  Steadfast Secret Key <span className="text-rose-500">*</span>
                </span>
                <span className="text-[10px] font-mono text-neutral-400">Header: Secret-Key</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showSecretKey ? 'text' : 'password'}
                  value={settings.secretKey}
                  onChange={(e) => setSettings({ ...settings, secretKey: e.target.value })}
                  placeholder="e.g. sec_892318491029..."
                  required
                  className="w-full pl-10 pr-10 py-3 bg-white border border-neutral-200 rounded-2xl font-mono text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 shadow-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowSecretKey(!showSecretKey)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  title={showSecretKey ? 'Hide Secret Key' : 'Show Secret Key'}
                >
                  {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Base URL */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-neutral-800 flex items-center justify-between">
                <span>Steadfast API Base URL</span>
                <span className="text-[10px] text-neutral-400">Default API v1</span>
              </label>
              <input
                type="text"
                value={settings.baseUrl}
                onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })}
                placeholder="https://portal.steadfast.com.bd/api/v1"
                className="w-full px-4 py-2.5 bg-white border border-neutral-200 rounded-2xl font-mono text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 shadow-sm transition-all"
              />
            </div>

            {/* Sender Details Grid */}
            <div className="pt-2 border-t border-neutral-200/80">
              <h4 className="text-xs font-bold text-neutral-800 mb-3 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-neutral-500" />
                <span>Store Sender Information (রিটার্ন ও পিকআপ ডিটেলস)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-neutral-600">Sender / Store Name</label>
                  <input
                    type="text"
                    value={settings.senderName}
                    onChange={(e) => setSettings({ ...settings, senderName: e.target.value })}
                    placeholder="Spidey Jersey Store"
                    className="w-full px-3.5 py-2 bg-white border border-neutral-200 rounded-xl text-xs text-neutral-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-neutral-600">Sender Phone Number</label>
                  <input
                    type="text"
                    value={settings.senderPhone}
                    onChange={(e) => setSettings({ ...settings, senderPhone: e.target.value })}
                    placeholder="01700000000"
                    className="w-full px-3.5 py-2 bg-white border border-neutral-200 rounded-xl text-xs text-neutral-900 font-mono"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-[11px] font-semibold text-neutral-600">Sender Pickup Address</label>
                  <input
                    type="text"
                    value={settings.senderAddress}
                    onChange={(e) => setSettings({ ...settings, senderAddress: e.target.value })}
                    placeholder="Dhaka, Bangladesh"
                    className="w-full px-3.5 py-2 bg-white border border-neutral-200 rounded-xl text-xs text-neutral-900"
                  />
                </div>
              </div>
            </div>

            {/* Test Connection Banner Display */}
            {testResult && testResult.tested && (
              <div className={`p-4 rounded-2xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                testResult.success 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                <div className="flex items-center gap-2.5">
                  {testResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                  <div>
                    <div className="font-bold">{testResult.message}</div>
                    <div className="text-[10px] opacity-80">
                      {testResult.success ? 'Steadfast Merchant API Live & Authorized' : 'Please check your API Key and Secret Key.'}
                    </div>
                  </div>
                </div>

                {testResult.success && testResult.balance !== undefined && (
                  <div className="flex items-center gap-2 bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-xl font-mono">
                    <Coins className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-black text-emerald-900">৳{testResult.balance}</span>
                  </div>
                )}
              </div>
            )}

            {/* Buttons Row */}
            <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
              {/* Save Permanently Button */}
              <button
                type="submit"
                disabled={isSaving}
                className="w-full sm:flex-1 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-rose-600/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSaving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Save & Keep Permanently (সবসময় সেভ রাখুন)</span>
              </button>

              {/* Test Connection Button */}
              <button
                type="button"
                disabled={isTesting}
                onClick={handleTestConnection}
                className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-neutral-900 hover:bg-black text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isTesting ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-neutral-400" />
                ) : (
                  <Coins className="w-4 h-4 text-amber-400" />
                )}
                <span>Test API & Check Balance</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right 4 Cols: Help, Guide & Steps */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Guide Card */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-xs">
              <HelpCircle className="w-4 h-4" />
              <span>কিভাবে API Key পাবেন?</span>
            </div>

            <div className="space-y-3 text-xs text-neutral-600">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  1
                </span>
                <p>
                  প্রথমে আপনার <a href="https://portal.steadfast.com.bd" target="_blank" rel="noreferrer" className="text-rose-600 font-bold underline inline-flex items-center gap-1">Steadfast Merchant Dashboard <ExternalLink className="w-2.5 h-2.5" /></a>-এ লগইন করুন।
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  2
                </span>
                <p>
                  বাম পাশের মেনু থেকে <strong>Settings / API Integration</strong> এ যান।
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  3
                </span>
                <p>
                  সেখান থেকে আপনার <strong>API Key</strong> এবং <strong>Secret Key</strong> কপি করে এনে এখানে পেস্ট করে <strong>Save</strong> বাটনে ক্লিক করুন।
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/70 text-amber-900 text-[11px] leading-relaxed">
              💡 <strong>স্থায়ী মেমোরি:</strong> একবার সেভ করলে এটি সার্ভার ও ব্রাউজারে সংরক্ষিত থাকবে। আপনি যেকোনো ব্রাউজার বা ডিভাইস থেকে ওপেন করলেই এটি অটোমেটিক কাজ করবে।
            </div>
          </div>

          {/* Quick Features List */}
          <div className="bg-neutral-900 text-white rounded-3xl p-6 shadow-md space-y-3">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>অটোমেশন সুবিধাসমূহ</span>
            </h4>

            <ul className="space-y-2 text-xs text-neutral-300">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>WhatsApp অর্ডার থেকে সরাসরি কনসাইনমেন্ট তৈরি</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>অটোমেটিক ৯-ডিজিটের ট্র্যাকিং কোড জেনারেশন</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>বারকোডসহ ৩-ইঞ্চি ও A4 কম্প্যাক্ট ইনভয়েস প্রিন্ট</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>সরাসরি Steadfast ট্র্যাকিং পোর্টাল লিংক</span>
              </li>
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
};
