import React, { useState } from 'react';
import { 
  X, Trash2, ShoppingBag, ArrowRight, ShieldCheck, 
  Sparkles, Tag, Check, Truck, CreditCard, ChevronRight, 
  CheckCircle2, Plus, Minus, ArrowLeft, MapPin, Phone, 
  User, AlertCircle, Edit3, ChevronDown, ChevronUp
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CartItem, Order } from '../types';
import { CurrencyCode, formatPrice } from '../utils/currency';
import { SiteSettings } from '../types/settings';
import { cleanAndFormatPhoneNumber } from '../utils/phoneUtils';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (itemKey: string, qty: number) => void;
  onUpdateItem?: (itemKey: string, updates: Partial<CartItem>) => void;
  onRemoveItem: (itemKey: string) => void;
  onClearCart: () => void;
  currency: CurrencyCode;
  siteSettings: SiteSettings;
  appliedCouponFromPopup?: string;
}

const AVAILABLE_SIZES = ['M', 'L', 'XL', 'XXL', 'XXXL'];

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items = [],
  onUpdateQuantity,
  onUpdateItem,
  onRemoveItem,
  onClearCart,
  currency,
  siteSettings,
  appliedCouponFromPopup
}) => {
  // View state: 'cart' or 'checkout'
  const [viewMode, setViewMode] = useState<'cart' | 'checkout'>('cart');

  // Customer checkout form inputs
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  
  // 3-Tier Delivery Location: 'inside_dhaka' | 'sub_dhaka' | 'outside_dhaka'
  const [deliveryZone, setDeliveryZone] = useState<'inside_dhaka' | 'sub_dhaka' | 'outside_dhaka'>('inside_dhaka');

  // Active inline edit itemKey in Checkout list
  const [editingCheckoutItemKey, setEditingCheckoutItemKey] = useState<string | null>(null);

  // Coupon state
  const [couponCode, setCouponCode] = useState(appliedCouponFromPopup || siteSettings?.couponPopupCode || '');
  const [appliedDiscount, setAppliedDiscount] = useState<number>(() => {
    if (appliedCouponFromPopup) {
      return siteSettings?.couponPopupDiscountAmount || 50;
    }
    return 0;
  });
  const [couponAppliedCode, setCouponAppliedCode] = useState<string>(appliedCouponFromPopup || '');
  const [couponMessage, setCouponMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(
    appliedCouponFromPopup ? { text: `কুপন কোড ${appliedCouponFromPopup} প্রযোজ্য হয়েছে!`, type: 'success' } : null
  );

  // Form error & submit state
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  if (!isOpen) return null;

  const safeItems = Array.isArray(items) ? items : [];

  // Delivery Charges from Admin site settings or fallbacks
  const feeInside = typeof siteSettings.deliveryChargeInsideDhaka === 'number' ? siteSettings.deliveryChargeInsideDhaka : 70;
  const feeSub = typeof siteSettings.deliveryChargeSubDhaka === 'number' ? siteSettings.deliveryChargeSubDhaka : 100;
  const feeOutside = typeof siteSettings.deliveryChargeOutsideDhaka === 'number' ? siteSettings.deliveryChargeOutsideDhaka : 130;

  const currentDeliveryFee = deliveryZone === 'inside_dhaka' 
    ? feeInside 
    : deliveryZone === 'sub_dhaka' 
    ? feeSub 
    : feeOutside;

  // Subtotal & Calculations
  const subtotal = safeItems.reduce((sum, item) => {
    const itemPrice = item.product?.price || 0;
    const customFee = item.customizationFee || 0;
    return sum + (itemPrice + customFee) * (item.quantity || 1);
  }, 0);

  const discountAmount = Math.min(subtotal, appliedDiscount);
  const totalAmount = Math.max(0, subtotal - discountAmount + currentDeliveryFee);

  // Apply Coupon
  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const code = couponCode.trim().toUpperCase();
    if (!code) return;

    const popupCode = (siteSettings.couponPopupCode || 'SPIDEY50').toUpperCase();

    if (code === popupCode || code === 'SPIDEY50') {
      const discountVal = siteSettings.couponPopupDiscountAmount || 50;
      setAppliedDiscount(discountVal);
      setCouponAppliedCode(code);
      setCouponMessage({ text: `অভিনন্দন! ৳${discountVal} ডিসকাউন্ট সফলভাবে যুক্ত হয়েছে।`, type: 'success' });
    } else if (code === 'SPIDEY10' || code === 'CYBER10') {
      const discountVal = Math.round((subtotal * 10) / 100);
      setAppliedDiscount(discountVal);
      setCouponAppliedCode(code);
      setCouponMessage({ text: `অভিনন্দন! ১০% (৳${discountVal}) ডিসকাউন্ট যুক্ত হয়েছে।`, type: 'success' });
    } else if (code === 'FREESHIP') {
      setAppliedDiscount(currentDeliveryFee);
      setCouponAppliedCode(code);
      setCouponMessage({ text: 'ফ্রি ডেলিভারি ডিসকাউন্ট যুক্ত হয়েছে!', type: 'success' });
    } else {
      setCouponMessage({ text: 'ভুল কুপন কোড। অনুগ্রহ করে সঠিক কোড দিন।', type: 'error' });
    }
  };

  // Place Order Handler
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (safeItems.length === 0) {
      setFormError('আপনার কার্ট খালি। অনুগ্রহ করে পণ্য যোগ করুন।');
      return;
    }

    if (!customerName.trim()) {
      setFormError('অনুগ্রহ করে কাস্টমারের নাম লিখুন।');
      return;
    }

    const cleanPhone = cleanAndFormatPhoneNumber(phoneNumber);
    if (!cleanPhone || cleanPhone.length !== 11) {
      setFormError(`মোবাইল নাম্বার অবশ্যই ১১ ডিজিট হতে হবে (বর্তমানে ${cleanPhone ? cleanPhone.length : 0} ডিজিট)।`);
      return;
    }

    if (!shippingAddress.trim()) {
      setFormError('অনুগ্রহ করে সম্পূর্ণ ডেলিভারি ঠিকানা লিখুন।');
      return;
    }

    setIsSubmittingOrder(true);

    try {
      const orderPayload: Partial<Order> = {
        items: safeItems,
        customerName: customerName.trim(),
        customerEmail: `${cleanPhone}@spideyorder.com`,
        phoneNumber: cleanPhone,
        shippingAddress: shippingAddress.trim(),
        paymentMethod: 'Cash On Delivery (COD)',
        deliveryZone,
        couponCode: couponAppliedCode || undefined,
        subtotal,
        discount: discountAmount,
        shippingFee: currentDeliveryFee,
        totalAmount,
        codAmount: totalAmount,
        orderType: 'standard',
        status: 'confirmed'
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      const data = await res.json();
      if (data.success && data.order) {
        setCompletedOrder(data.order);
        onClearCart();

        // Celebration confetti
        try {
          confetti({
            particleCount: 120,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch {}
      } else {
        setFormError(data.message || 'অর্ডার সাবমিট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
      }
    } catch (err: any) {
      setFormError(err.message || 'নেটওয়ার্ক এরর। দয়া করে আবার চেষ্টা করুন।');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Helper to handle inline updates
  const handleItemPropertyChange = (itemKey: string, updates: Partial<CartItem>) => {
    if (onUpdateItem) {
      onUpdateItem(itemKey, updates);
    }
  };

  return (
    <div
      id="cart-drawer-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150"
    >
      <div
        id="cart-drawer-content"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md md:max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 border-l border-neutral-200"
      >
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-neutral-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2">
            {viewMode === 'checkout' && !completedOrder ? (
              <button
                type="button"
                onClick={() => setViewMode('cart')}
                className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-600 transition-colors mr-1 cursor-pointer"
                title="কার্টে ফিরে যান"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <ShoppingBag className="w-5 h-5 text-neutral-900" />
            )}
            <h2 className="text-base font-extrabold text-neutral-900 tracking-tight">
              {completedOrder 
                ? 'অর্ডার কনফার্মেশন' 
                : viewMode === 'checkout' 
                ? 'চেকআউট ও ডেলিভারি' 
                : `আপনার কার্ট (${safeItems.reduce((acc, i) => acc + (i.quantity || 1), 0)})`}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ========================================================
            VIEW 3: COMPLETED ORDER RECEIPT / CONFIRMATION
           ======================================================== */}
        {completedOrder ? (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-center my-auto">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 mx-auto flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-neutral-900 tracking-tight">
                অর্ডার সফলভাবে প্লেস হয়েছে!
              </h3>
              <p className="text-xs text-neutral-500">
                ধন্যবাদ! খুব শীঘ্রই আমাদের টিম আপনার সাথে ফোনে যোগাযোগ করবে।
              </p>
              <div className="pt-2">
                <span className="px-3 py-1 rounded-full bg-neutral-100 text-neutral-800 text-xs font-mono font-bold">
                  Order ID: {completedOrder.id}
                </span>
              </div>
            </div>

            {/* Clean Summary Card */}
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 text-left text-xs space-y-2">
              <div className="flex justify-between text-neutral-600">
                <span>কাস্টমার:</span>
                <span className="font-bold text-neutral-900">{completedOrder.customerName}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>মোবাইল:</span>
                <span className="font-bold text-neutral-900">{completedOrder.phoneNumber}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>ঠিকানা:</span>
                <span className="font-bold text-neutral-900 text-right max-w-[200px] truncate">{completedOrder.shippingAddress}</span>
              </div>
              <div className="border-t border-neutral-200 pt-2 flex justify-between font-extrabold text-neutral-900 text-sm">
                <span>মোট COD টাকা:</span>
                <span className="text-emerald-600">৳{completedOrder.totalAmount}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setCompletedOrder(null);
                setViewMode('cart');
                onClose();
              }}
              className="w-full py-3.5 rounded-2xl bg-neutral-900 hover:bg-black text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
            >
              আরো কেনাকাটা করুন
            </button>
          </div>
        ) : viewMode === 'checkout' ? (

          /* ========================================================
              VIEW 2: MINIMALISTIC CHECKOUT PAGE (WITH INLINE EDITABILITY)
             ======================================================== */
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            
            {formError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            {/* 1. ORDER SUMMARY LIST (MINIMALISTIC & EDITABLE) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-500 block">
                  অর্ডারকৃত পণ্য তালিকা ({safeItems.length} টি)
                </span>
                <button
                  type="button"
                  onClick={() => setViewMode('cart')}
                  className="text-[11px] font-bold text-neutral-600 hover:text-black underline transition-colors"
                >
                  কার্ট এডিট করুন
                </button>
              </div>

              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {safeItems.map((item) => {
                  const isEditingThis = editingCheckoutItemKey === item.itemKey;
                  const itemUnitPrice = (item.product?.price || 0) + (item.customizationFee || 0);

                  return (
                    <div
                      key={item.itemKey}
                      className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200 text-xs space-y-2"
                    >
                      <div className="flex items-start gap-2.5">
                        <img
                          src={item.product?.images?.[0] || 'https://images.unsplash.com/photo-1577212017184-80cc0da11082?auto=format&fit=crop&w=150&q=80'}
                          alt={item.product?.title}
                          referrerPolicy="no-referrer"
                          className="w-11 h-11 rounded-xl object-contain bg-white border border-neutral-200 shrink-0 p-0.5"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <h4 className="font-extrabold text-neutral-900 truncate">
                              {item.product?.title}
                            </h4>
                            <span className="font-extrabold text-neutral-900 shrink-0">
                              ৳{itemUnitPrice * (item.quantity || 1)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-0.5">
                            <span>সাইজ: <strong className="text-neutral-900 font-mono">[{item.selectedSize}]</strong></span>
                            <span>•</span>
                            <span>পরিমাণ: <strong>{item.quantity}</strong></span>
                          </div>

                          {(item.customName || item.customNumber) && (
                            <div className="mt-1 p-1 rounded-md bg-neutral-900 text-white text-[10px] font-mono inline-flex items-center gap-1">
                              <Tag className="w-2.5 h-2.5 text-amber-400" />
                              <span>{item.customName ? `নাম: ${item.customName}` : ''} {item.customNumber ? `(#${item.customNumber})` : ''}</span>
                            </div>
                          )}
                        </div>

                        {/* Toggle Inline Edit for this Item in Checkout */}
                        <button
                          type="button"
                          onClick={() => setEditingCheckoutItemKey(isEditingThis ? null : item.itemKey)}
                          className="p-1.5 rounded-lg bg-white hover:bg-neutral-200 text-neutral-700 border border-neutral-200 transition-colors shrink-0 cursor-pointer"
                          title="সাইজ বা নাম পরিবর্তন করুন"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Inline Edit Panel right inside Checkout View */}
                      {isEditingThis && (
                        <div className="pt-2 border-t border-neutral-200/80 space-y-2 bg-white p-2.5 rounded-xl border animate-in fade-in duration-150">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-neutral-500 uppercase">
                              সাইজ পরিবর্তন:
                            </span>
                            <div className="flex items-center gap-1">
                              {AVAILABLE_SIZES.map((sz) => (
                                <button
                                  key={sz}
                                  type="button"
                                  onClick={() => handleItemPropertyChange(item.itemKey, { selectedSize: sz })}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-colors ${
                                    item.selectedSize === sz
                                      ? 'bg-neutral-900 text-white'
                                      : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                                  }`}
                                >
                                  {sz}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Quantity +/- */}
                          <div className="flex items-center justify-between pt-1 border-t border-neutral-100">
                            <span className="text-[10px] font-bold text-neutral-500 uppercase">
                              পরিমাণ (Qty):
                            </span>
                            <div className="flex items-center border border-neutral-300 rounded-lg bg-neutral-50 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => onUpdateQuantity(item.itemKey, Math.max(1, (item.quantity || 1) - 1))}
                                className="px-2 py-0.5 hover:bg-neutral-200 text-neutral-700"
                              >
                                -
                              </button>
                              <span className="px-2 font-mono font-bold text-xs">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => onUpdateQuantity(item.itemKey, (item.quantity || 1) + 1)}
                                className="px-2 py-0.5 hover:bg-neutral-200 text-neutral-700"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Name & Number editing inside checkout */}
                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-neutral-100">
                            <div>
                              <span className="text-[10px] text-neutral-500 font-semibold block mb-0.5">নাম (Name):</span>
                              <input
                                type="text"
                                value={item.customName || ''}
                                onChange={(e) => handleItemPropertyChange(item.itemKey, { 
                                  customName: e.target.value.toUpperCase(),
                                  hasCustomization: Boolean(e.target.value.trim() || item.customNumber)
                                })}
                                placeholder="e.g. YASIN"
                                className="w-full px-2 py-1 text-[11px] bg-neutral-50 border border-neutral-200 rounded text-neutral-900 font-mono font-bold"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-neutral-500 font-semibold block mb-0.5">নাম্বার (Number):</span>
                              <input
                                type="text"
                                maxLength={3}
                                value={item.customNumber || ''}
                                onChange={(e) => handleItemPropertyChange(item.itemKey, { 
                                  customNumber: e.target.value.replace(/[^0-9]/g, ''),
                                  hasCustomization: Boolean(item.customName || e.target.value.trim())
                                })}
                                placeholder="e.g. 7"
                                className="w-full px-2 py-1 text-[11px] bg-neutral-50 border border-neutral-200 rounded text-neutral-900 font-mono font-bold"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingCheckoutItemKey(null)}
                              className="px-2.5 py-0.5 rounded bg-neutral-900 text-white text-[10px] font-bold"
                            >
                              সম্পন্ন (Done)
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. CUSTOMER INFO INPUTS */}
            <div className="space-y-2.5 pt-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-500 block">
                কাস্টমার তথ্য ও ডেলিভারি ঠিকানা
              </span>

              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-1">
                  আপনার নাম (Full Name) *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. মোঃ সাকিব হাসান"
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:bg-white focus:border-neutral-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-1">
                  মোবাইল নাম্বার (Mobile Number) *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="01XXXXXXXXX (১১ ডিজিট)"
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:bg-white focus:border-neutral-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-1">
                  সম্পূর্ণ ডেলিভারি ঠিকানা (Delivery Address) *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  <textarea
                    rows={2}
                    required
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="রোড নাম্বার, বাড়ি নাম্বার, এরিয়া, থানা, জেলা..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:bg-white focus:border-neutral-900"
                  />
                </div>
              </div>
            </div>

            {/* 3. 3-TIER DELIVERY LOCATION & CHARGE */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-extrabold uppercase tracking-wider text-neutral-500 block">
                ডেলিভারি লোকেশন ও চার্জ
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveryZone('inside_dhaka')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    deliveryZone === 'inside_dhaka'
                      ? 'bg-neutral-900 text-white border-neutral-900 ring-2 ring-neutral-900 shadow-sm'
                      : 'bg-neutral-50 text-neutral-800 border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  <div className="font-bold text-xs">ঢাকার ভেতরে</div>
                  <div className={`text-[11px] font-mono mt-0.5 ${deliveryZone === 'inside_dhaka' ? 'text-amber-300' : 'text-neutral-500'}`}>
                    ৳{feeInside}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryZone('sub_dhaka')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    deliveryZone === 'sub_dhaka'
                      ? 'bg-neutral-900 text-white border-neutral-900 ring-2 ring-neutral-900 shadow-sm'
                      : 'bg-neutral-50 text-neutral-800 border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  <div className="font-bold text-xs">ঢাকার সাব-এরিয়া</div>
                  <div className={`text-[11px] font-mono mt-0.5 ${deliveryZone === 'sub_dhaka' ? 'text-amber-300' : 'text-neutral-500'}`}>
                    ৳{feeSub}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryZone('outside_dhaka')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    deliveryZone === 'outside_dhaka'
                      ? 'bg-neutral-900 text-white border-neutral-900 ring-2 ring-neutral-900 shadow-sm'
                      : 'bg-neutral-50 text-neutral-800 border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  <div className="font-bold text-xs">ঢাকার বাইরে</div>
                  <div className={`text-[11px] font-mono mt-0.5 ${deliveryZone === 'outside_dhaka' ? 'text-amber-300' : 'text-neutral-500'}`}>
                    ৳{feeOutside}
                  </div>
                </button>
              </div>
            </div>

            {/* 4. COUPON CODE APPLICATION */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-neutral-700 block">
                কুপন কোড (Coupon Code)
              </label>
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SPIDEY50"
                  className="flex-1 px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 uppercase font-mono font-bold focus:outline-none focus:bg-white"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Apply
                </button>
              </form>
              {couponMessage && (
                <p className={`text-[11px] font-semibold ${couponMessage.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {couponMessage.text}
                </p>
              )}
            </div>

            {/* 5. PRICE BREAKDOWN */}
            <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-1.5 text-xs">
              <div className="flex justify-between text-neutral-600">
                <span>সাবটোটাল:</span>
                <span className="font-mono font-bold text-neutral-900">৳{subtotal}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-rose-600 font-semibold">
                  <span>কুপন ছাড় ({couponAppliedCode}):</span>
                  <span className="font-mono">-৳{discountAmount}</span>
                </div>
              )}
              <div className="flex justify-between text-neutral-600">
                <span>ডেলিভারি চার্জ:</span>
                <span className="font-mono font-bold text-neutral-900">৳{currentDeliveryFee}</span>
              </div>
              <div className="border-t border-neutral-200/80 pt-2 flex justify-between items-baseline font-black text-neutral-900 text-sm">
                <span>সর্বমোট বিল:</span>
                <span className="text-base text-neutral-900 font-mono">৳{totalAmount}</span>
              </div>
            </div>

            {/* Confirm Order Button */}
            <button
              onClick={handlePlaceOrder}
              disabled={isSubmittingOrder}
              className="w-full py-3.5 rounded-2xl bg-neutral-900 hover:bg-black active:bg-neutral-800 text-white font-extrabold text-xs shadow-lg shadow-neutral-900/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
            >
              {isSubmittingOrder ? (
                <span>অর্ডার প্রসেস হচ্ছে...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>অর্ডার নিশ্চিত করুন • ৳{totalAmount}</span>
                </>
              )}
            </button>

          </div>

        ) : (

          /* ========================================================
              VIEW 1: SLIDE CART DRAWER (FULL EDITABILITY)
             ======================================================== */
          <div className="flex-1 flex flex-col justify-between overflow-hidden">
            
            {safeItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-800">
                    আপনার কার্ট এখন খালি
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    পছন্দের জার্সি নির্বাচন করে কার্টে যোগ করুন।
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-full bg-neutral-900 text-white text-xs font-bold hover:bg-black transition-all cursor-pointer"
                >
                  জার্সি কালেকশন দেখুন
                </button>
              </div>
            ) : (
              <>
                {/* Cart Items List */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
                  {safeItems.map((item) => {
                    const itemUnitPrice = (item.product?.price || 0) + (item.customizationFee || 0);
                    const hasName = Boolean(item.customName);
                    const hasNumber = Boolean(item.customNumber);

                    return (
                      <div
                        key={item.itemKey}
                        className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/90 space-y-3 text-xs shadow-xs"
                      >
                        {/* Top row: Thumbnail, Title, Price & Delete */}
                        <div className="flex items-start gap-3">
                          <img
                            src={item.product?.images?.[0] || 'https://images.unsplash.com/photo-1577212017184-80cc0da11082?auto=format&fit=crop&w=150&q=80'}
                            alt={item.product?.title}
                            referrerPolicy="no-referrer"
                            className="w-14 h-14 rounded-xl object-contain bg-white border border-neutral-200 shrink-0 p-1"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-1">
                              <h4 className="font-extrabold text-neutral-900 truncate">
                                {item.product?.title}
                              </h4>
                              <button
                                type="button"
                                onClick={() => onRemoveItem(item.itemKey)}
                                className="text-neutral-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                                title="মুছে ফেলুন"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-0.5">
                              <span className="font-mono text-neutral-800 font-bold">
                                ৳{itemUnitPrice}
                              </span>
                              <span>x {item.quantity || 1}</span>
                              <span>=</span>
                              <span className="font-mono text-neutral-900 font-extrabold">
                                ৳{itemUnitPrice * (item.quantity || 1)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Middle row: EDIT SIZE & QUANTITY DIRECTLY */}
                        <div className="p-2.5 rounded-xl bg-white border border-neutral-200/80 space-y-2">
                          {/* Size Selection Buttons */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-neutral-700">
                              সাইজ এডিট:
                            </span>
                            <div className="flex items-center gap-1">
                              {AVAILABLE_SIZES.map((sz) => (
                                <button
                                  key={sz}
                                  type="button"
                                  onClick={() => handleItemPropertyChange(item.itemKey, { selectedSize: sz })}
                                  className={`px-2 py-1 rounded-md text-[11px] font-mono font-bold transition-all cursor-pointer ${
                                    item.selectedSize === sz
                                      ? 'bg-neutral-900 text-white shadow-xs'
                                      : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                                  }`}
                                >
                                  {sz}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Quantity Controls */}
                          <div className="flex items-center justify-between pt-1.5 border-t border-neutral-100">
                            <span className="text-[11px] font-bold text-neutral-700">
                              পরিমাণ (Quantity):
                            </span>
                            <div className="flex items-center border border-neutral-300 rounded-lg bg-neutral-50 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => onUpdateQuantity(item.itemKey, Math.max(1, (item.quantity || 1) - 1))}
                                className="px-2.5 py-1 hover:bg-neutral-200 text-neutral-700 transition-colors cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-2.5 font-mono font-bold text-xs text-neutral-900">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => onUpdateQuantity(item.itemKey, (item.quantity || 1) + 1)}
                                className="px-2.5 py-1 hover:bg-neutral-200 text-neutral-700 transition-colors cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Bottom row: CUSTOMIZATION (NAME BOX & NUMBER BOX ON/OFF TOGGLES) */}
                        <div className="p-2.5 rounded-xl bg-white border border-neutral-200/80 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-neutral-800 flex items-center gap-1">
                              <Tag className="w-3 h-3 text-neutral-600" />
                              <span>কাস্টমাইজেশন (নাম ও নাম্বার)</span>
                            </span>
                            {(item.customName || item.customNumber) && (
                              <span className="text-[10px] font-mono text-emerald-600 font-bold">
                                {item.customName} {item.customNumber ? `#${item.customNumber}` : ''}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {/* 1. Name Box Toggle & Input */}
                            <div className="p-2 rounded-lg bg-neutral-50 border border-neutral-200 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-neutral-700">নাম বক্স</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (hasName) {
                                      handleItemPropertyChange(item.itemKey, { 
                                        customName: undefined,
                                        hasCustomization: Boolean(item.customNumber)
                                      });
                                    } else {
                                      handleItemPropertyChange(item.itemKey, { 
                                        customName: 'YASIN',
                                        hasCustomization: true
                                      });
                                    }
                                  }}
                                  className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                                    hasName ? 'bg-neutral-900 text-white' : 'bg-neutral-200 text-neutral-600'
                                  }`}
                                >
                                  {hasName ? 'ON' : 'OFF'}
                                </button>
                              </div>
                              {hasName && (
                                <input
                                  type="text"
                                  maxLength={15}
                                  value={item.customName || ''}
                                  onChange={(e) => handleItemPropertyChange(item.itemKey, {
                                    customName: e.target.value.toUpperCase(),
                                    hasCustomization: true
                                  })}
                                  placeholder="e.g. TORRES"
                                  className="w-full px-2 py-1 text-xs bg-white border border-neutral-300 rounded text-neutral-900 font-mono font-bold uppercase focus:outline-none focus:border-neutral-900"
                                />
                              )}
                            </div>

                            {/* 2. Number Box Toggle & Input */}
                            <div className="p-2 rounded-lg bg-neutral-50 border border-neutral-200 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-neutral-700">নাম্বার বক্স</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (hasNumber) {
                                      handleItemPropertyChange(item.itemKey, { 
                                        customNumber: undefined,
                                        hasCustomization: Boolean(item.customName)
                                      });
                                    } else {
                                      handleItemPropertyChange(item.itemKey, { 
                                        customNumber: '7',
                                        hasCustomization: true
                                      });
                                    }
                                  }}
                                  className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                                    hasNumber ? 'bg-neutral-900 text-white' : 'bg-neutral-200 text-neutral-600'
                                  }`}
                                >
                                  {hasNumber ? 'ON' : 'OFF'}
                                </button>
                              </div>
                              {hasNumber && (
                                <input
                                  type="text"
                                  maxLength={3}
                                  value={item.customNumber || ''}
                                  onChange={(e) => handleItemPropertyChange(item.itemKey, {
                                    customNumber: e.target.value.replace(/[^0-9]/g, ''),
                                    hasCustomization: true
                                  })}
                                  placeholder="e.g. 7"
                                  className="w-full px-2 py-1 text-xs bg-white border border-neutral-300 rounded text-neutral-900 font-mono font-bold focus:outline-none focus:border-neutral-900"
                                />
                              )}
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>

                {/* Bottom Drawer Actions */}
                <div className="p-4 sm:p-5 border-t border-neutral-200/80 bg-white space-y-2.5 shrink-0">
                  
                  {/* Button: "আরো পণ্য যোগ করুন" */}
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2.5 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>আরো জার্সি ব্রাউজ করুন</span>
                  </button>

                  {/* Subtotal Display */}
                  <div className="flex items-center justify-between text-xs pt-1 px-1">
                    <span className="text-neutral-500 font-semibold">সাবটোটাল:</span>
                    <span className="font-black text-neutral-900 text-base font-mono">
                      ৳{subtotal}
                    </span>
                  </div>

                  {/* Proceed to Checkout Button */}
                  <button
                    type="button"
                    onClick={() => setViewMode('checkout')}
                    className="w-full py-3.5 rounded-2xl bg-neutral-900 hover:bg-black active:bg-neutral-800 text-white font-extrabold text-xs shadow-md shadow-neutral-900/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                  >
                    <span>চেকআউট ও ডেলিভারি তথ্য দিন</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                </div>
              </>
            )}

          </div>
        )}

      </div>
    </div>
  );
};
