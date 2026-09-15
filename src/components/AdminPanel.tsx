import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, Upload, Trash2, Edit3, Shield, Check, X, 
  RefreshCw, Layers, Database, Sparkles, Image as ImageIcon,
  DollarSign, Package, AlertCircle, ExternalLink, Copy, CheckCircle2,
  Sliders, Type, Layout, Tag, ShieldCheck, LogOut, ArrowLeft, Mail,
  ChevronRight, MoreVertical, Search, Settings, Home, Eye, Filter,
  TrendingUp, BarChart2, Folder, Globe, Compass, ArrowUpRight,
  PackageCheck, Truck, Download, UploadCloud, HardDrive, ScanLine,
  Menu, PanelLeftClose, PanelLeftOpen, ChevronLeft, Ruler, Boxes, Smartphone, Save, RotateCcw
} from 'lucide-react';
import { JerseyProduct, StoreStats } from '../types';
import { SiteSettings, CategoryItem } from '../types/settings';
import { CurrencyCode, formatPrice, CURRENCY_RATES } from '../utils/currency';
import { OrderProcessManager } from './admin/OrderProcessManager';
import { SteadfastApiSection } from './admin/SteadfastApiSection';
import { BarcodeScannerSection } from './admin/BarcodeScannerSection';
import { PlaceOrderInstallSection } from './admin/PlaceOrderInstallSection';
import { CategoryManager } from './CategoryManager';

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
  onSaveAllCategories?: (categories?: CategoryItem[]) => Promise<boolean>;
  onRefreshCategories?: () => Promise<void>;
  onResetCategories?: () => Promise<void>;
  onLogoutAdmin: () => void;
  onViewStorefront?: () => void;
  onOpenPwaModal?: () => void;
  deferredPrompt?: any;
  onPromptInstall?: () => void;
  isStandalone?: boolean;
  currency: CurrencyCode;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  products = [],
  categories = [],
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
  onSaveAllCategories,
  onRefreshCategories,
  onResetCategories,
  onLogoutAdmin,
  onViewStorefront,
  onOpenPwaModal,
  deferredPrompt,
  onPromptInstall,
  isStandalone,
  currency
}) => {
  // Active Sidebar Menu Tab
  const [activeMenu, setActiveMenu] = useState<
    'order_process' | 'barcode_scanner' | 'steadfast_api' | 'place_order_install' | 'overview' | 'categories' | 'products' | 'banner' | 'cms_texts' | 'r2_storage'
  >('order_process');

  // Mobile Collapsible Sidebar State (Default to closed on mobile for maximum workspace)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Admin Master Password & Auto-login state
  const [adminPinInput, setAdminPinInput] = useState<string>(() => {
    try {
      return localStorage.getItem('spidey_admin_pin') || siteSettings?.adminPassword || 'Spidey#Admin@2026';
    } catch {
      return siteSettings?.adminPassword || 'Spidey#Admin@2026';
    }
  });
  const [autoLoginEnabled, setAutoLoginEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('spidey_auto_login') === 'true';
    } catch {
      return true;
    }
  });
  const [pinSavedToast, setPinSavedToast] = useState(false);

  const handleSavePinSettings = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newPassword = adminPinInput.trim() || 'Spidey#Admin@2026';
      localStorage.setItem('spidey_admin_pin', newPassword);
      if (autoLoginEnabled) {
        localStorage.setItem('spidey_auto_login', 'true');
        localStorage.setItem('spidey_admin_auth', 'true');
      } else {
        localStorage.removeItem('spidey_auto_login');
      }
      // Also update site settings if onUpdateSiteSettings is available
      if (onUpdateSiteSettings) {
        onUpdateSiteSettings({
          ...localSettings,
          adminPassword: newPassword
        });
      }
      setPinSavedToast(true);
      setTimeout(() => setPinSavedToast(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectMenu = (menu: 'order_process' | 'barcode_scanner' | 'steadfast_api' | 'place_order_install' | 'overview' | 'categories' | 'products' | 'banner' | 'cms_texts' | 'r2_storage') => {
    setActiveMenu(menu);
    // Auto-collapse sidebar on mobile after selecting a menu
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

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
  const [isSavingAllCats, setIsSavingAllCats] = useState(false);
  const [isRefreshingCats, setIsRefreshingCats] = useState(false);
  const [catsSavedToast, setCatsSavedToast] = useState(false);

  // Editable Site Settings State (Local copy for live typing)
  const [localSettings, setLocalSettings] = useState<SiteSettings>(siteSettings);
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);

  useEffect(() => {
    setLocalSettings(siteSettings);
  }, [siteSettings]);

  // Product Form Fields
  const [formCode, setFormCode] = useState('');
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
  const [formSizes, setFormSizes] = useState<string[]>(['S', 'M', 'L', 'XL', 'XXL', '3XL']);
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
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  // Backup & Persistent Sync states
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [isImportingBackup, setIsImportingBackup] = useState(false);
  const [isForceSyncing, setIsForceSyncing] = useState(false);
  const [syncStatusNote, setSyncStatusNote] = useState<string | null>(null);

  // Permanent Product Deletion Dialog State
  const [productPendingDelete, setProductPendingDelete] = useState<JerseyProduct | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);

  // Permanent Category Deletion Dialog State
  const [categoryPendingDelete, setCategoryPendingDelete] = useState<CategoryItem | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [isSavingCat, setIsSavingCat] = useState(false);

  // Search in Admin
  const [searchQuery, setSearchQuery] = useState('');

  // Random Code Generator helper (e.g. SJ-ABCDE)
  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let rand = '';
    for (let i = 0; i < 5; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `SJ-${rand}`;
  };

  // Open Form for Adding New Product
  const openAddProductModal = () => {
    setEditingProduct(null);
    setFormCode(generateRandomCode());
    setFormTitle('');
    setFormCategory(categories[0]?.id || 'EDC');
    setFormCustomCategory('');
    setFormPrice('129.99');
    setFormOriginalPrice('159.99');
    setFormSeason('2025');
    setFormEdition('Pro Edition / Titanium');
    setFormBadge('New Drop');
    setFormDescription('Authentic club matchwear jersey with moisture-wicking Dri-FIT fabric and heat-pressed club crest.');
    setFormStockCount('20');
    setFormInStock(true);
    setFormSizes(['S', 'M', 'L', 'XL', 'XXL', '3XL']);
    setFormImages(['/images/prod_pixel_case_1787668274006.jpg']);
    setFormFeatures([
      'Moisture-wicking breathable ventilation matrix',
      'Authentic heat-pressed club emblem',
      'Athletic ergonomic seam construction'
    ]);
    setIsProductModalOpen(true);
  };

  // Open Form for Editing Existing Product
  const openEditProductModal = (prod: JerseyProduct) => {
    setEditingProduct(prod);
    setFormCode(prod.code || generateRandomCode());
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
    setFormSizes(Array.isArray(prod.sizes) && prod.sizes.length > 0 ? [...prod.sizes] : ['S', 'M', 'L', 'XL', 'XXL', '3XL']);
    setFormImages(prod.images.length > 0 ? [...prod.images] : []);
    setFormFeatures(prod.features.length > 0 ? [...prod.features] : []);
    setIsProductModalOpen(true);
  };

  // Club & Brand Presets for 1-Click Category Creation
  const CLUB_PRESETS = [
    {
      name: 'Real Madrid',
      subtitle: '24/25 Champions',
      tag: 'La Liga',
      image: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Real_Madrid_CF.svg/300px-Real_Madrid_CF.svg.png'
    },
    {
      name: 'FC Barcelona',
      subtitle: 'Blaugrana Pride',
      tag: 'La Liga',
      image: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/47/FC_Barcelona_%28crest%29.svg/300px-FC_Barcelona_%28crest%29.svg.png'
    },
    {
      name: 'Manchester United',
      subtitle: 'Red Devils',
      tag: 'Premier League',
      image: 'https://upload.wikimedia.org/wikipedia/en/thumb/7/7a/Manchester_United_FC_crest.svg/300px-Manchester_United_FC_crest.svg.png'
    },
    {
      name: 'Arsenal',
      subtitle: 'Gunners Edition',
      tag: 'Premier League',
      image: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/53/Arsenal_FC.svg/300px-Arsenal_FC.svg.png'
    },
    {
      name: 'Manchester City',
      subtitle: 'Sky Blue Dynasty',
      tag: 'Premier League',
      image: 'https://upload.wikimedia.org/wikipedia/en/thumb/e/eb/Manchester_City_FC_badge.svg/300px-Manchester_City_FC_badge.svg.png'
    },
    {
      name: 'Liverpool',
      subtitle: 'Anfield Legends',
      tag: 'Premier League',
      image: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/0c/Liverpool_FC.svg/300px-Liverpool_FC.svg.png'
    },
    {
      name: 'Chelsea',
      subtitle: 'The Blues',
      tag: 'Premier League',
      image: 'https://upload.wikimedia.org/wikipedia/en/thumb/c/cc/Chelsea_FC.svg/300px-Chelsea_FC.svg.png'
    },
    {
      name: 'Bayern Munich',
      subtitle: 'Mia San Mia',
      tag: 'Bundesliga',
      image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg/300px-FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg.png'
    },
    {
      name: 'Argentina',
      subtitle: '3-Star World Champions',
      tag: 'National',
      image: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a2/Argentine_Football_Association_logo.svg/300px-Argentine_Football_Association_logo.svg.png'
    },
    {
      name: 'Brazil',
      subtitle: 'Pentacampeão',
      tag: 'National',
      image: 'https://upload.wikimedia.org/wikipedia/en/thumb/9/99/Brazilian_Football_Confederation_logo.svg/300px-Brazilian_Football_Confederation_logo.svg.png'
    }
  ];

  // Open Category Modal
  const openAddCategoryModal = () => {
    setEditingCatId(null);
    setCatName('');
    setCatSubtitle('');
    setCatImage('https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Real_Madrid_CF.svg/300px-Real_Madrid_CF.svg.png');
    setCatTag('Drop');
    setIsCatModalOpen(true);
  };

  const openEditCategoryModal = (cat: CategoryItem) => {
    setEditingCatId(cat.id);
    setCatName(cat.name);
    setCatSubtitle(cat.subtitle || '');
    setCatImage(cat.image || 'https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Real_Madrid_CF.svg/300px-Real_Madrid_CF.svg.png');
    setCatTag(cat.tag || '');
    setIsCatModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim() || isSavingCat || isUploading) return;

    setIsSavingCat(true);
    try {
      if (editingCatId) {
        await onUpdateCategory(editingCatId, {
          name: catName.trim(),
          subtitle: catSubtitle.trim(),
          image: catImage.trim() || 'https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Real_Madrid_CF.svg/300px-Real_Madrid_CF.svg.png',
          tag: catTag.trim()
        });
      } else {
        const slug = catName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const newId = slug || `cat-${Date.now().toString(36)}`;
        await onAddCategory({
          id: newId,
          name: catName.trim(),
          subtitle: catSubtitle.trim(),
          image: catImage.trim() || 'https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Real_Madrid_CF.svg/300px-Real_Madrid_CF.svg.png',
          tag: catTag.trim() || 'Category'
        });
      }
      setIsCatModalOpen(false);
    } catch (err) {
      console.error('Failed to save category:', err);
    } finally {
      setIsSavingCat(false);
    }
  };

  const handleSaveAllCategoriesDirectly = async () => {
    if (!onSaveAllCategories) return;
    setIsSavingAllCats(true);
    try {
      const ok = await onSaveAllCategories(categories);
      if (ok) {
        setCatsSavedToast(true);
        setTimeout(() => setCatsSavedToast(false), 3000);
      }
    } finally {
      setIsSavingAllCats(false);
    }
  };

  const handleRefreshCategoriesDirectly = async () => {
    if (!onRefreshCategories) return;
    setIsRefreshingCats(true);
    try {
      await onRefreshCategories();
    } finally {
      setIsRefreshingCats(false);
    }
  };

  const [isResettingCats, setIsResettingCats] = useState(false);
  const handleResetCategoriesDirectly = async () => {
    if (!onResetCategories) return;
    if (!window.confirm('সকল ক্যাটাগরি ডিফল্ট প্রিসেটে রিস্টোর করবেন? সব টেস্ট বা অপ্রয়োজনীয় ক্যাটাগরি মুছে অফিসিয়াল ফুটবল ও স্টোর ক্যাটাগরি সেট হবে।')) return;
    setIsResettingCats(true);
    try {
      await onResetCategories();
    } finally {
      setIsResettingCats(false);
    }
  };

  // Client-side image compression helper to avoid quota issues and network bottlenecks
  const compressImageFile = async (
    file: File,
    maxDim = 1200,
    quality = 0.85
  ): Promise<{ base64Data: string; mime: string }> => {
    return new Promise((resolve) => {
      // If SVG or very small, return as is
      if (file.type === 'image/svg+xml' || file.size < 80 * 1024) {
        const reader = new FileReader();
        reader.onload = () => resolve({ base64Data: reader.result as string, mime: file.type || 'image/jpeg' });
        reader.onerror = () => resolve({ base64Data: '', mime: 'image/jpeg' });
        reader.readAsDataURL(file);
        return;
      }

      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const reader = new FileReader();
          reader.onload = () => resolve({ base64Data: reader.result as string, mime: file.type || 'image/jpeg' });
          reader.readAsDataURL(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const outputMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const compressedData = canvas.toDataURL(outputMime, quality);
        resolve({ base64Data: compressedData, mime: outputMime });
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        const reader = new FileReader();
        reader.onload = () => resolve({ base64Data: reader.result as string, mime: file.type || 'image/jpeg' });
        reader.readAsDataURL(file);
      };
      img.src = objectUrl;
    });
  };

  // File Upload Helper to R2 / Disk
  const uploadFileToR2 = async (file: File): Promise<string | null> => {
    try {
      const { base64Data, mime } = await compressImageFile(file, 1200, 0.85);
      if (!base64Data) return null;

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: mime,
          base64Data
        })
      });
      const result = await res.json();
      if (result.success) {
        return result.staticUrl || result.url || base64Data;
      }
      return base64Data;
    } catch (err) {
      console.warn('Upload fallback to compressed base64:', err);
      try {
        const { base64Data } = await compressImageFile(file, 800, 0.75);
        return base64Data || null;
      } catch {
        return null;
      }
    }
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
    try {
      const tempUrl = URL.createObjectURL(file);
      setCatImage(tempUrl);
    } catch {}
    setIsUploading(true);
    try {
      const url = await uploadFileToR2(file);
      if (url) setCatImage(url);
    } catch (err) {
      console.warn('Category image upload failed:', err);
    } finally {
      setIsUploading(false);
    }
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
      code: formCode.trim() || generateRandomCode(),
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
      features: formFeatures.length > 0 ? formFeatures : ['Moisture-wicking breathable ventilation matrix'],
      sizes: formSizes.length > 0 ? formSizes : ['S', 'M', 'L', 'XL', 'XXL', '3XL']
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

  // 1-Click Export Full Backup JSON
  const handleExportFullBackup = async () => {
    setIsExportingBackup(true);
    setSyncStatusNote(null);
    try {
      const res = await fetch('/api/sync/backup');
      const data = await res.json();
      if (data.success && data.backup) {
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data.backup, null, 2))}`;
        const downloadAnchor = document.createElement('a');
        const dateStr = new Date().toISOString().split('T')[0];
        downloadAnchor.setAttribute('href', jsonString);
        downloadAnchor.setAttribute('download', `spidey_full_backup_${dateStr}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        setSyncStatusNote('✓ Full store backup file downloaded successfully!');
      } else {
        setSyncStatusNote('✕ Failed to generate backup file.');
      }
    } catch (err: any) {
      setSyncStatusNote(`✕ Backup export error: ${err.message || 'Network error'}`);
    } finally {
      setIsExportingBackup(false);
      setTimeout(() => setSyncStatusNote(null), 5000);
    }
  };

  // 1-Click Import / Restore Backup JSON
  const handleImportFullBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingBackup(true);
    setSyncStatusNote(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const backupData = JSON.parse(content);

        const res = await fetch('/api/sync/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ backup: backupData })
        });
        const result = await res.json();

        if (result.success) {
          setSyncStatusNote('✓ Catalog & media restored successfully! Refreshing view...');
          setTimeout(() => {
            window.location.reload();
          }, 1200);
        } else {
          setSyncStatusNote(`✕ Restore failed: ${result.message || 'Invalid format'}`);
        }
      } catch (err: any) {
        setSyncStatusNote(`✕ Invalid JSON backup file: ${err.message || 'Could not parse'}`);
      } finally {
        setIsImportingBackup(false);
      }
    };
    reader.readAsText(file);
  };

  // Force Push All Live Data to Server Persistent Disk
  const handleForceSyncAll = async () => {
    setIsForceSyncing(true);
    setSyncStatusNote(null);
    try {
      const res = await fetch('/api/sync/rehydrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientProducts: products,
          clientCategories: categories,
          clientSettings: localSettings
        })
      });
      const data = await res.json();
      if (data.success) {
        setSyncStatusNote('✓ Live products, banners & categories synchronized to server disk!');
      } else {
        setSyncStatusNote('✕ Server synchronization issue.');
      }
    } catch (err: any) {
      setSyncStatusNote(`✕ Sync error: ${err.message || 'Network error'}`);
    } finally {
      setIsForceSyncing(false);
      setTimeout(() => setSyncStatusNote(null), 5000);
    }
  };

  // Filter Categories
  const safeCategories = Array.isArray(categories) ? categories : [];
  const filteredCategories = safeCategories.filter((c) => {
    if (!searchQuery.trim()) return true;
    return (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.subtitle && c.subtitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.tag && c.tag.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  // Filter Products
  const safeProducts = Array.isArray(products) ? products : [];
  const filteredProducts = safeProducts.filter((p) => {
    if (!searchQuery.trim()) return true;
    return (p.title && p.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.edition && p.edition.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const totalInventoryValue = safeProducts.reduce((acc, p) => acc + (p.price || 0) * (p.stockCount || 0), 0);

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-neutral-900 flex flex-col lg:flex-row p-2 sm:p-4 lg:p-6 gap-4 sm:gap-5 font-sans relative">
      
      {/* MOBILE BACKDROP OVERLAY (When sidebar is opened on mobile/tablet) */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300 animate-fadeIn"
          aria-hidden="true"
        />
      )}

      {/* FLOATING MINI SIDEBAR TOGGLE ON MOBILE (When sidebar is collapsed) */}
      <button
        type="button"
        onClick={() => setIsSidebarOpen(true)}
        className={`lg:hidden fixed bottom-6 left-5 z-30 p-3 rounded-full bg-[#0d0f12] text-white shadow-2xl border border-white/20 flex items-center gap-2.5 transition-all active:scale-95 ${
          isSidebarOpen ? 'hidden' : 'flex'
        }`}
        title="Open Admin Menu"
      >
        <div className="w-6 h-6 rounded-full bg-[#e50914] flex items-center justify-center text-white font-mono font-black text-xs">
          S
        </div>
        <span className="text-xs font-extrabold pr-1">Menu</span>
      </button>

      {/* 1. DARK ROUNDED FLOATING SIDEBAR (Collapsible Drawer on Mobile, Fixed on Desktop) */}
      <aside 
        className={`
          bg-[#0d0f12] text-white rounded-3xl p-5 flex flex-col justify-between shrink-0 shadow-2xl border border-white/5 select-none transition-all duration-300 ease-in-out
          fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto w-72 sm:w-80 lg:w-64 xl:w-72 max-h-screen lg:max-h-none overflow-y-auto
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 hidden lg:flex'}
        `}
      >
        <div className="space-y-6">
          {/* Top Brand Logo & Mobile Collapse Button */}
          <div className="flex items-center justify-between px-1 pt-1">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-[#e50914] flex items-center justify-center shadow-lg shadow-red-600/30">
                <span className="font-mono font-black text-white text-base tracking-tighter">S</span>
              </div>
              <div>
                <span className="text-base font-extrabold tracking-tight font-sans text-white block capitalize">
                  {localSettings.brandName || 'Spidey'}
                </span>
                <span className="text-[10px] text-neutral-400 font-mono tracking-wider uppercase block">
                  Control Center
                </span>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-2 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-all"
              title="Close Menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Nav Items Group */}
          <nav className="space-y-1.5">
            
            {/* 1. Order Process & Management (Top of Sidebar) */}
            <button
              onClick={() => handleSelectMenu('order_process')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                activeMenu === 'order_process'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 font-extrabold'
                  : 'text-neutral-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <PackageCheck className="w-4 h-4 text-white" />
                <span className="font-extrabold tracking-tight">Order Process</span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                activeMenu === 'order_process' ? 'bg-white text-rose-900 font-black' : 'bg-rose-500/20 text-rose-300 font-bold'
              }`}>
                Auto
              </span>
            </button>

            {/* 2. Barcode Scanner & Warehouse Stock Dispatch */}
            <button
              onClick={() => handleSelectMenu('barcode_scanner')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                activeMenu === 'barcode_scanner'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 font-extrabold'
                  : 'text-neutral-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <ScanLine className="w-4 h-4 text-rose-400" />
                <span className="font-extrabold tracking-tight">Barcode Scanner</span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                activeMenu === 'barcode_scanner' ? 'bg-white text-rose-900 font-black' : 'bg-rose-500/20 text-rose-300 font-bold'
              }`}>
                Live Match
              </span>
            </button>

            {/* 4. Steadfast Courier API Configuration (Dedicated Sidebar Section) */}
            <button
              onClick={() => handleSelectMenu('steadfast_api')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                activeMenu === 'steadfast_api'
                  ? 'bg-white text-neutral-950 shadow-lg shadow-white/10 font-extrabold'
                  : 'text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <Truck className="w-4 h-4 text-rose-500" />
                <span>Steadfast API</span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                activeMenu === 'steadfast_api' ? 'bg-neutral-900 text-white font-bold' : 'bg-rose-500/20 text-rose-300'
              }`}>
                Auto Sync
              </span>
            </button>

            {/* 5. Place Order Install & Shortcut Link (Dedicated Admin Menu) */}
            <button
              onClick={() => handleSelectMenu('place_order_install')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                activeMenu === 'place_order_install'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 font-extrabold'
                  : 'text-neutral-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <Smartphone className="w-4 h-4 text-rose-400" />
                <span className="font-extrabold tracking-tight">Place Order Install</span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                activeMenu === 'place_order_install' ? 'bg-white text-rose-900 font-black' : 'bg-rose-500/20 text-rose-300 font-bold'
              }`}>
                PWA Link
              </span>
            </button>

            {/* Overview / Reports */}
            <button
              onClick={() => handleSelectMenu('overview')}
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
              onClick={() => handleSelectMenu('categories')}
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
              onClick={() => handleSelectMenu('products')}
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
              onClick={() => handleSelectMenu('banner')}
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
              onClick={() => handleSelectMenu('cms_texts')}
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

            {/* Cloud Media Storage */}
            <button
              onClick={() => handleSelectMenu('r2_storage')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                activeMenu === 'r2_storage'
                  ? 'bg-white text-neutral-950 shadow-lg shadow-white/10 font-extrabold'
                  : 'text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <Database className="w-4 h-4" />
                <span>Cloud Media Storage</span>
              </div>
              <span className={`w-2 h-2 rounded-full ${
                activeMenu === 'r2_storage' ? 'bg-emerald-600' : 'bg-emerald-400'
              }`} />
            </button>

          </nav>
        </div>

        {/* Bottom Sidebar Actions */}
        <div className="pt-6 border-t border-white/10 space-y-2">
          {/* PWA / Web App Install Button */}
          {onOpenPwaModal && (
            <button
              onClick={onOpenPwaModal}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-950/40 transition-all active:scale-95"
            >
              <div className="flex items-center gap-2.5">
                <Download className="w-4 h-4 text-emerald-200" />
                <span>Install Web App</span>
              </div>
              <span className="text-[10px] font-mono bg-white/20 px-2 py-0.5 rounded-full font-bold">
                PWA
              </span>
            </button>
          )}

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
      <main className="flex-1 bg-white rounded-3xl p-4 sm:p-6 lg:p-10 shadow-sm border border-neutral-200/80 overflow-y-auto flex flex-col justify-between min-w-0">
        
        <div className="space-y-6 sm:space-y-8">
          
          {/* Top Title Bar & Time Selector with Mobile Menu Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              {/* Mobile Sidebar Hamburger Toggle Button */}
              <button
                type="button"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2.5 rounded-2xl bg-neutral-900 text-white hover:bg-black transition-all shrink-0 mt-0.5 shadow-md flex items-center justify-center"
                title="Toggle Menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-neutral-900 tracking-tight">
                  {activeMenu === 'order_process' && 'Order Process & Management System'}
                  {activeMenu === 'barcode_scanner' && 'Barcode Scanner & Auto-Matching System'}
                  {activeMenu === 'steadfast_api' && 'Steadfast Courier API Settings & Credentials'}
                  {activeMenu === 'place_order_install' && 'Place Order Shortcut & PWA Install'}
                  {activeMenu === 'overview' && 'Storefront Reports & Analytics'}
                  {activeMenu === 'categories' && 'Category Carousel & Logos Manager'}
                  {activeMenu === 'products' && 'Product Catalog & Inventory'}
                  {activeMenu === 'banner' && 'Hero FRAGMENT Banner Studio'}
                  {activeMenu === 'cms_texts' && 'Site Headings, Texts & Slogans (A to Z)'}
                  {activeMenu === 'r2_storage' && 'Cloud Storage & Media Assets'}
                </h1>
                <p className="text-xs text-neutral-500 mt-1 font-medium line-clamp-2">
                  {activeMenu === 'order_process' && 'Intelligent WhatsApp bulk order extraction, Steadfast Courier API dispatch, and 3-inch/A4 compact invoice printing.'}
                  {activeMenu === 'barcode_scanner' && 'Continuous live camera scanning, automatic parcel barcode matching, instant status updates, and permanent database storage.'}
                  {activeMenu === 'steadfast_api' && 'Configure and permanently save your Steadfast Courier Merchant API credentials for automated one-click order dispatching.'}
                  {activeMenu === 'place_order_install' && 'ডেডিকেটেড লিঙ্ক ও PWA শর্টকাট ইনস্টল করুন যাতে স্টাফ বা এজেন্টরা দ্রুত সরাসরি প্লেস অর্ডার করতে পারে।'}
                  {activeMenu !== 'order_process' && activeMenu !== 'barcode_scanner' && activeMenu !== 'steadfast_api' && activeMenu !== 'place_order_install' && 'Live CMS manager. Every text, logo, photo, and title updates the public storefront immediately.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
              {/* Install PWA Button */}
              {onOpenPwaModal && (
                <button
                  type="button"
                  onClick={onOpenPwaModal}
                  className="px-3.5 py-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                  title="Install Web App on Mobile or Desktop"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Install App</span>
                </button>
              )}

              <button
                onClick={onViewStorefront || onLogoutAdmin}
                className="px-3.5 py-2 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold flex items-center gap-2 transition-all"
                title="View live customer storefront"
              >
                <Eye className="w-3.5 h-3.5 text-neutral-600" />
                <span className="hidden sm:inline">View Public Store</span>
                <span className="sm:hidden">Store</span>
              </button>

              <div className="px-3 py-1.5 rounded-2xl bg-neutral-100 text-neutral-700 text-xs font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="hidden sm:inline">Live Synchronized</span>
                <span className="sm:hidden">Live</span>
              </div>
            </div>
          </div>

          {/* TAB 0: ORDER PROCESS & MANAGEMENT WORKSPACE */}
          {activeMenu === 'order_process' && (
            <OrderProcessManager 
              products={products}
              siteSettings={localSettings}
              onRefreshStats={onResetCatalog}
              onNavigateToSteadfastApi={() => setActiveMenu('steadfast_api')}
              onNavigateToBarcodeScanner={() => setActiveMenu('barcode_scanner')}
            />
          )}

          {/* TAB: BARCODE SCANNER & CONTINUOUS AUTO-MATCHING */}
          {activeMenu === 'barcode_scanner' && (
            <BarcodeScannerSection 
              products={products}
              siteSettings={localSettings}
              currency={currency}
              onUpdateProduct={onUpdateProduct}
              onGoToOrderProcess={() => setActiveMenu('order_process')}
              onGoToSteadfastApi={() => setActiveMenu('steadfast_api')}
            />
          )}

          {/* TAB: STEADFAST COURIER API CONFIGURATION */}
          {activeMenu === 'steadfast_api' && (
            <SteadfastApiSection 
              onGoToOrderProcess={() => setActiveMenu('order_process')}
            />
          )}

          {/* TAB: PLACE ORDER PWA SHORTCUT & DEDICATED LINK */}
          {activeMenu === 'place_order_install' && (
            <PlaceOrderInstallSection 
              deferredPrompt={deferredPrompt}
              onPromptInstall={onPromptInstall}
            />
          )}

          {/* 3. FOUR METRIC SUMMARY CARDS (Shown on other tabs) */}
          {activeMenu !== 'order_process' && activeMenu !== 'barcode_scanner' && activeMenu !== 'steadfast_api' && activeMenu !== 'place_order_install' && (
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
                  Instant photo upload
                </span>
              </div>
            </div>

            {/* Card 4: Clean White Card (Cloud Storage) */}
            <div className="p-5 rounded-3xl bg-[#f8f9fa] border border-neutral-200/60 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500 font-bold">
                  Cloud Media Storage
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
                  Synchronized & Fast
                </span>
              </div>
            </div>

          </div>
          )}

          {/* 4. CONTENT SECTIONS BASED ON ACTIVE TAB */}

          {/* TAB 1: CATEGORIES & SLIDER SHOWCASE SECTION ("Category ঘর") */}
          {(activeMenu === 'overview' || activeMenu === 'categories') && (
            <CategoryManager
              categories={categories}
              products={products}
              onAddCategory={async (cat) => onAddCategory(cat)}
              onUpdateCategory={async (id, updates) => onUpdateCategory(id, updates)}
              onDeleteCategory={async (id) => onDeleteCategory(id)}
              onRefreshCategories={onRefreshCategories}
            />
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
                          src={prod.images?.[0] || 'https://images.unsplash.com/photo-1577212017184-80cc0da11082?auto=format&fit=crop&w=200&q=80'}
                          alt={prod.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain"
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {prod.code && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-neutral-900 text-rose-400 border border-neutral-800">
                              {prod.code}
                            </span>
                          )}
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
                          onClick={() => setProductPendingDelete(prod)}
                          className="p-2 rounded-xl bg-white hover:bg-rose-50 border border-neutral-200 text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Permanently Delete Product"
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
                      {localSettings.heroUrlText || 'WWW.SPIDEY.COM'}
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
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm space-y-2">
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

                {/* Admin Master Password, PIN & PWA Auto-Login Security */}
                <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#0f1218] to-[#1a1f2c] border border-neutral-800 text-white space-y-4 shadow-md">
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center border border-red-500/30">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          অ্যাডমিন পাসওয়ার্ড ও PWA অটো-লগইন সিকিউরিটি
                        </h4>
                        <p className="text-[11px] text-neutral-400">
                          ইনস্টল করা অ্যাপে ক্লিক করলে সরাসরি অ্যাডমিন প্যানেলে প্রবেশ করবে এবং বারবার লগইন করার প্রয়োজন হবে না।
                        </p>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Direct PWA Shortcut Ready
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-neutral-300 mb-1">
                        Admin Secret Password (পাসওয়ার্ড পরিবর্তন)
                      </label>
                      <input
                        type="text"
                        value={adminPinInput}
                        onChange={(e) => setAdminPinInput(e.target.value)}
                        placeholder="সিক্রেট পাসওয়ার্ড লিখুন"
                        className="w-full px-3.5 py-2.5 text-xs bg-neutral-900 border border-white/15 rounded-xl text-white font-mono tracking-wider focus:outline-none focus:border-red-500"
                      />
                      <span className="text-[10px] text-neutral-400 mt-1 block">
                        নিরাপদ আলফানিউমেরিক বা স্ট্রং পাসওয়ার্ড ব্যবহার করুন।
                      </span>
                    </div>

                    <div className="flex flex-col justify-between">
                      <label className="block text-xs font-bold text-neutral-300 mb-1">
                        Auto-Login on This Device
                      </label>
                      <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-all select-none">
                        <input
                          type="checkbox"
                          checked={autoLoginEnabled}
                          onChange={(e) => setAutoLoginEnabled(e.target.checked)}
                          className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-neutral-700 bg-neutral-900"
                        />
                        <span className="text-xs font-semibold text-neutral-200">
                          এই ডিভাইসে প্রতিবার পাসওয়ার্ড ছাড়া সরাসরি ওপেন হবে
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleSavePinSettings}
                      className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-2"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>পাসওয়ার্ড ও অটো-লগইন সেটিংস সেভ করুন</span>
                    </button>

                    {pinSavedToast && (
                      <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 animate-fadeIn">
                        <CheckCircle2 className="w-4 h-4" /> সেটিংস সফলভাবে আপডেট ও সেভ হয়েছে!
                      </span>
                    )}

                    {onOpenPwaModal && (
                      <button
                        type="button"
                        onClick={onOpenPwaModal}
                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all flex items-center gap-2"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-400" />
                        <span>অ্যাপ ইনস্টল নির্দেশিকা খুলুন</span>
                      </button>
                    )}
                  </div>
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

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      WhatsApp Order Number (হোয়াটসঅ্যাপ নম্বর)
                    </label>
                    <input
                      type="text"
                      placeholder="+8801715123766"
                      value={localSettings.whatsappNumber || ''}
                      onChange={(e) => setLocalSettings({ ...localSettings, whatsappNumber: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none font-bold"
                    />
                    <p className="text-[10px] text-neutral-500 mt-1">
                      মোবাইলে বা পপআপে "অর্ডার করুন (WhatsApp)" চাপলে এই নম্বরে অটোমেটিক প্রোডাক্ট নাম, সাইজ ও লিঙ্ক সহ মেসেজ চলে যাবে।
                    </p>
                  </div>
                </div>

                {/* 5. DYNAMIC PRODUCT SIZE GUIDE CONTROL (ADMIN ON/OFF & MEASUREMENTS EDITOR) */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-neutral-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20">
                        <Ruler className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-neutral-900 flex items-center gap-2">
                          <span>প্রোডাক্ট সাইজ গাইড কন্ট্রোল (Size Guide Settings)</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            localSettings.enableSizeGuide !== false 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                              : 'bg-neutral-100 text-neutral-500 border border-neutral-200'
                          }`}>
                            {localSettings.enableSizeGuide !== false ? 'Active' : 'Disabled'}
                          </span>
                        </h4>
                        <p className="text-[11px] text-neutral-500">
                          প্রোডাক্ট ডিটেইলস পেজের সাইজ চার্ট অন/অফ করুন এবং সাইজের মাপ (Chest & Length) এডিট করুন।
                        </p>
                      </div>
                    </div>

                    {/* Enable / Disable 1-Click Toggle */}
                    <button
                      type="button"
                      onClick={() => setLocalSettings({
                        ...localSettings,
                        enableSizeGuide: localSettings.enableSizeGuide === false ? true : false
                      })}
                      className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                        localSettings.enableSizeGuide !== false
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                          : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-800'
                      }`}
                    >
                      <Check className={`w-3.5 h-3.5 ${localSettings.enableSizeGuide !== false ? 'opacity-100' : 'opacity-0'}`} />
                      <span>{localSettings.enableSizeGuide !== false ? 'সাইজ গাইড চালু আছে (ON)' : 'সাইজ গাইড বন্ধ (OFF)'}</span>
                    </button>
                  </div>

                  {localSettings.enableSizeGuide !== false && (
                    <div className="space-y-3 pt-1">
                      <div>
                        <label className="block text-xs font-bold text-neutral-700 mb-1">
                          Fit / Quality Subtitle Note (ফিটিং নির্দেশিকা)
                        </label>
                        <input
                          type="text"
                          value={localSettings.sizeGuideNote || ''}
                          onChange={(e) => setLocalSettings({ ...localSettings, sizeGuideNote: e.target.value })}
                          placeholder="Standard Thai Fit"
                          className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none font-medium"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-bold text-neutral-700">
                            সাইজ মেজারমেন্ট চার্ট (Size Chart Data):
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const currentList = localSettings.sizeGuideMeasurements && localSettings.sizeGuideMeasurements.length > 0
                                ? [...localSettings.sizeGuideMeasurements]
                                : [
                                    { size: 'S', chest: '36 - 38"', length: '27"' },
                                    { size: 'M', chest: '38 - 40"', length: '28"' },
                                    { size: 'L', chest: '40 - 42"', length: '29"' },
                                    { size: 'XL', chest: '42 - 44"', length: '30"' },
                                    { size: 'XXL', chest: '44 - 46"', length: '31"' },
                                    { size: '3XL', chest: '46 - 48"', length: '32"' },
                                  ];
                              currentList.push({ size: '4XL', chest: '48 - 50"', length: '33"' });
                              setLocalSettings({ ...localSettings, sizeGuideMeasurements: currentList });
                            }}
                            className="text-[11px] font-bold text-neutral-700 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Size Row</span>
                          </button>
                        </div>

                        {/* Editable Measurements Grid */}
                        <div className="space-y-1.5">
                          {(localSettings.sizeGuideMeasurements && localSettings.sizeGuideMeasurements.length > 0 
                            ? localSettings.sizeGuideMeasurements 
                            : [
                                { size: 'S', chest: '36 - 38"', length: '27"' },
                                { size: 'M', chest: '38 - 40"', length: '28"' },
                                { size: 'L', chest: '40 - 42"', length: '29"' },
                                { size: 'XL', chest: '42 - 44"', length: '30"' },
                                { size: 'XXL', chest: '44 - 46"', length: '31"' },
                                { size: '3XL', chest: '46 - 48"', length: '32"' },
                              ]
                          ).map((item, index, arr) => (
                            <div key={index} className="flex items-center gap-2 p-1.5 rounded-xl bg-neutral-50 border border-neutral-200">
                              <div className="w-16">
                                <input
                                  type="text"
                                  value={item.size}
                                  placeholder="Size"
                                  onChange={(e) => {
                                    const updated = [...arr];
                                    updated[index] = { ...updated[index], size: e.target.value };
                                    setLocalSettings({ ...localSettings, sizeGuideMeasurements: updated });
                                  }}
                                  className="w-full px-2 py-1 text-xs font-bold text-center bg-white border border-neutral-200 rounded-lg text-amber-600 focus:outline-none"
                                />
                              </div>
                              <div className="flex-1">
                                <input
                                  type="text"
                                  value={item.chest}
                                  placeholder="Chest (e.g. 40 - 42&quot;)"
                                  onChange={(e) => {
                                    const updated = [...arr];
                                    updated[index] = { ...updated[index], chest: e.target.value };
                                    setLocalSettings({ ...localSettings, sizeGuideMeasurements: updated });
                                  }}
                                  className="w-full px-2.5 py-1 text-xs bg-white border border-neutral-200 rounded-lg text-neutral-800 focus:outline-none"
                                />
                              </div>
                              <div className="flex-1">
                                <input
                                  type="text"
                                  value={item.length}
                                  placeholder="Length (e.g. 29&quot;)"
                                  onChange={(e) => {
                                    const updated = [...arr];
                                    updated[index] = { ...updated[index], length: e.target.value };
                                    setLocalSettings({ ...localSettings, sizeGuideMeasurements: updated });
                                  }}
                                  className="w-full px-2.5 py-1 text-xs bg-white border border-neutral-200 rounded-lg text-neutral-800 focus:outline-none"
                                />
                              </div>
                              {arr.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = arr.filter((_, i) => i !== index);
                                    setLocalSettings({ ...localSettings, sizeGuideMeasurements: updated });
                                  }}
                                  className="p-1 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Delete Size"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
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

          {/* TAB 5: STORAGE & MEDIA */}
          {activeMenu === 'r2_storage' && (
            <div className="space-y-6">
              {/* Main Storage Status Header Card */}
              <div className="p-6 sm:p-8 rounded-3xl bg-[#f8f9fa] border border-neutral-200/80 space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-neutral-900 text-white">
                      <Database className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-neutral-900">
                        Cloud Storage & Persistent Media Engine
                      </h3>
                      <p className="text-xs text-neutral-500">
                        Zero-Data-Loss Architecture: Disk Storage (`store_data/`), Media Folder (`public/uploads/`), and Client Cache are unified.
                      </p>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full text-xs font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Persistent & Protected
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-sm">
                    <span className="text-xs text-neutral-400 font-bold block">Persistent Disk Store</span>
                    <div className="text-sm font-mono font-extrabold text-neutral-900 mt-1">/store_data/*.json</div>
                    <span className="text-[10px] text-emerald-600 font-bold block mt-1">Active JSON DB</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-sm">
                    <span className="text-xs text-neutral-400 font-bold block">Media Uploads Folder</span>
                    <div className="text-sm font-mono font-extrabold text-neutral-900 mt-1">/public/uploads/</div>
                    <span className="text-[10px] text-emerald-600 font-bold block mt-1">Static Asset Storage</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-sm">
                    <span className="text-xs text-neutral-400 font-bold block">Browser Rehydration</span>
                    <div className="text-sm font-mono font-extrabold text-neutral-900 mt-1">LocalStorage Cache</div>
                    <span className="text-[10px] text-emerald-600 font-bold block mt-1">Instant Recovery On Deploy</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-sm">
                    <span className="text-xs text-neutral-400 font-bold block">Total Stored Assets</span>
                    <div className="text-sm font-mono font-extrabold text-neutral-900 mt-1">
                      {products.length} Items • {categories.length} Categories
                    </div>
                    <span className="text-[10px] text-emerald-600 font-bold block mt-1">Fully Synchronized</span>
                  </div>
                </div>

                {/* Status Feedback Note */}
                {syncStatusNote && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold flex items-center justify-between animate-fadeIn">
                    <span>{syncStatusNote}</span>
                    <button onClick={() => setSyncStatusNote(null)} className="text-emerald-500 hover:text-emerald-800">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Data Protection & One-Click Backup/Restore Card */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white border border-neutral-200/80 shadow-sm space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4 border-b border-neutral-100 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <HardDrive className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-neutral-900">
                        Deployment Protection & One-Click Backup System
                      </h4>
                      <p className="text-xs text-neutral-500">
                        Export an offline JSON snapshot or restore all products, images, categories, and banners instantly anytime.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Force Cloud Sync Button */}
                    <button
                      onClick={handleForceSyncAll}
                      disabled={isForceSyncing}
                      className="px-4 py-2.5 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-extrabold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isForceSyncing ? 'animate-spin' : ''}`} />
                      <span>{isForceSyncing ? 'Syncing to Disk...' : 'Force Sync to Server'}</span>
                    </button>

                    {/* Download Full Backup Button */}
                    <button
                      onClick={handleExportFullBackup}
                      disabled={isExportingBackup}
                      className="px-5 py-2.5 rounded-2xl bg-[#0d0f12] hover:bg-neutral-800 text-white text-xs font-extrabold flex items-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isExportingBackup ? 'Preparing Backup...' : 'Download Full Backup (.json)'}</span>
                    </button>

                    {/* Restore from File Hidden Input & Trigger */}
                    <input
                      type="file"
                      ref={backupFileInputRef}
                      onChange={handleImportFullBackup}
                      accept=".json,application/json"
                      className="hidden"
                    />
                    <button
                      onClick={() => backupFileInputRef.current?.click()}
                      disabled={isImportingBackup}
                      className="px-4 py-2.5 rounded-2xl border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-extrabold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <UploadCloud className="w-3.5 h-3.5 text-neutral-500" />
                      <span>{isImportingBackup ? 'Restoring...' : 'Restore from Backup'}</span>
                    </button>
                  </div>
                </div>

                {/* Deployment Safety Guarantees Notice */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-[#fbfbfb] border border-neutral-200/60">
                    <div className="flex items-center gap-2 font-bold text-neutral-900 mb-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>1. Dual-Layer Storage</span>
                    </div>
                    <p className="text-neutral-500 leading-relaxed">
                      All new products, banner photos, and category entries are permanently saved to disk files (`store_data/` & `public/uploads/`) and client cache.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#fbfbfb] border border-neutral-200/60">
                    <div className="flex items-center gap-2 font-bold text-neutral-900 mb-1">
                      <RefreshCw className="w-4 h-4 text-blue-600" />
                      <span>2. Auto Rehydrate on Deploy</span>
                    </div>
                    <p className="text-neutral-500 leading-relaxed">
                      Whenever you redeploy code or restart the container, the client and server automatically re-link and merge without resetting custom items.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#fbfbfb] border border-neutral-200/60">
                    <div className="flex items-center gap-2 font-bold text-neutral-900 mb-1">
                      <Download className="w-4 h-4 text-purple-600" />
                      <span>3. Offline Portable Snapshot</span>
                    </div>
                    <p className="text-neutral-500 leading-relaxed">
                      Click "Download Full Backup" before major server migrations to keep a timestamped complete copy of all products, media, and configurations.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Note inside Main Container */}
        <div className="pt-8 border-t border-neutral-200/80 flex items-center justify-between text-xs text-neutral-400">
          <span>Spidey Master Management Engine</span>
          <span className="font-mono">Live Synchronized</span>
        </div>

      </main>

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
                {/* Product Code */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-neutral-700">
                      Product Code (Search & Quick Order) *
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormCode(generateRandomCode())}
                      className="text-[10px] text-rose-600 hover:text-rose-700 font-bold underline"
                    >
                      Regenerate
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SJ-CXYQD"
                    className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:bg-white font-mono uppercase font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Product Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Barcelona 1999-00 Centenary Home"
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
                    Price (৳ BDT) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Original Price (৳ Strikethrough)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={formOriginalPrice}
                    onChange={(e) => setFormOriginalPrice(e.target.value)}
                    placeholder="e.g. 700"
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

              {/* Product Size Availability Checkboxes / Toggle Buttons */}
              <div className="bg-neutral-50 p-3 rounded-2xl border border-neutral-200/80">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                      <span>Available Sizes / সাইজসমূহ (চেকবাক্স / টগল বাটন):</span>
                      <span className="text-[11px] font-mono text-neutral-500">
                        ({formSizes.length} Selected)
                      </span>
                    </label>
                    <p className="text-[10px] text-neutral-500">
                      কাস্টমাররা স্টোরে শুধু আপনার সিলেক্ট করা সাইজগুলোই দেখতে পাবে
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setFormSizes(['S', 'M', 'L', 'XL', 'XXL', '3XL'])}
                      className="text-[10px] font-bold text-rose-600 hover:text-rose-700 px-2 py-0.5 rounded-md hover:bg-rose-50 cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-neutral-300">•</span>
                    <button
                      type="button"
                      onClick={() => setFormSizes([])}
                      className="text-[10px] font-bold text-neutral-500 hover:text-neutral-700 px-2 py-0.5 rounded-md hover:bg-neutral-200 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-2">
                  {['S', 'M', 'L', 'XL', 'XXL', '3XL'].map((size) => {
                    const isSelected = formSizes.includes(size);
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setFormSizes(formSizes.filter((s) => s !== size));
                          } else {
                            setFormSizes([...formSizes, size]);
                          }
                        }}
                        className={`h-10 rounded-xl font-mono text-xs font-black transition-all flex flex-col items-center justify-center cursor-pointer border ${
                          isSelected
                            ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm ring-2 ring-neutral-900 scale-102'
                            : 'bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400 hover:bg-neutral-100'
                        }`}
                      >
                        <span className="leading-tight">{size}</span>
                        <span className={`text-[9px] font-sans font-bold leading-none ${isSelected ? 'text-emerald-400' : 'text-neutral-400'}`}>
                          {isSelected ? '✓ In Stock' : '✕ Off'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1 flex items-center justify-between">
                  <span>Product Description / নোটস (Optional - ফাঁকা রাখতে পারেন)</span>
                  <span className="text-[10px] text-emerald-600 font-normal">স্টোরে অটো গ্যারান্টি ব্যাজ শো করবে</span>
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="কিছু লেখার প্রয়োজন নেই, চাইলে বিশেষ কোনো নোট লিখতে পারেন..."
                  className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:bg-white"
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

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-neutral-100">
                {editingProduct ? (
                  <button
                    type="button"
                    onClick={() => setProductPendingDelete(editingProduct)}
                    className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Product</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsProductModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-neutral-100 text-neutral-700 font-bold text-xs hover:bg-neutral-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="px-5 py-2 rounded-xl bg-[#0d0f12] text-white font-bold text-xs hover:bg-neutral-800 shadow-md cursor-pointer"
                  >
                    {formSubmitting ? 'Saving...' : 'Save Product Drop'}
                  </button>
                </div>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Permanent Product Deletion Confirmation Dialog */}
      {productPendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-rose-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-neutral-900 leading-snug">
                  প্রোডাক্টটি স্থায়ীভাবে ডিলিট করবেন?
                </h3>
                <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                  এই প্রোডাক্টটি ফ্রন্টএন্ড এবং ব্যাকএন্ড ডাটাবেস থেকে সম্পূর্ণ স্থায়ীভাবে মুছে ফেলা হবে। ব্রাউজারে এর কোনো ডেটা অবশিষ্ট থাকবে না।
                </p>
              </div>
            </div>

            {/* Target Product Summary Card */}
            <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-white border border-neutral-200 overflow-hidden shrink-0 flex items-center justify-center">
                {productPendingDelete.images?.[0] ? (
                  <img
                    src={productPendingDelete.images[0]}
                    alt={productPendingDelete.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package className="w-6 h-6 text-neutral-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono text-neutral-500 font-semibold truncate">
                  Code: {productPendingDelete.code}
                </div>
                <div className="text-sm font-bold text-neutral-900 truncate">
                  {productPendingDelete.title}
                </div>
                <div className="text-xs font-bold text-neutral-700">
                  {formatPrice(productPendingDelete.price, currency)}
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>একবার ডিলিট করলে এই প্রোডাক্টটি ব্যাকএন্ড ও ফ্রন্টএন্ড কোথাও থাকবে না।</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingProduct}
                onClick={() => setProductPendingDelete(null)}
                className="px-4 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs transition-colors cursor-pointer"
              >
                বাতিল করুন (Cancel)
              </button>
              <button
                type="button"
                disabled={isDeletingProduct}
                onClick={async () => {
                  setIsDeletingProduct(true);
                  try {
                    await onDeleteProduct(productPendingDelete.id);
                    if (editingProduct?.id === productPendingDelete.id) {
                      setIsProductModalOpen(false);
                    }
                    setProductPendingDelete(null);
                  } finally {
                    setIsDeletingProduct(false);
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md hover:shadow-rose-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeletingProduct ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>ডিলিট হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>হ্যাঁ, স্থায়ীভাবে ডিলিট করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Category Deletion Confirmation Dialog */}
      {categoryPendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-rose-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-neutral-900 leading-snug">
                  ক্যাটাগরি স্থায়ীভাবে ডিলিট করবেন?
                </h3>
                <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                  এই ক্যাটাগরি ফ্রন্টএন্ড এবং ব্যাকএন্ড ডাটাবেস থেকে স্থায়ীভাবে মুছে ফেলা হবে। হোমপেজ ও ফিল্টার থেকে এটি সাথে সাথে অপসারিত হবে।
                </p>
              </div>
            </div>

            {/* Target Category Summary Card */}
            <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-white border border-neutral-200 overflow-hidden shrink-0 flex items-center justify-center p-1">
                <img
                  src={categoryPendingDelete.image || 'https://images.unsplash.com/photo-1577212017184-80cc0da11082?auto=format&fit=crop&w=400&q=80'}
                  alt={categoryPendingDelete.name}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1577212017184-80cc0da11082?auto=format&fit=crop&w=400&q=80';
                  }}
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono text-neutral-500 font-semibold truncate">
                  ID: {categoryPendingDelete.id}
                </div>
                <div className="text-sm font-bold text-neutral-900 truncate">
                  {categoryPendingDelete.name}
                </div>
                <div className="text-xs text-neutral-500 truncate">
                  {categoryPendingDelete.subtitle || 'Category Slider Item'}
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>একবার ডিলিট করলে এই ক্যাটাগরি স্থায়ীভাবে ডাটাবেস থেকে মুছে যাবে।</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingCategory}
                onClick={() => setCategoryPendingDelete(null)}
                className="px-4 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs transition-colors cursor-pointer"
              >
                বাতিল করুন (Cancel)
              </button>
              <button
                type="button"
                disabled={isDeletingCategory}
                onClick={async () => {
                  setIsDeletingCategory(true);
                  try {
                    await onDeleteCategory(categoryPendingDelete.id || categoryPendingDelete.name);
                    if (editingCatId === categoryPendingDelete.id) {
                      setIsCatModalOpen(false);
                    }
                    setCategoryPendingDelete(null);
                  } finally {
                    setIsDeletingCategory(false);
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md hover:shadow-rose-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeletingCategory ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>ডিলিট হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>হ্যাঁ, স্থায়ীভাবে ডিলিট করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
