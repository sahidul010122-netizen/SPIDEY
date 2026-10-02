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
      <div className="bg-white/95 backdrop-blur-md border border-neutral-300 rounded-2xl shadow-xl shadow-neutral-900/15 overflow-hidden transition-all duration-300 max-w-[320px] sm:max-w-[340px]">
        
        {/* Header Bar */}
        <div className="bg-neutral-900 text-white px-3 py-1.5 flex items-center justify-between text-[11px] font-bold">
          <div className="flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5 text-amber-300" />
            <span>কার্টে যুক্ত পণ্য ({totalQuantity} টি)</span>
          </div>

          <div className="flex items-center gap-1">
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="hover:text-amber-300 p-0.5 transition-colors cursor-pointer"
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
          
          {/* If Expanded and Multiple Items: show stacked list */}
          {isExpanded && items.length > 1 ? (
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {items.map((item) => (
                <div key={item.itemKey} className="flex items-center gap-2.5 p-1.5 rounded-xl bg-neutral-50 border border-neutral-200/70">
                  <img
                    src={item.product?.images?.[0] || '/images/default_jersey.png'}
                    alt={item.product?.title}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-lg object-contain bg-white border border-neutral-200 shrink-0 p-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-black text-neutral-900 truncate">
                      {formatShortTitle(item.product?.title)}
                    </h5>
                    <div className="text-[10px] text-neutral-500 flex items-center gap-1.5">
                      <span>সাইজ: <strong className="text-neutral-800 font-mono">[{item.selectedSize}]</strong></span>
                      <span>•</span>
                      <span>পরিমাণ: <strong>{item.quantity}</strong></span>
                    </div>
                    {(item.customName || item.customNumber) && (
                      <div className="text-[9px] text-emerald-700 font-bold truncate flex items-center gap-0.5">
                        <Tag className="w-2.5 h-2.5 shrink-0" />
                        <span>{item.customName} {item.customNumber ? `#${item.customNumber}` : ''}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Single/Primary Elongated Box (Format requested by user) */
            <div 
              onClick={onOpenCart}
              className="flex items-center gap-2.5 cursor-pointer hover:bg-neutral-50/80 p-1 rounded-xl transition-colors"
            >
              {/* Product Thumbnail in Corner */}
              <div className="relative shrink-0">
                <img
                  src={latestItem.product?.images?.[0] || '/images/default_jersey.png'}
                  alt={latestItem.product?.title}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-xl object-contain bg-neutral-100 border border-neutral-200 p-0.5"
                />
                {items.length > 1 && (
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 rounded-full bg-[#e50914] text-white text-[9px] font-black font-mono shadow-xs">
                    +{items.length - 1}
                  </span>
                )}
              </div>

              {/* Product Details: Name (truncated 1-2 words), Size, Custom Name/Number */}
              <div className="flex-1 min-w-0">
                <h5 className="text-xs font-black text-neutral-900 truncate leading-snug">
                  {formatShortTitle(latestItem.product?.title)}
                </h5>
                
                <div className="text-[10px] text-neutral-600 flex items-center gap-1 mt-0.5">
                  <span>সাইজ: <strong className="text-neutral-900 font-mono">[{latestItem.selectedSize}]</strong></span>
                  {latestItem.quantity && latestItem.quantity > 1 && (
                    <>
                      <span>•</span>
                      <span>{latestItem.quantity} টি</span>
                    </>
                  )}
                </div>

                {(latestItem.customName || latestItem.customNumber) ? (
                  <div className="text-[10px] font-mono text-emerald-700 font-bold truncate flex items-center gap-1 mt-0.5">
                    <Tag className="w-2.5 h-2.5 shrink-0" />
                    <span>{latestItem.customName || ''} {latestItem.customNumber ? `#${latestItem.customNumber}` : ''}</span>
                  </div>
                ) : (
                  <div className="text-[10px] text-neutral-400">
                    স্ট্যান্ডার্ড জার্সি
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="pt-2 border-t border-neutral-100 flex items-center justify-between gap-2">
            <div className="font-mono font-black text-xs text-[#e50914]">
              {formatPrice(totalPrice, currency)}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onOpenCart}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-neutral-700 hover:text-black bg-neutral-100 hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                কার্ট
              </button>
              <button
                type="button"
                onClick={onOpenCheckout}
                className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-black text-white text-[11px] font-black flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-xs"
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
