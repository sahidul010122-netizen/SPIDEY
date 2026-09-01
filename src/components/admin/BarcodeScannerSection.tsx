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
  Volume2, 
  VolumeX, 
  Zap, 
  AlertTriangle, 
  Check, 
  Truck, 
  Package, 
  Phone, 
  MapPin, 
  Copy, 
  X,
  Layers,
  ArrowRight,
  Clock,
  Plus,
  Minus,
  Edit3,
  CheckCheck,
  PackageCheck,
  Undo2,
  Printer,
  FileText,
  SlidersHorizontal,
  ChevronRight,
  Info
} from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import JsBarcode from 'jsbarcode';
import { Order, JerseyProduct } from '../../types';
import { SiteSettings } from '../../types/settings';
import { CurrencyCode, formatPrice } from '../../utils/currency';
import { playMatchSuccessSound, playMatchFailSound, unlockAudioContext } from '../../utils/scannerSound';
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
          width: 1.2,
          height: 18,
          displayValue: false,
          margin: 0,
          background: 'transparent',
          lineColor: '#1e293b'
        });
      } catch {
        // Silently handle invalid barcode chars
      }
    }
  }, [code]);

  return <svg ref={svgRef} className="h-4 max-w-[110px]" />;
};

export const BarcodeScannerSection: React.FC<BarcodeScannerSectionProps> = ({
  products: initialProducts = [],
  currency = 'BDT',
  onUpdateProduct,
  onGoToOrderProcess,
  onGoToSteadfastApi
}) => {
  // Navigation View: 'parcels' (Main Clean Scanner + Table) or 'stock_matrix' (Size inventory)
  const [activeTab, setActiveTab] = useState<'parcels' | 'stock_matrix'>('parcels');

  // Master Data
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<JerseyProduct[]>(initialProducts);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncingCourier, setIsSyncingCourier] = useState(false);
  const [statusToast, setStatusToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);

  // Scanner UI States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [recentlyMatchedId, setRecentlyMatchedId] = useState<string | null>(null);

  // Last Scan Feedback
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

  // Table Filters & Selection
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'dispatched'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkPrinting, setIsBulkPrinting] = useState(false);

  // Stock Matrix Editing
  const [editingStockProductId, setEditingStockProductId] = useState<string | null>(null);
  const [editableSizeStock, setEditableSizeStock] = useState<Record<string, number>>({});
  const [isSavingStock, setIsSavingStock] = useState(false);
  const [stockSearchQuery, setStockSearchQuery] = useState('');

  // Camera & Decoder References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const zxingControlsRef = useRef<any>(null);
  const barcodeAnimationIdRef = useRef<number | null>(null);
  const lastScannedTimeRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });
  const manualInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setStatusToast({ message, type });
    setTimeout(() => setStatusToast(null), 4000);
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

  // Fetch orders from server & local backup
  const fetchOrders = async () => {
    setIsLoading(true);
    let serverOrders: Order[] = [];
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.orders)) {
          serverOrders = data.orders;
        }
      }
    } catch (err) {
      console.warn('Failed to load orders from API:', err);
    } finally {
      setIsLoading(false);
    }

    let localOrders: Order[] = [];
    try {
      const cached = localStorage.getItem('spidey_master_orders');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) localOrders = parsed;
      }
    } catch {}

    if (serverOrders.length > 0) {
      setOrders(serverOrders);
      try {
        localStorage.setItem('spidey_master_orders', JSON.stringify(serverOrders));
      } catch {}
      return;
    }

    if (localOrders.length > 0) {
      setOrders(localOrders);
      fetch('/api/orders/bulk-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders: localOrders })
      }).catch(() => {});
    }
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

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Start Camera
  const startCamera = async (targetFacing?: 'environment' | 'user') => {
    unlockAudioContext();
    const facing = targetFacing || cameraFacing;
    stopCamera();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('autoplay', 'true');
        videoRef.current.muted = true;
        try {
          await videoRef.current.play();
        } catch {}
      }

      // Start decoding loop
      const reader = new BrowserMultiFormatReader();
      if (videoRef.current) {
        try {
          const controls = await reader.decodeFromVideoElement(videoRef.current, (result) => {
            if (result) {
              handleIncomingBarcode(result.getText());
            }
          });
          zxingControlsRef.current = controls;
        } catch (decErr) {
          console.warn('ZXing scanner setup catch:', decErr);
        }
      }

      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Camera start error:', err);
      showToast('ক্যামেরা চালু করা সম্ভব হয়নি। অনুগ্রহ করে ক্যামেরার পারমিশন দিন।', 'error');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
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
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const toggleCamera = () => {
    if (isCameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  const switchCameraFacing = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    if (isCameraActive) {
      startCamera(nextFacing);
    }
  };

  // Main Barcode Dispatch Handler
  const handleIncomingBarcode = async (rawCode: string) => {
    if (!rawCode || !rawCode.trim() || isProcessingScan) return;

    const cleanCode = rawCode.trim();
    const now = Date.now();

    // Prevent double trigger within 1.5 seconds
    if (lastScannedTimeRef.current.code === cleanCode && now - lastScannedTimeRef.current.time < 1500) {
      return;
    }
    lastScannedTimeRef.current = { code: cleanCode, time: now };

    setIsProcessingScan(true);
    setManualCodeInput('');

    try {
      const res = await fetch('/api/warehouse/scan-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanCode: cleanCode })
      });

      const data = await res.json();

      if (data.success && data.order) {
        if (soundEnabled) playMatchSuccessSound();

        // Update state
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
            : `✔ সফল স্ক্যান! পার্সেলটি ডিসপ্যাচ হয়েছে এবং সাইজ অনুযায়ী স্টক ডিডাক্ট সম্পন্ন হয়েছে!`,
          deductedDetails: data.deductedDetails,
          timestamp: now
        });
      } else {
        if (soundEnabled) playMatchFailSound();
        setLastScanResult({
          status: 'fail',
          code: cleanCode,
          message: data.message || `✕ কোনো ম্যাচিং অর্ডার পাওয়া যায়নি (${cleanCode})।`,
          timestamp: now
        });
      }
    } catch (err: any) {
      if (soundEnabled) playMatchFailSound();
      setLastScanResult({
        status: 'fail',
        code: cleanCode,
        message: 'স্ক্যান প্রসেসিং ত্রুটি: ' + (err.message || 'Network error'),
        timestamp: now
      });
    } finally {
      setIsProcessingScan(false);
      // Auto re-focus manual input for high-speed scanning gun
      setTimeout(() => {
        manualInputRef.current?.focus();
      }, 100);
    }
  };

  // Revert Order from Dispatched/Done back to Pending (Restores Inventory Stock)
  const handleRevertOrderToPending = async (order: Order) => {
    try {
      const res = await fetch('/api/warehouse/revert-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id })
      });

      const data = await res.json();

      if (data.success && data.order) {
        if (soundEnabled) playMatchSuccessSound();

        setOrders(prev => {
          const updated = prev.map(o => o.id === order.id ? data.order : o);
          try {
            localStorage.setItem('spidey_master_orders', JSON.stringify(updated));
          } catch {}
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('spidey-orders-updated', { detail: { orders: updated } }));
          }
          return updated;
        });

        if (Array.isArray(data.updatedProducts)) {
          setProducts(data.updatedProducts);
        }

        showToast(`অর্ডার (${order.invoiceNumber || order.id}) পুনরায় পেন্ডিং করা হয়েছে এবং স্টক রিস্টোর হয়েছে!`, 'success');
        
        // Clear or update last scan banner
        if (lastScanResult && lastScanResult.order?.id === order.id) {
          setLastScanResult(null);
        }
      } else {
        showToast(data.message || 'পেন্ডিং এ ফেরত নেওয়া সম্ভব হয়নি', 'error');
      }
    } catch (err: any) {
      showToast('সার্ভার এরর: ' + err.message, 'error');
    }
  };

  // Single Order Dispatch Trigger
  const handleDirectDispatch = async (order: Order) => {
    await handleIncomingBarcode(order.invoiceNumber || order.trackingCode || order.id);
  };

  // Delete Single Order Permanently
  const handleDeleteOrder = async (order: Order) => {
    if (!window.confirm(`আপনি কি নিশ্চিত যে অর্ডারটি (${order.customerName} - ${order.invoiceNumber || order.id}) স্থায়ীভাবে ডিলিট করতে চান?`)) {
      return;
    }

    setDeletingOrderId(order.id);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (data.success) {
        setOrders(prev => {
          const updated = prev.filter(o => o.id !== order.id);
          try {
            localStorage.setItem('spidey_master_orders', JSON.stringify(updated));
          } catch {}
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('spidey-orders-updated', { detail: { orders: updated } }));
          }
          return updated;
        });

        setSelectedOrderIds(prev => {
          const next = new Set(prev);
          next.delete(order.id);
          return next;
        });

        showToast('অর্ডার সফলভাবে স্থায়ীভাবে ডিলিট করা হয়েছে।', 'info');
      } else {
        showToast(data.message || 'ডিলিট সম্পন্ন করা যায়নি', 'error');
      }
    } catch (err: any) {
      showToast('ডিলিট এরর: ' + err.message, 'error');
    } finally {
      setDeletingOrderId(null);
    }
  };

  // Bulk Delete Selected Orders
  const handleBulkDeleteSelected = async () => {
    const ids = Array.from(selectedOrderIds);
    if (ids.length === 0) return;

    if (!window.confirm(`আপনি কি নিশ্চিত যে নির্বাচিত ${ids.length} টি অর্ডার স্থায়ীভাবে ডিলিট করতে চান?`)) {
      return;
    }

    setIsBulkDeleting(true);
    try {
      const res = await fetch('/api/orders/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });

      const data = await res.json();
      if (data.success) {
        setOrders(prev => {
          const updated = prev.filter(o => !selectedOrderIds.has(o.id));
          try {
            localStorage.setItem('spidey_master_orders', JSON.stringify(updated));
          } catch {}
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('spidey-orders-updated', { detail: { orders: updated } }));
          }
          return updated;
        });

        setSelectedOrderIds(new Set());
        showToast(`${ids.length} টি অর্ডার স্থায়ীভাবে ডিলিট সম্পন্ন হয়েছে।`, 'info');
      } else {
        showToast(data.message || 'বাল্ক ডিলিট ব্যর্থ হয়েছে', 'error');
      }
    } catch (err: any) {
      showToast('বাল্ক ডিলিট এরর: ' + err.message, 'error');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Bulk Revert Selected to Pending
  const handleBulkRevertToPending = async () => {
    const ids = Array.from(selectedOrderIds);
    if (ids.length === 0) return;

    let successCount = 0;
    for (const id of ids) {
      const target = orders.find(o => o.id === id);
      if (target) {
        try {
          const res = await fetch('/api/warehouse/revert-scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: id })
          });
          const data = await res.json();
          if (data.success && data.order) {
            successCount++;
            setOrders(prev => prev.map(o => o.id === id ? data.order : o));
            if (Array.isArray(data.updatedProducts)) {
              setProducts(data.updatedProducts);
            }
          }
        } catch {}
      }
    }

    setSelectedOrderIds(new Set());
    fetchOrders();
    showToast(`${successCount} টি অর্ডার সফলভাবে পেন্ডিং এ নেওয়া হয়েছে এবং স্টক রিস্টোর হয়েছে!`, 'success');
  };

  // Bulk Dispatch Selected
  const handleBulkDispatchSelected = async () => {
    const ids = Array.from(selectedOrderIds);
    if (ids.length === 0) return;

    let successCount = 0;
    for (const id of ids) {
      const target = orders.find(o => o.id === id);
      if (target) {
        try {
          const res = await fetch('/api/warehouse/scan-dispatch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scanCode: target.invoiceNumber || target.trackingCode || target.id })
          });
          const data = await res.json();
          if (data.success && data.order) {
            successCount++;
            setOrders(prev => prev.map(o => o.id === id ? data.order : o));
            if (Array.isArray(data.updatedProducts)) {
              setProducts(data.updatedProducts);
            }
          }
        } catch {}
      }
    }

    setSelectedOrderIds(new Set());
    fetchOrders();
    showToast(`${successCount} টি অর্ডার সফলভাবে ডিসপ্যাচ করা হয়েছে এবং স্টক ডিডাক্ট হয়েছে!`, 'success');
  };

  // Sync Steadfast Status
  const handleSyncCourierStatus = async () => {
    try {
      setIsSyncingCourier(true);
      showToast('Steadfast API থেকে লাইভ স্ট্যাটাস সিঙ্ক হচ্ছে...', 'info');

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
        showToast(data.message || `সিঙ্ক সম্পন্ন (${data.updatedCount} টি পার্সেল আপডেট)`, 'success');
      } else {
        showToast(data.message || 'Steadfast সিঙ্ক সম্পন্ন করা যায়নি।', 'error');
      }
    } catch (err: any) {
      showToast('কুরিয়ার সিঙ্ক সমস্যা: ' + err.message, 'error');
    } finally {
      setIsSyncingCourier(false);
    }
  };

  // Stock Matrix Quick Edit
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
        showToast(`'${product.title}' সাইজ স্টক সফলভাবে সেভ হয়েছে! (মোট: ${totalCount})`, 'success');
      } else {
        showToast(data.message || 'স্টক সেভ ব্যর্থ হয়েছে', 'error');
      }
    } catch (err: any) {
      showToast('স্টক সেভ ত্রুটি: ' + err.message, 'error');
    } finally {
      setIsSavingStock(false);
    }
  };

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchesQuery = 
          (order.customerName && order.customerName.toLowerCase().includes(q)) ||
          (order.phoneNumber && order.phoneNumber.toLowerCase().includes(q)) ||
          (order.id && order.id.toLowerCase().includes(q)) ||
          (order.invoiceNumber && order.invoiceNumber.toLowerCase().includes(q)) ||
          (order.trackingCode && order.trackingCode.toLowerCase().includes(q)) ||
          (order.consignmentId && order.consignmentId.toLowerCase().includes(q)) ||
          (Array.isArray(order.items) && order.items.some(i => i.product?.title?.toLowerCase().includes(q)));

        if (!matchesQuery) return false;
      }

      const isDispatched = order.status === 'shipped' || order.status === 'dispatched' || order.status === 'delivered' || order.barcodeScanned;

      if (filterTab === 'pending' && isDispatched) return false;
      if (filterTab === 'dispatched' && !isDispatched) return false;

      return true;
    });
  }, [orders, searchQuery, filterTab]);

  // Metrics
  const metrics = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter(o => o.status !== 'shipped' && o.status !== 'dispatched' && o.status !== 'delivered' && !o.barcodeScanned).length;
    const dispatched = orders.filter(o => (o.status === 'shipped' || o.status === 'dispatched' || o.barcodeScanned) && o.status !== 'delivered' && o.courierStatus !== 'delivered').length;
    const delivered = orders.filter(o => o.status === 'delivered' || o.courierStatus === 'delivered').length;
    const totalStock = products.reduce((acc, p) => acc + (Number(p.stockCount) || 0), 0);

    return { total, pending, dispatched, delivered, totalStock };
  }, [orders, products]);

  const isAllSelected = filteredOrders.length > 0 && selectedOrderIds.size === filteredOrders.length;
  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const handleToggleSelectOrder = (id: string) => {
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectedOrdersList = useMemo(() => {
    return orders.filter(o => selectedOrderIds.has(o.id));
  }, [orders, selectedOrderIds]);

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Toast Alert */}
      {statusToast && (
        <div className={`p-3.5 rounded-2xl text-white text-xs font-semibold flex items-center justify-between gap-3 shadow-lg fixed bottom-6 right-6 z-50 animate-slideUp border border-white/20 ${
          statusToast.type === 'error' ? 'bg-rose-600' : statusToast.type === 'info' ? 'bg-neutral-900' : 'bg-emerald-600'
        }`}>
          <div className="flex items-center gap-2">
            {statusToast.type === 'error' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{statusToast.message}</span>
          </div>
          <button onClick={() => setStatusToast(null)} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. TOP HEADER & METRIC SUMMARY CARDS */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-neutral-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-neutral-900 text-white flex items-center justify-center shadow-xs shrink-0">
            <ScanLine className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-neutral-900 tracking-tight">
                ওয়্যারহাউস বারকোড স্ক্যানার ও স্টক ডিসপ্যাচ
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200/60">
                অটো স্টক ডিডাক্ট
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              বারকোড বা ইনভয়েস স্ক্যান করলেই পার্সেল ডিসপ্যাচ হবে এবং সাইজ অনুযায়ী স্টক স্বয়ংক্রিয়ভাবে কমে যাবে।
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sub-tab Switcher */}
          <div className="p-1 bg-neutral-100 rounded-2xl flex items-center gap-1 border border-neutral-200/60">
            <button
              onClick={() => setActiveTab('parcels')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'parcels'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Truck className="w-3.5 h-3.5 text-rose-500" />
              <span>পার্সেল স্ক্যানার ({orders.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('stock_matrix')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'stock_matrix'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-500" />
              <span>সাইজ স্টক ম্যাট্রিক্স</span>
            </button>
          </div>

          {/* Steadfast Status Sync Button */}
          <button
            onClick={handleSyncCourierStatus}
            disabled={isSyncingCourier}
            className="px-3.5 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
            title="Steadfast API থেকে ট্র্যাকিং স্ট্যাটাস আপডেট করুন"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCourier ? 'animate-spin' : ''}`} />
            <span>{isSyncingCourier ? 'সিঙ্ক হচ্ছে...' : 'Steadfast সিঙ্ক'}</span>
          </button>
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Metric 1: Total Parcels */}
        <div 
          onClick={() => { setActiveTab('parcels'); setFilterTab('all'); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            filterTab === 'all' && activeTab === 'parcels'
              ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
              : 'bg-white text-neutral-900 border-neutral-200/80 hover:border-neutral-400'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold opacity-75">
            <span>মোট অর্ডার</span>
            <Package className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black mt-1 font-mono">{metrics.total}</div>
          <span className="text-[10px] opacity-60 block mt-0.5">সবগুলো পার্সেল</span>
        </div>

        {/* Metric 2: Pending Warehouse Scan */}
        <div 
          onClick={() => { setActiveTab('parcels'); setFilterTab('pending'); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            filterTab === 'pending' && activeTab === 'parcels'
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
              : 'bg-white text-neutral-900 border-neutral-200/80 hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-amber-600">
            <span className={filterTab === 'pending' && activeTab === 'parcels' ? 'text-white' : 'text-amber-600'}>স্ক্যান বাকি (Pending)</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className={`text-2xl font-black mt-1 font-mono ${filterTab === 'pending' && activeTab === 'parcels' ? 'text-white' : 'text-amber-600'}`}>
            {metrics.pending}
          </div>
          <span className="text-[10px] opacity-60 block mt-0.5">ওয়্যারহাউসে প্রস্তুত আছে</span>
        </div>

        {/* Metric 3: Dispatched / Done */}
        <div 
          onClick={() => { setActiveTab('parcels'); setFilterTab('dispatched'); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            filterTab === 'dispatched' && activeTab === 'parcels'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-white text-neutral-900 border-neutral-200/80 hover:border-emerald-400'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-emerald-600">
            <span className={filterTab === 'dispatched' && activeTab === 'parcels' ? 'text-white' : 'text-emerald-600'}>ডিসপ্যাচ সম্পন্ন (Done)</span>
            <PackageCheck className="w-4 h-4" />
          </div>
          <div className={`text-2xl font-black mt-1 font-mono ${filterTab === 'dispatched' && activeTab === 'parcels' ? 'text-white' : 'text-emerald-600'}`}>
            {metrics.dispatched}
          </div>
          <span className="text-[10px] opacity-60 block mt-0.5">স্টক ডিডাক্ট সম্পন্ন</span>
        </div>

        {/* Metric 4: Delivered */}
        <div className="p-4 rounded-2xl bg-white border border-neutral-200/80">
          <div className="flex items-center justify-between text-xs font-bold text-purple-600">
            <span>ডেলিভার্ড</span>
            <CheckCheck className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-purple-600 mt-1 font-mono">{metrics.delivered}</div>
          <span className="text-[10px] text-neutral-400 block mt-0.5">সফলভাবে হস্তান্তর</span>
        </div>
      </div>

      {activeTab === 'parcels' ? (
        <>
          {/* 3. COMPACT & CLEAN SCANNER BAR */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white border border-neutral-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Manual Barcode Input */}
              <div className="relative flex-1">
                <ScanLine className="w-5 h-5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={manualInputRef}
                  type="text"
                  value={manualCodeInput}
                  onChange={(e) => setManualCodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && manualCodeInput.trim()) {
                      handleIncomingBarcode(manualCodeInput);
                    }
                  }}
                  placeholder="বারকোড / ইনভয়েস / ট্র্যাকিং নম্বর স্ক্যান বা টাইপ করুন (Enter চাপুন)..."
                  className="w-full pl-11 pr-24 py-3 rounded-2xl bg-neutral-50 border border-neutral-200 text-sm font-medium text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-neutral-900 focus:outline-hidden transition-all"
                  autoFocus
                />
                <button
                  onClick={() => handleIncomingBarcode(manualCodeInput)}
                  disabled={!manualCodeInput.trim() || isProcessingScan}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-30"
                >
                  <Zap className="w-3.5 h-3.5 text-rose-400" />
                  <span>{isProcessingScan ? '...' : 'ডিসপ্যাচ'}</span>
                </button>
              </div>

              {/* Camera Scanner Toggle Button */}
              <button
                onClick={toggleCamera}
                className={`px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all shrink-0 ${
                  isCameraActive
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200/60'
                }`}
              >
                {isCameraActive ? (
                  <>
                    <CameraOff className="w-4 h-4 text-rose-600" />
                    <span>ক্যামেরা বন্ধ করুন</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 text-neutral-600" />
                    <span>ক্যামেরা স্ক্যানার চালু</span>
                  </>
                )}
              </button>

              {/* Sound Feedback Toggle */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-3 rounded-2xl border transition-all shrink-0 flex items-center justify-center ${
                  soundEnabled
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-neutral-50 text-neutral-400 border-neutral-200'
                }`}
                title={soundEnabled ? 'সাউন্ড অন' : 'সাউন্ড অফ'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>

            {/* Live Camera Viewfinder (If Active) */}
            {isCameraActive && (
              <div className="relative rounded-2xl overflow-hidden bg-neutral-950 aspect-video max-h-72 border border-neutral-800 shadow-inner flex items-center justify-center">
                <video ref={videoRef} className="w-full h-full object-cover" />
                
                {/* Laser scan line overlay */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <div className="w-64 h-36 border-2 border-dashed border-rose-500/80 rounded-xl relative shadow-2xl">
                    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-rose-500 shadow-[0_0_12px_#f43f5e] animate-pulse" />
                  </div>
                  <span className="text-[11px] text-white/80 bg-neutral-900/80 px-2.5 py-1 rounded-full mt-3 backdrop-blur-xs">
                    পার্সেলের বারকোড বক্সের ভেতরে ধরুন
                  </span>
                </div>

                {/* Switch Camera Button */}
                <button
                  onClick={switchCameraFacing}
                  className="absolute top-3 right-3 p-2 rounded-xl bg-neutral-900/80 text-white hover:bg-neutral-900 text-xs flex items-center gap-1.5 backdrop-blur-xs border border-white/10"
                >
                  <SwitchCamera className="w-4 h-4" />
                  <span>ক্যামেরা পরিবর্তন</span>
                </button>
              </div>
            )}

            {/* Live Scan Result Banner */}
            {lastScanResult && (
              <div className={`p-4 rounded-2xl border transition-all animate-fadeIn flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                lastScanResult.status === 'success'
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                  : lastScanResult.status === 'warning'
                  ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                  : 'bg-rose-50/80 border-rose-200 text-rose-950'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    lastScanResult.status === 'success'
                      ? 'bg-emerald-600 text-white'
                      : lastScanResult.status === 'warning'
                      ? 'bg-amber-600 text-white'
                      : 'bg-rose-600 text-white'
                  }`}>
                    {lastScanResult.status === 'success' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : lastScanResult.status === 'warning' ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <XCircle className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{lastScanResult.message}</span>
                      {lastScanResult.order?.invoiceNumber && (
                        <span className="px-2 py-0.5 rounded-md bg-white text-xs font-mono font-bold border border-neutral-200">
                          #{lastScanResult.order.invoiceNumber}
                        </span>
                      )}
                    </div>
                    {lastScanResult.order && (
                      <div className="text-xs text-neutral-600 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>গ্রাহক: <b>{lastScanResult.order.customerName}</b> ({lastScanResult.order.phoneNumber})</span>
                        {lastScanResult.deductedDetails && lastScanResult.deductedDetails.length > 0 && (
                          <span className="text-emerald-700 font-semibold">
                            ডিডাক্টেড সাইজ স্টক: {lastScanResult.deductedDetails.map(d => `${d.productTitle} (${d.size}: ${d.previousStock} ➔ ${d.newStock})`).join(', ')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Instant Revert Button if scanned by mistake */}
                {lastScanResult.order && (
                  <button
                    onClick={() => handleRevertOrderToPending(lastScanResult.order!)}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-100 text-neutral-800 text-xs font-bold border border-neutral-300 flex items-center gap-1.5 self-start sm:self-center shrink-0 shadow-xs transition-all"
                  >
                    <Undo2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>ভুলে স্ক্যান হয়েছে? (পেন্ডিং করুন)</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 4. ORDERS LIST & BULK ACTIONS TOOLBAR */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white border border-neutral-200/80 shadow-xs space-y-4">
            {/* Filter Tabs & Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Segmented Filter Tabs */}
              <div className="p-1 bg-neutral-100 rounded-2xl flex items-center gap-1 border border-neutral-200/60 shrink-0">
                <button
                  onClick={() => setFilterTab('all')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    filterTab === 'all'
                      ? 'bg-white text-neutral-900 shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  সবগুলো ({orders.length})
                </button>
                <button
                  onClick={() => setFilterTab('pending')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    filterTab === 'pending'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  <span>⏳ স্ক্যান বাকি</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-black/10 text-[10px]">
                    {metrics.pending}
                  </span>
                </button>
                <button
                  onClick={() => setFilterTab('dispatched')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    filterTab === 'dispatched'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  <span>✅ ডিসপ্যাচড</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-black/10 text-[10px]">
                    {metrics.dispatched}
                  </span>
                </button>
              </div>

              {/* Search Box */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="নাম, ফোন, ইনভয়েস বা ট্র্যাকিং কোড দিয়ে খুঁজুন..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-medium text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-neutral-900 focus:outline-hidden transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Bulk Action Toolbar (When Items are Selected) */}
            {selectedOrderIds.size > 0 && (
              <div className="p-3 rounded-2xl bg-neutral-900 text-white flex flex-wrap items-center justify-between gap-3 shadow-md animate-fadeIn">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center font-mono">
                    {selectedOrderIds.size}
                  </span>
                  <span>টি অর্ডার নির্বাচিত হয়েছে</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Bulk Mark as Pending (Restores Stock) */}
                  <button
                    onClick={handleBulkRevertToPending}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                    title="নির্বাচিত অর্ডারগুলোকে পুনরায় পেন্ডিং করুন এবং সাইজ স্টক রিস্টোর করুন"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>পেন্ডিং করুন (স্টক রিস্টোর)</span>
                  </button>

                  {/* Bulk Dispatch (Deducts Stock) */}
                  <button
                    onClick={handleBulkDispatchSelected}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                    title="নির্বাচিত অর্ডারগুলোকে ডিসপ্যাচ করুন এবং সাইজ স্টক ডিডাক্ট করুন"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>ডিসপ্যাচ করুন (স্টক ডিডাক্ট)</span>
                  </button>

                  {/* Bulk Print */}
                  <button
                    onClick={() => setIsBulkPrinting(true)}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>প্রিন্ট ইনভয়েস</span>
                  </button>

                  {/* Bulk Delete Permanently */}
                  <button
                    onClick={handleBulkDeleteSelected}
                    disabled={isBulkDeleting}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isBulkDeleting ? 'মুছছে...' : 'ডিলিট করুন'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Orders Table */}
            {isLoading ? (
              <div className="py-12 text-center text-neutral-400 text-xs font-medium flex flex-col items-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-neutral-400" />
                <span>অর্ডার লোড হচ্ছে...</span>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="py-12 text-center text-neutral-400 text-xs font-medium flex flex-col items-center gap-2">
                <Package className="w-8 h-8 text-neutral-300" />
                <span>কোনো ম্যাচিং অর্ডার পাওয়া যায়নি।</span>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-neutral-200/80">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50/90 text-neutral-600 uppercase text-[10px] tracking-wider border-b border-neutral-200">
                    <tr>
                      <th className="p-3.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={handleToggleSelectAll}
                          className="rounded-md border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                        />
                      </th>
                      <th className="p-3.5 font-bold">ইনভয়েস ও ট্র্যাকিং</th>
                      <th className="p-3.5 font-bold">গ্রাহকের তথ্য</th>
                      <th className="p-3.5 font-bold">জার্সি ও সাইজ</th>
                      <th className="p-3.5 font-bold">টাকার পরিমাণ</th>
                      <th className="p-3.5 font-bold">স্ট্যাটাস</th>
                      <th className="p-3.5 font-bold text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200/80">
                    {filteredOrders.map((order) => {
                      const isDispatched = order.status === 'shipped' || order.status === 'dispatched' || order.status === 'delivered' || order.barcodeScanned;
                      const isDelivered = order.status === 'delivered' || order.courierStatus === 'delivered';
                      const isSelected = selectedOrderIds.has(order.id);
                      const isRecentlyMatched = recentlyMatchedId === order.id;

                      return (
                        <tr
                          key={order.id}
                          className={`transition-colors hover:bg-neutral-50/60 ${
                            isRecentlyMatched
                              ? 'bg-emerald-50/90 font-medium'
                              : isSelected
                              ? 'bg-neutral-50'
                              : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="p-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectOrder(order.id)}
                              className="rounded-md border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                            />
                          </td>

                          {/* Invoice & Tracking Barcode */}
                          <td className="p-3.5">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-neutral-900 text-xs">
                                  #{order.invoiceNumber || order.id}
                                </span>
                              </div>

                              {/* Steadfast Tracking Code */}
                              {order.trackingCode ? (
                                <div className="flex items-center gap-1">
                                  <span className="px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 font-mono text-[10px] font-bold border border-rose-200/60">
                                    {order.trackingCode}
                                  </span>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(order.trackingCode!);
                                      showToast('ট্র্যাকিং কোড কপি করা হয়েছে: ' + order.trackingCode);
                                    }}
                                    className="text-neutral-400 hover:text-neutral-700"
                                    title="কপি করুন"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <MiniBarcode code={order.invoiceNumber || order.id} />
                              )}
                            </div>
                          </td>

                          {/* Customer Info */}
                          <td className="p-3.5">
                            <div>
                              <div className="font-bold text-neutral-900">{order.customerName}</div>
                              <div className="text-neutral-500 font-mono text-[11px] flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-neutral-400" />
                                <span>{order.phoneNumber || 'N/A'}</span>
                              </div>
                              <div className="text-neutral-400 text-[10px] truncate max-w-[180px] mt-0.5" title={order.shippingAddress}>
                                {order.shippingAddress}
                              </div>
                            </div>
                          </td>

                          {/* Items & Sizes */}
                          <td className="p-3.5">
                            <div className="space-y-1 max-w-[220px]">
                              {Array.isArray(order.items) && order.items.map((it, idx) => (
                                <div key={idx} className="flex items-center gap-1 text-[11px] text-neutral-800">
                                  <span className="font-medium truncate">{it.product?.title || 'Jersey'}</span>
                                  <span className="px-1.5 py-0.2 rounded-md bg-neutral-100 text-neutral-700 font-mono font-bold text-[10px] shrink-0">
                                    {it.selectedSize || 'L'} × {it.quantity || 1}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="p-3.5 font-mono font-bold text-neutral-900">
                            {formatPrice(order.totalAmount || order.codAmount || 0, currency)}
                          </td>

                          {/* Status Badge */}
                          <td className="p-3.5">
                            {isDelivered ? (
                              <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 font-bold text-[10px] flex items-center gap-1 w-fit border border-purple-200/60">
                                <CheckCheck className="w-3 h-3" />
                                <span>ডেলিভার্ড</span>
                              </span>
                            ) : isDispatched ? (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] flex items-center gap-1 w-fit border border-emerald-200/60">
                                <PackageCheck className="w-3 h-3" />
                                <span>ডিসপ্যাচ সম্পন্ন</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px] flex items-center gap-1 w-fit border border-amber-200/60">
                                <Clock className="w-3 h-3" />
                                <span>স্ক্যান বাকি (Pending)</span>
                              </span>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Revert / Dispatch Toggle Button */}
                              {isDispatched ? (
                                <button
                                  onClick={() => handleRevertOrderToPending(order)}
                                  className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-200/70 flex items-center gap-1 transition-all"
                                  title="অর্ডারটি পুনরায় পেন্ডিং করুন এবং সাইজ স্টক রিস্টোর করুন"
                                >
                                  <Undo2 className="w-3.5 h-3.5 text-amber-600" />
                                  <span>পেন্ডিং করুন</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleDirectDispatch(order)}
                                  className="px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-[11px] font-bold flex items-center gap-1 transition-all shadow-xs"
                                  title="ডিসপ্যাচ করুন এবং সাইজ স্টক ডিডাক্ট করুন"
                                >
                                  <Zap className="w-3.5 h-3.5 text-rose-400" />
                                  <span>ডিসপ্যাচ</span>
                                </button>
                              )}

                              {/* Delete Single Order Button */}
                              <button
                                onClick={() => handleDeleteOrder(order)}
                                disabled={deletingOrderId === order.id}
                                className="p-1.5 rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                                title="অর্ডার স্থায়ীভাবে ডিলিট করুন"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* 5. SIZE STOCK MATRIX SUB-TAB */
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-neutral-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">জার্সি সাইজ স্টক ম্যাট্রিক্স (Live Inventory)</h3>
              <p className="text-xs text-neutral-500">প্রতিটি জার্সির সাইজ অনুযায়ী ফিজিক্যাল স্টক পর্যবেক্ষণ ও পরিবর্তন করুন।</p>
            </div>

            {/* Search */}
            <div className="relative max-w-xs">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={stockSearchQuery}
                onChange={(e) => setStockSearchQuery(e.target.value)}
                placeholder="জার্সি সার্চ করুন..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-medium text-neutral-900 focus:outline-hidden focus:bg-white"
              />
            </div>
          </div>

          {/* Product Stock Table */}
          <div className="overflow-x-auto rounded-2xl border border-neutral-200/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-600 uppercase text-[10px] tracking-wider border-b border-neutral-200">
                <tr>
                  <th className="p-3.5 font-bold">জার্সি নাম ও কোড</th>
                  {STANDARD_SIZES.map(sz => (
                    <th key={sz} className="p-3.5 font-bold text-center">{sz}</th>
                  ))}
                  <th className="p-3.5 font-bold text-center">মোট স্টক</th>
                  <th className="p-3.5 font-bold text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/80">
                {products
                  .filter(p => !stockSearchQuery || p.title.toLowerCase().includes(stockSearchQuery.toLowerCase()) || (p.code && p.code.toLowerCase().includes(stockSearchQuery.toLowerCase())))
                  .map((product) => {
                    const isEditing = editingStockProductId === product.id;
                    const sizeStock = isEditing ? editableSizeStock : getProductSizeStock(product);
                    const totalStock = Object.values(sizeStock).reduce((a, b) => a + (Number(b) || 0), 0);

                    return (
                      <tr key={product.id} className="hover:bg-neutral-50/50">
                        <td className="p-3.5">
                          <div className="font-bold text-neutral-900">{product.title}</div>
                          <div className="text-[10px] text-neutral-400 font-mono">{product.code || product.id}</div>
                        </td>

                        {/* Sizes Columns */}
                        {STANDARD_SIZES.map(sz => (
                          <td key={sz} className="p-3.5 text-center font-mono">
                            {isEditing ? (
                              <div className="inline-flex items-center gap-1">
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
                              <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                                (sizeStock[sz] || 0) > 0 ? 'bg-neutral-100 text-neutral-800' : 'bg-rose-50 text-rose-600'
                              }`}>
                                {sizeStock[sz] || 0}
                              </span>
                            )}
                          </td>
                        ))}

                        {/* Total Stock */}
                        <td className="p-3.5 text-center font-mono font-bold text-neutral-900">
                          <span className={`px-2.5 py-1 rounded-full text-xs ${
                            totalStock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
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
                                className="px-2.5 py-1.5 rounded-xl bg-neutral-900 text-white text-xs font-bold flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>সেভ</span>
                              </button>
                              <button
                                onClick={() => setEditingStockProductId(null)}
                                className="px-2.5 py-1.5 rounded-xl bg-neutral-100 text-neutral-600 text-xs font-bold"
                              >
                                বাতিল
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleOpenEditStock(product)}
                              className="px-2.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold flex items-center gap-1 ml-auto"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-neutral-500" />
                              <span>স্টক এডিট</span>
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
      )}

      {/* Bulk Invoice Print Modal */}
      {isBulkPrinting && (
        <CompactInvoicePrintView
          orders={selectedOrdersList}
          siteSettings={siteSettings}
          currency={currency}
          onClose={() => setIsBulkPrinting(false)}
        />
      )}
    </div>
  );
};
