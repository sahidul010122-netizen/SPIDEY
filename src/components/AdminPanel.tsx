import React, { useState, useRef } from 'react';
import { 
  Plus, Upload, Trash2, Edit3, Shield, Key, Check, X, 
  RefreshCw, Layers, Database, Sparkles, Image as ImageIcon,
  DollarSign, Package, AlertCircle, ExternalLink, Copy, CheckCircle2
} from 'lucide-react';
import { JerseyProduct, StoreStats } from '../types';
import { CurrencyCode, formatPrice } from '../utils/currency';

interface AdminPanelProps {
  products: JerseyProduct[];
  categories: string[];
  stats: StoreStats | null;
  onAddProduct: (product: Partial<JerseyProduct>) => Promise<boolean>;
  onUpdateProduct: (id: string, product: Partial<JerseyProduct>) => Promise<boolean>;
  onDeleteProduct: (id: string) => Promise<boolean>;
  onResetCatalog: () => Promise<void>;
  currency: CurrencyCode;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  products,
  categories,
  stats,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onResetCatalog,
  currency
}) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(true); // Default true for instant preview, can be toggled
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');

  // Product Form Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<JerseyProduct | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('Real Madrid');
  const [formCustomCategory, setFormCustomCategory] = useState('');
  const [formPrice, setFormPrice] = useState('129.99');
  const [formOriginalPrice, setFormOriginalPrice] = useState('159.99');
  const [formSeason, setFormSeason] = useState('2024/25');
  const [formEdition, setFormEdition] = useState('Player Issue / Authentic');
  const [formBadge, setFormBadge] = useState('New Drop');
  const [formDescription, setFormDescription] = useState('');
  const [formStockCount, setFormStockCount] = useState('15');
  const [formInStock, setFormInStock] = useState(true);
  const [formImages, setFormImages] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [formFeatures, setFormFeatures] = useState<string[]>([
    'HEAT.RDY cooling breathability matrix',
    'Heat-bonded silicone 3D team crest',
    'Engineered athletic aerodynamic fit'
  ]);
  const [featureInput, setFeatureInput] = useState('');

  // Uploading state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search & Filter in Admin
  const [adminSearch, setAdminSearch] = useState('');
  const [adminCategoryFilter, setAdminCategoryFilter] = useState('all');

  // Copy notification state
  const [copiedCode, setCopiedCode] = useState(false);

  // Open Form for Adding New Product
  const openAddModal = () => {
    setEditingProduct(null);
    setFormTitle('');
    setFormCategory(categories[0] || 'Real Madrid');
    setFormCustomCategory('');
    setFormPrice('129.99');
    setFormOriginalPrice('159.99');
    setFormSeason('2024/25');
    setFormEdition('Player Issue / Authentic');
    setFormBadge('New Arrival');
    setFormDescription('Engineered high-performance jersey woven with laser-cut ventilation and authentic team insignia.');
    setFormStockCount('20');
    setFormInStock(true);
    setFormImages([
      'https://images.unsplash.com/photo-1577212017184-80cc0da11082?auto=format&fit=crop&w=1000&q=80'
    ]);
    setFormFeatures([
      'HEAT.RDY cooling breathability matrix',
      'Heat-bonded silicone 3D team crest',
      'Engineered athletic aerodynamic fit'
    ]);
    setIsFormOpen(true);
  };

  // Open Form for Editing Existing Product
  const openEditModal = (prod: JerseyProduct) => {
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
    setIsFormOpen(true);
  };

  // Handle File Upload to /api/upload (Cloudflare R2 Bucket Binding MY_BUCKET)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadMessage('Encoding and transmitting to Cloudflare R2 bucket...');

      // Convert file to Base64
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
            setFormImages((prev) => [...prev, result.url]);
            setUploadMessage(`Saved to R2: ${result.key}`);
          } else {
            // Fallback to local data URI if server upload error
            setFormImages((prev) => [...prev, base64Data]);
            setUploadMessage('Loaded locally to asset pipeline');
          }
        } catch (apiErr) {
          // Fallback to client-side data URI
          setFormImages((prev) => [...prev, base64Data]);
          setUploadMessage('Loaded locally to asset pipeline');
        } finally {
          setIsUploading(false);
        }
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('File read error:', err);
      setIsUploading(false);
      setUploadMessage('Failed to read file');
    }
  };

  // Add Image URL
  const addImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    setFormImages((prev) => [...prev, imageUrlInput.trim()]);
    setImageUrlInput('');
  };

  // Remove Image from list
  const removeImage = (index: number) => {
    setFormImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Add Feature Tag
  const addFeature = () => {
    if (!featureInput.trim()) return;
    setFormFeatures((prev) => [...prev, featureInput.trim()]);
    setFeatureInput('');
  };

  // Remove Feature Tag
  const removeFeature = (index: number) => {
    setFormFeatures((prev) => prev.filter((_, i) => i !== index));
  };

  // Form Submit Handler
  const handleSubmitForm = async (e: React.FormEvent) => {
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
      season: formSeason.trim() || '2024/25',
      edition: formEdition.trim() || 'Player Issue / Authentic',
      badge: formBadge.trim() || undefined,
      description: formDescription.trim(),
      stockCount: parseInt(formStockCount, 10) || 15,
      inStock: formInStock,
      images: formImages.length > 0 ? formImages : [
        'https://images.unsplash.com/photo-1577212017184-80cc0da11082?auto=format&fit=crop&w=1000&q=80'
      ],
      features: formFeatures.length > 0 ? formFeatures : [
        'Advanced aerodynamic breathability matrix'
      ],
      sizes: ['S', 'M', 'L', 'XL', '2XL']
    };

    let success = false;
    if (editingProduct) {
      success = await onUpdateProduct(editingProduct.id, payload);
    } else {
      success = await onAddProduct(payload);
    }

    setFormSubmitting(false);
    if (success) {
      setIsFormOpen(false);
    }
  };

  // Filter Products in Admin Table
  const filteredProducts = products.filter((p) => {
    const matchesCategory = adminCategoryFilter === 'all' || p.category.toLowerCase() === adminCategoryFilter.toLowerCase();
    const matchesSearch = !adminSearch || 
      p.title.toLowerCase().includes(adminSearch.toLowerCase()) || 
      p.category.toLowerCase().includes(adminSearch.toLowerCase()) ||
      p.id.toLowerCase().includes(adminSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalValue = products.reduce((acc, p) => acc + p.price * p.stockCount, 0);

  const copyWrangler = () => {
    const code = `name = "spidey-jersey-store"
compatibility_date = "2026-03-01"
assets = { directory = "./dist", binding = "ASSETS" }

[[r2_buckets]]
binding = "MY_BUCKET"
bucket_name = "spidey-jersey-images"`;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Auth gate check
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-16 px-4">
        <div className="glass-panel p-8 rounded-3xl border border-white/15 text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 mx-auto flex items-center justify-center">
            <Key className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white font-mono">Admin Authorization</h2>
            <p className="text-xs text-slate-400 mt-1">
              Enter passcode to manage Spidey Jersey catalog and R2 asset buckets
            </p>
          </div>

          <div className="space-y-3">
            <input
              id="admin-passcode-input"
              type="password"
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                setAuthError('');
              }}
              placeholder="Passcode (Default: spidey2026)"
              className="w-full bg-slate-900 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-center font-mono text-white focus:outline-none focus:border-cyan-400"
            />
            {authError && (
              <p className="text-xs text-rose-400 font-medium">{authError}</p>
            )}
            <button
              id="admin-login-btn"
              onClick={() => {
                if (passcode === 'spidey2026' || passcode === 'admin' || passcode === 'spidey') {
                  setIsAuthenticated(true);
                } else {
                  setAuthError('Incorrect passcode. Default is "spidey2026"');
                }
              }}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-all"
            >
              Unlock Admin Portal
            </button>
            <button
              id="admin-demo-access-btn"
              onClick={() => setIsAuthenticated(true)}
              className="text-xs text-slate-400 hover:text-cyan-300 underline"
            >
              Instant 1-Click Demo Access
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-6 space-y-6">
      
      {/* Top Header & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-mono font-bold border border-rose-500/30 uppercase mb-2">
            <Shield className="w-3.5 h-3.5" />
            <span>Master Catalog & Asset Control</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Dynamic Jersey Inventory
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Cloudflare R2 Bucket Binding <code className="text-cyan-300 font-mono">MY_BUCKET</code> active • Real-time asset mutation
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="admin-reset-catalog-btn"
            onClick={onResetCatalog}
            className="px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/10 text-xs font-semibold text-slate-300 flex items-center gap-2 transition-all"
            title="Reset Catalog to Initial Showcase"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Demo Vault</span>
          </button>

          <button
            id="admin-add-product-btn"
            onClick={openAddModal}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/30 flex items-center gap-2 transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4 text-slate-950" />
            <span>Add New Jersey Drop</span>
          </button>
        </div>
      </div>

      {/* Store Statistics Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Total Catalog</span>
            <Package className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{products.length}</div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>{products.filter((p) => p.inStock).length} Live In Stock</span>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Categories</span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{categories.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {categories.slice(0, 3).join(', ')}...
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Est. Vault Value</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-300 font-mono">
            {formatPrice(totalValue, currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Based on current stock counts
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Cloudflare R2 Binding</span>
            <Database className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-sm font-black text-white font-mono uppercase tracking-wider">
            MY_BUCKET
          </div>
          <div className="text-[11px] text-cyan-300 mt-1 font-mono">
            spidey-jersey-images
          </div>
        </div>
      </div>

      {/* Cloudflare R2 & Worker Specs Quick Widget */}
      <div className="glass-panel p-5 rounded-2xl border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-950/80">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase font-mono">
                Cloudflare Worker & R2 Binding Configuration
              </span>
              <span className="px-2 py-0.2 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Ready for wrangler deploy
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
              Configured with <code className="text-cyan-300 font-mono">wrangler.toml</code> at project root. Uploads to <code className="text-cyan-300 font-mono">/api/upload</code> store assets directly into R2 bucket <code className="text-cyan-300 font-mono">spidey-jersey-images</code>.
            </p>
          </div>
        </div>

        <button
          id="copy-wrangler-btn"
          onClick={copyWrangler}
          className="px-3.5 py-2 rounded-xl bg-slate-900 border border-white/15 hover:border-cyan-500/40 text-xs font-mono text-slate-200 flex items-center gap-2 shrink-0 transition-all"
        >
          {copiedCode ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Copied wrangler.toml!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Copy wrangler.toml</span>
            </>
          )}
        </button>
      </div>

      {/* Inventory Management Table */}
      <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden">
        {/* Table Filter Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60">
          <div className="w-full sm:w-72">
            <input
              id="admin-filter-search"
              type="text"
              value={adminSearch}
              onChange={(e) => setAdminSearch(e.target.value)}
              placeholder="Filter by title, club or SKU..."
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <select
              id="admin-category-filter-select"
              value={adminCategoryFilter}
              onChange={(e) => setAdminCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-white/10 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="all">All Categories ({products.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[10px] border-b border-white/10 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Jersey Item</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Price</th>
                <th className="py-3.5 px-4">Stock Status</th>
                <th className="py-3.5 px-4">Images (R2)</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-mono">
                    No jerseys matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((jersey) => (
                  <tr key={jersey.id} className="hover:bg-slate-900/40 transition-colors">
                    {/* Item & Thumbnail */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={jersey.images[0]}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-xl object-cover bg-slate-900 border border-white/10 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-white text-xs line-clamp-1">
                            {jersey.title}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                            {jersey.edition} • {jersey.season}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                        {jersey.category}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="py-3 px-4 font-mono font-bold text-white text-xs">
                      {formatPrice(jersey.price, currency)}
                    </td>

                    {/* Stock Counter & In-Stock Quick Toggle */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          id={`toggle-stock-status-${jersey.id}`}
                          onClick={() => onUpdateProduct(jersey.id, { inStock: !jersey.inStock })}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase transition-all ${
                            jersey.inStock && jersey.stockCount > 0
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {jersey.inStock && jersey.stockCount > 0 ? 'In Stock' : 'Out of Stock'}
                        </button>
                        <span className="text-[11px] font-mono text-slate-400">
                          ({jersey.stockCount} units)
                        </span>
                      </div>
                    </td>

                    {/* Images count */}
                    <td className="py-3 px-4 font-mono text-slate-400">
                      <div className="flex items-center gap-1 text-[11px]">
                        <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{jersey.images.length} views</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          id={`edit-jersey-${jersey.id}`}
                          onClick={() => openEditModal(jersey)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-300 border border-white/10 transition-all"
                          title="Edit Jersey"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`delete-jersey-${jersey.id}`}
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete ${jersey.title}?`)) {
                              onDeleteProduct(jersey.id);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-300 border border-white/10 transition-all"
                          title="Delete Jersey"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isFormOpen && (
        <div 
          id="admin-form-modal-backdrop"
          onClick={() => setIsFormOpen(false)}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
        >
          <div
            id="admin-form-container"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-3xl glass-panel bg-slate-950/95 border border-white/20 shadow-2xl p-6 sm:p-8 my-8 max-h-[90vh] overflow-y-auto space-y-6"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {editingProduct ? 'Edit Jersey Drop' : 'Create New Jersey Drop'}
                </h2>
                <p className="text-xs text-slate-400">
                  Assign metadata, categories, prices, and upload assets to Cloudflare R2
                </p>
              </div>
              <button
                id="close-admin-form-btn"
                onClick={() => setIsFormOpen(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Jersey Title & Edition *
                </label>
                <input
                  id="form-title-input"
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Real Madrid 24/25 Authentic Gold Third Kit"
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Category & Custom Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Category / Team *
                  </label>
                  <select
                    id="form-category-select"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="custom">+ Create New Category</option>
                  </select>
                </div>

                {formCategory === 'custom' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      New Category Name *
                    </label>
                    <input
                      id="form-custom-category-input"
                      type="text"
                      required
                      value={formCustomCategory}
                      onChange={(e) => setFormCustomCategory(e.target.value)}
                      placeholder="e.g. Juventus, Inter Milan, Brazil"
                      className="w-full bg-slate-900 border border-cyan-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Season
                    </label>
                    <input
                      id="form-season-input"
                      type="text"
                      value={formSeason}
                      onChange={(e) => setFormSeason(e.target.value)}
                      placeholder="e.g. 2024/25 or 1998/99"
                      className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                )}
              </div>

              {/* Price & Original Price */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Price (USD) *
                  </label>
                  <input
                    id="form-price-input"
                    type="number"
                    step="0.01"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="129.99"
                    className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Original Price (MSRP)
                  </label>
                  <input
                    id="form-original-price-input"
                    type="number"
                    step="0.01"
                    value={formOriginalPrice}
                    onChange={(e) => setFormOriginalPrice(e.target.value)}
                    placeholder="159.99"
                    className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Badge / Tag
                  </label>
                  <input
                    id="form-badge-input"
                    type="text"
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                    placeholder="e.g. Limited Drop"
                    className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Edition & Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Edition Type
                  </label>
                  <select
                    id="form-edition-select"
                    value={formEdition}
                    onChange={(e) => setFormEdition(e.target.value)}
                    className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="Player Issue / Authentic">Player Issue / Authentic</option>
                    <option value="Limited Cyber Edition">Limited Cyber Edition</option>
                    <option value="Retro Remastered">Retro Remastered</option>
                    <option value="Concept Edition">Concept Edition</option>
                    <option value="Stadium Fan Replica">Stadium Fan Replica</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Initial Stock Count
                  </label>
                  <input
                    id="form-stock-input"
                    type="number"
                    value={formStockCount}
                    onChange={(e) => setFormStockCount(e.target.value)}
                    placeholder="20"
                    className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Product Description & Specs
                </label>
                <textarea
                  id="form-description-input"
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Engineered high-performance jersey woven with laser-cut ventilation..."
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-400 resize-none"
                />
              </div>

              {/* Image Upload & R2 Asset Pipeline */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <label className="block text-xs font-semibold text-slate-300">
                  Jersey Images (Cloudflare R2 Bucket Binding)
                </label>

                {/* File Upload Box */}
                <div className="p-4 rounded-2xl bg-slate-900 border-2 border-dashed border-white/15 hover:border-cyan-500/50 transition-colors text-center space-y-2">
                  <Upload className="w-6 h-6 text-cyan-400 mx-auto" />
                  <div className="text-xs text-slate-300">
                    <button
                      id="browse-files-btn"
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-cyan-400 font-bold hover:underline"
                    >
                      Browse & upload jersey image
                    </button>{' '}
                    or drag & drop
                  </div>
                  <p className="text-[10px] text-slate-500">
                    PNG, WebP, JPG up to 10MB • Auto-routed to R2 / Worker
                  </p>
                  <input
                    ref={fileInputRef}
                    id="image-file-input"
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {isUploading && (
                    <div className="text-xs text-cyan-400 font-mono animate-pulse">
                      {uploadMessage}
                    </div>
                  )}
                </div>

                {/* URL Direct Input */}
                <div className="flex items-center gap-2">
                  <input
                    id="form-image-url-input"
                    type="url"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="Or paste direct image URL (e.g. Unsplash or R2 CDN link)..."
                    className="flex-1 bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    id="add-image-url-btn"
                    type="button"
                    onClick={addImageUrl}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-white/10"
                  >
                    Add URL
                  </button>
                </div>

                {/* Active Image Thumbnails */}
                {formImages.length > 0 && (
                  <div className="flex items-center gap-2 pt-2 overflow-x-auto">
                    {formImages.map((img, i) => (
                      <div key={i} className="relative group shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-white/20 bg-slate-900">
                        <img src={img} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute inset-0 bg-rose-950/80 text-rose-300 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {i === 0 && (
                          <span className="absolute bottom-0 left-0 right-0 bg-cyan-500 text-slate-950 text-[8px] font-bold text-center">
                            PRIMARY
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  id="cancel-form-btn"
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  id="save-jersey-btn"
                  type="submit"
                  disabled={formSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/30 flex items-center gap-2"
                >
                  {formSubmitting ? 'Saving...' : editingProduct ? 'Update Jersey' : 'Publish Jersey Drop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
