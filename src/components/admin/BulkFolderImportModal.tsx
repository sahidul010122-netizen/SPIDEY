import React, { useState, useEffect, useRef } from 'react';
import {
  Folder,
  FolderUp,
  FolderCheck,
  UploadCloud,
  Check,
  CheckSquare,
  Square,
  Sparkles,
  RefreshCw,
  Tag,
  DollarSign,
  Package,
  Layers,
  ShieldCheck,
  AlertCircle,
  X,
  ChevronRight,
  Eye,
  Sliders,
  CheckCircle2,
  ExternalLink,
  Info,
  FileText,
  AlignLeft,
  Copy,
  Wand2,
  ListPlus,
  HelpCircle
} from 'lucide-react';
import { JerseyProduct } from '../../types';
import { CategoryItem } from '../../types/settings';
import { CurrencyCode, formatPrice } from '../../utils/currency';

export interface StorageFolder {
  id: string;
  name: string;
  path: string;
  imageCount: number;
  sampleThumbnails: string[];
}

export interface FolderImageItem {
  filename: string;
  url: string;
  size: number;
  modifiedAt: string;
  cleanTitle: string;
  alreadyUsed: boolean;
  selected?: boolean;
  customTitle?: string;
  customCaption?: string;
}

interface BulkFolderImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryItem[];
  existingProducts: JerseyProduct[];
  onImportSuccess: (createdProducts: JerseyProduct[]) => void;
  currency: CurrencyCode;
}

