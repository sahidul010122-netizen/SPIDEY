import React, { useState, useMemo } from 'react';
import { 
  Layers, 
  Search, 
  Check, 
  Edit3, 
  ExternalLink, 
  Copy, 
  CheckCircle2, 
  RefreshCw,
  Plus,
  Minus,
  Sparkles,
  Share2,
  PackageCheck
} from 'lucide-react';
import { JerseyProduct } from '../../types';
import { CurrencyCode, formatPrice } from '../../utils/currency';

interface SizeStockMatchSectionProps {
  products: JerseyProduct[];
  currency?: CurrencyCode;
  onUpdateProduct?: (id: string, product: Partial<JerseyProduct>) => Promise<boolean>;
  onRefreshProducts?: () => void;
  isStandaloneStockView?: boolean;
}

const STANDARD_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];

// Helper to get or initialize size stock distribution
const getProductSizeStock = (product: JerseyProduct): Record<string, number> => {
  if (product.sizeStock && Object.keys(product.sizeStock).length > 0) {
    const res: Record<string, number> = {};
    STANDARD_SIZES.forEach(sz => {
      res[sz] = product.sizeStock?.[sz] !== undefined ? Number(product.sizeStock[sz]) : 0;
    });
    return res;
  }
  const total = Number(product.stockCount) || 15;
  const count = STANDARD_SIZES.length;
  const base = Math.floor(total / count);
  const remainder = total % count;
  const res: Record<string, number> = {};
  STANDARD_SIZES.forEach((sz, idx) => {
    res[sz] = base + (idx < remainder ? 1 : 0);
  });
  return res;
};

