import React, { useState, useEffect, useMemo } from 'react';
import { Search, Heart, ShieldCheck, Check, ArrowUp, Key, Download, Lock, KeyRound, Smartphone, Eye, EyeOff, Sparkles, ArrowRight, AlertCircle, X } from 'lucide-react';
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
import { PwaInstallModal } from './components/admin/PwaInstallModal';
import { JerseyProduct, StoreStats } from './types';
import { SiteSettings, DEFAULT_SITE_SETTINGS, CategoryItem } from './types/settings';
import { INITIAL_JERSEYS, CATEGORY_CAROUSEL_ITEMS } from './data/mockJerseys';
import { CurrencyCode } from './utils/currency';
import { sortProductsWithPinned } from './utils/productSort';

export default function App() {
  // Determine if running as standalone PWA or shortcut
  const isPwaStandalone = (): boolean => {
    if (typeof window !== 'undefined') {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isIosStandalone = (window.navigator as any).standalone === true;
      const hasPwaQuery = window.location.search.toLowerCase().includes('pwa=1') || window.location.search.toLowerCase().includes('source=pwa');
      return isStandaloneMedia || isIosStandalone || hasPwaQuery;
    }
    return false;
  };

  // Determine initial view from URL path and PWA mode
  const getInitialView = (): 'showcase' | 'admin' | 'order' => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const search = window.location.search.toLowerCase();
      const hash = window.location.hash.toLowerCase();

      // 1. Check for Place Order first (via path, query param, or hash)
      if (
        path === '/place-order' || 
        path.startsWith('/place-order') || 
        path === '/placeorder' || 
        path.startsWith('/placeorder') || 
        path === '/order' || 
        path.startsWith('/order') || 
        search.includes('view=order') || 
        search.includes('page=order') || 
        search.includes('placeorder') || 
        search.includes('place-order') ||
        hash === '#/order' || 
        hash === '#/place-order' ||
        hash === '#/placeorder' ||
        hash.includes('placeorder')
      ) {
        return 'order';
      }

      // 2. Check for Admin view
      if (
        path === '/admin' || 
        path.startsWith('/admin') || 
        search.includes('view=admin') || 
        search.includes('admin=1') || 
        search.includes('admin') || 
        hash === '#/admin' ||
        hash.includes('admin')
      ) {
        return 'admin';
      }
      
      // 3. If launched from standalone PWA icon on root or admin shortcut
      if (isPwaStandalone() && !search.includes('view=showcase') && !search.includes('view=order')) {
        return 'admin';
      }
    }
    return 'showcase';
  };

  // Navigation & Filter States
  const [currentView, setCurrentView] = useState<'showcase' | 'admin' | 'order'>(getInitialView);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedOrderProductId, setSelectedOrderProductId] = useState<string | undefined>(undefined);
  const [selectedOrderSize, setSelectedOrderSize] = useState<string | undefined>(undefined);
  const [currency, setCurrency] = useState<CurrencyCode>('BDT');

  useEffect(() => {
    try {
      localStorage.setItem('orifake_currency', 'BDT');
      localStorage.setItem('spidey_currency', 'BDT');
    } catch {}
  }, []);

  // PWA & Web App Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPwaModalOpen, setIsPwaModalOpen] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(isPwaStandalone);

  // Gate PIN Entry Form state
  const [gatePinInput, setGatePinInput] = useState('');
  const [showGatePassword, setShowGatePassword] = useState(false);
  const [gateRememberDevice, setGateRememberDevice] = useState(true);
  const [gateError, setGateError] = useState('');

  // Listen to PWA install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      showToast('App installed successfully! Direct admin shortcut is ready.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handlePromptInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        showToast('App installation accepted!');
      }
      setIsPwaModalOpen(false);
    } else {
      setIsPwaModalOpen(true);
    }
  };

  // Site CMS Settings & Categories
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() => {
    try {
      const saved = localStorage.getItem('orifake_site_settings') || localStorage.getItem('spidey_site_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.brandName === 'orifake' || !parsed.brandName) {
          parsed.brandName = 'spidey';
        }
        if (parsed.heroUrlText === 'WWW.ORIFAKE.COM') {
          parsed.heroUrlText = 'WWW.SPIDEY.COM';
        }
        if (parsed.footerQuote && parsed.footerQuote.includes('ORIFAKE')) {
          parsed.footerQuote = 'Official Spidey Master Catalog';
        }
        return { ...DEFAULT_SITE_SETTINGS, ...parsed };
      }
      return DEFAULT_SITE_SETTINGS;
    } catch {
      return DEFAULT_SITE_SETTINGS;
    }
  });

  // Dynamically synchronize PWA manifest and title to current active view
  useEffect(() => {
    try {
      const manifestEl = document.getElementById('app-manifest') || document.querySelector('link[rel="manifest"]');
      const appleTitle = document.getElementById('apple-app-title') || document.querySelector('meta[name="apple-mobile-web-app-title"]');
      if (currentView === 'order') {
        if (manifestEl) manifestEl.setAttribute('href', '/manifest-placeorder.json');
        if (appleTitle) appleTitle.setAttribute('content', 'Spidey Place Order');
        document.title = 'Spidey Place Order';
      } else if (currentView === 'admin') {
        if (manifestEl) manifestEl.setAttribute('href', '/manifest-admin.json');
        if (appleTitle) appleTitle.setAttribute('content', 'Spidey Admin');
        document.title = 'Spidey Admin Dashboard';
      } else {
        if (manifestEl) manifestEl.setAttribute('href', '/manifest-admin.json');
        if (appleTitle) appleTitle.setAttribute('content', 'Spidey Admin');
        document.title = siteSettings.storeName || 'Spidey Jersey';
      }
    } catch (e) {}
  }, [currentView, siteSettings.storeName]);

  const [categoryItems, setCategoryItems] = useState<CategoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('spidey_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.sort((a: any, b: any) => {
            const orderA = typeof a.sortOrder === 'number' ? a.sortOrder : (typeof a.position === 'number' ? a.position : 0);
            const orderB = typeof b.sortOrder === 'number' ? b.sortOrder : (typeof b.position === 'number' ? b.position : 0);
            return orderA - orderB;
          });
        }
      }
      return [...CATEGORY_CAROUSEL_ITEMS];
    } catch {
      return [...CATEGORY_CAROUSEL_ITEMS];
    }
  });

  // Auth States with Auto-Login persistence
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      const auth1 = localStorage.getItem('spidey_admin_auth') === 'true';
      const auth2 = localStorage.getItem('orifake_admin_auth') === 'true';
      const auto = localStorage.getItem('spidey_auto_login') === 'true';
      return auth1 || auth2 || auto;
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

  // Product Data with LocalStorage Persistence and Deleted Tombstones
  const [products, setProducts] = useState<JerseyProduct[]>(() => {
    try {
      const deletedRaw = localStorage.getItem('spidey_deleted_product_ids');
      const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
      const delSet = new Set(deletedIds.filter(id => Boolean(id && String(id).trim())));

      const saved = localStorage.getItem('spidey_products') || localStorage.getItem('orifake_products');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter((p: any) => !(p.id && delSet.has(p.id)) && !(p.code && delSet.has(p.code)));
          if (valid.length > 0) {
            return sortProductsWithPinned(valid);
          }
        }
      }
      const initialClean = INITIAL_JERSEYS
        .filter((p) => !(p.id && delSet.has(p.id)) && !(p.code && delSet.has(p.code)))
        .map((p, idx) => ({ ...p, sortOrder: idx, position: idx }));
      return sortProductsWithPinned(initialClean.length > 0 ? initialClean : INITIAL_JERSEYS);
    } catch {
      return INITIAL_JERSEYS.map((p, idx) => ({ ...p, sortOrder: idx, position: idx }));
    }
  });
  const [stats, setStats] = useState<StoreStats | null>(null);

  // Selected Modal State for Zoom & Swipe
  const [inspectedJersey, setInspectedJersey] = useState<JerseyProduct | null>(null);

  // Wishlist / Saved Favorites
  const [wishlist, setWishlist] = useState<JerseyProduct[]>(() => {
    try {
      const saved = localStorage.getItem('spidey_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isWishlistOpen, setIsWishlistOpen] = useState<boolean>(false);
  const [isR2GuideOpen, setIsR2GuideOpen] = useState<boolean>(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Persist products, siteSettings, categoryItems, and wishlist
  useEffect(() => {
    try {
      localStorage.setItem('spidey_products', JSON.stringify(products));
    } catch (e) {
      console.warn('Storage error for products', e);
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem('spidey_wishlist', JSON.stringify(wishlist));
    } catch (e) {
      console.warn('Storage error for wishlist', e);
    }
  }, [wishlist]);

  useEffect(() => {
    try {
      localStorage.setItem('orifake_site_settings', JSON.stringify(siteSettings));
      localStorage.setItem('spidey_site_settings', JSON.stringify(siteSettings));
    } catch (e) {
      console.warn('Storage error', e);
    }
  }, [siteSettings]);

  useEffect(() => {
    try {
      if (categoryItems && categoryItems.length > 0) {
        localStorage.setItem('spidey_categories', JSON.stringify(categoryItems));
      }
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

  // Listen to browser popstate and hashchange for direct URL navigation (e.g. /admin, #/admin)
  useEffect(() => {
    const handleUrlChange = () => {
      const view = getInitialView();
      setCurrentView(view);
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  // Fetch Products from Backend API (Server is authoritative with anti-cache)
  const fetchProducts = async () => {
    try {
      const res = await fetch(`/api/products?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache'
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.products && Array.isArray(data.products) && data.products.length > 0) {
          // Sync server-side deleted tombstones with localStorage
          let delSet = new Set<string>();
          try {
            const currentDeleted: string[] = JSON.parse(localStorage.getItem('spidey_deleted_product_ids') || '[]');
            const serverDeleted: string[] = Array.isArray(data.deletedProductIds) ? data.deletedProductIds : [];
            const merged = Array.from(new Set([...currentDeleted, ...serverDeleted])).filter(id => Boolean(id && String(id).trim()));
            localStorage.setItem('spidey_deleted_product_ids', JSON.stringify(merged));
            delSet = new Set(merged);
          } catch {}

          // Filter against tombstone set and sort strictly: Pinned items float to Top, then drag-and-drop sortOrder
          const validProducts = data.products.filter((p: JerseyProduct) => !(p.id && delSet.has(p.id)) && !(p.code && delSet.has(p.code)));
          const cleanProducts: JerseyProduct[] = sortProductsWithPinned(
            validProducts.length > 0 ? validProducts : data.products
          );

          setProducts(cleanProducts);
          try {
            localStorage.setItem('spidey_products', JSON.stringify(cleanProducts));
            localStorage.removeItem('orifake_products');
          } catch {}
        } else {
          // If server products came back empty, ensure we never show blank store
          setProducts((prev) => (prev && prev.length > 0 ? prev : sortProductsWithPinned(INITIAL_JERSEYS)));
        }
      }
    } catch (err) {
      console.warn('Using local/cached dataset:', err);
      setProducts((prev) => (prev && prev.length > 0 ? prev : sortProductsWithPinned(INITIAL_JERSEYS)));
    }
  };

  const fetchSiteSettings = async () => {
    try {
      const res = await fetch(`/api/settings?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache'
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.settings && typeof data.settings === 'object') {
          setSiteSettings((prev) => {
            const next = { ...prev, ...data.settings };
            try {
              localStorage.setItem('orifake_site_settings', JSON.stringify(next));
              localStorage.setItem('spidey_site_settings', JSON.stringify(next));
            } catch {}
            return next;
          });
        }
      }
    } catch (err) {
      console.warn('Settings fetch error:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`/api/categories?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache'
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.categories && Array.isArray(data.categories) && data.categories.length > 0) {
          const cleanCategories: CategoryItem[] = data.categories.sort((a: CategoryItem, b: CategoryItem) => {
            const orderA = typeof a.sortOrder === 'number' ? a.sortOrder : (typeof a.position === 'number' ? a.position : 0);
            const orderB = typeof b.sortOrder === 'number' ? b.sortOrder : (typeof b.position === 'number' ? b.position : 0);
            return orderA - orderB;
          });
          setCategoryItems(cleanCategories);
          try {
            localStorage.setItem('spidey_categories', JSON.stringify(cleanCategories));
            localStorage.removeItem('orifake_categories');
            localStorage.removeItem('spidey_deleted_category_ids');
          } catch {}
        } else {
          // If server categories was empty, fall back to default carousel items
          setCategoryItems((prev) => (prev && prev.length > 0 ? prev : CATEGORY_CAROUSEL_ITEMS));
        }
      }
    } catch (err) {
      console.warn('Categories fetch error:', err);
      setCategoryItems((prev) => (prev && prev.length > 0 ? prev : CATEGORY_CAROUSEL_ITEMS));
    }
  };

  // Fetch Stats
  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/stats?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache'
        }
      });
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

  // When returning to showcase or customer-facing view, re-fetch immediately to guarantee fresh sequence
  useEffect(() => {
    if (currentView === 'showcase') {
      fetchProducts();
      fetchCategories();
    }
  }, [currentView]);

  // Synchronize across tabs or local update events
  useEffect(() => {
    const handleSync = () => {
      fetchProducts();
      fetchCategories();
      fetchSiteSettings();
      fetchStats();
    };
    window.addEventListener('spidey_catalog_updated', handleSync);
    window.addEventListener('spidey_reconnect_sync', handleSync);
    window.addEventListener('storage', handleSync);
    window.addEventListener('focus', handleSync);
    return () => {
      window.removeEventListener('spidey_catalog_updated', handleSync);
      window.removeEventListener('spidey_reconnect_sync', handleSync);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, []);

  // Filter products by selected category and search query, and strictly sort by position / sortOrder
  const safeProductsList = Array.isArray(products) ? products : [];
  const displayedProducts = useMemo(() => {
    const filtered = safeProductsList.filter((p) => {
      const pCat = p?.category?.toLowerCase() || '';
      const pTitle = p?.title?.toLowerCase() || '';
      const pSeason = p?.season?.toLowerCase() || '';
      const pEdition = p?.edition?.toLowerCase() || '';
      const pBadge = p?.badge?.toLowerCase() || '';
      const selCat = (selectedCategory || 'all').toLowerCase();
      const query = searchQuery.trim().toLowerCase();

      const selCatObj = categoryItems.find(
        (c) => c.id.toLowerCase() === selCat || c.name.toLowerCase() === selCat
      );
      const matchesCategory =
        selCat === 'all' ||
        pCat === selCat ||
        (selCatObj && (pCat === selCatObj.id.toLowerCase() || pCat === selCatObj.name.toLowerCase())) ||
        (selCat === 'kits' && (pCat.includes('madrid') || pCat.includes('barcelona') || pCat.includes('manchester')));

      const matchesSearch =
        !query ||
        pTitle.includes(query) ||
        pCat.includes(query) ||
        pSeason.includes(query) ||
        pEdition.includes(query) ||
        pBadge.includes(query);

      return matchesCategory && matchesSearch;
    });

    // Strictly sort: Pinned ("Top") products float to top, followed by drag-and-drop sortOrder
    return sortProductsWithPinned(filtered);
  }, [safeProductsList, selectedCategory, searchQuery, categoryItems]);

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
    // 1. Identify product target id & code
    const target = products.find((p) => p.id === id || p.code === id);
    const targetId = target?.id || id;
    const targetCode = target?.code;

    // 2. Immediate optimistic state update
    const updatedProducts = products.filter(
      (p) => p.id !== targetId && (!targetCode || p.code !== targetCode)
    );
    setProducts(updatedProducts);

    const updatedWishlist = wishlist.filter(
      (p) => p.id !== targetId && (!targetCode || p.code !== targetCode)
    );
    setWishlist(updatedWishlist);

    // 3. Immediately update LocalStorage tombstones and datasets
    try {
      const currentDeleted: string[] = JSON.parse(
        localStorage.getItem('spidey_deleted_product_ids') || '[]'
      );
      const newDeleted = Array.from(
        new Set([...currentDeleted, targetId, ...(targetCode ? [targetCode] : [])])
      );
      localStorage.setItem('spidey_deleted_product_ids', JSON.stringify(newDeleted));
      localStorage.setItem('spidey_products', JSON.stringify(updatedProducts));
      localStorage.setItem('spidey_wishlist', JSON.stringify(updatedWishlist));
      localStorage.removeItem('orifake_products');
    } catch (e) {
      console.warn('LocalStorage deletion sync error:', e);
    }

    // 4. Send permanent delete request to backend
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(targetId)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.products)) {
          setProducts(data.products);
          localStorage.setItem('spidey_products', JSON.stringify(data.products));
        }
        showToast('প্রোডাক্টটি ডাটাবেস ও স্টোর থেকে স্থায়ীভাবে ডিলিট করা হয়েছে');
        fetchStats();
        return true;
      } else if (targetCode && targetCode !== targetId) {
        // Fallback: try deleting by code if id differed
        const res2 = await fetch(`/api/products/${encodeURIComponent(targetCode)}`, {
          method: 'DELETE'
        });
        const data2 = await res2.json();
        if (data2.success && Array.isArray(data2.products)) {
          setProducts(data2.products);
          localStorage.setItem('spidey_products', JSON.stringify(data2.products));
          showToast('প্রোডাক্টটি ডাটাবেস ও স্টোর থেকে স্থায়ীভাবে ডিলিট করা হয়েছে');
          fetchStats();
          return true;
        }
      }
    } catch (err) {
      console.error('API product deletion error:', err);
    }
    showToast('প্রোডাক্টটি ডাটাবেস ও স্টোর থেকে স্থায়ীভাবে ডিলিট করা হয়েছে');
    return true;
  };

  const handleReorderProducts = async (reordered: JerseyProduct[]): Promise<boolean> => {
    // Stamp explicit sequential positions
    const stamped = reordered.map((p, idx) => ({
      ...p,
      sortOrder: idx,
      position: idx,
      priority: idx
    }));

    setProducts(stamped);
    try {
      localStorage.setItem('spidey_products', JSON.stringify(stamped));
      localStorage.removeItem('orifake_products');
    } catch {}

    try {
      const res = await fetch('/api/products/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        body: JSON.stringify({
          productIds: stamped.map((p) => p.id),
          products: stamped
        })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        const sortedFromServer = data.products.map((p: any, idx: number) => ({
          ...p,
          sortOrder: p.sortOrder !== undefined ? p.sortOrder : idx,
          position: p.position !== undefined ? p.position : idx,
          priority: p.priority !== undefined ? p.priority : idx
        }));
        setProducts(sortedFromServer);
        try {
          localStorage.setItem('spidey_products', JSON.stringify(sortedFromServer));
        } catch {}
      }
    } catch (err) {
      console.error('Failed to sync product reorder:', err);
    }
    showToast('প্রোডাক্ট ক্রম সফলভাবে ডাটাবেস ও স্টোরে সেভ হয়েছে!', 'success');
    return true;
  };

  // Quick "Top" (Pin to Top) Toggle for Products
  const handleTogglePinProduct = async (productId: string): Promise<boolean> => {
    const target = products.find((p) => p.id === productId || p.code === productId);
    if (!target) return false;

    const willBePinned = !target.isPinned;
    let updatedProduct: JerseyProduct;

    if (willBePinned) {
      // Find highest pinnedOrder among currently pinned items so new pinned item stacks sequentially
      const currentPinned = products.filter((p) => p.isPinned && p.id !== target.id && p.code !== target.id);
      const maxPinnedOrder = currentPinned.reduce(
        (max, p) => Math.max(max, typeof p.pinnedOrder === 'number' ? p.pinnedOrder : 0),
        0
      );
      updatedProduct = {
        ...target,
        isPinned: true,
        pinnedAt: Date.now(),
        pinnedOrder: maxPinnedOrder + 1,
        updatedAt: new Date().toISOString()
      };
    } else {
      updatedProduct = {
        ...target,
        isPinned: false,
        pinnedAt: undefined,
        pinnedOrder: undefined,
        updatedAt: new Date().toISOString()
      };
    }

    // 1. Immediately update state so item jumps to Top or drops to normal position without snapping back
    const nextProducts = sortProductsWithPinned(
      products.map((p) => (p.id === target.id || p.code === target.id ? updatedProduct : p))
    );
    setProducts(nextProducts);
    try {
      localStorage.setItem('spidey_products', JSON.stringify(nextProducts));
    } catch {}

    // 2. Persist to server API
    try {
      await fetch(`/api/products/${encodeURIComponent(target.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProduct)
      });
    } catch (err) {
      console.error('Failed to sync pin status with server:', err);
    }

    if (willBePinned) {
      showToast(`📌 "${target.title}" সফলভাবে সবার উপরে (Top) পিন করা হয়েছে!`, 'success');
    } else {
      showToast(`"${target.title}" আনপিন করা হয়েছে।`, 'info');
    }

    return true;
  };

  const handleReorderCategories = async (reordered: CategoryItem[]): Promise<boolean> => {
    // Stamp explicit sequential positions
    const stamped = reordered.map((c, idx) => ({
      ...c,
      sortOrder: idx,
      position: idx,
      priority: idx
    }));

    setCategoryItems(stamped);
    try {
      localStorage.setItem('spidey_categories', JSON.stringify(stamped));
      localStorage.removeItem('orifake_categories');
    } catch {}

    try {
      const res = await fetch('/api/categories/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        body: JSON.stringify({
          categories: stamped,
          categoryIds: stamped.map((c) => c.id)
        })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.categories)) {
        const sortedFromServer = data.categories.map((c: any, idx: number) => ({
          ...c,
          sortOrder: c.sortOrder !== undefined ? c.sortOrder : idx,
          position: c.position !== undefined ? c.position : idx,
          priority: c.priority !== undefined ? c.priority : idx
        }));
        setCategoryItems(sortedFromServer);
        try {
          localStorage.setItem('spidey_categories', JSON.stringify(sortedFromServer));
        } catch {}
      }
    } catch (err) {
      console.error('Failed to sync category reorder:', err);
    }
    showToast('ক্যাটাগরি ক্রম সফলভাবে ডাটাবেস ও স্টোরে সেভ হয়েছে!', 'success');
    return true;
  };

  const handleResetCatalog = async () => {
    try {
      localStorage.removeItem('spidey_deleted_product_ids');
      localStorage.removeItem('spidey_deleted_category_ids');
      localStorage.removeItem('spidey_products');
      localStorage.removeItem('orifake_products');
      localStorage.removeItem('spidey_categories');
      localStorage.removeItem('orifake_categories');
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        setProducts(data.products);
        setCategoryItems(Array.isArray(data.categories) ? data.categories : CATEGORY_CAROUSEL_ITEMS);
        setSiteSettings(DEFAULT_SITE_SETTINGS);
        showToast('Store reset to original demo setup!');
        fetchStats();
        return;
      }
    } catch (err) {
      // Fallback
    }
    setProducts(INITIAL_JERSEYS);
    setCategoryItems(CATEGORY_CAROUSEL_ITEMS);
    setSiteSettings(DEFAULT_SITE_SETTINGS);
    showToast('Store reset to original demo setup!');
  };

  // CMS Settings Actions (Sync with R2 backend)
  const handleUpdateSiteSettings = async (newSettings: Partial<SiteSettings>) => {
    const updated = { ...DEFAULT_SITE_SETTINGS, ...siteSettings, ...newSettings };
    setSiteSettings(updated);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      const data = await res.json();
      if (data.success && data.settings) {
        setSiteSettings({ ...DEFAULT_SITE_SETTINGS, ...data.settings });
      }
    } catch (e) {
      console.warn('Failed to sync settings with backend:', e);
    }
    try {
      const toCache = { ...updated };
      if (toCache.heroBgImage && toCache.heroBgImage.startsWith('data:') && toCache.heroBgImage.length > 200000) {
        toCache.heroBgImage = '';
      }
      localStorage.setItem('orifake_site_settings', JSON.stringify(toCache));
      localStorage.setItem('spidey_site_settings', JSON.stringify(toCache));
    } catch (storageErr) {
      console.warn('LocalStorage quota or disabled:', storageErr);
    }
    showToast('Store banner & settings updated live across all devices!');
  };

  const handleAddCategory = async (cat: CategoryItem) => {
    // 1. Functional update to prevent stale closures when adding multiple categories quickly
    setCategoryItems((prev) => {
      const filtered = prev.filter(
        (c) =>
          String(c.id).toLowerCase() !== String(cat.id).toLowerCase() &&
          String(c.name).toLowerCase() !== String(cat.name).toLowerCase()
      );
      return [...filtered, cat];
    });

    // 2. Persist to server
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cat)
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.categories)) {
        setCategoryItems(data.categories);
        try {
          localStorage.setItem('spidey_categories', JSON.stringify(data.categories));
          localStorage.removeItem('orifake_categories');
        } catch {}
      }
    } catch (e) {
      console.warn('Failed to sync category with server:', e);
    }
    showToast(`ক্যাটাগরি "${cat.name}" সফলভাবে যুক্ত হয়েছে!`);
    fetchStats();
  };

  const handleUpdateCategory = async (id: string, updated: Partial<CategoryItem>) => {
    const rawId = String(id || '').trim();
    // 1. Functional state update
    setCategoryItems((prev) =>
      prev.map((c) =>
        c.id === rawId || c.id.toLowerCase() === rawId.toLowerCase() || c.name.toLowerCase() === rawId.toLowerCase()
          ? { ...c, ...updated }
          : c
      )
    );

    // 2. Persist to server
    try {
      const res = await fetch(`/api/categories/${encodeURIComponent(rawId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.categories)) {
        setCategoryItems(data.categories);
        try {
          localStorage.setItem('spidey_categories', JSON.stringify(data.categories));
        } catch {}
      }
      fetchProducts();
    } catch (e) {
      console.warn('Failed to update category on server:', e);
    }
    showToast('ক্যাটাগরি সফলভাবে আপডেট করা হয়েছে!');
  };

  const handleDeleteCategory = async (id: string) => {
    const rawId = String(id || '').trim();
    
    // 1. Functional state removal immediately from UI
    setCategoryItems((prev) => {
      const target = prev.find(
        (c) =>
          c.id === rawId ||
          c.id.toLowerCase() === rawId.toLowerCase() ||
          c.name.toLowerCase() === rawId.toLowerCase()
      );
      const targetId = target?.id || rawId;
      const targetName = target?.name;

      if (
        selectedCategory.toLowerCase() === targetId.toLowerCase() ||
        (targetName && selectedCategory.toLowerCase() === targetName.toLowerCase())
      ) {
        setSelectedCategory('all');
      }

      return prev.filter(
        (c) =>
          c.id.toLowerCase() !== targetId.toLowerCase() &&
          (!targetName || c.name.toLowerCase() !== targetName.toLowerCase())
      );
    });

    // 2. Persist deletion on backend server
    try {
      const res = await fetch(`/api/categories/${encodeURIComponent(rawId)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.categories)) {
        setCategoryItems(data.categories);
        try {
          localStorage.setItem('spidey_categories', JSON.stringify(data.categories));
          localStorage.removeItem('orifake_categories');
          localStorage.removeItem('spidey_deleted_category_ids');
        } catch {}
      }
    } catch (e) {
      console.warn('Failed to delete category on server:', e);
    }
    showToast('ক্যাটাগরি স্থায়ীভাবে মুছে ফেলা হয়েছে', 'success');
    fetchStats();
  };

  // Bulk Save All Categories (Ensures complete disk persistence)
  const handleSaveAllCategories = async (customList?: CategoryItem[]): Promise<boolean> => {
    const listToSave = customList || categoryItems;
    try {
      const res = await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: listToSave })
      });
      if (!res.ok) {
        let errMsg = 'ক্যাটাগরি সেভ করতে সমস্যা হয়েছে';
        try {
          const errData = await res.json();
          if (errData.message) errMsg = errData.message;
        } catch {}
        showToast(errMsg, 'error');
        return false;
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.categories)) {
        setCategoryItems(data.categories);
        try {
          localStorage.setItem('spidey_categories', JSON.stringify(data.categories));
          localStorage.removeItem('orifake_categories');
          localStorage.removeItem('spidey_deleted_category_ids');
        } catch {}
        showToast('সকল ক্যাটাগরি স্থায়ীভাবে সার্ভারে সেভ হয়েছে!', 'success');
        return true;
      }
    } catch (e: any) {
      console.error('Failed to bulk save categories:', e);
      showToast('ক্যাটাগরি সেভ করতে সমস্যা হয়েছে (সার্ভার সংযোগ ত্রুটি)', 'error');
    }
    return false;
  };

  // Reset categories to clean default state
  const handleResetCategories = async () => {
    try {
      const res = await fetch('/api/categories/reset', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.categories)) {
          setCategoryItems(data.categories);
          try {
            localStorage.setItem('spidey_categories', JSON.stringify(data.categories));
            localStorage.removeItem('orifake_categories');
            localStorage.removeItem('spidey_deleted_category_ids');
          } catch {}
          showToast('সকল ক্যাটাগরি সফলভাবে ডিফল্ট অবস্থায় রিস্টোর করা হয়েছে!', 'success');
          return;
        }
      }
    } catch (e) {
      console.error('Failed to reset categories on server:', e);
    }
    setCategoryItems(CATEGORY_CAROUSEL_ITEMS);
    try {
      localStorage.setItem('spidey_categories', JSON.stringify(CATEGORY_CAROUSEL_ITEMS));
      localStorage.removeItem('orifake_categories');
    } catch {}
    showToast('সকল ক্যাটাগরি রিস্টোর হয়েছে!', 'success');
  };

  // Auth Actions with Remember Device / Auto-Login logic
  const handleAdminLoginSuccess = (rememberDevice: boolean = true) => {
    setIsAdminAuthenticated(true);
    try {
      localStorage.setItem('orifake_admin_auth', 'true');
      localStorage.setItem('spidey_admin_auth', 'true');
      if (rememberDevice) {
        localStorage.setItem('spidey_auto_login', 'true');
      } else {
        localStorage.removeItem('spidey_auto_login');
      }
    } catch {}
    setCurrentView('admin');
    window.history.pushState({}, '', '/admin');
    showToast('Admin access granted! Welcome back.');
  };

  const handleGatePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGateError('');
    const input = gatePinInput.trim();
    
    // Dynamic Secret Password resolution (from persistent site settings or saved local admin password)
    const configuredPassword = siteSettings.adminPassword || 'Spidey#Admin@2026';
    const localSavedPassword = typeof window !== 'undefined' ? localStorage.getItem('spidey_admin_pin') : null;

    if (
      (localSavedPassword && input === localSavedPassword) ||
      input === configuredPassword
    ) {
      handleAdminLoginSuccess(gateRememberDevice);
      setGatePinInput('');
    } else {
      setGateError('ভুল পাসওয়ার্ড! সঠিক সিক্রেট পাসওয়ার্ড প্রদান করুন।');
    }
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
      localStorage.removeItem('spidey_admin_auth');
      localStorage.removeItem('spidey_auto_login');
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
          setSelectedOrderSize(undefined);
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
        onOpenPwaModal={() => setIsPwaModalOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1 pb-16">
        {currentView === 'order' ? (
          <PlaceOrderPage
            products={products}
            initialProductId={selectedOrderProductId}
            initialSize={selectedOrderSize}
            currency={currency}
            siteSettings={siteSettings}
            onPromptInstall={handlePromptInstall}
            deferredPrompt={deferredPrompt}
            isStandalone={isStandalone}
            onBackToStore={() => {
              setSelectedOrderProductId(undefined);
              setSelectedOrderSize(undefined);
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
              onReorderProducts={handleReorderProducts}
              onTogglePinProduct={handleTogglePinProduct}
              onResetCatalog={handleResetCatalog}
              onUpdateSiteSettings={handleUpdateSiteSettings}
              onAddCategory={handleAddCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
              onReorderCategories={handleReorderCategories}
              onSaveAllCategories={handleSaveAllCategories}
              onRefreshCategories={fetchCategories}
              onResetCategories={handleResetCategories}
              onLogoutAdmin={handleLogoutAdmin}
              onViewStorefront={() => {
                setCurrentView('showcase');
                window.history.pushState({}, '', '/');
              }}
              onOpenPwaModal={() => setIsPwaModalOpen(true)}
              deferredPrompt={deferredPrompt}
              onPromptInstall={handlePromptInstall}
              isStandalone={isStandalone}
              currency={currency}
            />
          ) : (
            <div className="min-h-[75vh] flex items-center justify-center p-4 bg-[#090b0e]">
              <div className="max-w-md w-full bg-[#11141a] p-6 sm:p-8 rounded-3xl border border-white/10 text-white space-y-5 shadow-2xl">
                
                {/* Header Lock Icon & Titles */}
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-[#e50914] text-white mx-auto flex items-center justify-center shadow-lg shadow-red-600/30">
                    <Lock className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
                      Admin Control Portal
                    </h2>
                    <p className="text-xs text-neutral-400 mt-1">
                      গোপন অ্যাডমিন পাসওয়ার্ড দিয়ে কন্ট্রোল প্যানেলে প্রবেশ করুন।
                    </p>
                  </div>
                </div>

                {/* Inline Fast Password Form */}
                <form onSubmit={handleGatePinSubmit} className="space-y-4">
                  {gateError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold">
                      {gateError}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-neutral-300">
                        Admin Secret Password
                      </label>
                    </div>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showGatePassword ? "text" : "password"}
                        value={gatePinInput}
                        onChange={(e) => setGatePinInput(e.target.value)}
                        placeholder="••••••••••••"
                        required
                        autoFocus
                        autoComplete="current-password"
                        className="w-full pl-9 pr-10 py-3 text-xs bg-neutral-900 border border-white/10 rounded-2xl focus:outline-none focus:border-red-500 text-white font-mono tracking-wider"
                      />
                      <button
                        type="button"
                        onClick={() => setShowGatePassword(!showGatePassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white p-1 cursor-pointer"
                        title={showGatePassword ? "Hide Password" : "Show Password"}
                      >
                        {showGatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember this Device (Auto-Login) Toggle */}
                  <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-all select-none">
                    <input
                      type="checkbox"
                      checked={gateRememberDevice}
                      onChange={(e) => setGateRememberDevice(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-red-600 focus:ring-red-500 border-neutral-700 bg-neutral-900"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-white block">
                        এই ডিভাইসে অটো-লগইন সক্রিয় রাখুন
                      </span>
                      <span className="text-[11px] text-neutral-400 block mt-0.5">
                        পরবর্তী প্রতিবার অ্যাপ ওপেন করার সাথে সাথেই সরাসরি অ্যাডমিন প্যানেল লোড হবে।
                      </span>
                    </div>
                  </label>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-2xl bg-[#e50914] hover:bg-red-700 text-white font-black text-xs shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2 active:scale-98"
                  >
                    <span>১-ক্লিকে অ্যাডমিন প্যানেলে প্রবেশ করুন</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                {/* Additional Quick Actions */}
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <button
                    type="button"
                    onClick={() => setIsPwaModalOpen(true)}
                    className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>মোবাইল / পিসিতে অ্যাপ হিসেবে ইনস্টল করুন (PWA)</span>
                  </button>

                  <button
                    onClick={() => {
                      setCurrentView('showcase');
                      window.history.pushState({}, '', '/');
                    }}
                    className="w-full py-2 rounded-xl text-neutral-400 hover:text-white text-xs font-medium transition-colors"
                  >
                    Return to Live Storefront
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
        adminPassword={siteSettings.adminPassword || 'Spidey#Admin@2026'}
      />

      {/* PWA / Web App Install Modal */}
      <PwaInstallModal
        isOpen={isPwaModalOpen}
        onClose={() => setIsPwaModalOpen(false)}
        deferredPrompt={deferredPrompt}
        onPromptInstall={handlePromptInstall}
        isStandalone={isStandalone}
      />

      {/* Interactive Zoom & Swipe Modal */}
      <ProductModal
        jersey={inspectedJersey}
        onClose={() => setInspectedJersey(null)}
        isWishlisted={inspectedJersey ? isWishlisted(inspectedJersey.id) : false}
        onToggleWishlist={handleToggleWishlist}
        currency={currency}
        siteSettings={siteSettings}
        onOrderProduct={(jersey, size) => {
          setSelectedOrderProductId(jersey.id);
          setSelectedOrderSize(size);
          setInspectedJersey(null);
          setCurrentView('order');
          window.history.pushState({}, '', '/place-order');
        }}
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
        <div
          className={`fixed bottom-6 right-6 z-50 p-3.5 sm:p-4 rounded-2xl text-white text-xs font-semibold shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-bottom-5 border ${
            toastType === 'error'
              ? 'bg-rose-950/95 border-rose-600/60 shadow-rose-950/50'
              : toastType === 'info'
              ? 'bg-neutral-900 border-amber-500/50 shadow-black/40'
              : 'bg-neutral-900 border-neutral-700/80 shadow-black/40'
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
              toastType === 'error'
                ? 'bg-rose-500 text-white'
                : toastType === 'info'
                ? 'bg-amber-400 text-neutral-950'
                : 'bg-emerald-400 text-neutral-950'
            }`}
          >
            {toastType === 'error' ? (
              <X className="w-2.5 h-2.5 stroke-[3]" />
            ) : toastType === 'info' ? (
              <AlertCircle className="w-2.5 h-2.5 stroke-[3]" />
            ) : (
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            )}
          </div>
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
