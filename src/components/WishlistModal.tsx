import React from 'react';
import { X, Heart, Eye, Trash2 } from 'lucide-react';
import { JerseyProduct } from '../types';
import { CurrencyCode, formatPrice } from '../utils/currency';

interface WishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  wishlist: JerseyProduct[];
  onRemove: (jersey: JerseyProduct) => void;
  onInspect: (jersey: JerseyProduct) => void;
  currency: CurrencyCode;
}

export const WishlistModal: React.FC<WishlistModalProps> = ({
  isOpen,
  onClose,
  wishlist = [],
  onRemove,
  onInspect,
  currency
}) => {
  if (!isOpen) return null;

  const items = Array.isArray(wishlist) ? wishlist : [];

  return (
    <div
      id="wishlist-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        id="wishlist-modal-content"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl bg-[#141418] text-neutral-100 border border-white/10 shadow-2xl p-5 sm:p-6 my-8 max-h-[85vh] flex flex-col"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-full bg-red-600/20 text-red-400 border border-red-500/30">
              <Heart className="w-4 h-4 fill-red-500 text-red-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-100 tracking-tight">
                Saved Favorites ({items.length})
              </h2>
              <p className="text-xs text-neutral-400">Your curated collection</p>
            </div>
          </div>
          <button
            id="close-wishlist-btn"
            onClick={onClose}
            className="p-2 rounded-full bg-[#1e1e24] hover:bg-[#2a2a33] text-neutral-300 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Heart className="w-8 h-8 text-neutral-600 mx-auto" />
              <p className="text-sm text-neutral-300">Your saved collection is currently empty.</p>
              <p className="text-xs text-neutral-500">Tap the heart icon on any card to save it here.</p>
            </div>
          ) : (
            items.map((jersey) => (
              <div
                key={jersey.id}
                className="p-3 rounded-2xl bg-[#1a1a20] border border-white/[0.08] flex items-center justify-between gap-3"
              >
                {jersey.images && jersey.images[0] ? (
                  <img
                    src={jersey.images[0]}
                    alt={jersey.title}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-2xl object-contain bg-[#0e0e12] border border-white/10 shrink-0 p-1"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-[#0e0e12] border border-white/10 shrink-0 flex items-center justify-center text-[10px] text-neutral-500 font-bold">
                    ITEM
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-neutral-100 truncate">
                    {jersey.title}
                  </h4>
                  <div className="text-xs text-neutral-400 mt-0.5 tabular-nums">
                    {jersey.edition || jersey.category} • {formatPrice(jersey.price, currency)}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      onInspect(jersey);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>
                  <button
                    onClick={() => onRemove(jersey)}
                    title="Remove from favorites"
                    className="p-2 rounded-full hover:bg-red-500/15 hover:text-red-400 text-neutral-500 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
