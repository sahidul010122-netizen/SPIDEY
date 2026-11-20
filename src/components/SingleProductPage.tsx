import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Heart, Share2, Check, Download, 
  Ruler, ShoppingBag, Zap, ShieldCheck, Truck, RotateCcw, 
  Tag, AlertCircle, Plus, Minus, MessageCircle, X
} from 'lucide-react';
import { JerseyProduct, CartItem } from '../types';
import { CurrencyCode, formatPrice } from '../utils/currency';
import { SiteSettings } from '../types/settings';
import { TrustBadgeIcon } from './TrustBadgeIcon';
import { ProductSizeChartSection } from './ProductSizeChartSection';

interface SingleProductPageProps {
  jersey: JerseyProduct;
  onBackToShop: () => void;
  onAddToCart: (item: CartItem) => void;
  onBuyNow: (item: CartItem) => void;
  isWishlisted: boolean;
  onToggleWishlist: (jersey: JerseyProduct) => void;
  currency: CurrencyCode;
  siteSettings: SiteSettings;
}

// Fallback measurements (S, M, L, XL, XXL, XXXL)
const DEFAULT_FALLBACK_SIZES = [
  { size: 'S', chest: '36"', length: '26"', shoulder: '15.5"' },
  { size: 'M', chest: '38"', length: '27"', shoulder: '16.5"' },
  { size: 'L', chest: '40"', length: '28"', shoulder: '17.5"' },
  { size: 'XL', chest: '42"', length: '29"', shoulder: '18.5"' },
  { size: 'XXL', chest: '44"', length: '30"', shoulder: '19.5"' },
  { size: 'XXXL', chest: '46"', length: '31"', shoulder: '20.5"' },
];

