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
      
      {/* Full-width Product Image Container */}
      <div 
        onClick={() => onInspect(jersey)}
        className="relative aspect-[1/1.2] w-full flex items-center justify-center cursor-pointer overflow-hidden rounded-xl bg-transparent"
      >
        {/* Full-width Product Image */}
        <img
          src={jersey.images?.[0] || 'https://images.unsplash.com/photo-1577212017184-80cc0da11082?auto=format&fit=crop&w=400&q=80'}
          alt={jersey.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain object-center transition-transform duration-300 group-hover:scale-105"
        />

        {/* Floating Circular Wishlist Heart in Top-Right Corner */}
        <button
          id={`wishlist-btn-${jersey.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist(jersey);
          }}
          aria-label="Wishlist"
          className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 hover:bg-white backdrop-blur-xs shadow-xs flex items-center justify-center text-neutral-600 hover:text-rose-600 transition-all active:scale-90"
        >
          <Heart 
            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
              isWishlisted ? 'fill-rose-600 text-rose-600' : 'text-neutral-700'
            }`} 
          />
        </button>

        {/* Optional Subtle Badge */}
        {jersey.badge && jersey.badge !== 'Standard' && (
          <div className="absolute bottom-2 left-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-neutral-900 text-white shadow-xs">
              {jersey.badge}
            </span>
          </div>
        )}
      </div>

      {/* Product Details matching screenshot */}
      <div 
        onClick={() => onInspect(jersey)}
        className="pt-2 sm:pt-2.5 space-y-0.5 cursor-pointer"
      >
        {/* Title */}
        <h3 className="text-xs sm:text-sm font-semibold text-neutral-900 leading-snug line-clamp-1 group-hover:text-neutral-700 transition-colors">
          {jersey.title}
        </h3>

        {/* Price */}
        <div className="pt-0.5 flex items-center gap-1.5">
          <span className="text-xs sm:text-sm font-bold text-neutral-900">
            {formatPrice(jersey.price, currency)}
          </span>
          {jersey.originalPrice && jersey.originalPrice > jersey.price && (
            <span className="text-[10px] sm:text-xs text-neutral-400 line-through">
              {formatPrice(jersey.originalPrice, currency)}
            </span>
          )}
        </div>
      </div>

    </div>
  );
};
