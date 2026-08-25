import React, { useState, useRef } from 'react';
import { 
  Plus, Upload, Trash2, Edit3, Shield, Check, X, 
  RefreshCw, Layers, Database, Sparkles, Image as ImageIcon,
  DollarSign, Package, AlertCircle, ExternalLink, Copy, CheckCircle2,
  Sliders, Type, Layout, Tag, ShieldCheck, LogOut, ArrowLeft, Mail,
  ChevronRight, MoreVertical, Search, Settings, Home, Eye, Filter,
  TrendingUp, BarChart2, Folder, Globe, Compass, ArrowUpRight
} from 'lucide-react';
import { JerseyProduct, StoreStats } from '../types';
import { SiteSettings, CategoryItem } from '../types/settings';
import { CurrencyCode, formatPrice, CURRENCY_RATES } from '../utils/currency';

interface AdminPanelProps {
  products: JerseyProduct[];
  categories: CategoryItem[];
  siteSettings: SiteSettings;
  stats: StoreStats | null;
  onAddProduct: (product: Partial<JerseyProduct>) => Promise<boolean>;
  onUpdateProduct: (id: string, product: Partial<JerseyProduct>) => Promise<boolean>;
  onDeleteProduct: (id: string) => Promise<boolean>;
  onResetCatalog: () => Promise<void>;
  onUpdateSiteSettings: (settings: Partial<SiteSettings>) => void;
  onAddCategory: (cat: CategoryItem) => void;
  onUpdateCategory: (id: string, cat: Partial<CategoryItem>) => void;
  onDeleteCategory: (id: string) => void;
  onLogoutAdmin: () => void;
  currency: CurrencyCode;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  products,
  categories,
  siteSettings,
  stats,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onResetCatalog,
  onUpdateSiteSettings,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onLogoutAdmin,
  currency
}) => {
  // Active Sidebar Menu Tab
  const [activeMenu, setActiveMenu] = useState<
    'overview' | 'categories' | 'products' | 'banner' | 'cms_texts' | 'r2_storage'
  >('overview');

  // Category Sub-filter Tab
  const [catFilter, setCatFilter] = useState<'all' | 'active' | 'custom'>('all');

  // Product Form Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<JerseyProduct | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Category Form Modal State
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [catSubtitle, setCatSubtitle] = useState('');
  const [catImage, setCatImage] = useState('');
  const [catTag, setCatTag] = useState('');

  // Editable Site Settings State (Local copy for live typing)
  const [localSettings, setLocalSettings] = useState<SiteSettings>(siteSettings);
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);

  // Product Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('EDC');
  const [formCustomCategory, setFormCustomCategory] = useState('');
  const [formPrice, setFormPrice] = useState('129.99');
  const [formOriginalPrice, setFormOriginalPrice] = useState('159.99');
  const [formSeason, setFormSeason] = useState('2025');
  const [formEdition, setFormEdition] = useState('Pro Edition / Titanium');
  const [formBadge, setFormBadge] = useState('New Drop');
  const [formDescription, setFormDescription] = useState('');
  const [formStockCount, setFormStockCount] = useState('25');
  const [formInStock, setFormInStock] = useState(true);
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formFeatures, setFormFeatures] = useState<string[]>([
    'CNC milled grade-5 titanium frame',
    'Drop-tested anti-impact honeycomb core',
    'MagSafe magnetic neodymium array'
  ]);
  const [featureInput, setFeatureInput] = useState('');

  // Uploading states
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const catFileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const headerLogoFileInputRef = useRef<HTMLInputElement>(null);

  // Search in Admin
  const [searchQuery, setSearchQuery] = useState('');

  // Open Form for Adding New Product
  const openAddProductModal = () => {
    setEditingProduct(null);
    setFormTitle('');
    setFormCategory(categories[0]?.id || 'EDC');
    setFormCustomCategory('');
    setFormPrice('129.99');
    setFormOriginalPrice('159.99');
    setFormSeason('2025');
    setFormEdition('Pro Edition / Titanium');
    setFormBadge('New Drop');
    setFormDescription('Engineered high-performance EDC case woven with laser-cut ventilation and authentic team insignia.');
    setFormStockCount('20');
    setFormInStock(true);
    setFormImages(['/images/prod_pixel_case_1787668274006.jpg']);
    setFormFeatures([
      'CNC milled grade-5 titanium chassis',
      'Engineered shock absorption matrix',
      'Precision laser-cut speaker ports'
    ]);
    setIsProductModalOpen(true);
  };

  // Open Form for Editing Existing Product
  const openEditProductModal = (prod: JerseyProduct) => {
    setEditingProduct(prod);
    setFormTitle(prod.title);
    setFormCategory(prod.category);
    setFormCustomCategory('');
    setFormPrice(String(prod.price));
    setFormOriginalPrice(prod.originalPrice ? String(prod.originalPrice) : '');
    setFormSeason(prod.season);
    setFormEdition(prod.edition);
    setFormBadge(prod.badge || '');
    setFormDescription(prod.description);
    setFormStockCount(String(prod.stockCount));
    setFormInStock(prod.inStock);
    setFormImages(prod.images.length > 0 ? [...prod.images] : []);
    setFormFeatures(prod.features.length > 0 ? [...prod.features] : []);
    setIsProductModalOpen(true);
  };

  // Open Category Modal
  const openAddCategoryModal = () => {
    setEditingCatId(null);
    setCatName('');
    setCatSubtitle('');
    setCatImage('/images/cat_edc_wallet_1787668177890.jpg');
    setCatTag('Drop');
    setIsCatModalOpen(true);
  };

  const openEditCategoryModal = (cat: CategoryItem) => {
    setEditingCatId(cat.id);
    setCatName(cat.name);
    setCatSubtitle(cat.subtitle || '');
    setCatImage(cat.image);
    setCatTag(cat.tag || '');
    setIsCatModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    if (editingCatId) {
      onUpdateCategory(editingCatId, {
        name: catName.trim(),
        subtitle: catSubtitle.trim(),
        image: catImage.trim() || '/images/cat_edc_wallet_1787668177890.jpg',
        tag: catTag.trim()
      });
    } else {
      const newId = catName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
      onAddCategory({
        id: newId,
        name: catName.trim(),
        subtitle: catSubtitle.trim(),
        image: catImage.trim() || '/images/cat_edc_wallet_1787668177890.jpg',
        tag: catTag.trim()
      });
    }
    setIsCatModalOpen(false);
  };

  // File Upload Helper to R2
  const uploadFileToR2 = async (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: file.name,
              contentType: file.type,
              base64Data
            })
          });
          const result = await res.json();
          if (result.success && result.url) {
            resolve(result.url);
          } else {
            resolve(base64Data);
          }
        } catch {
          resolve(base64Data);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Product Image Upload
  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const url = await uploadFileToR2(file);
    if (url) {
      setFormImages((prev) => [...prev, url]);
    }
    setIsUploading(false);
  };

  // Category Image Upload
  const handleCategoryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const url = await uploadFileToR2(file);
    if (url) setCatImage(url);
    setIsUploading(false);
  };

  // Banner Image Upload
  const handleBannerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const url = await uploadFileToR2(file);
    if (url) {
      setLocalSettings((prev) => ({ ...prev, heroBgImage: url }));
      onUpdateSiteSettings({ heroBgImage: url });
    }
    setIsUploading(false);
  };

  // Header Logo / Mascot Upload
  const handleHeaderLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const url = await uploadFileToR2(file);
    if (url) {
      setLocalSettings((prev) => ({ ...prev, headerLogoImage: url }));
      onUpdateSiteSettings({ headerLogoImage: url });
    }
    setIsUploading(false);
  };

  // Save Product Submit
  const handleSubmitProductForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formPrice) return;

    setFormSubmitting(true);
    const finalCategory = formCategory === 'custom' && formCustomCategory.trim() 
      ? formCustomCategory.trim() 
      : formCategory;

    const payload: Partial<JerseyProduct> = {
      title: formTitle.trim(),
      category: finalCategory,
      price: parseFloat(formPrice) || 99.99,
      originalPrice: formOriginalPrice ? parseFloat(formOriginalPrice) : undefined,
      season: formSeason.trim() || '2025',
      edition: formEdition.trim() || 'Pro Issue / Titanium',
      badge: formBadge.trim() || undefined,
      description: formDescription.trim(),
      stockCount: parseInt(formStockCount, 10) || 15,
      inStock: formInStock,
      images: formImages.length > 0 ? formImages : ['/images/prod_pixel_case_1787668274006.jpg'],
      features: formFeatures.length > 0 ? formFeatures : ['Laser-engineered structural chassis'],
      sizes: ['Standard', 'Compact', 'Pro', 'Ultra']
    };

    let success = false;
    if (editingProduct) {
      success = await onUpdateProduct(editingProduct.id, payload);
    } else {
      success = await onAddProduct(payload);
    }

    setFormSubmitting(false);
    if (success) {
      setIsProductModalOpen(false);
    }
  };

  // Save Global Site Settings
  const handleSaveAllSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSiteSettings(localSettings);
    setSettingsSavedToast(true);
    setTimeout(() => setSettingsSavedToast(false), 2500);
  };

  // Filter Categories
  const filteredCategories = categories.filter((c) => {
    if (!searchQuery.trim()) return true;
    return c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.subtitle && c.subtitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.tag && c.tag.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  // Filter Products
  const filteredProducts = products.filter((p) => {
    if (!searchQuery.trim()) return true;
    return p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.edition.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const totalInventoryValue = products.reduce((acc, p) => acc + p.price * p.stockCount, 0);

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-neutral-900 flex p-3 sm:p-5 lg:p-6 gap-5 font-sans">
      
      {/* 1. DARK ROUNDED FLOATING SIDEBAR (Inspired by Drivery design) */}
      <aside className="w-64 sm:w-72 bg-[#0d0f12] text-white rounded-3xl p-5 flex flex-col justify-between shrink-0 shadow-2xl border border-white/5 select-none">
        
        <div className="space-y-7">
          {/* Top Brand Logo */}
          <div className="flex items-center justify-between px-2 pt-1">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-[#e50914] flex items-center justify-center shadow-lg shadow-red-600/30">
                <span className="font-mono font-black text-white text-base tracking-tighter">O</span>
              </div>
              <div>
                <span className="text-base font-extrabold tracking-tight font-sans text-white block">
                  {localSettings.brandName || 'orifake'}
                </span>
                <span className="text-[10px] text-neutral-400 font-mono tracking-wider uppercase block">
                  Control Center
                </span>
              </div>
            </div>
          </div>

          {/* Nav Items Group */}
          <nav className="space-y-1.5">
            
            {/* Overview / Reports */}
            <button
              onClick={() => setActiveMenu('overview')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                activeMenu === 'overview'
                  ? 'bg-white text-neutral-950 shadow-lg shadow-white/10 font-extrabold'
                  : 'text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <BarChart2 className="w-4 h-4" />
                <span>Dashboard Overview</span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                activeMenu === 'overview' ? 'bg-neutral-900 text-white font-bold' : 'bg-white/10 text-neutral-400'
              }`}>
                Live
              </span>
            </button>

            {/* Category & Slider Links */}
            <button
              onClick={() => setActiveMenu('categories')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                activeMenu === 'categories'
                  ? 'bg-white text-neutral-950 shadow-lg shadow-white/10 font-extrabold'
                  : 'text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4" />
                <span>Categories & Carousel</span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                activeMenu === 'categories' ? 'bg-neutral-900 text-white font-bold' : 'bg-white/10 text-neutral-400'
              }`}>
                {categories.length}
              </span>
            </button>

            {/* Products & Drops */}
            <button
              onClick={() => setActiveMenu('products')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                activeMenu === 'products'
                  ? 'bg-white text-neutral-950 shadow-lg shadow-white/10 font-extrabold'
                  : 'text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <Package className="w-4 h-4" />
                <span>Product Drops & Items</span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                activeMenu === 'products' ? 'bg-neutral-900 text-white font-bold' : 'bg-white/10 text-neutral-400'
              }`}>
                {products.length}
              </span>
            </button>

            {/* Banner & Hero Studio */}
            <button
              onClick={() => setActiveMenu('banner')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                activeMenu === 'banner'
                  ? 'bg-white text-neutral-950 shadow-lg shadow-white/10 font-extrabold'
                  : 'text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <ImageIcon className="w-4 h-4" />
                <span>Hero Banner Studio</span>
              </div>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                activeMenu === 'banner' ? 'bg-red-600 text-white' : 'bg-red-600/30 text-red-400'
              }`}>
                Live
              </span>
            </button>

            {/* Store Texts & Headings A-to-Z */}
            <button
              onClick={() => setActiveMenu('cms_texts')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                activeMenu === 'cms_texts'
                  ? 'bg-white text-neutral-950 shadow-lg shadow-white/10 font-extrabold'
                  : 'text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <Type className="w-4 h-4" />
                <span>All Texts & Slogans (A-Z)</span>
              </div>
              <span className={`text-[10px] font-mono font-bold ${
                activeMenu === 'cms_texts' ? 'text-neutral-900' : 'text-neutral-400'
              }`}>
                CMS
              </span>
            </button>

            {/* Cloudflare R2 Storage */}
            <button
              onClick={() => setActiveMenu('r2_storage')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                activeMenu === 'r2_storage'
                  ? 'bg-white text-neutral-950 shadow-lg shadow-white/10 font-extrabold'
                  : 'text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <Database className="w-4 h-4" />
                <span>Cloudflare R2 Bucket</span>
              </div>
              <span className={`w-2 h-2 rounded-full ${
                activeMenu === 'r2_storage' ? 'bg-emerald-600' : 'bg-emerald-400'
              }`} />
            </button>

          </nav>
        </div>

        {/* Bottom Sidebar Actions */}
        <div className="pt-6 border-t border-white/10 space-y-1.5">
          <button
            onClick={onResetCatalog}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reset Demo Data</span>
          </button>

          <button
            onClick={onLogoutAdmin}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out & View Store</span>
          </button>
        </div>

      </aside>

      {/* 2. MAIN DASHBOARD CONTENT AREA */}
      <main className="flex-1 bg-white rounded-3xl p-6 sm:p-8 lg:p-10 shadow-sm border border-neutral-200/80 overflow-y-auto flex flex-col justify-between">
        
        <div className="space-y-8">
          
          {/* Top Title Bar & Time Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
                {activeMenu === 'overview' && 'Storefront Reports & Analytics'}
                {activeMenu === 'categories' && 'Category Carousel & Logos Manager'}
                {activeMenu === 'products' && 'Product Catalog & Inventory'}
                {activeMenu === 'banner' && 'Hero FRAGMENT Banner Studio'}
                {activeMenu === 'cms_texts' && 'Site Headings, Texts & Slogans (A to Z)'}
                {activeMenu === 'r2_storage' && 'Cloudflare R2 Storage Engine'}
              </h1>
              <p className="text-xs text-neutral-500 mt-1 font-medium">
                Live CMS manager. Every text, logo, photo, and title updates the public storefront immediately.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onLogoutAdmin}
                className="px-4 py-2 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold flex items-center gap-2 transition-all"
              >
                <Eye className="w-3.5 h-3.5 text-neutral-600" />
                <span>View Public Store</span>
              </button>

              <div className="px-3.5 py-1.5 rounded-2xl bg-neutral-100 text-neutral-700 text-xs font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Synchronized</span>
              </div>
            </div>
          </div>

          {/* 3. FOUR METRIC SUMMARY CARDS (Inspired by Drivery layout) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Dark Solid Card with Sparkline */}
            <div className="p-5 rounded-3xl bg-[#0d0f12] text-white shadow-xl flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400 font-medium tracking-wide">
                  Total Valuation
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>

              <div className="mt-4">
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-sans">
                  {formatPrice(totalInventoryValue, currency)}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold mt-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>+12% live catalog value</span>
                </div>
              </div>

              {/* Sparkline Visual */}
              <svg className="w-full h-8 mt-2 opacity-50 stroke-emerald-400 fill-none stroke-2" viewBox="0 0 100 25">
                <path d="M0,20 Q20,10 40,15 T80,5 T100,12" />
              </svg>
            </div>

            {/* Card 2: Clean White Card (Categories) */}
            <div className="p-5 rounded-3xl bg-[#f8f9fa] border border-neutral-200/60 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500 font-bold">
                  Categories & Carousels
                </span>
                <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900">
                  {categories.length}
                </div>
                <span className="text-[11px] text-emerald-600 font-bold">
                  +100% customizable logos
                </span>
              </div>
            </div>

            {/* Card 3: Clean White Card (Products) */}
            <div className="p-5 rounded-3xl bg-[#f8f9fa] border border-neutral-200/60 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500 font-bold">
                  Active Product Drops
                </span>
                <div className="w-7 h-7 rounded-xl bg-neutral-900 text-white flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900">
                  {products.length}
                </div>
                <span className="text-[11px] text-neutral-600 font-bold">
                  Instant R2 photo upload
                </span>
              </div>
            </div>

            {/* Card 4: Clean White Card (R2 Cloud Storage) */}
            <div className="p-5 rounded-3xl bg-[#f8f9fa] border border-neutral-200/60 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500 font-bold">
                  R2 Cloud Storage
                </span>
                <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900 font-mono">
                  Active
                </div>
                <span className="text-[11px] text-emerald-600 font-bold">
                  Zero Egress Fees
                </span>
              </div>
            </div>

          </div>

          {/* 4. CONTENT SECTIONS BASED ON ACTIVE TAB */}

          {/* TAB 1: OVERVIEW & CATEGORY ROWS (Matching Drivery List Style) */}
          {(activeMenu === 'overview' || activeMenu === 'categories') && (
            <div className="space-y-5">
              
              {/* Category Filter Pills & Add Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold text-neutral-900">
                    Category Carousel Items ({categories.length})
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search categories..."
                      className="pl-8 pr-3 py-2 text-xs bg-neutral-100 rounded-full border border-neutral-200/80 text-neutral-900 focus:outline-none focus:bg-white w-48 sm:w-60"
                    />
                  </div>

                  <button
                    onClick={openAddCategoryModal}
                    className="px-4 py-2 rounded-full bg-[#0d0f12] hover:bg-neutral-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Add New Category</span>
                  </button>
                </div>
              </div>

              {/* LIST ROWS (Exact Drivery Card List Style) */}
              <div className="space-y-2.5">
                {filteredCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-[#f8f9fa] hover:bg-[#f1f3f5] border border-neutral-200/60 transition-all flex items-center justify-between gap-4 group"
                  >
                    {/* Left: Chevron + Circular Image/Logo + Texts */}
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 transition-colors shrink-0" />
                      
                      {/* Category Logo/Thumbnail */}
                      <div className="relative w-12 h-12 rounded-xl bg-white p-1 border border-neutral-200 shadow-sm shrink-0 overflow-hidden">
                        <img
                          src={cat.image}
                          alt={cat.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>

                      {/* Text beside the logo: Name, Subtitle, Tag */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold text-neutral-900 truncate">
                            {cat.name}
                          </h4>
                          {cat.tag && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-900 text-white font-mono">
                              {cat.tag}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-500 truncate mt-0.5">
                          {cat.subtitle || 'Category Slider Item'}
                        </p>
                      </div>
                    </div>

                    {/* Middle Stats: Products Count */}
                    <div className="hidden sm:flex items-center gap-8 text-xs font-semibold text-neutral-600">
                      <div>
                        <span className="text-neutral-900 font-bold">
                          {products.filter(p => p.category.toLowerCase() === cat.id.toLowerCase() || p.category.toLowerCase() === cat.name.toLowerCase()).length}
                        </span>{' '}
                        products
                      </div>
                      <div className="font-mono text-neutral-500 text-[11px]">
                        ID: {cat.id}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => openEditCategoryModal(cat)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-200 border border-neutral-200 text-neutral-800 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-neutral-600" />
                        <span>Edit</span>
                      </button>

                      {categories.length > 1 && (
                        <button
                          onClick={() => onDeleteCategory(cat.id)}
                          className="p-2 rounded-xl bg-white hover:bg-rose-50 border border-neutral-200 text-neutral-400 hover:text-rose-600 transition-colors"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* TAB 2: PRODUCTS CATALOG (Drivery List Style) */}
          {activeMenu === 'products' && (
            <div className="space-y-5">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-extrabold text-neutral-900">
                    Product Drops & Catalog ({products.length})
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Manage prices, stocks, photography, and category tagging.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search products..."
                      className="pl-8 pr-3 py-2 text-xs bg-neutral-100 rounded-full border border-neutral-200 text-neutral-900 focus:outline-none focus:bg-white w-48 sm:w-60"
                    />
                  </div>

                  <button
                    onClick={openAddProductModal}
                    className="px-4 py-2 rounded-full bg-[#0d0f12] hover:bg-neutral-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Add New Product</span>
                  </button>
                </div>
              </div>

              {/* Product Rows */}
              <div className="space-y-2.5">
                {filteredProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-[#f8f9fa] hover:bg-[#f1f3f5] border border-neutral-200/60 transition-all flex items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 transition-colors shrink-0" />
                      
                      <div className="relative w-12 h-12 rounded-xl bg-white p-1 border border-neutral-200 shadow-sm shrink-0 overflow-hidden">
                        <img
                          src={prod.images[0]}
                          alt={prod.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain"
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold text-neutral-900 truncate">
                            {prod.title}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200 text-neutral-800">
                            {prod.category}
                          </span>
                          {prod.badge && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white">
                              {prod.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-500 truncate mt-0.5">
                          {prod.edition} • Season {prod.season}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 sm:gap-10 text-xs font-semibold">
                      <div className="text-right">
                        <div className="text-sm font-bold text-neutral-900">
                          {formatPrice(prod.price, currency)}
                        </div>
                        <span className="text-[11px] text-neutral-400 font-mono">
                          Stock: {prod.stockCount}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditProductModal(prod)}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-200 border border-neutral-200 text-neutral-800 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-neutral-600" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => onDeleteProduct(prod.id)}
                          className="p-2 rounded-xl bg-white hover:bg-rose-50 border border-neutral-200 text-neutral-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* TAB 3: BANNER STUDIO */}
          {activeMenu === 'banner' && (
            <div className="space-y-6">
              
              {/* Banner Live Preview */}
              <div className="relative w-full rounded-3xl overflow-hidden bg-[#8b0000] border border-neutral-200 shadow-xl">
                <div className="relative aspect-[21/9] sm:aspect-[2.6/1] w-full overflow-hidden">
                  <img
                    src={localSettings.heroBgImage || '/images/fragment_hero_banner_1787668127629.jpg'}
                    alt="Hero Banner Preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/40 pointer-events-none" />

                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                    <span className="text-[10vw] font-black tracking-widest text-red-600/30 blur-[1px] uppercase">
                      {localSettings.heroHeadline || 'FRAGMENT'}
                    </span>
                  </div>

                  <div className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 -rotate-90 origin-center pointer-events-none select-none">
                    <span className="text-[8px] sm:text-[10px] font-mono tracking-[0.25em] text-white/70 uppercase">
                      {localSettings.heroUrlText || 'WWW.ORIFAKE.COM'}
                    </span>
                  </div>

                  <div className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 rotate-90 origin-center pointer-events-none select-none">
                    <span className="text-[8px] sm:text-[9px] font-mono tracking-[0.2em] text-white/60">
                      {localSettings.heroTimestamps || '3.23 / 3.22 / 3.03 / 2.04'}
                    </span>
                  </div>

                  <div className="absolute bottom-4 sm:bottom-6 left-0 right-0 px-6 text-center text-white">
                    <h2 className="text-sm sm:text-lg font-bold tracking-[0.2em] uppercase text-white">
                      {localSettings.heroTag || 'FRAGMENT / 2025'}
                    </h2>
                    <p className="hidden sm:block text-[9px] font-sans tracking-wide text-white/75 max-w-2xl mx-auto mt-1 uppercase line-clamp-1">
                      {localSettings.heroSubtext}
                    </p>
                  </div>
                </div>
              </div>

              {/* Banner Editing Form */}
              <form onSubmit={handleSaveAllSettings} className="p-6 rounded-3xl bg-[#f8f9fa] border border-neutral-200/80 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      Banner Image (Upload or URL)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={localSettings.heroBgImage}
                        onChange={(e) => setLocalSettings({ ...localSettings, heroBgImage: e.target.value })}
                        className="flex-1 px-3 py-2 text-xs bg-white border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none font-mono"
                      />
                      <input
                        type="file"
                        ref={bannerFileInputRef}
                        onChange={handleBannerImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => bannerFileInputRef.current?.click()}
                        className="px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-white flex items-center gap-1 shrink-0"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload R2</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      Watermark Center Headline
                    </label>
                    <input
                      type="text"
                      value={localSettings.heroHeadline}
                      onChange={(e) => setLocalSettings({ ...localSettings, heroHeadline: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none uppercase font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      Bottom Tag
                    </label>
                    <input
                      type="text"
                      value={localSettings.heroTag}
                      onChange={(e) => setLocalSettings({ ...localSettings, heroTag: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none uppercase font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      Left Vertical Text
                    </label>
                    <input
                      type="text"
                      value={localSettings.heroUrlText}
                      onChange={(e) => setLocalSettings({ ...localSettings, heroUrlText: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none uppercase font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      Right Vertical Timestamps
                    </label>
                    <input
                      type="text"
                      value={localSettings.heroTimestamps}
                      onChange={(e) => setLocalSettings({ ...localSettings, heroTimestamps: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Editorial Fashion Subtext
                  </label>
                  <textarea
                    rows={2}
                    value={localSettings.heroSubtext}
                    onChange={(e) => setLocalSettings({ ...localSettings, heroSubtext: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none uppercase"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-full bg-[#e50914] hover:bg-[#cc0812] text-white font-bold text-xs shadow-md transition-all active:scale-95"
                  >
                    Save Banner Live
                  </button>
                  {settingsSavedToast && (
                    <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                      <Check className="w-4 h-4" /> Live store updated!
                    </span>
                  )}
                </div>
              </form>

            </div>
          )}

          {/* TAB 4: CMS TEXTS & HEADINGS (A to Z) */}
          {activeMenu === 'cms_texts' && (
            <div className="p-6 sm:p-8 rounded-3xl bg-[#f8f9fa] border border-neutral-200/80 space-y-6">
              <div>
                <h3 className="text-base font-extrabold text-neutral-900">
                  Storefront Content & Slogans (A to Z)
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Change every single word on the customer storefront.
                </p>
              </div>

              <form onSubmit={handleSaveAllSettings} className="space-y-4">
                
                {/* 1. Header Top-Left Logo / Mascot Emblem Customizer */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-neutral-900" />
                      <span>Store Header Logo / Mascot Emblem</span>
                    </label>
                    <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Live Storefront Top-Left
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-1">
                    {/* Live Visual Preview of Header Logo */}
                    <div className="w-16 h-16 rounded-2xl bg-neutral-100 border border-neutral-200 p-2 flex items-center justify-center shrink-0 shadow-inner">
                      {localSettings.headerLogoImage ? (
                        <img 
                          src={localSettings.headerLogoImage} 
                          alt="Custom Logo" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain rounded-lg"
                        />
                      ) : (
                        <svg 
                          viewBox="0 0 24 24" 
                          className="w-9 h-9 text-neutral-900" 
                          fill="currentColor"
                        >
                          <path d="M12 2C7.58 2 4 5.58 4 10c0 2.21.9 4.21 2.35 5.66L6 20h3l1-2h4l1 2h3l-.35-4.34C19.1 14.21 20 12.21 20 10c0-4.42-3.58-8-8-8zm-3 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm6 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm-3 5c-1.1 0-2-.4-2-1h4c0 .6-.9 1-2 1z" />
                          <circle cx="8" cy="18" r="1" />
                          <circle cx="16" cy="18" r="1" />
                          <path d="M7 21h10v1H7z" />
                        </svg>
                      )}
                    </div>

                    <div className="flex-1 w-full space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={localSettings.headerLogoImage || ''}
                          onChange={(e) => setLocalSettings({ ...localSettings, headerLogoImage: e.target.value })}
                          placeholder="Logo Image URL or upload directly..."
                          className="flex-1 px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none font-mono"
                        />
                        <input
                          type="file"
                          ref={headerLogoFileInputRef}
                          onChange={handleHeaderLogoUpload}
                          accept="image/*"
                          className="hidden"
                        />
                        <button
                          type="button"
                          disabled={isUploading}
                          onClick={() => headerLogoFileInputRef.current?.click()}
                          className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs font-bold text-white flex items-center gap-1.5 shrink-0 shadow-sm transition-all"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{isUploading ? 'Uploading...' : 'Upload Logo'}</span>
                        </button>
                        {localSettings.headerLogoImage && (
                          <button
                            type="button"
                            onClick={() => {
                              setLocalSettings({ ...localSettings, headerLogoImage: '' });
                              onUpdateSiteSettings({ headerLogoImage: '' });
                            }}
                            className="px-3 py-2 rounded-xl bg-neutral-200 hover:bg-neutral-300 text-xs font-bold text-neutral-800 shrink-0 transition-all"
                            title="Reset to default icon"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-500">
                        Upload custom SVG, PNG, or JPG logo to replace the top-left skull emblem on the storefront header.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Admin Gmail Address */}
                <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-sm space-y-2">
                  <label className="block text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-red-600" />
                    <span>Designated Admin Gmail Address</span>
                  </label>
                  <input
                    type="email"
                    value={localSettings.adminGmail || ''}
                    onChange={(e) => setLocalSettings({ ...localSettings, adminGmail: e.target.value })}
                    placeholder="sahidul010122@gmail.com"
                    className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none font-mono"
                  />
                  <p className="text-[11px] text-neutral-500">
                    Entering this Gmail in the sign-in modal opens the Admin Panel. All other emails stay as standard customer logins.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      Header Center Slogan (Top Line)
                    </label>
                    <input
                      type="text"
                      value={localSettings.headerSloganTop}
                      onChange={(e) => setLocalSettings({ ...localSettings, headerSloganTop: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none uppercase font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      Header Center Slogan (Bottom Line)
                    </label>
                    <input
                      type="text"
                      value={localSettings.headerSloganBottom}
                      onChange={(e) => setLocalSettings({ ...localSettings, headerSloganBottom: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none uppercase font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      Brand Name (Pill Badge)
                    </label>
                    <input
                      type="text"
                      value={localSettings.brandName}
                      onChange={(e) => setLocalSettings({ ...localSettings, brandName: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      Category Section Heading
                    </label>
                    <input
                      type="text"
                      value={localSettings.categoryHeading}
                      onChange={(e) => setLocalSettings({ ...localSettings, categoryHeading: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      Bestseller Section Heading
                    </label>
                    <input
                      type="text"
                      value={localSettings.bestsellerHeading}
                      onChange={(e) => setLocalSettings({ ...localSettings, bestsellerHeading: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      Footer Brand Tagline
                    </label>
                    <input
                      type="text"
                      value={localSettings.footerText}
                      onChange={(e) => setLocalSettings({ ...localSettings, footerText: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none uppercase font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-full bg-[#0d0f12] hover:bg-neutral-800 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                  >
                    Save All Texts & Slogans
                  </button>
                  {settingsSavedToast && (
                    <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                      <Check className="w-4 h-4" /> Live store updated!
                    </span>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* TAB 5: CLOUDFLARE R2 */}
          {activeMenu === 'r2_storage' && (
            <div className="p-6 sm:p-8 rounded-3xl bg-[#f8f9fa] border border-neutral-200/80 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-neutral-900 text-white">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-neutral-900">
                      Cloudflare R2 Bucket (MY_BUCKET)
                    </h3>
                    <p className="text-xs text-neutral-500">
                      Active Object Storage for all product pictures and category logos.
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                  ● Status: Active
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-sm">
                  <span className="text-xs text-neutral-400">R2 Binding Name</span>
                  <div className="text-sm font-mono font-bold text-neutral-900 mt-1">MY_BUCKET</div>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-sm">
                  <span className="text-xs text-neutral-400">Target Bucket</span>
                  <div className="text-sm font-mono font-bold text-neutral-900 mt-1">spidey-jersey-images</div>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-sm">
                  <span className="text-xs text-neutral-400">Egress Cost</span>
                  <div className="text-sm font-mono font-bold text-emerald-600 mt-1">$0.00 (Zero Egress)</div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Note inside Main Container */}
        <div className="pt-8 border-t border-neutral-200/80 flex items-center justify-between text-xs text-neutral-400">
          <span>ORIFAKE Master Management Engine</span>
          <span className="font-mono">v2.5 • Live Synchronized</span>
        </div>

      </main>

      {/* CATEGORY ADD/EDIT MODAL WITH LOGO UPLOAD & TEXT EDITING */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-neutral-200 shadow-2xl p-6 sm:p-7 space-y-4">
            
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-base font-extrabold text-neutral-900">
                {editingCatId ? 'Edit Category & Logo' : 'Add New Category'}
              </h3>
              <button
                onClick={() => setIsCatModalOpen(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. EDC Cases, MagSafe Wallets"
                  className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Subtitle / Description (Beside Logo)
                </label>
                <input
                  type="text"
                  value={catSubtitle}
                  onChange={(e) => setCatSubtitle(e.target.value)}
                  placeholder="e.g. Titanium & Carbon Fiber Drops"
                  className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Category Badge / Tag
                </label>
                <input
                  type="text"
                  value={catTag}
                  onChange={(e) => setCatTag(e.target.value)}
                  placeholder="e.g. Drop, New, Pro"
                  className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:bg-white font-mono"
                />
              </div>

              {/* Category Logo / Image Upload Section */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Category Logo / Image
                </label>
                
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-neutral-100 p-1 border border-neutral-200 overflow-hidden shrink-0">
                    <img
                      src={catImage || '/images/cat_edc_wallet_1787668177890.jpg'}
                      alt="Category Preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>

                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      ref={catFileInputRef}
                      onChange={handleCategoryImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => catFileInputRef.current?.click()}
                      className="w-full py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploading ? 'Uploading...' : 'Upload New Logo / Image'}</span>
                    </button>
                    <input
                      type="text"
                      value={catImage}
                      onChange={(e) => setCatImage(e.target.value)}
                      placeholder="Or paste image URL"
                      className="w-full px-3 py-1.5 text-[11px] bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-100 text-neutral-700 font-bold text-xs hover:bg-neutral-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0d0f12] text-white font-bold text-xs hover:bg-neutral-800 shadow-md"
                >
                  Save Category
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* PRODUCT ADD/EDIT MODAL */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-3xl border border-neutral-200 shadow-2xl p-6 sm:p-7 space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-base font-extrabold text-neutral-900">
                {editingProduct ? 'Edit Product Item' : 'Add New Product Drop'}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitProductForm} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Product Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Titanium EDC Case"
                    className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                    <option value="custom">+ Custom Category</option>
                  </select>
                  {formCategory === 'custom' && (
                    <input
                      type="text"
                      value={formCustomCategory}
                      onChange={(e) => setFormCustomCategory(e.target.value)}
                      placeholder="Category name"
                      className="w-full mt-2 px-3 py-1.5 text-xs bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Price ({CURRENCY_RATES[currency]?.symbol || '৳'} {currency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Original Price ({CURRENCY_RATES[currency]?.symbol || '৳'} Strikethrough)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formOriginalPrice}
                    onChange={(e) => setFormOriginalPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Edition / Subtitle
                  </label>
                  <input
                    type="text"
                    value={formEdition}
                    onChange={(e) => setFormEdition(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    value={formStockCount}
                    onChange={(e) => setFormStockCount(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Product Description
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900"
                />
              </div>

              {/* Photos Upload */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Product Photos
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleProductImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 rounded-xl bg-neutral-900 text-white font-bold text-xs flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload to Cloudflare R2</span>
                  </button>
                </div>

                <div className="flex gap-2 overflow-x-auto py-1">
                  {formImages.map((img, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-xl bg-neutral-100 p-1 border border-neutral-200 shrink-0">
                      <img src={img} alt="Thumb" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setFormImages(formImages.filter((_, i) => i !== idx))}
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px]"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-100 text-neutral-700 font-bold text-xs hover:bg-neutral-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#0d0f12] text-white font-bold text-xs hover:bg-neutral-800 shadow-md"
                >
                  {formSubmitting ? 'Saving...' : 'Save Product Drop'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
