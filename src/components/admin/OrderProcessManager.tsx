import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Upload, 
  Check, 
  Trash2, 
  Edit3, 
  Printer, 
  Truck, 
  Save, 
  Plus, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  Copy, 
  RefreshCw, 
  ChevronDown, 
  ExternalLink,
  ShieldCheck,
  FileText,
  Sliders,
  Sparkles,
  Layers,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import { JerseyProduct, Order, CartItem } from '../../types';
import { SiteSettings } from '../../types/settings';
import { 
  parseBulkOrders, 
  ParsedOrder, 
  convertParsedOrderToMasterOrder, 
  ParsedOrderItem 
} from '../../utils/bulkOrderParser';
import { 
  processOrdersWithSteadfast, 
  DEFAULT_STEADFAST_SETTINGS, 
  SteadfastSettings 
} from '../../utils/steadfastCourier';
import { CompactInvoicePrintView } from './CompactInvoicePrintView';
import { cleanAndFormatPhoneNumber, convertBengaliToEnglishDigits } from '../../utils/phoneUtils';

interface OrderProcessManagerProps {
  products: JerseyProduct[];
  siteSettings: SiteSettings;
  onRefreshStats?: () => void;
}

const SAMPLE_BULK_TEXT = `Name: YASIN
Mobile: 01715123766
Address: MUNSHIGANG,

ITEMS:
1. [SJ-ZLC6N] REAL MADRID 2016-17 PURPLE JERSEY (FULL SLEEVE) (Size: L)-  "SOLAIMAN 7"
2. [SJ-ZLC6N] REAL MADRID 2016-18 JERSEY (FULL SLEEVE) (Size: L)-  "YASIN 7" 
Amount: 500৳ 
Exchange Parcel: YES

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: TANVIR AHMED
Mobile: 01823994821
Address: House 14, Road 5, Dhanmondi, Dhaka

ITEMS:
1. [SJ-C8MXU] BARCELONA 2024-25 HOME JERSEY (Size: M)
Amount: 1150৳ 
Exchange Parcel: NO

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: MD ROKON
Mobile: 01912445890
Address: Chawkbazar, Chittagong

ITEMS:
1. [SJ-9K2LP] ARGENTINA 3-STAR WINNER SPECIAL (Size: XL) - "MESSI 10"
Amount: 1350৳
`;

