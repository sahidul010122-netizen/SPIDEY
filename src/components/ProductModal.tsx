import React, { useState, useRef, useEffect } from 'react';
import { 
  X, ChevronLeft, ChevronRight, ZoomIn, Heart, 
  Share2, Check, Star, Download, Sparkles, MessageCircle, ExternalLink, Copy
} from 'lucide-react';
import { JerseyProduct } from '../types';
import { CurrencyCode, formatPrice } from '../utils/currency';
import { SiteSettings } from '../types/settings';

interface ProductModalProps {
  jersey: JerseyProduct | null;
  onClose: () => void;
  isWishlisted: boolean;
  onToggleWishlist: (jersey: JerseyProduct) => void;
  currency: CurrencyCode;
  siteSettings?: SiteSettings;
  onOrderProduct?: (jersey: JerseyProduct, selectedSize?: string) => void;
}

interface ProductModalContentProps {
  jersey: JerseyProduct;
  onClose: () => void;
  isWishlisted: boolean;
  onToggleWishlist: (jersey: JerseyProduct) => void;
  currency: CurrencyCode;
  siteSettings?: SiteSettings;
  onOrderProduct?: (jersey: JerseyProduct, selectedSize?: string) => void;
}

const ProductModalContent: React.FC<ProductModalContentProps> = ({
  jersey,
  onClose,
  isWishlisted,
  onToggleWishlist,
  currency,
  siteSettings,
  onOrderProduct
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>(jersey.sizes?.[0] || 'L');
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // High-Definition Zoom State
  const [isZooming, setIsZooming] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Touch Swipe Gesture State for Mobile
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Available Sizes fallback
  const availableSizes = jersey.sizes && jersey.sizes.length > 0 ? jersey.sizes : ['S', 'M', 'L', 'XL', 'XXL', '3XL'];

  // Current active image URL
  const currentImageUrl = jersey.images[activeImageIndex] || jersey.images[0];

  // Official Business WhatsApp Configuration
  const rawWhatsApp = siteSettings?.whatsappNumber || '8801715123766';
  let cleanPhone = rawWhatsApp.replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('01') && cleanPhone.length === 11) {
    cleanPhone = `88${cleanPhone}`;
  }
  if (!cleanPhone || cleanPhone.length < 10) {
    cleanPhone = '8801715123766';
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeImageIndex, jersey.images.length]);

  const nextImage = () => {
    if (jersey.images.length > 1) {
      setActiveImageIndex((prev) => (prev + 1) % jersey.images.length);
    }
  };

  const prevImage = () => {
    if (jersey.images.length > 1) {
      setActiveImageIndex((prev) => (prev - 1 + jersey.images.length) % jersey.images.length);
    }
  };

  // Mouse coordinate tracker for HD fabric zoom
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  // Touch Swipe Handlers for mobile gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 40) nextImage();
    if (distance < -40) prevImage();
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Handle Share Product
  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareTitle = `${jersey.title} - ${siteSettings?.brandName || 'Spidey'}`;
    const shareText = `Check out ${jersey.title} (${jersey.code || ''}) on ${siteSettings?.brandName || 'Spidey'}! Price: ${formatPrice(jersey.price, currency)}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        });
        return;
      } catch (err) {
        // User cancelled or share API not supported
      }
    }

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Handle Download Image for customer gallery/screenshot sharing
  const handleDownloadImage = async () => {
    try {
      setIsDownloading(true);
      const res = await fetch(currentImageUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = `${jersey.code || 'jersey'}-${jersey.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${activeImageIndex + 1}.jpg`;
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      // Fallback: Open in new tab for direct download
      window.open(currentImageUrl, '_blank');
    } finally {
      setTimeout(() => setIsDownloading(false), 1000);
    }
  };

  const discountPercent = jersey.originalPrice && jersey.originalPrice > jersey.price
    ? Math.round(((jersey.originalPrice - jersey.price) / jersey.originalPrice) * 100)
    : 0;

  // Generate WhatsApp Message
  const handleWhatsAppOrder = () => {
    let fullImageUrl = currentImageUrl || '';
    if (fullImageUrl.startsWith('/')) {
      fullImageUrl = `${window.location.origin}${fullImageUrl}`;
    } else if (fullImageUrl && !fullImageUrl.startsWith('http')) {
      fullImageUrl = `${window.location.origin}/${fullImageUrl}`;
    }

    const text = `হ্যালো! আমি এই জার্সিটি নিতে চাচ্ছি।\n\n` +
      `প্রোডাক্ট: ${jersey.title}\n\n` +
      `সাইজ: ${selectedSize}\n\n` +
      `ছবি: ${fullImageUrl}`;

    const encodedText = encodeURIComponent(text);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      id="product-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 overflow-hidden animate-in fade-in duration-150"
    >
      <div
        id="product-modal-container"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-2xl md:max-w-3xl bg-white text-neutral-900 rounded-t-3xl sm:rounded-3xl border border-neutral-200/90 shadow-2xl overflow-hidden max-h-[90vh] sm:max-h-[88vh] flex flex-col animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-2 duration-200"
      >
        {/* Mobile Drag Indicator Bar */}
        <div className="w-12 h-1 bg-neutral-300 rounded-full mx-auto mt-2 sm:hidden shrink-0" />

        {/* Modal Top Header Bar */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 border-b border-neutral-100 flex items-center justify-between gap-2 bg-neutral-50/80 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {jersey.code && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-neutral-900 text-white shadow-xs">
                {jersey.code}
              </span>
            )}
            <span className="text-xs font-semibold text-neutral-600 truncate">
              {jersey.category} • {jersey.season || '2024/25'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Download Image Button */}
            <button
              id="download-product-img-btn"
              onClick={handleDownloadImage}
              title="Download High-Res Image"
              disabled={isDownloading}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-full bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-700 transition-all flex items-center gap-1 text-xs cursor-pointer active:scale-95"
            >
              {isDownloading ? <Check className="w-3.5 h-3.5 text-emerald-600 animate-spin" /> : <Download className="w-3.5 h-3.5 text-neutral-700" />}
              <span className="hidden sm:inline text-[11px] font-medium">Download</span>
            </button>

            {/* Share Button */}
            <button
              id="share-product-btn"
              onClick={handleShare}
              title="Share Link"
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-full bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-700 transition-all flex items-center gap-1 text-xs cursor-pointer active:scale-95"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline text-[11px] font-medium">{isCopied ? 'Copied' : 'Share'}</span>
            </button>

            {/* Wishlist Button */}
            <button
              id="modal-wishlist-toggle"
              onClick={() => onToggleWishlist(jersey)}
              className={`p-1.5 sm:p-2 rounded-full border transition-all cursor-pointer ${
                isWishlisted
                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                  : 'bg-white border-neutral-200 text-neutral-600 hover:text-neutral-900'
              }`}
              title={isWishlisted ? 'Saved in favorites' : 'Save to favorites'}
            >
              <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-600 text-rose-600' : ''}`} />
            </button>

            {/* Close Button */}
            <button
              id="close-product-modal-btn"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Main Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          
          {/* Left Column: Clean Image Showcase & Multi-Angle Carousel */}
          <div className="flex flex-col space-y-2.5">
            <div
              ref={imageContainerRef}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseEnter={() => setIsZooming(true)}
              onMouseLeave={() => setIsZooming(false)}
              onMouseMove={handleMouseMove}
              className="relative aspect-[1/1] rounded-2xl overflow-hidden bg-[#f6f7f9] border border-neutral-200/80 flex items-center justify-center cursor-crosshair group select-none shadow-xs"
            >
              {/* Normal Product Image */}
              <img
                src={currentImageUrl}
                alt={jersey.title}
                referrerPolicy="no-referrer"
                className={`w-full h-full object-contain p-3 transition-opacity duration-200 ${
                  isZooming ? 'opacity-0' : 'opacity-100'
                }`}
              />

              {/* High-Definition 2.5x Fabric Zoom Lens */}
              {isZooming && (
                <div
                  className="absolute inset-0 w-full h-full pointer-events-none bg-no-repeat rounded-2xl"
                  style={{
                    backgroundImage: `url(${currentImageUrl})`,
                    backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                    backgroundSize: '250%',
                  }}
                />
              )}

              {/* Quick Action Overlay: Download Image Floating Button */}
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadImage();
                  }}
                  className="p-1.5 rounded-full bg-white/90 hover:bg-white text-neutral-700 shadow-xs border border-neutral-200/80 transition-transform active:scale-90"
                  title="Save / Download Image"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Navigation Arrows for multi images */}
              {jersey.images.length > 1 && (
                <>
                  <button
                    id="prev-image-modal-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      prevImage();
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 hover:bg-white text-neutral-800 shadow-sm transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    id="next-image-modal-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      nextImage();
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 hover:bg-white text-neutral-800 shadow-sm transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* Zoom Helper Pill */}
              <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-white/90 backdrop-blur-xs shadow-xs border border-neutral-200 text-[10px] font-medium text-neutral-700 flex items-center gap-1 pointer-events-none">
                <ZoomIn className="w-3 h-3 text-neutral-900" />
                <span>{isZooming ? '2.5x HD Zoom' : 'Zoom'}</span>
              </div>

              {/* Counter Pill */}
              {jersey.images.length > 1 && (
                <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-xs shadow-xs border border-neutral-200 text-[10px] font-mono text-neutral-600 pointer-events-none">
                  {activeImageIndex + 1}/{jersey.images.length}
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {jersey.images.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none justify-center">
                {jersey.images.map((img, idx) => (
                  <button
                    key={idx}
                    id={`thumb-btn-${idx}`}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-12 h-12 rounded-xl overflow-hidden bg-[#f6f7f9] border transition-all shrink-0 p-0.5 cursor-pointer ${
                      activeImageIndex === idx
                        ? 'border-neutral-900 ring-2 ring-neutral-900 shadow-xs scale-105'
                        : 'border-neutral-200 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Clean Essential Info, Size Selector & WhatsApp Order Action */}
          <div className="flex flex-col justify-between space-y-3.5">
            <div className="space-y-3">
              
              {/* Title & Edition */}
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-neutral-900 tracking-tight leading-snug">
                  {jersey.title}
                </h1>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {jersey.edition || 'Official Premium Edition'} • {jersey.season || '2024/25'}
                </p>
              </div>

              {/* Price & Discount Bar */}
              <div className="flex items-baseline gap-2.5 p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
                <div className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
                  {formatPrice(jersey.price, currency)}
                </div>
                {jersey.originalPrice && jersey.originalPrice > jersey.price && (
                  <div className="text-xs text-neutral-400 line-through">
                    {formatPrice(jersey.originalPrice, currency)}
                  </div>
                )}
                {discountPercent > 0 && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-700">
                    -{discountPercent}% OFF
                  </span>
                )}
              </div>

              {/* Rating & Stock Status */}
              <div className="flex items-center justify-between text-xs text-neutral-600">
                <div className="flex items-center gap-1">
                  <div className="flex text-amber-500">
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                  </div>
                  <span className="font-bold text-neutral-900">{jersey.rating?.toFixed(1) || '4.9'}</span>
                  <span className="text-neutral-400">({jersey.reviewCount || 128} reviews)</span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Ready Stock in BD
                </span>
              </div>

              {/* Interactive Size Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-neutral-900">
                    Select Size / সাইজ নির্বাচন করুন:
                  </label>
                  <span className="text-[11px] text-neutral-500 font-medium">
                    Selected: <strong className="text-neutral-900">{selectedSize}</strong>
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {availableSizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`min-w-[42px] h-9 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                        selectedSize === size
                          ? 'bg-neutral-900 text-white shadow-sm scale-105 ring-2 ring-neutral-900'
                          : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200/80'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Concise Highlights */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-bold text-neutral-800 uppercase tracking-wider">
                  Product Details:
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed line-clamp-3">
                  {jersey.description || 'Premium Master Copy Thai Edition Jersey with breathable micro-mesh fabric, official crest, and authentic stitching.'}
                </p>
                
                {jersey.features && jersey.features.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {jersey.features.slice(0, 3).map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-100 text-[10px] text-neutral-700 font-medium">
                        <Check className="w-3 h-3 text-emerald-600" />
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Bottom Action Section: Direct WhatsApp Order Button */}
            <div className="pt-3 border-t border-neutral-100 space-y-2 shrink-0">
              {/* Green / High-Conversion WhatsApp Order Button */}
              <button
                id="modal-whatsapp-order-btn"
                type="button"
                onClick={handleWhatsAppOrder}
                className="w-full py-3.5 sm:py-3.5 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] active:bg-[#1caa51] text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>অর্ডার করুন (WhatsApp) - Size: {selectedSize}</span>
              </button>

              {/* Close & Image Save Sub-links */}
              <div className="flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={handleDownloadImage}
                  className="text-[11px] text-neutral-500 hover:text-neutral-900 font-medium flex items-center gap-1 transition-colors cursor-pointer py-1"
                >
                  <Download className="w-3 h-3 text-neutral-500" />
                  <span>ছবি ডাউনলোড করুন</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="text-[11px] text-neutral-500 hover:text-neutral-800 font-medium transition-colors cursor-pointer py-1"
                >
                  Close / বন্ধ করুন
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export const ProductModal: React.FC<ProductModalProps> = ({
  jersey,
  onClose,
  isWishlisted,
  onToggleWishlist,
  currency,
  siteSettings,
  onOrderProduct
}) => {
  if (!jersey) return null;

  return (
    <ProductModalContent
      key={jersey.id}
      jersey={jersey}
      onClose={onClose}
      isWishlisted={isWishlisted}
      onToggleWishlist={onToggleWishlist}
      currency={currency}
      siteSettings={siteSettings}
      onOrderProduct={onOrderProduct}
    />
  );
};
