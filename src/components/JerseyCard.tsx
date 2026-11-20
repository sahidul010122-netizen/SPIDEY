import React from 'react';
import { motion } from 'motion/react';
import { Heart, Sparkles } from 'lucide-react';
import { JerseyProduct } from '../types';
import { CurrencyCode, formatPrice } from '../utils/currency';

interface JerseyCardProps {
  jersey: JerseyProduct;
  onInspect: (jersey: JerseyProduct) => void;
  isWishlisted: boolean;
  onToggleWishlist: (jersey: JerseyProduct) => void;
  currency: CurrencyCode;
  index?: number;
}

export const JerseyCard: React.FC<JerseyCardProps> = ({
  jersey,
  onInspect,
  isWishlisted,
  onToggleWishlist,
  currency,
  index = 0
}) => {
  const staggerDelay = Math.min(index % 8, 7) * 0.035;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 0.36, delay: staggerDelay, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col select-none group product-card-container"
    >
      
      {/* Studio-Matched Square Image Frame with Rounded Corners on Both Wrapper & Image */}
      <div 
        onClick={() => onInspect(jersey)}
        className="relative aspect-square w-full flex items-center justify-center cursor-pointer overflow-hidden rounded-2xl bg-[#141418] border border-white/[0.08] group-hover:border-red-500/45 shadow-[0_8px_24px_rgba(0,0,0,0.45)] group-hover:shadow-[0_14px_34px_-10px_rgba(220,38,38,0.28)] transition-all duration-300"
      >
        {jersey.images && jersey.images[0] ? (
          <img
            src={jersey.images[0]}
            alt={jersey.title}
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.opacity = '0';
            }}
            className="w-full h-full object-contain object-center rounded-2xl transition-transform duration-400 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#18181f] text-neutral-500 rounded-2xl">
            <span className="text-[11px] font-medium tracking-wide">No Image</span>
          </div>
        )}

        {/* Subtle Inner Studio Rim */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/[0.05]" />

        {/* Floating Top / Pinned Badge */}
        {jersey.isPinned && (
          <div className="absolute top-2.5 left-2.5 pointer-events-none z-10">
            <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold bg-black/75 text-amber-300 border border-amber-400/35 backdrop-blur-md shadow-xs flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
              <span>Top</span>
            </span>
          </div>
        )}

        {/* Floating Circular Wishlist Heart in Top-Right Corner */}
        <button
          id={`wishlist-btn-${jersey.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist(jersey);
          }}
          aria-label="Wishlist"
          className={`absolute top-2.5 right-2.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full backdrop-blur-md border shadow-xs flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer z-10 ${
            isWishlisted
              ? 'bg-red-600/90 border-red-500 text-white'
              : 'bg-black/65 hover:bg-black/85 border-white/15 text-neutral-200 hover:text-red-400'
          }`}
        >
          <Heart 
            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
              isWishlisted ? 'fill-white text-white' : 'text-current'
            }`} 
          />
        </button>

        {/* Optional Subtle Badge */}
        {jersey.badge && jersey.badge !== 'Standard' && (
          <div className="absolute bottom-2.5 left-2.5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-red-600/95 text-white shadow-xs">
              {jersey.badge}
            </span>
          </div>
        )}
      </div>

      {/* Product Details */}
      <div 
        onClick={() => onInspect(jersey)}
        className="pt-2.5 px-0.5 space-y-0.5 cursor-pointer"
      >
        {/* Title */}
        <h3 className="text-xs sm:text-sm font-semibold text-neutral-100 leading-snug line-clamp-1 group-hover:text-red-400 transition-colors duration-200">
          {jersey.title}
        </h3>

        {/* Price */}
        <div className="pt-0.5 flex items-center gap-2 tabular-nums">
          <span className="text-xs sm:text-sm font-bold text-white">
            {formatPrice(jersey.price, currency)}
          </span>
          {jersey.originalPrice && jersey.originalPrice > jersey.price && (
            <span className="text-[10px] sm:text-xs text-neutral-500 line-through">
              {formatPrice(jersey.originalPrice, currency)}
            </span>
          )}
        </div>
      </div>

    </motion.div>
  );
};
