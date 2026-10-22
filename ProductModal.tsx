import React, { useState, useRef, useEffect } from 'react';
import { 
  X, ChevronLeft, ChevronRight, Heart, Share2, 
  Check, Download, MessageCircle, Ruler, ShoppingBag, 
  Sparkles, Zap, ShieldCheck, Tag, AlertCircle, ToggleLeft, ToggleRight
} from 'lucide-react';
import { JerseyProduct, CartItem } from '../types';
import { CurrencyCode, formatPrice } from '../utils/currency';
import { SiteSettings } from '../types/settings';

interface ProductModalProps {
  jersey: JerseyProduct | null;
  onClose: () => void;
  isWishlisted: boolean;
  onToggleWishlist: (jersey: JerseyProduct) => void;
  currency: CurrencyCode;
  siteSettings?: SiteSettings;
  onAddToCart?: (item: CartItem) => void;
  onBuyNow?: (item: CartItem) => void;
  onOrderProduct?: (jersey: JerseyProduct, selectedSize?: string) => void;
}

// Updated Size Guide Format matching user's exact specification:
// Previous S -> M, M -> L, L -> XL, XL -> XXL, XXL -> XXXL
// With Chest (চেস্ট), Length (দৈর্ঘ্য), and Shoulder (শোল্ডার) in inches
const DEFAULT_SIZE_GUIDE_DATA = [
  { size: 'M', chest: '36 - 38"', length: '27"', shoulder: '16.5"' },
  { size: 'L', chest: '38 - 40"', length: '28"', shoulder: '17.5"' },
  { size: 'XL', chest: '40 - 42"', length: '29"', shoulder: '18.5"' },
  { size: 'XXL', chest: '42 - 44"', length: '30"', shoulder: '19.5"' },
  { size: 'XXXL', chest: '44 - 46"', length: '31"', shoulder: '20.5"' },
];

// Updated standard sizes: S->M, M->L, L->XL, XL->XXL, XXL->XXXL
const STANDARD_SIZES = ['M', 'L', 'XL', 'XXL', 'XXXL'];

