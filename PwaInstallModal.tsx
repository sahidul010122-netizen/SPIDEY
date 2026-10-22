import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Smartphone, 
  Laptop, 
  CheckCircle2, 
  Share, 
  PlusSquare, 
  KeyRound, 
  ShieldCheck, 
  ExternalLink, 
  X, 
  Sparkles,
  ArrowRight,
  Monitor,
  Check
} from 'lucide-react';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onPromptInstall: () => void;
  isStandalone: boolean;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onPromptInstall,
  isStandalone
}) => {
  const [platform, setPlatform] = useState<'android' | 'ios' | 'desktop'>('android');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(userAgent)) {
        setPlatform('ios');
      } else if (/android/.test(userAgent)) {
        setPlatform('android');
      } else {
        setPlatform('desktop');
      }
    }
  }, []);

  if (!isOpen) return null;

  const adminDirectUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/?view=admin&pwa=1`
    : 'https://.../?view=admin&pwa=1';

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(adminDirectUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div
      id="pwa-install-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
    >
      <div
        id="pwa-install-modal"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#0d0f12] text-white rounded-3xl border border-white/10 shadow-2xl overflow-hidden my-auto select-none"
      >
        {/* Top Header Card */}
        <div className="p-5 sm:p-6 bg-gradient-to-b from-neutral-900 to-[#0d0f12] border-b border-white/10 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#e50914] flex items-center justify-center text-white font-mono font-black text-lg shadow-lg shadow-red-600/30">
                S
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold tracking-tight">
                    Spidey Admin Web App
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    PWA Ready
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  ইনস্টল করুন এবং ১-ক্লিকে সরাসরি পাসওয়ার্ড-প্রটেক্টেড অ্যাডমিন প্যানেলে প্রবেশ করুন
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Platform Tab Switcher */}
          <div className="flex rounded-2xl bg-neutral-950/80 p-1.5 mt-5 text-xs font-bold border border-white/5">
            <button
              type="button"
              onClick={() => setPlatform('android')}
              className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                platform === 'android'
                  ? 'bg-[#e50914] text-white shadow-md font-extrabold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android / Chrome</span>
            </button>
            <button
              type="button"
              onClick={() => setPlatform('ios')}
              className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                platform === 'ios'
                  ? 'bg-[#e50914] text-white shadow-md font-extrabold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>iPhone / iOS</span>
            </button>
            <button
              type="button"
              onClick={() => setPlatform('desktop')}
              className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                platform === 'desktop'
                  ? 'bg-[#e50914] text-white shadow-md font-extrabold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Laptop / PC</span>
            </button>
          </div>
        </div>

        {/* Modal Body & Step-by-Step Instructions */}
        <div className="p-5 sm:p-6 space-y-5">
          
          {/* Standalone Status Alert */}
          {isStandalone ? (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold">অ্যাপটি ইতোমধ্যে স্ট্যান্ডঅ্যালোন অ্যাপ হিসেবে চলছে!</p>
                <p className="text-[11px] text-emerald-300/80 mt-0.5">
                  প্রতিবার আইকনে ট্যাপ করলে আপনি সরাসরি এই অ্যাডমিন প্যানেলেই প্রবেশ করবেন।
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Direct 1-Click Install Button if Browser Supports beforeinstallprompt */}
              {deferredPrompt && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/40 to-neutral-900 border border-red-500/30 text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-red-300">
                    <Sparkles className="w-4 h-4 text-red-400" />
                    <span>১-ক্লিক অটো ইনস্টলেশন সাপোর্ট প্রস্তুত</span>
                  </div>
                  <button
                    type="button"
                    onClick={onPromptInstall}
                    className="w-full py-3.5 rounded-2xl bg-[#e50914] hover:bg-red-700 text-white font-extrabold text-xs shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 active:scale-98 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>সরাসরি অ্যাপ ইনস্টল করুন (Install Now)</span>
                  </button>
                </div>
              )}
            </>
          )}

          {/* Platform Specific Step-by-Step Guide */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-neutral-300 uppercase tracking-wider">
              {platform === 'ios' && 'iPhone / iPad (Safari) ইনস্টল নির্দেশিকা:'}
              {platform === 'android' && 'Android মোবাইল (Chrome/Browser) নির্দেশিকা:'}
              {platform === 'desktop' && 'ল্যাপটপ / কম্পিউটার (Chrome / Edge) নির্দেশিকা:'}
            </h3>

            {platform === 'ios' && (
              <div className="space-y-2.5 text-xs text-neutral-300">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/10 text-white flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-white">Safari ব্রাউজারের নিচের 'Share' বাটনে ট্যাপ করুন</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1">
                      <Share className="w-3.5 h-3.5 text-blue-400 inline" /> বক্সের উপর তীর চিহ্নযুক্ত আইকন
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/10 text-white flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-white">মেনু থেকে 'Add to Home Screen' সিলেক্ট করুন</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1">
                      <PlusSquare className="w-3.5 h-3.5 text-emerald-400 inline" /> হোম স্ক্রিনে যোগ করুন অপশন
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/10 text-white flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-white">উপরে ডানদিকের 'Add' বাটনে ট্যাপ করুন</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      আপনার হোম স্ক্রিনে স্পাইডি অ্যাডমিনের অ্যাপ আইকন তৈরি হয়ে যাবে!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {platform === 'android' && (
              <div className="space-y-2.5 text-xs text-neutral-300">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/10 text-white flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-white">Chrome ব্রাউজারের উপরে ডানদিকের (⋮) ৩-ডট মেনুতে ট্যাপ করুন</p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/10 text-white flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-white">'Install App' অথবা 'Add to Home screen' এ ক্লিক করুন</p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/10 text-white flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-white">পপআপ আসলে 'Install' নিশ্চিত করুন</p>
                  </div>
                </div>
              </div>
            )}

            {platform === 'desktop' && (
              <div className="space-y-2.5 text-xs text-neutral-300">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/10 text-white flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-white">Chrome বা Edge এর URL বারের ডানপাশের 'Install App' আইকনটিতে ক্লিক করুন</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      URL বারের ডানে ছোট কম্পিউটার বা প্লাস ডাউনলোড আইকন দেখা যাবে।
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/10 text-white flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-white">'Install' বাটনে ক্লিক করলেই উইন্ডোজ/ম্যাক অ্যাপ হিসেবে ওপেন হবে</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      ডেস্কটপ ও টাস্কবারে ডেডিকেটেড শর্টকাট যুক্ত হবে।
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Key Feature Highlights */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5 text-xs">
            <div className="flex items-center gap-2 text-white font-extrabold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>ডিরেক্ট এক্সেস ও পাসওয়ার্ড সিকিউরিটি সুবিধা:</span>
            </div>
            <ul className="space-y-1.5 text-neutral-300 text-[11px]">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#e50914]" />
                <span><strong>ডিরেক্ট অ্যাডমিন এন্ট্রি:</strong> অ্যাপ আইকনে ট্যাপ করলে হোমপেজ না গিয়ে সরাসরি অ্যাডমিন প্যানেল ওপেন হবে।</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span><strong>অটো-লগইন মেমোরি:</strong> এই ডিভাইসে একবার পাসওয়ার্ড দিয়ে রাখলে প্রতিবার আর লগইন চাওয়া হবে না।</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                <span><strong>লাইভ স্টোর ভিজিট:</strong> যেকোনো সময় অ্যাডমিন প্যানেলের "View Store" থেকে পাবলিক সাইট দেখা যাবে।</span>
              </li>
            </ul>
          </div>

          {/* Direct Link Copier */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-neutral-950 border border-white/10">
            <div className="truncate text-xs font-mono text-neutral-400">
              {adminDirectUrl}
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold shrink-0 transition-all flex items-center gap-1.5"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copied!</span>
                </>
              ) : (
                <span>Copy URL</span>
              )}
            </button>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-neutral-950/80 border-t border-white/10 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
          >
            বুঝেছি (Close)
          </button>

          <button
            type="button"
            onClick={() => {
              window.open(adminDirectUrl, '_blank');
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-[#e50914] hover:bg-red-700 text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-red-600/30 transition-all"
          >
            <span>Open Direct in New Tab</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
