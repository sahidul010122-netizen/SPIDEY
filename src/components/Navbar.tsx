import React, { useState } from 'react';
import { Search, Heart, X, ArrowLeft, ShoppingBag } from 'lucide-react';
import { CurrencyCode, CURRENCY_RATES } from '../utils/currency';
import { SiteSettings } from '../types/settings';

interface NavbarProps {
  currentView: 'showcase' | 'product' | 'cart' | 'checkout' | 'admin' | 'order';
  setCurrentView: (view: 'showcase' | 'product' | 'cart' | 'checkout' | 'admin' | 'order') => void;
  wishlistCount: number;
  openWishlist: () => void;
  cartCount?: number;
  openCart?: () => void;
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  openR2Guide?: () => void;
  siteSettings: SiteSettings;
  isAdminAuthenticated?: boolean;
  customerUser?: { name: string; email: string } | null;
  onOpenAuthModal?: () => void;
  onLogoutCustomer?: () => void;
  onOpenPlaceOrder: () => void;
  onOpenPwaModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  wishlistCount,
  openWishlist,
  cartCount = 0,
  openCart,
  currency,
  setCurrency,
  searchQuery,
  setSearchQuery,
  siteSettings,
  onOpenPlaceOrder
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0b0b0e]/90 backdrop-blur-xl border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-2">
        
        {/* 1. Left: Brand Logo */}
        <div 
          onClick={() => {
            setCurrentView('showcase');
            window.history.pushState({}, '', '/');
          }}
          className="cursor-pointer select-none flex items-center gap-2 group shrink-0"
          title="Home"
        >
          {siteSettings.headerLogoImage ? (
            <div className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/[0.04] border border-white/10 p-0.5">
              <img 
                src={siteSettings.headerLogoImage} 
                alt={siteSettings.brandName || "Store Logo"} 
                referrerPolicy="no-referrer"
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain rounded-lg group-hover:scale-105 transition-transform duration-200" 
              />
            </div>
          ) : (
            <span className="font-typewriter text-xs sm:text-sm font-bold tracking-widest text-neutral-100 uppercase group-hover:text-red-400 transition-colors duration-200">
              {siteSettings.brandName || 'SPIDEY'}
            </span>
          )}
        </div>

        {/* 2. Center: Middle Text */}
        <div className="text-center select-none px-2">
          <div className="font-typewriter text-[11px] sm:text-xs md:text-sm font-semibold tracking-wider text-neutral-100 leading-tight uppercase">
            {siteSettings.headerSloganTop || 'DIFFERENTIATE,'} <br />
            <span className="text-neutral-400">{siteSettings.headerSloganBottom || "DON'T COMPARE"}</span>
          </div>
        </div>

        {/* 3. Right: Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          
          {/* Back to Storefront if not in showcase */}
          {currentView !== 'showcase' ? (
            <button
              onClick={() => {
                setCurrentView('showcase');
                window.history.pushState({}, '', '/');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1a1a20] hover:bg-red-700 border border-white/15 hover:border-red-500 text-neutral-100 text-xs font-bold whitespace-nowrap shrink-0 transition-all duration-200 active:scale-95 shadow-xs cursor-pointer"
              title="Return to Storefront"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>হোম পেজ</span>
            </button>
          ) : null}

          {/* Fixed BDT Currency Badge */}
          <div
            id="nav-currency-badge"
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#15151a] border border-white/10 text-xs font-bold text-neutral-200 select-none whitespace-nowrap shrink-0"
            title="All prices in Bangladeshi Taka (BDT ৳)"
          >
            <span className="font-extrabold text-red-500 font-mono text-xs sm:text-sm">৳</span>
            <span className="text-[10px] text-neutral-400 font-bold uppercase">BDT</span>
          </div>

          {/* Search Toggle */}
          <button
            id="nav-search-btn"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            aria-label="Search"
            className={`p-2 rounded-full transition-colors duration-200 cursor-pointer shrink-0 ${
              isSearchOpen
                ? 'bg-red-600/20 text-red-400'
                : 'text-neutral-300 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Wishlist */}
          <button
            id="nav-wishlist-btn"
            onClick={openWishlist}
            aria-label="Favorites"
            className="relative p-2 rounded-full text-neutral-300 hover:text-white hover:bg-white/[0.06] transition-colors duration-200 cursor-pointer shrink-0"
          >
            <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
            {wishlistCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center shadow-xs tabular-nums">
                {wishlistCount}
              </span>
            )}
          </button>

          {/* Slide Cart Button */}
          {openCart && (
            <button
              id="nav-cart-btn"
              onClick={openCart}
              aria-label="Cart"
              className="relative p-2 rounded-full text-neutral-300 hover:text-white hover:bg-white/[0.06] transition-colors duration-200 cursor-pointer shrink-0"
              title="শপিং কার্ট"
            >
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
              {cartCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center shadow-xs tabular-nums">
                  {cartCount}
                </span>
              )}
            </button>
          )}
        </div>

      </div>

      {/* Expandable Search Drawer */}
      {isSearchOpen && (
        <div className="border-t border-white/[0.08] bg-[#121216] px-4 sm:px-6 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <Search className="w-4 h-4 text-red-400 shrink-0" />
            <input
              id="header-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search jerseys by name, code (e.g. SJ-CXYQD), category..."
              autoFocus
              className="w-full bg-transparent text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
