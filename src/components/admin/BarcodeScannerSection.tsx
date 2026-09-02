import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  ScanLine, 
  Camera, 
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
  Package, 
  Phone, 
  X,
  Clock,
  PackageCheck,
  Undo2,
  Printer,
  Flashlight,
  ExternalLink,
  RotateCcw
} from 'lucide-react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import JsBarcode from 'jsbarcode';
import { Order, JerseyProduct } from '../../types';
import { SiteSettings } from '../../types/settings';
import { CurrencyCode, formatPrice } from '../../utils/currency';
import { playMatchSuccessSound, playMatchFailSound, unlockAudioContext } from '../../utils/scannerSound';
import { CompactInvoicePrintView } from './CompactInvoicePrintView';

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
  siteSettings,
  onUpdateProduct,
  onGoToOrderProcess,
  onGoToSteadfastApi
}) => {
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
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);

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

  // Print Modal State
  const [printModalState, setPrintModalState] = useState<{
    isOpen: boolean;
    orders: Order[];
    paperSize: '3inch' | 'a4';
  }>({
    isOpen: false,
    orders: [],
    paperSize: '3inch'
  });

  // Camera & Video Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const zxingControlsRef = useRef<IScannerControls | null>(null);
  const detectorIntervalRef = useRef<any>(null);
  const lastScannedTimeRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });
  const manualInputRef = useRef<HTMLInputElement | null>(null);
  const scanResultTimeoutRef = useRef<any>(null);

  // Stable references to prevent camera unmount / blink re-renders
  const ordersRef = useRef<Order[]>([]);
  ordersRef.current = orders;
  const soundEnabledRef = useRef<boolean>(soundEnabled);
  soundEnabledRef.current = soundEnabled;
  const isProcessingScanRef = useRef<boolean>(isProcessingScan);
  isProcessingScanRef.current = isProcessingScan;

  // Toast Helper
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setStatusToast({ message, type });
    setTimeout(() => {
      setStatusToast(null);
    }, 3500);
  };

  // Sync initialProducts
  useEffect(() => {
    if (initialProducts.length > 0) {
      setProducts(initialProducts);
    }
  }, [initialProducts]);

  // Fetch live products
  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        setProducts(data.products);
      }
    } catch {}
  };

  // Fetch orders from server & local storage synchronization
  const fetchOrders = useCallback(async () => {
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

    // Intelligent merge of local and server orders
    if (serverOrders.length > 0 && localOrders.length > 0) {
      const serverMap = new Map(serverOrders.map(o => [o.id, o]));
      const merged: Order[] = [];
      const toSync: Order[] = [];

      for (const s of serverOrders) {
        const l = localOrders.find(o => o.id === s.id);
        if (l && (l.barcodeScanned || l.status === 'shipped') && !s.barcodeScanned) {
          merged.push(l);
          toSync.push(l);
        } else {
          merged.push(s);
        }
      }

      for (const l of localOrders) {
        if (!serverMap.has(l.id)) {
          merged.push(l);
          toSync.push(l);
        }
      }

      setOrders(merged);
      try {
        localStorage.setItem('spidey_master_orders', JSON.stringify(merged));
      } catch {}

      if (toSync.length > 0) {
        fetch('/api/orders/bulk-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orders: toSync })
        }).catch(() => {});
      }
      return;
    }

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
  }, []);

  // Multi-event synchronization listener
  useEffect(() => {
    fetchOrders();

    // Cross-panel live synchronization listener (Order Process <-> Barcode Scanner)
    const handleOrdersSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && Array.isArray(customEvent.detail.orders)) {
        setOrders(customEvent.detail.orders);
      }
    };

    // Storage update listener for multi-tab sync
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'spidey_master_orders' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setOrders(parsed);
        } catch {}
      }
    };

    const handleWindowFocus = () => {
      fetchOrders();
    };

    window.addEventListener('spidey-orders-updated', handleOrdersSync);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('spidey-orders-updated', handleOrdersSync);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [fetchOrders]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  // Stop camera helper
  const stopCameraStream = () => {
    if (detectorIntervalRef.current) {
      clearInterval(detectorIntervalRef.current);
      detectorIntervalRef.current = null;
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
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsTorchOn(false);
  };

  // Helper to trigger 1-second auto-dismiss of scan result
  const triggerAutoDismissScanResult = (result: any) => {
    setLastScanResult(result);
    if (scanResultTimeoutRef.current) {
      clearTimeout(scanResultTimeoutRef.current);
    }
    scanResultTimeoutRef.current = setTimeout(() => {
      setLastScanResult(null);
    }, 1100);
  };

  // Main Barcode Dispatch Handler (Fully stable reference without camera restarts)
  const handleIncomingBarcode = useCallback(async (rawCode: string) => {
    if (!rawCode || !rawCode.trim() || isProcessingScanRef.current) return;

    let cleanCode = rawCode.trim();
    // Strip common barcode prefixes / invoice URL fragments
    if (cleanCode.includes('/')) {
      const parts = cleanCode.split('/');
      cleanCode = parts[parts.length - 1] || cleanCode;
    }
    if (cleanCode.startsWith('#')) {
      cleanCode = cleanCode.slice(1);
    }

    const now = Date.now();
    // Debounce duplicate scans within 1.0 second
    if (lastScannedTimeRef.current.code.toLowerCase() === cleanCode.toLowerCase() && now - lastScannedTimeRef.current.time < 1000) {
      return;
    }
    lastScannedTimeRef.current = { code: cleanCode, time: now };

    setIsProcessingScan(true);
    isProcessingScanRef.current = true;
    setManualCodeInput('');

    // Unlock Web Audio Context
    unlockAudioContext();

    try {
      // 1. Try server-side scan dispatch
      const res = await fetch('/api/warehouse/scan-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanCode: cleanCode })
      });

      const data = await res.json();

      if (data.success && data.order) {
        if (soundEnabledRef.current) {
          playMatchSuccessSound();
        }

        // Update local orders
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

        // Update products if stock deducted
        if (Array.isArray(data.updatedProducts) && data.updatedProducts.length > 0) {
          setProducts(data.updatedProducts);
        } else {
          fetchProducts();
        }

        setRecentlyMatchedId(data.order.id);
        setTimeout(() => setRecentlyMatchedId(null), 3000);

        triggerAutoDismissScanResult({
          status: 'success',
          code: cleanCode,
          order: data.order,
          message: data.message || `অর্ডার ইতিমধ্যে ডিসপ্যাচ করা হয়েছিল (Invoice: ${data.order.invoiceNumber || data.order.id.slice(-6)})`,
          deductedDetails: data.deductedDetails || [],
          timestamp: Date.now()
        });

        return;
      } else if (data.alreadyDispatched && data.order) {
        if (soundEnabledRef.current) {
          playMatchSuccessSound();
        }
        triggerAutoDismissScanResult({
          status: 'warning',
          code: cleanCode,
          order: data.order,
          message: data.message || `অর্ডার ইতিমধ্যে ডিসপ্যাচ করা হয়েছিল (Invoice: ${data.order.invoiceNumber || data.order.id.slice(-6)})`,
          timestamp: Date.now()
        });
        return;
      }

      // 2. Client-side Local Fallback Matching
      const currentOrders = ordersRef.current;
      const lookupCode = cleanCode.toLowerCase();
      const matchedOrder = currentOrders.find(o => {
        const inv = (o.invoiceNumber || '').toLowerCase();
        const trk = (o.trackingCode || '').toLowerCase();
        const cid = (o.consignmentId || '').toLowerCase();
        const oid = (o.id || '').toLowerCase();
        const ph = (o.phoneNumber || '').replace(/[^0-9]/g, '');
        const cleanDigits = lookupCode.replace(/[^0-9]/g, '');

        return (
          (inv && (inv === lookupCode || inv.endsWith(lookupCode) || lookupCode.endsWith(inv))) ||
          (trk && (trk === lookupCode || lookupCode.includes(trk))) ||
          (cid && (cid === lookupCode || lookupCode.includes(cid))) ||
          (oid && (oid === lookupCode || oid.includes(lookupCode))) ||
          (ph && cleanDigits.length >= 10 && ph.includes(cleanDigits))
        );
      });

      if (matchedOrder) {
        if (soundEnabledRef.current) {
          playMatchSuccessSound();
        }

        const nowIso = new Date().toISOString();
        const updatedOrder: Order = {
          ...matchedOrder,
          status: 'shipped',
          barcodeScanned: true,
          scannedAt: nowIso,
          outboundScannedAt: matchedOrder.outboundScannedAt || nowIso,
          outboundStockDeducted: true,
          courierStatus: matchedOrder.courierStatus === 'delivered' ? 'delivered' : 'sent_to_courier'
        };

        const nextOrders = currentOrders.map(o => o.id === matchedOrder.id ? updatedOrder : o);
        setOrders(nextOrders);
        try {
          localStorage.setItem('spidey_master_orders', JSON.stringify(nextOrders));
        } catch {}

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('spidey-orders-updated', { detail: { orders: nextOrders } }));
        }

        // Sync with backend API
        fetch('/api/orders/bulk-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orders: [updatedOrder] })
        }).catch(() => {});

        setRecentlyMatchedId(updatedOrder.id);
        setTimeout(() => setRecentlyMatchedId(null), 3000);

        triggerAutoDismissScanResult({
          status: 'success',
          code: cleanCode,
          order: updatedOrder,
          message: `অর্ডার ইতিমধ্যে ডিসপ্যাচ করা হয়েছিল (Invoice: ${updatedOrder.invoiceNumber || updatedOrder.id.slice(-6)})`,
          timestamp: Date.now()
        });

        return;
      }

      // 3. No match found - Play Error Buzz and show Fail State
      if (soundEnabledRef.current) {
        playMatchFailSound();
      }

      triggerAutoDismissScanResult({
        status: 'fail',
        code: cleanCode,
        message: data.message || `No order found for code "${cleanCode}"`,
        timestamp: Date.now()
      });

    } catch (err: any) {
      // Local fallback on network error
      const currentOrders = ordersRef.current;
      const lookupCode = cleanCode.toLowerCase();
      const localMatch = currentOrders.find(o => 
        (o.invoiceNumber && o.invoiceNumber.toLowerCase() === lookupCode) ||
        (o.trackingCode && o.trackingCode.toLowerCase() === lookupCode) ||
        (o.id && o.id.toLowerCase().includes(lookupCode))
      );

      if (localMatch) {
        if (soundEnabledRef.current) playMatchSuccessSound();
        const updatedOrder: Order = {
          ...localMatch,
          status: 'shipped',
          barcodeScanned: true,
          outboundStockDeducted: true
        };
        const nextOrders = currentOrders.map(o => o.id === localMatch.id ? updatedOrder : o);
        setOrders(nextOrders);
        try {
          localStorage.setItem('spidey_master_orders', JSON.stringify(nextOrders));
        } catch {}
        triggerAutoDismissScanResult({
          status: 'success',
          code: cleanCode,
          order: updatedOrder,
          message: `অর্ডার ইতিমধ্যে ডিসপ্যাচ করা হয়েছিল (Invoice: ${updatedOrder.invoiceNumber || updatedOrder.id.slice(-6)})`,
          timestamp: Date.now()
        });
      } else {
        if (soundEnabledRef.current) playMatchFailSound();
        triggerAutoDismissScanResult({
          status: 'fail',
          code: cleanCode,
          message: 'Error verifying barcode. Please retry.',
          timestamp: Date.now()
        });
      }
    } finally {
      setIsProcessingScan(false);
      isProcessingScanRef.current = false;
      if (manualInputRef.current) {
        manualInputRef.current.focus();
      }
    }
  }, []);

  const handleIncomingBarcodeRef = useRef(handleIncomingBarcode);
  handleIncomingBarcodeRef.current = handleIncomingBarcode;

  // Start Camera Stream & ZXing Reader
  const initCameraStream = useCallback(async (facing: 'environment' | 'user' = 'environment') => {
    unlockAudioContext();
    stopCameraStream();
    setCameraPermissionError(null);

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('autoplay', 'true');
        videoRef.current.muted = true;
        
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('Video play error:', playErr);
        }

        // 1. Hardware Accelerated Native BarcodeDetector (Chrome / Android / iOS 17+)
        if ('BarcodeDetector' in window) {
          try {
            const barcodeDetector = new (window as any).BarcodeDetector({
              formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'qr_code', 'data_matrix', 'upc_a', 'upc_e', 'itf']
            });

            detectorIntervalRef.current = setInterval(async () => {
              if (videoRef.current && videoRef.current.readyState >= 2 && !videoRef.current.paused) {
                try {
                  const barcodes = await barcodeDetector.detect(videoRef.current);
                  if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                    handleIncomingBarcodeRef.current(barcodes[0].rawValue);
                  }
                } catch {}
              }
            }, 90);
          } catch (detErr) {
            console.warn('Native BarcodeDetector fallback to ZXing:', detErr);
          }
        }

        // 2. High-Performance ZXing MultiFormat Reader Fallback
        const reader = new BrowserMultiFormatReader();
        try {
          const controls = await reader.decodeFromStream(stream, videoRef.current, (result) => {
            if (result) {
              handleIncomingBarcodeRef.current(result.getText());
            }
          });
          zxingControlsRef.current = controls;
        } catch (zxErr) {
          console.warn('ZXing decodeFromStream fallback setup:', zxErr);
        }
      }
    } catch (err: any) {
      console.error('Camera stream error:', err);
      setCameraPermissionError(err.message || 'Camera permission denied or camera device busy.');
      showToast('Camera access denied or unavailable. Check browser permissions.', 'error');
    }
  }, []);

  // Effect to manage camera life-cycle - NEVER re-runs on scan / order updates
  useEffect(() => {
    if (isCameraActive) {
      const timer = setTimeout(() => {
        initCameraStream('environment');
      }, 80);
      return () => {
        clearTimeout(timer);
        stopCameraStream();
      };
    } else {
      stopCameraStream();
    }
  }, [isCameraActive, initCameraStream]);

  const toggleCamera = () => {
    unlockAudioContext();
    setIsCameraActive(prev => !prev);
  };

  // Fixed & Robust Torch / Flashlight Toggle
  const toggleTorch = async () => {
    try {
      if (!mediaStreamRef.current) {
        showToast('Camera stream is not active.', 'info');
        return;
      }
      const tracks = mediaStreamRef.current.getVideoTracks();
      if (!tracks || tracks.length === 0) {
        showToast('No camera track available.', 'info');
        return;
      }
      const track = tracks[0];

      const nextTorchState = !isTorchOn;

      // Method 1: standard applyConstraints advanced torch
      try {
        await (track as any).applyConstraints({
          advanced: [{ torch: nextTorchState }]
        });
        setIsTorchOn(nextTorchState);
        return;
      } catch (err1) {
        console.warn('applyConstraints advanced torch failed, trying fallback:', err1);
      }

      // Method 2: direct torch constraint
      try {
        await (track as any).applyConstraints({
          torch: nextTorchState
        } as any);
        setIsTorchOn(nextTorchState);
        return;
      } catch (err2) {
        console.warn('Direct torch constraint failed:', err2);
      }

      // Method 3: ImageCapture fillLightMode if supported
      try {
        if ('ImageCapture' in window) {
          const imageCapture = new (window as any).ImageCapture(track);
          const capabilities = await imageCapture.getPhotoCapabilities();
          if (capabilities?.fillLightMode?.length > 0) {
            await (track as any).applyConstraints({
              advanced: [{ torch: nextTorchState }]
            });
            setIsTorchOn(nextTorchState);
            return;
          }
        }
      } catch (err3) {
        console.warn('ImageCapture torch failed:', err3);
      }

      showToast('Flashlight is not supported on this device/camera.', 'info');
    } catch (err: any) {
      showToast('Flashlight error: ' + (err.message || 'Unsupported'), 'info');
    }
  };

  // Revert order back to pending
  const handleRevertOrderToPending = async (order: Order) => {
    try {
      const res = await fetch('/api/warehouse/revert-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id })
      });

      const data = await res.json();
      if (data.success && data.order) {
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
        } else {
          fetchProducts();
        }

        setLastScanResult(null);
        showToast(`Order #${order.invoiceNumber || order.id.slice(-6)} reverted to pending and stock restored!`, 'success');
      } else {
        showToast(data.message || 'Failed to revert order', 'error');
      }
    } catch (err: any) {
      showToast('Revert error: ' + err.message, 'error');
    }
  };

  // Delete Single Order
  const handleDeleteOrder = async (order: Order) => {
    if (!window.confirm(`Are you sure you want to permanently delete order #${order.invoiceNumber || order.id.slice(-6)}?`)) {
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

        showToast('Order permanently deleted.', 'info');
      } else {
        showToast(data.message || 'Failed to delete order', 'error');
      }
    } catch (err: any) {
      showToast('Delete error: ' + err.message, 'error');
    } finally {
      setDeletingOrderId(null);
    }
  };

  // Bulk Delete
  const handleBulkDeleteSelected = async () => {
    const ids = Array.from(selectedOrderIds);
    if (ids.length === 0) return;

    if (!window.confirm(`Permanently delete selected ${ids.length} orders?`)) {
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
        showToast(`${ids.length} orders permanently deleted.`, 'info');
      } else {
        showToast(data.message || 'Bulk delete failed', 'error');
      }
    } catch (err: any) {
      showToast('Bulk delete error: ' + err.message, 'error');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Bulk Revert
  const handleBulkRevertToPending = async () => {
    const ids = Array.from(selectedOrderIds);
    if (ids.length === 0) return;

    let count = 0;
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
            count++;
            setOrders(prev => prev.map(o => o.id === id ? data.order : o));
          }
        } catch {}
      }
    }

    setSelectedOrderIds(new Set());
    fetchOrders();
    fetchProducts();
    showToast(`${count} orders reverted to pending and stock restored.`, 'success');
  };

  // Bulk Dispatch
  const handleBulkDispatchSelected = async () => {
    const ids = Array.from(selectedOrderIds);
    if (ids.length === 0) return;

    let count = 0;
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
            count++;
            setOrders(prev => prev.map(o => o.id === id ? data.order : o));
          }
        } catch {}
      }
    }

    setSelectedOrderIds(new Set());
    fetchOrders();
    fetchProducts();
    showToast(`${count} orders dispatched and stock deducted.`, 'success');
  };

  // Sync Steadfast Status
  const handleSyncCourierStatus = async () => {
    try {
      setIsSyncingCourier(true);
      showToast('Syncing live tracking status from Steadfast API...', 'info');

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
        showToast(data.message || `Sync completed (${data.updatedCount || 0} parcels updated)`, 'success');
      } else {
        showToast(data.message || 'Steadfast sync failed', 'error');
      }
    } catch (err: any) {
      showToast('Courier sync error: ' + err.message, 'error');
    } finally {
      setIsSyncingCourier(false);
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
          <button onClick={() => setStatusToast(null)} className="text-white/80 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. TOP HEADER */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-neutral-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-neutral-900 text-white flex items-center justify-center shadow-xs shrink-0">
            <ScanLine className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-neutral-900 tracking-tight">
                Barcode Scanner & Warehouse Dispatch
              </h2>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Continuous live scanning, instant parcel matching, and automated size-wise stock deduction.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {onGoToOrderProcess && (
            <button
              onClick={onGoToOrderProcess}
              className="px-3 py-2 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Package className="w-3.5 h-3.5 text-neutral-600" />
              <span>Order Process ({orders.length})</span>
            </button>
          )}

          {/* Steadfast Status Sync Button */}
          <button
            onClick={handleSyncCourierStatus}
            disabled={isSyncingCourier}
            className="px-3.5 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            title="Sync tracking status from Steadfast API"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCourier ? 'animate-spin' : ''}`} />
            <span>{isSyncingCourier ? 'Syncing...' : 'Sync Steadfast'}</span>
          </button>
        </div>
      </div>

      {/* 2. OVERVIEW METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Metric 1: Total Orders */}
        <div 
          onClick={() => setFilterTab('all')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            filterTab === 'all'
              ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
              : 'bg-white text-neutral-900 border-neutral-200/80 hover:border-neutral-400'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold opacity-75">
            <span>Total Orders</span>
            <Package className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black mt-1 font-mono">{metrics.total}</div>
          <span className="text-[10px] opacity-60 block mt-0.5">All saved orders</span>
        </div>

        {/* Metric 2: Pending Scan */}
        <div 
          onClick={() => setFilterTab('pending')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            filterTab === 'pending'
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
              : 'bg-white text-neutral-900 border-neutral-200/80 hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-amber-600">
            <span className={filterTab === 'pending' ? 'text-white' : 'text-amber-600'}>Pending Scan</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className={`text-2xl font-black mt-1 font-mono ${filterTab === 'pending' ? 'text-white' : 'text-amber-600'}`}>
            {metrics.pending}
          </div>
          <span className="text-[10px] opacity-60 block mt-0.5">Ready to scan & dispatch</span>
        </div>

        {/* Metric 3: Done / Dispatched */}
        <div 
          onClick={() => setFilterTab('dispatched')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            filterTab === 'dispatched'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-white text-neutral-900 border-neutral-200/80 hover:border-emerald-400'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-emerald-600">
            <span className={filterTab === 'dispatched' ? 'text-white' : 'text-emerald-600'}>Done (Dispatched)</span>
            <PackageCheck className="w-4 h-4" />
          </div>
          <div className={`text-2xl font-black mt-1 font-mono ${filterTab === 'dispatched' ? 'text-white' : 'text-emerald-600'}`}>
            {metrics.dispatched}
          </div>
          <span className="text-[10px] opacity-60 block mt-0.5">Stock deducted per size</span>
        </div>

        {/* Metric 4: Delivered */}
        <div className="p-4 rounded-2xl bg-white border border-neutral-200/80">
          <div className="flex items-center justify-between text-xs font-bold text-purple-600">
            <span>Delivered</span>
            <Check className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-purple-600 mt-1 font-mono">{metrics.delivered}</div>
          <span className="text-[10px] text-neutral-400 block mt-0.5">Completed deliveries</span>
        </div>
      </div>

      {/* 3. SCANNER INPUT & CAMERA BUTTON */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-neutral-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Manual / USB Hardware Scanner Input Field */}
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
              placeholder="Scan barcode, tracking code, or enter invoice number..."
              className="w-full pl-11 pr-24 py-3 rounded-2xl bg-neutral-50 border border-neutral-200 text-sm font-medium text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-neutral-900 focus:outline-hidden transition-all font-mono"
            />
            <button
              onClick={() => handleIncomingBarcode(manualCodeInput)}
              disabled={!manualCodeInput.trim() || isProcessingScan}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-30 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-rose-400" />
              <span>{isProcessingScan ? '...' : 'Dispatch'}</span>
            </button>
          </div>

          {/* Camera Scanner Toggle Button */}
          <button
            onClick={toggleCamera}
            className="px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all shrink-0 bg-neutral-900 hover:bg-black text-white shadow-sm cursor-pointer"
          >
            <Camera className="w-4 h-4 text-rose-400" />
            <span>Open Camera Scanner</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => {
              unlockAudioContext();
              setSoundEnabled(!soundEnabled);
            }}
            className={`p-3 rounded-2xl border transition-all shrink-0 flex items-center justify-center cursor-pointer ${
              soundEnabled
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-neutral-50 text-neutral-400 border-neutral-200'
            }`}
            title={soundEnabled ? 'Audio Tones: ON (Double Beep on Done, Buzzer on Fail)' : 'Audio Tones: OFF'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>

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
                    <span>Customer: <b>{lastScanResult.order.customerName}</b> ({lastScanResult.order.phoneNumber})</span>
                    {lastScanResult.deductedDetails && lastScanResult.deductedDetails.length > 0 && (
                      <span className="text-emerald-700 font-semibold">
                        Deducted Size Stock: {lastScanResult.deductedDetails.map(d => `${d.productTitle} (${d.size}: ${d.previousStock} ➔ ${d.newStock})`).join(', ')}
                      </span>
                    )}
                  </div>
                )}
                {lastScanResult.status === 'fail' && (
                  <div className="text-xs text-rose-700 mt-0.5 font-mono">
                    Scanned code: &quot;{lastScanResult.code}&quot; — Not found in current orders.
                  </div>
                )}
              </div>
            </div>

            {/* Instant Revert Button */}
            {lastScanResult.order && (
              <button
                onClick={() => handleRevertOrderToPending(lastScanResult.order!)}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-100 text-neutral-800 text-xs font-bold border border-neutral-300 flex items-center gap-1.5 self-start sm:self-center shrink-0 shadow-xs transition-all cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5 text-amber-600" />
                <span>Revert to Pending</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. ORDERS LIST & BULK ACTIONS */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-neutral-200/80 shadow-xs space-y-4">
        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Segmented Filter Tabs */}
          <div className="p-1 bg-neutral-100 rounded-2xl flex items-center gap-1 border border-neutral-200/60 shrink-0">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              All ({orders.length})
            </button>
            <button
              onClick={() => setFilterTab('pending')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterTab === 'pending'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <span>Pending</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/10 text-[10px]">
                {metrics.pending}
              </span>
            </button>
            <button
              onClick={() => setFilterTab('dispatched')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterTab === 'dispatched'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <span>Done</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/10 text-[10px]">
                {metrics.dispatched}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer, phone, invoice, item..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-medium text-neutral-900 focus:outline-hidden focus:bg-white focus:border-neutral-900 transition-all"
            />
          </div>
        </div>

        {/* Bulk Action Toolbar */}
        {selectedOrderIds.size > 0 && (
          <div className="p-3 bg-neutral-900 text-white rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold bg-white/20 px-2.5 py-1 rounded-xl">
                {selectedOrderIds.size} Selected
              </span>
              <button
                onClick={() => setSelectedOrderIds(new Set())}
                className="text-xs text-neutral-400 hover:text-white underline cursor-pointer"
              >
                Clear Selection
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Bulk Dispatch */}
              <button
                onClick={handleBulkDispatchSelected}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <PackageCheck className="w-3.5 h-3.5" />
                <span>Dispatch & Deduct Stock</span>
              </button>

              {/* Bulk Revert */}
              <button
                onClick={handleBulkRevertToPending}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Revert to Pending</span>
              </button>

              {/* Bulk Print 3-Inch */}
              <button
                onClick={() => setPrintModalState({ isOpen: true, orders: selectedOrdersList, paperSize: '3inch' })}
                className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-white/10"
              >
                <Printer className="w-3.5 h-3.5 text-rose-400" />
                <span>Print 3-Inch</span>
              </button>

              {/* Bulk Delete */}
              <button
                onClick={handleBulkDeleteSelected}
                disabled={isBulkDeleting}
                className="px-3 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete ({selectedOrderIds.size})</span>
              </button>
            </div>
          </div>
        )}

        {/* Orders Table */}
        <div className="overflow-x-auto rounded-2xl border border-neutral-200/80">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-600 uppercase text-[10px] tracking-wider border-b border-neutral-200">
              <tr>
                <th className="p-3.5 w-8">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="rounded-md border-neutral-300 text-neutral-900 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="p-3.5 font-bold">Invoice & Barcode</th>
                <th className="p-3.5 font-bold">Customer</th>
                <th className="p-3.5 font-bold">Items & Sizes</th>
                <th className="p-3.5 font-bold">COD / Price</th>
                <th className="p-3.5 font-bold text-center">Status</th>
                <th className="p-3.5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/80">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-neutral-400">
                    {isLoading ? 'Loading orders...' : 'No orders found matching the filter.'}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isSelected = selectedOrderIds.has(order.id);
                  const isDispatched = order.status === 'shipped' || order.status === 'dispatched' || order.status === 'delivered' || order.barcodeScanned;
                  const isJustMatched = recentlyMatchedId === order.id;

                  return (
                    <tr 
                      key={order.id} 
                      className={`transition-colors ${
                        isJustMatched 
                          ? 'bg-emerald-50/80' 
                          : isSelected 
                          ? 'bg-neutral-50' 
                          : 'hover:bg-neutral-50/50'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOrder(order.id)}
                          className="rounded-md border-neutral-300 text-neutral-900 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* Invoice & Barcode */}
                      <td className="p-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-mono font-bold text-neutral-900">
                            <span>#{order.invoiceNumber || order.id.slice(-6)}</span>
                            {order.trackingCode && (
                              <span className="text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-200/60 font-mono font-bold">
                                {order.trackingCode}
                              </span>
                            )}
                          </div>
                          <MiniBarcode code={order.invoiceNumber || order.trackingCode || order.id} />
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="p-3.5">
                        <div className="font-bold text-neutral-900">{order.customerName || 'Customer'}</div>
                        <div className="text-neutral-500 font-mono text-[11px] flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-neutral-400" />
                          <span>{order.phoneNumber}</span>
                        </div>
                        <div className="text-neutral-400 text-[10px] truncate max-w-[180px] mt-0.5">
                          {order.shippingAddress || order.deliveryAddress}
                        </div>
                      </td>

                      {/* Items & Sizes */}
                      <td className="p-3.5">
                        <div className="space-y-1">
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-1.5">
                              <span className="font-medium text-neutral-800 truncate max-w-[160px]">
                                {item.product?.title || (item as any).title || 'Jersey'}
                              </span>
                              <span className="px-1.5 py-0.2 rounded-md bg-neutral-100 text-neutral-700 font-mono text-[10px] font-bold border border-neutral-200">
                                {item.selectedSize || item.size || 'L'}
                              </span>
                              <span className="text-neutral-400 text-[10px]">
                                x{item.quantity || 1}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* COD / Price */}
                      <td className="p-3.5 font-mono font-bold text-neutral-900">
                        {formatPrice(order.totalAmount || 0, currency as CurrencyCode)}
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center">
                        {isDispatched ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Done</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Print Invoice */}
                          <button
                            onClick={() => setPrintModalState({ isOpen: true, orders: [order], paperSize: '3inch' })}
                            className="p-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors cursor-pointer"
                            title="Print Invoice"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Revert / Dispatch Action */}
                          {isDispatched ? (
                            <button
                              onClick={() => handleRevertOrderToPending(order)}
                              className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors cursor-pointer"
                              title="Revert to Pending"
                            >
                              <Undo2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleIncomingBarcode(order.invoiceNumber || order.trackingCode || order.id)}
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                              title="Dispatch Now"
                            >
                              <Zap className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete Order */}
                          <button
                            onClick={() => handleDeleteOrder(order)}
                            disabled={deletingOrderId === order.id}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors cursor-pointer disabled:opacity-40"
                            title="Delete Order"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. FULL SCREEN LIVE CAMERA SCANNER MODAL */}
      {isCameraActive && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden">
          {/* Top Bar Controls */}
          <div className="relative z-20 flex flex-wrap items-center justify-between p-3.5 sm:p-5 bg-gradient-to-b from-black/95 via-black/80 to-transparent gap-2">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-white">
              <div className="flex items-center gap-1.5">
                <ScanLine className="w-4 h-4 text-rose-500" />
                <span className="font-mono font-bold text-xs sm:text-sm tracking-wide uppercase">
                  Continuous Live Scanner
                </span>
              </div>

              {/* Real-time Done & Pending Counters */}
              <div className="flex items-center gap-1.5 ml-1">
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Done: {metrics.dispatched}</span>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-mono font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Pending: {metrics.pending}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Torch / Flashlight Toggle */}
              <button
                onClick={toggleTorch}
                className={`p-2.5 sm:p-3 rounded-full text-white backdrop-blur-md transition-all cursor-pointer ${
                  isTorchOn ? 'bg-amber-500 text-neutral-950 shadow-md ring-2 ring-amber-300' : 'bg-white/10 hover:bg-white/20'
                }`}
                title={isTorchOn ? 'Turn Flashlight OFF' : 'Turn Flashlight ON'}
              >
                <Flashlight className={`w-4 h-4 sm:w-5 sm:h-5 ${isTorchOn ? 'fill-neutral-950 text-neutral-950' : 'text-white'}`} />
              </button>

              {/* Sound Toggle */}
              <button
                onClick={() => {
                  unlockAudioContext();
                  setSoundEnabled(!soundEnabled);
                }}
                className={`p-2.5 sm:p-3 rounded-full backdrop-blur-md transition-all cursor-pointer ${
                  soundEnabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-white/10 text-white/60'
                }`}
                title="Toggle Audio Feedback"
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>

              {/* Close Full Screen Scanner */}
              <button
                onClick={() => setIsCameraActive(false)}
                className="p-2.5 sm:p-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg transition-all cursor-pointer"
                title="Close Scanner"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Full Screen Camera Viewport & Video Stream */}
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
            <video 
              ref={videoRef} 
              className="w-full h-full object-cover" 
              playsInline 
              muted 
              autoPlay 
            />

            {/* Viewfinder Target Frame & Laser Scan Line */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
              <div className="w-72 sm:w-96 h-48 sm:h-64 border-2 border-dashed border-rose-500/80 rounded-3xl relative shadow-[0_0_40px_rgba(244,63,94,0.25)]">
                {/* Laser scan line animation */}
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-rose-500 shadow-[0_0_12px_#f43f5e]" />
                
                {/* Corner Accents */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-rose-500 rounded-tl-xl" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-rose-500 rounded-tr-xl" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-rose-500 rounded-bl-xl" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-rose-500 rounded-br-xl" />
              </div>

              <div className="mt-6 px-4 py-2 rounded-full bg-neutral-950/80 border border-white/10 text-white/90 text-xs font-mono backdrop-blur-md">
                Align barcode inside the box for continuous automatic scanning
              </div>

              {cameraPermissionError && (
                <div className="mt-4 p-3 rounded-2xl bg-rose-950/90 border border-rose-500/60 text-rose-200 text-xs text-center max-w-sm pointer-events-auto">
                  {cameraPermissionError}
                  <button 
                    onClick={() => initCameraStream('environment')}
                    className="mt-2 block mx-auto px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
                  >
                    Retry Camera
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bottom HUD - 1-Second Auto-Dismissing Live Scan Result */}
          <div className="relative z-20 p-3 sm:p-5 bg-gradient-to-t from-black/95 via-black/60 to-transparent">
            {lastScanResult ? (
              <div 
                onClick={() => setLastScanResult(null)}
                className={`p-3.5 sm:p-4 rounded-2xl border backdrop-blur-md transition-all duration-300 flex items-center justify-between gap-3 cursor-pointer shadow-2xl ${
                  lastScanResult.status === 'success'
                    ? 'bg-[#06261c]/95 border-emerald-500/50 text-emerald-100'
                    : lastScanResult.status === 'warning'
                    ? 'bg-[#291b06]/95 border-amber-500/50 text-amber-100'
                    : 'bg-[#2b080f]/95 border-rose-500/50 text-rose-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                    lastScanResult.status === 'success'
                      ? 'bg-emerald-500 text-neutral-950'
                      : lastScanResult.status === 'warning'
                      ? 'bg-amber-500 text-neutral-950'
                      : 'bg-rose-500 text-white'
                  }`}>
                    {lastScanResult.status === 'success' ? (
                      <Check className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
                    ) : lastScanResult.status === 'warning' ? (
                      <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
                    ) : (
                      <X className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-white leading-tight">
                      {lastScanResult.message}
                    </div>
                    {lastScanResult.order && (
                      <div className="text-[11px] sm:text-xs opacity-80 mt-0.5">
                        Customer: {lastScanResult.order.customerName} ({lastScanResult.order.phoneNumber})
                      </div>
                    )}
                  </div>
                </div>

                <span className={`font-mono text-xs px-2.5 py-1 rounded-lg border font-bold shrink-0 ${
                  lastScanResult.status === 'success'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : lastScanResult.status === 'warning'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}>
                  {lastScanResult.status === 'success' ? 'DONE' : lastScanResult.status === 'warning' ? 'DONE' : 'FAIL'}
                </span>
              </div>
            ) : (
              <div className="text-center text-xs text-neutral-400 font-mono py-1">
                Scanner active • Ready for continuous barcode capture
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. COMPACT INVOICE PRINT MODAL */}
      {printModalState.isOpen && (
        <CompactInvoicePrintView
          orders={printModalState.orders}
          paperSize={printModalState.paperSize}
          currency={currency}
          siteSettings={siteSettings}
          onClose={() => setPrintModalState({ isOpen: false, orders: [], paperSize: '3inch' })}
        />
      )}
    </div>
  );
};
