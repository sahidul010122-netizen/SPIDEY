import React, { useState, useEffect } from 'react';
import { Search, Heart, ShieldCheck, Check, ArrowUp, Key } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { CategoryFilter } from './components/CategoryFilter';
import { JerseyCard } from './components/JerseyCard';
import { ProductModal } from './components/ProductModal';
import { AdminPanel } from './components/AdminPanel';
import { WishlistModal } from './components/WishlistModal';
import { R2DeploymentGuideModal } from './components/R2DeploymentGuideModal';
import { AuthModal } from './components/AuthModal';
import { PlaceOrderPage } from './components/PlaceOrderPage';
import { JerseyProduct, StoreStats } from './types';
import { SiteSettings, DEFAULT_SITE_SETTINGS, CategoryItem } from './types/settings';
import { INITIAL_JERSEYS, CATEGORY_CAROUSEL_ITEMS } from './data/mockJerseys';
import { CurrencyCode } from './utils/currency';

export default function App() {
  // Determine initial view from URL path
  const getInitialView = (): 'showcase' | 'admin' | 'order' => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const search = window.location.search.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path === '/admin' || path.startsWith('/admin') || search.includes('view=admin') || hash === '#/admin') {
        return 'admin';
      }
      if (
        path === '/place-order' || 
        path.startsWith('/place-order') || 
        path === '/order' || 
        path.startsWith('/order') || 
        search.includes('view=order') || 
        search.includes('page=order') || 
        hash === '#/order' || 
        hash === '#/place-order'
      ) {
        return 'order';
      }
    }
    return 'showcase';
  };

  // Navigation & Filter States
  const [currentView, setCurrentView] = useState<'showcase' | 'admin' | 'order'>(getInitialView);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedOrderProductId, setSelectedOrderProductId] = useState<string | undefined>(undefined);
  const [currency, setCurrency] = useState<CurrencyCode>(() => {
    try {
      const saved = localStorage.getItem('orifake_currency') as CurrencyCode;
      return saved || 'BDT';
    } catch {
      return 'BDT';
    }
  });

  // Site CMS Settings & Categories
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() => {
    try {
      const saved = localStorage.getItem('orifake_site_settings');
      return saved ? JSON.parse(saved) : DEFAULT_SITE_SETTINGS;
    } catch {
      return DEFAULT_SITE_SETTINGS;
    }
  });

  const [categoryItems, setCategoryItems] = useState<CategoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('orifake_categories');
      return saved ? JSON.parse(saved) : CATEGORY_CAROUSEL_ITEMS;
    } catch {
      return CATEGORY_CAROUSEL_ITEMS;
    }
  });

  // Auth States
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('orifake_admin_auth') === 'true';
    } catch {
      return false;
    }
  });

  const [customerUser, setCustomerUser] = useState<{ name: string; email: string } | null>(() => {
    try {
      const saved = localStorage.getItem('orifake_customer_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Product Data
  const [products, setProducts] = useState<JerseyProduct[]>(INITIAL_JERSEYS);
  const [stats, setStats] = useState<StoreStats | null>(null);

  // Selected Modal State for Zoom & Swipe
  const [inspectedJersey, setInspectedJersey] = useState<JerseyProduct | null>(null);

  // Wishlist / Saved Favorites
  const [wishlist, setWishlist] = useState<JerseyProduct[]>([]);
  const [isWishlistOpen, setIsWishlistOpen] = useState<boolean>(false);
  const [isR2GuideOpen, setIsR2GuideOpen] = useState<boolean>(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  // Persist siteSettings and categoryItems
  useEffect(() => {
    try {
      localStorage.setItem('orifake_site_settings', JSON.stringify(siteSettings));
    } catch (e) {
      console.warn('Storage error', e);
    }
  }, [siteSettings]);

  useEffect(() => {
    try {
      localStorage.setItem('orifake_categories', JSON.stringify(categoryItems));
    } catch (e) {
      console.warn('Storage error', e);
    }
  }, [categoryItems]);

  useEffect(() => {
    try {
      localStorage.setItem('orifake_currency', currency);
    } catch (e) {
      console.warn('Storage error', e);
    }
  }, [currency]);

  // Listen to browser popstate for routes
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      const search = window.location.search.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path === '/admin' || search.includes('view=admin') || hash === '#/admin') {
        setCurrentView('admin');
      } else if (
        path === '/place-order' || 
        path === '/order' || 
        search.includes('view=order') || 
        search.includes('page=order') ||
        hash === '#/order' ||
        hash === '#/place-order'
      ) {
        setCurrentView('order');
      } else {
        setCurrentView('showcase');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch Products, Settings, and Categories from Backend API if available
  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        if (data.products && Array.isArray(data.products)) {
          setProducts(data.products);
        }
      }
    } catch (err) {
      console.warn('Using mock dataset:', err);
    }
  };

  const fetchSiteSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings && typeof data.settings === 'object') {
          setSiteSettings(data.settings);
        }
      }
    } catch (err) {
      console.warn('Settings fetch error:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        if (data.categories && Array.isArray(data.categories)) {
          setCategoryItems(data.categories);
        }
      }
    } catch (err) {
      console.warn('Categories fetch error:', err);
    }
  };

  // Fetch Stats
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.warn('Stats fetch error:', err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchSiteSettings();
    fetchCategories();
    fetchStats();
  }, []);

  // Filter products by selected category and search query
  const displayedProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === 'all' ||
      p.category.toLowerCase() === selectedCategory.toLowerCase() ||
      (selectedCategory === 'kits' && (p.category.toLowerCase().includes('madrid') || p.category.toLowerCase().includes('barcelona') || p.category.toLowerCase().includes('manchester')));

    const matchesSearch =
      !searchQuery.trim() ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.season.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.edition.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.badge && p.badge.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  // Wishlist Operations
  const handleToggleWishlist = (jersey: JerseyProduct) => {
    setWishlist((prev) => {
      const exists = prev.some((p) => p.id === jersey.id);
      if (exists) {
        showToast(`Removed from Favorites`);
        return prev.filter((p) => p.id !== jersey.id);
      } else {
        showToast(`Saved ${jersey.title} to Favorites!`);
        return [...prev, jersey];
      }
    });
  };

  const isWishlisted = (id: string) => wishlist.some((p) => p.id === id);

  // Admin Actions
  const handleAddProduct = async (productData: Partial<JerseyProduct>): Promise<boolean> => {
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });
      const data = await res.json();
      if (data.success && data.product) {
        setProducts((prev) => [data.product, ...prev]);
        showToast('New drop published!');
        fetchStats();
        return true;
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  };

  const handleUpdateProduct = async (id: string, updateData: Partial<JerseyProduct>): Promise<boolean> => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      const data = await res.json();
      if (data.success && data.product) {
        setProducts((prev) => prev.map((p) => (p.id === id ? data.product : p)));
        showToast('Product updated!');
        fetchStats();
        return true;
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  };

  const handleDeleteProduct = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        showToast('Product removed from catalog');
        fetchStats();
        return true;
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  };

  const handleResetCatalog = async () => {
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setProducts(INITIAL_JERSEYS);
        setCategoryItems(CATEGORY_CAROUSEL_ITEMS);
        setSiteSettings(DEFAULT_SITE_SETTINGS);
        showToast('Store reset to original demo setup!');
        fetchStats();
      }
    } catch (err) {
      setProducts(INITIAL_JERSEYS);
      setCategoryItems(CATEGORY_CAROUSEL_ITEMS);
      setSiteSettings(DEFAULT_SITE_SETTINGS);
      showToast('Store reset to original demo setup!');
    }
  };

  // CMS Settings Actions (Sync with R2 backend)
  const handleUpdateSiteSettings = async (newSettings: Partial<SiteSettings>) => {
    const updated = { ...siteSettings, ...newSettings };
    setSiteSettings(updated);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      const data = await res.json();
      if (data.success && data.settings) {
        setSiteSettings(data.settings);
      }
    } catch (e) {
      console.warn('Failed to sync settings with R2:', e);
    }
    showToast('Store banner & settings updated live across all devices!');
  };

  const handleAddCategory = async (cat: CategoryItem) => {
    const updated = [...categoryItems, cat];
    setCategoryItems(updated);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cat)
      });
      const data = await res.json();
      if (data.success && data.categories) {
        setCategoryItems(data.categories);
      }
    } catch (e) {
      console.warn('Failed to sync category with R2:', e);
    }
    showToast(`Category "${cat.name}" saved & synced!`);
    fetchStats();
  };

  const handleUpdateCategory = async (id: string, updated: Partial<CategoryItem>) => {
    const nextCategories = categoryItems.map((c) => (c.id === id ? { ...c, ...updated } : c));
    setCategoryItems(nextCategories);
    try {
      const res = await fetch(`/api/categories/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      const data = await res.json();
      if (data.success && data.categories) {
        setCategoryItems(data.categories);
      }
    } catch (e) {
      console.warn('Failed to update category in R2:', e);
    }
    showToast('Category updated live across all devices!');
  };

  const handleDeleteCategory = async (id: string) => {
    const nextCategories = categoryItems.filter((c) => c.id !== id);
    setCategoryItems(nextCategories);
    try {
      const res = await fetch(`/api/categories/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success && data.categories) {
        setCategoryItems(data.categories);
      }
    } catch (e) {
      console.warn('Failed to delete category in R2:', e);
    }
    showToast('Category removed from store.');
    fetchStats();
  };

  // Auth Actions
  const handleAdminLoginSuccess = () => {
    setIsAdminAuthenticated(true);
    try {
      localStorage.setItem('orifake_admin_auth', 'true');
    } catch {}
    setCurrentView('admin');
    window.history.pushState({}, '', '/admin');
    showToast('Admin access granted! Welcome back.');
  };

  const handleCustomerLoginSuccess = (user: { name: string; email: string }) => {
    setCustomerUser(user);
    try {
      localStorage.setItem('orifake_customer_user', JSON.stringify(user));
    } catch {}
    showToast(`Welcome ${user.name}!`);
  };

  const handleLogoutCustomer = () => {
    setCustomerUser(null);
    try {
      localStorage.removeItem('orifake_customer_user');
    } catch {}
    showToast('Logged out of customer profile.');
  };

  const handleLogoutAdmin = () => {
    setIsAdminAuthenticated(false);
    try {
      localStorage.removeItem('orifake_admin_auth');
    } catch {}
    setCurrentView('showcase');
    window.history.pushState({}, '', '/');
    showToast('Logged out of Admin Portal.');
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col selection:bg-neutral-900 selection:text-white">
      
      {/* Top Header matching exact screenshot */}
      <Navbar
        currentView={currentView}
        setCurrentView={(view) => {
          setCurrentView(view);
          window.history.pushState({}, '', view === 'admin' ? '/admin' : view === 'order' ? '/place-order' : '/');
        }}
        onOpenPlaceOrder={() => {
          setSelectedOrderProductId(undefined);
          setCurrentView('order');
          window.history.pushState({}, '', '/place-order');
        }}
        wishlistCount={wishlist.length}
        openWishlist={() => setIsWishlistOpen(true)}
        currency={currency}
        setCurrency={setCurrency}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        openR2Guide={() => setIsR2GuideOpen(true)}
        siteSettings={siteSettings}
        isAdminAuthenticated={isAdminAuthenticated}
        customerUser={customerUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogoutCustomer={handleLogoutCustomer}
      />

      {/* Main Content */}
      <main className="flex-1 pb-16">
        {currentView === 'order' ? (
          <PlaceOrderPage
            products={products}
            initialProductId={selectedOrderProductId}
            currency={currency}
            siteSettings={siteSettings}
            onBackToStore={() => {
              setCurrentView('showcase');
              window.history.pushState({}, '', '/');
            }}
          />
        ) : currentView === 'showcase' ? (
          <>
            {/* Cinematic Red FRAGMENT Banner */}
            {!searchQuery && (
              <HeroBanner 
                siteSettings={siteSettings}
                onExplore={() => {
                  setSelectedCategory('all');
                  window.scrollTo({ top: 400, behavior: 'smooth' });
                }} 
              />
            )}

            {/* Shop by Category Carousel */}
            <CategoryFilter
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              categories={categoryItems}
              headingTitle={siteSettings.categoryHeading || 'Shop by Category'}
            />

            {/* Bestsellers Section matching screenshot */}
            <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pt-4 sm:pt-6">
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
                  {selectedCategory === 'all' 
                    ? (siteSettings.bestsellerHeading || 'Bestsellers') 
                    : `${categoryItems.find((c) => c.id === selectedCategory)?.name || selectedCategory} Collection`}
                </h2>
                {selectedCategory !== 'all' && (
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 underline"
                  >
                    View All
                  </button>
                )}
              </div>

              {/* Strict 2-Column Grid on Mobile, 3-4 on Desktop */}
              {displayedProducts.length === 0 ? (
                <div className="bg-[#f6f7f9] rounded-3xl p-10 text-center space-y-4 max-w-md mx-auto my-8">
                  <Search className="w-8 h-8 text-neutral-400 mx-auto" />
                  <h3 className="text-base font-bold text-neutral-900">No Matching Items</h3>
                  <p className="text-xs text-neutral-500">
                    Try adjusting your search terms or category selection.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedCategory('all');
                      setSearchQuery('');
                    }}
                    className="px-4 py-2 rounded-full bg-neutral-900 text-white font-bold text-xs shadow-md"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                  {displayedProducts.map((jersey) => (
                    <JerseyCard
                      key={jersey.id}
                      jersey={jersey}
                      onInspect={(j) => setInspectedJersey(j)}
                      isWishlisted={isWishlisted(jersey.id)}
                      onToggleWishlist={handleToggleWishlist}
                      currency={currency}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          /* Admin Panel Gate */
          isAdminAuthenticated ? (
            <AdminPanel
              products={products}
              categories={categoryItems}
              siteSettings={siteSettings}
              stats={stats}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onResetCatalog={handleResetCatalog}
              onUpdateSiteSettings={handleUpdateSiteSettings}
              onAddCategory={handleAddCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
              onLogoutAdmin={handleLogoutAdmin}
              currency={currency}
            />
          ) : (
            <div className="min-h-[70vh] flex items-center justify-center p-4 bg-slate-950">
              <div className="max-w-md w-full glass-panel p-8 rounded-3xl border border-white/15 text-center space-y-6 text-white">
                <div className="w-14 h-14 rounded-2xl bg-[#e50914]/20 border border-[#e50914]/40 text-[#e50914] mx-auto flex items-center justify-center">
                  <Key className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white font-mono">Control Portal</h2>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Please sign in with your email address to access your dashboard.
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="w-full py-3 rounded-xl bg-[#e50914] hover:bg-[#cc0812] text-white font-bold text-xs shadow-lg transition-all"
                  >
                    Sign In with Email
                  </button>
                  <button
                    onClick={() => {
                      setCurrentView('showcase');
                      window.history.pushState({}, '', '/');
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white text-xs font-semibold"
                  >
                    Return to Storefront
                  </button>
                </div>
              </div>
            </div>
          )
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200/80 bg-neutral-50 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#e50914]" />
            <span className="font-bold text-neutral-900 tracking-tight font-typewriter uppercase">
              {siteSettings.footerText || "DIFFERENTIATE, DON'T COMPARE"}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsR2GuideOpen(true)}
              className="hover:text-neutral-900 font-mono transition-colors"
            >
              Cloudflare R2
            </button>
            <span>•</span>
            <button
              onClick={() => {
                if (currentView === 'showcase') {
                  if (isAdminAuthenticated) {
                    setCurrentView('admin');
                    window.history.pushState({}, '', '/admin');
                  } else {
                    setIsAuthModalOpen(true);
                  }
                } else {
                  setCurrentView('showcase');
                  window.history.pushState({}, '', '/');
                }
              }}
              className="hover:text-neutral-900 font-mono transition-colors"
            >
              {currentView === 'showcase' ? 'Portal' : 'Storefront'}
            </button>
          </div>
        </div>
      </footer>

      {/* Auth Modal (Admin + Customer Sign in) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAdminLoginSuccess={handleAdminLoginSuccess}
        onCustomerLoginSuccess={handleCustomerLoginSuccess}
        adminGmail={siteSettings.adminGmail || 'sahidul010122@gmail.com'}
      />

      {/* Interactive Zoom & Swipe Modal */}
      <ProductModal
        jersey={inspectedJersey}
        onClose={() => setInspectedJersey(null)}
        isWishlisted={inspectedJersey ? isWishlisted(inspectedJersey.id) : false}
        onToggleWishlist={handleToggleWishlist}
        currency={currency}
      />

      {/* Wishlist Modal */}
      <WishlistModal
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        wishlist={wishlist}
        onRemove={handleToggleWishlist}
        onInspect={(j) => setInspectedJersey(j)}
        currency={currency}
      />

      {/* Cloudflare R2 Deployment Guide Modal */}
      <R2DeploymentGuideModal
        isOpen={isR2GuideOpen}
        onClose={() => setIsR2GuideOpen(false)}
      />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-3.5 sm:p-4 rounded-2xl bg-neutral-900 text-white text-xs font-semibold shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-bottom-5">
          <div className="w-4 h-4 rounded-full bg-emerald-400 text-neutral-950 flex items-center justify-center">
            <Check className="w-2.5 h-2.5 stroke-[3]" />
          </div>
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