export const BulkFolderImportModal: React.FC<BulkFolderImportModalProps> = ({
  isOpen,
  onClose,
  categories,
  existingProducts,
  onImportSuccess,
  currency
}) => {
  // Navigation / Tabs
  const [sourceMode, setSourceMode] = useState<'r2_folder' | 'local_folder'>('r2_folder');

  // R2 / Server Folders
  const [folders, setFolders] = useState<StorageFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('uploads');
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);

  // Images in selected folder
  const [folderImages, setFolderImages] = useState<FolderImageItem[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [filterUnusedOnly, setFilterUnusedOnly] = useState(false);

  // Local Folder Upload state
  const localFolderInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingLocalFiles, setIsUploadingLocalFiles] = useState(false);
  const [localUploadProgress, setLocalUploadProgress] = useState({ current: 0, total: 0 });

  // Batch Configuration form
  const [batchCategory, setBatchCategory] = useState<string>(() => categories[0]?.id || 'EDC');
  const [customCategory, setCustomCategory] = useState<string>('');
  // Product Title / Name Configuration (User requested: product title/name that displays under each jersey)
  const [commonTitle, setCommonTitle] = useState<string>('');
  const [titleMode, setTitleMode] = useState<'common' | 'individual'>('common');
  const [titlePattern, setTitlePattern] = useState<'exact' | 'numbered' | 'category_title' | 'clean_name' | 'prefix_name'>('exact');
  const [titlePrefix, setTitlePrefix] = useState<string>('');

  // Optional Product Description / Details state
  const [sharedCaption, setSharedCaption] = useState<string>(
    '2025/26 Premium Authentic Player Edition Jersey crafted with ultralight aeroready moisture-wicking matrix, heat-bonded silicone crest, and laser-cut ventilation zones.'
  );
  const [captionMode, setCaptionMode] = useState<'common' | 'individual'>('common');
  const [showCaptionPreview, setShowCaptionPreview] = useState<boolean>(false);
  const [showDescriptionSection, setShowDescriptionSection] = useState<boolean>(false);
  const [batchPrice, setBatchPrice] = useState<string>('1150');
  const [batchOriginalPrice, setBatchOriginalPrice] = useState<string>('1450');
  const [batchStockCount, setBatchStockCount] = useState<string>('20');
  const [batchSeason, setBatchSeason] = useState<string>('2025/26');
  const [batchEdition, setBatchEdition] = useState<string>('Player Issue Authentic');
  const [batchBadge, setBatchBadge] = useState<string>('New Drop');
  const [selectedSizes, setSelectedSizes] = useState<string[]>(['S', 'M', 'L', 'XL', 'XXL', '3XL']);
  const [isInStock, setIsInStock] = useState<boolean>(true);

  // Execution state
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successSummary, setSuccessSummary] = useState<{
    count: number;
    category: string;
    products: JerseyProduct[];
  } | null>(null);

  // Load available storage folders on open
  const fetchFolders = async () => {
    setIsLoadingFolders(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/storage/folders');
      const data = await res.json();
      if (data.success && Array.isArray(data.folders)) {
        setFolders(data.folders);
        if (data.folders.length > 0 && !selectedFolderId) {
          setSelectedFolderId(data.folders[0].id);
        }
      }
    } catch (err) {
      console.warn('Failed to load storage folders:', err);
    } finally {
      setIsLoadingFolders(false);
    }
  };

  // Load images in chosen folder
  const fetchFolderImages = async (folderId: string) => {
    setIsLoadingImages(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/storage/folder-images?folder=${encodeURIComponent(folderId)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.images)) {
        // Pre-select all images by default
        const mapped = data.images.map((img: FolderImageItem) => ({
          ...img,
          selected: true
        }));
        setFolderImages(mapped);
      } else {
        setFolderImages([]);
      }
    } catch (err) {
      console.warn('Failed to load folder images:', err);
      setFolderImages([]);
    } finally {
      setIsLoadingImages(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSuccessSummary(null);
      setErrorMsg(null);
      fetchFolders();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && selectedFolderId && sourceMode === 'r2_folder') {
      fetchFolderImages(selectedFolderId);
    }
  }, [selectedFolderId, sourceMode, isOpen]);

  if (!isOpen) return null;

  // Selected images count
  const displayedImages = filterUnusedOnly ? folderImages.filter((img) => !img.alreadyUsed) : folderImages;
  const selectedImagesList = folderImages.filter((img) => img.selected);
  const selectedCount = selectedImagesList.length;

  // Image selection helpers
  const handleToggleSelectAll = (select: boolean) => {
    setFolderImages((prev) =>
      prev.map((img) => {
        if (filterUnusedOnly && img.alreadyUsed) return img;
        return { ...img, selected: select };
      })
    );
  };

  const handleToggleSingleImage = (filename: string) => {
    setFolderImages((prev) =>
      prev.map((img) => (img.filename === filename ? { ...img, selected: !img.selected } : img))
    );
  };

  const handleToggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  // Local Folder Picker & Direct Upload to R2 Handler
  const handleLocalFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList: File[] = Array.from(files) as File[];
    const imageFiles = fileList.filter((file) =>
      file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg|avif)$/i.test(file.name)
    );

    if (imageFiles.length === 0) {
      setErrorMsg('No image files found in the selected folder.');
      return;
    }

    setIsUploadingLocalFiles(true);
    setLocalUploadProgress({ current: 0, total: imageFiles.length });
    setErrorMsg(null);

    const uploadedItems: FolderImageItem[] = [];

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      try {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type || 'image/jpeg',
            base64Data
          })
        });

        const uploadData = await uploadRes.json();
        if (uploadData.success && (uploadData.staticUrl || uploadData.url)) {
          const itemUrl = uploadData.staticUrl || uploadData.url;
          uploadedItems.push({
            filename: file.name,
            url: itemUrl,
            size: file.size,
            modifiedAt: new Date().toISOString(),
            cleanTitle: file.name
              .replace(/\.[^/.]+$/, '')
              .replace(/^\d+[-_]/, '')
              .replace(/[-_]/g, ' ')
              .trim(),
            alreadyUsed: false,
            selected: true
          });
        }
      } catch (uploadErr) {
        console.warn(`Failed to upload ${file.name}:`, uploadErr);
      }
      setLocalUploadProgress({ current: i + 1, total: imageFiles.length });
    }

    setIsUploadingLocalFiles(false);

    if (uploadedItems.length > 0) {
      setFolderImages(uploadedItems);
      // Auto-refresh folders so R2 list updates
      fetchFolders();
    } else {
      setErrorMsg('Failed to upload any images from the folder.');
    }
  };

  // Product Title resolver for storefront display & import
  const getResolvedTitle = (idx: number, item?: FolderImageItem) => {
    const finalCategory = batchCategory === 'custom' && customCategory.trim() ? customCategory.trim() : batchCategory;
    const cleanName = item ? item.cleanTitle : `Item ${idx + 1}`;

    // 1. If individual mode, respect each image's custom title
    if (titleMode === 'individual') {
      if (item?.customTitle && item.customTitle.trim()) {
        return item.customTitle.trim();
      }
      return commonTitle.trim() || cleanName;
    }

    // 2. Common Title mode
    if (commonTitle.trim()) {
      if (titlePattern === 'exact') {
        return commonTitle.trim();
      }
      if (titlePattern === 'numbered') {
        return `${commonTitle.trim()} #${idx + 1}`;
      }
      if (titlePattern === 'category_title') {
        return `${finalCategory} - ${commonTitle.trim()} #${idx + 1}`;
      }
      if (titlePattern === 'prefix_name') {
        return `${titlePrefix.trim() ? titlePrefix.trim() + ' ' : ''}${cleanName}`;
      }
      return commonTitle.trim();
    }

    // 3. Prefix + filename
    if (titlePattern === 'prefix_name') {
      return `${titlePrefix.trim() ? titlePrefix.trim() + ' ' : ''}${cleanName}`;
    }

    return cleanName;
  };

  // Caption template generator
  const applyCaptionTemplate = (type: 'jersey' | 'offer' | 'minimal') => {
    const finalCategory = batchCategory === 'custom' && customCategory.trim() ? customCategory.trim() : batchCategory;
    if (type === 'jersey') {
      setSharedCaption(
`🔥 {title}
🏆 Season: ${batchSeason || '2025/26'} | ${batchEdition || 'Player Issue Authentic'}
💰 Price: ৳${batchPrice || '1150'}${batchOriginalPrice ? ` (Regular: ৳${batchOriginalPrice})` : ''}
📏 Available Sizes: ${selectedSizes.join(', ')}
🏷️ SKU / Code: {code}

✨ Product Features:
• 100% Breathable moisture-wicking aerodynamic fabric
• High-definition heat-pressed silicone crest & sponsors
• Precision laser-cut ventilation zone mapping

🚚 Delivery Details:
• Inside Dhaka: 60৳
• Outside Dhaka: 120৳ (Cash on Delivery available)
🛒 অর্ডার করতে সরাসরি ওয়েবসাইটে 'Order Now' প্রেস করুন!`
      );
    } else if (type === 'offer') {
      setSharedCaption(
`⚡ SPECIAL DROP OFFER: {title}
💥 Offer Price: ৳${batchPrice || '1150'}${batchOriginalPrice ? ` (Original: ৳${batchOriginalPrice})` : ''}
🏷️ Unique Code: {code} | Category: ${finalCategory}
📦 In Stock: ${batchStockCount || '20'} pcs available
📏 Sizes: ${selectedSizes.join(', ')}

🚚 Fast Nationwide Delivery via Steadfast
⚠️ Limited collection drop. Order now before stock runs out!`
      );
    } else if (type === 'minimal') {
      setSharedCaption(
`{title}
Category: ${finalCategory} | Edition: ${batchEdition || 'Authentic'}
Price: ৳${batchPrice || '1150'} | Code: {code}
Sizes: ${selectedSizes.join(', ')}`
      );
    }
  };

  const insertVariableIntoCaption = (varName: string) => {
    setSharedCaption((prev) => `${prev.trimEnd()} {${varName}}`);
  };

  const handleSetIndividualTitle = (filename: string, text: string) => {
    setFolderImages((prev) =>
      prev.map((img) => (img.filename === filename ? { ...img, customTitle: text } : img))
    );
  };

  const copyCommonTitleToAllImages = () => {
    if (!commonTitle.trim()) return;
    setFolderImages((prev) =>
      prev.map((img) => ({ ...img, customTitle: commonTitle.trim() }))
    );
  };

  const resetTitlesToCleanFileNames = () => {
    setFolderImages((prev) =>
      prev.map((img) => ({ ...img, customTitle: img.cleanTitle }))
    );
  };

  const handleSetIndividualCaption = (filename: string, text: string) => {
    setFolderImages((prev) =>
      prev.map((img) => (img.filename === filename ? { ...img, customCaption: text } : img))
    );
  };

  const copyCommonCaptionToAllImages = () => {
    setFolderImages((prev) =>
      prev.map((img) => ({ ...img, customCaption: sharedCaption }))
    );
  };

  const previewResolvedCaption = () => {
    const sampleTitle = selectedImagesList[0]
      ? getResolvedTitle(0, selectedImagesList[0])
      : (commonTitle.trim() || `${batchCategory} Player Edition Kit`);
    const sampleCode = sampleUniqueCodes[0] || 'SJ-M8K2P';
    const finalCategory = batchCategory === 'custom' && customCategory.trim() ? customCategory.trim() : batchCategory;
    return sharedCaption
      .replace(/{title}/gi, sampleTitle)
      .replace(/{code}/gi, sampleCode)
      .replace(/{price}/gi, batchPrice || '1150')
      .replace(/{category}/gi, finalCategory)
      .replace(/{sizes}/gi, selectedSizes.join(', '))
      .replace(/{edition}/gi, batchEdition || 'Player Issue Authentic');
  };

  // Sample auto-codes preview
  const sampleUniqueCodes = ['SJ-M8K2P', 'SJ-W4L9X', 'SJ-R7Q1Z'].slice(0, Math.min(3, selectedCount || 3));

  // Perform Bulk Product Creation
  const handleExecuteBulkImport = async () => {
    if (selectedCount === 0) {
      setErrorMsg('Please select at least one image to convert into a product.');
      return;
    }

    const finalCategory = batchCategory === 'custom' && customCategory.trim() ? customCategory.trim() : batchCategory;
    if (!finalCategory) {
      setErrorMsg('Please select or specify a category for this import batch.');
      return;
    }

    setIsImporting(true);
    setErrorMsg(null);

    try {
      const payload = {
        category: finalCategory,
        title: commonTitle.trim(),
        commonTitle: commonTitle.trim(),
        titleMode,
        titlePattern,
        titlePrefix: titlePrefix.trim(),
        caption: sharedCaption.trim(),
        price: parseFloat(batchPrice) || 1150,
        originalPrice: batchOriginalPrice ? parseFloat(batchOriginalPrice) : undefined,
        season: batchSeason.trim() || '2025/26',
        edition: batchEdition.trim() || 'Player Issue Authentic',
        badge: batchBadge.trim() || 'New Drop',
        sizes: selectedSizes,
        stockCount: parseInt(batchStockCount, 10) || 20,
        inStock: isInStock,
        customizable: true,
        selectedImages: selectedImagesList.map((item, idx) => ({
          filename: item.filename,
          url: item.url,
          title: getResolvedTitle(idx, item),
          caption:
            captionMode === 'individual' && item.customCaption && item.customCaption.trim()
              ? item.customCaption.trim()
              : sharedCaption.trim()
        })),
        folder: selectedFolderId
      };

      const res = await fetch('/api/products/bulk-import-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        setSuccessSummary({
          count: data.count,
          category: finalCategory,
          products: data.products
        });
        onImportSuccess(data.products);
      } else {
        setErrorMsg(data.message || 'Bulk import failed. Please verify inputs.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error during bulk import.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white rounded-3xl border border-neutral-200/80 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-fadeIn">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 sm:px-8 sm:py-5 bg-neutral-950 text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <FolderUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-white">
                  Bulk Product Upload from R2 / Storage Folder
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Auto-SKU & Batch
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Scan an R2 or storage folder to convert all images into draft products with unique SKU codes and a shared caption.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">

          {/* SUCCESS SCREEN STATE */}
          {successSummary ? (
            <div className="py-8 px-4 text-center space-y-6 max-w-xl mx-auto animate-fadeIn">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
              </div>

              <div>
                <h4 className="text-xl font-extrabold text-neutral-900">
                  Successfully Generated {successSummary.count} Products!
                </h4>
                <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
                  Every product has been assigned to <strong className="text-neutral-800">"{successSummary.category}"</strong>, given a unique <strong className="font-mono text-neutral-800">SJ-XXXXX</strong> code, and synchronized with your live catalog.
                </p>
              </div>

              {/* Sample Created Products List */}
              <div className="bg-neutral-50 rounded-2xl border border-neutral-200 p-3 text-left max-h-48 overflow-y-auto space-y-2">
                {successSummary.products.map((p, i) => (
                  <div key={p.id || i} className="flex items-center justify-between gap-3 p-2 bg-white rounded-xl border border-neutral-200/80 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={p.images?.[0]}
                        alt={p.title}
                        className="w-8 h-8 rounded-lg object-cover bg-neutral-100 border border-neutral-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-neutral-900 truncate">{p.title}</div>
                        <div className="text-[10px] text-neutral-500 font-mono">Code: {p.code} • ৳{p.price}</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                      Active
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                >
                  View in Product Catalog
                </button>
                <button
                  onClick={() => {
                    setSuccessSummary(null);
                    fetchFolderImages(selectedFolderId);
                  }}
                  className="px-4 py-2.5 rounded-2xl border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-bold text-xs transition-all"
                >
                  Import Another Folder
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* ERROR MESSAGE NOTIFICATION */}
              {errorMsg && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                  <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-800">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* STEP 1: SOURCE SELECTION (TABS) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-extrabold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-[10px] font-mono flex items-center justify-center font-bold">1</span>
                    Target Source & Folder Selection
                  </span>

                  {/* Mode switch */}
                  <div className="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200/80 text-xs">
                    <button
                      type="button"
                      onClick={() => setSourceMode('r2_folder')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all ${
                        sourceMode === 'r2_folder'
                          ? 'bg-white text-neutral-900 shadow-sm'
                          : 'text-neutral-500 hover:text-neutral-900'
                      }`}
                    >
                      Browse R2 / Cloud Storage
                    </button>
                    <button
                      type="button"
                      onClick={() => setSourceMode('local_folder')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all ${
                        sourceMode === 'local_folder'
                          ? 'bg-white text-neutral-900 shadow-sm'
                          : 'text-neutral-500 hover:text-neutral-900'
                      }`}
                    >
                      Upload Local Folder
                    </button>
                  </div>
                </div>

                {sourceMode === 'r2_folder' ? (
                  /* R2 / STORAGE FOLDERS LIST */
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {isLoadingFolders ? (
                        <div className="col-span-full py-6 text-center text-xs text-neutral-500 flex items-center justify-center gap-2 font-bold">
                          <RefreshCw className="w-4 h-4 animate-spin text-neutral-700" />
                          Scanning storage folders...
                        </div>
                      ) : (
                        folders.map((folder) => {
                          const isSelected = selectedFolderId === folder.id;
                          return (
                            <div
                              key={folder.id}
                              onClick={() => setSelectedFolderId(folder.id)}
                              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                                isSelected
                                  ? 'border-neutral-950 bg-neutral-950 text-white shadow-md ring-2 ring-neutral-950/20'
                                  : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100/80 text-neutral-900'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Folder className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-neutral-600'}`} />
                                  <span className="text-xs font-extrabold truncate">{folder.name}</span>
                                </div>
                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                                  isSelected ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-700'
                                }`}>
                                  {folder.imageCount} imgs
                                </span>
                              </div>

                              {/* Sample thumbnails strip */}
                              <div className="flex items-center gap-1 overflow-hidden h-8">
                                {folder.sampleThumbnails.slice(0, 4).map((thumb, i) => (
                                  <img
                                    key={i}
                                    src={thumb}
                                    alt="sample"
                                    className="w-8 h-8 rounded-lg object-cover bg-neutral-200 border border-white/20 shrink-0"
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                ) : (
                  /* LOCAL FOLDER UPLOAD SECTION */
                  <div className="p-5 rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50/70 text-center space-y-3">
                    <input
                      type="file"
                      ref={localFolderInputRef}
                      onChange={handleLocalFolderSelect}
                      // @ts-ignore
                      webkitdirectory="true"
                      directory="true"
                      multiple
                      accept="image/*"
                      className="hidden"
                    />

                    <div className="w-12 h-12 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center mx-auto text-neutral-700 shadow-sm">
                      <UploadCloud className="w-6 h-6" />
                    </div>

                    <div>
                      <h5 className="text-xs font-bold text-neutral-900">
                        Select a folder containing images from your computer
                      </h5>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        Supports JPG, PNG, WEBP, and AVIF. All images will be saved directly into Cloudflare R2 / Storage and prepared for product generation.
                      </p>
                    </div>

                    <div className="pt-1">
                      <button
                        type="button"
                        disabled={isUploadingLocalFiles}
                        onClick={() => localFolderInputRef.current?.click()}
                        className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
                      >
                        {isUploadingLocalFiles ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Uploading ({localUploadProgress.current}/{localUploadProgress.total})...</span>
                          </>
                        ) : (
                          <>
                            <FolderUp className="w-3.5 h-3.5" />
                            <span>Choose Folder from Device</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* DETECTED IMAGES GALLERY & SELECTION TOOLBAR */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-neutral-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-900">
                      Detected Folder Images ({displayedImages.length})
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-neutral-900 text-white">
                      {selectedCount} Selected for Import
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => handleToggleSelectAll(true)}
                      className="text-neutral-600 hover:text-neutral-900 font-bold underline text-[11px]"
                    >
                      Select All
                    </button>
                    <span className="text-neutral-300">•</span>
                    <button
                      type="button"
                      onClick={() => handleToggleSelectAll(false)}
                      className="text-neutral-600 hover:text-neutral-900 font-bold underline text-[11px]"
                    >
                      Deselect All
                    </button>
                    <span className="text-neutral-300">•</span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-neutral-600 font-medium">
                      <input
                        type="checkbox"
                        checked={filterUnusedOnly}
                        onChange={(e) => setFilterUnusedOnly(e.target.checked)}
                        className="rounded border-neutral-300 text-neutral-900 focus:ring-0"
                      />
                      <span>Hide Already Used</span>
                    </label>
                  </div>
                </div>

                {/* IMAGES GRID */}
                {isLoadingImages ? (
                  <div className="py-12 text-center text-xs text-neutral-500 font-bold flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-neutral-800" />
                    Scanning folder images...
                  </div>
                ) : displayedImages.length === 0 ? (
                  <div className="p-8 text-center text-xs text-neutral-500 bg-neutral-50 rounded-2xl border border-neutral-200">
                    No images found in the selected folder.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 max-h-60 overflow-y-auto p-1 bg-neutral-50/60 rounded-2xl border border-neutral-200/80">
                    {displayedImages.map((img) => (
                      <div
                        key={img.filename}
                        onClick={() => handleToggleSingleImage(img.filename)}
                        className={`group relative rounded-xl border overflow-hidden cursor-pointer transition-all bg-white flex flex-col justify-between ${
                          img.selected
                            ? 'border-neutral-900 ring-2 ring-neutral-900 shadow-sm'
                            : 'border-neutral-200 opacity-60 hover:opacity-100'
                        }`}
                      >
                        {/* Checkbox badge */}
                        <div className="absolute top-1.5 left-1.5 z-10 bg-white/90 backdrop-blur-sm rounded-md p-0.5 shadow-sm">
                          {img.selected ? (
                            <CheckSquare className="w-3.5 h-3.5 text-neutral-950" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-neutral-400" />
                          )}
                        </div>

                        {/* Already used badge */}
                        {img.alreadyUsed && (
                          <div className="absolute top-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-amber-500 text-white shadow-sm">
                            In Use
                          </div>
                        )}

                        <div className="w-full aspect-square bg-neutral-100 overflow-hidden">
                          <img
                            src={img.url}
                            alt={img.cleanTitle}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>

                        <div className="p-1.5 text-[10px] bg-white border-t border-neutral-100">
                          <div className="font-bold text-neutral-900 truncate" title={img.filename}>
                            {img.cleanTitle}
                          </div>
                          <div className="text-[9px] text-neutral-400 font-mono">
                            {(img.size / 1024).toFixed(0)} KB
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* STEP 2: BATCH CONFIGURATION */}
              <div className="space-y-4 pt-3 border-t border-neutral-100">
                <span className="text-xs font-extrabold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-[10px] font-mono flex items-center justify-center font-bold">2</span>
                  Batch Configuration Options
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Category Selection */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      Category Selection *
                    </label>
                    <select
                      value={batchCategory}
                      onChange={(e) => setBatchCategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:bg-white font-bold"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                      <option value="custom">+ Custom Category</option>
                    </select>

                    {batchCategory === 'custom' && (
                      <input
                        type="text"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        placeholder="Enter category name"
                        className="w-full mt-2 px-3 py-1.5 text-xs bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
                      />
                    )}
                  </div>

                  {/* Regular Price (BDT) */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      Price (৳ BDT) *
                    </label>
                    <input
                      type="number"
                      value={batchPrice}
                      onChange={(e) => setBatchPrice(e.target.value)}
                      placeholder="1150"
                      className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:bg-white font-mono font-bold"
                    />
                  </div>

                  {/* Original / Strikethrough Price */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      Original Price (৳ BDT, Optional)
                    </label>
                    <input
                      type="number"
                      value={batchOriginalPrice}
                      onChange={(e) => setBatchOriginalPrice(e.target.value)}
                      placeholder="1450"
                      className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:bg-white font-mono"
                    />
                  </div>
                </div>

                  {/* Additional Attributes (Stock, Badge, Status) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1">
                        Initial Stock Quantity
                      </label>
                      <input
                        type="number"
                        value={batchStockCount}
                        onChange={(e) => setBatchStockCount(e.target.value)}
                        placeholder="20"
                        className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:bg-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1">
                        Badge Label
                      </label>
                      <input
                        type="text"
                        value={batchBadge}
                        onChange={(e) => setBatchBadge(e.target.value)}
                        placeholder="New Drop"
                        className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1">
                        Product Status
                      </label>
                      <div className="flex items-center gap-3 pt-2">
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-neutral-800">
                          <input
                            type="checkbox"
                            checked={isInStock}
                            onChange={(e) => setIsInStock(e.target.checked)}
                            className="rounded border-neutral-300 text-neutral-900 focus:ring-0"
                          />
                          <span>In Stock & Ready</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Sizes Pills Selector */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                      Available Sizes for Products
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {['S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size'].map((sz) => {
                        const isChecked = selectedSizes.includes(sz);
                        return (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => handleToggleSize(sz)}
                            className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all ${
                              isChecked
                                ? 'bg-neutral-900 text-white'
                                : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                            }`}
                          >
                            {sz}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* STEP 3: DEDICATED PRODUCT TITLE / NAME (প্রোডাক্টের নাম বা টাইটেল - যা ডিসপ্লেতে ছবির নিচে শো করবে) */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-neutral-900/10 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-neutral-900 text-white text-xs font-mono flex items-center justify-center font-bold">
                          3
                        </span>
                        <h4 className="text-sm font-extrabold text-neutral-900 flex items-center gap-1.5">
                          <Tag className="w-4 h-4 text-emerald-600" />
                          <span>Product Title / Name (প্রোডাক্টের নাম বা টাইটেল)</span>
                        </h4>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1 pl-8">
                        এখানে যে নামটি দিবেন, সেটি ওয়েবসাইটের হোমপেজে প্রতিটি জার্সির নিচে বড় করে <strong>প্রোডাক্টের নাম (Title)</strong> হিসেবে দেখা যাবে।
                      </p>
                    </div>

                    {/* Title Mode Switcher: Common vs Individual */}
                    <div className="flex items-center p-1 bg-neutral-100 rounded-xl shrink-0 self-start sm:self-auto text-xs">
                      <button
                        type="button"
                        onClick={() => setTitleMode('common')}
                        className={`px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${
                          titleMode === 'common'
                            ? 'bg-neutral-900 text-white shadow-xs'
                            : 'text-neutral-600 hover:text-neutral-900'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Common Title (কমন টাইটেল / একই নাম)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTitleMode('individual')}
                        className={`px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${
                          titleMode === 'individual'
                            ? 'bg-neutral-900 text-white shadow-xs'
                            : 'text-neutral-600 hover:text-neutral-900'
                        }`}
                      >
                        <ListPlus className="w-3.5 h-3.5 text-blue-400" />
                        <span>Per-Image Titles (প্রতিটি আলাদা নাম)</span>
                      </button>
                    </div>
                  </div>

                  {titleMode === 'common' ? (
                    /* Common Product Title Configuration */
                    <div className="space-y-4">
                      {/* Main Title Input Field */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-extrabold text-neutral-900 flex items-center gap-1.5">
                            <span>Common Product Title / Name (প্রোডাক্টের নাম বা টাইটেল) *</span>
                            <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                              ডিসপ্লেতে শো করবে
                            </span>
                          </label>
                          {selectedImagesList[0] && (
                            <button
                              type="button"
                              onClick={() => setCommonTitle(selectedImagesList[0].cleanTitle)}
                              className="text-[11px] font-bold text-neutral-500 hover:text-neutral-900 underline"
                            >
                              Use 1st File Name ({selectedImagesList[0].cleanTitle})
                            </button>
                          )}
                        </div>

                        <div className="relative">
                          <input
                            type="text"
                            value={commonTitle}
                            onChange={(e) => setCommonTitle(e.target.value)}
                            placeholder="e.g. Germany Home Player Edition Jersey 2024/25"
                            className="w-full px-4 py-3 text-sm bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 font-bold focus:outline-none focus:bg-white focus:ring-2 focus:ring-neutral-900 focus:border-transparent placeholder:text-neutral-400 placeholder:font-normal"
                          />
                          {commonTitle && (
                            <button
                              type="button"
                              onClick={() => setCommonTitle('')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-500 mt-1">
                          এখানে নাম লিখলে ব্যাচের সকল জার্সিতে এই নাম চলে আসবে (যেমন: <em>Germany Home Jersey 2024/25</em>)।
                        </p>
                      </div>

                      {/* Naming Pattern Options */}
                      <div className="space-y-2 pt-1">
                        <label className="block text-xs font-bold text-neutral-700">
                          নামকরণের ধরন (Naming Pattern Rule):
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                          <label
                            className={`p-3 rounded-xl border cursor-pointer flex flex-col gap-1 transition-all ${
                              titlePattern === 'exact'
                                ? 'border-neutral-900 bg-neutral-50/80 shadow-xs'
                                : 'border-neutral-200 bg-white hover:bg-neutral-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="titlePattern"
                                checked={titlePattern === 'exact'}
                                onChange={() => setTitlePattern('exact')}
                                className="text-neutral-900 focus:ring-0"
                              />
                              <span className="font-bold text-neutral-900">হুবহু একই নাম থাকবে</span>
                            </div>
                            <span className="text-[11px] text-neutral-500 pl-5 leading-tight">
                              সবগুলো জার্সির টাইটেল সেইম থাকবে (ইউনিক কোড SJ-XXXXX দিয়ে শনাক্ত হবে)
                            </span>
                          </label>

                          <label
                            className={`p-3 rounded-xl border cursor-pointer flex flex-col gap-1 transition-all ${
                              titlePattern === 'numbered'
                                ? 'border-neutral-900 bg-neutral-50/80 shadow-xs'
                                : 'border-neutral-200 bg-white hover:bg-neutral-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="titlePattern"
                                checked={titlePattern === 'numbered'}
                                onChange={() => setTitlePattern('numbered')}
                                className="text-neutral-900 focus:ring-0"
                              />
                              <span className="font-bold text-neutral-900">সিরিয়াল নম্বর যোগ হবে</span>
                            </div>
                            <span className="text-[11px] text-neutral-500 pl-5 leading-tight">
                              নামের শেষে #1, #2, #3 যোগ হবে (যেমন: {commonTitle || 'Jersey'} #1)
                            </span>
                          </label>

                          <label
                            className={`p-3 rounded-xl border cursor-pointer flex flex-col gap-1 transition-all ${
                              titlePattern === 'category_title'
                                ? 'border-neutral-900 bg-neutral-50/80 shadow-xs'
                                : 'border-neutral-200 bg-white hover:bg-neutral-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="titlePattern"
                                checked={titlePattern === 'category_title'}
                                onChange={() => setTitlePattern('category_title')}
                                className="text-neutral-900 focus:ring-0"
                              />
                              <span className="font-bold text-neutral-900">ক্যাটাগরি + নাম</span>
                            </div>
                            <span className="text-[11px] text-neutral-500 pl-5 leading-tight">
                              {batchCategory} - {commonTitle || 'Product'} #1
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Live Storefront Product Card Preview */}
                      <div className="mt-4 p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200/90">
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
                              Live Storefront Display Preview (ওয়েবসাইটে দেখতে যেমন লাগবে)
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            প্রোডাক্ট কার্ড প্রিভিউ
                          </span>
                        </div>

                        <div className="flex items-start gap-3.5 bg-white p-3 rounded-xl border border-neutral-200">
                          <div className="w-20 h-24 rounded-lg bg-neutral-100 overflow-hidden shrink-0 border border-neutral-200 relative flex items-center justify-center">
                            {selectedImagesList[0] ? (
                              <img
                                src={selectedImagesList[0].url}
                                alt="Preview"
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <Package className="w-8 h-8 text-neutral-400" />
                            )}
                            <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-neutral-900 text-amber-300">
                              {batchBadge || 'New Drop'}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            <span className="text-[10px] font-mono font-bold text-neutral-400 block">
                              SKU / Code: {sampleUniqueCodes[0] || 'SJ-M8K2P'}
                            </span>
                            {/* The Exact Title Being Displayed */}
                            <h4 className="text-sm font-extrabold text-neutral-900 leading-snug break-words">
                              {selectedImagesList[0]
                                ? getResolvedTitle(0, selectedImagesList[0])
                                : (commonTitle || 'Product Title Appears Here')}
                            </h4>
                            <div className="flex items-center gap-2 pt-0.5">
                              <span className="text-xs font-bold text-neutral-900 font-mono">
                                ৳{batchPrice || '1150'}
                              </span>
                              {batchOriginalPrice && (
                                <span className="text-[11px] text-neutral-400 line-through font-mono">
                                  ৳{batchOriginalPrice}
                                </span>
                              )}
                              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-medium ml-auto">
                                In Stock ({batchStockCount || 20} pcs)
                              </span>
                            </div>
                            <p className="text-[10px] text-neutral-500 pt-1">
                              ✓ এই নামটিই কাস্টমাররা ওয়েবসাইটের গ্যালারি এবং কার্ডে জার্সির ঠিক নিচে দেখতে পাবে।
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Individual Product Titles per Image */
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                        <div className="text-xs text-neutral-600">
                          প্রতিটি জার্সির জন্য আলাদা আলাদা <strong>নাম/টাইটেল</strong> লিখুন (যা ডিসপ্লেতে শো করবে)।
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {commonTitle.trim() && (
                            <button
                              type="button"
                              onClick={copyCommonTitleToAllImages}
                              className="px-2.5 py-1.5 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-bold transition-all flex items-center gap-1 shadow-xs"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>কমন নাম সবগুলোতে কপি করুন</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={resetTitlesToCleanFileNames}
                            className="px-2.5 py-1.5 rounded-lg bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-xs font-bold transition-all"
                          >
                            ফাইলের নাম অনুযায়ী বসান
                          </button>
                        </div>
                      </div>

                      {selectedImagesList.length === 0 ? (
                        <div className="p-8 text-center text-xs text-neutral-500 bg-white rounded-xl border border-neutral-200">
                          Step 1 এ কোনো ছবি সিলেক্ট করা হয়নি। ছবি সিলেক্ট করলে এখানে প্রতিটি ছবির টাইটেল এডিট করতে পারবেন।
                        </div>
                      ) : (
                        <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                          {selectedImagesList.map((item, idx) => {
                            const currentTitleValue =
                              item.customTitle !== undefined
                                ? item.customTitle
                                : (commonTitle || item.cleanTitle);

                            return (
                              <div
                                key={item.filename}
                                className="p-3 bg-white rounded-xl border border-neutral-200 flex flex-col sm:flex-row gap-3 items-center hover:border-neutral-400 transition-colors"
                              >
                                <div className="w-14 h-14 rounded-lg bg-neutral-100 overflow-hidden shrink-0 border border-neutral-200 relative flex items-center justify-center">
                                  <img
                                    src={item.url}
                                    alt={item.cleanTitle}
                                    className="w-full h-full object-cover"
                                  />
                                  <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-neutral-900/90 text-white text-[9px] font-mono flex items-center justify-center font-bold">
                                    {idx + 1}
                                  </span>
                                </div>

                                <div className="flex-1 w-full space-y-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-bold text-neutral-700">
                                      Product #{idx + 1} Title (নাম):
                                    </span>
                                    <span className="px-2 py-0.5 rounded bg-neutral-100 border border-neutral-300 text-[10px] font-mono font-bold text-neutral-800">
                                      Code: {sampleUniqueCodes[idx] || `SJ-M${idx}K2P`}
                                    </span>
                                  </div>

                                  <input
                                    type="text"
                                    value={currentTitleValue}
                                    onChange={(e) => handleSetIndividualTitle(item.filename, e.target.value)}
                                    placeholder="Enter title for this jersey..."
                                    className="w-full px-3 py-1.5 text-xs bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 font-bold focus:outline-none focus:bg-white focus:ring-1 focus:ring-neutral-900"
                                  />

                                  <div className="flex items-center justify-between text-[10px] text-neutral-400">
                                    <span>File: {item.filename}</span>
                                    <span className="font-semibold text-emerald-700">
                                      Display Title: "{currentTitleValue}"
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* STEP 4: OPTIONAL PRODUCT DESCRIPTION & DETAILS (বিবরণ, সাইজ চার্ট ও ডেলিভারি তথ্য - অপশনাল) */}
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50/60 overflow-hidden text-xs transition-all">
                  <div
                    onClick={() => setShowDescriptionSection(!showDescriptionSection)}
                    className="p-3.5 sm:p-4 bg-neutral-100/70 hover:bg-neutral-100 border-b border-neutral-200 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 font-extrabold text-neutral-900">
                      <span className="w-5 h-5 rounded-full bg-neutral-300 text-neutral-800 text-[10px] font-mono flex items-center justify-center font-bold">
                        4
                      </span>
                      <FileText className="w-4 h-4 text-neutral-600" />
                      <span>Product Description & Size Details (বিবরণ, সাইজ চার্ট ও ডেলিভারি তথ্য - অপশনাল)</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-neutral-500 font-bold">
                        {showDescriptionSection ? 'Hide Details ▲' : 'Add Details & Features ▼'}
                      </span>
                    </div>
                  </div>

                  {showDescriptionSection && (
                    <div className="p-4 sm:p-5 space-y-3 bg-white">
                      <p className="text-[11px] text-neutral-500">
                        টাইটেল ছাড়াও যদি প্রতিটি প্রোডাক্টের ভেতরের পেজে কোনো অতিরিক্ত বিবরণ, সাইজ চার্ট বা ডেলিভারি তথ্য দিতে চান, তবে নিচে লিখতে পারেন।
                      </p>

                      {/* Templates Toolbar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-neutral-50 border border-neutral-200">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-neutral-700 flex items-center gap-1">
                            <Wand2 className="w-3.5 h-3.5 text-amber-500" />
                            <span>Quick Templates:</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => applyCaptionTemplate('jersey')}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-neutral-200 text-neutral-800 text-[11px] font-bold border border-neutral-200 transition-all"
                          >
                            🔥 Jersey Standard
                          </button>
                          <button
                            type="button"
                            onClick={() => applyCaptionTemplate('offer')}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-neutral-200 text-neutral-800 text-[11px] font-bold border border-neutral-200 transition-all"
                          >
                            ⚡ Drop Offer
                          </button>
                          <button
                            type="button"
                            onClick={() => applyCaptionTemplate('minimal')}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-neutral-200 text-neutral-800 text-[11px] font-bold border border-neutral-200 transition-all"
                          >
                            📋 Minimal
                          </button>
                          <button
                            type="button"
                            onClick={() => setSharedCaption('')}
                            className="px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 text-[11px] font-bold transition-all"
                          >
                            Clear
                          </button>
                        </div>

                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] text-neutral-400 font-mono mr-1">Insert Tag:</span>
                          {['title', 'code', 'price', 'category', 'sizes'].map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => insertVariableIntoCaption(t)}
                              className="px-2 py-0.5 rounded-md bg-white hover:bg-neutral-100 text-[10px] font-mono font-bold text-neutral-700 border border-neutral-200 transition-all"
                            >
                              +{`{${t}}`}
                            </button>
                          ))}
                        </div>
                      </div>

                      <textarea
                        rows={6}
                        value={sharedCaption}
                        onChange={(e) => setSharedCaption(e.target.value)}
                        placeholder="Optional: Enter detailed product description, fabric specs, and delivery charges..."
                        className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-neutral-900 font-normal leading-relaxed"
                      />
                    </div>
                  )}
                </div>

                {/* STEP 5: AUTO-GENERATED UNIQUE SKU CODES SUMMARY */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-neutral-50 border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-[10px] font-mono flex items-center justify-center font-bold">
                      5
                    </span>
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="text-xs font-bold text-neutral-900 block">
                        Unique SKU Barcode Generation (স্বয়ংক্রিয় ইউনিক কোড)
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        প্রতিটি জার্সির জন্য স্বয়ংক্রিয়ভাবে ইউনিক কোড যেমন <strong>SJ-M8K2P</strong> তৈরি হবে যা দিয়ে সহজে অর্ডার ট্র্যাক করা যাবে।
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-neutral-500 font-medium">Sample Codes:</span>
                    {sampleUniqueCodes.map((code) => (
                      <span
                        key={code}
                        className="px-2 py-0.5 rounded-md bg-white border border-neutral-300 text-[10px] font-mono font-bold text-neutral-800"
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
            </>
          )}

        </div>

        {/* MODAL FOOTER ACTIONS */}
        {!successSummary && (
          <div className="px-6 py-4 sm:px-8 sm:py-4 bg-neutral-50 border-t border-neutral-200/80 flex items-center justify-between gap-4 shrink-0 flex-wrap">
            <div className="text-xs text-neutral-500 font-medium">
              Ready to generate <strong className="text-neutral-900 font-extrabold">{selectedCount}</strong> products in category <strong className="text-neutral-900">"{batchCategory === 'custom' && customCategory ? customCategory : batchCategory}"</strong>.
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isImporting}
                className="px-4 py-2.5 rounded-2xl border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-bold text-xs transition-all disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isImporting || selectedCount === 0}
                onClick={handleExecuteBulkImport}
                className="px-6 py-2.5 rounded-2xl bg-neutral-950 hover:bg-neutral-800 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-neutral-950/20 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating {selectedCount} Products...</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Import {selectedCount} Products from Folder</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
