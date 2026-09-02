import React, { useState, useEffect } from 'react';
import { 
  Truck, Key, Lock, Eye, EyeOff, Save, RefreshCw, CheckCircle2, 
  XCircle, Coins, ArrowRight
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
        message: 'Please enter both Steadfast API Key and Secret Key.'
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
        triggerToast(`Steadfast API connected! Balance: ৳${res.currentBalance ?? 0}`);
      }
    } catch (err: any) {
      setTestResult({
        tested: true,
        success: false,
        message: err.message || 'Connection test failed'
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Save changes
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const res = await saveSteadfastSettings(settings);
      triggerToast(res.message || 'Steadfast API settings saved successfully!');
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('spidey-steadfast-updated', { detail: { settings } }));
      }

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
      triggerToast('Saved: ' + (err.message || 'Stored successfully'));
    } finally {
      setIsSaving(false);
    }
  };

  const isConfigured = Boolean(settings.apiKey.trim() && settings.secretKey.trim());

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toast Banner */}
      {saveToast.show && (
        <div className="fixed top-6 right-6 z-50 bg-neutral-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-white/20 flex items-center gap-3 animate-slideUp">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-xs font-semibold">{saveToast.message}</div>
        </div>
      )}

      {/* Clear Header: "SteFast Courier API" with a very brief one-line subtitle */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-neutral-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-neutral-900 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Truck className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-neutral-900 tracking-tight">
              SteFast Courier API
            </h2>
            <p className="text-xs text-neutral-500">
              Direct merchant API integration for automated consignment creation and 9-digit tracking codes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono border ${
            isConfigured 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {isConfigured ? 'API Configured' : 'Setup Required'}
          </span>
          {onGoToOrderProcess && (
            <button
              onClick={onGoToOrderProcess}
              className="px-3.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
            >
              <span>Order Process</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Clean API Credentials Form */}
      <div className="p-6 sm:p-8 bg-white rounded-3xl border border-neutral-200/80 shadow-xs space-y-6">
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
                placeholder="Enter Steadfast API Key"
                required
                className="w-full pl-10 pr-10 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl font-mono text-xs text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:outline-none focus:border-neutral-900 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 absolute right-3 top-1/2 -translate-y-1/2 transition-colors cursor-pointer"
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
                placeholder="Enter Steadfast Secret Key"
                required
                className="w-full pl-10 pr-10 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl font-mono text-xs text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:outline-none focus:border-neutral-900 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowSecretKey(!showSecretKey)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 absolute right-3 top-1/2 -translate-y-1/2 transition-colors cursor-pointer"
                title={showSecretKey ? 'Hide Secret Key' : 'Show Secret Key'}
              >
                {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Base URL */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-800 flex items-center justify-between">
              <span>API Base URL</span>
              <span className="text-[10px] text-neutral-400">Default: https://portal.steadfast.com.bd/api/v1</span>
            </label>
            <input
              type="text"
              value={settings.baseUrl}
              onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })}
              placeholder="https://portal.steadfast.com.bd/api/v1"
              className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-2xl font-mono text-xs text-neutral-800 placeholder:text-neutral-400 focus:bg-white focus:outline-none focus:border-neutral-900 transition-all"
            />
          </div>

          {/* Test Connection Banner */}
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
                  <div className="font-bold">{typeof testResult.message === 'string' ? testResult.message : JSON.stringify(testResult.message)}</div>
                  <div className="text-[10px] opacity-80">
                    {testResult.success ? 'Steadfast Merchant API Live & Authorized' : 'Check your credentials.'}
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

          {/* Simplified Buttons: Save Changes & Test API & Balance */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:flex-1 py-3.5 rounded-2xl bg-neutral-900 hover:bg-black disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSaving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4 text-emerald-400" />
              )}
              <span>Save Changes</span>
            </button>

            <button
              type="button"
              disabled={isTesting}
              onClick={handleTestConnection}
              className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-neutral-200"
            >
              {isTesting ? (
                <RefreshCw className="w-4 h-4 animate-spin text-neutral-500" />
              ) : (
                <Coins className="w-4 h-4 text-amber-500" />
              )}
              <span>Test API & Balance</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
