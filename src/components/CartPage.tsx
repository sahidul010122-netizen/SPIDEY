import React from 'react';
import { 
  ArrowLeft, ArrowRight, Trash2, Plus, Minus, 
  ShoppingBag, Tag, ShieldCheck, Truck, RotateCcw
} from 'lucide-react';
import { CartItem } from '../types';
import { CurrencyCode, formatPrice } from '../utils/currency';
import { SiteSettings } from '../types/settings';

interface CartPageProps {
  items: CartItem[];
  onUpdateQuantity: (itemKey: string, qty: number) => void;
  onUpdateItem: (itemKey: string, updates: Partial<CartItem>) => void;
  onRemoveItem: (itemKey: string) => void;
  onClearCart: () => void;
  onContinueShopping: () => void;
  onProceedToCheckout: () => void;
  currency: CurrencyCode;
  siteSettings: SiteSettings;
}

const AVAILABLE_SIZES = ['M', 'L', 'XL', 'XXL', 'XXXL'];

export const CartPage: React.FC<CartPageProps> = ({
  items = [],
  onUpdateQuantity,
  onUpdateItem,
  onRemoveItem,
  onClearCart,
  onContinueShopping,
  onProceedToCheckout,
  currency,
  siteSettings
}) => {
  const safeItems = Array.isArray(items) ? items : [];

  const subtotal = safeItems.reduce((acc, it) => {
    const price = it.product?.price || 0;
    const custom = it.customizationFee || 0;
    return acc + (price + custom) * (it.quantity || 1);
  }, 0);

  const totalItemCount = safeItems.reduce((acc, it) => acc + (it.quantity || 1), 0);

  return (
    <div className="min-h-screen bg-[#0b0b0e] text-neutral-100 pb-20">
      
      {/* Top Breadcrumb Navigation */}
      <div className="border-b border-white/[0.08] bg-[#101014]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-neutral-400 font-semibold">
            <button 
              onClick={onContinueShopping}
              className="hover:text-white transition-colors cursor-pointer"
            >
              হোম
            </button>
            <span>/</span>
            <span className="text-neutral-100 font-bold">শপিং কার্ট</span>
          </div>

          <button
            onClick={onContinueShopping}
            className="flex items-center gap-1 font-bold text-neutral-300 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>আরো কেনাকাটা করুন</span>
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        
        {/* Page Title */}
        <div className="mb-6 flex items-baseline justify-between">
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            আপনার কার্ট ({totalItemCount} টি পণ্য)
          </h1>
          {safeItems.length > 0 && (
            <button
              onClick={onClearCart}
              className="text-xs text-neutral-400 hover:text-red-400 font-semibold underline transition-colors cursor-pointer"
            >
              সব মুছে ফেলুন
            </button>
          )}
        </div>

        {/* Empty Cart State */}
        {safeItems.length === 0 ? (
          <div className="bg-[#141418] rounded-3xl border border-white/10 p-8 sm:p-14 text-center max-w-lg mx-auto shadow-xs space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#1c1c23] mx-auto flex items-center justify-center text-neutral-500">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-neutral-100">
                আপনার কার্ট বর্তমানে খালি
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                পছন্দের জার্সি নির্বাচন করে কার্টে যোগ করুন।
              </p>
            </div>
            <button
              onClick={onContinueShopping}
              className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              জার্সি কালেকশন দেখুন
            </button>
          </div>
        ) : (

          /* Cart Items & Summary Grid */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Left Column: Items List */}
            <div className="lg:col-span-2 space-y-4">
              {safeItems.map((item) => {
                const itemUnitPrice = (item.product?.price || 0) + (item.customizationFee || 0);
                const hasName = Boolean(item.customName);
                const hasNumber = Boolean(item.customNumber);

                return (
                  <div
                    key={item.itemKey}
                    className="p-4 sm:p-5 rounded-2xl bg-[#141418] border border-white/10 shadow-xs space-y-3.5"
                  >
                    {/* Top Row: Thumbnail, Title, Price, Delete */}
                    <div className="flex items-start gap-4">
                      {item.product?.images && item.product.images[0] ? (
                        <img
                          src={item.product.images[0]}
                          alt={item.product?.title}
                          referrerPolicy="no-referrer"
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-contain bg-[#0e0e12] border border-white/10 shrink-0 p-1"
                        />
                      ) : (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#0e0e12] border border-white/10 shrink-0 flex items-center justify-center text-[10px] text-neutral-500 font-bold">
                          ITEM
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-sm sm:text-base font-extrabold text-white truncate">
                              {item.product?.title}
                            </h3>
                            <div className="text-[11px] text-neutral-400 mt-0.5 font-mono">
                              {item.product?.code ? `[${item.product.code}] ` : ''}{item.product?.category}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.itemKey)}
                            className="p-1.5 text-neutral-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Price Line */}
                        <div className="flex items-baseline gap-2 mt-1 tabular-nums">
                          <span className="text-sm sm:text-base font-black text-red-400 font-mono">
                            {formatPrice(itemUnitPrice, currency)}
                          </span>
                          <span className="text-xs text-neutral-400">
                            × {item.quantity} =
                          </span>
                          <span className="text-sm sm:text-base font-black text-white font-mono">
                            {formatPrice(itemUnitPrice * (item.quantity || 1), currency)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Middle Row: Live Size Editing & Quantity Stepper */}
                    <div className="p-3 rounded-xl bg-[#1a1a21] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-neutral-300">সাইজ পরিবর্তন:</span>
                        <div className="flex items-center gap-1.5">
                          {AVAILABLE_SIZES.map((sz) => (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => onUpdateItem(item.itemKey, { selectedSize: sz })}
                              className={`px-2.5 py-1 rounded-md font-mono text-xs font-black transition-all cursor-pointer ${
                                item.selectedSize === sz
                                  ? 'bg-red-600 text-white shadow-xs'
                                  : 'bg-[#121216] hover:bg-[#24242d] text-neutral-200 border border-white/15'
                              }`}
                            >
                              {sz}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-300">পরিমাণ:</span>
                        <div className="flex items-center border border-white/15 rounded-lg bg-[#121216] overflow-hidden">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.itemKey, Math.max(1, (item.quantity || 1) - 1))}
                            className="px-2.5 py-1 hover:bg-white/10 text-neutral-200 transition-colors cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-3 font-mono font-bold text-xs text-white tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.itemKey, (item.quantity || 1) + 1)}
                            className="px-2.5 py-1 hover:bg-white/10 text-neutral-200 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Customization */}
                    {(() => {
                      const isCustomized = Boolean(item.hasCustomization || item.customName || item.customNumber);
                      const customFee = item.customizationFee || 0;
                      const customPricingLabel = customFee > 0 ? `+৳${customFee}` : 'ফ্রি কাস্টমাইজেশন';

                      return (
                        <div className="p-3.5 rounded-xl bg-[#1a1a21] border border-white/[0.08] space-y-3 text-xs">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-[#121216] border border-white/10 flex items-center justify-center text-red-400 shrink-0 shadow-2xs">
                                <Tag className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="text-xs font-extrabold text-neutral-100 flex items-center gap-1">
                                  <span>জার্সিতে নিজের নাম ও নম্বর বসাতে চান?</span>
                                  <span>✨</span>
                                </h4>
                                <p className="text-[11px] text-neutral-400">
                                  ব্যাক কাস্টমাইজেশন - <span className="font-bold text-neutral-200">{customPricingLabel}</span>
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (isCustomized) {
                                  onUpdateItem(item.itemKey, {
                                    hasCustomization: false,
                                    customName: undefined,
                                    customNumber: undefined,
                                    customizationFee: 0
                                  });
                                } else {
                                  onUpdateItem(item.itemKey, {
                                    hasCustomization: true,
                                    customName: item.customName || 'YASIN',
                                    customNumber: item.customNumber || '7',
                                    customizationFee: customFee
                                  });
                                }
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                isCustomized
                                  ? 'bg-red-600 text-white shadow-xs'
                                  : 'bg-[#121216] hover:bg-[#24242d] text-neutral-300 border border-white/15'
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full ${isCustomized ? 'bg-emerald-300' : 'bg-neutral-500'}`} />
                              <span>{isCustomized ? 'অন (ON)' : 'অফ (OFF)'}</span>
                            </button>
                          </div>

                          {isCustomized && (
                            <div className="pt-3 border-t border-dashed border-white/15 space-y-2.5 animate-in fade-in duration-150">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[11px] font-bold text-neutral-300 mb-1">
                                    জার্সির নাম (Name):
                                  </label>
                                  <input
                                    type="text"
                                    maxLength={16}
                                    value={item.customName || ''}
                                    onChange={(e) => onUpdateItem(item.itemKey, {
                                      customName: e.target.value.toUpperCase(),
                                      hasCustomization: true
                                    })}
                                    placeholder="e.g. RONALDO / YASIN"
                                    className="w-full px-3 py-1.5 text-xs bg-[#0d0d11] border border-white/15 rounded-lg text-white uppercase font-mono font-bold focus:outline-none focus:border-red-500"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[11px] font-bold text-neutral-300 mb-1">
                                    জার্সির নম্বর (Number):
                                  </label>
                                  <input
                                    type="text"
                                    maxLength={3}
                                    value={item.customNumber || ''}
                                    onChange={(e) => onUpdateItem(item.itemKey, {
                                      customNumber: e.target.value.replace(/[^0-9]/g, ''),
                                      hasCustomization: true
                                    })}
                                    placeholder="e.g. 7 / 10"
                                    className="w-full px-3 py-1.5 text-xs bg-[#0d0d11] border border-white/15 rounded-lg text-white font-mono font-bold focus:outline-none focus:border-red-500"
                                  />
                                </div>
                              </div>
                              <p className="text-[10px] text-neutral-400 italic">
                                * নাম বা নম্বরের বক্স ফাঁকা রাখতে চাইলে বক্সের টেক্সট মুছে ফেলতে পারেন।
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                  </div>
                );
              })}
            </div>

            {/* Right Column: Order Summary & Proceed to Checkout */}
            <div className="space-y-4 sticky top-24">
              <div className="bg-[#141418] rounded-2xl border border-white/10 p-5 sm:p-6 shadow-xs space-y-4">
                <h2 className="text-base font-black text-white border-b border-white/10 pb-3">
                  অর্ডার সামারি
                </h2>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between text-neutral-400">
                    <span>মোট আইটেম:</span>
                    <span className="font-bold text-neutral-100">{totalItemCount} টি</span>
                  </div>

                  <div className="flex justify-between text-neutral-400">
                    <span>সাবটোটাল:</span>
                    <span className="font-bold text-white font-mono text-sm tabular-nums">
                      {formatPrice(subtotal, currency)}
                    </span>
                  </div>

                  <div className="flex justify-between text-neutral-400 text-[11px] pt-1 border-t border-white/10">
                    <span>ডেলিভারি চার্জ:</span>
                    <span className="text-neutral-500 italic">পরবর্তী চেকআউট পেজে যুক্ত হবে</span>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-3">
                  <div className="flex justify-between items-baseline mb-4 tabular-nums">
                    <span className="text-sm font-black text-white">আনুমানিক মোট:</span>
                    <span className="text-xl font-black text-red-500 font-mono">
                      {formatPrice(subtotal, currency)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={onProceedToCheckout}
                    className="w-full py-4 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/25 transition-all active:scale-98 cursor-pointer"
                  >
                    <span>চেকআউটে এগিয়ে যান</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onContinueShopping}
                  className="w-full py-2.5 rounded-lg text-xs font-bold text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  ← আরো জার্সি ব্রাউজ করুন
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
