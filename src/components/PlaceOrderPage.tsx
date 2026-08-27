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
  ShoppingBag
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
}

const AVAILABLE_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];

export const PlaceOrderPage: React.FC<PlaceOrderPageProps> = ({
  products,
  siteSettings,
  currency,
  onBackToStore,
  onOrderPlaced,
  initialProductId
}) => {
  // Initialize items: Size is intentionally EMPTY by default
  const [items, setItems] = useState<OrderItemForm[]>(() => {
    let initialProd: JerseyProduct | null = null;
    if (initialProductId) {
      initialProd = products.find(p => p.id === initialProductId) || null;
    }
    return [
      {
        id: `item-${Date.now()}-1`,
        product: initialProd,
        searchQuery: initialProd ? `${initialProd.code ? `[${initialProd.code}] ` : ''}${initialProd.title}` : '',
        selectedSize: '', // Default EMPTY as requested
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
    if (initialProductId && items.length === 1 && !items[0].product) {
      const prod = products.find(p => p.id === initialProductId);
      if (prod) {
        setItems([
          {
            id: `item-${Date.now()}-1`,
            product: prod,
            searchQuery: `${prod.code ? `[${prod.code}] ` : ''}${prod.title}`,
            selectedSize: '', // Default empty
            customNameNumber: ''
          }
        ]);
      }
    }
  }, [initialProductId, products]);

  // Handle Combined Text Parsing in Box 1
  const handleCombinedDetailsChange = (text: string) => {
    setCombinedDetailsText(text);
    const parsed = parseCombinedAddressBox(text);
    
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
    if (!query.trim()) return products.slice(0, 8);
    const q = query.toLowerCase().trim();
    return products.filter(p => 
      (p.code && p.code.toLowerCase().includes(q)) ||
      p.title.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.season?.toLowerCase().includes(q)
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
      const cartItems: CartItem[] = items.map((it, idx) => ({
        itemKey: `order-item-${Date.now()}-${idx}`,
        product: it.product!,
        selectedSize: it.selectedSize,
        customName: it.customNameNumber.trim() || undefined,
        quantity: 1,
        addedAt: Date.now()
      }));

      const parsedCodAmount = parseFloat(codAmount) || 0;

      const newOrder: Order = {
        id: `SPIDEY-${Date.now().toString(36).toUpperCase()}`,
        items: cartItems,
        customerName: name.trim(),
        customerEmail: `${phoneClean}@spideyorder.com`,
        phoneNumber: phoneClean,
        shippingAddress: address.trim(),
        paymentMethod: 'Cash On Delivery (COD)',
        isExchange: isExchangeParcel,
        orderNote: isExchangeParcel && exchangeDetails ? `Exchange: ${exchangeDetails.trim()}` : undefined,
        orderType: 'quick_form',
        subtotal: parsedCodAmount,
        discount: 0,
        shippingFee: 0,
        totalAmount: parsedCodAmount,
        status: 'confirmed',
        createdAt: new Date().toISOString()
      };

      // Send to server
      try {
        await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newOrder)
        });
      } catch (postErr) {
        console.warn('API POST notice:', postErr);
      }

      setConfirmedCodAmount(codAmount.trim());
      setConfirmedOrder(newOrder);
      if (onOrderPlaced) {
        onOrderPlaced(newOrder);
      }
    } catch (err) {
      console.error('Order placement error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate clean, formatted receipt text for clipboard copying matching exact requested pattern
  const generateReceiptText = (order: Order, codValue: string) => {
    const itemsFormatted = order.items.map((it, idx) => {
      const codePart = it.product.code ? `[${it.product.code}] ` : '';
      const customPart = it.customName ? `-  "${it.customName}"` : '';
      return `${idx + 1}. ${codePart}${it.product.title} (Size: ${it.selectedSize}) ${customPart}`.trim();
    }).join('\n');

    const amountDisplay = codValue ? `${codValue}৳` : '0৳';
    const exchangeLine = order.isExchange 
      ? `\nExchange Parcel: YES${order.orderNote ? `\nExchange Note: ${order.orderNote}` : ''}`
      : '';

    return `Name: ${order.customerName}
Mobile: ${order.phoneNumber}
Address: ${order.shippingAddress}

ITEMS:
${itemsFormatted}
Amount: ${amountDisplay}${exchangeLine}`;
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
      <div className="min-h-screen bg-[#f5f5f7] text-neutral-900 flex flex-col font-sans selection:bg-neutral-900 selection:text-white pb-16">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-neutral-200/80 px-4 py-3">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <button
              onClick={onBackToStore}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Store</span>
            </button>

            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-neutral-800 tracking-tight">Order Confirmed</span>
            </div>
          </div>
        </header>

        {/* Main Card Container (Slim & Compact) */}
        <main className="flex-1 max-w-md w-full mx-auto px-4 pt-6 pb-8">
          <div className="bg-white border border-neutral-200/90 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
            
            {/* Header / Success Indicator */}
            <div className="text-center space-y-1.5 pt-1">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/60 mx-auto flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h1 className="text-lg font-bold text-neutral-900 tracking-tight">
                Order Placed Successfully
              </h1>
              <p className="text-xs text-neutral-500 font-mono">
                ID: <span className="font-semibold text-neutral-800">{confirmedOrder.id}</span>
              </p>
            </div>

            {/* Formatted Text Box with Top "Copy This Text" Action */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                  Order Summary
                </span>
                
                {/* Copy Button on Top of the Box */}
                <button
                  onClick={handleCopyText}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shadow-xs ${
                    isCopied 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-neutral-900 hover:bg-black text-white hover:scale-105 active:scale-95'
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
              <div className="relative rounded-2xl bg-neutral-50 border border-neutral-200/80 p-4 font-mono text-xs text-neutral-800 leading-relaxed overflow-x-auto whitespace-pre-wrap select-all">
                {formattedReceipt}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="space-y-2.5 pt-2">
              <button
                onClick={handleCopyText}
                className="w-full py-3 rounded-full bg-neutral-900 hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99]"
              >
                {isCopied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
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
                className="w-full py-3 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold flex items-center justify-center gap-2 transition-all"
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
    <div className="min-h-screen bg-[#f5f5f7] text-neutral-900 flex flex-col font-sans selection:bg-neutral-900 selection:text-white pb-20">
      
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-neutral-200/80 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            onClick={onBackToStore}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold transition-all hover:scale-105"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Store</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-neutral-900 animate-pulse" />
            <h1 className="text-sm font-bold text-neutral-900 tracking-tight">
              Place Order
            </h1>
          </div>

          <div className="w-12 text-right">
            <span className="text-[10px] font-mono text-neutral-400 font-bold uppercase">
              COD
            </span>
          </div>
        </div>
      </header>

      {/* Main Container - Compact, Slim ("চিকন-চাকন") Column */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 pt-5 space-y-4">
        
        <form onSubmit={handleConfirmOrder} className="space-y-4">
          
          {/* General Error Notification */}
          {generalError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2.5 shadow-xs">
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
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Selected Jerseys ({items.length})
              </span>
              <span className="text-[11px] text-neutral-400 font-medium">
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
                    className="p-4 rounded-3xl bg-white border border-neutral-200/90 shadow-sm space-y-3.5 transition-all"
                  >
                    {/* Item Row Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-neutral-800">
                          Jersey #{index + 1}
                        </span>
                        {item.product?.code && (
                          <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-800 font-mono font-bold text-[10px] border border-neutral-200">
                            {item.product.code}
                          </span>
                        )}
                      </div>

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveJersey(index)}
                          className="text-xs text-neutral-400 hover:text-rose-600 flex items-center gap-1 transition-colors p-1"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="text-[11px]">Remove</span>
                        </button>
                      )}
                    </div>

                    {/* Product Search & Thumbnail Row */}
                    <div className="flex items-start gap-3">
                      {/* Thumbnail Box */}
                      <div className="w-16 h-16 rounded-2xl bg-neutral-50 border border-neutral-200/80 p-1.5 shrink-0 overflow-hidden flex items-center justify-center">
                        {item.product ? (
                          <img 
                            src={item.product.images?.[0] || 'https://images.unsplash.com/photo-1577212017184-80cc0da11082?auto=format&fit=crop&w=300&q=80'} 
                            alt={item.product.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="text-neutral-300 flex items-center justify-center">
                            <ShoppingBag className="w-5 h-5" />
                          </div>
                        )}
                      </div>

                      {/* Autocomplete Search Input */}
                      <div className="flex-1 relative min-w-0">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={item.searchQuery}
                            onFocus={() => setActiveDropdownIndex(index)}
                            onChange={(e) => {
                              handleUpdateItem(index, { searchQuery: e.target.value });
                              setActiveDropdownIndex(index);
                            }}
                            placeholder="Search jersey by name or code..."
                            className="w-full pl-8 pr-7 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:border-neutral-400 transition-all font-sans"
                          />
                          {item.searchQuery && (
                            <button
                              type="button"
                              onClick={() => {
                                handleUpdateItem(index, { searchQuery: '', product: null });
                                setActiveDropdownIndex(index);
                              }}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 text-xs"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        {/* Autocomplete Dropdown List */}
                        {isDropdownOpen && (
                          <>
                            <div 
                              className="fixed inset-0 z-20" 
                              onClick={() => setActiveDropdownIndex(null)} 
                            />
                            <div className="absolute left-0 right-0 top-full mt-1.5 z-30 max-h-56 overflow-y-auto rounded-2xl bg-white border border-neutral-200 shadow-lg divide-y divide-neutral-100">
                              {filteredProducts.length > 0 ? (
                                filteredProducts.map((prod) => (
                                  <button
                                    type="button"
                                    key={prod.id}
                                    onClick={() => handleSelectProduct(index, prod)}
                                    className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-neutral-50 text-left transition-colors"
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-neutral-100 p-0.5 border border-neutral-200 shrink-0 overflow-hidden">
                                      <img 
                                        src={prod.images?.[0] || 'https://images.unsplash.com/photo-1577212017184-80cc0da11082?auto=format&fit=crop&w=200&q=80'} 
                                        alt={prod.title}
                                        referrerPolicy="no-referrer"
                                        className="w-full h-full object-contain"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        {prod.code && (
                                          <span className="text-neutral-900 font-mono font-bold text-[10px]">
                                            [{prod.code}]
                                          </span>
                                        )}
                                        <span className="text-xs font-semibold text-neutral-800 truncate">
                                          {prod.title}
                                        </span>
                                      </div>
                                    </div>
                                  </button>
                                ))
                              ) : (
                                <div className="p-3 text-center text-xs text-neutral-400">
                                  No jerseys found
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
                              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                                isSelected
                                  ? 'bg-neutral-900 text-white shadow-xs scale-105'
                                  : hasSizeError
                                  ? 'bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100'
                                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-transparent'
                              }`}
                            >
                              {sz}
                            </button>
                          );
                        })}
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
                        className="w-full px-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:border-neutral-400 font-mono uppercase transition-all"
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
              className="w-full py-2.5 rounded-2xl border border-dashed border-neutral-300 hover:border-neutral-400 bg-white hover:bg-neutral-50 text-neutral-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
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
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 px-1">
              Order Details
            </span>

            {/* BOX 1: SINGLE FULL ADDRESS BOX (Name, Phone, Address in 1 Box) */}
            <div className="p-4 rounded-3xl bg-white border border-neutral-200/90 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-800">
                  Customer & Delivery Details <span className="text-rose-500">*</span>
                </label>
                {phoneNumber && phoneNumber.length === 11 && !phoneError && (
                  <span className="text-[10px] text-emerald-600 font-bold font-mono flex items-center gap-0.5">
                    <Check className="w-3 h-3" />
                    11 Digits Verified
                  </span>
                )}
              </div>

              <textarea
                rows={4}
                required
                value={combinedDetailsText}
                onChange={(e) => handleCombinedDetailsChange(e.target.value)}
                placeholder={`Line 1: Customer Name\nLine 2: Mobile Number (e.g. 01715123766)\nLine 3: Delivery Address (District, Area, Road, House No)`}
                className={`w-full p-3 text-xs bg-neutral-50 border rounded-2xl text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:bg-white transition-all font-sans leading-relaxed ${
                  phoneError ? 'border-rose-300 focus:border-rose-400' : 'border-neutral-200 focus:border-neutral-400'
                }`}
              />

              {phoneError ? (
                <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {phoneError}
                </p>
              ) : (
                <p className="text-[10px] text-neutral-400">
                  Tip: Paste name, phone, and address together. Bengali numbers are automatically converted.
                </p>
              )}
            </div>

            {/* BOX 2: COD AMOUNT (Simple Typeable Input Box) */}
            <div className="p-4 rounded-3xl bg-white border border-neutral-200/90 shadow-sm space-y-2">
              <label className="text-xs font-bold text-neutral-800 block">
                Cash On Delivery (COD) Amount
              </label>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">
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
                  className="w-full pl-8 pr-3 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-2xl text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:border-neutral-400 font-mono font-bold transition-all"
                />
              </div>

              <p className="text-[10px] text-neutral-400">
                Enter the total COD cash amount to collect upon delivery.
              </p>
            </div>

            {/* BOX 3: EXCHANGE PARCEL TOGGLE SWITCH (Default OFF) */}
            <div className="p-4 rounded-3xl bg-white border border-neutral-200/90 shadow-sm space-y-3">
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
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${
                    isExchangeParcel ? 'bg-neutral-900' : 'bg-neutral-200'
                  }`}
                  aria-pressed={isExchangeParcel}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${
                      isExchangeParcel ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Optional Exchange Details if ON */}
              {isExchangeParcel && (
                <div className="pt-2 border-t border-neutral-100">
                  <input
                    type="text"
                    value={exchangeDetails}
                    onChange={(e) => setExchangeDetails(e.target.value)}
                    placeholder="Exchange reason or original order ID..."
                    className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:border-neutral-400 transition-all"
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
              className="w-full py-3.5 rounded-full bg-neutral-900 hover:bg-black text-white text-xs font-bold shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Processing Order...</span>
              ) : (
                <span>Confirm Order</span>
              )}
            </button>
          </div>

        </form>
      </main>
    </div>
  );
};
