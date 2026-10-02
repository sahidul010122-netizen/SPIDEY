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
    : ['https://images.unsplash.com/photo-1577212017184-80cc0da11082?auto=format&fit=crop&w=800&q=80'];

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
    <div className="min-h-screen bg-white text-neutral-900 pb-20">
      
      {/* Top Breadcrumb & Back Navigation */}
      <div className="border-b border-neutral-200/80 bg-neutral-50/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between text-xs">
          <button
            onClick={onBackToShop}
            className="flex items-center gap-1.5 font-bold text-neutral-700 hover:text-black transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>হোমে ফিরুন (সকল জার্সি)</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-600 transition-colors cursor-pointer"
              title="লিংক কপি করুন"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Single Product Layout (Matching Image 1) */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start">
          
          {/* ========================================================
              LEFT COLUMN: PRODUCT IMAGE GALLERY
             ======================================================== */}
          <div className="space-y-3 sticky md:top-24">
            {/* Main Featured Photo */}
            <div className="relative aspect-[1/1] w-full rounded-2xl overflow-hidden bg-[#f7f8fa] border border-neutral-200 flex items-center justify-center shadow-xs">
              <img
                src={safeImages[activeImageIndex]}
                alt={jersey.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain p-4 transition-transform duration-300 hover:scale-105"
              />

              {jersey.code && (
                <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-neutral-900 text-amber-300 font-mono text-[11px] font-bold shadow-xs">
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
                    className={`w-16 h-16 rounded-xl border-2 overflow-hidden bg-[#f7f8fa] p-1 shrink-0 transition-all cursor-pointer ${
                      activeImageIndex === idx 
                        ? 'border-neutral-900 shadow-xs scale-105' 
                        : 'border-neutral-200 hover:border-neutral-400 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-contain"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ========================================================
              RIGHT COLUMN: DETAILS, SIZES, CUSTOMIZE, ACTIONS (MATCHING IMAGE 1)
             ======================================================== */}
          <div className="space-y-5">
            
            {/* 1. Title */}
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-neutral-950 tracking-tight leading-tight">
                {jersey.title}
              </h1>
              <p className="text-xs text-neutral-500 mt-1">
                {jersey.edition || 'Authentic Match Edition'} • {jersey.category}
              </p>
            </div>

            {/* 2. Price in Vibrant Red (Matching Image 1: ৳২০ / ৳১,৩৫০) */}
            <div className="flex items-baseline gap-3">
              <span className="text-2xl sm:text-3xl font-black text-[#e50914] tracking-tight font-mono">
                {formatPrice(unitPrice, currency)}
              </span>
              {jersey.originalPrice && jersey.originalPrice > jersey.price && (
                <span className="text-sm sm:text-base text-neutral-400 line-through font-mono">
                  {formatPrice(jersey.originalPrice, currency)}
                </span>
              )}
              {jersey.originalPrice && jersey.originalPrice > jersey.price && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                  SAVE ৳{jersey.originalPrice - jersey.price}
                </span>
              )}
            </div>

            {/* 3. Stock Availability with Green Dot (Matching Image 1: • ৫০ টি উপলব্ধ - প্রস্তুত শিপিং) */}
            <div className="flex items-center gap-1.5 text-xs text-neutral-700 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              <span>{jersey.stockCount || 50} টি উপলব্ধ - প্রস্তুত শিপিং</span>
            </div>

            <div className="border-t border-neutral-200" />

            {/* 4. Size Selection (NO DEFAULT SELECTION, REQUIRED) */}
            <div id="size-selector-section" className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                  <span>সাইজ</span>
                  {selectedSize ? (
                    <span className="px-2 py-0.5 rounded bg-neutral-900 text-white font-mono text-xs font-black">
                      {selectedSize}
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 animate-pulse">
                      *বাধ্যতামূলক নির্বাচন
                    </span>
                  )}
                </label>

                {/* Size Guide Link (Matching Image 1: সাইজ গাইড) */}
                <button
                  type="button"
                  onClick={() => setShowSizeGuide(true)}
                  className="text-xs font-bold text-neutral-700 hover:text-black flex items-center gap-1 underline transition-colors cursor-pointer"
                >
                  <Ruler className="w-3.5 h-3.5 text-neutral-700" />
                  <span>সাইজ গাইড</span>
                </button>
              </div>

              {/* Square Size Boxes (One single line on mobile and desktop: S, M, L, XL, XXL, XXXL) */}
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
                      className={`h-11 sm:h-12 rounded-lg text-[11px] sm:text-sm font-black transition-all flex items-center justify-center cursor-pointer font-mono px-0.5 ${
                        isSelected
                          ? 'bg-neutral-900 text-white shadow-md ring-2 ring-neutral-900 scale-102'
                          : sizeError
                          ? 'bg-rose-50 hover:bg-rose-100 text-neutral-900 border-2 border-rose-300'
                          : 'bg-white hover:bg-neutral-100 text-neutral-900 border border-neutral-300'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>

              {/* Validation Error Message */}
              {sizeError && (
                <div className="flex items-center gap-1.5 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{sizeError}</span>
                </div>
              )}
            </div>

            {/* Note: Color section is completely removed as requested */}

            {/* 5. Back Customize Section (Matching Image 1: ব্যাক কাস্টমাইজ ✨) */}
            <div className="rounded-xl border border-neutral-300 p-3.5 sm:p-4 bg-white space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-800 shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-neutral-900 flex items-center gap-1">
                      <span>ব্যাক কাস্টমাইজ</span>
                      <span>✨</span>
                    </h4>
                    <p className="text-[11px] text-neutral-500">
                      জার্সির পিছনে নিজের নাম ও নম্বর - <span className="font-bold text-neutral-700">{customizationPricingLabel}</span>
                    </p>
                  </div>
                </div>

                {/* Plus / Minus or Toggle Button */}
                <button
                  type="button"
                  onClick={() => setHasCustomization(!hasCustomization)}
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                    hasCustomization
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'bg-white hover:bg-neutral-100 text-neutral-800 border-neutral-300'
                  }`}
                  title={hasCustomization ? 'কাস্টমাইজেশন বন্ধ করুন' : 'কাস্টমাইজেশন অন করুন'}
                >
                  {hasCustomization ? <Minus className="w-4 h-4 stroke-[2.5]" /> : <Plus className="w-4 h-4 stroke-[2.5]" />}
                </button>
              </div>

              {/* Revealed Customization Input Boxes */}
              {hasCustomization && (
                <div className="pt-3 border-t border-dashed border-neutral-200 space-y-3 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Name input */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-neutral-700">জার্সির নাম (Name):</label>
                        <button
                          type="button"
                          onClick={() => setHasNameBox(!hasNameBox)}
                          className="text-[10px] text-neutral-500 hover:text-black font-semibold underline"
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
                          className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 uppercase font-mono font-bold focus:outline-none focus:bg-white focus:border-neutral-900"
                        />
                      )}
                    </div>

                    {/* Number input */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-neutral-700">জার্সির নম্বর (Number):</label>
                        <button
                          type="button"
                          onClick={() => setHasNumberBox(!hasNumberBox)}
                          className="text-[10px] text-neutral-500 hover:text-black font-semibold underline"
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
                          className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 font-mono font-bold focus:outline-none focus:bg-white focus:border-neutral-900"
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 6. Quantity Stepper (Matching Image 1: পরিমাণ [- 1 +]) */}
            <div className="flex items-center gap-4">
              <span className="text-xs sm:text-sm font-bold text-neutral-900">পরিমাণ</span>
              <div className="flex items-center border border-neutral-300 rounded-lg bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-1.5 hover:bg-neutral-100 text-neutral-800 transition-colors cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="px-4 font-mono font-bold text-xs sm:text-sm text-neutral-900 select-none">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3 py-1.5 hover:bg-neutral-100 text-neutral-800 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 7. Action Buttons (Matching Image 1: কার্ট যোগ | এখনই কিনুন | ♡) */}
            <div className="flex items-center gap-2.5 sm:gap-3 pt-2">
              {/* Add to Cart Button (White bg, Black border, Black text) */}
              <button
                type="button"
                onClick={handleAddToCartClick}
                className="flex-1 py-3.5 px-4 rounded-lg bg-white hover:bg-neutral-50 text-neutral-900 border-2 border-neutral-900 font-black text-xs sm:text-sm transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                <ShoppingBag className="w-4 h-4 text-neutral-900" />
                <span>কার্ট যোগ</span>
              </button>

              {/* Buy Now Button (Vibrant Red bg, White text) */}
              <button
                type="button"
                onClick={handleBuyNowClick}
                className="flex-1 py-3.5 px-4 rounded-lg bg-[#e50914] hover:bg-red-700 text-white font-black text-xs sm:text-sm transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-red-600/30"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>এখনই কিনুন</span>
              </button>

              {/* Wishlist Heart Button */}
              <button
                type="button"
                onClick={() => onToggleWishlist(jersey)}
                aria-label="Wishlist"
                className="w-12 h-12 rounded-lg bg-white hover:bg-neutral-50 border-2 border-neutral-900 flex items-center justify-center text-neutral-800 hover:text-rose-600 transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-rose-600 text-rose-600' : 'text-neutral-800'}`} />
              </button>
            </div>

            {/* 8. Trust Badges (Managed from Admin Panel) */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              {siteSettings.trustBadge1Enabled !== false && (
                <div className="p-3 rounded-xl border border-neutral-200 bg-neutral-50 text-center space-y-1">
                  <div className="flex justify-center">
                    <TrustBadgeIcon icon={siteSettings.trustBadge1Icon || 'truck'} defaultIcon="truck" className="w-4 h-4 text-neutral-700" />
                  </div>
                  <div className="text-[11px] font-black text-neutral-900 leading-tight">
                    {siteSettings.trustBadge1Title || 'ফ্রি ডেলিভারি'}
                  </div>
                  <div className="text-[10px] text-neutral-500 leading-tight">
                    {siteSettings.trustBadge1Subtitle || '৳২০০০+ অর্ডারে'}
                  </div>
                </div>
              )}

              {siteSettings.trustBadge2Enabled !== false && (
                <div className="p-3 rounded-xl border border-neutral-200 bg-neutral-50 text-center space-y-1">
                  <div className="flex justify-center">
                    <TrustBadgeIcon icon={siteSettings.trustBadge2Icon || 'shield'} defaultIcon="shield" className="w-4 h-4 text-neutral-700" />
                  </div>
                  <div className="text-[11px] font-black text-neutral-900 leading-tight">
                    {siteSettings.trustBadge2Title || '১০০% অরিজিনাল'}
                  </div>
                  <div className="text-[10px] text-neutral-500 leading-tight">
                    {siteSettings.trustBadge2Subtitle || 'অথেনটিক গ্যারান্টি'}
                  </div>
                </div>
              )}

              {siteSettings.trustBadge3Enabled !== false && (
                <div className="p-3 rounded-xl border border-neutral-200 bg-neutral-50 text-center space-y-1">
                  <div className="flex justify-center">
                    <TrustBadgeIcon icon={siteSettings.trustBadge3Icon || 'rotate-ccw'} defaultIcon="rotate-ccw" className="w-4 h-4 text-neutral-700" />
                  </div>
                  <div className="text-[11px] font-black text-neutral-900 leading-tight">
                    {siteSettings.trustBadge3Title || '৭ দিন রিটার্ন'}
                  </div>
                  <div className="text-[10px] text-neutral-500 leading-tight">
                    {siteSettings.trustBadge3Subtitle || 'সহজ পলিসি'}
                  </div>
                </div>
              )}
            </div>

            {/* Visual Sizing Chart with T-shirt Measurement Diagram (Description section removed as requested) */}
            <div className="pt-2 border-t border-neutral-200">
              <ProductSizeChartSection
                selectedSize={selectedSize}
                onSelectSize={(sz) => {
                  setSelectedSize(sz);
                  setSizeError(null);
                }}
                measurements={activeMeasurements}
              />
            </div>

            {/* Note: Specification section is explicitly removed as requested */}

          </div>

        </div>
      </div>

      {/* ========================================================
          SIZE GUIDE MODAL (MATCHING IMAGE 2 EXACTLY)
         ======================================================== */}
      {showSizeGuide && (
        <div 
          onClick={() => setShowSizeGuide(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-2xl p-5 sm:p-6 shadow-2xl border border-neutral-200 space-y-4 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <h3 className="text-base font-black text-neutral-900">
                সাইজ গাইড
              </h3>
              <span className="text-xs text-neutral-500 font-semibold">
                পরিমাপ ইঞ্চিতে
              </span>
            </div>

            {/* Table Matching Image 2 */}
            <div className="overflow-hidden rounded-xl border border-neutral-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-100 text-neutral-800 font-bold border-b border-neutral-200">
                  <tr>
                    <th className="py-2.5 px-3">সাইজ</th>
                    <th className="py-2.5 px-3">চেস্ট</th>
                    <th className="py-2.5 px-3">লেংথ</th>
                    <th className="py-2.5 px-3">শোল্ডার</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-neutral-800 font-mono">
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
                          isSelected ? 'bg-neutral-900 text-white font-bold' : 'hover:bg-neutral-50'
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

            <p className="text-[11px] text-neutral-500 text-center">
              সাইজ সম্পর্কে কোনো প্রশ্ন থাকলে আমাদের সাথে যোগাযোগ করুন।
            </p>

            <button
              type="button"
              onClick={() => setShowSizeGuide(false)}
              className="w-full py-2.5 rounded-lg bg-neutral-900 text-white font-bold text-xs hover:bg-black transition-colors cursor-pointer"
            >
              ঠিক আছে
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
