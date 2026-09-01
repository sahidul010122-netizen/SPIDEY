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
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        id="wishlist-modal-content"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl bg-white text-neutral-900 border border-neutral-200 shadow-2xl p-5 sm:p-6 my-8 max-h-[85vh] flex flex-col"
      >
        <div className="flex items-center justify-between border-b border-neutral-100 pb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-full bg-rose-100 text-rose-600">
              <Heart className="w-4 h-4 fill-rose-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 tracking-tight">
                Saved Favorites ({items.length})
              </h2>
              <p className="text-xs text-neutral-500">Your curated collection</p>
            </div>
          </div>
          <button
            id="close-wishlist-btn"
            onClick={onClose}
            className="p-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Heart className="w-8 h-8 text-neutral-300 mx-auto" />
              <p className="text-sm text-neutral-600">Your saved collection is currently empty.</p>
              <p className="text-xs text-neutral-400">Tap the heart icon on any card to save it here.</p>
            </div>
          ) : (
            items.map((jersey) => (
              <div
                key={jersey.id}
                className="p-3 rounded-2xl bg-[#f6f7f9] border border-neutral-100 flex items-center justify-between gap-3"
              >
                <img
                  src={jersey.images?.[0] || 'https://images.unsplash.com/photo-1577212017184-80cc0da11082?auto=format&fit=crop&w=200&q=80'}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-xl object-contain bg-white border border-neutral-200 shrink-0 p-1"
                />

                <div className="flex-1 min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-neutral-900 truncate">
                    {jersey.title}
                  </h4>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    {jersey.edition || jersey.category} • {formatPrice(jersey.price, currency)}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      onInspect(jersey);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>
                  <button
                    onClick={() => onRemove(jersey)}
                    title="Remove from favorites"
                    className="p-2 rounded-full hover:bg-rose-50 hover:text-rose-600 text-neutral-400 transition-colors"
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
