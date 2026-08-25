import React, { useState, useEffect } from 'react';
import { Search, Heart, ShieldCheck, Check, ArrowUp } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { CategoryFilter } from './components/CategoryFilter';
import { JerseyCard } from './components/JerseyCard';
import { ProductModal } from './components/ProductModal';
import { AdminPanel } from './components/AdminPanel';
import { WishlistModal } from './components/WishlistModal';
import { R2DeploymentGuideModal } from './components/R2DeploymentGuideModal';
import { JerseyProduct, StoreStats } from './types';
import { INITIAL_JERSEYS } from './data/mockJerseys';
import { CurrencyCode } from './utils/currency';

export default function App() {
  // Determine initial view from URL path
  const getInitialView = (): 'showcase' | 'admin' => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const search = window.location.search.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path === '/admin' || path.startsWith('/admin') || search.includes('view=admin') || hash === '#/admin') {
        return 'admin';
      }
    }
    return 'showcase';
  };

  // Navigation & Filter States
  const [currentView, setCurrentView] = useState<'showcase' | 'admin'>(getInitialView);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

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

  // Listen to browser popstate for /admin route
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      const search = window.location.search.toLowerCase();
      if (path === '/admin' || search.includes('view=admin')) {
        setCurrentView('admin');
      } else {
        setCurrentView('showcase');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch Products from Backend API if available
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
    fetchStats();
  }, []);

  // Categories list
  const uniqueCategories = Array.from(new Set(products.map((p) => p.category)));

  // Filter products by selected category and search query
  const displayedProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === 'all' ||
      p.category.toLowerCase() === selectedCategory.toLowerCase();

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
        showToast('Catalog restored to default!');
        fetchStats();
      }
    } catch (err) {
      setProducts(INITIAL_JERSEYS);
      showToast('Catalog restored to default!');
    }
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col selection:bg-neutral-900 selection:text-white">
      
      {/* Top Header matching exact screenshot */}
      <Navbar
        currentView={currentView}
        setCurrentView={(view) => {
          setCurrentView(view);
          window.history.pushState({}, '', view === 'admin' ? '/admin' : '/');
        }}
        wishlistCount={wishlist.length}
        openWishlist={() => setIsWishlistOpen(true)}
        currency={currency}
        setCurrency={setCurrency}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        openR2Guide={() => setIsR2GuideOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1 pb-16">
        {currentView === 'showcase' ? (
          <>
            {/* Cinematic Red FRAGMENT Banner */}
            {!searchQuery && (
              <HeroBanner 
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
            />

            {/* Bestsellers Section matching screenshot */}
            <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pt-4 sm:pt-6">
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
                  {selectedCategory === 'all' ? 'Bestsellers' : `${selectedCategory} Collection`}
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
          /* Secure Admin Panel */
          <div className="bg-slate-950 text-white min-h-[90vh]">
            <AdminPanel
              products={products}
              categories={uniqueCategories}
              stats={stats}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onResetCatalog={handleResetCatalog}
              currency={currency}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200/80 bg-neutral-50 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#e50914]" />
            <span className="font-bold text-neutral-900 tracking-tight font-typewriter">
              DIFFERENTIATE, DON'T COMPARE
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
                const nextView = currentView === 'showcase' ? 'admin' : 'showcase';
                setCurrentView(nextView);
                window.history.pushState({}, '', nextView === 'admin' ? '/admin' : '/');
              }}
              className="hover:text-neutral-900 font-mono transition-colors"
            >
              {currentView === 'showcase' ? 'Admin Portal' : 'Storefront'}
            </button>
          </div>
        </div>
      </footer>

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
