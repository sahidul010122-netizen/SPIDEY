import React, { useState, useEffect } from 'react';
import { Tag, Copy, Check, X, Sparkles, Gift } from 'lucide-react';
import { SiteSettings } from '../types/settings';

interface CouponPopupProps {
  siteSettings: SiteSettings;
  onApplyCouponToCart?: (code: string) => void;
}

export const CouponPopup: React.FC<CouponPopupProps> = ({
  siteSettings,
  onApplyCouponToCart
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const isEnabled = siteSettings.enableCouponPopup !== false;
  const delaySecs = typeof siteSettings.couponPopupDelaySeconds === 'number' 
    ? siteSettings.couponPopupDelaySeconds 
    : 10;
  const couponCode = siteSettings.couponPopupCode || 'SPIDEY50';
  const title = siteSettings.couponPopupTitle || 'স্পেশাল ডিসকাউন্ট অফার!';
  const subtitle = siteSettings.couponPopupSubtitle || 'আজকের অর্ডারে উপভোগ করুন ৫০৳ বিশেষ ছাড়!';

  useEffect(() => {
    if (!isEnabled) return;

    // Check if user already dismissed it in this browser session
    try {
      const dismissed = sessionStorage.getItem('spidey_coupon_popup_dismissed');
      if (dismissed === 'true') {
        return;
      }
    } catch {}

    const timer = setTimeout(() => {
      setIsOpen(true);
    }, Math.max(1, delaySecs) * 1000);

    return () => clearTimeout(timer);
  }, [isEnabled, delaySecs]);

  const handleClose = () => {
    setIsOpen(false);
    try {
      sessionStorage.setItem('spidey_coupon_popup_dismissed', 'true');
    } catch {}
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(couponCode);
    setIsCopied(true);
    if (onApplyCouponToCart) {
      onApplyCouponToCart(couponCode);
    }
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleApplyAndShop = () => {
    handleCopy();
    handleClose();
  };

  if (!isOpen || !isEnabled) return null;

  return (
    <div 
      onClick={handleClose}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm bg-[#141418] text-neutral-100 rounded-3xl p-6 shadow-2xl border border-white/10 text-center space-y-4 animate-in zoom-in-95 duration-200 overflow-hidden"
      >
        {/* Subtle decorative background gradient */}
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-red-600/20 rounded-full blur-xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-28 h-28 bg-red-900/20 rounded-full blur-xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-3.5 right-3.5 p-1 rounded-full text-neutral-400 hover:text-white transition-colors cursor-pointer"
          title="বন্ধ করুন"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Gift Icon Badge */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 text-white mx-auto flex items-center justify-center shadow-lg shadow-red-600/25">
          <Gift className="w-7 h-7 text-white" />
        </div>

        {/* Heading & Subtitle */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-600/15 text-red-400 text-[10px] font-extrabold uppercase tracking-wider border border-red-500/30">
            <Sparkles className="w-3 h-3" />
            <span>সীমিত সময়ের অফার</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-neutral-400 max-w-[280px] mx-auto leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Coupon Code Display Box */}
        <div className="p-3 rounded-2xl bg-[#0e0e12] border border-white/10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Tag className="w-4 h-4 text-red-400 shrink-0" />
            <span className="font-mono font-black text-sm tracking-wider text-white truncate">
              {couponCode}
            </span>
          </div>

          <button
            onClick={handleCopy}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer select-none active:scale-95 ${
              isCopied
                ? 'bg-emerald-600 text-white'
                : 'bg-[#1f1f27] hover:bg-[#2a2a35] text-white border border-white/10 shadow-xs'
            }`}
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>কপি হয়েছে!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>কপি করুন</span>
              </>
            )}
          </button>
        </div>

        {/* Bottom Action */}
        <button
          onClick={handleApplyAndShop}
          className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold shadow-md shadow-red-600/25 transition-all cursor-pointer active:scale-98"
        >
          কুপন ব্যবহার করে শপিং করুন
        </button>
      </div>
    </div>
  );
};
