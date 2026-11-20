import React, { useState } from 'react';
import { 
  ArrowLeft, CheckCircle2, AlertCircle, ShoppingBag, 
  MapPin, Phone, User, Tag, ShieldCheck, Truck, Check, Edit3
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CartItem, Order } from '../types';
import { CurrencyCode, formatPrice } from '../utils/currency';
import { SiteSettings } from '../types/settings';
import { convertBengaliToEnglishDigits, cleanAndFormatPhoneNumber } from '../utils/phoneUtils';
import { TrustBadgeIcon } from './TrustBadgeIcon';
import { sendDirectTelegramOrderNotification } from '../utils/telegramNotification';

interface CheckoutPageProps {
  items: CartItem[];
  onBackToCart: () => void;
  onClearCart: () => void;
  onOrderSuccess: (order: Order) => void;
  currency: CurrencyCode;
  siteSettings: SiteSettings;
  appliedCouponFromPopup?: string;
  onUpdateQuantity?: (itemKey: string, qty: number) => void;
  onUpdateItem?: (itemKey: string, updates: Partial<CartItem>) => void;
  onRemoveItem?: (itemKey: string) => void;
}

const AVAILABLE_SIZES = ['M', 'L', 'XL', 'XXL', 'XXXL'];

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  items = [],
  onBackToCart,
  onClearCart,
  onOrderSuccess,
  currency,
  siteSettings,
  appliedCouponFromPopup,
  onUpdateQuantity,
  onUpdateItem,
  onRemoveItem
}) => {
  const safeItems = Array.isArray(items) ? items : [];
  const [editingItemKey, setEditingItemKey] = useState<string | null>(null);

  // Form Fields
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  
  // Delivery Area: Must be explicitly selected by customer (default empty, required)
  const [deliveryZone, setDeliveryZone] = useState<'inside_dhaka' | 'sub_dhaka' | 'outside_dhaka' | ''>('');

  // Field-specific validation errors
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [zoneError, setZoneError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Delivery Charges
  const feeInside = typeof siteSettings.deliveryChargeInsideDhaka === 'number' ? siteSettings.deliveryChargeInsideDhaka : 70;
  const feeSub = typeof siteSettings.deliveryChargeSubDhaka === 'number' ? siteSettings.deliveryChargeSubDhaka : 100;
  const feeOutside = typeof siteSettings.deliveryChargeOutsideDhaka === 'number' ? siteSettings.deliveryChargeOutsideDhaka : 130;

  const currentDeliveryFee = deliveryZone === 'inside_dhaka' 
    ? feeInside 
    : deliveryZone === 'sub_dhaka' 
    ? feeSub 
    : deliveryZone === 'outside_dhaka'
    ? feeOutside
    : 0;

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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

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
      setAppliedDiscount(currentDeliveryFee || 70);
      setCouponAppliedCode(code);
      setCouponMessage({ text: 'ফ্রি ডেলিভারি ডিসকাউন্ট যুক্ত হয়েছে!', type: 'success' });
    } else {
      setCouponMessage({ text: 'ভুল কুপন কোড। অনুগ্রহ করে সঠিক কোড দিন।', type: 'error' });
    }
  };

  // Submit Order with Strict Validations
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null);
    setPhoneError(null);
    setAddressError(null);
    setZoneError(null);
    setGeneralError(null);

    let hasError = false;

    // 1. Cart check
    if (safeItems.length === 0) {
      setGeneralError('আপনার কার্টে কোনো পণ্য নেই। দয়া করে আগে কার্টে পণ্য যোগ করুন।');
      return;
    }

    // 2. Name validation (Bangla or English allowed, but required)
    if (!customerName.trim()) {
      setNameError('কাস্টমারের নাম লিখুন (নাম আবশ্যক, এটি এখনো ফিলাপ করা হয়নি)');
      hasError = true;
    }

    // 3. Mobile Number validation: MUST be 11 digits in English!
    const englishDigitsPhone = convertBengaliToEnglishDigits(phoneNumber.trim());
    const cleanPhone = cleanAndFormatPhoneNumber(englishDigitsPhone);
    if (!cleanPhone || cleanPhone.length !== 11) {
      setPhoneError(
        !cleanPhone 
          ? 'মোবাইল নাম্বার লিখুন (নাম্বার আবশ্যক, এটি এখনো ফিলাপ করা হয়নি)' 
          : `মোবাইল নাম্বার অবশ্যই ইংরেজিতে ১১ ডিজিট হতে হবে (বর্তমানে ${cleanPhone.length} ডিজিট)। উদাহরণ: 01741475888`
      );
      hasError = true;
    }

    // 4. Shipping Address validation (Bangla or English allowed, but required)
    if (!shippingAddress.trim()) {
      setAddressError('সম্পূর্ণ ডেলিভারি ঠিকানা লিখুন (ঠিকানা আবশ্যক, এটি এখনো ফিলাপ করা হয়নি)');
      hasError = true;
    }

    // 5. Delivery Zone validation: MUST be selected by customer
    if (!deliveryZone) {
      setZoneError('ডেলিভারি এলাকা নির্বাচন করুন (ঢাকার মধ্যে / সাব-এরিয়া / বাইরে সিলেক্ট করা আবশ্যক)');
      hasError = true;
    }

    if (hasError) {
      setGeneralError('ফর্মের প্রয়োজনীয় তথ্যগুলো সঠিকভাবে ফিলাপ করুন। লাল চিহ্নিত বক্সগুলো পূরণ করা আবশ্যক।');
      window.scrollTo({ top: 150, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);

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

      let confirmedOrder: Order | null = null;
      let telegramDelivered = false;

      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload)
        });

        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data.success && data.order) {
            confirmedOrder = data.order;
            telegramDelivered = !!data.telegramSent;
          }
        }
      } catch (backendErr) {
        console.warn('Backend /api/orders request failed (possibly static deployment):', backendErr);
      }

      // If backend did not deliver to Telegram (e.g. static hosting or worker cutoff),
      // dispatch directly from customer browser to Telegram!
      if (!telegramDelivered) {
        console.log('Dispatching direct browser Telegram order notification fallback...');
        const directResult = await sendDirectTelegramOrderNotification(
          confirmedOrder || {
            ...orderPayload,
            id: `SPIDEY-${Date.now().toString(36).toUpperCase()}`
          },
          siteSettings
        );
        if (directResult.success) {
          telegramDelivered = true;
        }
      }

      const finalOrder: Order = confirmedOrder || {
        id: `SPIDEY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
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
        status: 'confirmed',
        createdAt: new Date().toISOString()
      };

      setPlacedOrder(finalOrder);
      onClearCart();
      onOrderSuccess(finalOrder);

      try {
        confetti({
          particleCount: 140,
          spread: 80,
          origin: { y: 0.5 }
        });
      } catch {}
    } catch (err: any) {
      setGeneralError(err.message || 'নেটওয়ার্ক এরর। দয়া করে আবার চেষ্টা করুন।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0b0e] text-neutral-100 pb-20">
      
      {/* Top Header & Breadcrumbs */}
      <div className="border-b border-white/[0.08] bg-[#101014] sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-neutral-400 font-semibold">
            <button 
              onClick={onBackToCart}
              className="hover:text-white transition-colors cursor-pointer"
            >
              কার্ট
            </button>
            <span>/</span>
            <span className="text-neutral-100 font-black">চেকআউট ও ডেলিভারি</span>
          </div>

          <button
            onClick={onBackToCart}
            className="flex items-center gap-1 font-bold text-neutral-300 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>কার্টে ফিরে যান</span>
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">

        {/* ORDER CONFIRMATION RECEIPT VIEW */}
        {placedOrder ? (
          <div className="bg-[#141418] rounded-3xl border border-white/10 p-6 sm:p-10 max-w-xl mx-auto text-center shadow-lg space-y-6 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 mx-auto flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-xl sm:text-2xl font-black text-white">
                অর্ডার সফলভাবে গ্রহণ করা হয়েছে!
              </h1>
              <p className="text-xs text-neutral-400">
                ধন্যবাদ! খুব শীঘ্রই আমাদের প্রতিনিধি ফোনে যোগাযোগ করে অর্ডার কনফার্ম করবেন।
              </p>
              <div className="pt-2">
                <span className="px-3 py-1.5 rounded-full bg-[#1e1e26] border border-white/10 text-neutral-100 text-xs font-mono font-bold">
                  Order ID: #{placedOrder.id}
                </span>
              </div>
            </div>

            {/* Receipt Summary */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#1a1a21] border border-white/10 text-left text-xs space-y-2.5">
              <div className="flex justify-between text-neutral-400">
                <span>কাস্টমার:</span>
                <span className="font-bold text-white">{placedOrder.customerName}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>মোবাইল:</span>
                <span className="font-mono font-bold text-white">{placedOrder.phoneNumber}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>ঠিকানা:</span>
                <span className="font-bold text-white text-right max-w-[240px] truncate">{placedOrder.shippingAddress}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>পেমেন্ট মেথড:</span>
                <span className="font-bold text-white">ক্যাশ অন ডেলিভারি (COD)</span>
              </div>
              <div className="border-t border-white/10 pt-2 flex justify-between font-black text-white text-sm">
                <span>সর্বমোট পরিশোধযোগ্য:</span>
                <span className="text-red-500 font-mono text-base tabular-nums">৳{placedOrder.totalAmount}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setPlacedOrder(null);
                window.location.href = '/';
              }}
              className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs transition-all shadow-md cursor-pointer"
            >
              হোম পেজে ফিরুন
            </button>
          </div>
        ) : (

          /* CHECKOUT FORM & SUMMARY VIEW */
          <div className="space-y-6">
            
            {generalError && (
              <div className="p-4 rounded-2xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs font-bold flex items-center gap-2.5 shadow-xs animate-in fade-in">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
                <span>{generalError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* LEFT 7 COLS: CUSTOMER DETAILS FORM */}
              <div className="lg:col-span-7 bg-[#141418] rounded-3xl border border-white/10 p-5 sm:p-8 shadow-xs space-y-6">
                
                <div>
                  <h2 className="text-lg font-black text-white tracking-tight">
                    ডেলিভারি ও কাস্টমার তথ্য
                  </h2>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    সঠিকভাবে অর্ডার ডেলিভারি নিশ্চিত করতে প্রয়োজনীয় বক্সগুলো পূরণ করুন।
                  </p>
                </div>

                <form onSubmit={handleSubmitOrder} className="space-y-5">
                  
                  {/* 1. Customer Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-200 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-red-400" />
                      <span>আপনার নাম (Customer Name)</span>
                      <span className="text-red-500 font-black">*</span>
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        if (e.target.value.trim()) setNameError(null);
                      }}
                      placeholder="e.g. মোঃ সাকিব হাসান / Sakib Hasan"
                      className={`w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#0d0d11] rounded-xl text-white border transition-all focus:outline-none ${
                        nameError 
                          ? 'border-red-500 ring-2 ring-red-500/30' 
                          : 'border-white/15 focus:border-red-500'
                      }`}
                    />
                    {nameError && (
                      <p className="text-[11px] text-red-400 font-bold flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{nameError}</span>
                      </p>
                    )}
                  </div>

                  {/* 2. Mobile Number */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-neutral-200 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-red-400" />
                        <span>মোবাইল নাম্বার (Mobile Number)</span>
                        <span className="text-red-500 font-black">*</span>
                      </label>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        (ইংরেজি ১১ ডিজিট আবশ্যক)
                      </span>
                    </div>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => {
                        const english = convertBengaliToEnglishDigits(e.target.value);
                        setPhoneNumber(english);
                        if (cleanAndFormatPhoneNumber(english)?.length === 11) {
                          setPhoneError(null);
                        }
                      }}
                      placeholder="01XXXXXXXXX"
                      className={`w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#0d0d11] rounded-xl text-white font-mono font-bold border transition-all focus:outline-none ${
                        phoneError 
                          ? 'border-red-500 ring-2 ring-red-500/30' 
                          : 'border-white/15 focus:border-red-500'
                      }`}
                    />
                    {phoneError && (
                      <p className="text-[11px] text-red-400 font-bold flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{phoneError}</span>
                      </p>
                    )}
                  </div>

                  {/* 3. Delivery Address */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-200 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-red-400" />
                      <span>সম্পূর্ণ ডেলিভারি ঠিকানা (Full Delivery Address)</span>
                      <span className="text-red-500 font-black">*</span>
                    </label>
                    <textarea
                      rows={2}
                      value={shippingAddress}
                      onChange={(e) => {
                        setShippingAddress(e.target.value);
                        if (e.target.value.trim()) setAddressError(null);
                      }}
                      placeholder="বাসা/হোল্ডিং নম্বর, রোড, এলাকা, থানা, জেলা (বাংলা বা ইংরেজিতে লিখুন)..."
                      className={`w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#0d0d11] rounded-xl text-white border transition-all focus:outline-none ${
                        addressError 
                          ? 'border-red-500 ring-2 ring-red-500/30' 
                          : 'border-white/15 focus:border-red-500'
                      }`}
                    />
                    {addressError && (
                      <p className="text-[11px] text-red-400 font-bold flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{addressError}</span>
                      </p>
                    )}
                  </div>

                  {/* 4. Delivery Area Selection */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-neutral-200 flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-red-400" />
                        <span>ডেলিভারি এলাকা নির্বাচন করুন (Delivery Zone)</span>
                        <span className="text-red-500 font-black">*</span>
                      </label>
                      <span className="text-[10px] text-neutral-400 font-semibold">
                        (বাধ্যতামূলক নির্বাচন)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setDeliveryZone('inside_dhaka');
                          setZoneError(null);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          deliveryZone === 'inside_dhaka'
                            ? 'bg-red-600/20 text-white border-red-500 ring-1 ring-red-500 shadow-sm'
                            : 'bg-[#1a1a21] hover:bg-[#22222b] text-neutral-200 border-white/10'
                        }`}
                      >
                        <div className="font-extrabold text-xs">{siteSettings.deliveryZoneInsideDhakaTitle || 'ঢাকার ভেতরে'}</div>
                        <div className={`text-[11px] font-mono mt-1 ${deliveryZone === 'inside_dhaka' ? 'text-red-300 font-bold' : 'text-neutral-400'}`}>
                          চার্জ: ৳{feeInside}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDeliveryZone('sub_dhaka');
                          setZoneError(null);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          deliveryZone === 'sub_dhaka'
                            ? 'bg-red-600/20 text-white border-red-500 ring-1 ring-red-500 shadow-sm'
                            : 'bg-[#1a1a21] hover:bg-[#22222b] text-neutral-200 border-white/10'
                        }`}
                      >
                        <div className="font-extrabold text-xs">{siteSettings.deliveryZoneSubDhakaTitle || 'ঢাকার সাব-এরিয়া'}</div>
                        <div className={`text-[11px] font-mono mt-1 ${deliveryZone === 'sub_dhaka' ? 'text-red-300 font-bold' : 'text-neutral-400'}`}>
                          চার্জ: ৳{feeSub}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDeliveryZone('outside_dhaka');
                          setZoneError(null);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          deliveryZone === 'outside_dhaka'
                            ? 'bg-red-600/20 text-white border-red-500 ring-1 ring-red-500 shadow-sm'
                            : 'bg-[#1a1a21] hover:bg-[#22222b] text-neutral-200 border-white/10'
                        }`}
                      >
                        <div className="font-extrabold text-xs">{siteSettings.deliveryZoneOutsideDhakaTitle || 'ঢাকার বাইরে'}</div>
                        <div className={`text-[11px] font-mono mt-1 ${deliveryZone === 'outside_dhaka' ? 'text-red-300 font-bold' : 'text-neutral-400'}`}>
                          চার্জ: ৳{feeOutside}
                        </div>
                      </button>
                    </div>

                    {zoneError && (
                      <p className="text-[11px] text-red-400 font-bold flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{zoneError}</span>
                      </p>
                    )}
                  </div>

                  {/* 5. Coupon Code Box */}
                  <div className="p-3.5 rounded-2xl bg-[#1a1a21] border border-white/10 space-y-2">
                    <label className="text-xs font-bold text-neutral-200 block">
                      কুপন কোড (Coupon Code)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="e.g. SPIDEY50"
                        className="flex-1 px-3 py-2 text-xs bg-[#0d0d11] border border-white/15 rounded-xl text-white font-mono font-bold uppercase focus:outline-none focus:border-red-500"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all cursor-pointer shrink-0"
                      >
                        Apply
                      </button>
                    </div>
                    {couponMessage && (
                      <p className={`text-[11px] font-semibold ${couponMessage.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {couponMessage.text}
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>অর্ডার প্রসেস হচ্ছে...</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>অর্ডার নিশ্চিত করুন • {formatPrice(totalAmount, currency)}</span>
                      </>
                    )}
                  </button>

                </form>

              </div>

              {/* RIGHT 5 COLS: ORDER SUMMARY & PRODUCT IMAGES */}
              <div className="lg:col-span-5 space-y-4 sticky top-24">
                
                <div className="bg-[#141418] rounded-3xl border border-white/10 p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h3 className="text-sm font-black text-white">
                      অর্ডারকৃত পণ্য তালিকা ({safeItems.length} টি)
                    </h3>
                    <button
                      type="button"
                      onClick={onBackToCart}
                      className="text-xs text-neutral-400 hover:text-white font-bold flex items-center gap-1 underline transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>কার্ট এডিট</span>
                    </button>
                  </div>

                  {/* Items List */}
                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    {safeItems.map((item) => {
                      const itemUnitPrice = (item.product?.price || 0) + (item.customizationFee || 0);
                      const isEditing = editingItemKey === item.itemKey;

                      return (
                        <div 
                          key={item.itemKey}
                          className="p-3 rounded-2xl bg-[#1a1a21] border border-white/[0.08] text-xs space-y-2.5 transition-all"
                        >
                          <div className="flex items-start gap-3">
                            {item.product?.images && item.product.images[0] ? (
                              <img
                                src={item.product.images[0]}
                                alt={item.product?.title}
                                referrerPolicy="no-referrer"
                                className="w-14 h-14 rounded-2xl object-contain bg-[#0e0e12] border border-white/10 shrink-0 p-0.5"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-2xl bg-[#0e0e12] border border-white/10 shrink-0 flex items-center justify-center text-[9px] text-neutral-500 font-bold">
                                ITEM
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <h4 className="font-extrabold text-white truncate">
                                {item.product?.title}
                              </h4>
                              <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5">
                                <span>সাইজ: <strong className="text-neutral-200 font-mono">[{item.selectedSize}]</strong></span>
                                <span>•</span>
                                <span>পরিমাণ: <strong className="text-neutral-200">{item.quantity}</strong></span>
                              </div>

                              {(item.customName || item.customNumber) && (
                                <div className="mt-1 px-1.5 py-0.5 rounded bg-red-600/20 border border-red-500/30 text-red-300 text-[10px] font-mono inline-flex items-center gap-1">
                                  <Tag className="w-2.5 h-2.5 text-red-400" />
                                  <span>{item.customName || ''} {item.customNumber ? `(#${item.customNumber})` : ''}</span>
                                </div>
                              )}
                            </div>

                            <div className="text-right shrink-0">
                              <div className="font-black text-white font-mono tabular-nums">
                                {formatPrice(itemUnitPrice * (item.quantity || 1), currency)}
                              </div>
                              {onUpdateItem && (
                                <button
                                  type="button"
                                  onClick={() => setEditingItemKey(isEditing ? null : item.itemKey)}
                                  className="mt-1 px-2 py-0.5 text-[10px] font-bold text-neutral-300 hover:text-white bg-[#121216] border border-white/15 rounded hover:bg-[#24242d] transition-colors cursor-pointer"
                                >
                                  {isEditing ? 'বন্ধ করুন' : 'পরিবর্তন'}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Inline Edit Panel */}
                          {isEditing && (
                            <div className="pt-2 border-t border-white/10 space-y-2 bg-[#121216] p-2.5 rounded-xl border border-white/10">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-neutral-400">সাইজ:</span>
                                <div className="flex items-center gap-1">
                                  {AVAILABLE_SIZES.map((sz) => (
                                    <button
                                      key={sz}
                                      type="button"
                                      onClick={() => onUpdateItem?.(item.itemKey, { selectedSize: sz })}
                                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-black transition-colors cursor-pointer ${
                                        item.selectedSize === sz
                                          ? 'bg-red-600 text-white'
                                          : 'bg-[#1b1b22] hover:bg-[#25252f] text-neutral-200'
                                      }`}
                                    >
                                      {sz}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {onUpdateQuantity && (
                                <div className="flex items-center justify-between pt-1 border-t border-white/10">
                                  <span className="text-[10px] font-bold text-neutral-400">পরিমাণ:</span>
                                  <div className="flex items-center border border-white/15 rounded bg-[#18181f] overflow-hidden">
                                    <button
                                      type="button"
                                      onClick={() => onUpdateQuantity(item.itemKey, Math.max(1, (item.quantity || 1) - 1))}
                                      className="px-2 py-0.5 hover:bg-white/10 text-neutral-200 font-bold"
                                    >
                                      -
                                    </button>
                                    <span className="px-2 font-mono font-bold text-xs text-white">
                                      {item.quantity}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => onUpdateQuantity(item.itemKey, (item.quantity || 1) + 1)}
                                      className="px-2 py-0.5 hover:bg-white/10 text-neutral-200 font-bold"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              )}

                              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/10">
                                <div>
                                  <span className="text-[10px] text-neutral-400 font-bold block mb-0.5">নাম:</span>
                                  <input
                                    type="text"
                                    value={item.customName || ''}
                                    onChange={(e) => onUpdateItem?.(item.itemKey, {
                                      customName: e.target.value.toUpperCase(),
                                      hasCustomization: Boolean(e.target.value.trim() || item.customNumber)
                                    })}
                                    placeholder="e.g. YASIN"
                                    className="w-full px-2 py-1 text-[11px] bg-[#18181f] border border-white/15 rounded text-white font-mono uppercase font-bold focus:outline-none focus:border-red-500"
                                  />
                                </div>
                                <div>
                                  <span className="text-[10px] text-neutral-400 font-bold block mb-0.5">নম্বর:</span>
                                  <input
                                    type="text"
                                    maxLength={3}
                                    value={item.customNumber || ''}
                                    onChange={(e) => onUpdateItem?.(item.itemKey, {
                                      customNumber: e.target.value.replace(/[^0-9]/g, ''),
                                      hasCustomization: Boolean(item.customName || e.target.value.trim())
                                    })}
                                    placeholder="e.g. 7"
                                    className="w-full px-2 py-1 text-[11px] bg-[#18181f] border border-white/15 rounded text-white font-mono font-bold focus:outline-none focus:border-red-500"
                                  />
                                </div>
                              </div>

                              {onRemoveItem && (
                                <div className="pt-1 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => onRemoveItem(item.itemKey)}
                                    className="text-[10px] text-red-400 hover:text-red-300 font-bold underline cursor-pointer"
                                  >
                                    আইটেমটি বাদ দিন
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Cost Breakdown */}
                  <div className="p-3.5 rounded-xl bg-[#1a1a21] border border-white/10 space-y-2 text-xs tabular-nums">
                    <div className="flex justify-between text-neutral-400">
                      <span>সাবটোটাল:</span>
                      <span className="font-mono font-bold text-white">{formatPrice(subtotal, currency)}</span>
                    </div>

                    {discountAmount > 0 && (
                      <div className="flex justify-between text-red-400 font-bold">
                        <span>কুপন ছাড় ({couponAppliedCode}):</span>
                        <span className="font-mono">-৳{discountAmount}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-neutral-400">
                      <span>ডেলিভারি চার্জ:</span>
                      <span className="font-mono font-bold text-white">
                        {deliveryZone ? `৳${currentDeliveryFee}` : 'এলাকা সিলেক্ট করুন'}
                      </span>
                    </div>

                    <div className="border-t border-white/10 pt-2 flex justify-between items-baseline font-black text-white text-sm">
                      <span>সর্বমোট বিল:</span>
                      <span className="text-lg font-black text-red-500 font-mono">
                        {formatPrice(totalAmount, currency)}
                      </span>
                    </div>
                  </div>

                  {/* Trust & Feature Badges */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10">
                    {siteSettings.trustBadge1Enabled !== false && (
                      <div className="p-2.5 rounded-xl border border-white/10 bg-[#1a1a21] text-center space-y-1">
                        <div className="flex justify-center">
                          <TrustBadgeIcon icon={siteSettings.trustBadge1Icon || 'truck'} defaultIcon="truck" className="w-4 h-4 text-red-400" />
                        </div>
                        <div className="text-[10px] font-black text-neutral-100 leading-tight">
                          {siteSettings.trustBadge1Title || 'ফ্রি ডেলিভারি'}
                        </div>
                        <div className="text-[9px] text-neutral-400 leading-tight">
                          {siteSettings.trustBadge1Subtitle || '৳২০০০+ অর্ডারে'}
                        </div>
                      </div>
                    )}

                    {siteSettings.trustBadge2Enabled !== false && (
                      <div className="p-2.5 rounded-xl border border-white/10 bg-[#1a1a21] text-center space-y-1">
                        <div className="flex justify-center">
                          <TrustBadgeIcon icon={siteSettings.trustBadge2Icon || 'shield'} defaultIcon="shield" className="w-4 h-4 text-red-400" />
                        </div>
                        <div className="text-[10px] font-black text-neutral-100 leading-tight">
                          {siteSettings.trustBadge2Title || '১০০% অরিজিনাল'}
                        </div>
                        <div className="text-[9px] text-neutral-400 leading-tight">
                          {siteSettings.trustBadge2Subtitle || 'অথেনটিক গ্যারান্টি'}
                        </div>
                      </div>
                    )}

                    {siteSettings.trustBadge3Enabled !== false && (
                      <div className="p-2.5 rounded-xl border border-white/10 bg-[#1a1a21] text-center space-y-1">
                        <div className="flex justify-center">
                          <TrustBadgeIcon icon={siteSettings.trustBadge3Icon || 'rotate-ccw'} defaultIcon="rotate-ccw" className="w-4 h-4 text-red-400" />
                        </div>
                        <div className="text-[10px] font-black text-neutral-100 leading-tight">
                          {siteSettings.trustBadge3Title || '৭ দিন রিটার্ন'}
                        </div>
                        <div className="text-[9px] text-neutral-400 leading-tight">
                          {siteSettings.trustBadge3Subtitle || 'সহজ পলিসি'}
                        </div>
                      </div>
                    )}
                  </div>

                </div>

              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
};
