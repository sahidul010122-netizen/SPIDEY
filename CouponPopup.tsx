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
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-neutral-200 text-center space-y-4 animate-in zoom-in-95 duration-200 overflow-hidden"
      >
        {/* Subtle decorative background gradient */}
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-rose-500/10 rounded-full blur-xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-28 h-28 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-3.5 right-3.5 p-1 rounded-full text-neutral-400 hover:text-neutral-900 transition-colors cursor-pointer"
          title="বন্ধ করুন"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Gift Icon Badge */}
        <div className="w-14 h-14 rounded-2xl bg-neutral-900 text-white mx-auto flex items-center justify-center shadow-lg shadow-neutral-900/20">
          <Gift className="w-7 h-7 text-amber-300" />
        </div>

        {/* Heading & Subtitle */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-extrabold uppercase tracking-wider border border-rose-200">
            <Sparkles className="w-3 h-3" />
            <span>সীমিত সময়ের অফার</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-neutral-900 tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-neutral-500 max-w-[280px] mx-auto leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Coupon Code Display Box */}
        <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200/90 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Tag className="w-4 h-4 text-neutral-400 shrink-0" />
            <span className="font-mono font-black text-sm tracking-wider text-neutral-900 truncate">
              {couponCode}
            </span>
          </div>

          <button
            onClick={handleCopy}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer select-none active:scale-95 ${
              isCopied
                ? 'bg-emerald-600 text-white'
                : 'bg-neutral-900 hover:bg-black text-white shadow-xs'
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
          className="w-full py-3 rounded-2xl bg-neutral-900 hover:bg-black active:bg-neutral-800 text-white text-xs font-extrabold shadow-md shadow-neutral-900/20 transition-all cursor-pointer"
        >
          কুপন ব্যবহার করে শপিং করুন
        </button>
      </div>
    </div>
  );
};
