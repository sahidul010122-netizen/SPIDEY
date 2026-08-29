import React, { useState, useEffect, useRef } from 'react';
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
  X
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import JsBarcode from 'jsbarcode';
import { Order } from '../../types';
import { playMatchSuccessSound, playMatchFailSound } from '../../utils/scannerSound';
import { getSteadfastParcelId } from './CompactInvoicePrintView';

interface BarcodeScannerSectionProps {
  onGoToOrderProcess?: () => void;
}

// Mini SVG Barcode Component
const MiniBarcode: React.FC<{ code: string }> = ({ code }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && code) {
      try {
        JsBarcode(svgRef.current, code, {
          format: 'CODE128',
          width: 1.3,
          height: 24,
          displayValue: false,
          margin: 1,
          background: 'transparent',
          lineColor: '#000000'
        });
      } catch {
        // Silently handle invalid code128 chars
      }
    }
  }, [code]);

  return <svg ref={svgRef} className="h-6 max-w-[140px]" />;
};

export const BarcodeScannerSection: React.FC<BarcodeScannerSectionProps> = ({ onGoToOrderProcess }) => {
  // Master orders list
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Scanner state
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Manual / Gun Barcode input
  const [manualCodeInput, setManualCodeInput] = useState('');

  // Scan Results Notification Banner
  const [lastScanResult, setLastScanResult] = useState<{
    status: 'success' | 'fail';
    code: string;
    order?: Order;
    message: string;
    timestamp: number;
  } | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [scanFilter, setScanFilter] = useState<'all' | 'pending' | 'done'>('all');

  // Selection state for batch operations (Delete selected)
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);

  // Deletion confirm modal / toast
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Last matched order ID to highlight row
  const [recentlyMatchedId, setRecentlyMatchedId] = useState<string | null>(null);

  // Scanner ref
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScannedTimeRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });
  const scannerContainerId = 'interactive-barcode-viewport';

  const showToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => setStatusToast(null), 3500);
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

    // Cross-panel live synchronization listener (Order Process <-> Barcode Scanner)
    const handleOrdersSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && Array.isArray(customEvent.detail.orders)) {
        setOrders(customEvent.detail.orders);
      }
    };

    window.addEventListener('spidey-orders-updated', handleOrdersSync);
    return () => window.removeEventListener('spidey-orders-updated', handleOrdersSync);
  }, []);

  // Enumerate cameras
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setAvailableCameras(devices);
          // Prefer back/environment camera if available
          const backCam = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('environment') ||
            d.label.toLowerCase().includes('rear')
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        }
      })
      .catch((err) => {
        console.warn('Could not enumerate video devices:', err);
      });
  }, []);

  // Start Camera Scanning (Continuous Mode with Smart Fallback)
  const startCameraScanner = async (camId?: string) => {
    setScannerError(null);
    setIsScannerActive(true);

    // Ensure DOM has rendered before attaching Html5Qrcode
    await new Promise((r) => setTimeout(r, 100));

    const targetCamId = camId || selectedCameraId;

    try {
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch {}
      }

      const container = document.getElementById(scannerContainerId);
      if (!container) {
        throw new Error('Scanner viewport container not found in DOM.');
      }

      const scanner = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE
        ],
        verbose: false
      });

      html5QrCodeRef.current = scanner;

      const scanConfig = {
        fps: 20,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          // Dynamic wide targeting box for full-screen barcode capture
          const width = Math.min(viewfinderWidth - 24, 480);
          const height = Math.min(viewfinderHeight - 24, 250);
          return { width: Math.max(width, 240), height: Math.max(height, 140) };
        },
        aspectRatio: 1.777778
      };

      const onSuccess = (decodedText: string) => {
        handleIncomingBarcode(decodedText);
      };

      const onError = () => {
        // Ignored frame scanning errors
      };

      // Try Strategy 1: Specific Selected Camera
      try {
        if (targetCamId) {
          await scanner.start({ deviceId: { exact: targetCamId } }, scanConfig, onSuccess, onError);
          return;
        }
      } catch (err1) {
        console.warn('Strategy 1 (exact device ID) failed, falling back to back camera facingMode:', err1);
      }

      // Try Strategy 2: Environment / Rear Camera
      try {
        await scanner.start({ facingMode: 'environment' }, scanConfig, onSuccess, onError);
        return;
      } catch (err2) {
        console.warn('Strategy 2 (environment) failed, falling back to default camera:', err2);
      }

      // Try Strategy 3: Any Available Video Input
      try {
        await scanner.start({ facingMode: 'user' }, scanConfig, onSuccess, onError);
        return;
      } catch (err3) {
        console.warn('Strategy 3 (user) failed, trying generic constraints:', err3);
      }

      // Final attempt: plain camera request
      await scanner.start(true as any, scanConfig, onSuccess, onError);

    } catch (err: any) {
      console.error('Failed to start camera scanner:', err);
      const isIframe = window.self !== window.top;
      const errorMsg = err.name === 'NotAllowedError'
        ? 'Camera permission was denied. Please allow camera in Chrome site settings or open in a new tab.'
        : err.name === 'NotFoundError'
        ? 'No camera device found on this phone.'
        : `Camera error: ${err.message || 'Access failed.'}${isIframe ? ' (Try opening in New Tab if inside preview).' : ''}`;

      setScannerError(errorMsg);
      setIsScannerActive(false);
    }
  };

  // Scan from photo or file (100% reliable fallback on any mobile browser)
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isScanningFile, setIsScanningFile] = useState(false);

  const handleFileBarcodeScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningFile(true);
    try {
      const scanner = new Html5Qrcode('file-scanner-temp', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE
        ],
        verbose: false
      });

      const decodedText = await scanner.scanFile(file, true);
      handleIncomingBarcode(decodedText);
      scanner.clear();
    } catch (err: any) {
      showToast(`✕ Could not detect clear barcode in photo: ${err || 'Try sharper image'}`);
      if (soundEnabled) playMatchFailSound();
    } finally {
      setIsScanningFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Stop Camera Scanner
  const stopCameraScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current = null;
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
    }
    setIsScannerActive(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // Core Barcode Matching Algorithm
  const handleIncomingBarcode = (rawCode: string) => {
    if (!rawCode || !rawCode.trim()) return;

    const cleanCode = rawCode.trim();
    const now = Date.now();

    // Prevent duplicate triggers of same code within 1.5s (cooldown)
    if (lastScannedTimeRef.current.code === cleanCode && now - lastScannedTimeRef.current.time < 1500) {
      return;
    }
    lastScannedTimeRef.current = { code: cleanCode, time: now };

    const normalizedScanned = cleanCode.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Search for match in orders
    const matchedOrder = orders.find((o) => {
      const pId = getSteadfastParcelId(o).toUpperCase().replace(/[^A-Z0-9]/g, '');
      const trackCode = (o.trackingCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const cid = (o.consignmentId || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const inv = (o.invoiceNumber || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const ordId = (o.id || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const phone = (o.phoneNumber || '').replace(/[^0-9]/g, '');

      return (
        pId === normalizedScanned ||
        trackCode === normalizedScanned ||
        cid === normalizedScanned ||
        inv === normalizedScanned ||
        ordId === normalizedScanned ||
        (normalizedScanned.length >= 6 && (pId.includes(normalizedScanned) || normalizedScanned.includes(pId))) ||
        (normalizedScanned.length >= 6 && (trackCode.includes(normalizedScanned) || normalizedScanned.includes(trackCode))) ||
        (phone && phone === normalizedScanned)
      );
    });

    if (matchedOrder) {
      // SUCCESS MATCH!
      if (soundEnabled) {
        playMatchSuccessSound();
      }

      // Mark order as Done in local state and server
      markOrderAsScannedDone(matchedOrder);

      setRecentlyMatchedId(matchedOrder.id);
      setTimeout(() => setRecentlyMatchedId(null), 4000);

      setLastScanResult({
        status: 'success',
        code: cleanCode,
        order: matchedOrder,
        message: `✓ DONE! Matched ${matchedOrder.customerName} (${getSteadfastParcelId(matchedOrder)})`,
        timestamp: now
      });
    } else {
      // UNMATCHED / FAIL!
      if (soundEnabled) {
        playMatchFailSound();
      }

      setLastScanResult({
        status: 'fail',
        code: cleanCode,
        message: `✕ FAIL! Unmatched Barcode "${cleanCode}". Order not found in database.`,
        timestamp: now
      });
    }
  };

  // Mark order as Scanned / Done in DB and State
  const markOrderAsScannedDone = async (order: Order) => {
    const timestamp = new Date().toISOString();

    // 1. Optimistic local update
    const updated = orders.map((o) => {
      if (o.id === order.id) {
        return {
          ...o,
          barcodeScanned: true,
          scannedAt: timestamp,
          status: o.status === 'confirmed' ? 'shipped' : o.status
        };
      }
      return o;
    });

    setOrders(updated);
    try {
      localStorage.setItem('spidey_master_orders', JSON.stringify(updated));
    } catch {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('spidey-orders-updated', { detail: { orders: updated } }));
    }

    // 2. Persist to server
    try {
      await fetch(`/api/orders/${order.id}/scan-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcodeScanned: true,
          scannedAt: timestamp,
          status: order.status === 'confirmed' ? 'shipped' : order.status
        })
      });
    } catch (e) {
      console.warn('Failed to update scan status on server:', e);
    }
  };

  // Toggle order scan status manually
  const toggleOrderScanStatus = async (orderId: string, currentStatus?: boolean) => {
    const nextStatus = !currentStatus;
    const timestamp = nextStatus ? new Date().toISOString() : undefined;

    const updated = orders.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          barcodeScanned: nextStatus,
          scannedAt: timestamp
        };
      }
      return o;
    });

    setOrders(updated);
    try {
      localStorage.setItem('spidey_master_orders', JSON.stringify(updated));
    } catch {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('spidey-orders-updated', { detail: { orders: updated } }));
    }

    try {
      await fetch(`/api/orders/${orderId}/scan-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcodeScanned: nextStatus,
          scannedAt: timestamp
        })
      });
      showToast(nextStatus ? '✓ Order marked as Done' : 'Status reset to Pending Scan');
    } catch {}
  };

  // Handle Manual Code Submit
  const handleManualCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCodeInput.trim()) return;
    handleIncomingBarcode(manualCodeInput);
    setManualCodeInput('');
  };

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      !searchQuery.trim() ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.phoneNumber && o.phoneNumber.includes(searchQuery)) ||
      (o.trackingCode && o.trackingCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.consignmentId && o.consignmentId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.invoiceNumber && o.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      o.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (scanFilter === 'pending') return !o.barcodeScanned;
    if (scanFilter === 'done') return !!o.barcodeScanned;
    return true;
  });

  // Toggle select all visible / all orders
  const isAllSelected = filteredOrders.length > 0 && selectedOrderIds.size === filteredOrders.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(filteredOrders.map((o) => o.id)));
    }
  };

  const handleToggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Permanent Single Order Deletion (Removes from list, DB and persistent storage)
  const handleDeleteOrderPermanently = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (data.success) {
        const filtered = orders.filter((o) => o.id !== id);
        setOrders(filtered);
        setSelectedOrderIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });

        try {
          localStorage.setItem('spidey_master_orders', JSON.stringify(filtered));
        } catch {}

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('spidey-orders-updated', { detail: { orders: filtered } }));
        }

        showToast('✓ Order permanently deleted from database and storage.');
      } else {
        showToast(`✕ Deletion error: ${data.message}`);
      }
    } catch (err: any) {
      showToast(`✕ Failed to delete: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  // Bulk Delete Selected Orders Permanently
  const handleDeleteSelectedPermanently = async () => {
    if (selectedOrderIds.size === 0) {
      showToast('No orders selected to delete.');
      return;
    }

    const count = selectedOrderIds.size;
    if (!window.confirm(`Are you sure you want to permanently delete ${count} selected order(s) from database and storage? This cannot be undone.`)) {
      return;
    }

    setIsDeletingSelected(true);
    const idsToDelete = Array.from(selectedOrderIds);

    try {
      const res = await fetch('/api/orders/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idsToDelete })
      });
      const data = await res.json();

      if (data.success) {
        const filtered = orders.filter((o) => !selectedOrderIds.has(o.id));
        setOrders(filtered);
        setSelectedOrderIds(new Set());

        try {
          localStorage.setItem('spidey_master_orders', JSON.stringify(filtered));
        } catch {}

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('spidey-orders-updated', { detail: { orders: filtered } }));
        }

        showToast(`✓ ${count} selected orders permanently deleted from database & storage.`);
      } else {
        showToast(`✕ Bulk delete error: ${data.message}`);
      }
    } catch (err: any) {
      showToast(`✕ Error during deletion: ${err.message}`);
    } finally {
      setIsDeletingSelected(false);
    }
  };

  // Delete All Orders Permanently
  const handleDeleteAllPermanently = async () => {
    if (orders.length === 0) {
      showToast('Scanner queue is already empty.');
      return;
    }

    const count = orders.length;
    if (!window.confirm(`Are you sure you want to permanently delete ALL ${count} orders from the database and storage? This cannot be undone.`)) {
      return;
    }

    setIsDeletingAll(true);
    try {
      const res = await fetch('/api/orders/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteAll: true })
      });
      const data = await res.json();

      if (data.success) {
        setOrders([]);
        setSelectedOrderIds(new Set());
        try {
          localStorage.removeItem('spidey_master_orders');
        } catch {}

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('spidey-orders-updated', { detail: { orders: [] } }));
        }

        showToast(`✓ All ${count} orders permanently deleted. Database & storage is clean.`);
      } else {
        showToast(`✕ Bulk delete failed: ${data.message}`);
      }
    } catch (err: any) {
      showToast(`✕ Error during deletion: ${err.message}`);
    } finally {
      setIsDeletingAll(false);
    }
  };

  // Clear Completed / Done Orders Permanently
  const handleClearCompletedOrders = async () => {
    const doneIds = orders.filter((o) => o.barcodeScanned).map((o) => o.id);
    if (doneIds.length === 0) {
      showToast('No completed orders to clear.');
      return;
    }

    if (!window.confirm(`Permanently delete all ${doneIds.length} completed ("Done") orders from the database & storage?`)) {
      return;
    }

    try {
      const res = await fetch('/api/orders/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: doneIds })
      });
      const data = await res.json();

      if (data.success) {
        const filtered = orders.filter((o) => !o.barcodeScanned);
        setOrders(filtered);
        setSelectedOrderIds((prev) => {
          const next = new Set(prev);
          doneIds.forEach((id) => next.delete(id));
          return next;
        });

        try {
          localStorage.setItem('spidey_master_orders', JSON.stringify(filtered));
        } catch {}

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('spidey-orders-updated', { detail: { orders: filtered } }));
        }

        showToast(`✓ ${doneIds.length} completed orders removed from database & storage.`);
      }
    } catch (err: any) {
      showToast(`✕ Error: ${err.message}`);
    }
  };

  const totalCount = orders.length;
  const doneCount = orders.filter(o => o.barcodeScanned).length;
  const pendingCount = totalCount - doneCount;

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {statusToast && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-2xl bg-neutral-900 text-white text-xs font-bold shadow-2xl border border-white/10 flex items-center gap-3 animate-fadeIn">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{statusToast}</span>
        </div>
      )}

      {/* TOP HEADER & STATS SUMMARY */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-neutral-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#e50914] text-white flex items-center justify-center shadow-lg shadow-red-600/30">
            <ScanLine className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight">
                Barcode Scanner & Auto-Matching System
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black bg-red-100 text-red-700">
                LIVE CAMERA
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Continuous parcel scanning, instant Steadfast CID/Tracking matching, auto-Done status update, and permanent storage management.
            </p>
          </div>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-4 py-2 rounded-2xl bg-neutral-100 border border-neutral-200/80 text-center">
            <span className="text-[10px] text-neutral-400 font-bold block uppercase tracking-wider">Total In Queue</span>
            <span className="text-base font-extrabold text-neutral-900 font-mono">{totalCount}</span>
          </div>

          <div className="px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
            <span className="text-[10px] text-emerald-600 font-bold block uppercase tracking-wider">✓ Done / Scanned</span>
            <span className="text-base font-extrabold text-emerald-700 font-mono">{doneCount}</span>
          </div>

          <div className="px-4 py-2 rounded-2xl bg-amber-50 border border-amber-200 text-center">
            <span className="text-[10px] text-amber-600 font-bold block uppercase tracking-wider">⏳ Pending Scan</span>
            <span className="text-base font-extrabold text-amber-700 font-mono">{pendingCount}</span>
          </div>
        </div>
      </div>

      {/* 2. FULL-SCREEN LIVE CAMERA SCANNER MODAL / OVERLAY */}
      {isScannerActive && (
        <div className="fixed inset-0 z-50 bg-[#050505] text-white flex flex-col justify-between select-none animate-fadeIn overflow-hidden">
          
          {/* TOP HUD BAR */}
          <div className="p-3 sm:p-5 bg-black/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between gap-3 z-20 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-[#e50914] text-white flex items-center justify-center shadow-lg shadow-red-600/30">
                <ScanLine className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-extrabold text-white tracking-tight">
                    Full-Screen Barcode Scanner
                  </h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <p className="text-[10px] sm:text-xs text-neutral-400 hidden sm:block">
                  Continuous live auto-matching. Point next parcel barcode at the frame.
                </p>
              </div>
            </div>

            {/* Middle Stats Badges in HUD */}
            <div className="flex items-center gap-2">
              <div className="px-2.5 sm:px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] sm:text-xs font-bold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>Done: <strong>{doneCount}</strong></span>
              </div>
              <div className="px-2.5 sm:px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 font-mono text-[10px] sm:text-xs font-bold">
                <span>Pending: <strong>{pendingCount}</strong></span>
              </div>
            </div>

            {/* Right HUD Controls */}
            <div className="flex items-center gap-2">
              {/* Sound Toggle */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 sm:p-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  soundEnabled ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}
                title={soundEnabled ? 'Beep sound enabled' : 'Muted'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Camera Switcher (if multiple cameras available) */}
              {availableCameras.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const currentIndex = availableCameras.findIndex(c => c.id === selectedCameraId);
                    const nextIndex = (currentIndex + 1) % availableCameras.length;
                    const nextCam = availableCameras[nextIndex];
                    setSelectedCameraId(nextCam.id);
                    startCameraScanner(nextCam.id);
                  }}
                  className="p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-200 text-xs flex items-center gap-1"
                  title="Switch Camera (Front/Rear)"
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>
              )}

              {/* Close Fullscreen Scanner Button */}
              <button
                onClick={stopCameraScanner}
                className="px-3 sm:px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold flex items-center gap-1.5 border border-white/20 transition-all active:scale-95 shadow-lg"
              >
                <X className="w-4 h-4 text-red-400" />
                <span className="hidden sm:inline">Close Scanner</span>
                <span className="sm:hidden">Close</span>
              </button>
            </div>
          </div>

          {/* MAIN FULL-SCREEN VIEWPORT AREA */}
          <div className="relative flex-1 w-full h-full flex items-center justify-center bg-black overflow-hidden">
            {/* Html5Qrcode video mount target */}
            <div 
              id={scannerContainerId} 
              className="w-full h-full min-h-[50vh] flex items-center justify-center [&_video]:w-full [&_video]:h-full [&_video]:object-cover [&_video]:max-h-full" 
            />

            {/* Glowing Laser Targeting Reticle Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4 sm:p-8">
              <div className="w-full max-w-lg aspect-[16/10] sm:aspect-[16/9] relative border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between p-4 sm:p-6">
                
                {/* 4 Glowing Corner Target Brackets */}
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 border-t-4 border-l-4 border-red-500 rounded-tl-2xl shadow-[0_0_12px_#e50914]" />
                  <div className="w-10 h-10 border-t-4 border-r-4 border-red-500 rounded-tr-2xl shadow-[0_0_12px_#e50914]" />
                </div>

                {/* Animated Sweeping Laser Line */}
                <div className="w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_20px_#e50914] animate-pulse" />

                <div className="flex justify-between items-end">
                  <div className="w-10 h-10 border-b-4 border-l-4 border-red-500 rounded-bl-2xl shadow-[0_0_12px_#e50914]" />
                  <div className="w-10 h-10 border-b-4 border-r-4 border-red-500 rounded-br-2xl shadow-[0_0_12px_#e50914]" />
                </div>
              </div>
            </div>

            {/* FLOATING REAL-TIME MATCH TOAST BANNER (Overlaid in Viewport) */}
            {lastScanResult && (
              <div className="absolute top-4 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 max-w-lg z-30 animate-fadeIn">
                <div
                  className={`p-4 rounded-2xl border shadow-2xl backdrop-blur-xl ${
                    lastScanResult.status === 'success'
                      ? 'bg-emerald-950/90 border-emerald-400/60 text-emerald-100'
                      : 'bg-red-950/90 border-red-400/60 text-red-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          lastScanResult.status === 'success'
                            ? 'bg-emerald-500 text-black font-black'
                            : 'bg-red-500 text-white'
                        }`}
                      >
                        {lastScanResult.status === 'success' ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <XCircle className="w-5 h-5" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-extrabold tracking-tight">
                            {lastScanResult.status === 'success' ? '✓ MATCHED & MARKED DONE!' : '✕ UNMATCHED BARCODE'}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/20 text-white font-bold">
                            {lastScanResult.code}
                          </span>
                        </div>

                        {lastScanResult.order && (
                          <div className="text-[11px] text-neutral-200 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="font-bold text-white">
                              {lastScanResult.order.customerName}
                            </span>
                            <span>•</span>
                            <span className="text-emerald-300 font-bold">
                              ৳{lastScanResult.order.totalAmount || lastScanResult.order.codAmount}
                            </span>
                            <span>•</span>
                            <span className="text-neutral-300 font-mono">
                              CID: {getSteadfastParcelId(lastScanResult.order)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setLastScanResult(null)}
                      className="text-white/60 hover:text-white text-xs font-bold p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* BOTTOM FLOATING CONTROLS DOCK */}
          <div className="p-3 sm:p-5 bg-black/80 backdrop-blur-md border-t border-white/10 z-20 shrink-0 space-y-3">
            <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center gap-3">
              
              {/* Manual Input Bar in Fullscreen (If barcode is scratched) */}
              <form onSubmit={handleManualCodeSubmit} className="flex-1 w-full flex items-center gap-2">
                <div className="relative flex-1">
                  <Zap className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={manualCodeInput}
                    onChange={(e) => setManualCodeInput(e.target.value)}
                    placeholder="Type damaged code / USB scanner..."
                    className="w-full bg-neutral-900 text-white placeholder-neutral-500 text-xs pl-10 pr-3 py-2.5 rounded-xl border border-white/20 focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!manualCodeInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-white text-neutral-950 hover:bg-neutral-200 text-xs font-extrabold transition-all disabled:opacity-40 shrink-0"
                >
                  Verify
                </button>
              </form>

              {/* Exit Fullscreen & Return to Table Button */}
              <button
                type="button"
                onClick={stopCameraScanner}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#e50914] hover:bg-red-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all shrink-0"
              >
                <Check className="w-4 h-4" />
                <span>Done & View Orders</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* 2. REGULAR SCANNER WORKSPACE CARD (When Fullscreen Camera is Paused) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#0d0f12] text-white shadow-2xl border border-white/5 space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 text-neutral-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-white">
                  Continuous Auto-Matching Camera Scanner
                </h3>
                <span className="w-2 h-2 rounded-full bg-neutral-600" />
              </div>
              <p className="text-xs text-neutral-400">
                Opens in immersive <span className="text-white font-bold">Full-Screen view</span> for continuous fast scanning on mobile & desktop!
              </p>
            </div>
          </div>

          {/* Quick Trigger Button */}
          <button
            onClick={() => startCameraScanner()}
            className="px-6 py-3 rounded-2xl bg-[#e50914] hover:bg-red-700 text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-red-600/30 transition-all active:scale-95"
          >
            <Camera className="w-4 h-4" />
            <span>Open Full-Screen Camera</span>
          </button>
        </div>

        {/* Inactive State Visual Placeholder */}
        <div className="py-8 px-6 rounded-3xl bg-neutral-900/50 border border-white/5 text-center max-w-xl mx-auto flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400">
            <Camera className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-neutral-200">
              Full-Screen Camera Scanner Ready
            </p>
            <p className="text-xs text-neutral-400 max-w-sm">
              Click below to open the wide full-screen camera view, or scan a barcode directly from a photo.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <button
              type="button"
              onClick={() => startCameraScanner()}
              className="px-6 py-3 rounded-2xl bg-[#e50914] hover:bg-red-700 text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-red-600/30 transition-all active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span>Launch Full-Screen Camera</span>
            </button>

            {/* Instant Photo Capture / File Picker */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanningFile}
              className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-neutral-200 text-xs font-bold flex items-center gap-2 border border-white/10 transition-all"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>{isScanningFile ? 'Reading Photo...' : 'Scan from Photo/File'}</span>
            </button>

            {/* Direct Tab Opener if in Preview iFrame */}
            <button
              type="button"
              onClick={() => window.open(window.location.href, '_blank')}
              className="px-3.5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all"
              title="Open app in full browser tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Full Tab</span>
            </button>
          </div>
        </div>

        {/* Hidden temp element for file barcode scans */}
        <div id="file-scanner-temp" className="hidden" />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileBarcodeScan}
          className="hidden"
        />

        {scannerError && (
          <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{scannerError}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => startCameraScanner()}
                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold"
              >
                Try Again
              </button>
              <button
                onClick={() => window.open(window.location.href, '_blank')}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Open in New Tab</span>
              </button>
            </div>
          </div>
        )}

        {/* REAL-TIME SCAN RESULT POPUP / BANNER (When in normal view) */}
        {lastScanResult && !isScannerActive && (
          <div
            className={`p-4 sm:p-5 rounded-3xl border transition-all animate-fadeIn ${
              lastScanResult.status === 'success'
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                : 'bg-red-950/50 border-red-500/40 text-red-200'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    lastScanResult.status === 'success'
                      ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30'
                      : 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                  }`}
                >
                  {lastScanResult.status === 'success' ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <XCircle className="w-6 h-6" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold tracking-tight">
                      {lastScanResult.status === 'success' ? '✓ MATCHED & MARKED DONE!' : '✕ SCAN FAILED — UNMATCHED CODE'}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-neutral-300 font-bold">
                      Code: {lastScanResult.code}
                    </span>
                  </div>

                  {lastScanResult.order && (
                    <div className="text-xs text-neutral-300 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-bold text-white">
                        Customer: {lastScanResult.order.customerName}
                      </span>
                      <span>•</span>
                      <span>Phone: {lastScanResult.order.phoneNumber || 'N/A'}</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-bold">
                        Amount: ৳{lastScanResult.order.totalAmount || lastScanResult.order.codAmount}
                      </span>
                      <span>•</span>
                      <span className="text-neutral-400">
                        Steadfast CID: {getSteadfastParcelId(lastScanResult.order)}
                      </span>
                    </div>
                  )}

                  {lastScanResult.status === 'fail' && (
                    <p className="text-xs text-red-300 mt-1">
                      The scanned barcode does not match any Steadfast Tracking Code, Consignment ID, or Invoice Number in the active queue.
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => setLastScanResult(null)}
                className="text-neutral-400 hover:text-white text-xs font-bold px-2 py-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Manual Barcode / USB Laser Gun Input Bar */}
        <div className="pt-2 border-t border-white/10">
          <form onSubmit={handleManualCodeSubmit} className="flex items-center gap-3">
            <div className="relative flex-1">
              <Zap className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={manualCodeInput}
                onChange={(e) => setManualCodeInput(e.target.value)}
                placeholder="Or scan using USB Handheld Scanner / Type Code & Press Enter..."
                className="w-full bg-neutral-900 text-white placeholder-neutral-500 text-xs pl-11 pr-4 py-3 rounded-2xl border border-white/10 focus:outline-none focus:border-red-500 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={!manualCodeInput.trim()}
              className="px-5 py-3 rounded-2xl bg-white text-neutral-950 hover:bg-neutral-200 text-xs font-extrabold transition-all disabled:opacity-40"
            >
              Verify Code
            </button>
          </form>
        </div>

      </div>

      {/* 3. ORDERS QUEUE & DATA MANAGEMENT TABLE */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-neutral-200/80 shadow-sm space-y-6">
        
        {/* Table Controls & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, phone, tracking code..."
                className="pl-9 pr-4 py-2 rounded-2xl bg-neutral-100 text-xs font-medium text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 border border-transparent focus:border-red-500/40 w-64"
              />
            </div>

            {/* Scan Filter Pills */}
            <div className="flex items-center bg-neutral-100 p-1 rounded-2xl text-xs font-bold">
              <button
                onClick={() => setScanFilter('all')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  scanFilter === 'all' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                All ({totalCount})
              </button>
              <button
                onClick={() => setScanFilter('pending')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  scanFilter === 'pending' ? 'bg-white text-amber-700 shadow-sm font-extrabold' : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                onClick={() => setScanFilter('done')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  scanFilter === 'done' ? 'bg-white text-emerald-700 shadow-sm font-extrabold' : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Done ({doneCount})
              </button>
            </div>
          </div>

          {/* Batch Actions & Refresh */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={fetchOrders}
              disabled={isLoading}
              className="p-2 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Refresh from database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {/* Delete Selected Button */}
            {selectedOrderIds.size > 0 && (
              <button
                type="button"
                onClick={handleDeleteSelectedPermanently}
                disabled={isDeletingSelected}
                className="px-3.5 py-2 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer animate-in fade-in"
                title="Permanently delete selected orders from database and storage"
              >
                <Trash2 className={`w-3.5 h-3.5 ${isDeletingSelected ? 'animate-spin' : ''}`} />
                <span>{isDeletingSelected ? 'Deleting...' : `Delete Selected (${selectedOrderIds.size})`}</span>
              </button>
            )}

            {doneCount > 0 && (
              <button
                onClick={handleClearCompletedOrders}
                className="px-3 py-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Clear Completed ({doneCount})</span>
              </button>
            )}

            {totalCount > 0 && (
              <button
                onClick={handleDeleteAllPermanently}
                disabled={isDeletingAll}
                className="px-3 py-2 rounded-2xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingAll ? 'Deleting...' : 'Delete All'}</span>
              </button>
            )}

            {onGoToOrderProcess && (
              <button
                onClick={onGoToOrderProcess}
                className="px-3.5 py-2 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Package className="w-3.5 h-3.5" />
                <span>+ Push from Orders</span>
              </button>
            )}
          </div>
        </div>

        {/* TABLE CONTAINER */}
        <div className="overflow-x-auto rounded-2xl border border-neutral-200/80">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-500 font-mono uppercase text-[10px] tracking-wider border-b border-neutral-200">
              <tr>
                <th className="py-3.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-neutral-300 cursor-pointer"
                    title="Select / Deselect All"
                  />
                </th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Steadfast Barcode / Tracking</th>
                <th className="py-3.5 px-4">Customer Details</th>
                <th className="py-3.5 px-4">Items / Jersey</th>
                <th className="py-3.5 px-4 text-right">Amount (৳)</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <div className="w-10 h-10 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
                        <ScanLine className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-neutral-600">
                        {totalCount === 0 
                          ? 'No orders in scanner queue.' 
                          : 'No orders match your filter.'}
                      </p>
                      <p className="text-[11px] text-neutral-400">
                        {totalCount === 0 
                          ? 'Orders pushed from Order Process or created with Steadfast IDs will automatically stay permanently stored here.' 
                          : 'Try changing your search term or filter pill.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const parcelCode = getSteadfastParcelId(order);
                  const isDone = !!order.barcodeScanned;
                  const isRecentlyMatched = recentlyMatchedId === order.id;
                  const isSelected = selectedOrderIds.has(order.id);

                  return (
                    <tr
                      key={order.id}
                      className={`transition-colors ${
                        isRecentlyMatched
                          ? 'bg-emerald-50/80 ring-2 ring-emerald-500 ring-inset'
                          : isSelected
                          ? 'bg-red-50/30'
                          : isDone
                          ? 'bg-emerald-50/20 hover:bg-emerald-50/40'
                          : 'hover:bg-neutral-50/80'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOrder(order.id)}
                          className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-neutral-300 cursor-pointer"
                        />
                      </td>

                      {/* Scan Status Pill */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleOrderScanStatus(order.id, order.barcodeScanned)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold flex items-center gap-1.5 transition-all ${
                            isDone
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                          }`}
                          title="Click to toggle status"
                        >
                          {isDone ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Done</span>
                            </>
                          ) : (
                            <>
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                              <span>Pending</span>
                            </>
                          )}
                        </button>
                        {order.scannedAt && (
                          <span className="text-[9px] font-mono text-neutral-400 block mt-0.5">
                            {new Date(order.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </td>

                      {/* Steadfast Barcode & Tracking Code */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-extrabold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded text-xs">
                              {parcelCode}
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(parcelCode);
                                showToast(`Copied ${parcelCode}`);
                              }}
                              className="text-neutral-400 hover:text-neutral-900"
                              title="Copy code"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          <MiniBarcode code={parcelCode} />
                        </div>
                      </td>

                      {/* Customer Info */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="font-extrabold text-neutral-900">
                            {order.customerName}
                          </div>
                          {order.phoneNumber && (
                            <div className="text-[11px] font-mono text-neutral-500 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-neutral-400" />
                              <span>{order.phoneNumber}</span>
                            </div>
                          )}
                          <div className="text-[10px] text-neutral-400 line-clamp-1 max-w-[180px]">
                            {order.shippingAddress}
                          </div>
                        </div>
                      </td>

                      {/* Items */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5 max-w-[220px]">
                          {order.items && order.items.length > 0 ? (
                            order.items.map((it, idx) => (
                              <div key={idx} className="text-[11px] text-neutral-700 leading-tight">
                                <span className="font-bold text-neutral-900">
                                  {it.quantity || 1}x
                                </span>{' '}
                                {it.product?.title || 'Jersey'}{' '}
                                <span className="font-mono text-[10px] text-neutral-500">
                                  ({it.selectedSize || 'Standard'})
                                </span>
                                {(it.customName || it.customNumber) && (
                                  <span className="text-red-600 font-bold block text-[10px]">
                                    "{it.customName || ''} {it.customNumber || ''}"
                                  </span>
                                )}
                              </div>
                            ))
                          ) : (
                            <span className="text-neutral-400 italic">No item details</span>
                          )}
                        </div>
                      </td>

                      {/* COD / Amount */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="font-mono font-extrabold text-neutral-900 text-sm">
                          ৳{order.totalAmount || order.codAmount || 0}
                        </div>
                        <span className="text-[9px] font-bold text-emerald-600 block uppercase">
                          {order.paymentMethod ? order.paymentMethod.slice(0, 10) : 'COD'}
                        </span>
                      </td>

                      {/* PERMANENT DELETE BUTTON */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteOrderPermanently(order.id)}
                          disabled={deletingId === order.id}
                          className="p-2 rounded-xl text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-all"
                          title="Permanently delete from database & storage"
                        >
                          <Trash2 className={`w-4 h-4 ${deletingId === order.id ? 'animate-spin' : ''}`} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Note inside Container */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-neutral-400 border-t border-neutral-100 pt-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Permanent Storage Active: Orders stay safe until explicitly deleted.</span>
          </div>
          <span>Showing {filteredOrders.length} of {totalCount} orders</span>
        </div>

      </div>

    </div>
  );
};
