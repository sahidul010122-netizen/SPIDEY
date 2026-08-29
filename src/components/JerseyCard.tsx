import React from 'react';
import { Heart, Eye, Sparkles } from 'lucide-react';
import { JerseyProduct } from '../types';
import { CurrencyCode, formatPrice } from '../utils/currency';

interface JerseyCardProps {
  jersey: JerseyProduct;
  onInspect: (jersey: JerseyProduct) => void;
  isWishlisted: boolean;
  onToggleWishlist: (jersey: JerseyProduct) => void;
  currency: CurrencyCode;
}

export const JerseyCard: React.FC<JerseyCardProps> = ({
  jersey,
  onInspect,
  isWishlisted,
  onToggleWishlist,
  currency
}) => {
  return (
    <div className="flex flex-col select-none group product-card-container">
      
      {/* Soft Gray Image Box matching screenshot */}
      <div 
        onClick={() => onInspect(jersey)}
        className="relative aspect-[1/1.15] w-full rounded-2xl sm:rounded-3xl bg-[#f6f7f9] p-3.5 sm:p-5 flex items-center justify-center cursor-pointer overflow-hidden"
      >
        {/* Centered Product Image */}
        <img
          src={jersey.images[0]}
          alt={jersey.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain object-center img-smooth-zoom transition-transform duration-300 drop-shadow-sm"
        />

        {/* Floating Circular Wishlist Heart in Top-Right Corner */}
        <button
          id={`wishlist-btn-${jersey.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist(jersey);
          }}
          aria-label="Wishlist"
          className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/80 hover:bg-white backdrop-blur-md shadow-sm flex items-center justify-center text-neutral-600 hover:text-rose-600 transition-all active:scale-90"
        >
          <Heart 
            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
              isWishlisted ? 'fill-rose-600 text-rose-600' : 'text-neutral-500'
            }`} 
          />
        </button>

        {/* Optional Subtle Badge (e.g. Bestseller, Limited) */}
        {jersey.badge && jersey.badge !== 'Standard' && (
          <div className="absolute bottom-2.5 left-2.5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-neutral-900 text-white shadow-sm">
              {jersey.badge}
            </span>
          </div>
        )}
      </div>

      {/* Product Details matching screenshot */}
      <div 
        onClick={() => onInspect(jersey)}
        className="pt-2.5 sm:pt-3 space-y-0.5 cursor-pointer"
      >
        {/* Title */}
        <h3 className="text-xs sm:text-sm font-bold text-neutral-900 leading-snug line-clamp-1 group-hover:text-neutral-700 transition-colors">
          {jersey.title}
        </h3>

        {/* Subtitle / Model Edition */}
        <p className="text-[10px] sm:text-xs text-neutral-500 line-clamp-1">
          {jersey.edition || jersey.season || jersey.category}
        </p>

        {/* Price */}
        <div className="pt-0.5 flex items-center justify-between">
          <div>
            <span className="text-xs sm:text-sm font-bold text-neutral-900">
              {formatPrice(jersey.price, currency)}
            </span>
            {jersey.originalPrice && jersey.originalPrice > jersey.price && (
              <span className="ml-1.5 text-[10px] sm:text-xs text-neutral-400 line-through">
                {formatPrice(jersey.originalPrice, currency)}
              </span>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
