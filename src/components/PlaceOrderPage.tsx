import React, { useState, useEffect, useRef } from 'react';
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
  parseCombinedAddressBox,
  shouldAutoCleanAddressInput
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
  const isComposingRef = useRef(false);
  const compositionBaseTextRef = useRef('');
  const pendingMobileCleanTimerRef = useRef<number | null>(null);
  
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

  const clearPendingMobileCleanTimer = () => {
    if (pendingMobileCleanTimerRef.current !== null) {
      window.clearTimeout(pendingMobileCleanTimerRef.current);
      pendingMobileCleanTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearPendingMobileCleanTimer();
  }, []);

  const applyFormattedCombinedText = (rawText: string) => {
    const parsed = parseCombinedAddressBox(rawText);
    const cleanedLines = [parsed.name, parsed.phone, parsed.address].filter(Boolean);
    const cleanedText = cleanedLines.join('\n');
    setCombinedDetailsText(cleanedText);
    syncParsedDetailsState(parsed);
  };

  const handleCombinedDetailsChange = (text: string, inputType?: string, isComposing?: boolean) => {
    clearPendingMobileCleanTimer();

    const baseText = isComposing ? compositionBaseTextRef.current : combinedDetailsText;
    const shouldAutoClean = shouldAutoCleanAddressInput(baseText, text, inputType);

    if (isComposing) {
      setCombinedDetailsText(text);
      syncParsedDetailsState(parseCombinedAddressBox(text));

      // Fallback for Android keyboards (e.g. Gboard/Samsung clipboard bar) that keep IME composition active
      if (shouldAutoClean) {
        pendingMobileCleanTimerRef.current = window.setTimeout(() => {
          pendingMobileCleanTimerRef.current = null;
          isComposingRef.current = false;
          applyFormattedCombinedText(text);
        }, 60);
      }
      return;
    }

    if (shouldAutoClean) {
      applyFormattedCombinedText(text);
    } else {
      setCombinedDetailsText(text);
      syncParsedDetailsState(parseCombinedAddressBox(text));
    }
  };

  const handleCombinedDetailsCompositionStart = () => {
    clearPendingMobileCleanTimer();
    isComposingRef.current = true;
    compositionBaseTextRef.current = combinedDetailsText;
  };

  const handleCombinedDetailsCompositionEnd = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
    clearPendingMobileCleanTimer();
    isComposingRef.current = false;
    const finalText = e.currentTarget.value;
    if (shouldAutoCleanAddressInput(compositionBaseTextRef.current, finalText, 'compositionEnd')) {
      applyFormattedCombinedText(finalText);
    } else {
      setCombinedDetailsText(finalText);
      syncParsedDetailsState(parseCombinedAddressBox(finalText));
    }
  };

  const handleCombinedDetailsPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData?.getData('text');
    if (!pastedText) return;
    e.preventDefault();
    clearPendingMobileCleanTimer();
    isComposingRef.current = false;

    const currentEl = e.currentTarget;
    const start = currentEl.selectionStart ?? 0;
    const end = currentEl.selectionEnd ?? combinedDetailsText.length;

    // If user pasted into an empty box or replaced all/most text, parse the pasted block directly
    const nextRaw =
      combinedDetailsText.trim() && (start > 0 || end < combinedDetailsText.length)
        ? `${combinedDetailsText.slice(0, start)}${pastedText}${combinedDetailsText.slice(end)}`
        : pastedText;

    applyFormattedCombinedText(nextRaw);
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
  // (Full Dark Black & Dark Red Studio Theme)
  // ==========================================
  if (confirmedOrder) {
    const formattedReceipt = generateReceiptText(confirmedOrder, confirmedCodAmount);

    return (
      <div className="min-h-screen place-order-studio-bg text-neutral-100 flex flex-col font-sans selection:bg-red-600 selection:text-white pb-16 relative overflow-x-hidden">
        {/* Soft Ambient Crimson Glow Orbs */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
          <div className="place-order-orb-1 absolute -top-24 -left-24 w-80 h-80 rounded-full bg-red-700/20 blur-3xl" />
          <div className="place-order-orb-2 absolute top-1/3 -right-24 w-80 h-80 rounded-full bg-rose-700/15 blur-3xl" />
        </div>

        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-neutral-950/90 backdrop-blur-xl border-b border-red-900/40 px-4 py-3 shadow-[0_6px_24px_-10px_rgba(0,0,0,0.8)]">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <button
              onClick={onBackToStore}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900 hover:bg-red-950 text-white border border-red-800/50 text-xs font-semibold transition-all duration-200 hover:-translate-x-0.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-red-400" />
              <span>Back to Store</span>
            </button>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-emerald-300 tracking-tight">Order Confirmed</span>
            </div>
          </div>
        </header>

        {/* Main Card Container (Slim & Compact Dark Card) */}
        <main className="relative z-10 flex-1 max-w-md w-full mx-auto px-4 pt-6 pb-8">
          <div className="place-order-card-enter bg-gradient-to-b from-[#16161b] to-[#101014] text-neutral-100 border border-red-900/40 rounded-3xl p-5 sm:p-6 shadow-[0_24px_54px_-16px_rgba(0,0,0,0.85)] space-y-5">
            
            {/* Header / Success Indicator */}
            <div className="text-center space-y-1.5 pt-1">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-900 via-red-700 to-red-600 text-white mx-auto flex items-center justify-center shadow-lg shadow-red-900/50 border border-red-500/30">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-lg font-extrabold text-white tracking-tight">
                অর্ডার ফরম্যাট তৈরি সম্পন্ন (Ready to Copy)
              </h1>
              <p className="text-xs text-neutral-400">
                এই ফরম্যাটটি ক্লিপবোর্ডে কপি করা হয়েছে। এটি সরাসরি মেইন সিস্টেমে কোনো অর্ডার জমা করে না।
              </p>
            </div>

            {/* Formatted Text Box with Top "Copy This Text" Action */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  Formatted Order Text
                </span>
                
                {/* Copy Button on Top of the Box */}
                <button
                  onClick={handleCopyText}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 shadow-xs cursor-pointer ${
                    isCopied 
                      ? 'bg-emerald-600 text-white shadow-emerald-600/25' 
                      : 'place-order-cta-satin bg-red-700 text-white border border-red-500/30 hover:scale-105 active:scale-95'
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
              <div className="relative rounded-2xl bg-[#0a0a0d] border border-neutral-800 p-4 font-mono text-xs text-neutral-100 leading-relaxed overflow-x-auto whitespace-pre-wrap select-all">
                {formattedReceipt}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="space-y-2.5 pt-2">
              <button
                onClick={handleCopyText}
                className={`w-full py-3 rounded-full text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all duration-200 active:scale-[0.99] cursor-pointer ${
                  isCopied
                    ? 'bg-emerald-600 shadow-emerald-600/25'
                    : 'place-order-cta-satin bg-red-700 border border-red-500/30 shadow-red-950/60 hover:shadow-lg hover:-translate-y-0.5'
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
                className="w-full py-3 rounded-full bg-neutral-800/90 hover:bg-neutral-800 text-neutral-100 border border-neutral-700 text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-red-400" />
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
  // (Full Dark Black & Dark Red Studio Theme)
  // ==========================================
  return (
    <div className="min-h-screen place-order-studio-bg text-neutral-100 flex flex-col font-sans selection:bg-red-600 selection:text-white pb-20 relative overflow-x-hidden">
      {/* Subtle Ambient Breathing Crimson Glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="place-order-orb-1 -top-20 -left-20 absolute w-80 h-80 rounded-full bg-red-700/20 blur-3xl" />
        <div className="place-order-orb-2 top-1/3 -right-24 absolute w-80 h-80 rounded-full bg-rose-700/15 blur-3xl" />
        <div className="place-order-orb-1 bottom-0 left-1/4 absolute w-72 h-72 rounded-full bg-red-900/20 blur-3xl" />
      </div>

      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-neutral-950/90 backdrop-blur-xl border-b border-red-900/40 px-4 py-3 shadow-[0_6px_24px_-10px_rgba(0,0,0,0.8)]">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            onClick={onBackToStore}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900 hover:bg-red-950 text-white border border-red-800/50 text-xs font-semibold transition-all duration-200 hover:-translate-x-0.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-red-400" />
            <span>Store</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-xs shadow-red-500/70" />
            <h1 className="text-sm font-extrabold text-white tracking-tight">
              Place Order
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {!isStandalone && onPromptInstall && (
              <button
                type="button"
                onClick={onPromptInstall}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-950/80 hover:bg-red-900 text-red-100 border border-red-700/60 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                title="Install Place Order Shortcut on Mobile or PC"
              >
                <Download className="w-3 h-3 text-red-400" />
                <span className="hidden sm:inline">Install App</span>
                <span className="sm:hidden">Install</span>
              </button>
            )}
            <span className="text-[10px] font-mono text-red-200 font-bold uppercase px-2.5 py-0.5 rounded-full bg-red-950/90 border border-red-700/60">
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
            <div className="place-order-card-enter p-3.5 rounded-2xl bg-red-950/95 border border-red-500/60 text-red-100 text-xs font-medium flex items-center gap-2.5 shadow-lg">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{generalError}</span>
            </div>
          )}

          {/* =========================================
              SECTION 1: ORDERED JERSEYS
              (Elevated stacking context when search dropdown is open)
              ========================================= */}
          <div className={`space-y-3 relative ${activeDropdownIndex !== null ? 'z-40' : 'z-20'}`}>
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-100 flex items-center gap-1.5">
                <span className="w-1.5 h-3.5 rounded-full bg-gradient-to-b from-red-500 to-red-700 inline-block" />
                Selected Jerseys ({items.length})
              </span>
              <span className="text-[11px] text-red-400 font-semibold">
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
                    className={`place-order-card-enter relative ${
                      isDropdownOpen ? 'z-50' : 'z-10'
                    } p-4 rounded-3xl bg-gradient-to-b from-[#16161b] to-[#111115] text-neutral-100 border border-red-900/35 hover:border-red-700/50 focus-within:border-red-500/70 focus-within:ring-4 focus-within:ring-red-600/15 shadow-[0_16px_38px_-14px_rgba(0,0,0,0.85)] space-y-3.5 transition-all duration-300`}
                  >
                    {/* Item Row Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-red-900 via-red-700 to-red-600 text-white text-[11px] font-bold shadow-xs shadow-red-950/60">
                          Jersey #{index + 1}
                        </span>
                        {item.product?.code && (
                          <span className="px-2 py-0.5 rounded-md bg-neutral-800/90 text-red-200 font-mono font-bold text-[10px] border border-red-900/40">
                            {item.product.code}
                          </span>
                        )}
                      </div>

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveJersey(index)}
                          className="text-xs text-neutral-400 hover:text-red-400 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-red-950/50 cursor-pointer"
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
                      <div className="w-16 h-16 rounded-2xl bg-[#0a0a0d] border border-neutral-800 p-1.5 shrink-0 overflow-hidden flex items-center justify-center transition-transform duration-300 hover:scale-105">
                        {item.product?.images && item.product.images[0] ? (
                          <img 
                            src={item.product.images[0]} 
                            alt={item.product.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="text-neutral-600 flex items-center justify-center">
                            <ShoppingBag className="w-5 h-5" />
                          </div>
                        )}
                      </div>

                      {/* Autocomplete Search Input */}
                      <div className="flex-1 relative min-w-0">
                        <div className="relative">
                          <Search className="w-4 h-4 text-red-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={item.searchQuery}
                            onFocus={() => setActiveDropdownIndex(index)}
                            onChange={(e) => {
                              handleUpdateItem(index, { searchQuery: e.target.value });
                              setActiveDropdownIndex(index);
                            }}
                            placeholder="Search jersey by name or code..."
                            className="w-full pl-9 pr-8 py-2.5 text-xs sm:text-sm bg-[#0a0a0d] border border-neutral-800 rounded-xl text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:bg-[#0e0e12] focus:border-red-500/80 transition-all font-sans"
                          />
                          {item.searchQuery && (
                            <button
                              type="button"
                              onClick={() => {
                                handleUpdateItem(index, { searchQuery: '', product: null });
                                setActiveDropdownIndex(index);
                              }}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-200 p-1 text-xs cursor-pointer"
                              title="Clear search"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        {/* Autocomplete Dropdown List (Floats cleanly above all cards & controls) */}
                        {isDropdownOpen && (
                          <>
                            <div 
                              className="fixed inset-0 z-30" 
                              onClick={() => setActiveDropdownIndex(null)} 
                            />
                            <div 
                              className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-80 sm:max-h-96 overflow-y-auto overscroll-contain rounded-2xl bg-[#141419] border border-red-800/50 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.9)] divide-y divide-neutral-800/80"
                              style={{ scrollbarWidth: 'thin', scrollbarColor: '#dc2626 #141419' }}
                            >
                              {filteredProducts.length > 0 ? (
                                filteredProducts.map((prod) => (
                                  <button
                                    type="button"
                                    key={prod.id}
                                    onClick={() => handleSelectProduct(index, prod)}
                                    className="w-full p-3 sm:p-3.5 flex items-center gap-3 sm:gap-3.5 hover:bg-red-950/50 active:bg-red-900/50 text-left transition-all duration-150 group cursor-pointer focus:outline-none focus:bg-red-950/50"
                                  >
                                    {/* Left: Enlarged Product Thumbnail Image */}
                                    <div className="w-14 h-14 sm:w-15 sm:h-15 rounded-xl bg-[#0a0a0d] p-1 border border-neutral-800 shadow-xs shrink-0 overflow-hidden flex items-center justify-center group-hover:border-red-600/60 transition-colors">
                                      {prod.images && prod.images[0] ? (
                                        <img 
                                          src={prod.images[0]} 
                                          alt={prod.title}
                                          referrerPolicy="no-referrer"
                                          className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
                                          loading="lazy"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-500 font-bold">
                                          ITEM
                                        </div>
                                      )}
                                    </div>

                                    {/* Right: Stacked Layout (Top: Code, Bottom: Title) */}
                                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                                      {/* Top Line: Product Code */}
                                      {prod.code && (
                                        <div>
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-red-950/90 text-red-200 border border-red-800/60 font-mono font-bold text-[11px] tracking-wide">
                                            [{prod.code}]
                                          </span>
                                        </div>
                                      )}

                                      {/* Bottom Line: Main Product Title in Bold */}
                                      <div className="text-xs sm:text-[13px] font-bold text-neutral-100 leading-snug break-words group-hover:text-white">
                                        {prod.title}
                                      </div>
                                    </div>
                                  </button>
                                ))
                              ) : (
                                <div className="p-6 text-center space-y-1.5">
                                  <div className="text-neutral-200 font-bold text-xs">
                                    No jerseys found
                                  </div>
                                  <p className="text-[11px] text-neutral-500">
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
                        <label className="text-[11px] font-bold text-neutral-300">
                          Size <span className="text-red-500">*</span>
                        </label>
                        {hasSizeError && (
                          <span className="text-[10px] text-red-400 font-bold">
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
                                    ? 'bg-gradient-to-r from-red-800 to-red-600 text-white shadow-md shadow-red-700/35 border border-red-500/40 scale-105'
                                    : hasSizeError
                                    ? 'bg-red-950/80 text-red-300 border border-red-500/70 hover:bg-red-900/70'
                                    : 'bg-neutral-800/90 text-neutral-300 hover:bg-red-950/70 hover:text-red-200 border border-neutral-700/70'
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
                          className="px-2.5 py-1 rounded-xl bg-neutral-800/95 hover:bg-red-800 text-neutral-100 border border-neutral-700 hover:border-red-500/60 text-[11px] font-bold flex items-center gap-1 transition-all duration-200 active:scale-95 shrink-0 cursor-pointer shadow-xs"
                          title="Duplicate selected jersey, size, and custom name/number"
                        >
                          <Copy className="w-3 h-3 text-red-400" />
                          <span>Duplicate</span>
                        </button>
                      </div>
                    </div>

                    {/* Custom Name & Number Input (Optional) */}
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                        Custom Name & Number (Optional)
                      </label>
                      <input
                        type="text"
                        value={item.customNameNumber}
                        onChange={(e) => handleUpdateItem(index, { customNameNumber: e.target.value.toUpperCase() })}
                        placeholder="e.g. RONALDO 7 or MESSI"
                        className="w-full px-3 py-1.5 text-xs bg-[#0a0a0d] border border-neutral-800 rounded-xl text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:bg-[#0e0e12] focus:border-red-500/80 font-mono uppercase transition-all"
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
              className="relative z-0 w-full py-2.5 rounded-2xl border border-dashed border-red-700/60 hover:border-red-500 bg-[#121216]/90 hover:bg-red-950/60 text-neutral-100 font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-200 hover:-translate-y-0.5 shadow-md cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-red-400" />
              <span>Add More Jersey</span>
            </button>
          </div>

          {/* =========================================
              SECTION 2: CUSTOMER & ORDER DETAILS
              (Lower z-index than open Jersey search dropdown)
              ========================================= */}
          <div className="space-y-3 pt-2 relative z-10">
            <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-100 px-1 flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 rounded-full bg-gradient-to-b from-red-500 to-red-700 inline-block" />
              Order Details
            </span>

            {/* BOX 1: SINGLE FULL ADDRESS BOX (Name, Phone, Address in 1 Box) */}
            <div className="p-4 rounded-3xl bg-gradient-to-b from-[#16161b] to-[#111115] text-neutral-100 border border-red-900/35 focus-within:border-red-500/70 focus-within:ring-4 focus-within:ring-red-600/15 shadow-[0_16px_38px_-14px_rgba(0,0,0,0.85)] space-y-2 transition-all duration-300">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-100">
                  Customer & Delivery Details <span className="text-red-500">*</span>
                </label>
                {phoneNumber && phoneNumber.length === 11 && !phoneError && (
                  <span className="place-order-card-enter text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 font-bold font-mono flex items-center gap-1">
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
                onCompositionStart={handleCombinedDetailsCompositionStart}
                onCompositionEnd={handleCombinedDetailsCompositionEnd}
                onChange={(e) => {
                  const nativeEvt = e.nativeEvent as InputEvent | undefined;
                  const inputType = nativeEvt?.inputType;
                  if (nativeEvt && typeof nativeEvt.isComposing === 'boolean') {
                    isComposingRef.current = nativeEvt.isComposing;
                  }
                  const isComposing = nativeEvt?.isComposing ?? isComposingRef.current;
                  handleCombinedDetailsChange(e.target.value, inputType, isComposing);
                }}
                placeholder={`Line 1: Customer Name\nLine 2: Mobile Number (e.g. 01715123766)\nLine 3: Delivery Address (District, Area, Road, House No)`}
                className={`w-full p-3 text-xs bg-[#0a0a0d] border rounded-2xl text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:bg-[#0e0e12] transition-all font-sans leading-relaxed ${
                  phoneError ? 'border-red-500/80 focus:border-red-400' : 'border-neutral-800 focus:border-red-500/80'
                }`}
              />

              {phoneError ? (
                <p className="text-[11px] text-red-400 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {phoneError}
                </p>
              ) : (
                <p className="text-[10px] text-neutral-400 font-medium">
                  Tip: এলোমেলো মেসেজ Paste করলেই অটোমেটিক শুধু নাম, মোবাইল ও অ্যাড্রেস সাজিয়ে নেবে।
                </p>
              )}
            </div>

            {/* BOX 2: COD AMOUNT (Simple Typeable Input Box) */}
            <div className="p-4 rounded-3xl bg-gradient-to-b from-[#16161b] to-[#111115] text-neutral-100 border border-red-900/35 focus-within:border-red-500/70 focus-within:ring-4 focus-within:ring-red-600/15 shadow-[0_16px_38px_-14px_rgba(0,0,0,0.85)] space-y-2 transition-all duration-300">
              <label className="text-xs font-bold text-neutral-100 block">
                Cash On Delivery (COD) Amount
              </label>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-red-400 font-bold text-xs">
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
                  className="w-full pl-8 pr-3 py-2.5 text-xs bg-[#0a0a0d] border border-neutral-800 rounded-2xl text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:bg-[#0e0e12] focus:border-red-500/80 font-mono font-bold transition-all"
                />
              </div>

              <p className="text-[10px] text-neutral-400 font-medium">
                Enter the total COD cash amount to collect upon delivery.
              </p>
            </div>

            {/* BOX 3: EXCHANGE PARCEL TOGGLE SWITCH (Default OFF) */}
            <div className="p-4 rounded-3xl bg-gradient-to-b from-[#16161b] to-[#111115] text-neutral-100 border border-red-900/35 shadow-[0_16px_38px_-14px_rgba(0,0,0,0.85)] space-y-3 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-neutral-100 block">
                    Exchange Parcel
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    Enable if this order is an item exchange
                  </span>
                </div>

                {/* Smooth iOS-style Toggle Switch */}
                <button
                  type="button"
                  onClick={() => setIsExchangeParcel(!isExchangeParcel)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-all duration-300 ease-in-out cursor-pointer ${
                    isExchangeParcel
                      ? 'bg-gradient-to-r from-red-700 to-red-500 shadow-sm shadow-red-600/40'
                      : 'bg-neutral-800 border border-neutral-700'
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
                <div className="place-order-card-enter pt-2 border-t border-neutral-800">
                  <input
                    type="text"
                    value={exchangeDetails}
                    onChange={(e) => setExchangeDetails(e.target.value)}
                    placeholder="Exchange reason or original order ID..."
                    className="w-full px-3 py-2 text-xs bg-[#0a0a0d] border border-neutral-800 rounded-xl text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:bg-[#0e0e12] focus:border-red-500/80 transition-all"
                  />
                </div>
              )}
            </div>

            {/* BOX 4: GIFT BOX TOGGLE SWITCH (Default OFF) */}
            <div className="p-4 rounded-3xl bg-gradient-to-b from-[#16161b] to-[#111115] text-neutral-100 border border-red-900/35 shadow-[0_16px_38px_-14px_rgba(0,0,0,0.85)] space-y-3 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-neutral-100 block">
                      Gift Box
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-950/90 text-red-300 border border-red-800/60">
                      🎁 Premium
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-400">
                    Enable to add a custom branded gift box for this order
                  </span>
                </div>

                {/* Smooth iOS-style Toggle Switch */}
                <button
                  type="button"
                  onClick={() => setHasGiftBox(!hasGiftBox)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-all duration-300 ease-in-out cursor-pointer ${
                    hasGiftBox
                      ? 'bg-gradient-to-r from-red-700 to-red-500 shadow-sm shadow-red-600/40'
                      : 'bg-neutral-800 border border-neutral-700'
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
                <div className="place-order-card-enter pt-2 border-t border-neutral-800 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {['Premium Gift Box', 'Luxury Magnetic Box', 'Special Birthday Box', 'Custom Gift Packaging'].map((boxOption) => (
                      <button
                        key={boxOption}
                        type="button"
                        onClick={() => setGiftBoxType(boxOption)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all cursor-pointer ${
                          giftBoxType === boxOption
                            ? 'bg-red-700 text-white font-bold shadow-xs border border-red-500/50'
                            : 'bg-neutral-800 text-neutral-300 hover:bg-red-950/60 hover:text-red-200 border border-neutral-700/60'
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
                    className="w-full px-3 py-2 text-xs bg-[#0a0a0d] border border-neutral-800 rounded-xl text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:bg-[#0e0e12] focus:border-red-500/80 transition-all"
                  />
                </div>
              )}
            </div>

          </div>

            {/* SUBMIT BUTTON */}
            <div className="pt-3 relative z-10">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-full place-order-cta-satin bg-red-700 text-white text-xs font-extrabold shadow-lg shadow-red-950/80 hover:shadow-xl hover:shadow-red-700/40 hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border border-red-500/40"
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
