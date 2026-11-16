import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Trash2, 
  Check, 
  Copy, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  ShoppingBag,
  Download
} from 'lucide-react';
import { JerseyProduct, Order, CartItem } from '../types';
import { SiteSettings } from '../types/settings';
import { CurrencyCode } from '../utils/currency';
import { 
  convertBengaliToEnglishDigits, 
  cleanAndFormatPhoneNumber, 
  parseCombinedAddressBox 
} from '../utils/phoneUtils';

interface OrderItemForm {
  id: string;
  product: JerseyProduct | null;
  searchQuery: string;
  selectedSize: string; // Default empty
  customNameNumber: string;
}

interface PlaceOrderPageProps {
  products: JerseyProduct[];
  siteSettings: SiteSettings;
  currency: CurrencyCode;
  onBackToStore: () => void;
  onOrderPlaced?: (order: Order) => void;
  initialProductId?: string;
  initialSize?: string;
  onPromptInstall?: () => void;
  deferredPrompt?: any;
  isStandalone?: boolean;
}

const AVAILABLE_SIZES = ['M', 'L', 'XL', 'XXL', 'XXXL'];

export const PlaceOrderPage: React.FC<PlaceOrderPageProps> = ({
  products = [],
  siteSettings,
  currency,
  onBackToStore,
  onOrderPlaced,
  initialProductId,
  initialSize,
  onPromptInstall,
  deferredPrompt,
  isStandalone
}) => {
  // Initialize items: Use initialSize if provided, otherwise default empty
  const [items, setItems] = useState<OrderItemForm[]>(() => {
    let initialProd: JerseyProduct | null = null;
    if (initialProductId) {
      const safeProducts = Array.isArray(products) ? products : [];
      initialProd = safeProducts.find(p => p.id === initialProductId) || null;
    }
    return [
      {
        id: `item-${Date.now()}-1`,
        product: initialProd,
        searchQuery: initialProd ? `${initialProd.code ? `[${initialProd.code}] ` : ''}${initialProd.title}` : '',
        selectedSize: initialSize || '',
        customNameNumber: ''
      }
    ];
  });

  // Active search dropdown index
  const [activeDropdownIndex, setActiveDropdownIndex] = useState<number | null>(null);

  // Box 1: Full Address Multiline Single-Box
  // Line 1: Name, Line 2: Phone, Line 3+: Address
  const [combinedDetailsText, setCombinedDetailsText] = useState('');
  
  // Parsed values
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  // Box 2: COD Amount (Direct Typeable Input Box)
  const [codAmount, setCodAmount] = useState<string>('');

  // Box 3: Exchange Parcel Toggle Switch (Default OFF)
  const [isExchangeParcel, setIsExchangeParcel] = useState(false);
  const [exchangeDetails, setExchangeDetails] = useState('');

  // Box 4: Gift Box Option (Default OFF)
  const [hasGiftBox, setHasGiftBox] = useState(false);
  const [giftBoxType, setGiftBoxType] = useState('Premium Gift Box');

  // Validation States
  const [sizeErrors, setSizeErrors] = useState<{ [key: string]: boolean }>({});
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Submission & Confirmation State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [confirmedCodAmount, setConfirmedCodAmount] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);

  // Sync initial product if loaded
  useEffect(() => {
    if (initialProductId) {
      const prod = products.find(p => p.id === initialProductId);
      if (prod) {
        setItems([
          {
            id: `item-${Date.now()}-1`,
            product: prod,
            searchQuery: `${prod.code ? `[${prod.code}] ` : ''}${prod.title}`,
            selectedSize: initialSize || '',
            customNameNumber: ''
          }
        ]);
      }
    }
  }, [initialProductId, initialSize, products]);

  // Handle Combined Text Parsing in Box 1
  const syncParsedDetailsState = (parsed: { name: string; phone: string; address: string }) => {
    setCustomerName(parsed.name);

    if (parsed.phone) {
      const converted = convertBengaliToEnglishDigits(parsed.phone);
      const cleanPhone = cleanAndFormatPhoneNumber(converted);
      setPhoneNumber(cleanPhone);

      if (cleanPhone.length > 0 && cleanPhone.length < 11) {
        setPhoneError(`Mobile number must be 11 digits (currently ${cleanPhone.length} digits)`);
      } else {
        setPhoneError(null);
      }
    } else {
      setPhoneNumber('');
      setPhoneError(null);
    }

    setDeliveryAddress(parsed.address);
  };

  const handleCombinedDetailsChange = (text: string, isPasteInput?: boolean) => {
    const parsed = parseCombinedAddressBox(text);
    if (isPasteInput) {
      const cleanedText = [parsed.name, parsed.phone, parsed.address].filter(Boolean).join('\n');
      setCombinedDetailsText(cleanedText);
    } else {
      setCombinedDetailsText(text);
    }
    syncParsedDetailsState(parsed);
  };

  const handleCombinedDetailsPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData?.getData('text');
    if (!pastedText) return;
    e.preventDefault();

    const currentEl = e.currentTarget;
    const start = currentEl.selectionStart ?? 0;
    const end = currentEl.selectionEnd ?? combinedDetailsText.length;

    // If user pasted into an empty box or replaced all/most text, parse the pasted block directly
    const nextRaw =
      combinedDetailsText.trim() && (start > 0 || end < combinedDetailsText.length)
        ? `${combinedDetailsText.slice(0, start)}${pastedText}${combinedDetailsText.slice(end)}`
        : pastedText;

    const parsed = parseCombinedAddressBox(nextRaw);
    const cleanedLines = [parsed.name, parsed.phone, parsed.address].filter(Boolean);
    setCombinedDetailsText(cleanedLines.join('\n'));
    syncParsedDetailsState(parsed);
  };

  // Add more jersey row
  const handleAddMoreJersey = () => {
    const newItemId = `item-${Date.now()}-${items.length + 1}`;
    setItems(prev => [
      ...prev,
      {
        id: newItemId,
        product: null,
        searchQuery: '',
        selectedSize: '', // Default empty
        customNameNumber: ''
      }
    ]);
    setActiveDropdownIndex(items.length);
  };

  // Duplicate existing jersey card (clones selected product, size, and custom name/number)
  const handleDuplicateJersey = (index: number) => {
    setItems(prev => {
      const source = prev[index];
      if (!source) return prev;
      const duplicated: OrderItemForm = {
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        product: source.product,
        searchQuery: source.searchQuery,
        selectedSize: source.selectedSize,
        customNameNumber: source.customNameNumber
      };
      const next = [...prev];
      next.splice(index + 1, 0, duplicated);
      return next;
    });
    setActiveDropdownIndex(null);
  };

  // Remove jersey row
  const handleRemoveJersey = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Select product from search
  const handleSelectProduct = (index: number, product: JerseyProduct) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        product,
        searchQuery: `${product.code ? `[${product.code}] ` : ''}${product.title}`,
        // Keep size empty unless already selected
        selectedSize: updated[index].selectedSize || ''
      };
      return updated;
    });
    setActiveDropdownIndex(null);
  };

  // Update item field
  const handleUpdateItem = (index: number, updates: Partial<OrderItemForm>) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...updates };
      return updated;
    });
  };

  // Filter products for search
  const getFilteredProducts = (query: string) => {
    const safeProducts = Array.isArray(products) ? products : [];
    if (!query.trim()) return safeProducts.slice(0, 15);
    const q = query.toLowerCase().trim();
    return safeProducts.filter(p => 
      (p.code && p.code.toLowerCase().includes(q)) ||
      (p.title && p.title.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.season && p.season.toLowerCase().includes(q)) ||
      (p.edition && p.edition.toLowerCase().includes(q)) ||
      (p.badge && p.badge.toLowerCase().includes(q))
    );
  };

  // Submit and Confirm Order
  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    // 1. Verify all jersey selections
    const unselectedJerseyIdx = items.findIndex(it => !it.product);
    if (unselectedJerseyIdx !== -1) {
      setGeneralError(`Please select a jersey for Jersey #${unselectedJerseyIdx + 1}`);
      return;
    }

    // 2. Strict Size Validation: Size is mandatory
    const newSizeErrors: { [key: string]: boolean } = {};
    let hasSizeError = false;
    items.forEach((it) => {
      if (!it.selectedSize || it.selectedSize.trim() === '') {
        newSizeErrors[it.id] = true;
        hasSizeError = true;
      }
    });

    if (hasSizeError) {
      setSizeErrors(newSizeErrors);
      setGeneralError('Size is required. Please select a size for each jersey.');
      return;
    }

    // 3. Validate Combined Details Box
    if (!combinedDetailsText.trim()) {
      setGeneralError('Please enter customer details (Name, Mobile Number, and Address).');
      return;
    }

    const parsed = parseCombinedAddressBox(combinedDetailsText);
    const name = parsed.name || customerName;
    const rawPhone = parsed.phone || phoneNumber;
    const address = parsed.address || deliveryAddress;

    if (!name.trim()) {
      setGeneralError('Please provide customer name in Line 1.');
      return;
    }

    // 4. Mobile Number Validation: Must be 11 digits
    const phoneClean = cleanAndFormatPhoneNumber(rawPhone);
    if (!phoneClean || phoneClean.length !== 11) {
      const err = `Mobile number must be 11 digits (currently ${phoneClean ? phoneClean.length : 0} digits).`;
      setPhoneError(err);
      setGeneralError(err);
      return;
    }

    if (!address.trim()) {
      setGeneralError('Please provide delivery address in Line 3.');
      return;
    }

    setIsSubmitting(true);

    try {
      const parsedCodAmount = Math.max(0, parseFloat(codAmount) || 0);
      const itemPriceShare = parsedCodAmount > 0 ? Math.round(parsedCodAmount / Math.max(1, items.length)) : 0;

      const cartItems: CartItem[] = items.map((it, idx) => ({
        itemKey: `order-item-${Date.now()}-${idx}`,
        product: {
          ...it.product!,
          // Decouple from catalog database price so manual COD amount is respected everywhere
          price: parsedCodAmount > 0 ? itemPriceShare : (it.product?.price || 0)
        },
        selectedSize: it.selectedSize,
        customName: it.customNameNumber.trim() || undefined,
        quantity: 1,
        addedAt: Date.now()
      }));

      const newOrder: Order = {
        id: `SPIDEY-${Date.now().toString(36).toUpperCase()}`,
        items: cartItems,
        customerName: name.trim(),
        customerEmail: `${phoneClean}@spideyorder.com`,
        phoneNumber: phoneClean,
        shippingAddress: address.trim(),
        paymentMethod: 'Cash On Delivery (COD)',
        isExchange: isExchangeParcel,
        hasGiftBox: hasGiftBox,
        giftBoxType: hasGiftBox ? (giftBoxType.trim() || 'Premium Gift Box') : undefined,
        orderNote: isExchangeParcel && exchangeDetails ? `Exchange: ${exchangeDetails.trim()}` : undefined,
        orderType: 'quick_form',
        subtotal: parsedCodAmount,
        discount: 0,
        shippingFee: 0,
        totalAmount: parsedCodAmount,
        codAmount: parsedCodAmount,
        status: 'confirmed',
        createdAt: new Date().toISOString()
      };

      // Requirement 7: Employee Order Copy Feature
      // DO NOT call /api/orders or register this in the main database
      // to avoid conflicting with customer live store orders.
      const formattedText = generateReceiptText(newOrder, codAmount.trim());
      try {
        await navigator.clipboard.writeText(formattedText);
        setIsCopied(true);
      } catch (clipErr) {
        console.warn('Auto copy failed, user can click copy button:', clipErr);
      }

      setConfirmedCodAmount(codAmount.trim());
      setConfirmedOrder(newOrder);
    } catch (err) {
      console.error('Order format generation error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate clean, formatted receipt text for clipboard copying matching exact requested pattern
  const generateReceiptText = (order: Order, codValue: string) => {
    const orderItems = Array.isArray(order.items) ? order.items : [];
    const itemsFormatted = orderItems.map((it, idx) => {
      const codePart = it?.product?.code ? `[${it.product.code}] ` : '';
      const customPieces = [it?.customName, it?.customNumber].filter(Boolean);
      const customPart = customPieces.length > 0 ? ` -  "${customPieces.join(' ')}"` : '';
      const prodTitle = it?.product?.title || 'Jersey';
      const sizeStr = it?.selectedSize || 'L';
      return `${idx + 1}. ${codePart}${prodTitle} (Size: ${sizeStr})${customPart}`.trim();
    }).join('\n');

    const amountDisplay = codValue ? `${codValue}৳` : '0৳';
    const exchangeLine = order.isExchange 
      ? `\nExchange Parcel: YES${order.orderNote ? `\nExchange Note: ${order.orderNote}` : ''}`
      : '';
    const giftBoxLine = order.hasGiftBox
      ? `\nGift Box: YES (${order.giftBoxType || 'Premium Gift Box'})`
      : '';

    const rawAddress = (order.shippingAddress || '').trim();
    let zoneTitle = '';
    if (order.deliveryZone === 'inside_dhaka') zoneTitle = 'ঢাকার ভেতরে';
    else if (order.deliveryZone === 'sub_dhaka') zoneTitle = 'ঢাকার সাব-এরিয়া';
    else if (order.deliveryZone === 'outside_dhaka') zoneTitle = 'ঢাকার বাইরে';
    else if (order.deliveryZone) zoneTitle = order.deliveryZone;

    const finalAddress = zoneTitle && !rawAddress.includes(`[ ${zoneTitle} ]`) && !rawAddress.includes(`[${zoneTitle}]`)
      ? `${rawAddress} [ ${zoneTitle} ]`
      : rawAddress;

    return `Name: ${order.customerName}
Mobile: ${order.phoneNumber}
Address: ${finalAddress}

ITEMS:
${itemsFormatted}
Amount: ${amountDisplay}${exchangeLine}${giftBoxLine}`;
  };

  // Copy Entire Text
  const handleCopyText = () => {
    if (!confirmedOrder) return;
    const text = generateReceiptText(confirmedOrder, confirmedCodAmount);
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  // Reset form to order again
  const handleOrderAnother = () => {
    setConfirmedOrder(null);
    setConfirmedCodAmount('');
    setItems([
      {
        id: `item-${Date.now()}-1`,
        product: null,
        searchQuery: '',
        selectedSize: '',
        customNameNumber: ''
      }
    ]);
    setCombinedDetailsText('');
    setCustomerName('');
    setPhoneNumber('');
    setDeliveryAddress('');
    setCodAmount('');
    setIsExchangeParcel(false);
    setExchangeDetails('');
    setHasGiftBox(false);
    setGiftBoxType('Premium Gift Box');
    setSizeErrors({});
    setPhoneError(null);
    setGeneralError(null);
  };

  // ==========================================
  // VIEW 2: ORDER CONFIRMATION & RECEIPT SCREEN
  // (Apple-Style Clean Silver Aesthetic)
  // ==========================================
  if (confirmedOrder) {
    const formattedReceipt = generateReceiptText(confirmedOrder, confirmedCodAmount);

    return (
      <div className="min-h-screen place-order-aurora-bg text-neutral-900 flex flex-col font-sans selection:bg-indigo-600 selection:text-white pb-16 relative overflow-hidden">
        {/* Soft Ambient Pastel Glow Orbs */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
          <div className="place-order-orb-1 absolute -top-24 -left-24 w-72 h-72 rounded-full bg-indigo-200/35 blur-3xl" />
          <div className="place-order-orb-2 absolute top-1/3 -right-24 w-80 h-80 rounded-full bg-rose-200/30 blur-3xl" />
        </div>

        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white/75 backdrop-blur-xl border-b border-indigo-100/70 px-4 py-3 shadow-[0_4px_20px_-10px_rgba(79,70,229,0.12)]">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <button
              onClick={onBackToStore}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50/80 hover:bg-indigo-100 text-indigo-800 border border-indigo-100 text-xs font-semibold transition-all duration-200 hover:-translate-x-0.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Store</span>
            </button>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50/80 border border-emerald-200/60">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-emerald-800 tracking-tight">Order Confirmed</span>
            </div>
          </div>
        </header>

        {/* Main Card Container (Slim & Compact) */}
        <main className="relative z-10 flex-1 max-w-md w-full mx-auto px-4 pt-6 pb-8">
          <div className="place-order-card-enter bg-white/90 backdrop-blur-xl border border-indigo-100/80 rounded-3xl p-5 sm:p-6 shadow-[0_14px_40px_-14px_rgba(79,70,229,0.16)] space-y-5">
            
            {/* Header / Success Indicator */}
            <div className="text-center space-y-1.5 pt-1">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white mx-auto flex items-center justify-center shadow-md shadow-emerald-500/25">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h1 className="text-lg font-extrabold text-neutral-900 tracking-tight">
                অর্ডার ফরম্যাট তৈরি সম্পন্ন (Ready to Copy)
              </h1>
              <p className="text-xs text-neutral-500">
                এই ফরম্যাটটি ক্লিপবোর্ডে কপি করা হয়েছে। এটি সরাসরি মেইন সিস্টেমে কোনো অর্ডার জমা করে না।
              </p>
            </div>

            {/* Formatted Text Box with Top "Copy This Text" Action */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900/70 uppercase tracking-wider">
                  Formatted Order Text
                </span>
                
                {/* Copy Button on Top of the Box */}
                <button
                  onClick={handleCopyText}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 shadow-xs cursor-pointer ${
                    isCopied 
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/25' 
                      : 'place-order-cta-gradient text-white hover:scale-105 active:scale-95'
                  }`}
                  title="Copy formatted text to clipboard"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Text</span>
                    </>
                  )}
                </button>
              </div>

              {/* Formatted Textarea Container */}
              <div className="relative rounded-2xl bg-gradient-to-br from-slate-50/90 to-indigo-50/40 border border-indigo-100/80 p-4 font-mono text-xs text-neutral-800 leading-relaxed overflow-x-auto whitespace-pre-wrap select-all">
                {formattedReceipt}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="space-y-2.5 pt-2">
              <button
                onClick={handleCopyText}
                className={`w-full py-3 rounded-full text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all duration-200 active:scale-[0.99] cursor-pointer ${
                  isCopied
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/25'
                    : 'place-order-cta-gradient shadow-indigo-500/20 hover:shadow-lg hover:-translate-y-0.5'
                }`}
              >
                {isCopied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Entire Order Text Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy This Text</span>
                  </>
                )}
              </button>

              <button
                onClick={handleOrderAnother}
                className="w-full py-3 rounded-full bg-indigo-50/80 hover:bg-indigo-100/90 text-indigo-800 border border-indigo-100 text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Place Another Order</span>
              </button>
            </div>

          </div>
        </main>
      </div>
    );
  }

  // ==========================================
  // VIEW 1: PLACE ORDER INPUT FORM
  // (Slim, Compact Apple-Style Aesthetics)
  // ==========================================
  return (
    <div className="min-h-screen place-order-aurora-bg text-neutral-900 flex flex-col font-sans selection:bg-indigo-600 selection:text-white pb-20 relative overflow-hidden">
      {/* Subtle Ambient Breathing Pastel Glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="place-order-orb-1 -top-20 -left-20 absolute w-72 h-72 rounded-full bg-indigo-200/35 blur-3xl" />
        <div className="place-order-orb-2 top-1/3 -right-24 absolute w-80 h-80 rounded-full bg-rose-200/30 blur-3xl" />
        <div className="place-order-orb-1 bottom-0 left-1/4 absolute w-72 h-72 rounded-full bg-teal-200/25 blur-3xl" />
      </div>

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/75 backdrop-blur-xl border-b border-indigo-100/70 px-4 py-3 shadow-[0_4px_20px_-10px_rgba(79,70,229,0.12)]">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            onClick={onBackToStore}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50/80 hover:bg-indigo-100 text-indigo-800 border border-indigo-100 text-xs font-semibold transition-all duration-200 hover:-translate-x-0.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Store</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-indigo-500 to-rose-500 animate-pulse shadow-xs shadow-indigo-500/40" />
            <h1 className="text-sm font-extrabold bg-gradient-to-r from-indigo-950 via-violet-900 to-rose-900 bg-clip-text text-transparent tracking-tight">
              Place Order
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {!isStandalone && onPromptInstall && (
              <button
                type="button"
                onClick={onPromptInstall}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-rose-50 to-amber-50 hover:from-rose-100 hover:to-amber-100 text-rose-700 border border-rose-200/80 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                title="Install Place Order Shortcut on Mobile or PC"
              >
                <Download className="w-3 h-3 text-rose-600" />
                <span className="hidden sm:inline">Install App</span>
                <span className="sm:hidden">Install</span>
              </button>
            )}
            <span className="text-[10px] font-mono text-indigo-700 font-bold uppercase px-2.5 py-0.5 rounded-full bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200/70">
              COD
            </span>
          </div>
        </div>
      </header>

      {/* Main Container - Compact, Slim ("চিকন-চাকন") Column */}
      <main className="relative z-10 flex-1 max-w-md w-full mx-auto px-4 pt-5 space-y-4">
        
        <form onSubmit={handleConfirmOrder} className="space-y-4">
          
          {/* General Error Notification */}
          {generalError && (
            <div className="place-order-card-enter p-3.5 rounded-2xl bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2.5 shadow-sm">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{generalError}</span>
            </div>
          )}

          {/* =========================================
              SECTION 1: ORDERED JERSEYS
              (No prices / charges shown)
              ========================================= */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-950/70 flex items-center gap-1.5">
                <span className="w-1.5 h-3.5 rounded-full bg-gradient-to-b from-indigo-500 to-violet-500 inline-block" />
                Selected Jerseys ({items.length})
              </span>
              <span className="text-[11px] text-indigo-500/80 font-semibold">
                * Size is required
              </span>
            </div>

            {/* Jersey Items List */}
            <div className="space-y-3">
              {items.map((item, index) => {
                const isDropdownOpen = activeDropdownIndex === index;
                const filteredProducts = getFilteredProducts(item.searchQuery);
                const hasSizeError = sizeErrors[item.id] && !item.selectedSize;

                return (
                  <div 
                    key={item.id}
                    className="place-order-card-enter p-4 rounded-3xl bg-white/90 backdrop-blur-md border border-indigo-100/90 hover:border-indigo-200 focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-100/50 shadow-[0_8px_28px_-12px_rgba(79,70,229,0.14)] space-y-3.5 transition-all duration-300"
                  >
                    {/* Item Row Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[11px] font-bold shadow-xs shadow-indigo-500/20">
                          Jersey #{index + 1}
                        </span>
                        {item.product?.code && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 font-mono font-bold text-[10px] border border-indigo-200/70">
                            {item.product.code}
                          </span>
                        )}
                      </div>

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveJersey(index)}
                          className="text-xs text-neutral-400 hover:text-rose-600 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-rose-50 cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-semibold">Remove</span>
                        </button>
                      )}
                    </div>

                    {/* Product Search & Thumbnail Row */}
                    <div className="flex items-start gap-3">
                      {/* Thumbnail Box */}
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-rose-50/50 border border-indigo-100/80 p-1.5 shrink-0 overflow-hidden flex items-center justify-center transition-transform duration-300 hover:scale-105">
                        {item.product?.images && item.product.images[0] ? (
                          <img 
                            src={item.product.images[0]} 
                            alt={item.product.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="text-indigo-300 flex items-center justify-center">
                            <ShoppingBag className="w-5 h-5" />
                          </div>
                        )}
                      </div>

                      {/* Autocomplete Search Input */}
                      <div className="flex-1 relative min-w-0">
                        <div className="relative">
                          <Search className="w-4 h-4 text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={item.searchQuery}
                            onFocus={() => setActiveDropdownIndex(index)}
                            onChange={(e) => {
                              handleUpdateItem(index, { searchQuery: e.target.value });
                              setActiveDropdownIndex(index);
                            }}
                            placeholder="Search jersey by name or code..."
                            className="w-full pl-9 pr-8 py-2.5 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:border-neutral-400 transition-all font-sans"
                          />
                          {item.searchQuery && (
                            <button
                              type="button"
                              onClick={() => {
                                handleUpdateItem(index, { searchQuery: '', product: null });
                                setActiveDropdownIndex(index);
                              }}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-1 text-xs"
                              title="Clear search"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        {/* Autocomplete Dropdown List */}
                        {isDropdownOpen && (
                          <>
                            <div 
                              className="fixed inset-0 z-30" 
                              onClick={() => setActiveDropdownIndex(null)} 
                            />
                            <div 
                              className="absolute left-0 right-0 top-full mt-1.5 z-40 max-h-80 sm:max-h-96 overflow-y-auto overscroll-contain rounded-2xl bg-white border border-neutral-200/90 shadow-2xl divide-y divide-neutral-100"
                              style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
                            >
                              {filteredProducts.length > 0 ? (
                                filteredProducts.map((prod) => (
                                  <button
                                    type="button"
                                    key={prod.id}
                                      onClick={() => handleSelectProduct(index, prod)}
                                      className="w-full p-3 sm:p-3.5 flex items-center gap-3 sm:gap-3.5 hover:bg-neutral-50 active:bg-neutral-100/80 text-left transition-all duration-150 group cursor-pointer focus:outline-none focus:bg-neutral-50"
                                    >
                                      {/* Left: Enlarged Product Thumbnail Image */}
                                      <div className="w-14 h-14 sm:w-15 sm:h-15 rounded-xl bg-neutral-50 p-1 border border-neutral-200/90 shadow-xs shrink-0 overflow-hidden flex items-center justify-center group-hover:border-neutral-300 transition-colors">
                                        {prod.images && prod.images[0] ? (
                                          <img 
                                            src={prod.images[0]} 
                                            alt={prod.title}
                                            referrerPolicy="no-referrer"
                                            className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
                                            loading="lazy"
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-400 font-bold">
                                            ITEM
                                          </div>
                                        )}
                                      </div>

                                      {/* Right: Stacked Layout (Top: Code, Bottom: Title) */}
                                      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                                        {/* Top Line: Product Code */}
                                        {prod.code && (
                                          <div>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-900 font-mono font-bold text-[11px] border border-neutral-200/80 tracking-wide">
                                              [{prod.code}]
                                            </span>
                                          </div>
                                        )}

                                        {/* Bottom Line: Main Product Title in Bold */}
                                        <div className="text-xs sm:text-[13px] font-bold text-neutral-900 leading-snug break-words group-hover:text-black">
                                          {prod.title}
                                        </div>
                                      </div>
                                    </button>
                                  ))
                                ) : (
                                <div className="p-6 text-center space-y-1.5">
                                  <div className="text-neutral-700 font-bold text-xs">
                                    No jerseys found
                                  </div>
                                  <p className="text-[11px] text-neutral-400">
                                    Try searching by club name, color, kit, or product code.
                                  </p>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Size Selector - Empty by default, triggers signal if not selected */}
                    <div className="space-y-1 pt-0.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-neutral-700">
                          Size <span className="text-rose-500">*</span>
                        </label>
                        {hasSizeError && (
                          <span className="text-[10px] text-rose-600 font-bold">
                            Please select a size
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex flex-wrap gap-1.5">
                          {AVAILABLE_SIZES.map((sz) => {
                            const isSelected = item.selectedSize === sz;
                            return (
                              <button
                                type="button"
                                key={sz}
                                onClick={() => {
                                  handleUpdateItem(index, { selectedSize: sz });
                                  if (hasSizeError) {
                                    setSizeErrors(prev => ({ ...prev, [item.id]: false }));
                                  }
                                }}
                                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                                  isSelected
                                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-500/30 scale-105'
                                    : hasSizeError
                                    ? 'bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100'
                                    : 'bg-slate-100/80 text-neutral-700 hover:bg-indigo-50 hover:text-indigo-700 border border-transparent'
                                }`}
                              >
                                {sz}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDuplicateJersey(index)}
                          className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-indigo-50 to-sky-50 hover:from-indigo-100 hover:to-sky-100 text-indigo-700 border border-indigo-200/70 text-[11px] font-bold flex items-center gap-1 transition-all duration-200 active:scale-95 shrink-0 cursor-pointer shadow-2xs"
                          title="Duplicate selected jersey, size, and custom name/number"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Duplicate</span>
                        </button>
                      </div>
                    </div>

                    {/* Custom Name & Number Input (Optional) */}
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-500 mb-1">
                        Custom Name & Number (Optional)
                      </label>
                      <input
                        type="text"
                        value={item.customNameNumber}
                        onChange={(e) => handleUpdateItem(index, { customNameNumber: e.target.value.toUpperCase() })}
                        placeholder="e.g. RONALDO 7 or MESSI"
                        className="w-full px-3 py-1.5 text-xs bg-slate-50/80 border border-indigo-100 rounded-xl text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:border-indigo-400 font-mono uppercase transition-all"
                      />
                    </div>

                  </div>
                );
              })}
            </div>

            {/* + Add More Jersey Button */}
            <button
              type="button"
              onClick={handleAddMoreJersey}
              className="w-full py-2.5 rounded-2xl border border-dashed border-indigo-300/80 hover:border-indigo-400 bg-white/75 hover:bg-indigo-50/70 backdrop-blur-sm text-indigo-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-200 hover:-translate-y-0.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add More Jersey</span>
            </button>
          </div>

          {/* =========================================
              SECTION 2: CUSTOMER & ORDER DETAILS
              (Exactly 3 Clean Boxes as requested)
              ========================================= */}
          <div className="space-y-3 pt-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-950/70 px-1 flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 rounded-full bg-gradient-to-b from-sky-500 to-teal-500 inline-block" />
              Order Details
            </span>

            {/* BOX 1: SINGLE FULL ADDRESS BOX (Name, Phone, Address in 1 Box) */}
            <div className="p-4 rounded-3xl bg-white/90 backdrop-blur-md border border-sky-100/90 focus-within:border-sky-300 focus-within:ring-4 focus-within:ring-sky-100/60 shadow-[0_8px_28px_-12px_rgba(14,165,233,0.14)] space-y-2 transition-all duration-300">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-800">
                  Customer & Delivery Details <span className="text-rose-500">*</span>
                </label>
                {phoneNumber && phoneNumber.length === 11 && !phoneError && (
                  <span className="place-order-card-enter text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70 font-bold font-mono flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    11 Digits Verified
                  </span>
                )}
              </div>

              <textarea
                rows={4}
                required
                value={combinedDetailsText}
                onPaste={handleCombinedDetailsPaste}
                onChange={(e) => {
                  const nativeEvt = e.nativeEvent as InputEvent | undefined;
                  const isPaste = nativeEvt?.inputType === 'insertFromPaste';
                  handleCombinedDetailsChange(e.target.value, isPaste);
                }}
                placeholder={`Line 1: Customer Name\nLine 2: Mobile Number (e.g. 01715123766)\nLine 3: Delivery Address (District, Area, Road, House No)`}
                className={`w-full p-3 text-xs bg-slate-50/70 border rounded-2xl text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:bg-white transition-all font-sans leading-relaxed ${
                  phoneError ? 'border-rose-300 focus:border-rose-400' : 'border-sky-100 focus:border-sky-400'
                }`}
              />

              {phoneError ? (
                <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {phoneError}
                </p>
              ) : (
                <p className="text-[10px] text-sky-700/70 font-medium">
                  Tip: এলোমেলো মেসেজ Paste করলেই অটোমেটিক শুধু নাম, মোবাইল ও অ্যাড্রেস সাজিয়ে নেবে।
                </p>
              )}
            </div>

            {/* BOX 2: COD AMOUNT (Simple Typeable Input Box) */}
            <div className="p-4 rounded-3xl bg-white/90 backdrop-blur-md border border-emerald-100/90 focus-within:border-emerald-300 focus-within:ring-4 focus-within:ring-emerald-100/60 shadow-[0_8px_28px_-12px_rgba(16,185,129,0.14)] space-y-2 transition-all duration-300">
              <label className="text-xs font-bold text-neutral-800 block">
                Cash On Delivery (COD) Amount
              </label>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-xs">
                  ৳
                </span>
                <input
                  type="text"
                  value={codAmount}
                  onChange={(e) => {
                    const clean = convertBengaliToEnglishDigits(e.target.value);
                    setCodAmount(clean);
                  }}
                  placeholder="e.g. 1500 (Type COD Amount)"
                  className="w-full pl-8 pr-3 py-2.5 text-xs bg-emerald-50/30 border border-emerald-100 rounded-2xl text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:border-emerald-400 font-mono font-bold transition-all"
                />
              </div>

              <p className="text-[10px] text-emerald-700/70 font-medium">
                Enter the total COD cash amount to collect upon delivery.
              </p>
            </div>

            {/* BOX 3: EXCHANGE PARCEL TOGGLE SWITCH (Default OFF) */}
            <div className="p-4 rounded-3xl bg-white/90 backdrop-blur-md border border-rose-100/80 shadow-[0_8px_28px_-12px_rgba(244,63,94,0.10)] space-y-3 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-neutral-800 block">
                    Exchange Parcel
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    Enable if this order is an item exchange
                  </span>
                </div>

                {/* Smooth iOS-style Toggle Switch */}
                <button
                  type="button"
                  onClick={() => setIsExchangeParcel(!isExchangeParcel)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-all duration-300 ease-in-out cursor-pointer ${
                    isExchangeParcel
                      ? 'bg-gradient-to-r from-rose-500 to-pink-600 shadow-sm shadow-rose-500/30'
                      : 'bg-neutral-200'
                  }`}
                  aria-pressed={isExchangeParcel}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-300 ease-in-out ${
                      isExchangeParcel ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Optional Exchange Details if ON */}
              {isExchangeParcel && (
                <div className="place-order-card-enter pt-2 border-t border-rose-100">
                  <input
                    type="text"
                    value={exchangeDetails}
                    onChange={(e) => setExchangeDetails(e.target.value)}
                    placeholder="Exchange reason or original order ID..."
                    className="w-full px-3 py-2 text-xs bg-rose-50/40 border border-rose-200/80 rounded-xl text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:border-rose-400 transition-all"
                  />
                </div>
              )}
            </div>

            {/* BOX 4: GIFT BOX TOGGLE SWITCH (Default OFF) */}
            <div className="p-4 rounded-3xl bg-gradient-to-br from-white/95 to-amber-50/40 backdrop-blur-md border border-amber-200/70 shadow-[0_8px_28px_-12px_rgba(245,158,11,0.12)] space-y-3 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-neutral-800 block">
                      Gift Box
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border border-amber-200/60">
                      🎁 Premium
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-500">
                    Enable to add a custom branded gift box for this order
                  </span>
                </div>

                {/* Smooth iOS-style Toggle Switch */}
                <button
                  type="button"
                  onClick={() => setHasGiftBox(!hasGiftBox)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-all duration-300 ease-in-out cursor-pointer ${
                    hasGiftBox
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-sm shadow-amber-500/30'
                      : 'bg-neutral-200'
                  }`}
                  aria-pressed={hasGiftBox}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-300 ease-in-out ${
                      hasGiftBox ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Optional Gift Box Details if ON */}
              {hasGiftBox && (
                <div className="place-order-card-enter pt-2 border-t border-amber-100 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {['Premium Gift Box', 'Luxury Magnetic Box', 'Special Birthday Box', 'Custom Gift Packaging'].map((boxOption) => (
                      <button
                        key={boxOption}
                        type="button"
                        onClick={() => setGiftBoxType(boxOption)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all cursor-pointer ${
                          giftBoxType === boxOption
                            ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-neutral-950 font-bold shadow-xs'
                            : 'bg-amber-50/70 text-amber-900/70 hover:bg-amber-100'
                        }`}
                      >
                        {boxOption}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={giftBoxType}
                    onChange={(e) => setGiftBoxType(e.target.value)}
                    placeholder="Enter or customize Gift Box type/note..."
                    className="w-full px-3 py-2 text-xs bg-amber-50/30 border border-amber-200/80 rounded-xl text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:border-amber-400 transition-all"
                  />
                </div>
              )}
            </div>

          </div>

            {/* SUBMIT BUTTON */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-full place-order-cta-gradient text-white text-xs font-extrabold shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-violet-500/30 hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Generating Formatted Order...</span>
                ) : (
                  <span>Generate Formatted Order & Copy (ফরম্যাট তৈরি ও কপি করুন)</span>
                )}
              </button>
            </div>

        </form>
      </main>
    </div>
  );
};