export const ProductModal: React.FC<ProductModalProps> = ({
  jersey,
  onClose,
  isWishlisted,
  onToggleWishlist,
  currency,
  siteSettings,
  onAddToCart,
  onBuyNow,
  onOrderProduct
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Mandatory requirement: No size selected by default (Required)
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [sizeError, setSizeError] = useState<string | null>(null);

  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showSizeChart, setShowSizeChart] = useState(false);

  // Customization Section state
  const [hasCustomization, setHasCustomization] = useState(false);
  // Separate toggles for Name box & Number box
  const [hasNameBox, setHasNameBox] = useState(true);
  const [hasNumberBox, setHasNumberBox] = useState(true);
  const [customName, setCustomName] = useState('');
  const [customNumber, setCustomNumber] = useState('');
  const [addedToast, setAddedToast] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Image Array and Touch Swipe Handling
  const safeImages = Array.isArray(jersey?.images) && jersey.images.length > 0
    ? jersey.images
    : [];

  const nextImage = () => {
    if (safeImages.length > 1) {
      setActiveImageIndex((prev) => (prev + 1) % safeImages.length);
    }
  };

  const prevImage = () => {
    if (safeImages.length > 1) {
      setActiveImageIndex((prev) => (prev - 1 + safeImages.length) % safeImages.length);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 45) {
      nextImage(); // Swiped left -> next
    } else if (diff < -45) {
      prevImage(); // Swiped right -> prev
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [safeImages.length]);

  if (!jersey) return null;

  // Determine Customization Charge
  const isCustomChargePaid = jersey.customizationChargeType === 'paid' || 
    (!jersey.customizationChargeType && siteSettings?.defaultCustomizationChargeType === 'paid');

  const customFeeAmount = isCustomChargePaid
    ? (typeof jersey.customizationCharge === 'number' ? jersey.customizationCharge : (siteSettings?.defaultCustomizationCharge || 0))
    : 0;

  const customizationPricingLabel = (!isCustomChargePaid || customFeeAmount === 0)
    ? 'ফ্রি (Free)'
    : `+৳${customFeeAmount}`;

  // Size chart measurements (from settings or fallback)
  const activeSizeGuideData = (Array.isArray(siteSettings?.sizeGuideMeasurements) && siteSettings.sizeGuideMeasurements.length > 0)
    ? siteSettings.sizeGuideMeasurements
    : DEFAULT_SIZE_GUIDE_DATA;

  // Sizes scale: M, L, XL, XXL, XXXL
  const availableSizes = STANDARD_SIZES;

  // Calculate current item total
  const itemCustomFee = hasCustomization ? customFeeAmount : 0;
  const currentTotal = (jersey.price || 0) + itemCustomFee;

  // Validation function for size selection
  const validateSize = (): boolean => {
    if (!selectedSize) {
      setSizeError('অনুগ্রহ করে আপনার সাইজ সিলেক্ট করুন (সাইজ নির্বাচন আবশ্যক)');
      return false;
    }
    setSizeError(null);
    return true;
  };

  // Build CartItem object
  const createCartItem = (): CartItem => {
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
      quantity: 1,
      addedAt: Date.now()
    };
  };

  // Add to Cart handler
  // Requirement 2: No full page refresh or jumping away, displays floating bottom bar
  const handleAddToCartClick = () => {
    if (!validateSize()) return;
    const item = createCartItem();
    if (onAddToCart) {
      onAddToCart(item);
    }
    setAddedToast(true);
    setTimeout(() => {
      setAddedToast(false);
      onClose(); // Close modal so user sees bottom floating slide cart prominently
    }, 600);
  };

  // Buy Now handler
  // Requirement 2: Directly adds to cart and surfaces the floating slide cart bar smoothly
  const handleBuyNowClick = () => {
    if (!validateSize()) return;
    const item = createCartItem();
    if (onBuyNow) {
      onBuyNow(item);
    } else if (onAddToCart) {
      onAddToCart(item);
    }
    onClose();
  };

  // WhatsApp Order Link
  const handleWhatsAppOrder = () => {
    if (!validateSize()) return;

    const rawWhatsApp = siteSettings?.whatsappNumber || '8801715123766';
    let cleanPhone = rawWhatsApp.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('01') && cleanPhone.length === 11) {
      cleanPhone = `88${cleanPhone}`;
    }
    if (!cleanPhone || cleanPhone.length < 10) {
      cleanPhone = '8801715123766';
    }

    const currentImg = safeImages[activeImageIndex] || safeImages[0];
    let fullImageUrl = currentImg;
    if (fullImageUrl && !fullImageUrl.startsWith('http') && typeof window !== 'undefined') {
      fullImageUrl = `${window.location.origin}${fullImageUrl.startsWith('/') ? '' : '/'}${fullImageUrl}`;
    }

    let customDetails = 'নেই';
    if (hasCustomization && (customName || customNumber)) {
      customDetails = `নাম: ${customName || 'N/A'}, নাম্বার: ${customNumber || 'N/A'}`;
    }

    const text = `হ্যালো! আমি এই জার্সিটি অর্ডার করতে চাচ্ছি।\n\n` +
      `প্রোডাক্ট: ${jersey.title}${jersey.code ? ` [${jersey.code}]` : ''}\n` +
      `সাইজ: ${selectedSize}\n` +
      `কাস্টমাইজেশন: ${customDetails}\n` +
      `মূল্য: ${formatPrice(currentTotal, currency)}\n` +
      `ছবি: ${fullImageUrl}`;

    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/${cleanPhone}?text=${encodedText}`, '_blank', 'noopener,noreferrer');
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

  const handleDownloadImage = async () => {
    try {
      setIsDownloading(true);
      const url = safeImages[activeImageIndex];
      const resp = await fetch(url);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${jersey.title.replace(/[^a-zA-Z0-9]/g, '_')}_${activeImageIndex + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(safeImages[activeImageIndex], '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div 
      id="product-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 overflow-hidden animate-in fade-in duration-150"
    >
      <div
        id="product-modal-container"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-lg md:max-w-xl bg-white text-neutral-900 rounded-t-[32px] sm:rounded-[32px] border border-neutral-200/90 shadow-2xl overflow-hidden max-h-[94vh] sm:max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-5 duration-200"
      >
        {/* Mobile Pull Bar */}
        <div className="w-10 h-1 bg-neutral-300 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* Top Header Actions */}
        <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between border-b border-neutral-100 bg-white/90 backdrop-blur-xs shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            {jersey.code && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-neutral-900 text-rose-400">
                {jersey.code}
              </span>
            )}
            <span className="text-xs text-neutral-500 font-semibold truncate">
              {jersey.category}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleShare}
              title="Share Link"
              className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-600 transition-colors cursor-pointer"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            </button>

            <button
              onClick={() => onToggleWishlist(jersey)}
              title="Wishlist"
              className="p-1.5 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-600 text-rose-600' : 'text-neutral-600'}`} />
            </button>

            <button
              onClick={onClose}
              title="Close"
              className="p-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Single-Product Body: Top Images, Below Info */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">

          {/* 1. TOP IMAGE GALLERY WITH TOUCH-SWIPE */}
          <div className="space-y-2">
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="relative aspect-[1/1] w-full max-h-[340px] sm:max-h-[360px] mx-auto rounded-2xl overflow-hidden bg-[#f7f8fa] border border-neutral-200/80 flex items-center justify-center select-none shadow-xs group"
            >
              {safeImages[activeImageIndex] ? (
                <img
                  src={safeImages[activeImageIndex]}
                  alt={jersey.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain p-2 transition-all duration-200"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-neutral-400">
                  <span className="text-xs font-medium">No Image</span>
                </div>
              )}

              {/* Prev / Next Arrows */}
              {safeImages.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      prevImage();
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 hover:bg-white text-neutral-800 shadow-md transition-all active:scale-90 opacity-80 group-hover:opacity-100"
                    title="Previous photo"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      nextImage();
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 hover:bg-white text-neutral-800 shadow-md transition-all active:scale-90 opacity-80 group-hover:opacity-100"
                    title="Next photo"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* Download Photo Action */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadImage();
                }}
                disabled={isDownloading}
                className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-white/90 hover:bg-white text-neutral-700 shadow-xs border border-neutral-200/70 transition-all active:scale-90"
                title="Download Photo"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              {/* Image Counter Badge */}
              {safeImages.length > 1 && (
                <div className="absolute bottom-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-white/90 backdrop-blur-xs text-[10px] font-mono font-bold text-neutral-700 shadow-2xs border border-neutral-200/80">
                  {activeImageIndex + 1} / {safeImages.length}
                </div>
              )}
            </div>

            {/* Thumbnail Dots */}
            {safeImages.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 pt-1">
                {safeImages.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      activeImageIndex === idx
                        ? 'w-6 bg-neutral-900'
                        : 'w-2 bg-neutral-300 hover:bg-neutral-400'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 2. PRODUCT NAME & DETAILS (NO COLOR SECTION) */}
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-extrabold text-neutral-900 tracking-tight leading-snug">
              {jersey.title}
            </h2>
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <span>{jersey.edition || 'Authentic Match Edition'}</span>
              <span>•</span>
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                ইন স্টক (রেডি ডেলিভারি)
              </span>
            </div>
            {jersey.description && (
              <p className="text-xs text-neutral-500 pt-0.5 line-clamp-2">
                {jersey.description}
              </p>
            )}
          </div>

          {/* 3. PRICE BLOCK */}
          <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200/70 flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
                {formatPrice(currentTotal, currency)}
              </span>
              {jersey.originalPrice && jersey.originalPrice > jersey.price && (
                <span className="text-xs text-neutral-400 line-through">
                  {formatPrice(jersey.originalPrice, currency)}
                </span>
              )}
            </div>
            {jersey.originalPrice && jersey.originalPrice > jersey.price && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-600 border border-rose-100">
                SAVE ৳{jersey.originalPrice - jersey.price}
              </span>
            )}
          </div>

          {/* 4. SIZE SELECTOR (MANDATORY: NO DEFAULT SELECTION, REQUIRED) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                <span>সাইজ নির্বাচন করুন:</span>
                {selectedSize ? (
                  <span className="px-1.5 py-0.5 rounded bg-neutral-900 text-white font-mono text-[11px] font-extrabold">
                    {selectedSize}
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 animate-pulse">
                    *আবশ্যক (Required)
                  </span>
                )}
              </label>

              {/* Size Chart Trigger */}
              <button
                type="button"
                onClick={() => setShowSizeChart(true)}
                className="text-[11px] font-bold text-neutral-800 hover:text-black flex items-center gap-1 underline transition-colors cursor-pointer"
              >
                <Ruler className="w-3.5 h-3.5 text-neutral-700" />
                <span>সাইজ চার্ট (Size Chart)</span>
              </button>
            </div>

            {/* Size Buttons Grid: M, L, XL, XXL, XXXL */}
            <div className="grid grid-cols-5 gap-2">
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
                    className={`h-11 rounded-xl text-xs font-black transition-all flex items-center justify-center cursor-pointer ${
                      isSelected
                        ? 'bg-neutral-900 text-white shadow-md ring-2 ring-neutral-900 scale-102 font-mono'
                        : sizeError
                        ? 'bg-rose-50/80 hover:bg-rose-100 text-neutral-800 border-2 border-rose-300 font-mono'
                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200 font-mono'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>

            {/* Validation Error Message */}
            {sizeError && (
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{sizeError}</span>
              </div>
            )}
          </div>

          {/* 5. CUSTOMIZATION SECTION (NAME BOX & NUMBER BOX SEPARATE ON/OFF TOGGLES) */}
          <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasCustomization}
                  onChange={(e) => setHasCustomization(e.target.checked)}
                  className="w-4 h-4 rounded text-neutral-900 focus:ring-neutral-900 border-neutral-300"
                />
                <span className="text-xs font-bold text-neutral-900">
                  জার্সিতে নাম ও নাম্বার প্রিন্ট করাতে চান?
                </span>
              </label>

              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                customFeeAmount === 0 || !isCustomChargePaid
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {customizationPricingLabel}
              </span>
            </div>

            {/* Customization Details with Separate Name Box & Number Box Toggles */}
            {hasCustomization && (
              <div className="space-y-3 pt-1 border-t border-neutral-200/60 animate-in fade-in slide-in-from-top-1 duration-150">
                
                {/* 1. NAME BOX (ON/OFF TOGGLE & INPUT) */}
                <div className="p-2.5 rounded-xl bg-white border border-neutral-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-neutral-800 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-neutral-600" />
                      <span>নাম বক্স (Name Box)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setHasNameBox(!hasNameBox)}
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full transition-colors cursor-pointer flex items-center gap-1 ${
                        hasNameBox
                          ? 'bg-neutral-900 text-white'
                          : 'bg-neutral-200 text-neutral-600'
                      }`}
                    >
                      {hasNameBox ? 'সক্রিয় (ON)' : 'বন্ধ (OFF)'}
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

                {/* 2. NUMBER BOX (ON/OFF TOGGLE & INPUT) */}
                <div className="p-2.5 rounded-xl bg-white border border-neutral-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-neutral-800 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-neutral-600" />
                      <span>নাম্বার বক্স (Number Box)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setHasNumberBox(!hasNumberBox)}
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full transition-colors cursor-pointer flex items-center gap-1 ${
                        hasNumberBox
                          ? 'bg-neutral-900 text-white'
                          : 'bg-neutral-200 text-neutral-600'
                      }`}
                    >
                      {hasNumberBox ? 'সক্রিয় (ON)' : 'বন্ধ (OFF)'}
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
            )}
          </div>

        </div>

        {/* Bottom Actions: Add to Cart & Buy Now */}
        <div className="p-4 border-t border-neutral-200/80 bg-white space-y-2 shrink-0">
          
          {addedToast && (
            <div className="p-2 rounded-xl bg-emerald-600 text-white text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-sm animate-in fade-in duration-150">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>কার্টে যোগ হয়েছে! নিচে স্লাইড কার্টটি দৃশ্যমান রয়েছে।</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            {/* Add to Cart Button */}
            <button
              id="modal-add-to-cart-btn"
              type="button"
              onClick={handleAddToCartClick}
              className="py-3 px-3 rounded-2xl bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 text-neutral-900 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98"
            >
              <ShoppingBag className="w-4 h-4 text-neutral-700" />
              <span>কার্ট যোগ (Add to Cart)</span>
            </button>

            {/* Buy Now Button */}
            <button
              id="modal-buy-now-btn"
              type="button"
              onClick={handleBuyNowClick}
              className="py-3 px-3 rounded-2xl bg-neutral-900 hover:bg-black active:bg-neutral-800 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-neutral-900/20 transition-all cursor-pointer active:scale-98"
            >
              <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
              <span>এখনই কিনুন (Buy Now)</span>
            </button>
          </div>

          {/* Quick WhatsApp link */}
          <div className="flex items-center justify-between px-1 pt-1">
            <button
              type="button"
              onClick={handleWhatsAppOrder}
              className="text-[11px] font-bold text-[#25D366] hover:text-[#20bd5a] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-[#25D366]" />
              <span>WhatsApp-এ সরাসরি অর্ডার</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-[11px] text-neutral-400 hover:text-neutral-700 font-medium transition-colors cursor-pointer"
            >
              বন্ধ করুন
            </button>
          </div>

        </div>

        {/* 6. UPDATED SIZE CHART POPUP MODAL (CHEST, LENGTH, SHOULDER IN INCHES, SCALE M TO XXXL) */}
        {showSizeChart && (
          <div 
            onClick={() => setShowSizeChart(false)}
            className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl border border-neutral-200 space-y-4 animate-in zoom-in-95 duration-150"
            >
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-neutral-900" />
                  <h3 className="text-sm font-extrabold text-neutral-900">
                    সাইজ চার্ট গাইড (Size Chart Guide)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSizeChart(false)}
                  className="p-1 rounded-full text-neutral-400 hover:text-neutral-900 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[11px] text-neutral-600 leading-relaxed">
                পরিমাপগুলো ইঞ্চি (Inches) হিসেবে দেওয়া হলো। যেকোনো রো-তে ক্লিক করে সরাসরি আপনার সাইজটি সিলেক্ট করতে পারেন:
              </p>

              {/* Table of measurements */}
              <div className="overflow-hidden rounded-2xl border border-neutral-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-neutral-100 text-neutral-700 font-bold border-b border-neutral-200 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">সাইজ</th>
                      <th className="py-2.5 px-2.5">চেস্ট (Chest)</th>
                      <th className="py-2.5 px-2.5">দৈর্ঘ্য (Length)</th>
                      <th className="py-2.5 px-2.5">শোল্ডার (Shoulder)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-neutral-800">
                    {activeSizeGuideData.map((item, idx) => {
                      const isCurrent = selectedSize === item.size;
                      return (
                        <tr 
                          key={idx}
                          onClick={() => {
                            setSelectedSize(item.size);
                            setSizeError(null);
                            setShowSizeChart(false);
                          }}
                          className={`cursor-pointer transition-colors ${
                            isCurrent 
                              ? 'bg-neutral-900 text-white font-bold' 
                              : 'hover:bg-neutral-50'
                          }`}
                        >
                          <td className="py-2.5 px-3 font-mono font-black">
                            <span className="flex items-center gap-1.5">
                              {item.size}
                              {isCurrent && <Check className="w-3 h-3 text-emerald-400" />}
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 font-mono">{item.chest}</td>
                          <td className="py-2.5 px-2.5 font-mono">{item.length}</td>
                          <td className="py-2.5 px-2.5 font-mono">{item.shoulder || '17 - 18"'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="text-[10px] text-neutral-400 text-center">
                *পূর্বের S=M, M=L, L=XL, XL=XXL, XXL=XXXL স্কেল অনুসরণ করা হয়েছে।
              </div>

              <button
                type="button"
                onClick={() => setShowSizeChart(false)}
                className="w-full py-2.5 rounded-xl bg-neutral-900 text-white font-bold text-xs hover:bg-black transition-colors cursor-pointer"
              >
                ঠিক আছে (Close)
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