export const OrderProcessManager: React.FC<OrderProcessManagerProps> = ({
  products,
  siteSettings,
  onRefreshStats
}) => {
  // Master persistent saved orders list
  const [savedOrders, setSavedOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Bulk Paste Textarea input
  const [rawBulkInput, setRawBulkInput] = useState('');
  
  // Staging / Parsed orders waiting to be saved
  const [stagedOrders, setStagedOrders] = useState<ParsedOrder[]>([]);
  
  // Selection State for Bulk Operations (Steadfast, Print, Delete)
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  // Active View Tab: 'workspace' (Staging + Master table) or 'master_only'
  const [activeTab, setActiveTab] = useState<'all' | 'staged' | 'saved'>('all');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'courier_sent' | 'exchange'>('all');

  // Steadfast Courier API Configuration Modal
  const [isSteadfastModalOpen, setIsSteadfastModalOpen] = useState(false);
  const [steadfastSettings, setSteadfastSettings] = useState<SteadfastSettings>(DEFAULT_STEADFAST_SETTINGS);
  const [isProcessingCourier, setIsProcessingCourier] = useState(false);

  // Print Mode State (Thermal / A4 Batch)
  const [ordersToPrint, setOrdersToPrint] = useState<Order[] | null>(null);

  // Status Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load Saved Orders from server / local storage
  const fetchOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.orders)) {
          setSavedOrders(data.orders);
          return;
        }
      }
    } catch (e) {
      console.warn('Could not load orders from API, checking localStorage fallback:', e);
    } finally {
      setIsLoadingOrders(false);
    }

    // LocalStorage fallback
    try {
      const cached = localStorage.getItem('spidey_master_orders');
      if (cached) {
        setSavedOrders(JSON.parse(cached));
      }
    } catch {}
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Save master orders to localStorage when updated
  useEffect(() => {
    try {
      localStorage.setItem('spidey_master_orders', JSON.stringify(savedOrders));
    } catch {}
  }, [savedOrders]);

  // Handle Intelligent Extraction of Raw Bulk Text
  const handleParseBulkInput = () => {
    if (!rawBulkInput.trim()) {
      showToast('Please paste order text first.');
      return;
    }

    const parsed = parseBulkOrders(rawBulkInput, products);
    if (parsed.length === 0) {
      showToast('Could not extract any orders. Check formatting.');
      return;
    }

    setStagedOrders(parsed);
    showToast(`Successfully extracted ${parsed.length} orders into the workspace!`);
  };

  // Clear Bulk Box
  const handleClearBulkInput = () => {
    setRawBulkInput('');
    setStagedOrders([]);
  };

  // Load sample text
  const handleLoadSample = () => {
    setRawBulkInput(SAMPLE_BULK_TEXT);
  };

  // Update a Staged Order field inline
  const handleUpdateStagedOrder = (index: number, updates: Partial<ParsedOrder>) => {
    setStagedOrders(prev => {
      const updated = [...prev];
      const target = { ...updated[index], ...updates };

      // Re-validate target
      const errs: string[] = [];
      if (!target.customerName || target.customerName.trim().length < 2) {
        errs.push('Name is required');
      }
      if (!target.phoneNumber || target.phoneNumber.length !== 11) {
        errs.push('Mobile must be 11 digits');
      }
      if (isNaN(target.codAmount) || target.codAmount < 0) {
        errs.push('COD Amount must be positive number');
      }

      target.isValid = errs.length === 0;
      target.validationErrors = errs;
      updated[index] = target;
      return updated;
    });
  };

  // Update a specific item inside a Staged Order
  const handleUpdateStagedItem = (orderIdx: number, itemIdx: number, updates: Partial<ParsedOrderItem>) => {
    setStagedOrders(prev => {
      const updated = [...prev];
      const items = [...updated[orderIdx].items];
      const item = { ...items[itemIdx], ...updates };

      // If code was changed, try re-matching product
      if (updates.code !== undefined || updates.title !== undefined) {
        const matched = products.find(p => 
          (p.code && p.code.toLowerCase() === (item.code || '').toLowerCase()) ||
          p.title.toLowerCase().includes((item.title || '').toLowerCase())
        );
        if (matched) {
          item.matchedProduct = matched;
          if (!updates.title) item.title = matched.title;
        }
      }

      items[itemIdx] = item;
      updated[orderIdx] = { ...updated[orderIdx], items };
      return updated;
    });
  };

  // Delete a staged order from preview
  const handleDeleteStagedOrder = (index: number) => {
    setStagedOrders(prev => prev.filter((_, idx) => idx !== index));
    showToast('Order removed from staging.');
  };

  // Add a new empty row to staged orders
  const handleAddNewEmptyStagedOrder = () => {
    const firstProd = products[0];
    const newOrder: ParsedOrder = {
      tempId: `manual-${Date.now()}`,
      rawBlock: '',
      customerName: '',
      phoneNumber: '',
      shippingAddress: '',
      items: [
        {
          id: `item-${Date.now()}`,
          rawText: '',
          code: firstProd?.code || 'SJ-NEW',
          title: firstProd?.title || 'Selected Jersey',
          selectedSize: 'L',
          quantity: 1,
          matchedProduct: firstProd
        }
      ],
      codAmount: 0,
      isExchange: false,
      isValid: false,
      validationErrors: ['Name is required', 'Mobile is required']
    };

    setStagedOrders(prev => [newOrder, ...prev]);
  };

  // Save All Staged Orders into Master Database (Supports incremental addition e.g. 50 + 1 = 51)
  const handleSaveAllStagedOrders = async () => {
    if (stagedOrders.length === 0) {
      showToast('No parsed orders in staging to save.');
      return;
    }

    // Check if any has fatal phone or name errors
    const invalidList = stagedOrders.filter(o => !o.isValid);
    if (invalidList.length > 0) {
      showToast(`Warning: ${invalidList.length} order(s) have validation errors (Name/11-digit Phone). Please fix before saving.`);
      return;
    }

    const convertedOrders: Order[] = stagedOrders.map((st, idx) => 
      convertParsedOrderToMasterOrder(st, savedOrders.length + idx)
    );

    // Commit to master orders list (incremental)
    const nextSavedOrders = [...convertedOrders, ...savedOrders];
    setSavedOrders(nextSavedOrders);

    // Push to server API
    try {
      await fetch('/api/orders/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders: convertedOrders })
      });
    } catch (e) {
      console.warn('Server bulk save sync:', e);
    }

    // Clear staging box
    setStagedOrders([]);
    setRawBulkInput('');
    showToast(`🎉 Successfully saved ${convertedOrders.length} orders! Master total is now ${nextSavedOrders.length} orders.`);
    
    if (onRefreshStats) onRefreshStats();
  };

  // Select / Deselect All checkbox toggle
  const allCurrentOrders = savedOrders;
  const isAllSelected = allCurrentOrders.length > 0 && selectedOrderIds.size === allCurrentOrders.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(allCurrentOrders.map(o => o.id)));
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

  // Trigger Steadfast Courier Bulk Dispatch
  const handleProcessSteadfastCourier = async () => {
    const targetIds = selectedOrderIds.size > 0 
      ? Array.from(selectedOrderIds) 
      : savedOrders.map(o => o.id);

    if (targetIds.length === 0) {
      showToast('Please select at least one order to send to Steadfast Courier.');
      return;
    }

    setIsProcessingCourier(true);
    try {
      const targetOrders = savedOrders.filter(o => targetIds.includes(o.id));
      const res = await processOrdersWithSteadfast(targetOrders, steadfastSettings);

      if (res.success) {
        // Update saved orders with assigned tracking numbers
        setSavedOrders(prev => {
          return prev.map(o => {
            const updated = res.orders.find(u => u.id === o.id);
            return updated || o;
          });
        });

        showToast(`🚚 Steadfast Consignments Generated! ${res.totalProcessed} orders assigned 9-digit tracking numbers.`);
      }
    } catch (e) {
      console.error('Steadfast error:', e);
      showToast('Error processing Steadfast consignments.');
    } finally {
      setIsProcessingCourier(false);
    }
  };

  // Open Batch Thermal / A4 Print View
  const handleOpenBatchPrint = (singleOrder?: Order) => {
    if (singleOrder) {
      setOrdersToPrint([singleOrder]);
      return;
    }

    const selectedList = savedOrders.filter(o => selectedOrderIds.has(o.id));
    if (selectedList.length > 0) {
      setOrdersToPrint(selectedList);
    } else if (savedOrders.length > 0) {
      setOrdersToPrint(savedOrders);
    } else {
      showToast('No saved orders available to print.');
    }
  };

  // Preview & Print Staged Orders Directly
  const handleOpenStagedPrint = () => {
    if (stagedOrders.length === 0) {
      showToast('No staged orders to print.');
      return;
    }
    const tempOrders: Order[] = stagedOrders.map((staged, idx) => ({
      id: `STG-${Date.now().toString().slice(-4)}-${idx + 1}`,
      customerName: staged.customerName || 'Customer',
      phoneNumber: staged.phoneNumber || '01XXXXXXXXX',
      shippingAddress: staged.shippingAddress || 'Bangladesh',
      items: staged.items.map((it, itIdx) => ({
        itemKey: `stg-item-${idx}-${itIdx}`,
        productId: it.matchedProduct?.id || `jersey-${itIdx}`,
        product: it.matchedProduct || {
          id: `prod-${itIdx}`,
          title: it.title || 'Official Club Jersey',
          price: 650,
          category: 'Retro Club',
          images: [it.imageUrl || 'https://images.unsplash.com/photo-1577212017184-80cc0da11082?auto=format&fit=crop&w=200&q=80'],
          sizes: ['M', 'L', 'XL', 'XXL'],
          description: 'Official kit',
          inStock: true,
          rating: 4.9,
          code: it.code || 'SJ-PRO'
        },
        selectedSize: it.selectedSize || 'XL',
        customName: it.customName || '',
        quantity: it.quantity || 1
      })),
      totalAmount: staged.codAmount || 650,
      codAmount: staged.codAmount || 650,
      isExchange: staged.isExchange,
      courierStatus: 'pending',
      trackingCode: (849000000 + (idx * 143)).toString().substring(0, 9),
      createdAt: new Date().toISOString(),
      orderNote: staged.orderNote || (staged.isExchange ? 'EXCHANGE PARCEL' : undefined)
    }));
    setOrdersToPrint(tempOrders);
  };

  // Delete saved order from master list
  const handleDeleteSavedOrder = async (id: string) => {
    setSavedOrders(prev => prev.filter(o => o.id !== id));
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    try {
      await fetch(`/api/orders/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('API delete order:', e);
    }

    showToast('Order removed from master ledger.');
  };

  // Filtered orders list for display
  const filteredSavedOrders = savedOrders.filter(order => {
    if (statusFilter === 'courier_sent' && order.courierStatus !== 'sent_to_courier') return false;
    if (statusFilter === 'pending' && order.courierStatus === 'sent_to_courier') return false;
    if (statusFilter === 'exchange' && !order.isExchange) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      order.customerName.toLowerCase().includes(q) ||
      (order.phoneNumber && order.phoneNumber.includes(q)) ||
      order.shippingAddress.toLowerCase().includes(q) ||
      (order.trackingCode && order.trackingCode.includes(q)) ||
      order.id.toLowerCase().includes(q) ||
      order.items.some(it => it.product?.title.toLowerCase().includes(q) || it.product?.code?.toLowerCase().includes(q))
    );
  });

  // Calculate totals
  const totalCodAmount = savedOrders.reduce((sum, o) => sum + (o.codAmount !== undefined ? o.codAmount : o.totalAmount), 0);
  const totalSteadfastDispatched = savedOrders.filter(o => !!o.trackingCode).length;
  const totalExchangeCount = savedOrders.filter(o => o.isExchange).length;

  return (
    <div className="space-y-6">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl bg-neutral-900 text-white text-xs font-bold shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-4 border border-neutral-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =========================================================================
          PILLAR 1 & 2: BULK ORDER INPUT & INTELLIGENT PARSER
          ========================================================================= */}
      <section className="bg-neutral-50/80 border border-neutral-200/90 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-mono font-bold tracking-wider uppercase">
                Order Process & Packaging Engine
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <h2 className="text-lg font-bold text-neutral-900 tracking-tight mt-1">
              Bulk Order Paste & Smart Extractor
            </h2>
            <p className="text-xs text-neutral-500">
              Paste raw WhatsApp chat texts containing multiple orders. The system automatically parses names, verified 11-digit mobile numbers, addresses, jerseys, sizes, and positive COD amounts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadSample}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Load Sample Batch</span>
            </button>

            {rawBulkInput && (
              <button
                type="button"
                onClick={handleClearBulkInput}
                className="px-3 py-1.5 rounded-xl bg-neutral-200 hover:bg-neutral-300 text-neutral-700 text-xs font-semibold transition-all"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Textarea for Bulk Paste */}
        <div className="relative">
          <textarea
            rows={5}
            value={rawBulkInput}
            onChange={(e) => setRawBulkInput(e.target.value)}
            placeholder={`Paste raw WhatsApp order message blocks here...\n\nExample:\nName: YASIN\nMobile: 01715123766\nAddress: MUNSHIGANG\nITEMS:\n1. [SJ-ZLC6N] REAL MADRID 2016-17 PURPLE JERSEY (Size: L) - "SOLAIMAN 7"\nAmount: 500৳\nExchange Parcel: YES`}
            className="w-full p-4 rounded-2xl bg-white border border-neutral-300 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 text-xs font-mono text-neutral-900 placeholder:text-neutral-400 transition-all leading-relaxed shadow-inner"
          />
        </div>

        {/* Action Buttons for Parser */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Strict Mandatory Validation: 11-Digit Mobile + Positive Integer COD Price</span>
          </div>

          <button
            type="button"
            onClick={handleParseBulkInput}
            className="px-6 py-2.5 rounded-full bg-neutral-900 hover:bg-black text-white text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Parse & Extract Orders</span>
          </button>
        </div>

      </section>

      {/* =========================================================================
          PILLAR 3: PREVIEW & STAGING WORKSPACE (Before Final Saving)
          ========================================================================= */}
      {stagedOrders.length > 0 && (
        <section className="bg-amber-50/40 border-2 border-amber-300/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-amber-200/60">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white font-mono font-bold text-[10px] uppercase">
                  Staging Workspace ({stagedOrders.length} Parsed)
                </span>
                <span className="text-xs text-amber-900 font-semibold">
                  Review & edit inline before adding to master database
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddNewEmptyStagedOrder}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-800 text-xs font-bold flex items-center gap-1 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Row</span>
              </button>

              <button
                type="button"
                onClick={handleOpenStagedPrint}
                className="px-4 py-2 rounded-full bg-neutral-900 hover:bg-black text-white text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Preview and print 3-inch thermal / A4 batch invoices directly"
              >
                <Printer className="w-3.5 h-3.5 text-rose-400" />
                <span>Print Invoices ({stagedOrders.length})</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAllStagedOrders}
                className="px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save All Orders ({stagedOrders.length})</span>
              </button>
            </div>
          </div>

          {/* Staging Rows Table */}
          <div className="overflow-x-auto rounded-2xl border border-amber-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-100/80 text-neutral-700 font-bold border-b border-neutral-200 text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Thumbnail</th>
                  <th className="py-2.5 px-3">Customer Name</th>
                  <th className="py-2.5 px-3">Mobile (11 Digits)</th>
                  <th className="py-2.5 px-3">Delivery Address</th>
                  <th className="py-2.5 px-3 min-w-[220px]">Jerseys & Customization</th>
                  <th className="py-2.5 px-3">COD (৳)</th>
                  <th className="py-2.5 px-3">Exchange</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-sans">
                {stagedOrders.map((order, orderIdx) => {
                  const hasPhoneError = !order.phoneNumber || order.phoneNumber.length !== 11;
                  const firstItem = order.items[0];
                  const thumbnailImg = firstItem?.matchedProduct?.images?.[0] || 'https://images.unsplash.com/photo-1577212017184-80cc0da11082?auto=format&fit=crop&w=150&q=80';

                  return (
                    <tr key={order.tempId} className="hover:bg-amber-50/30 transition-colors">
                      {/* Index */}
                      <td className="py-2.5 px-3 font-mono font-bold text-neutral-500">
                        {orderIdx + 1}
                      </td>

                      {/* Image Thumbnail Detection */}
                      <td className="py-2.5 px-3">
                        <div className="w-12 h-12 rounded-xl border border-neutral-200 bg-neutral-50 p-1 shrink-0 overflow-hidden flex items-center justify-center shadow-2xs">
                          <img
                            src={thumbnailImg}
                            alt="Jersey"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </td>

                      {/* Customer Name */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={order.customerName}
                          onChange={(e) => handleUpdateStagedOrder(orderIdx, { customerName: e.target.value })}
                          placeholder="Customer Name"
                          className="w-32 px-2 py-1 text-xs bg-neutral-50 border border-neutral-200 rounded-lg font-semibold text-neutral-900 focus:bg-white"
                        />
                      </td>

                      {/* Phone Number with live digit validation badge */}
                      <td className="py-2.5 px-3">
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={order.phoneNumber}
                            onChange={(e) => {
                              const digits = cleanAndFormatPhoneNumber(convertBengaliToEnglishDigits(e.target.value));
                              handleUpdateStagedOrder(orderIdx, { phoneNumber: digits });
                            }}
                            placeholder="01715123766"
                            className={`w-28 px-2 py-1 text-xs font-mono font-bold rounded-lg border focus:bg-white ${
                              hasPhoneError ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-neutral-200 bg-neutral-50 text-neutral-900'
                            }`}
                          />
                          <span className={`text-[10px] font-mono block ${hasPhoneError ? 'text-rose-600 font-bold' : 'text-emerald-600'}`}>
                            {order.phoneNumber ? `${order.phoneNumber.length}/11 Digits` : 'Required'}
                          </span>
                        </div>
                      </td>

                      {/* Address */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={order.shippingAddress}
                          onChange={(e) => handleUpdateStagedOrder(orderIdx, { shippingAddress: e.target.value })}
                          placeholder="District / Area"
                          className="w-36 px-2 py-1 text-xs bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-800 focus:bg-white"
                        />
                      </td>

                      {/* Items / Code / Size / Custom details */}
                      <td className="py-2.5 px-3">
                        <div className="space-y-1.5">
                          {order.items.map((it, itemIdx) => (
                            <div key={it.id || itemIdx} className="p-1.5 rounded-lg bg-neutral-50 border border-neutral-200 text-[11px] space-y-1">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={it.code || ''}
                                  onChange={(e) => handleUpdateStagedItem(orderIdx, itemIdx, { code: e.target.value.toUpperCase() })}
                                  placeholder="Code (SJ-XXX)"
                                  className="w-20 px-1.5 py-0.5 font-mono font-bold bg-white border border-neutral-300 rounded text-[10px]"
                                />
                                <input
                                  type="text"
                                  value={it.title}
                                  onChange={(e) => handleUpdateStagedItem(orderIdx, itemIdx, { title: e.target.value })}
                                  placeholder="Jersey Title"
                                  className="flex-1 px-1.5 py-0.5 bg-white border border-neutral-300 rounded text-[10px]"
                                />
                              </div>

                              <div className="flex items-center gap-1.5">
                                <select
                                  value={it.selectedSize}
                                  onChange={(e) => handleUpdateStagedItem(orderIdx, itemIdx, { selectedSize: e.target.value })}
                                  className="px-1.5 py-0.5 bg-white border border-neutral-300 rounded text-[10px] font-bold"
                                >
                                  {['S', 'M', 'L', 'XL', 'XXL', '3XL'].map(s => (
                                    <option key={s} value={s}>{s}</option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  value={it.customName || ''}
                                  onChange={(e) => handleUpdateStagedItem(orderIdx, itemIdx, { customName: e.target.value.toUpperCase() })}
                                  placeholder="Custom (e.g. YASIN 7)"
                                  className="flex-1 px-1.5 py-0.5 font-mono bg-white border border-neutral-300 rounded text-[10px]"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* COD Amount (Strict Positive Number) */}
                      <td className="py-2.5 px-3">
                        <div className="relative">
                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-[10px]">
                            ৳
                          </span>
                          <input
                            type="number"
                            min="0"
                            value={order.codAmount}
                            onChange={(e) => {
                              const val = Math.max(0, parseFloat(e.target.value) || 0);
                              handleUpdateStagedOrder(orderIdx, { codAmount: val });
                            }}
                            className="w-20 pl-4 pr-1 py-1 text-xs font-mono font-bold bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 focus:bg-white"
                          />
                        </div>
                      </td>

                      {/* Exchange Parcel Toggle */}
                      <td className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => handleUpdateStagedOrder(orderIdx, { isExchange: !order.isExchange })}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                            order.isExchange 
                              ? 'bg-neutral-900 text-white' 
                              : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                          }`}
                        >
                          {order.isExchange ? 'YES (Exchange)' : 'NO'}
                        </button>
                      </td>

                      {/* Row Delete */}
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteStagedOrder(orderIdx)}
                          className="p-1 text-neutral-400 hover:text-rose-600 transition-colors"
                          title="Remove row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* =========================================================================
          PILLAR 4 & 5: MASTER ORDERS LEDGER, COURIER & A4 PRINTING
          ========================================================================= */}
      <section className="bg-white border border-neutral-200/90 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        
        {/* Top Header & Summary Stats */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-neutral-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-neutral-900 tracking-tight">
                Master Order Ledger ({savedOrders.length})
              </h3>
              {selectedOrderIds.size > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-neutral-900 text-white text-[10px] font-bold font-mono">
                  {selectedOrderIds.size} Selected
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Select orders to dispatch via Steadfast Courier API and print compact thermal / A4 batch invoices.
            </p>
          </div>

          {/* Courier and Print Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Steadfast Courier Trigger Button */}
            <button
              type="button"
              disabled={isProcessingCourier || savedOrders.length === 0}
              onClick={handleProcessSteadfastCourier}
              className="px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              title="Process selected orders via Steadfast API and generate 9-digit tracking numbers"
            >
              <Truck className="w-4 h-4 text-white" />
              <span>
                {isProcessingCourier 
                  ? 'Generating Steadfast...' 
                  : `Steadfast Courier (${selectedOrderIds.size > 0 ? selectedOrderIds.size : 'All'})`}
              </span>
            </button>

            {/* Print Compact Invoices (A4 Batch / Thermal) */}
            <button
              type="button"
              disabled={savedOrders.length === 0}
              onClick={() => handleOpenBatchPrint()}
              className="px-4 py-2 rounded-full bg-neutral-900 hover:bg-black disabled:opacity-50 text-white text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              title="Print 3-inch thermal invoices fitted onto A4 sheets"
            >
              <Printer className="w-4 h-4" />
              <span>
                Print Invoices ({selectedOrderIds.size > 0 ? selectedOrderIds.size : savedOrders.length})
              </span>
            </button>

            {/* Courier Settings Icon */}
            <button
              type="button"
              onClick={() => setIsSteadfastModalOpen(true)}
              className="p-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-all shadow-2xs"
              title="Steadfast API Settings"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Pill Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200/80 text-center">
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">
              Total Orders
            </span>
            <span className="text-lg font-black text-neutral-900 font-mono">
              {savedOrders.length}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-center">
            <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">
              Total COD Collection
            </span>
            <span className="text-lg font-black text-emerald-900 font-mono">
              ৳{totalCodAmount}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200/80 text-center">
            <span className="text-[10px] text-rose-700 font-bold uppercase tracking-wider block">
              Steadfast Dispatched
            </span>
            <span className="text-lg font-black text-rose-900 font-mono">
              {totalSteadfastDispatched} / {savedOrders.length}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-center">
            <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider block">
              Exchange Parcels
            </span>
            <span className="text-lg font-black text-amber-900 font-mono">
              {totalExchangeCount}
            </span>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer, phone, code..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:outline-none focus:border-neutral-400 transition-all"
            />
          </div>

          {/* Status Filter Chips */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'all' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              All ({savedOrders.length})
            </button>
            <button
              onClick={() => setStatusFilter('courier_sent')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'courier_sent' ? 'bg-rose-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              Steadfast Sent ({totalSteadfastDispatched})
            </button>
            <button
              onClick={() => setStatusFilter('exchange')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'exchange' ? 'bg-amber-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              Exchange ({totalExchangeCount})
            </button>
          </div>
        </div>

        {/* Master Orders Table */}
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-100/90 text-neutral-800 font-bold border-b border-neutral-200 text-[11px] uppercase tracking-wider select-none">
                {/* Select All Checkbox */}
                <th className="py-3 px-3 w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-0 cursor-pointer"
                    title="Select All Orders"
                  />
                </th>
                <th className="py-3 px-3">Order ID / Date</th>
                <th className="py-3 px-3">Thumbnail</th>
                <th className="py-3 px-3">Customer Details</th>
                <th className="py-3 px-3 min-w-[200px]">Ordered Jerseys</th>
                <th className="py-3 px-3">COD Amount</th>
                <th className="py-3 px-3">Steadfast Tracking</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-sans">
              {filteredSavedOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-neutral-400 text-xs">
                    {savedOrders.length === 0 
                      ? 'No orders in master database. Paste and save orders above to get started.'
                      : 'No orders match your filter.'}
                  </td>
                </tr>
              ) : (
                filteredSavedOrders.map((order, idx) => {
                  const isSelected = selectedOrderIds.has(order.id);
                  const firstItem = order.items[0];
                  const thumbnailImg = firstItem?.product?.images?.[0] || 'https://images.unsplash.com/photo-1577212017184-80cc0da11082?auto=format&fit=crop&w=150&q=80';
                  const codAmt = order.codAmount !== undefined ? order.codAmount : order.totalAmount;

                  return (
                    <tr 
                      key={order.id} 
                      className={`transition-colors ${
                        isSelected ? 'bg-rose-50/40' : 'hover:bg-neutral-50'
                      }`}
                    >
                      {/* Individual Checkbox */}
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOrder(order.id)}
                          className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* ID & Date */}
                      <td className="py-3 px-3 font-mono">
                        <span className="font-bold text-neutral-900 block text-[11px]">
                          {order.id}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          {new Date(order.createdAt).toLocaleDateString('en-GB')}
                        </span>
                      </td>

                      {/* Thumbnail Image */}
                      <td className="py-3 px-3">
                        <div className="w-11 h-11 rounded-xl border border-neutral-200 bg-neutral-50 p-1 shrink-0 overflow-hidden flex items-center justify-center">
                          <img
                            src={thumbnailImg}
                            alt="Jersey"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </td>

                      {/* Customer Details */}
                      <td className="py-3 px-3">
                        <div className="space-y-0.5">
                          <div className="font-bold text-neutral-900 uppercase">
                            {order.customerName}
                          </div>
                          <div className="font-mono font-bold text-neutral-700 text-[11px]">
                            {order.phoneNumber}
                          </div>
                          <div className="text-neutral-500 text-[11px] truncate max-w-[180px]" title={order.shippingAddress}>
                            {order.shippingAddress}
                          </div>
                        </div>
                      </td>

                      {/* Items */}
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          {order.items.map((it, itemIdx) => (
                            <div key={it.itemKey || itemIdx} className="text-[11px] leading-tight">
                              <span className="font-bold text-neutral-900">
                                {it.product?.code && `[${it.product.code}] `}
                                {it.product?.title || 'Jersey'}
                              </span>
                              <span className="ml-1 text-neutral-500 font-mono">
                                ({it.selectedSize || 'L'})
                              </span>
                              {it.customName && (
                                <span className="ml-1 text-neutral-700 font-mono font-semibold bg-neutral-100 px-1 rounded">
                                  "{it.customName}"
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* COD Amount */}
                      <td className="py-3 px-3 font-mono font-extrabold text-neutral-900 text-sm">
                        ৳{codAmt}
                      </td>

                      {/* Steadfast 9-Digit Tracking */}
                      <td className="py-3 px-3">
                        {order.trackingCode ? (
                          <div className="space-y-0.5">
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-black text-xs border border-emerald-300 block text-center">
                              {order.trackingCode}
                            </span>
                            <span className="text-[9px] text-neutral-400 font-mono block text-center">
                              Steadfast Verified
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-neutral-400 italic">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Type / Exchange */}
                      <td className="py-3 px-3">
                        {order.isExchange ? (
                          <span className="px-2 py-0.5 rounded-full bg-neutral-900 text-white font-bold text-[10px]">
                            EXCHANGE
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-[10px]">
                            Standard
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenBatchPrint(order)}
                            className="p-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 transition-all"
                            title="Print Single Thermal Invoice"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSavedOrder(order.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-neutral-400 hover:text-rose-600 transition-all"
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

      </section>

      {/* =========================================================================
          STEADFAST COURIER API CONFIGURATION MODAL
          ========================================================================= */}
      {isSteadfastModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-neutral-200 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-neutral-900">
                  Steadfast Courier API Settings
                </h3>
              </div>
              <button
                onClick={() => setIsSteadfastModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-600 font-semibold mb-1">
                  Steadfast API Key
                </label>
                <input
                  type="text"
                  value={steadfastSettings.apiKey}
                  onChange={(e) => setSteadfastSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-neutral-600 font-semibold mb-1">
                  Steadfast Secret Key
                </label>
                <input
                  type="password"
                  value={steadfastSettings.secretKey}
                  onChange={(e) => setSteadfastSettings(prev => ({ ...prev, secretKey: e.target.value }))}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-neutral-600 font-semibold mb-1">
                  API Endpoint Base URL
                </label>
                <input
                  type="text"
                  value={steadfastSettings.baseUrl}
                  onChange={(e) => setSteadfastSettings(prev => ({ ...prev, baseUrl: e.target.value }))}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-mono text-xs text-neutral-600"
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    setIsSteadfastModalOpen(false);
                    showToast('Steadfast settings saved.');
                  }}
                  className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold text-xs transition-all shadow-sm"
                >
                  Save & Apply Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          PRINT PREVIEW MODAL (3-INCH THERMAL & A4 BATCH)
          ========================================================================= */}
      {ordersToPrint && (
        <CompactInvoicePrintView
          orders={ordersToPrint}
          onClose={() => setOrdersToPrint(null)}
        />
      )}

    </div>
  );
};
