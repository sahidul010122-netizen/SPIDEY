import React, { useState } from 'react';
import { 
  Smartphone, 
  Copy, 
  Check, 
  ExternalLink, 
  Download, 
  Share2, 
  ShieldCheck, 
  CheckCircle2, 
  Monitor, 
  Apple, 
  Sparkles,
  QrCode
} from 'lucide-react';

interface PlaceOrderInstallSectionProps {
  deferredPrompt?: any;
  onPromptInstall?: () => void;
}

export const PlaceOrderInstallSection: React.FC<PlaceOrderInstallSectionProps> = ({
  deferredPrompt,
  onPromptInstall
}) => {
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Dedicated Official Link as requested by user
  const officialUrl = 'https://spyderc.site/placeorder';
  
  // Current host fallback for live preview / local testing
  const currentHostUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/placeorder` 
    : officialUrl;

  const handleCopy = (url: string, label: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(label);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  return (
    <div className="space-y-6">
      
      {/* =========================================================================
          HERO BANNER: DEDICATED LINK & PWA EXPLANATION
          ========================================================================= */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#0d0f12] text-white shadow-2xl border border-neutral-800 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-600/20 border border-rose-500/30 text-rose-300 text-xs font-bold mb-4">
            <Smartphone className="w-3.5 h-3.5" />
            <span>PWA Shortcut & Operational Portal</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2">
            Place Order Shortcut & PWA Install (ডেডিকেটেড লিঙ্ক)
          </h2>

          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
            আপনার ওয়েবসাইটের হোমপেজের পাবলিক হেডার থেকে <strong>Place Order</strong> বাটনটি সরাসরি হাইড করে দেওয়া হয়েছে, 
            যাতে সাধারণ ভিজিটররা বিভ্রান্ত না হয়। নিচে থাকা ডেডিকেটেড লিঙ্কটি কপি করে আপনার এজেন্ট, স্টাফ বা অর্ডার অপারেটরদের কাছে পাঠান। 
            তারা এই লিঙ্কে প্রবেশ করে তাদের মোবাইল বা ল্যাপটপে এক ক্লিকেই <strong>PWA Shortcut App</strong> ইনস্টল করে দ্রুত কাজ করতে পারবে।
          </p>
        </div>
      </div>

      {/* =========================================================================
          LINK CARDS (OFFICIAL & CURRENT HOST)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Card 1: Official Domain Link */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-neutral-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-neutral-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-600" />
                অফিসিয়াল ডেডিকেটেড লিঙ্ক (Production Domain)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 font-bold">
                spyderc.site
              </span>
            </div>
            
            <p className="text-xs text-neutral-500 mb-3">
              এই লিঙ্কটি স্টাফদের হোয়াটসঅ্যাপ বা ইনবক্সে শেয়ার করুন ইনস্টল করার জন্য:
            </p>

            <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-between gap-2 overflow-hidden">
              <span className="font-mono text-xs sm:text-sm font-black text-neutral-900 select-all truncate">
                {officialUrl}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => handleCopy(officialUrl, 'official')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
                copiedLink === 'official'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-neutral-900 hover:bg-black text-white active:scale-95'
              }`}
            >
              {copiedLink === 'official' ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>লিঙ্ক কপি হয়েছে! (Copied)</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Link</span>
                </>
              )}
            </button>

            <a
              href={officialUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-100 text-neutral-700 transition-all flex items-center justify-center"
              title="Open link"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Card 2: Current Host Link (Testing / Preview) */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-neutral-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-neutral-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                বর্তমান প্রিভিউ লিঙ্ক (Current Active Origin)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-100">
                Live URL
              </span>
            </div>
            
            <p className="text-xs text-neutral-500 mb-3">
              বর্তমান ব্রাউজারে টেস্ট করতে বা প্রিভিউ ডিভাইসে তাৎক্ষণিক ইনস্টল করতে:
            </p>

            <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-between gap-2 overflow-hidden">
              <span className="font-mono text-xs sm:text-sm font-black text-neutral-900 select-all truncate">
                {currentHostUrl}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => handleCopy(currentHostUrl, 'currenthost')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
                copiedLink === 'currenthost'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-neutral-900 hover:bg-black text-white active:scale-95'
              }`}
            >
              {copiedLink === 'currenthost' ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>লিঙ্ক কপি হয়েছে! (Copied)</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Preview Link</span>
                </>
              )}
            </button>

            <a
              href="/placeorder"
              target="_blank"
              rel="noreferrer"
              className="p-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-100 text-neutral-700 transition-all flex items-center justify-center"
              title="Test Open in New Tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

      </div>

      {/* =========================================================================
          STEP-BY-STEP DEVICE INSTALLATION GUIDE
          ========================================================================= */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white border border-neutral-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
          <div>
            <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wide flex items-center gap-2">
              <Download className="w-4 h-4 text-rose-600" />
              <span>ডিভাইস অনুযায়ী সহজে শর্টকাট অ্যাপ ইনস্টল করার নিয়ম (PWA Guide)</span>
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              লিঙ্কে প্রবেশের পর নিচের ধাপগুলো অনুসরণ করে ১ ক্লিকেই মোবাইলে বা পিসিতে অ্যাপ আইকন তৈরি করে নেওয়া যাবে
            </p>
          </div>

          {onPromptInstall && (
            <button
              type="button"
              onClick={onPromptInstall}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-md shadow-rose-600/20 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Install PWA Now</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* 1. Android Guide */}
          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-3">
            <div className="flex items-center gap-2 text-neutral-900 font-extrabold text-xs">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-mono font-black">
                🤖
              </div>
              <span>Android (Google Chrome)</span>
            </div>

            <ol className="text-xs text-neutral-600 space-y-2 list-decimal list-inside leading-relaxed">
              <li>
                ক্রোম ব্রাউজারে লিঙ্কটি ওপেন করুন (যেমন: <strong>spyderc.site/placeorder</strong>)।
              </li>
              <li>
                উপরে ডানে ৩-ডট মেনুতে (<strong className="font-mono">⋮</strong>) ট্যাপ করুন।
              </li>
              <li>
                <strong>"Install app"</strong> অথবা <strong>"Add to Home screen"</strong> চাপুন।
              </li>
              <li>
                হোম স্ক্রিনে সরাসরি <strong className="text-neutral-900">Spidey Place Order</strong> শর্টকাট অ্যাপ আইকন তৈরি হয়ে যাবে!
              </li>
            </ol>
          </div>

          {/* 2. iPhone / iPad Guide */}
          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-3">
            <div className="flex items-center gap-2 text-neutral-900 font-extrabold text-xs">
              <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center text-xs font-mono font-black">
                🍏
              </div>
              <span>iPhone / iPad (Safari)</span>
            </div>

            <ol className="text-xs text-neutral-600 space-y-2 list-decimal list-inside leading-relaxed">
              <li>
                Apple Safari ব্রাউজারে লিঙ্কটি ওপেন করুন।
              </li>
              <li>
                নিচের বার থেকে শেয়ার আইকনে (<strong>Share ⎋</strong>) চাপ দিন।
              </li>
              <li>
                মেনুটি স্ক্রল করে <strong>"Add to Home Screen"</strong> অপশন সিলেক্ট করুন।
              </li>
              <li>
                উপরে ডানে <strong>"Add"</strong> বাটনে ট্যাপ করলে হোম স্ক্রিনে অ্যাপ আকারে সেভ হবে।
              </li>
            </ol>
          </div>

          {/* 3. Windows / Mac / Desktop */}
          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-3">
            <div className="flex items-center gap-2 text-neutral-900 font-extrabold text-xs">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-mono font-black">
                💻
              </div>
              <span>Laptop / Desktop (Chrome/Edge)</span>
            </div>

            <ol className="text-xs text-neutral-600 space-y-2 list-decimal list-inside leading-relaxed">
              <li>
                Chrome বা Edge ব্রাউজারে লিঙ্কটি ওপেন করুন।
              </li>
              <li>
                ব্রাউজারের অ্যাড্রেস বারের ডানপাশে থাকা <strong>Install (⊕)</strong> আইকনে ক্লিক করুন।
              </li>
              <li>
                অথবা ব্রাউজার মেনু (<strong className="font-mono">⋮</strong>) থেকে <strong>"Save and Share"</strong> &rarr; <strong>"Install page as app"</strong> সিলেক্ট করুন।
              </li>
              <li>
                ডেস্কটপে আলাদা উইন্ডোতে ফুলস্ক্রিন অ্যাপের মতো দ্রুত কাজ করতে পারবেন।
              </li>
            </ol>
          </div>

        </div>

        {/* Security & Access Advantage Box */}
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">গোপনীয়তা ও ব্যবহারের সুবিধা:</span>
            <p className="text-amber-800 leading-relaxed">
              সাধারণ ওয়েবসাইট ভিজিটররা এই লিঙ্ক বা শর্টকাট দেখতে পাবে না। শুধুমাত্র আপনার মনোনীত লোকজনের কাছে এই লিঙ্কটি থাকবে, 
              যার ফলে অপ্রয়োজনীয় ভিজিটর ছাড়াই আপনার টিম নির্বিঘ্নে দ্রুত কাস্টমারদের অর্ডার এন্ট্রি সম্পন্ন করতে পারবে।
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
