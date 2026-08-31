import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ScanLine, 
  Camera, 
  CameraOff, 
  SwitchCamera,
  CheckCircle2, 
  XCircle, 
  Trash2, 
  RefreshCw, 
  Search, 
  Filter, 
  Volume2, 
  VolumeX, 
  Zap, 
  AlertTriangle, 
  Check, 
  Sparkles, 
  Truck, 
  Package, 
  Phone, 
  MapPin, 
  Copy, 
  ExternalLink,
  ShieldAlert,
  Sliders,
  Maximize2,
  Minimize2,
  X,
  Boxes,
  Layers,
  ArrowRight,
  Clock,
  Send,
  Plus,
  Minus,
  Edit3,
  CheckCheck,
  PackageCheck,
  Eye,
  Calendar,
  ChevronRight,
  TrendingDown,
  Info,
  UploadCloud,
  Flashlight,
  Smartphone,
  Lock,
  Settings,
  HelpCircle
} from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import JsBarcode from 'jsbarcode';
import { Order, JerseyProduct } from '../../types';
import { SiteSettings } from '../../types/settings';
import { CurrencyCode, formatPrice } from '../../utils/currency';
import { playMatchSuccessSound, playMatchFailSound } from '../../utils/scannerSound';
import { CompactInvoicePrintView, getSteadfastParcelId } from './CompactInvoicePrintView';

interface BarcodeScannerSectionProps {
  products?: JerseyProduct[];
  siteSettings?: SiteSettings;
  currency?: CurrencyCode;
  onUpdateProduct?: (id: string, product: Partial<JerseyProduct>) => Promise<boolean>;
  onGoToOrderProcess?: () => void;
  onGoToSteadfastApi?: () => void;
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

// Mini SVG Barcode Component
const MiniBarcode: React.FC<{ code: string }> = ({ code }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && code) {
      try {
        JsBarcode(svgRef.current, code, {
          format: 'CODE128',
          width: 1.3,
          height: 22,
          displayValue: false,
          margin: 1,
          background: 'transparent',
          lineColor: '#111827'
        });
      } catch {
        // Silently handle invalid code128 chars
      }
    }
  }, [code]);

  return <svg ref={svgRef} className="h-5 max-w-[130px]" />;
};

