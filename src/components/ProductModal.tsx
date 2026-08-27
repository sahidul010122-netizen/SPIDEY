import React, { useState, useRef, useEffect } from 'react';
import { 
  X, ChevronLeft, ChevronRight, ZoomIn, Heart, 
  ShieldCheck, Share2, Check, Star
} from 'lucide-react';
import { JerseyProduct } from '../types';
import { CurrencyCode, formatPrice } from '../utils/currency';

interface ProductModalProps {
  jersey: JerseyProduct | null;
  onClose: () => void;
  isWishlisted: boolean;
  onToggleWishlist: (jersey: JerseyProduct) => void;
  currency: CurrencyCode;
}

interface ProductModalContentProps {
  jersey: JerseyProduct;
  onClose: () => void;
  isWishlisted: boolean;
  onToggleWishlist: (jersey: JerseyProduct) => void;
  currency: CurrencyCode;
}

const ProductModalContent: React.FC<ProductModalContentProps> = ({
  jersey,
  onClose,
  isWishlisted,
  onToggleWishlist,
  currency
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'specs' | 'details'>('overview');
  const [isCopied, setIsCopied] = useState(false);

  // High-Definition Magnification Lens State
  const [isZooming, setIsZooming] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Touch Swipe Gesture State
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Keyboard navigation & Escape handler
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
    setActiveImageIndex((prev) => (prev + 1) % jersey.images.length);
  };

  const prevImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + jersey.images.length) % jersey.images.length);
  };

  // Mouse coordinate tracker for 2.8x microscopic fabric zoom lens
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  // Touch Swipe Handlers for smooth mobile gestures
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

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const discountPercent = jersey.originalPrice
    ? Math.round(((jersey.originalPrice - jersey.price) / jersey.originalPrice) * 100)
    : 0;

  return (
    <div 
      id="product-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        id="product-modal-container"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl rounded-3xl bg-white text-neutral-900 border border-neutral-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Modal Header Bar */}
        <div className="px-5 sm:px-7 py-3.5 sm:py-4 border-b border-neutral-100 flex items-center justify-between gap-4 bg-neutral-50/70 shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-neutral-900 text-white uppercase tracking-wider">
              {jersey.category}
            </span>
            <span className="text-xs text-neutral-500 hidden sm:inline font-mono">
              • {jersey.season} {jersey.edition}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="share-product-btn"
              onClick={handleShare}
              title="Share Link"
              className="p-2 rounded-full bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-700 transition-all flex items-center gap-1.5 text-xs px-3"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isCopied ? 'Copied' : 'Share'}</span>
            </button>

            <button
              id="modal-wishlist-toggle"
              onClick={() => onToggleWishlist(jersey)}
              className={`p-2 rounded-full border transition-all ${
                isWishlisted
                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                  : 'bg-white border-neutral-200 text-neutral-600 hover:text-neutral-900'
              }`}
              title={isWishlisted ? 'Saved in favorites' : 'Save to favorites'}
            >
              <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-600 text-rose-600' : ''}`} />
            </button>

            <button
              id="close-product-modal-btn"
              onClick={onClose}
              className="p-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 sm:p-7">
          
          {/* Left Column: Interactive Zoom & Swipe Stage (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-3 sm:space-y-4">
            
            {/* Main Interactive Stage with Microscopic Zoom Lens */}
            <div
              ref={imageContainerRef}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseEnter={() => setIsZooming(true)}
              onMouseLeave={() => setIsZooming(false)}
              onMouseMove={handleMouseMove}
              className="relative aspect-[4/4] rounded-2xl overflow-hidden bg-[#f6f7f9] border border-neutral-200/80 flex items-center justify-center cursor-crosshair group select-none shadow-sm"
            >
              {/* Normal Base Image */}
              <img
                src={jersey.images[activeImageIndex] || jersey.images[0]}
                alt={jersey.title}
                referrerPolicy="no-referrer"
                className={`w-full h-full object-contain p-4 transition-opacity duration-300 ${
                  isZooming ? 'opacity-0' : 'opacity-100'
                }`}
              />

              {/* 2.8x Microscopic High-Definition Zoom View */}
              {isZooming && (
                <div
                  className="absolute inset-0 w-full h-full pointer-events-none bg-no-repeat rounded-2xl"
                  style={{
                    backgroundImage: `url(${jersey.images[activeImageIndex] || jersey.images[0]})`,
                    backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                    backgroundSize: '280%',
                  }}
                />
              )}

              {/* Floating Navigation Arrows */}
              {jersey.images.length > 1 && (
                <>
                  <button
                    id="prev-image-modal-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      prevImage();
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/90 hover:bg-white text-neutral-800 shadow-md transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    id="next-image-modal-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      nextImage();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/90 hover:bg-white text-neutral-800 shadow-md transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* Zoom Helper Badge */}
              <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/90 shadow-sm border border-neutral-200 text-[11px] font-medium text-neutral-700 flex items-center gap-1.5 pointer-events-none">
                <ZoomIn className="w-3.5 h-3.5 text-neutral-900" />
                <span>{isZooming ? '2.8x HD Zoom' : 'Hover / Tap to Zoom'}</span>
              </div>

              <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-white/90 shadow-sm border border-neutral-200 text-[11px] font-mono text-neutral-600 pointer-events-none">
                {activeImageIndex + 1} / {jersey.images.length}
              </div>
            </div>

            {/* Bottom Multi-Angle Thumbnail Strip */}
            {jersey.images.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto p-1 scrollbar-none">
                {jersey.images.map((img, idx) => (
                  <button
                    key={idx}
                    id={`thumb-btn-${idx}`}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-16 h-16 rounded-xl overflow-hidden bg-[#f6f7f9] border transition-all shrink-0 p-1 ${
                      activeImageIndex === idx
                        ? 'border-neutral-900 ring-2 ring-neutral-900 shadow-md scale-105'
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

          {/* Right Column: Product Details (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <div>
              {/* Season & Edition Badges */}
              <div className="flex items-center gap-2 mb-1.5 text-xs text-neutral-500">
                <span>{jersey.season}</span>
                <span>•</span>
                <span className="text-neutral-900 font-semibold">{jersey.edition}</span>
              </div>

              {/* Product Headline */}
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight leading-tight">
                {jersey.title}
              </h1>

              {/* Price & Rating */}
              <div className="flex items-baseline gap-3 mt-3">
                <div className="text-2xl font-bold text-neutral-900">
                  {formatPrice(jersey.price, currency)}
                </div>
                {jersey.originalPrice && (
                  <div className="text-sm text-neutral-400 line-through">
                    {formatPrice(jersey.originalPrice, currency)}
                  </div>
                )}
                {discountPercent > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                    Save {discountPercent}%
                  </span>
                )}
              </div>

              {/* Rating */}
              <div className="flex items-center gap-1.5 mt-2 text-xs text-neutral-600">
                <div className="flex text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-500" />
                  ))}
                </div>
                <span className="font-bold text-neutral-900">{jersey.rating.toFixed(1)}</span>
                <span>• {jersey.reviewCount} Verified Reviews</span>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed mt-4">
                {jersey.description}
              </p>

              {/* Interactive Tabs */}
              <div className="mt-5">
                <div className="flex rounded-xl bg-neutral-100 p-1 text-xs font-semibold">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      activeTab === 'overview' ? 'bg-white text-neutral-900 font-bold shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
                    }`}
                  >
                    Features
                  </button>
                  <button
                    onClick={() => setActiveTab('specs')}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      activeTab === 'specs' ? 'bg-white text-neutral-900 font-bold shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
                    }`}
                  >
                    Specs
                  </button>
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      activeTab === 'details' ? 'bg-white text-neutral-900 font-bold shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
                    }`}
                  >
                    Authenticity
                  </button>
                </div>

                <div className="mt-3.5 p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 text-xs space-y-2.5">
                  {activeTab === 'overview' && (
                    <ul className="space-y-2 text-neutral-700">
                      {jersey.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {activeTab === 'specs' && (
                    <div className="space-y-2 text-neutral-700 text-[11px]">
                      <div className="flex justify-between border-b border-neutral-200 pb-1">
                        <span className="text-neutral-500">Material & Build:</span>
                        <span className="font-semibold text-neutral-900">Polycarbonate & Impact Foam Matrix</span>
                      </div>
                      <div className="flex justify-between border-b border-neutral-200 pb-1">
                        <span className="text-neutral-500">Drop Rating:</span>
                        <span className="font-semibold text-neutral-900">MIL-STD 810G Certified</span>
                      </div>
                      <div className="flex justify-between border-b border-neutral-200 pb-1">
                        <span className="text-neutral-500">Magnetic Compatibility:</span>
                        <span className="font-semibold text-neutral-900">MagSafe Neodymium Array</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Edition:</span>
                        <span className="font-semibold text-neutral-900">{jersey.edition}</span>
                      </div>
                    </div>
                  )}

                  {activeTab === 'details' && (
                    <div className="space-y-2 text-neutral-700 text-xs">
                      <div className="flex items-center gap-2 text-neutral-900 font-bold">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Official Authenticity Guaranteed</span>
                      </div>
                      <p className="text-neutral-500 text-[11px] leading-relaxed">
                        Every product comes with serial batch authentication, laser-verified tolerances, and lifetime warranty registration.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-neutral-100 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-neutral-600">
                <span>Sizes Available:</span>
                <span className="text-neutral-900 font-bold">{jersey.sizes.join(' • ')}</span>
              </div>

              <div>
                <button
                  onClick={onClose}
                  className="w-full py-3 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs shadow-sm transition-all"
                >
                  Close View
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
  currency
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
    />
  );
};
