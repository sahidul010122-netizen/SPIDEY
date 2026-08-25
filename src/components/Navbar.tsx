import React, { useState } from 'react';
import { Search, Heart, ShieldCheck, X, User, LogIn, LogOut, Globe } from 'lucide-react';
import { CurrencyCode, CURRENCY_RATES } from '../utils/currency';
import { SiteSettings } from '../types/settings';

interface NavbarProps {
  currentView: 'showcase' | 'admin';
  setCurrentView: (view: 'showcase' | 'admin') => void;
  wishlistCount: number;
  openWishlist: () => void;
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  openR2Guide: () => void;
  siteSettings: SiteSettings;
  isAdminAuthenticated: boolean;
  customerUser: { name: string; email: string } | null;
  onOpenAuthModal: () => void;
  onLogoutCustomer: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  wishlistCount,
  openWishlist,
  currency,
  setCurrency,
  searchQuery,
  setSearchQuery,
  openR2Guide,
  siteSettings,
  isAdminAuthenticated,
  customerUser,
  onOpenAuthModal,
  onLogoutCustomer
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleBrandPillClick = () => {
    if (currentView === 'admin') {
      setCurrentView('showcase');
      window.history.pushState({}, '', '/');
    } else {
      if (isAdminAuthenticated) {
        setCurrentView('admin');
        window.history.pushState({}, '', '/admin');
      } else {
        // Open Auth modal for Gmail/Password login
        onOpenAuthModal();
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-neutral-200/80">
      {/* Top Brand Banner matching screenshot */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
        
        {/* Left: Custom Header Logo / Mascot Emblem */}
        <div 
          onClick={() => {
            setCurrentView('showcase');
            window.history.pushState({}, '', '/');
          }}
          className="cursor-pointer select-none flex items-center gap-2 group"
          title="Home"
        >
          <div className="w-8 h-8 flex items-center justify-center">
            {siteSettings.headerLogoImage ? (
              <img 
                src={siteSettings.headerLogoImage} 
                alt="Store Logo" 
                referrerPolicy="no-referrer"
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain rounded-md group-hover:scale-105 transition-transform" 
              />
            ) : (
              /* Custom geometric skull / mask icon */
              <svg 
                viewBox="0 0 24 24" 
                className="w-7 h-7 text-neutral-900 group-hover:scale-105 transition-transform" 
                fill="currentColor"
              >
                <path d="M12 2C7.58 2 4 5.58 4 10c0 2.21.9 4.21 2.35 5.66L6 20h3l1-2h4l1 2h3l-.35-4.34C19.1 14.21 20 12.21 20 10c0-4.42-3.58-8-8-8zm-3 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm6 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm-3 5c-1.1 0-2-.4-2-1h4c0 .6-.9 1-2 1z" />
                <circle cx="8" cy="18" r="1" />
                <circle cx="16" cy="18" r="1" />
                <path d="M7 21h10v1H7z" />
              </svg>
            )}
          </div>
        </div>

        {/* Center: Typewriter Slogan */}
        <div className="text-center select-none">
          <div className="font-typewriter text-[11px] sm:text-xs md:text-sm font-semibold tracking-wider text-neutral-900 leading-tight uppercase">
            {siteSettings.headerSloganTop || 'DIFFERENTIATE,'} <br />
            {siteSettings.headerSloganBottom || "DON'T COMPARE"}
          </div>
        </div>

        {/* Right: Red Brand Pill & Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Currency Selector (BDT ৳ / USD) */}
          <button
            id="nav-currency-btn"
            onClick={() => {
              const currencies: CurrencyCode[] = ['BDT', 'USD', 'EUR', 'GBP'];
              const nextIdx = (currencies.indexOf(currency) + 1) % currencies.length;
              setCurrency(currencies[nextIdx]);
            }}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200 text-xs font-bold text-neutral-800 transition-all cursor-pointer shadow-xs active:scale-95"
            title={`Currency: ${currency} (${CURRENCY_RATES[currency]?.symbol || '৳'}). Click to switch`}
          >
            <span className="font-extrabold text-neutral-950 font-mono text-xs sm:text-sm">
              {CURRENCY_RATES[currency]?.symbol || '৳'}
            </span>
            <span className="text-[10px] sm:text-[11px] text-neutral-600 font-bold uppercase tracking-tight">
              {currency}
            </span>
          </button>

          {/* Search Toggle */}
          <button
            id="nav-search-btn"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            aria-label="Search"
            className="p-1.5 text-neutral-700 hover:text-neutral-950 transition-colors"
          >
            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Customer Profile / Sign In */}
          {customerUser ? (
            <div className="flex items-center gap-1.5 bg-neutral-100 px-2.5 py-1 rounded-full text-xs font-semibold text-neutral-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="hidden sm:inline truncate max-w-[90px]">{customerUser.name}</span>
              <button
                onClick={onLogoutCustomer}
                title="Log out"
                className="text-neutral-400 hover:text-neutral-900 ml-1"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              title="Sign In / Register"
              className="p-1.5 text-neutral-700 hover:text-neutral-950 transition-colors"
            >
              <User className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}

          {/* Wishlist */}
          <button
            id="nav-wishlist-btn"
            onClick={openWishlist}
            aria-label="Favorites"
            className="relative p-1.5 text-neutral-700 hover:text-neutral-950 transition-colors"
          >
            <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
            {wishlistCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center">
                {wishlistCount}
              </span>
            )}
          </button>

          {/* Admin Toggle / Red Brand Badge */}
          <button
            id="nav-brand-badge-btn"
            onClick={handleBrandPillClick}
            className="px-3 sm:px-4 py-1 sm:py-1.5 rounded-md bg-[#e50914] hover:bg-[#cc0812] active:scale-95 text-white font-bold text-xs sm:text-sm tracking-tight transition-all shadow-sm flex items-center gap-1.5"
            title={currentView === 'admin' ? 'Back to Storefront' : (siteSettings.brandName || 'orifake')}
          >
            <span>{currentView === 'admin' ? 'store' : (siteSettings.brandName || 'orifake')}</span>
            {currentView === 'admin' ? (
              <ShieldCheck className="w-3 h-3 text-white" />
            ) : isAdminAuthenticated ? (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
            ) : null}
          </button>
        </div>

      </div>

      {/* Expandable Search Drawer */}
      {isSearchOpen && (
        <div className="border-t border-neutral-100 bg-neutral-50 px-4 sm:px-6 py-2.5 max-w-7xl mx-auto flex items-center gap-3">
          <Search className="w-4 h-4 text-neutral-400 shrink-0" />
          <input
            id="header-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cases, matchwear kits, EDC gear, teams..."
            autoFocus
            className="w-full bg-transparent text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-neutral-400 hover:text-neutral-700"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
            aria-label="Currency"
            className="text-xs bg-white border border-neutral-200 rounded px-2 py-1 text-neutral-700 focus:outline-none"
          >
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="JPY">JPY (¥)</option>
          </select>
        </div>
      )}
    </header>
  );
};