export const BarcodeScannerSection: React.FC<BarcodeScannerSectionProps> = ({
  products: initialProducts = [],
  currency = 'BDT',
  onUpdateProduct,
  onGoToOrderProcess,
  onGoToSteadfastApi
}) => {
  // Navigation Sub-tab inside Barcode Scanner
  const [activeTab, setActiveTab] = useState<'scanner' | 'parcels' | 'stock_matrix'>('scanner');

  // Master Data
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<JerseyProduct[]>(initialProducts);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncingCourier, setIsSyncingCourier] = useState(false);
  const [courierSyncMsg, setCourierSyncMsg] = useState<string | null>(null);

  // Scanner state
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [isFullscreenScanner, setIsFullscreenScanner] = useState(false);
  const [isCameraInitializing, setIsCameraInitializing] = useState(false);
  const [isFlashlightOn, setIsFlashlightOn] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [isScanningFile, setIsScanningFile] = useState(false);

  // Last Scan Result notification & animation
  const [lastScanResult, setLastScanResult] = useState<{
    status: 'success' | 'warning' | 'fail';
    code: string;
    order?: Order;
    message: string;
    deductedDetails?: Array<{
      productId: string;
      productTitle: string;
      size: string;
      quantity: number;
      previousStock: number;
      newStock: number;
    }>;
    timestamp: number;
  } | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<'all' | 'in_warehouse' | 'dispatched' | 'delivered'>('all');

  // Selection state for batch operations
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Last matched order ID to highlight row
  const [recentlyMatchedId, setRecentlyMatchedId] = useState<string | null>(null);

  // Stock Matrix Edit State
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [editingStockProductId, setEditingStockProductId] = useState<string | null>(null);
  const [editableSizeStock, setEditableSizeStock] = useState<Record<string, number>>({});
  const [isSavingStock, setIsSavingStock] = useState(false);
  const [stockSavedToast, setStockSavedToast] = useState<string | null>(null);

  // Quick Restock Modal
  const [restockModalProduct, setRestockModalProduct] = useState<JerseyProduct | null>(null);
  const [restockAddAmount, setRestockAddAmount] = useState<number>(5);

  // Invoice Print Preview Modal
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);

  // Scanner state & refs
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const zxingControlsRef = useRef<any>(null);
  const barcodeAnimationIdRef = useRef<number | null>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastScannedTimeRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  const showToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => setStatusToast(null), 3500);
  };

  // Sync initial products
  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) {
      setProducts(initialProducts);
    } else {
      fetchProducts();
    }
  }, [initialProducts]);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        setProducts(data.products);
      }
    } catch {}
  };

  // Fetch orders from server & cache
  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.orders)) {
          setOrders(data.orders);
          try {
            localStorage.setItem('spidey_master_orders', JSON.stringify(data.orders));
          } catch {}
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to load orders from API:', err);
    } finally {
      setIsLoading(false);
    }

    // Local fallback
    try {
      const cached = localStorage.getItem('spidey_master_orders');
      if (cached) {
        setOrders(JSON.parse(cached));
      }
    } catch {}
  };

  useEffect(() => {
    fetchOrders();

    // Cross-panel live synchronization listener
    const handleOrdersSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && Array.isArray(customEvent.detail.orders)) {
        setOrders(customEvent.detail.orders);
      }
    };

    window.addEventListener('spidey-orders-updated', handleOrdersSync);
    return () => window.removeEventListener('spidey-orders-updated', handleOrdersSync);
  }, []);

  // Autofocus manual scanner input on scanner tab
  useEffect(() => {
    if (activeTab === 'scanner') {
      setTimeout(() => {
        manualInputRef.current?.focus();
      }, 100);
    }
  }, [activeTab]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCameraScanner();
    };
  }, []);

  // Start Camera Scanner (Direct WebRTC userMedia & instant Native Video render)
  const startCameraScanner = async (facingModeOverride?: 'environment' | 'user') => {
    const targetFacing = facingModeOverride || cameraFacing;
    setIsCameraInitializing(true);
    setScannerError(null);
    setShowPermissionModal(false);
    setIsFullscreenScanner(true);
    setIsScannerActive(true);

    try {
      // 1. Clean up any previous stream/decoder
      if (barcodeAnimationIdRef.current) {
        cancelAnimationFrame(barcodeAnimationIdRef.current);
        barcodeAnimationIdRef.current = null;
      }
      if (zxingControlsRef.current) {
        try {
          zxingControlsRef.current.stop();
        } catch {}
        zxingControlsRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => {
          try { t.stop(); } catch {}
        });
        mediaStreamRef.current = null;
      }

      // 2. Request user media with ideal mobile rear-facing camera constraints
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: targetFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      // 3. Attach directly to Video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('autoplay', 'true');
        videoRef.current.muted = true;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('Video autoPlay catch:', playErr);
        }
      }

      // 4. Start Hardware-Accelerated Barcode / QR Decoder Engine
      startDecodingEngine(stream);

      setIsScannerActive(true);
      setScannerError(null);
      setIsCameraInitializing(false);
    } catch (err: any) {
      console.error('Camera stream start error:', err);
      setIsCameraInitializing(false);
      const rawErr = err?.name || err?.message || String(err);
      
      if (rawErr.includes('NotAllowedError') || rawErr.includes('Permission') || rawErr.includes('denied')) {
        setScannerError('ক্যামেরা ব্যবহারের অনুমতি (Permission) দেওয়া হয়নি।');
        setShowPermissionModal(true);
      } else if (rawErr.includes('NotFoundError') || rawErr.includes('DevicesNotFoundError')) {
        setScannerError('কোনো ক্যামেরা ডিভাইস খুঁজে পাওয়া যায়নি।');
      } else if (rawErr.includes('NotReadableError') || rawErr.includes('TrackStartError')) {
        setScannerError('ক্যামেরা অন্য কোনো অ্যাপে চালু আছে। অনুগ্রহ করে অন্য অ্যাপ বন্ধ করে আবার চেষ্টা করুন।');
      } else {
        setScannerError('ক্যামেরা চালু করতে সমস্যা হয়েছে: ' + rawErr);
      }
    }
  };

  // Barcode & QR Code live scanning loop (Hardware BarcodeDetector + ZXing Fallback)
  const startDecodingEngine = (stream: MediaStream) => {
    // A) Fast hardware detection using standard BarcodeDetector (Supported in Android Chrome & modern browsers)
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const detector = new (window as any).BarcodeDetector({
          formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'qr_code', 'upc_a', 'upc_e']
        });

        let isScanningFrame = false;
        const scanFrame = async () => {
          if (!mediaStreamRef.current || !videoRef.current) return;

          if (!isScanningFrame && videoRef.current.readyState >= 2) {
            isScanningFrame = true;
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0) {
                const detectedCode = barcodes[0].rawValue;
                if (detectedCode) {
                  handleIncomingBarcode(detectedCode);
                }
              }
            } catch (frameErr) {
              // Frame decoding skip
            } finally {
              isScanningFrame = false;
            }
          }

          barcodeAnimationIdRef.current = requestAnimationFrame(scanFrame);
        };

        barcodeAnimationIdRef.current = requestAnimationFrame(scanFrame);
        return;
      } catch (detectorErr) {
        console.warn('BarcodeDetector fallback to ZXing:', detectorErr);
      }
    }

    // B) Multi-Format ZXing Browser Reader Fallback (Universal support for iOS / Desktop / All browsers)
    try {
      const codeReader = new BrowserMultiFormatReader();
      if (videoRef.current) {
        codeReader.decodeFromVideoElement(videoRef.current, (result, err, controls) => {
          zxingControlsRef.current = controls;
          if (result) {
            const detectedText = result.getText();
            if (detectedText) {
              handleIncomingBarcode(detectedText);
            }
          }
        });
      }
    } catch (zxingErr) {
      console.error('ZXing decoder init error:', zxingErr);
    }
  };

  // Stop Camera Scanner & clean resources
  const stopCameraScanner = async () => {
    if (barcodeAnimationIdRef.current) {
      cancelAnimationFrame(barcodeAnimationIdRef.current);
      barcodeAnimationIdRef.current = null;
    }
    if (zxingControlsRef.current) {
      try {
        zxingControlsRef.current.stop();
      } catch {}
      zxingControlsRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        try { track.stop(); } catch {}
      });
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScannerActive(false);
    setIsFullscreenScanner(false);
    setIsFlashlightOn(false);
    setIsCameraInitializing(false);
  };

  // Toggle Camera Flashlight / Torch
  const toggleFlashlight = async () => {
    if (!mediaStreamRef.current) return;
    const track = mediaStreamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextTorch = !isFlashlightOn;
      // @ts-ignore
      await track.applyConstraints({
        advanced: [{ torch: nextTorch } as any]
      });
      setIsFlashlightOn(nextTorch);
    } catch (err) {
      showToast('এই ডিভাইসের ক্যামেরায় ফ্ল্যাশলাইট ফিচার সাপোর্টেড নয়');
    }
  };

  // Flip Camera (Rear ↔ Front)
  const toggleCameraFacing = async () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    await stopCameraScanner();
    startCameraScanner(nextFacing);
  };

  // Core Barcode Matching & Automated Size Stock Deduction Engine
  const handleIncomingBarcode = async (rawCode: string) => {
    if (!rawCode || !rawCode.trim() || isProcessingScan) return;

    const cleanCode = rawCode.trim();
    const now = Date.now();

    // Prevent duplicate triggers of same code within 1.5s
    if (lastScannedTimeRef.current.code === cleanCode && now - lastScannedTimeRef.current.time < 1500) {
      return;
    }
    lastScannedTimeRef.current = { code: cleanCode, time: now };

    setIsProcessingScan(true);
    setManualCodeInput('');

    try {
      // Call Warehouse automated dispatch and stock deduction endpoint
      const res = await fetch('/api/warehouse/scan-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanCode: cleanCode })
      });

      const data = await res.json();

      if (data.success && data.order) {
        if (soundEnabled) playMatchSuccessSound();

        // Update orders in state and broadcast
        setOrders(prev => {
          const updated = prev.map(o => o.id === data.order.id ? data.order : o);
          try {
            localStorage.setItem('spidey_master_orders', JSON.stringify(updated));
          } catch {}
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('spidey-orders-updated', { detail: { orders: updated } }));
          }
          return updated;
        });

        // Update live products list with deducted size stock
        if (Array.isArray(data.updatedProducts)) {
          setProducts(data.updatedProducts);
        }

        setRecentlyMatchedId(data.order.id);
        setTimeout(() => setRecentlyMatchedId(null), 4000);

        setLastScanResult({
          status: data.wasAlreadyDispatched ? 'warning' : 'success',
          code: cleanCode,
          order: data.order,
          message: data.wasAlreadyDispatched 
            ? `পার্সেলটি ইতিমধ্যে ওয়্যারহাউস ত্যাগ করেছে (Invoice: ${data.order.invoiceNumber || data.order.id})`
            : `✔ সফল স্ক্যান! পার্সেলটি রাইডারের হাতে হস্তান্তরিত হয়েছে এবং সাইজ অনুযায়ী স্টক ডিডাক্ট সম্পন্ন হয়েছে!`,
          deductedDetails: data.deductedDetails,
          timestamp: now
        });
      } else {
        if (soundEnabled) playMatchFailSound();
        setLastScanResult({
          status: 'fail',
          code: cleanCode,
          message: data.message || `✕ কোনো ম্যাচিং অর্ডার পাওয়া যায়নি (${cleanCode})। ডাটাবেজে নেই।`,
          timestamp: now
        });
      }
    } catch (err: any) {
      if (soundEnabled) playMatchFailSound();
      setLastScanResult({
        status: 'fail',
        code: cleanCode,
        message: 'স্ক্যান প্রসেসিংয়ে সমস্যা হয়েছে: ' + (err.message || 'Network error'),
        timestamp: now
      });
    } finally {
      setIsProcessingScan(false);
      // Re-focus manual input for next barcode gun scan
      setTimeout(() => {
        manualInputRef.current?.focus();
      }, 50);
    }
  };

  // Scan from Uploaded Image File
  const handleScanFromFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningFile(true);
    let imgUrl = '';
    try {
      imgUrl = URL.createObjectURL(file);
      const codeReader = new BrowserMultiFormatReader();
      const result = await codeReader.decodeFromImageUrl(imgUrl);
      if (result) {
        handleIncomingBarcode(result.getText());
      }
    } catch (err: any) {
      showToast(`✕ ছবিতে পরিষ্কার বারকোড পাওয়া যায়নি`);
      if (soundEnabled) playMatchFailSound();
    } finally {
      if (imgUrl) URL.revokeObjectURL(imgUrl);
      setIsScanningFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Bulk Synchronize Steadfast Courier Status
  const handleSyncCourierStatus = async () => {
    try {
      setIsSyncingCourier(true);
      setCourierSyncMsg('Steadfast API থেকে লাইভ কুরিয়ার স্ট্যাটাস সিঙ্ক হচ্ছে...');

      const res = await fetch('/api/courier/steadfast/sync-all-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.orders)) {
          setOrders(data.orders);
          try {
            localStorage.setItem('spidey_master_orders', JSON.stringify(data.orders));
          } catch {}
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('spidey-orders-updated', { detail: { orders: data.orders } }));
          }
        }
        setCourierSyncMsg(data.message || `সফলভাবে সিঙ্ক সম্পন্ন হয়েছে (${data.updatedCount} টি আপডেট)`);
        setTimeout(() => setCourierSyncMsg(null), 4500);
      } else {
        setCourierSyncMsg(data.message || 'Steadfast API সিঙ্ক সম্পন্ন করা যায়নি। API Key চেক করুন।');
        setTimeout(() => setCourierSyncMsg(null), 5000);
      }
    } catch (err: any) {
      setCourierSyncMsg('কুরিয়ার সিঙ্ক সমস্যা: ' + err.message);
      setTimeout(() => setCourierSyncMsg(null), 4000);
    } finally {
      setIsSyncingCourier(false);
    }
  };

  // Single Order Manual Dispatch Trigger
  const handleToggleOrderDispatch = async (order: Order) => {
    const isCurrentlyDispatched = order.status === 'shipped' || order.status === 'dispatched' || order.status === 'delivered';

    try {
      if (!isCurrentlyDispatched) {
        await handleIncomingBarcode(order.invoiceNumber || order.trackingCode || order.id);
      } else {
        // Revert status
        const res = await fetch(`/api/orders/${order.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'processing',
            barcodeScanned: false
          })
        });
        const data = await res.json();
        if (data.success) {
          setOrders(prev => prev.map(o => o.id === order.id ? data.order : o));
          showToast('পার্সেল স্ট্যাটাস পুনরায় "In-Warehouse" এ ফেরত নেওয়া হয়েছে');
        }
      }
    } catch (err) {
      console.error('Toggle dispatch error:', err);
    }
  };

  // Stock Matrix Edit handlers
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

  const handleStepSizeStock = (size: string, step: number) => {
    setEditableSizeStock(prev => {
      const cur = prev[size] || 0;
      return {
        ...prev,
        [size]: Math.max(0, cur + step)
      };
    });
  };

  const handleSaveProductStockMatrix = async (productId: string) => {
    setIsSavingStock(true);
    try {
      const totalCount: number = Number(Object.values(editableSizeStock).reduce((acc: number, v: any) => acc + (Number(v) || 0), 0));
      const res = await fetch(`/api/products/${productId}/stock-matrix`, {
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
        setProducts(prev => prev.map(p => p.id === productId ? data.product : p));
        if (onUpdateProduct) {
          onUpdateProduct(productId, data.product);
        }
        setEditingStockProductId(null);
        setStockSavedToast('সাইজ অনুযায়ী স্টক সফলভাবে ডাটাবেজে সংরক্ষিত হয়েছে!');
        setTimeout(() => setStockSavedToast(null), 3000);
      }
    } catch (e: any) {
      alert('Stock save error: ' + e.message);
    } finally {
      setIsSavingStock(false);
    }
  };

  // Quick Restock Application
  const handleApplyQuickRestock = async () => {
    if (!restockModalProduct) return;
    const curSizes = getProductSizeStock(restockModalProduct);
    const updatedSizes: Record<string, number> = {};
    STANDARD_SIZES.forEach(sz => {
      updatedSizes[sz] = (curSizes[sz] || 0) + restockAddAmount;
    });

    const newTotal = Object.values(updatedSizes).reduce((a, b) => a + b, 0);

    try {
      const res = await fetch(`/api/products/${restockModalProduct.id}/stock-matrix`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sizeStock: updatedSizes,
          stockCount: newTotal,
          inStock: true
        })
      });
      const data = await res.json();
      if (data.success && data.product) {
        setProducts(prev => prev.map(p => p.id === restockModalProduct.id ? data.product : p));
        if (onUpdateProduct) {
          onUpdateProduct(restockModalProduct.id, data.product);
        }
        setRestockModalProduct(null);
        setStockSavedToast(`+${restockAddAmount} প্রতিটি সাইজে সফলভাবে যোগ করা হয়েছে!`);
        setTimeout(() => setStockSavedToast(null), 3000);
      }
    } catch (err: any) {
      alert('Restock failed: ' + err.message);
    }
  };

  // Delete single order
  const handleDeleteOrder = async (id: string) => {
    setDeletingId(id);
    const updated = orders.filter(o => o.id !== id);
    setOrders(updated);
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    try {
      localStorage.setItem('spidey_master_orders', JSON.stringify(updated));
      await fetch(`/api/orders/${id}`, { method: 'DELETE' });
      showToast('✓ Order permanently removed.');
    } catch {} finally {
      setDeletingId(null);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('spidey-orders-updated', { detail: { orders: updated } }));
    }
  };

  // Batch delete selected orders
  const handleDeleteSelected = async () => {
    if (selectedOrderIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedOrderIds.size} selected orders?`)) return;

    setIsDeletingSelected(true);
    const idsToDelete = Array.from(selectedOrderIds);
    const remaining = orders.filter(o => !selectedOrderIds.has(o.id));

    setOrders(remaining);
    setSelectedOrderIds(new Set());

    try {
      localStorage.setItem('spidey_master_orders', JSON.stringify(remaining));
      await fetch('/api/orders/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idsToDelete })
      });
      showToast(`✓ Removed ${idsToDelete.length} orders.`);
    } catch {} finally {
      setIsDeletingSelected(false);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('spidey-orders-updated', { detail: { orders: remaining } }));
    }
  };

  // Filtered Orders Calculation
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        (o.id && o.id.toLowerCase().includes(q)) ||
        (o.invoiceNumber && o.invoiceNumber.toLowerCase().includes(q)) ||
        (o.trackingCode && o.trackingCode.toLowerCase().includes(q)) ||
        (o.consignmentId && o.consignmentId.toLowerCase().includes(q)) ||
        (o.customerName && o.customerName.toLowerCase().includes(q)) ||
        (o.phoneNumber && o.phoneNumber.includes(q)) ||
        (o.shippingAddress && o.shippingAddress.toLowerCase().includes(q)) ||
        (o.items && o.items.some(it => it.product?.title?.toLowerCase().includes(q) || it.product?.code?.toLowerCase().includes(q)))
      );

      if (!matchesSearch) return false;

      const isDispatched = o.status === 'shipped' || o.status === 'dispatched' || o.status === 'delivered';
      const isDelivered = o.status === 'delivered' || o.courierStatus === 'delivered';

      if (warehouseFilter === 'in_warehouse' && isDispatched) return false;
      if (warehouseFilter === 'dispatched' && (!isDispatched || isDelivered)) return false;
      if (warehouseFilter === 'delivered' && !isDelivered) return false;

      return true;
    });
  }, [orders, searchQuery, warehouseFilter]);

  // Filtered Products for Stock Matrix
  const filteredProducts = useMemo(() => {
    const q = stockSearchQuery.toLowerCase().trim();
    if (!q) return products;
    return products.filter(p => 
      p.title.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.code && p.code.toLowerCase().includes(q)) ||
      p.edition.toLowerCase().includes(q)
    );
  }, [products, stockSearchQuery]);

  // Metric calculation
  const metrics = useMemo(() => {
    const totalParcels = orders.length;
    const inWarehouse = orders.filter(o => o.status !== 'shipped' && o.status !== 'dispatched' && o.status !== 'delivered').length;
    const withRiderDispatched = orders.filter(o => (o.status === 'shipped' || o.status === 'dispatched') && o.status !== 'delivered').length;
    const deliveredCount = orders.filter(o => o.courierStatus === 'delivered' || o.status === 'delivered').length;
    const totalPhysicalStock = products.reduce((acc: number, p) => acc + (Number(p.stockCount) || 0), 0);

    return {
      totalParcels,
      inWarehouse,
      withRiderDispatched,
      deliveredCount,
      totalPhysicalStock
    };
  }, [orders, products]);

  const isAllSelected = filteredOrders.length > 0 && selectedOrderIds.size === filteredOrders.length;
  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(filteredOrders.map(o => o.id)));
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* Hidden container for image file barcode reader */}
      <div id="temp-file-scanner-element" className="hidden" />

      {/* 1. TOP HEADER & WORKSPACE CONTROL BAR */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-neutral-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-neutral-900 text-white flex items-center justify-center shadow-md">
              <ScanLine className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-neutral-900 tracking-tight">
                  Barcode Scanner & Live Stock Dispatch
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 text-[10px] font-mono font-bold">
                  Auto Stock Sync
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                পার্সেল বারকোড স্ক্যান করলেই স্ট্যাটাস <b>"Handed Over to Rider"</b> হবে এবং সাইজ অনুযায়ী অটোমেটিক স্টক ডিডাক্ট হয়ে যাবে।
              </p>
            </div>
          </div>
        </div>

        {/* Sub-tab Switchers & Courier Sync */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sub-tab Navigation */}
          <div className="p-1 bg-neutral-100 rounded-2xl flex items-center gap-1 border border-neutral-200/60">
            <button
              onClick={() => setActiveTab('scanner')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'scanner'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <ScanLine className="w-3.5 h-3.5 text-rose-400" />
              <span>Outbound Scanner</span>
            </button>

            <button
              onClick={() => setActiveTab('parcels')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'parcels'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Parcels List ({orders.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('stock_matrix')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'stock_matrix'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Size Stock Matrix</span>
            </button>
          </div>

          {/* Sync Steadfast Courier Status Button */}
          <button
            onClick={handleSyncCourierStatus}
            disabled={isSyncingCourier}
            className="px-3.5 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
            title="Steadfast API থেকে ট্র্যাকিং স্ট্যাটাস সরাসরি আপডেট করুন"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCourier ? 'animate-spin' : ''}`} />
            <span>{isSyncingCourier ? 'Syncing...' : 'Sync Steadfast'}</span>
          </button>
        </div>
      </div>

      {/* Courier Sync Status Toast */}
      {courierSyncMsg && (
        <div className="p-3 rounded-2xl bg-neutral-900 text-white text-xs font-medium flex items-center justify-between gap-3 shadow-lg animate-fadeIn border border-white/10">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{courierSyncMsg}</span>
          </div>
          <button onClick={() => setCourierSyncMsg(null)} className="text-neutral-400 hover:text-white">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Toast Alert */}
      {statusToast && (
        <div className="p-3 rounded-2xl bg-neutral-900 text-white text-xs font-medium flex items-center justify-between gap-3 shadow-lg animate-fadeIn">
          <span>{statusToast}</span>
          <button onClick={() => setStatusToast(null)} className="text-neutral-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. STATS & METRIC STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Metric 1: In-Warehouse (Waiting for Dispatch) */}
        <div 
          onClick={() => { setActiveTab('parcels'); setWarehouseFilter('in_warehouse'); }}
          className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-xs cursor-pointer hover:border-amber-400 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-500">In-Warehouse (Pending Scan)</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-1 font-mono">
            {metrics.inWarehouse}
          </div>
          <span className="text-[10px] text-neutral-400 block mt-0.5">পার্সেল ওয়্যারহাউসে প্রস্তুত আছে</span>
        </div>

        {/* Metric 2: Handed over to Rider / Dispatched */}
        <div 
          onClick={() => { setActiveTab('parcels'); setWarehouseFilter('dispatched'); }}
          className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-xs cursor-pointer hover:border-emerald-400 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-500">Handed Over to Rider</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1 font-mono">
            {metrics.withRiderDispatched}
          </div>
          <span className="text-[10px] text-emerald-700/80 font-semibold block mt-0.5">ওয়্যারহাউস ত্যাগ করেছে ও স্টক ডিডাক্টেড</span>
        </div>

        {/* Metric 3: Delivered */}
        <div 
          onClick={() => { setActiveTab('parcels'); setWarehouseFilter('delivered'); }}
          className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-xs cursor-pointer hover:border-purple-400 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-500">Delivered by Courier</span>
            <CheckCheck className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-600 mt-1 font-mono">
            {metrics.deliveredCount}
          </div>
          <span className="text-[10px] text-neutral-400 block mt-0.5">সফলভাবে ডেলিভারি সম্পন্ন</span>
        </div>

        {/* Metric 4: Total Live Stock Matrix */}
        <div 
          onClick={() => setActiveTab('stock_matrix')}
          className="p-4 rounded-2xl bg-[#0d0f12] text-white shadow-sm cursor-pointer hover:bg-neutral-800 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-400">Total Live Stock</span>
            <Package className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-white mt-1 font-mono">
            {metrics.totalPhysicalStock} pcs
          </div>
          <span className="text-[10px] text-neutral-400 block mt-0.5">{products.length} Designs in Matrix</span>
        </div>
      </div>

      {/* 3. VIEW TAB 1: OUTBOUND BARCODE SCANNER */}
      {activeTab === 'scanner' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Left Scan Control & Input Column */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Main Barcode & Hardware Gun Command Hub */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-neutral-200/80 shadow-sm space-y-5">
              
              {/* Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-xs">
                    <ScanLine className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-neutral-900 tracking-tight flex items-center gap-2">
                      Laser Barcode & Dispatch Station
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                        ⚡ Real-Time Auto Sync
                      </span>
                    </h3>
                    <p className="text-[11px] text-neutral-500 font-medium">
                      মোবাইল ক্যামেরা বা বারকোড স্ক্যানার গান দিয়ে পার্সেল স্ক্যান করুন
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Audio Mute / Unmute */}
                  <button
                    type="button"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                      soundEnabled 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-neutral-100 text-neutral-400 border-neutral-200'
                    }`}
                    title={soundEnabled ? 'Audio Chime Enabled' : 'Audio Muted'}
                  >
                    {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline text-[11px]">{soundEnabled ? 'সাউন্ড চালু' : 'মিউট'}</span>
                  </button>

                  {/* Upload Image Barcode */}
                  <label 
                    className="px-2.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200 cursor-pointer transition-all flex items-center gap-1.5 text-xs font-bold"
                    title="ছবি বা ইনভয়েসের ফাইল থেকে বারকোড স্ক্যান করুন"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-neutral-600" />
                    <span className="hidden sm:inline text-[11px]">ফাইল আপলোড</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleScanFromFile}
                      className="hidden"
                      disabled={isScanningFile}
                    />
                  </label>
                </div>
              </div>

              {/* Quick Mobile Camera Scanner Trigger Card */}
              <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-600/20 shrink-0">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-neutral-900 flex items-center gap-2">
                      লাইভ মোবাইল ক্যামেরা স্ক্যানার
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    </h4>
                    <p className="text-xs text-neutral-600 mt-0.5">
                      ক্লিক করলেই সরাসরি ফুলস্ক্রিনে ক্যামেরা ওপেন হবে এবং পার্সেলের কোড লাইভ ডিটেক্ট করবে
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => startCameraScanner()}
                    disabled={isCameraInitializing}
                    className="flex-1 sm:flex-initial px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md shadow-rose-600/25 cursor-pointer"
                  >
                    {isCameraInitializing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    <span>{isCameraInitializing ? 'ক্যামেরা লোড হচ্ছে...' : '📷 ক্যামেরা ওপেন করুন'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPermissionModal(true)}
                    className="p-2.5 rounded-xl bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-700 text-xs font-bold transition-all"
                    title="ক্যামেরা পারমিশন অন করার নিয়ম দেখুন"
                  >
                    <HelpCircle className="w-4 h-4 text-neutral-600" />
                  </button>
                </div>
              </div>

              {/* Camera Error Message with Help Trigger */}
              {scannerError && (
                <div className="p-4 rounded-2xl bg-red-50 text-red-700 text-xs font-semibold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-red-200">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-bold text-red-900 block">ক্যামেরা সংক্রান্ত ত্রুটি:</span>
                      <span>{scannerError}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPermissionModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 shadow-xs"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>পারমিশন দেওয়ার নিয়ম</span>
                  </button>
                </div>
              )}

              {/* Barcode Gun / Manual Input Form */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (manualCodeInput.trim()) {
                    handleIncomingBarcode(manualCodeInput);
                  }
                }} 
                className="space-y-2 pt-2"
              >
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-neutral-700">
                    স্ক্যানার গান দিয়ে স্ক্যান করুন অথবা কোড লিখুন:
                  </label>
                  <span className="text-[11px] text-rose-600 font-bold font-mono">
                    ● Gun Mode Active
                  </span>
                </div>

                <div className="relative">
                  <ScanLine className="w-5 h-5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    ref={manualInputRef}
                    type="text"
                    value={manualCodeInput}
                    onChange={(e) => setManualCodeInput(e.target.value)}
                    placeholder="বারকোড স্ক্যানার গান দিয়ে স্ক্যান করুন বা ইনভয়েস/অর্ডার নং লিখুন..."
                    autoFocus
                    disabled={isProcessingScan}
                    className="w-full pl-11 pr-28 py-3.5 text-sm bg-neutral-50 border-2 border-neutral-300 focus:border-rose-600 focus:bg-white rounded-2xl text-neutral-900 font-mono tracking-wider transition-all placeholder:text-neutral-400 font-bold"
                  />
                  <button
                    type="submit"
                    disabled={!manualCodeInput.trim() || isProcessingScan}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-neutral-900 hover:bg-rose-600 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    {isProcessingScan ? 'Processing...' : 'Scan & Match'}
                  </button>
                </div>
                <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1">
                  <span>⚡ USB / Bluetooth Barcode Gun প্লাগ-অ্যান্ড-প্লে কাজ করবে (Auto Enter)</span>
                  <span className="text-neutral-400 font-mono">Supports: Code128, EAN13, QR</span>
                </div>
              </form>
            </div>

            {/* Workflow Guide Info */}
            <div className="p-4 rounded-3xl bg-neutral-100 border border-neutral-200/60 flex items-start gap-3">
              <Info className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
              <div className="text-xs text-neutral-600 space-y-1">
                <span className="font-bold text-neutral-900 block">স্টক ম্যানেজমেন্ট ও ডিসপ্যাচ রুলস:</span>
                <p>
                  ১. ইনভয়েস প্রিন্ট বা কুরিয়ার এন্ট্রির পর পার্সেল <b>"In-Warehouse"</b> এ থাকবে।<br />
                  ২. রাইডার যখন পার্সেল নিয়ে যাবে, তখন বারকোড স্ক্যান করলেই স্ট্যাটাস <b>"Handed Over to Rider"</b> হবে এবং অর্ডারের প্রতিটি জার্সির সাইজ অনুযায়ী ডাটাবেজ থেকে স্টক মাইনাস হবে।
                </p>
              </div>
            </div>

          </div>

          {/* Right Live Scan Feedback & Stock Deduction Inspector */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Live Result Card */}
            <div className="p-5 rounded-3xl bg-white border border-neutral-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-400 font-mono">
                  Live Dispatch Verification
                </span>
                {lastScanResult && (
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {new Date(lastScanResult.timestamp).toLocaleTimeString()}
                  </span>
                )}
              </div>

              {!lastScanResult ? (
                <div className="py-12 text-center text-neutral-400 space-y-2">
                  <ScanLine className="w-10 h-10 mx-auto stroke-1 text-neutral-300 animate-pulse" />
                  <p className="text-xs font-medium">
                    স্ক্যানার রেডি আছে। ইনভয়েসের বারকোড স্ক্যান করলেই এখানে বিস্তারিত তথ্য ও সাইজ অনুযায়ী স্টক ডিডাকশন শো করবে।
                  </p>
                </div>
              ) : (
                <div className="space-y-4 animate-fadeIn">
                  
                  {/* Status Banner */}
                  <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
                    lastScanResult.status === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : lastScanResult.status === 'warning'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-red-50 border-red-200 text-red-900'
                  }`}>
                    {lastScanResult.status === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : lastScanResult.status === 'warning' ? (
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <h4 className="text-xs font-black">
                        {lastScanResult.status === 'success' ? '✔ DISPATCH CONFIRMED' : lastScanResult.status === 'warning' ? 'ALREADY DISPATCHED' : 'SCAN FAILED'}
                      </h4>
                      <p className="text-xs font-medium mt-0.5">
                        {lastScanResult.message}
                      </p>
                      <span className="text-[10px] font-mono opacity-70 block mt-1">
                        Code: {lastScanResult.code}
                      </span>
                    </div>
                  </div>

                  {/* Order Details Preview */}
                  {lastScanResult.order && (
                    <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-neutral-800">
                          {lastScanResult.order.customerName}
                        </span>
                        <span className="font-mono font-bold text-rose-600">
                          {lastScanResult.order.invoiceNumber || lastScanResult.order.id}
                        </span>
                      </div>

                      <div className="text-xs text-neutral-600 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <span>{lastScanResult.order.phoneNumber || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <span className="truncate">{lastScanResult.order.shippingAddress}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="font-bold text-neutral-700">Amount:</span>
                          <span className="font-mono font-black text-neutral-900">
                            {formatPrice(lastScanResult.order.totalAmount, (currency as CurrencyCode) || 'BDT')}
                          </span>
                        </div>
                      </div>

                      {/* Outbound Stock Deduction Breakdown */}
                      {lastScanResult.deductedDetails && lastScanResult.deductedDetails.length > 0 && (
                        <div className="pt-2 border-t border-neutral-200/80 space-y-2">
                          <span className="text-[11px] font-extrabold text-neutral-700 flex items-center gap-1">
                            <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                            Stock Deducted Breakdown (Size-wise):
                          </span>
                          <div className="space-y-1.5">
                            {lastScanResult.deductedDetails.map((det, idx) => (
                              <div key={idx} className="p-2 rounded-xl bg-white border border-neutral-200 text-xs flex items-center justify-between">
                                <div className="min-w-0 pr-2">
                                  <span className="font-bold text-neutral-800 block truncate">{det.productTitle}</span>
                                  <span className="text-[10px] text-neutral-500 font-mono">
                                    Size: <b className="text-neutral-800">{det.size}</b> | Deducted: <b className="text-rose-600">-{det.quantity}</b>
                                  </span>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-[10px] text-neutral-400 font-mono block">Remaining Stock</span>
                                  <span className="text-xs font-black font-mono text-emerald-700">{det.newStock} pcs</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="pt-2 flex items-center gap-2">
                        <button
                          onClick={() => setPrintingOrder(lastScanResult.order || null)}
                          className="w-full py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View / Print Invoice</span>
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>

            {/* Recently Dispatched Mini Stream */}
            <div className="p-5 rounded-3xl bg-white border border-neutral-200/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-neutral-400" />
                  Recent Outbound Dispatches
                </span>
                <span className="text-[10px] font-mono text-neutral-400">Latest 5</span>
              </div>

              <div className="space-y-2">
                {orders
                  .filter(o => o.status === 'shipped' || o.status === 'dispatched' || o.status === 'delivered')
                  .slice(0, 5)
                  .map(ord => (
                    <div key={ord.id} className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/60 flex items-center justify-between text-xs">
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-neutral-800 truncate">{ord.customerName}</span>
                          <span className="text-[10px] font-mono text-neutral-500">#{ord.invoiceNumber || ord.id.slice(-6)}</span>
                        </div>
                        <span className="text-[10px] text-neutral-400 block font-mono">
                          {ord.outboundScannedAt ? new Date(ord.outboundScannedAt).toLocaleTimeString() : 'Dispatched'}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono shrink-0">
                        With Rider
                      </span>
                    </div>
                  ))}
                {orders.filter(o => o.status === 'shipped' || o.status === 'dispatched' || o.status === 'delivered').length === 0 && (
                  <p className="text-xs text-neutral-400 text-center py-3">এখনো কোনো পার্সেল ডিসপ্যাচ হয়নি।</p>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* 4. VIEW TAB 2: PARCELS & TRACKING LIST */}
      {activeTab === 'parcels' && (
        <div className="space-y-4">
          
          {/* Filter & Search Bar */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white border border-neutral-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customer, phone, invoice, tracking code..."
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-2xl text-neutral-900 focus:outline-none focus:bg-white focus:border-neutral-900 font-medium"
              />
            </div>

            {/* Warehouse Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-2xl border border-neutral-200/60 text-xs">
                <button
                  onClick={() => setWarehouseFilter('all')}
                  className={`px-3 py-1 rounded-xl font-bold transition-all ${
                    warehouseFilter === 'all' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  All ({orders.length})
                </button>
                <button
                  onClick={() => setWarehouseFilter('in_warehouse')}
                  className={`px-3 py-1 rounded-xl font-bold transition-all ${
                    warehouseFilter === 'in_warehouse' ? 'bg-amber-500 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  In-Warehouse ({metrics.inWarehouse})
                </button>
                <button
                  onClick={() => setWarehouseFilter('dispatched')}
                  className={`px-3 py-1 rounded-xl font-bold transition-all ${
                    warehouseFilter === 'dispatched' ? 'bg-emerald-600 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  With Rider ({metrics.withRiderDispatched})
                </button>
                <button
                  onClick={() => setWarehouseFilter('delivered')}
                  className={`px-3 py-1 rounded-xl font-bold transition-all ${
                    warehouseFilter === 'delivered' ? 'bg-purple-600 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Delivered ({metrics.deliveredCount})
                </button>
              </div>

              {/* Batch delete */}
              {selectedOrderIds.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  disabled={isDeletingSelected}
                  className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected ({selectedOrderIds.size})</span>
                </button>
              )}
            </div>
          </div>

          {/* Table of Parcels */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-50/80 border-b border-neutral-200/80 text-neutral-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleToggleSelectAll}
                        className="rounded border-neutral-300 text-rose-600 focus:ring-rose-500"
                      />
                    </th>
                    <th className="py-3.5 px-4">Invoice / Parcel ID</th>
                    <th className="py-3.5 px-4">Customer & Phone</th>
                    <th className="py-3.5 px-4">Ordered Items & Sizes</th>
                    <th className="py-3.5 px-4">Warehouse Status</th>
                    <th className="py-3.5 px-4">Courier Status</th>
                    <th className="py-3.5 px-4">Total Amount</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredOrders.map((ord) => {
                    const isDispatched = ord.status === 'shipped' || ord.status === 'dispatched' || ord.status === 'delivered';
                    const isSelected = selectedOrderIds.has(ord.id);
                    const isHighlighted = recentlyMatchedId === ord.id;

                    return (
                      <tr 
                        key={ord.id}
                        className={`transition-all hover:bg-neutral-50/60 ${
                          isHighlighted ? 'bg-emerald-50/80 ring-2 ring-emerald-400' : isSelected ? 'bg-rose-50/30' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedOrderIds(prev => {
                                const next = new Set(prev);
                                if (next.has(ord.id)) next.delete(ord.id);
                                else next.add(ord.id);
                                return next;
                              });
                            }}
                            className="rounded border-neutral-300 text-rose-600 focus:ring-rose-500"
                          />
                        </td>

                        {/* Invoice & Barcode */}
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-neutral-900">
                            {ord.invoiceNumber || ord.id}
                          </div>
                          {ord.trackingCode && (
                            <span className="text-[10px] font-mono text-neutral-500 block">
                              Track: {ord.trackingCode}
                            </span>
                          )}
                          <div className="mt-1">
                            <MiniBarcode code={ord.invoiceNumber || ord.trackingCode || ord.id} />
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-neutral-900">{ord.customerName}</div>
                          <div className="text-[11px] text-neutral-500 font-mono flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-neutral-400" />
                            {ord.phoneNumber}
                          </div>
                        </td>

                        {/* Items & Sizes */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="space-y-1">
                            {ord.items?.map((it, idx) => (
                              <div key={idx} className="text-[11px] text-neutral-700 truncate">
                                <span className="font-semibold">{it.product?.title || 'Jersey'}</span>
                                <span className="font-mono text-neutral-500 ml-1">({it.selectedSize || 'L'} × {it.quantity || 1})</span>
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* Warehouse Status */}
                        <td className="py-3.5 px-4">
                          {isDispatched ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold font-mono">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Handed to Rider
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold font-mono">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              In-Warehouse
                            </span>
                          )}
                        </td>

                        {/* Courier Status */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono ${
                            ord.courierStatus === 'delivered'
                              ? 'bg-purple-100 text-purple-800'
                              : ord.courierStatus === 'in_transit' || ord.courierStatus === 'with_delivery_man'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-neutral-100 text-neutral-700'
                          }`}>
                            <Truck className="w-3 h-3" />
                            {ord.courierStatus || 'pending'}
                          </span>
                        </td>

                        {/* Total Amount */}
                        <td className="py-3.5 px-4 font-mono font-bold text-neutral-900">
                          {formatPrice(ord.totalAmount, (currency as CurrencyCode) || 'BDT')}
                        </td>

                        {/* Action buttons */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Toggle Dispatch / Scan */}
                            <button
                              onClick={() => handleToggleOrderDispatch(ord)}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                                isDispatched 
                                  ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700' 
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                              }`}
                              title={isDispatched ? 'Revert to In-Warehouse' : 'Dispatch and deduct stock'}
                            >
                              {isDispatched ? 'Undo' : 'Dispatch'}
                            </button>

                            {/* View / Print Invoice */}
                            <button
                              onClick={() => setPrintingOrder(ord)}
                              className="p-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-all"
                              title="Print / View Invoice"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete single order */}
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete order for ${ord.customerName}?`)) {
                                  handleDeleteOrder(ord.id);
                                }
                              }}
                              disabled={deletingId === ord.id}
                              className="p-1.5 rounded-xl bg-neutral-100 hover:bg-red-50 text-neutral-400 hover:text-red-600 transition-all"
                              title="Delete Order"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-neutral-400">
                        কোনো পার্সেল খুঁজে পাওয়া যায়নি।
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* 5. VIEW TAB 3: AVAILABLE SIZE STOCK MATRIX */}
      {activeTab === 'stock_matrix' && (
        <div className="space-y-4">
          
          {/* Header & Search */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white border border-neutral-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-extrabold text-neutral-900">
                Live Jersey Size Inventory Matrix (S, M, L, XL, XXL, 3XL)
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                আউটবাউন্ড স্ক্যানের সময় এখান থেকে সাইজ অনুযায়ী স্টক স্বয়ংক্রিয়ভাবে কমে যায়। আপনি চাইলে যেকোনো সাইজের স্টক ম্যানুয়ালি এডিট বা রিস্টক করতে পারেন।
              </p>
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={stockSearchQuery}
                onChange={(e) => setStockSearchQuery(e.target.value)}
                placeholder="Search jersey title, code, category..."
                className="w-full pl-10 pr-4 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-2xl text-neutral-900 focus:outline-none focus:bg-white focus:border-neutral-900 font-medium"
              />
            </div>
          </div>

          {/* Toast for stock matrix update */}
          {stockSavedToast && (
            <div className="p-3 rounded-2xl bg-emerald-700 text-white text-xs font-semibold flex items-center justify-between shadow-lg animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>{stockSavedToast}</span>
              </div>
              <button onClick={() => setStockSavedToast(null)} className="text-emerald-200 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Product Rows List with Size Matrix */}
          <div className="space-y-3">
            {filteredProducts.map((prod) => {
              const isEditingThis = editingStockProductId === prod.id;
              const liveSizes = isEditingThis ? editableSizeStock : getProductSizeStock(prod);
              const totalStock: number = isEditingThis 
                ? Number(Object.values(editableSizeStock).reduce((a: number, b: any) => a + (Number(b) || 0), 0))
                : Number(prod.stockCount) || 0;

              return (
                <div
                  key={prod.id}
                  className="p-4 sm:p-5 rounded-3xl bg-white border border-neutral-200/80 shadow-xs hover:border-neutral-300 transition-all space-y-3"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    {/* Left: Thumbnail + Title + Price + Total Count */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-14 h-14 rounded-2xl bg-neutral-100 p-1 border border-neutral-200 shrink-0 overflow-hidden">
                        <img
                          src={prod.images?.[0] || 'https://images.unsplash.com/photo-1577212017184-80cc0da11082?auto=format&fit=crop&w=400&q=80'}
                          alt={prod.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain object-center"
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold text-neutral-900 truncate">
                            {prod.title}
                          </h4>
                          {prod.code && (
                            <span className="px-2 py-0.5 rounded-md bg-neutral-900 text-white text-[10px] font-mono font-bold">
                              {prod.code}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5">
                          <span className="font-semibold text-neutral-700">{prod.category}</span>
                          <span>•</span>
                          <span className="font-mono font-bold text-neutral-900">{formatPrice(prod.price, (currency as CurrencyCode) || 'BDT')}</span>
                          <span>•</span>
                          <span className="text-[11px] font-medium text-neutral-400">{prod.edition}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Total Badge + Action Buttons */}
                    <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-neutral-400 font-bold uppercase block">Total Available</span>
                        <span className={`text-base font-black font-mono ${totalStock <= 5 ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {totalStock} pcs
                        </span>
                      </div>

                      {/* Quick Restock Modal Trigger */}
                      <button
                        onClick={() => {
                          setRestockModalProduct(prod);
                          setRestockAddAmount(5);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold flex items-center gap-1 transition-all"
                        title="Add +5 or +10 to all sizes"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Restock</span>
                      </button>

                      {/* Manual Edit Button */}
                      {!isEditingThis ? (
                        <button
                          onClick={() => handleOpenEditStock(prod)}
                          className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-1 transition-all shadow-xs"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Sizes</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleSaveProductStockMatrix(prod.id)}
                            disabled={isSavingStock}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-all disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{isSavingStock ? 'Saving...' : 'Save'}</span>
                          </button>
                          <button
                            onClick={() => setEditingStockProductId(null)}
                            className="p-1.5 rounded-xl bg-neutral-200 hover:bg-neutral-300 text-neutral-700 text-xs"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Size Stock Matrix Grid */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2 border-t border-neutral-100">
                    {STANDARD_SIZES.map((size) => {
                      const count = isEditingThis ? (editableSizeStock[size] || 0) : (liveSizes[size] || 0);

                      return (
                        <div
                          key={size}
                          className={`p-2.5 rounded-2xl border text-center transition-all ${
                            isEditingThis 
                              ? 'bg-rose-50/40 border-rose-200' 
                              : count === 0 
                              ? 'bg-neutral-50 border-neutral-200/60 opacity-60' 
                              : 'bg-neutral-50/80 border-neutral-200/80'
                          }`}
                        >
                          <span className="text-[10px] font-bold text-neutral-400 block uppercase font-mono">
                            Size {size}
                          </span>

                          {!isEditingThis ? (
                            <span className={`text-sm font-black font-mono mt-0.5 block ${
                              count === 0 ? 'text-red-500' : count <= 2 ? 'text-amber-600' : 'text-neutral-900'
                            }`}>
                              {count} <span className="text-[10px] font-normal text-neutral-400">pcs</span>
                            </span>
                          ) : (
                            <div className="flex items-center justify-center gap-1 mt-1">
                              <button
                                type="button"
                                onClick={() => handleStepSizeStock(size, -1)}
                                className="w-6 h-6 rounded-lg bg-white border border-neutral-200 text-neutral-700 flex items-center justify-center hover:bg-neutral-100 font-bold"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                min={0}
                                value={count}
                                onChange={(e) => handleSizeStockChange(size, parseInt(e.target.value) || 0)}
                                className="w-10 text-center text-xs font-mono font-black py-1 bg-white border border-rose-300 rounded-lg focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleStepSizeStock(size, 1)}
                                className="w-6 h-6 rounded-lg bg-white border border-neutral-200 text-neutral-700 flex items-center justify-center hover:bg-neutral-100 font-bold"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* Quick Restock Modal */}
      {restockModalProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-neutral-200 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-neutral-900">
                Quick Restock Product
              </h4>
              <button onClick={() => setRestockModalProduct(null)} className="text-neutral-400 hover:text-neutral-900">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-600">
              <b>{restockModalProduct.title}</b> এর প্রতিটি সাইজে (S, M, L, XL, XXL, 3XL) নির্ধারিত পরিমাণ স্টক এক ক্লিকে যোগ করুন:
            </p>

            <div className="grid grid-cols-3 gap-2">
              {[5, 10, 20].map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setRestockAddAmount(amt)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    restockAddAmount === amt 
                      ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs' 
                      : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  +{amt} pcs
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleApplyQuickRestock}
                className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all"
              >
                Apply (+{restockAddAmount * STANDARD_SIZES.length} Total)
              </button>
              <button
                type="button"
                onClick={() => setRestockModalProduct(null)}
                className="py-2.5 px-4 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Mobile Viewfinder Modal */}
      {isFullscreenScanner && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between animate-fadeIn select-none">
          {/* Top Bar */}
          <div className="p-3.5 sm:p-4 bg-neutral-900/95 backdrop-blur-md flex items-center justify-between z-20 border-b border-neutral-800 text-white">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs sm:text-sm font-extrabold font-mono tracking-wide text-rose-300">
                🔴 LIVE CAMERA SCANNER
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Torch */}
              <button
                type="button"
                onClick={toggleFlashlight}
                className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                  isFlashlightOn ? 'bg-amber-500/30 text-amber-300 border-amber-400' : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                }`}
                title="টর্চ চালু/বন্ধ"
              >
                <Flashlight className="w-4 h-4" />
              </button>

              {/* Flip Camera */}
              <button
                type="button"
                onClick={toggleCameraFacing}
                className="p-2 rounded-xl bg-neutral-800 text-neutral-300 border border-neutral-700 text-xs font-bold hover:bg-neutral-700 transition-all"
                title="ক্যামেরা ফ্লিপ (সামনে / পেছনে)"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>

              {/* Sound */}
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                  soundEnabled ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                }`}
                title={soundEnabled ? 'সাউন্ড অন' : 'সাউন্ড মিউট'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Exit / Close Fullscreen */}
              <button
                type="button"
                onClick={stopCameraScanner}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
                <span>বন্ধ করুন</span>
              </button>
            </div>
          </div>

          {/* Full Viewport Frame with HUD */}
          <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden w-full h-full">
            {/* Live Native Video Viewport */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover absolute inset-0 z-0"
            />

            {/* Overlaid Targeting Reticle */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
              <div className="w-64 sm:w-80 h-44 sm:h-52 border-2 border-rose-500/90 rounded-2xl relative shadow-[0_0_30px_rgba(244,63,94,0.5)]">
                <span className="absolute -top-2 -left-2 w-6 h-6 border-t-4 border-l-4 border-rose-400 rounded-tl-sm" />
                <span className="absolute -top-2 -right-2 w-6 h-6 border-t-4 border-r-4 border-rose-400 rounded-tr-sm" />
                <span className="absolute -bottom-2 -left-2 w-6 h-6 border-b-4 border-l-4 border-rose-400 rounded-bl-sm" />
                <span className="absolute -bottom-2 -right-2 w-6 h-6 border-b-4 border-r-4 border-rose-400 rounded-br-sm" />
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent absolute top-1/2 -translate-y-1/2 animate-pulse shadow-[0_0_12px_#f43f5e]" />
              </div>
            </div>

            <div className="absolute top-4 inset-x-0 text-center pointer-events-none z-10">
              <span className="px-4 py-1.5 rounded-full bg-black/75 backdrop-blur-md text-xs font-bold text-rose-300 border border-rose-500/40 shadow-lg">
                🎯 পার্সেলের বারকোড বা কিউআর কোড ফ্রেমের সেন্টারে ধরুন
              </span>
            </div>
          </div>

          {/* Floating Bottom Quick Scan Result Card */}
          <div className="p-3 sm:p-4 bg-neutral-950/95 backdrop-blur-md border-t border-neutral-800 text-white z-20 space-y-2">
            {lastScanResult ? (
              <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                lastScanResult.status === 'success' 
                  ? 'bg-emerald-950/60 border-emerald-500/60' 
                  : lastScanResult.status === 'warning'
                  ? 'bg-amber-950/60 border-amber-500/60'
                  : 'bg-rose-950/60 border-rose-500/60'
              }`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      lastScanResult.status === 'success' ? 'bg-emerald-400' : lastScanResult.status === 'warning' ? 'bg-amber-400' : 'bg-rose-400'
                    }`} />
                    <span className="text-xs sm:text-sm font-extrabold text-white font-mono truncate">
                      {lastScanResult.order?.invoiceNumber || lastScanResult.code}
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                      {lastScanResult.order?.status || 'Matched'}
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-neutral-200 truncate mt-0.5 font-medium">
                    {lastScanResult.order?.customerName ? `${lastScanResult.order.customerName} • ` : ''}
                    {lastScanResult.message}
                  </p>
                </div>
                {lastScanResult.deductedDetails && lastScanResult.deductedDetails.length > 0 && (
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-emerald-400 font-mono block">
                      Stock -{lastScanResult.deductedDetails.reduce((a, b) => a + b.quantity, 0)}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {lastScanResult.deductedDetails.map(d => `${d.size}: -${d.quantity}`).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-xs text-neutral-400 py-1.5 font-medium flex items-center justify-center gap-2">
                <ScanLine className="w-4 h-4 text-rose-400 animate-pulse" />
                <span>বারকোড স্ক্যান করলে স্বয়ংক্রিয়ভাবে স্টক মাইনাস ও হ্যান্ডওভার সম্পন্ন হবে</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Camera Permission Guide Modal */}
      {showPermissionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-neutral-900">
                    ক্যামেরা পারমিশন অন করার নিয়ম
                  </h3>
                  <p className="text-xs text-neutral-500">
                    ব্রাউজার থেকে ক্যামেরা পারমিশন সক্রিয় করুন
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPermissionModal(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-neutral-700">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-neutral-50 border border-neutral-100">
                <div className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  ১
                </div>
                <div>
                  <p className="font-bold text-neutral-900">
                    ব্রাউজারের উপরে URL বারের বামে <Lock className="w-3.5 h-3.5 inline text-neutral-600 -mt-0.5 mx-0.5" /> (লক / তালা) বা সাইট সেটিংস আইকনে চাপুন।
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    আপনার মোবাইলের Chrome বা Safari ব্রাউজারের অ্যাড্রেস বারে তালা আইকন দেখতে পাবেন।
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-neutral-50 border border-neutral-100">
                <div className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  ২
                </div>
                <div>
                  <p className="font-bold text-neutral-900">
                    <strong>"Permissions"</strong> অথবা <strong>"Site settings"</strong> অপশনে যান।
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-neutral-50 border border-neutral-100">
                <div className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  ৩
                </div>
                <div>
                  <p className="font-bold text-neutral-900">
                    <strong>"Camera"</strong> অপশনটিতে গিয়ে <strong>"Allow" (অনুমতি দিন)</strong> সিলেক্ট করুন।
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-100">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  ৪
                </div>
                <div>
                  <p className="font-bold text-emerald-900">
                    পারমিশন অন করার পর নিচে "📷 পুনরায় ক্যামেরা চালু করুন" বাটনে চাপুন।
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowPermissionModal(false);
                  startCameraScanner();
                }}
                className="flex-1 py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-rose-600/25 transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>📷 পুনরায় ক্যামেরা চালু করুন</span>
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="py-3 px-4 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>পেজ রিলোড</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal Preview & Print */}
      {printingOrder && (
        <CompactInvoicePrintView
          orders={[printingOrder]}
          onClose={() => setPrintingOrder(null)}
        />
      )}

    </div>
  );
};