export const SizeStockMatchSection: React.FC<SizeStockMatchSectionProps> = ({
  products: initialProducts = [],
  currency = 'BDT',
  onUpdateProduct,
  onRefreshProducts,
  isStandaloneStockView = false
}) => {
  const [products, setProducts] = useState<JerseyProduct[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingStockProductId, setEditingStockProductId] = useState<string | null>(null);
  const [editableSizeStock, setEditableSizeStock] = useState<Record<string, number>>({});
  const [isSavingStock, setIsSavingStock] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync initialProducts
  React.useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenEditStock = (product: JerseyProduct) => {
    setEditingStockProductId(product.id);
    setEditableSizeStock(getProductSizeStock(product));
  };

  const handleSizeStockChange = (size: string, value: number) => {
    const safeVal = Math.max(0, isNaN(value) ? 0 : value);
    setEditableSizeStock(prev => ({
      ...prev,
      [size]: safeVal
    }));
  };

  const handleSaveSizeStock = async (product: JerseyProduct) => {
    setIsSavingStock(true);
    try {
      const totalCount = Object.values(editableSizeStock).reduce((a, b) => a + (Number(b) || 0), 0);
      const res = await fetch(`/api/products/${product.id}/stock-matrix`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sizeStock: editableSizeStock,
          stockCount: totalCount,
          inStock: totalCount > 0
        })
      });

      const data = await res.json();
      if (data.success && data.product) {
        setProducts(prev => prev.map(p => p.id === product.id ? data.product : p));
        setEditingStockProductId(null);
        showToast(`Saved size stock for "${product.title}" (Total: ${totalCount})`);
        if (onRefreshProducts) onRefreshProducts();
      } else {
        showToast(data.message || 'Failed to save stock');
      }
    } catch (err: any) {
      showToast('Error saving stock: ' + err.message);
    } finally {
      setIsSavingStock(false);
    }
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return products;
    return products.filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.code && p.code.toLowerCase().includes(q)) ||
      p.category.toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  // Direct isolated staff link
  const staffLink = typeof window !== 'undefined'
    ? `${window.location.origin}/admin?tab=size_stock`
    : '/admin?tab=size_stock';

  const copyStaffLink = () => {
    navigator.clipboard.writeText(staffLink);
    setCopiedLink(true);
    showToast('Direct Staff Size-Stock Link copied!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-slideUp">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-neutral-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-neutral-900 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Layers className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-neutral-900 tracking-tight">
              Size Stock Match
            </h2>
            <p className="text-xs text-neutral-500">
              Live inventory count per size with instant auto-matching.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Isolated Staff Link Share Button */}
          <button
            onClick={copyStaffLink}
            className="px-3.5 py-2 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
            title="Copy isolated link for warehouse staff to view stock only"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-neutral-600" />}
            <span>{copiedLink ? 'Link Copied' : 'Staff Stock Link'}</span>
          </button>
        </div>
      </div>

      {/* Main Stock Table */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-neutral-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by jersey name or code..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-medium text-neutral-900 focus:outline-hidden focus:bg-white focus:border-neutral-900 transition-all"
            />
          </div>

          <div className="text-xs text-neutral-500 font-medium">
            Showing <strong className="text-neutral-900">{filteredProducts.length}</strong> items
          </div>
        </div>

        {/* Minimalist 1st Row Image + Code + Live Size Line Structure */}
        <div className="overflow-x-auto rounded-2xl border border-neutral-200/80">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-600 uppercase text-[10px] tracking-wider border-b border-neutral-200">
              <tr>
                <th className="p-3.5 font-bold">Jersey Item & Code</th>
                {STANDARD_SIZES.map(sz => (
                  <th key={sz} className="p-3.5 font-bold text-center">{sz}</th>
                ))}
                <th className="p-3.5 font-bold text-center">Total Stock</th>
                <th className="p-3.5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/80">
              {filteredProducts.map((product) => {
                const isEditing = editingStockProductId === product.id;
                const sizeStock = isEditing ? editableSizeStock : getProductSizeStock(product);
                const totalStock = Object.values(sizeStock).reduce((a, b) => a + (Number(b) || 0), 0);
                const firstImg = product.images?.[0] || '/placeholder.jpg';

                return (
                  <tr key={product.id} className="hover:bg-neutral-50/60 transition-colors">
                    {/* 1st Row: Product Image + Jersey Name + Code */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <img 
                          src={firstImg} 
                          alt={product.title}
                          referrerPolicy="no-referrer"
                          className="w-11 h-11 rounded-xl object-cover border border-neutral-200 shrink-0 shadow-2xs"
                        />
                        <div>
                          <div className="font-bold text-neutral-900 text-xs">{product.title}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[10px] font-bold text-neutral-600 bg-neutral-100 px-1.5 py-0.5 rounded-md border border-neutral-200/60">
                              {product.code || product.id}
                            </span>
                            <span className="text-[10px] text-neutral-400">
                              {product.category}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Size Columns with Live Counts */}
                    {STANDARD_SIZES.map(sz => (
                      <td key={sz} className="p-3.5 text-center font-mono">
                        {isEditing ? (
                          <div className="inline-flex items-center gap-1 justify-center">
                            <button
                              onClick={() => handleSizeStockChange(sz, (editableSizeStock[sz] || 0) - 1)}
                              className="w-5 h-5 rounded-md bg-neutral-200 hover:bg-neutral-300 text-neutral-800 flex items-center justify-center font-bold"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={editableSizeStock[sz] !== undefined ? editableSizeStock[sz] : 0}
                              onChange={(e) => handleSizeStockChange(sz, parseInt(e.target.value) || 0)}
                              className="w-10 text-center py-1 rounded-md border border-neutral-300 font-mono font-bold text-xs"
                            />
                            <button
                              onClick={() => handleSizeStockChange(sz, (editableSizeStock[sz] || 0) + 1)}
                              className="w-5 h-5 rounded-md bg-neutral-200 hover:bg-neutral-300 text-neutral-800 flex items-center justify-center font-bold"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <span className={`px-2 py-1 rounded-md text-xs font-bold inline-block min-w-[28px] ${
                            (sizeStock[sz] || 0) > 0 
                              ? 'bg-neutral-100 text-neutral-800 border border-neutral-200/60' 
                              : 'bg-rose-50 text-rose-600 border border-rose-100'
                          }`}>
                            {sizeStock[sz] || 0}
                          </span>
                        )}
                      </td>
                    ))}

                    {/* Total Stock */}
                    <td className="p-3.5 text-center font-mono font-bold">
                      <span className={`px-2.5 py-1 rounded-full text-xs ${
                        totalStock > 0 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' 
                          : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                      }`}>
                        {totalStock}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleSaveSizeStock(product)}
                            disabled={isSavingStock}
                            className="px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1 transition-all"
                          >
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Save</span>
                          </button>
                          <button
                            onClick={() => setEditingStockProductId(null)}
                            className="px-2.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-xs font-bold transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenEditStock(product)}
                          className="px-2.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold flex items-center gap-1 ml-auto transition-all"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-neutral-500" />
                          <span>Edit Stock</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
