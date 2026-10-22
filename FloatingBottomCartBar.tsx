import React from 'react';
import { ShoppingBag, ArrowRight, Sparkles, Check, ChevronRight } from 'lucide-react';
import { CartItem } from '../types';
import { CurrencyCode, formatPrice } from '../utils/currency';

interface FloatingBottomCartBarProps {
  items: CartItem[];
  onOpenCart: () => void;
  currency: CurrencyCode;
}

export const FloatingBottomCartBar: React.FC<FloatingBottomCartBarProps> = ({
  items = [],
  onOpenCart,
  currency
}) => {
  if (!items || items.length === 0) return null;

  // Latest added item is shown first
  const latestItem = items[0];
  const totalQuantity = items.reduce((acc, it) => acc + (it.quantity || 1), 0);
  const subtotal = items.reduce((acc, it) => {
    const price = it.product?.price || 0;
    const custom = it.customizationFee || 0;
    return acc + (price + custom) * (it.quantity || 1);
  }, 0);

  const thumbnail = latestItem?.product?.images?.[0] || '';
  const customInfo = [latestItem?.customName, latestItem?.customNumber].filter(Boolean).join(' ');

  return (
    <div
      id="floating-bottom-slide-cart"
      onClick={onOpenCart}
      role="button"
      tabIndex={0}
      aria-label="Open Cart"
      className="fixed bottom-3 sm:bottom-4 inset-x-3 sm:inset-x-auto sm:right-6 sm:max-w-lg z-40 cursor-pointer select-none group"
    >
      <div className="relative overflow-hidden rounded-2xl bg-neutral-900/95 backdrop-blur-md text-white border border-neutral-700/80 shadow-[0_12px_36px_rgba(0,0,0,0.45)] px-3.5 py-2.5 sm:px-4 sm:py-3 transition-all duration-300 hover:scale-[1.01] hover:border-neutral-500 hover:shadow-[0_16px_40px_rgba(0,0,0,0.55)] active:scale-[0.99] flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5 duration-300">
        
        {/* Subtle accent line at the top */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 via-amber-400 to-emerald-400 opacity-80" />

        {/* Left: Thumbnail & Item details */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          {/* Small Product Image */}
          <div className="relative shrink-0">
            {thumbnail ? (
              <img
                src={thumbnail}
                alt={latestItem?.product?.title || 'Product'}
                referrerPolicy="no-referrer"
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-contain bg-white/10 p-0.5 border border-white/15"
              />
            ) : (
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 text-[9px] text-white/50">
                Item
              </div>
            )}
            {totalQuantity > 1 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#e50914] text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                {totalQuantity}
              </span>
            )}
          </div>

          {/* Product Info */}
          <div className="min-w-0 flex-1 leading-tight">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold text-xs sm:text-sm text-white truncate max-w-[150px] sm:max-w-[200px]">
                {latestItem?.product?.title}
              </span>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-white/15 text-amber-300 shrink-0">
                {latestItem?.selectedSize ? `Size: ${latestItem.selectedSize}` : 'Size Selected'}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-neutral-300 mt-0.5 truncate">
              {customInfo ? (
                <span className="font-mono text-amber-300 font-bold truncate">
                  "{customInfo}"
                </span>
              ) : (
                <span className="text-neutral-400">
                  {totalQuantity} {totalQuantity > 1 ? 'টি পণ্য কার্টে আছে' : 'টি পণ্য কার্টে যোগ হয়েছে'}
                </span>
              )}
              <span>•</span>
              <span className="font-bold text-emerald-400 font-mono">
                {formatPrice(subtotal, currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: CTA Button */}
        <div className="shrink-0 flex items-center gap-1.5">
          <div
            className="px-3 sm:px-3.5 py-2 rounded-xl bg-white text-neutral-900 font-extrabold text-xs flex items-center gap-1.5 shadow-sm group-hover:bg-neutral-100 transition-colors pointer-events-none"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-neutral-800" />
            <span className="hidden xs:inline sm:inline">কার্ট দেখুন</span>
            <span className="xs:hidden sm:hidden">কার্ট</span>
            <ArrowRight className="w-3.5 h-3.5 text-neutral-700 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

      </div>
    </div>
  );
};