export const SingleProductPage: React.FC<SingleProductPageProps> = ({
  jersey,
  onBackToShop,
  onAddToCart,
  onBuyNow,
  isWishlisted,
  onToggleWishlist,
  currency,
  siteSettings
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Mandatory requirement: No size selected by default (Required)
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [sizeError, setSizeError] = useState<string | null>(null);

  // Quantity stepper (default 1)
  const [quantity, setQuantity] = useState<number>(1);

  // Back Customize state (জার্সির পিছনে নাম ও নম্বর)
  const [hasCustomization, setHasCustomization] = useState(false);
  const [hasNameBox, setHasNameBox] = useState(true);
  const [hasNumberBox, setHasNumberBox] = useState(true);
  const [customName, setCustomName] = useState('');
  const [customNumber, setCustomNumber] = useState('');

  // Size chart modal state
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  // Copy share link
  const [isCopied, setIsCopied] = useState(false);

  // Dynamic available sizes and measurements from siteSettings (or fallback)
  const activeMeasurements = useMemo(() => {
    if (Array.isArray(siteSettings?.sizeGuideMeasurements) && siteSettings.sizeGuideMeasurements.length > 0) {
      return siteSettings.sizeGuideMeasurements;
    }
    return DEFAULT_FALLBACK_SIZES;
  }, [siteSettings?.sizeGuideMeasurements]);

  const availableSizes = useMemo(() => {
    return activeMeasurements.map(m => m.size.trim().toUpperCase());
  }, [activeMeasurements]);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [jersey.id]);

  // Determine Customization Charge
  const isCustomChargePaid = jersey.customizationChargeType === 'paid' || 
    (!jersey.customizationChargeType && siteSettings?.defaultCustomizationChargeType === 'paid');

  const customFeeAmount = isCustomChargePaid
    ? (typeof jersey.customizationCharge === 'number' ? jersey.customizationCharge : (siteSettings?.defaultCustomizationCharge || 0))
    : 0;

  const customizationPricingLabel = (!isCustomChargePaid || customFeeAmount === 0)
    ? 'ফ্রি'
    : `+৳${customFeeAmount}`;

  // Image list
  const safeImages = Array.isArray(jersey.images) && jersey.images.length > 0
    ? jersey.images
    : [];

  // Total unit price calculation
  const itemCustomFee = hasCustomization ? customFeeAmount : 0;
  const unitPrice = (jersey.price || 0) + itemCustomFee;
  const totalPrice = unitPrice * quantity;

  // Validation function
  const validateAndBuildItem = (): CartItem | null => {
    if (!selectedSize) {
      setSizeError('অনুগ্রহ করে একটি সাইজ সিলেক্ট করুন (সাইজ নির্বাচন আবশ্যক)');
      const el = document.getElementById('size-selector-section');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return null;
    }
    setSizeError(null);

    const finalName = hasCustomization && hasNameBox && customName.trim() 
      ? customName.trim().toUpperCase() 
      : undefined;
    const finalNumber = hasCustomization && hasNumberBox && customNumber.trim() 
      ? customNumber.trim() 
      : undefined;

    return {
      itemKey: `cart-${jersey.id}-${selectedSize}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      product: jersey,
      selectedSize,
      customName: finalName,
      customNumber: finalNumber,
      hasCustomization: Boolean(hasCustomization && (finalName || finalNumber)),
      customizationFee: itemCustomFee,
      quantity,
      addedAt: Date.now()
    };
  };

  const handleAddToCartClick = () => {
    const item = validateAndBuildItem();
    if (item) {
      onAddToCart(item);
    }
  };

  const handleBuyNowClick = () => {
    const item = validateAndBuildItem();
    if (item) {
      onBuyNow(item);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: jersey.title, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0b0e] text-neutral-100 pb-20">
      
      {/* Top Breadcrumb & Back Navigation */}
      <div className="border-b border-white/[0.08] bg-[#101014]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between text-xs">
          <button
            onClick={onBackToShop}
            className="flex items-center gap-1.5 font-bold text-neutral-300 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>হোমে ফিরুন (সকল জার্সি)</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-1.5 rounded-full hover:bg-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer"
              title="লিংক কপি করুন"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Single Product Layout */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start">
          
          {/* LEFT COLUMN: PRODUCT IMAGE GALLERY */}
          <div className="space-y-3 sticky md:top-24">
            <div className="relative aspect-[1/1] w-full rounded-2xl overflow-hidden bg-[#141418] border border-white/10 flex items-center justify-center shadow-[0_18px_45px_rgba(0,0,0,0.65)]">
              {safeImages[activeImageIndex] ? (
                <img
                  src={safeImages[activeImageIndex]}
                  alt={jersey.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain p-2 rounded-2xl transition-transform duration-300 hover:scale-[1.03]"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-neutral-500">
                  <span className="text-xs font-medium">No Image</span>
                </div>
              )}

              {jersey.code && (
                <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded-md bg-black/80 border border-white/15 text-red-400 font-mono text-[11px] font-bold shadow-xs">
                  {jersey.code}
                </div>
              )}
            </div>

            {/* Thumbnails row */}
            {safeImages.length > 1 && (
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                {safeImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-16 h-16 rounded-2xl border-2 overflow-hidden bg-[#141418] p-1 shrink-0 transition-all cursor-pointer ${
                      activeImageIndex === idx 
                        ? 'border-red-600 shadow-xs scale-105' 
                        : 'border-white/10 hover:border-white/30 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-contain rounded-xl"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: DETAILS, SIZES, CUSTOMIZE, ACTIONS */}
          <div className="space-y-5">
            
            {/* 1. Title */}
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight">
                {jersey.title}
              </h1>
              <p className="text-xs text-neutral-400 mt-1">
                {jersey.edition || 'Authentic Match Edition'} • {jersey.category}
              </p>
            </div>

            {/* 2. Price */}
            <div className="flex items-baseline gap-3 tabular-nums">
              <span className="text-2xl sm:text-3xl font-black text-red-500 tracking-tight font-mono">
                {formatPrice(unitPrice, currency)}
              </span>
              {jersey.originalPrice && jersey.originalPrice > jersey.price && (
                <span className="text-sm sm:text-base text-neutral-500 line-through font-mono">
                  {formatPrice(jersey.originalPrice, currency)}
                </span>
              )}
              {jersey.originalPrice && jersey.originalPrice > jersey.price && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-600/15 text-red-400 border border-red-500/30">
                  SAVE ৳{jersey.originalPrice - jersey.price}
                </span>
              )}
            </div>

            {/* 3. Stock Availability */}
            <div className="flex items-center gap-1.5 text-xs text-neutral-300 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              <span>{jersey.stockCount || 50} টি উপলব্ধ - প্রস্তুত শিপিং</span>
            </div>

            <div className="border-t border-white/10" />

            {/* 4. Size Selection (NO DEFAULT SELECTION, REQUIRED) */}
            <div id="size-selector-section" className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-bold text-neutral-100 flex items-center gap-1.5">
                  <span>সাইজ</span>
                  {selectedSize ? (
                    <span className="px-2 py-0.5 rounded bg-red-600 text-white font-mono text-xs font-black">
                      {selectedSize}
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-red-400 bg-red-600/15 px-2 py-0.5 rounded border border-red-500/30">
                      *বাধ্যতামূলক নির্বাচন
                    </span>
                  )}
                </label>

                {/* Size Guide Link */}
                <button
                  type="button"
                  onClick={() => setShowSizeGuide(true)}
                  className="text-xs font-bold text-neutral-300 hover:text-white flex items-center gap-1 underline transition-colors cursor-pointer"
                >
                  <Ruler className="w-3.5 h-3.5 text-red-400" />
                  <span>সাইজ গাইড</span>
                </button>
              </div>

              {/* Square Size Boxes */}
              <div className="grid grid-cols-6 gap-1.5 sm:gap-2.5 w-full">
                {availableSizes.map((size) => {
                  const isSelected = selectedSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        setSelectedSize(size);
                        setSizeError(null);
                      }}
                      className={`h-11 sm:h-12 rounded-xl text-[11px] sm:text-sm font-black transition-all flex items-center justify-center cursor-pointer font-mono px-0.5 active:scale-95 ${
                        isSelected
                          ? 'bg-red-600 text-white shadow-md shadow-red-600/30 ring-2 ring-red-500'
                          : sizeError
                          ? 'bg-red-950/40 hover:bg-red-900/40 text-red-200 border-2 border-red-500/60'
                          : 'bg-[#16161c] hover:bg-[#1f1f27] text-neutral-100 border border-white/15'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>

              {/* Validation Error Message */}
              {sizeError && (
                <div className="flex items-center gap-1.5 p-2.5 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs font-bold animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{sizeError}</span>
                </div>
              )}
            </div>

            {/* 5. Back Customize Section */}
            <div className="rounded-2xl border border-white/10 p-3.5 sm:p-4 bg-[#141418] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#1d1d24] border border-white/10 flex items-center justify-center text-red-400 shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-1">
                      <span>ব্যাক কাস্টমাইজ</span>
                      <span>✨</span>
                    </h4>
                    <p className="text-[11px] text-neutral-400">
                      জার্সির পিছনে নিজের নাম ও নম্বর - <span className="font-bold text-neutral-200">{customizationPricingLabel}</span>
                    </p>
                  </div>
                </div>

                {/* Plus / Minus Toggle Button */}
                <button
                  type="button"
                  onClick={() => setHasCustomization(!hasCustomization)}
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                    hasCustomization
                      ? 'bg-red-600 text-white border-red-500'
                      : 'bg-[#1c1c23] hover:bg-[#25252f] text-neutral-200 border-white/15'
                  }`}
                  title={hasCustomization ? 'কাস্টমাইজেশন বন্ধ করুন' : 'কাস্টমাইজেশন অন করুন'}
                >
                  {hasCustomization ? <Minus className="w-4 h-4 stroke-[2.5]" /> : <Plus className="w-4 h-4 stroke-[2.5]" />}
                </button>
              </div>

              {/* Revealed Customization Input Boxes */}
              {hasCustomization && (
                <div className="pt-3 border-t border-dashed border-white/15 space-y-3 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-neutral-300">জার্সির নাম (Name):</label>
                        <button
                          type="button"
                          onClick={() => setHasNameBox(!hasNameBox)}
                          className="text-[10px] text-neutral-400 hover:text-white font-semibold underline cursor-pointer"
                        >
                          {hasNameBox ? 'মুছে ফেলুন' : 'যোগ করুন'}
                        </button>
                      </div>
                      {hasNameBox && (
                        <input
                          type="text"
                          maxLength={16}
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value.toUpperCase())}
                          placeholder="e.g. RONALDO / YASIN"
                          className="w-full px-3 py-2 text-xs bg-[#0d0d11] border border-white/15 rounded-xl text-white uppercase font-mono font-bold focus:outline-none focus:border-red-500"
                        />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-neutral-300">জার্সির নম্বর (Number):</label>
                        <button
                          type="button"
                          onClick={() => setHasNumberBox(!hasNumberBox)}
                          className="text-[10px] text-neutral-400 hover:text-white font-semibold underline cursor-pointer"
                        >
                          {hasNumberBox ? 'মুছে ফেলুন' : 'যোগ করুন'}
                        </button>
                      </div>
                      {hasNumberBox && (
                        <input
                          type="text"
                          maxLength={3}
                          value={customNumber}
                          onChange={(e) => setCustomNumber(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="e.g. 7 / 10"
                          className="w-full px-3 py-2 text-xs bg-[#0d0d11] border border-white/15 rounded-xl text-white font-mono font-bold focus:outline-none focus:border-red-500"
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 6. Quantity Stepper */}
            <div className="flex items-center gap-4">
              <span className="text-xs sm:text-sm font-bold text-neutral-200">পরিমাণ</span>
              <div className="flex items-center border border-white/15 rounded-xl bg-[#141418] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-1.5 hover:bg-white/10 text-neutral-200 transition-colors cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="px-4 font-mono font-bold text-xs sm:text-sm text-white select-none tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3 py-1.5 hover:bg-white/10 text-neutral-200 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 7. Action Buttons */}
            <div className="flex items-center gap-2.5 sm:gap-3 pt-2">
              <button
                type="button"
                onClick={handleAddToCartClick}
                className="flex-1 py-3.5 px-4 rounded-xl bg-[#18181f] hover:bg-[#22222b] text-white border border-white/20 font-black text-xs sm:text-sm transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                <ShoppingBag className="w-4 h-4 text-neutral-200" />
                <span>কার্ট যোগ</span>
              </button>

              <button
                type="button"
                onClick={handleBuyNowClick}
                className="flex-1 py-3.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs sm:text-sm transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-red-600/30"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>এখনই কিনুন</span>
              </button>

              <button
                type="button"
                onClick={() => onToggleWishlist(jersey)}
                aria-label="Wishlist"
                className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0 ${
                  isWishlisted
                    ? 'bg-red-600/20 border-red-500 text-red-400'
                    : 'bg-[#18181f] hover:bg-[#22222b] border-white/20 text-neutral-200 hover:text-red-400'
                }`}
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-current'}`} />
              </button>
            </div>

            {/* 8. Trust Badges */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              {siteSettings.trustBadge1Enabled !== false && (
                <div className="p-3 rounded-xl border border-white/10 bg-[#141418] text-center space-y-1">
                  <div className="flex justify-center">
                    <TrustBadgeIcon icon={siteSettings.trustBadge1Icon || 'truck'} defaultIcon="truck" className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="text-[11px] font-black text-neutral-100 leading-tight">
                    {siteSettings.trustBadge1Title || 'ফ্রি ডেলিভারি'}
                  </div>
                  <div className="text-[10px] text-neutral-400 leading-tight">
                    {siteSettings.trustBadge1Subtitle || '৳২০০০+ অর্ডারে'}
                  </div>
                </div>
              )}

              {siteSettings.trustBadge2Enabled !== false && (
                <div className="p-3 rounded-xl border border-white/10 bg-[#141418] text-center space-y-1">
                  <div className="flex justify-center">
                    <TrustBadgeIcon icon={siteSettings.trustBadge2Icon || 'shield'} defaultIcon="shield" className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="text-[11px] font-black text-neutral-100 leading-tight">
                    {siteSettings.trustBadge2Title || '১০০% অরিজিনাল'}
                  </div>
                  <div className="text-[10px] text-neutral-400 leading-tight">
                    {siteSettings.trustBadge2Subtitle || 'অথেনটিক গ্যারান্টি'}
                  </div>
                </div>
              )}

              {siteSettings.trustBadge3Enabled !== false && (
                <div className="p-3 rounded-xl border border-white/10 bg-[#141418] text-center space-y-1">
                  <div className="flex justify-center">
                    <TrustBadgeIcon icon={siteSettings.trustBadge3Icon || 'rotate-ccw'} defaultIcon="rotate-ccw" className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="text-[11px] font-black text-neutral-100 leading-tight">
                    {siteSettings.trustBadge3Title || '৭ দিন রিটার্ন'}
                  </div>
                  <div className="text-[10px] text-neutral-400 leading-tight">
                    {siteSettings.trustBadge3Subtitle || 'সহজ পলিসি'}
                  </div>
                </div>
              )}
            </div>

            {/* Visual Sizing Chart */}
            <div className="pt-2 border-t border-white/10">
              <ProductSizeChartSection
                selectedSize={selectedSize}
                onSelectSize={(sz) => {
                  setSelectedSize(sz);
                  setSizeError(null);
                }}
                measurements={activeMeasurements}
              />
            </div>

          </div>

        </div>
      </div>

      {/* SIZE GUIDE MODAL */}
      {showSizeGuide && (
        <div 
          onClick={() => setShowSizeGuide(false)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#141418] text-neutral-100 rounded-2xl p-5 sm:p-6 shadow-2xl border border-white/15 space-y-4 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-base font-black text-white">
                সাইজ গাইড
              </h3>
              <span className="text-xs text-neutral-400 font-semibold">
                পরিমাপ ইঞ্চিতে
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-white/10">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#1b1b22] text-neutral-200 font-bold border-b border-white/10">
                  <tr>
                    <th className="py-2.5 px-3">সাইজ</th>
                    <th className="py-2.5 px-3">চেস্ট</th>
                    <th className="py-2.5 px-3">লেংথ</th>
                    <th className="py-2.5 px-3">শোল্ডার</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-neutral-200 font-mono">
                  {activeMeasurements.map((row) => {
                    const isSelected = selectedSize === row.size;
                    return (
                      <tr 
                        key={row.size}
                        onClick={() => {
                          setSelectedSize(row.size);
                          setSizeError(null);
                          setShowSizeGuide(false);
                        }}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-red-600 text-white font-bold' : 'hover:bg-white/[0.05]'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-bold font-sans">
                          {row.size}
                        </td>
                        <td className="py-2.5 px-3">{row.chest}</td>
                        <td className="py-2.5 px-3">{row.length}</td>
                        <td className="py-2.5 px-3">{row.shoulder || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-[11px] text-neutral-400 text-center">
              সাইজ সম্পর্কে কোনো প্রশ্ন থাকলে আমাদের সাথে যোগাযোগ করুন।
            </p>

            <button
              type="button"
              onClick={() => setShowSizeGuide(false)}
              className="w-full py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors cursor-pointer"
            >
              ঠিক আছে
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
