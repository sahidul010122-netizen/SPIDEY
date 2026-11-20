import React, { useState } from 'react';
import { ShoppingBag, ArrowRight, Tag, X, ChevronUp, ChevronDown } from 'lucide-react';
import { CartItem } from '../types';
import { CurrencyCode, formatPrice } from '../utils/currency';

interface FloatingCartItemWidgetProps {
  items: CartItem[];
  onOpenCart: () => void;
  onOpenCheckout: () => void;
  currency: CurrencyCode;
  currentView: string;
}

export const FloatingCartItemWidget: React.FC<FloatingCartItemWidgetProps> = ({
  items = [],
  onOpenCart,
  onOpenCheckout,
  currency,
  currentView
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Do not show on cart or checkout views to avoid cluttering checkout forms
  if (items.length === 0 || currentView === 'cart' || currentView === 'checkout' || isDismissed) {
    return null;
  }

  const totalQuantity = items.reduce((acc, it) => acc + (it.quantity || 1), 0);
  const totalPrice = items.reduce((acc, it) => {
    const p = (it.product?.price || 0) + (it.customizationFee || 0);
    return acc + p * (it.quantity || 1);
  }, 0);

  const latestItem = items[items.length - 1];

  // Truncate to first 1-2 words followed by ...
  const formatShortTitle = (title?: string) => {
    if (!title) return 'Jersey...';
    const words = title.trim().split(/\s+/);
    if (words.length <= 2) return title;
    return `${words[0]} ${words[1]}...`;
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 select-none animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-[#141418]/95 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden transition-all duration-300 max-w-[320px] sm:max-w-[340px]">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-[#1c090d] to-[#141418] border-b border-white/10 text-white px-3 py-1.5 flex items-center justify-between text-[11px] font-bold">
          <div className="flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5 text-red-400" />
            <span>কার্টে যুক্ত পণ্য ({totalQuantity} টি)</span>
          </div>

          <div className="flex items-center gap-1">
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="hover:text-red-400 p-0.5 transition-colors cursor-pointer"
                title={isExpanded ? 'সংক্ষিপ্ত করুন' : 'সবগুলো দেখুন'}
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="text-neutral-400 hover:text-white p-0.5 transition-colors cursor-pointer"
              title="হাইড করুন"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Product Items Display */}
        <div className="p-2.5 space-y-2">
          
          {isExpanded && items.length > 1 ? (
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {items.map((item) => (
                <div key={item.itemKey} className="flex items-center gap-2.5 p-1.5 rounded-xl bg-[#1b1b22] border border-white/[0.07]">
                  {item.product?.images?.[0] ? (
                    <img
                      src={item.product.images[0]}
                      alt={item.product?.title}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-xl object-contain bg-[#0e0e12] border border-white/10 shrink-0 p-0.5"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-[#0e0e12] border border-white/10 shrink-0 flex items-center justify-center text-neutral-500">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-black text-neutral-100 truncate">
                      {formatShortTitle(item.product?.title)}
                    </h5>
                    <div className="text-[10px] text-neutral-400 flex items-center gap-1.5">
                      <span>সাইজ: <strong className="text-neutral-200 font-mono">[{item.selectedSize}]</strong></span>
                      <span>•</span>
                      <span>পরিমাণ: <strong>{item.quantity}</strong></span>
                    </div>
                    {(item.customName || item.customNumber) && (
                      <div className="text-[9px] text-red-400 font-bold truncate flex items-center gap-0.5">
                        <Tag className="w-2.5 h-2.5 shrink-0" />
                        <span>{item.customName} {item.customNumber ? `#${item.customNumber}` : ''}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div 
              onClick={onOpenCart}
              className="flex items-center gap-2.5 cursor-pointer hover:bg-white/[0.04] p-1 rounded-xl transition-colors"
            >
              <div className="relative shrink-0">
                {latestItem.product?.images?.[0] ? (
                  <img
                    src={latestItem.product.images[0]}
                    alt={latestItem.product?.title}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-2xl object-contain bg-[#0e0e12] border border-white/10 p-0.5"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-[#0e0e12] border border-white/10 flex items-center justify-center text-neutral-500">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                )}
                {items.length > 1 && (
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[9px] font-black font-mono shadow-xs">
                    +{items.length - 1}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h5 className="text-xs font-black text-neutral-100 truncate leading-snug">
                  {formatShortTitle(latestItem.product?.title)}
                </h5>
                
                <div className="text-[10px] text-neutral-400 flex items-center gap-1 mt-0.5">
                  <span>সাইজ: <strong className="text-neutral-200 font-mono">[{latestItem.selectedSize}]</strong></span>
                  {latestItem.quantity && latestItem.quantity > 1 && (
                    <>
                      <span>•</span>
                      <span>{latestItem.quantity} টি</span>
                    </>
                  )}
                </div>

                {(latestItem.customName || latestItem.customNumber) ? (
                  <div className="text-[10px] font-mono text-red-400 font-bold truncate flex items-center gap-1 mt-0.5">
                    <Tag className="w-2.5 h-2.5 shrink-0" />
                    <span>{latestItem.customName || ''} {latestItem.customNumber ? `#${latestItem.customNumber}` : ''}</span>
                  </div>
                ) : (
                  <div className="text-[10px] text-neutral-500">
                    স্ট্যান্ডার্ড জার্সি
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
            <div className="font-mono font-black text-xs text-white tabular-nums">
              {formatPrice(totalPrice, currency)}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onOpenCart}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-neutral-200 hover:text-white bg-[#202028] hover:bg-[#2a2a35] transition-colors cursor-pointer"
              >
                কার্ট
              </button>
              <button
                type="button"
                onClick={onOpenCheckout}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-black flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-xs"
              >
                <span>চেকআউট</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
