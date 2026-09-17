import React, { useState, useRef, useEffect } from 'react';
import { 
  FolderPlus, 
  Search, 
  Edit3, 
  Trash2, 
  Upload, 
  X, 
  Check, 
  RefreshCw, 
  Image as ImageIcon,
  ExternalLink,
  Layers,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  GripVertical,
  ArrowLeft,
  ArrowRight,
  Move
} from 'lucide-react';
import { CategoryItem } from '../types/settings';
import { JerseyProduct } from '../types';

interface CategoryManagerProps {
  categories: CategoryItem[];
  products: JerseyProduct[];
  onAddCategory: (cat: CategoryItem) => Promise<void>;
  onUpdateCategory: (id: string, updates: Partial<CategoryItem>) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onRefreshCategories?: () => Promise<void>;
  onReorderCategories?: (categories: CategoryItem[]) => Promise<void | boolean>;
}

// Client-side image compression helper to ensure fast uploads & avoid huge payload bottlenecks
const compressImageFile = async (
  file: File,
  maxDim = 1200,
  quality = 0.85
): Promise<{ base64Data: string; mime: string }> => {
  return new Promise((resolve) => {
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
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const base64Data = canvas.toDataURL(mime, quality);
        resolve({ base64Data, mime });
      } else {
        const reader = new FileReader();
        reader.onload = () => resolve({ base64Data: reader.result as string, mime: file.type || 'image/jpeg' });
        reader.readAsDataURL(file);
      }
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

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  categories,
  products,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onRefreshCategories,
  onReorderCategories
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  // Drag-and-drop & Reorder states
  const [draggedCatId, setDraggedCatId] = useState<string | null>(null);
  const [dragOverCatId, setDragOverCatId] = useState<string | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [orderSavedToast, setOrderSavedToast] = useState(false);

  // Optimistic local state for categories to ensure smooth, immediate reordering without snapping back
  const [localCategories, setLocalCategories] = useState<CategoryItem[]>(() => {
    return [...(Array.isArray(categories) ? categories : [])].sort((a, b) => {
      const orderA = typeof a.sortOrder === 'number' ? a.sortOrder : (typeof a.position === 'number' ? a.position : 0);
      const orderB = typeof b.sortOrder === 'number' ? b.sortOrder : (typeof b.position === 'number' ? b.position : 0);
      return orderA - orderB;
    });
  });

  // Keep localCategories synced when parent categories prop changes (unless actively dragging or saving)
  useEffect(() => {
    if (!isSavingOrder && !draggedCatId) {
      setLocalCategories([...(Array.isArray(categories) ? categories : [])].sort((a, b) => {
        const orderA = typeof a.sortOrder === 'number' ? a.sortOrder : (typeof a.position === 'number' ? a.position : 0);
        const orderB = typeof b.sortOrder === 'number' ? b.sortOrder : (typeof b.position === 'number' ? b.position : 0);
        return orderA - orderB;
      }));
    }
  }, [categories, isSavingOrder, draggedCatId]);

  // Form states
  const [formName, setFormName] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formTag, setFormTag] = useState('');
  const [formImage, setFormImage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle reordering sequence and persist
  const handleReorder = async (newCategories: CategoryItem[]) => {
    const stamped = newCategories.map((c, idx) => ({
      ...c,
      sortOrder: idx,
      position: idx,
      priority: idx
    }));

    // 1. Instantly update local state to eliminate visual snap-back
    setLocalCategories(stamped);

    if (!onReorderCategories) return;
    setIsSavingOrder(true);
    try {
      await onReorderCategories(stamped);
      setOrderSavedToast(true);
      setTimeout(() => setOrderSavedToast(false), 2200);
    } catch (err) {
      console.error('Failed to save category order:', err);
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedCatId(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCatId !== id) {
      setDragOverCatId(id);
    }
  };

  const handleDragLeave = (e: React.DragEvent, id: string) => {
    if (dragOverCatId === id) {
      setDragOverCatId(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverCatId(null);
    const sourceId = draggedCatId || e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) {
      setDraggedCatId(null);
      return;
    }

    const fromIdx = localCategories.findIndex((c) => c.id === sourceId);
    const toIdx = localCategories.findIndex((c) => c.id === targetId);
    if (fromIdx === -1 || toIdx === -1) {
      setDraggedCatId(null);
      return;
    }

    const updated: CategoryItem[] = [...localCategories];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);

    setDraggedCatId(null);
    await handleReorder(updated);
  };

  const handleShift = async (id: string, direction: 'prev' | 'next') => {
    const idx = localCategories.findIndex((c) => c.id === id);
    if (idx === -1) return;
    const targetIdx = direction === 'prev' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= localCategories.length) return;

    const updated: CategoryItem[] = [...localCategories];
    const [moved] = updated.splice(idx, 1);
    updated.splice(targetIdx, 0, moved);

    await handleReorder(updated);
  };

  // Filter categories by search
  const filteredCategories = localCategories.filter((cat) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      cat.name.toLowerCase().includes(q) ||
      (cat.subtitle && cat.subtitle.toLowerCase().includes(q)) ||
      (cat.tag && cat.tag.toLowerCase().includes(q)) ||
      cat.id.toLowerCase().includes(q)
    );
  });

  // Open modal for adding new category
  const handleOpenAdd = () => {
    setEditingCatId(null);
    setFormName('');
    setFormSubtitle('');
    setFormTag('');
    setFormImage('');
    setShowUrlInput(false);
    setIsModalOpen(true);
  };

  // Open modal for editing category
  const handleOpenEdit = (cat: CategoryItem) => {
    setEditingCatId(cat.id);
    setFormName(cat.name);
    setFormSubtitle(cat.subtitle || '');
    setFormTag(cat.tag || '');
    setFormImage(cat.image || '');
    setShowUrlInput(Boolean(cat.image && cat.image.startsWith('http')));
    setIsModalOpen(true);
  };

  // Upload category image (exact same reliable pipeline as product image upload)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { base64Data, mime } = await compressImageFile(file, 1200, 0.85);
      if (!base64Data) {
        setIsUploading(false);
        return;
      }

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
        const permanentUrl = result.staticUrl || result.url || base64Data;
        setFormImage(permanentUrl);
      } else {
        // Fallback to compressed base64 if server upload endpoint fails
        setFormImage(base64Data);
      }
    } catch (err) {
      console.warn('Category image upload error, using fallback:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Save Category (Add or Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || isSaving || isUploading) return;

    setIsSaving(true);
    try {
      const trimmedName = formName.trim();
      const trimmedSubtitle = formSubtitle.trim();
      const trimmedTag = formTag.trim();
      const cleanImage = formImage.trim();

      if (editingCatId) {
        await onUpdateCategory(editingCatId, {
          name: trimmedName,
          subtitle: trimmedSubtitle,
          image: cleanImage,
          tag: trimmedTag
        });
      } else {
        // Generate a clean slug or unique id
        const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const newId = slug || `cat-${Date.now().toString(36)}`;

        await onAddCategory({
          id: newId,
          name: trimmedName,
          subtitle: trimmedSubtitle,
          image: cleanImage,
          tag: trimmedTag || 'Drop'
        });
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save category:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Confirm and delete category
  const handleConfirmDelete = async () => {
    if (!categoryToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await onDeleteCategory(categoryToDelete.id);
      setCategoryToDelete(null);
    } catch (err) {
      console.error('Failed to delete category:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Refresh categories from server
  const handleRefresh = async () => {
    if (!onRefreshCategories || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefreshCategories();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Card with Title, Count, Search and Add Button */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-neutral-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg sm:text-xl font-black text-neutral-900 tracking-tight">
                Categories & Showcase Slider
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-neutral-900 text-white font-mono">
                {categories.length}
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Upload photos, set captions, and manage categories for the top storefront slider.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {onRefreshCategories && (
              <button
                type="button"
                disabled={isRefreshing}
                onClick={handleRefresh}
                title="Refresh categories from server"
                className="p-2.5 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-4 py-2.5 rounded-2xl bg-[#0d0f12] hover:bg-neutral-800 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Add New Category</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories by name, subtitle or tag..."
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-neutral-50 rounded-2xl border border-neutral-200 text-neutral-900 focus:outline-none focus:bg-white focus:border-neutral-400 transition-all"
          />
        </div>
      </div>

      {/* Drag & Drop Instructions & Real-Time Sync Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-neutral-50 rounded-2xl border border-neutral-200/80 text-xs">
        <div className="flex items-center gap-2 text-neutral-700">
          <GripVertical className="w-4 h-4 text-neutral-400 shrink-0" />
          <span>
            <strong className="font-semibold text-neutral-900">Drag-and-Drop Reordering:</strong> Drag any category card or use the ◀ ▶ buttons to reorder. The top order is immediately synchronized with the storefront category slider.
          </span>
        </div>
        {isSavingOrder ? (
          <span className="inline-flex items-center gap-1.5 font-bold text-neutral-900 shrink-0 bg-white px-2.5 py-1 rounded-full border border-neutral-200">
            <RefreshCw className="w-3 h-3 animate-spin text-neutral-900" />
            Saving order...
          </span>
        ) : orderSavedToast ? (
          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600 shrink-0 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <Check className="w-3.5 h-3.5" />
            Slider order synced!
          </span>
        ) : null}
      </div>

      {/* 2. Category Cards Grid */}
      {filteredCategories.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-neutral-200/80 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-neutral-800">
            {searchQuery ? 'No matching categories found' : 'No categories created yet'}
          </h4>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            {searchQuery
              ? 'Try searching with a different keyword or clear the search query.'
              : 'Add your first category with an uploaded photo and caption to show in the store.'}
          </p>
          {!searchQuery && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm hover:bg-neutral-800 transition-all"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Create First Category</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredCategories.map((cat, displayIdx) => {
            const actualIdx = localCategories.findIndex((c) => c.id === cat.id);
            const isFirst = actualIdx === 0;
            const isLast = actualIdx === localCategories.length - 1;
            const isDragging = draggedCatId === cat.id;
            const isDragOver = dragOverCatId === cat.id;

            const linkedProductsCount = products.filter(
              (p) =>
                p.category.toLowerCase() === cat.id.toLowerCase() ||
                p.category.toLowerCase() === cat.name.toLowerCase()
            ).length;

            return (
              <div
                key={cat.id}
                draggable={!searchQuery}
                onDragStart={(e) => handleDragStart(e, cat.id)}
                onDragOver={(e) => handleDragOver(e, cat.id)}
                onDragLeave={(e) => handleDragLeave(e, cat.id)}
                onDrop={(e) => handleDrop(e, cat.id)}
                onDragEnd={() => {
                  setDraggedCatId(null);
                  setDragOverCatId(null);
                }}
                className={`bg-white rounded-3xl p-4 border transition-all duration-200 flex flex-col justify-between group relative cursor-grab active:cursor-grabbing select-none ${
                  isDragging
                    ? 'opacity-30 scale-[0.98] border-dashed border-2 border-neutral-400 bg-neutral-100'
                    : isDragOver
                    ? 'ring-2 ring-neutral-900 border-neutral-900 bg-neutral-50 scale-[1.02] shadow-xl'
                    : 'border-neutral-200/80 hover:border-neutral-300 hover:shadow-md'
                }`}
              >
                {/* Drag Handle & Order Reorder Header Bar */}
                <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-neutral-100">
                  <div className="flex items-center gap-1.5">
                    <span className="p-1 rounded-md bg-neutral-100 text-neutral-400 group-hover:text-neutral-700 transition-colors">
                      <GripVertical className="w-3.5 h-3.5" />
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-neutral-900 text-white">
                      #{actualIdx !== -1 ? actualIdx + 1 : displayIdx + 1}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-medium">
                      Slider Position
                    </span>
                  </div>

                  {/* Quick Shift buttons */}
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      disabled={isFirst || Boolean(searchQuery)}
                      onClick={() => handleShift(cat.id, 'prev')}
                      title="Move category earlier in slider sequence"
                      className="p-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={isLast || Boolean(searchQuery)}
                      onClick={() => handleShift(cat.id, 'next')}
                      title="Move category later in slider sequence"
                      className="p-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Top Section: Photo + Texts */}
                <div className="flex items-start gap-3.5">
                  {/* Category Image Thumbnail */}
                  <div className="w-16 h-16 rounded-2xl bg-neutral-100 p-1 border border-neutral-200/80 overflow-hidden shrink-0 shadow-inner flex items-center justify-center">
                    {cat.image ? (
                      <img
                        src={cat.image}
                        alt={cat.name}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1577212017184-80cc0da11082?auto=format&fit=crop&w=400&q=80';
                        }}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-neutral-300" />
                    )}
                  </div>

                  {/* Title & Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
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

                    <div className="flex items-center gap-2 mt-2 text-[11px] font-semibold text-neutral-500">
                      <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700">
                        {linkedProductsCount} {linkedProductsCount === 1 ? 'product' : 'products'}
                      </span>
                      <span className="font-mono text-[10px] text-neutral-400 truncate">
                        ID: {cat.id}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions Bar */}
                <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-neutral-100" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Live in Store
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(cat)}
                      className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCategoryToDelete(cat)}
                      className="p-1.5 rounded-xl bg-neutral-100 hover:bg-rose-50 text-neutral-400 hover:text-rose-600 transition-all active:scale-95 cursor-pointer"
                      title="Delete category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. ADD / EDIT CATEGORY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-3xl border border-neutral-200 shadow-2xl p-6 sm:p-7 space-y-5 my-auto max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-800">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-neutral-900">
                    {editingCatId ? 'Edit Category & Photo' : 'Add New Category'}
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Set caption and upload photograph for the slider
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="space-y-4">
              {/* Category Name / Title */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Category Name * (ক্যাটাগরি নাম)
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Real Madrid, Retro Classics, Tracksuits"
                  className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:bg-white focus:border-neutral-900 transition-all font-medium"
                />
              </div>

              {/* Category Subtitle / Caption */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Caption / Subtitle (ক্যাপশন / বিবরণ)
                </label>
                <input
                  type="text"
                  value={formSubtitle}
                  onChange={(e) => setFormSubtitle(e.target.value)}
                  placeholder="e.g. 24/25 Champions, Vintage Vault, Official Drops"
                  className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:bg-white focus:border-neutral-900 transition-all"
                />
              </div>

              {/* Category Tag / Badge */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Tag / Badge (ট্যাগ / ব্যাজ - ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={formTag}
                  onChange={(e) => setFormTag(e.target.value)}
                  placeholder="e.g. Drop 01, Exclusive, New, Vault"
                  className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:bg-white focus:border-neutral-900 transition-all font-mono"
                />
              </div>

              {/* Category Photo / Image Upload (Exact mirror of Product Photo upload) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-neutral-700">
                    Category Photo / Logo (ছবি / লোগো)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="text-[10px] font-semibold text-neutral-500 hover:text-neutral-900 underline"
                  >
                    {showUrlInput ? 'Hide URL input' : 'Paste web link'}
                  </button>
                </div>

                {/* Live Photo Preview + Upload Trigger */}
                <div className="space-y-2.5">
                  {formImage ? (
                    <div className="relative w-full h-36 rounded-2xl bg-neutral-100 border border-neutral-200 overflow-hidden group">
                      <img
                        src={formImage}
                        alt="Category Preview"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1577212017184-80cc0da11082?auto=format&fit=crop&w=400&q=80';
                        }}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="px-3 py-1.5 rounded-xl bg-white text-neutral-900 text-xs font-bold flex items-center gap-1.5 shadow-md"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Change Photo</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormImage('')}
                          className="p-1.5 rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-md"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => !isUploading && fileInputRef.current?.click()}
                      className={`w-full h-32 rounded-2xl border-2 border-dashed border-neutral-300 hover:border-neutral-900 bg-neutral-50 hover:bg-neutral-100 flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all ${
                        isUploading ? 'opacity-60 pointer-events-none' : ''
                      }`}
                    >
                      {isUploading ? (
                        <>
                          <RefreshCw className="w-6 h-6 text-neutral-600 animate-spin mb-2" />
                          <span className="text-xs font-bold text-neutral-800">
                            Uploading photo to server disk...
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-xl bg-white border border-neutral-200 flex items-center justify-center text-neutral-700 mb-2 shadow-sm">
                            <Upload className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold text-neutral-800">
                            Click to upload category photo
                          </span>
                          <span className="text-[10px] text-neutral-400 mt-0.5">
                            PNG, JPG, WebP supported (auto-compressed & stored permanently)
                          </span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Hidden File Input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    disabled={isUploading || isSaving}
                    className="hidden"
                  />

                  {/* Optional Direct URL Input */}
                  {showUrlInput && (
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={formImage}
                        onChange={(e) => setFormImage(e.target.value)}
                        placeholder="https://... or /uploads/..."
                        className="w-full px-3 py-1.5 text-[11px] bg-neutral-50 border border-neutral-200 rounded-xl font-mono text-neutral-800 focus:outline-none focus:bg-white"
                      />
                      <p className="text-[10px] text-neutral-400">
                        Paste any direct web image URL or CDN link.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold transition-all disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving || isUploading || !formName.trim()}
                  className="px-5 py-2.5 rounded-2xl bg-[#0d0f12] hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving to Server...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{editingCatId ? 'Save Changes' : 'Create Category'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. DELETE CONFIRMATION MODAL */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl border border-neutral-200 shadow-2xl p-6 space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-sm font-extrabold text-neutral-900">
                Delete Category?
              </h3>
              <p className="text-xs text-neutral-500">
                Are you sure you want to permanently delete{' '}
                <span className="font-bold text-neutral-900">
                  "{categoryToDelete.name}"
                </span>
                ? This will immediately remove it from the slider and database.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setCategoryToDelete(null)}
                className="flex-1 py-2.5 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {isDeleting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
