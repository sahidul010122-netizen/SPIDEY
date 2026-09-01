import React, { useState } from 'react';
import { 
  X, Trash2, ShoppingBag, ArrowRight, ShieldCheck, Sparkles, 
  Tag, Check, Truck, CreditCard, ChevronRight, CheckCircle2 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CartItem, Order } from '../types';
import { CurrencyCode, formatPrice } from '../utils/currency';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (itemKey: string, qty: number) => void;
  onRemoveItem: (itemKey: string) => void;
  onClearCart: () => void;
  currency: CurrencyCode;
}

interface CartDrawerContentProps {
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (itemKey: string, qty: number) => void;
  onRemoveItem: (itemKey: string) => void;
  onClearCart: () => void;
  currency: CurrencyCode;
}

const CartDrawerContent: React.FC<CartDrawerContentProps> = ({
  onClose,
  items = [],
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  currency
}) => {
  const safeItems = Array.isArray(items) ? items : [];
  const [promoCode, setPromoCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [discountMessage, setDiscountMessage] = useState('');
  
  // Checkout Form State
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  const subtotal = safeItems.reduce((sum, item) => sum + (item.product?.price || 0) * (item.quantity || 1), 0);
  const shippingFee = subtotal > 150 || appliedDiscount === 999 ? 0 : 9.99;
  const calculatedDiscount = appliedDiscount === 999 
    ? 0 
    : (subtotal * appliedDiscount) / 100;
  const total = Math.max(0, subtotal - calculatedDiscount + shippingFee);

  const applyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    const code = promoCode.trim().toUpperCase();
    if (code === 'SPIDEY10' || code === 'CYBER10') {
      setAppliedDiscount(10);
      setDiscountMessage('10% Cyber Discount Applied!');
    } else if (code === 'FREESHIP') {
      setAppliedDiscount(999);
      setDiscountMessage('Free Global Express Shipping Applied!');
    } else if (code === 'VIP20') {
      setAppliedDiscount(20);
      setDiscountMessage('20% VIP Collector Discount Applied!');
    } else {
      setDiscountMessage('Invalid code. Try "SPIDEY10" or "FREESHIP"');
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    setIsSubmittingOrder(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          customerName: customerName || 'Collector Guest',
          customerEmail: customerEmail || 'guest@spideyjersey.com',
          shippingAddress: shippingAddress || '101 Cyber Avenue, Suite 404',
          discount: calculatedDiscount,
          shippingFee
        })
      });

      const data = await res.json();
      if (data.success && data.order) {
        setCompletedOrder(data.order);
        onClearCart();

        // Launch celebratory confetti
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    } catch (err) {
      console.error('Order error:', err);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  return (
    <div
      id="cart-drawer-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex justify-end animate-in fade-in duration-200"
    >
      <div
        id="cart-drawer-content"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-slate-950/95 border-l border-white/15 h-full flex flex-col shadow-2xl backdrop-blur-2xl"
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono">
                Your Kit Bag ({items.reduce((s, i) => s + i.quantity, 0)})
              </h2>
              <p className="text-[11px] text-slate-400">Authentic Matchwear Vault</p>
            </div>
          </div>
          <button
            id="close-cart-btn"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Order Confirmed Receipt View */}
        {completedOrder ? (
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-4 overflow-y-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-white">Order Confirmed!</h3>
            <p className="text-xs text-slate-300 max-w-xs">
              Thank you for ordering with Spidey Jersey. Your authentic player kits are queued for thermal customization & dispatch.
            </p>

            <div className="w-full p-4 rounded-2xl bg-slate-900 border border-white/10 text-left font-mono space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Order Ref:</span>
                <span className="text-cyan-400 font-bold">{completedOrder.id}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total Paid:</span>
                <span className="text-white font-bold">{formatPrice(completedOrder.totalAmount, currency)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Status:</span>
                <span className="text-emerald-400 font-bold uppercase">{completedOrder.status}</span>
              </div>
            </div>

            <button
              id="order-continue-shopping-btn"
              onClick={() => {
                setCompletedOrder(null);
                setIsCheckingOut(false);
                onClose();
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/30"
            >
              Continue Exploring Drops
            </button>
          </div>
        ) : isCheckingOut ? (
          /* Checkout Details Form */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <button
                id="back-to-bag-btn"
                onClick={() => setIsCheckingOut(false)}
                className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
              >
                ← Back to Kit Bag
              </button>
              <span className="text-xs font-mono text-slate-400">Step 2/2</span>
            </div>

            <h3 className="text-base font-bold text-white">Collector Delivery Details</h3>

            <form onSubmit={handlePlaceOrder} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  id="checkout-name-input"
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Sahidul Islam"
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <input
                  id="checkout-email-input"
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Shipping Address</label>
                <textarea
                  id="checkout-address-input"
                  required
                  rows={2}
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Street, City, Postal Code, Country"
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 resize-none"
                />
              </div>

              {/* Order Summary in Checkout */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-white/10 font-mono text-xs space-y-1.5 pt-3">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal ({items.length} items):</span>
                  <span>{formatPrice(subtotal, currency)}</span>
                </div>
                {calculatedDiscount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount:</span>
                    <span>-{formatPrice(calculatedDiscount, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span>Express Shipping:</span>
                  <span>{shippingFee === 0 ? 'FREE' : formatPrice(shippingFee, currency)}</span>
                </div>
                <div className="flex justify-between text-white font-bold pt-2 border-t border-white/10 text-sm">
                  <span>Total:</span>
                  <span className="text-cyan-300">{formatPrice(total, currency)}</span>
                </div>
              </div>

              <button
                id="place-order-btn"
                type="submit"
                disabled={isSubmittingOrder}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2"
              >
                {isSubmittingOrder ? (
                  <span>Securing Order...</span>
                ) : (
                  <>
                    <span>Confirm Order • {formatPrice(total, currency)}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : items.length === 0 ? (
          /* Empty Bag State */
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-white/10 text-slate-500 flex items-center justify-center">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Your Kit Bag is Empty</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Explore our authentic jersey collection and add drops to your showcase bag.
              </p>
            </div>
            <button
              id="start-shopping-btn"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs"
            >
              Browse Featured Kits
            </button>
          </div>
        ) : (
          /* Normal Cart List */
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
            {safeItems.map((item) => (
              <div
                key={item.itemKey}
                id={`cart-item-${item.itemKey}`}
                className="p-3 rounded-2xl bg-slate-900/80 border border-white/10 flex gap-3 items-center justify-between"
              >
                <img
                  src={item.product?.images?.[0] || 'https://images.unsplash.com/photo-1577212017184-80cc0da11082?auto=format&fit=crop&w=200&q=80'}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-xl object-cover bg-slate-950 border border-white/10 shrink-0"
                />

                <div className="flex-1 min-w-0 pr-2">
                  <h4 className="text-xs font-bold text-white line-clamp-1">
                    {item.product.title}
                  </h4>
                  <div className="text-[11px] font-mono text-cyan-400 mt-0.5 flex items-center gap-2">
                    <span>Size: <strong>{item.selectedSize}</strong></span>
                    <span>•</span>
                    <span>{formatPrice(item.product.price, currency)}</span>
                  </div>

                  {(item.customName || item.customNumber) && (
                    <div className="text-[10px] text-amber-300 font-mono mt-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Foil: {item.customName || 'NAME'} #{item.customNumber || '10'}</span>
                    </div>
                  )}

                  {/* Qty controls */}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center rounded-lg bg-slate-950 border border-white/10 p-0.5">
                      <button
                        id={`cart-minus-${item.itemKey}`}
                        onClick={() => onUpdateQuantity(item.itemKey, item.quantity - 1)}
                        className="w-5 h-5 text-xs text-slate-400 hover:text-white flex items-center justify-center font-bold"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-xs font-mono font-bold text-white">
                        {item.quantity}
                      </span>
                      <button
                        id={`cart-plus-${item.itemKey}`}
                        onClick={() => onUpdateQuantity(item.itemKey, item.quantity + 1)}
                        className="w-5 h-5 text-xs text-slate-400 hover:text-white flex items-center justify-center font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end justify-between h-full py-0.5 shrink-0">
                  <button
                    id={`remove-cart-item-${item.itemKey}`}
                    onClick={() => onRemoveItem(item.itemKey)}
                    className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="text-xs font-black font-mono text-white mt-3">
                    {formatPrice(item.product.price * item.quantity, currency)}
                  </div>
                </div>
              </div>
            ))}

            {/* Promo Code Box */}
            <form onSubmit={applyPromo} className="pt-2">
              <div className="flex gap-2">
                <input
                  id="promo-code-input"
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Promo code (e.g. SPIDEY10)"
                  className="flex-1 bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-white uppercase focus:outline-none focus:border-cyan-400"
                />
                <button
                  id="apply-promo-btn"
                  type="submit"
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-semibold text-slate-200"
                >
                  Apply
                </button>
              </div>
              {discountMessage && (
                <p className="text-[11px] text-cyan-300 font-mono mt-1">
                  {discountMessage}
                </p>
              )}
            </form>
          </div>
        )}

        {/* Drawer Footer & Checkout Trigger */}
        {!completedOrder && items.length > 0 && !isCheckingOut && (
          <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-900/80 space-y-3 shrink-0">
            <div className="space-y-1 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal, currency)}</span>
              </div>
              {calculatedDiscount > 0 && (
                <div className="flex justify-between text-emerald-400 font-semibold">
                  <span>Promo Discount</span>
                  <span>-{formatPrice(calculatedDiscount, currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>Estimated Shipping</span>
                <span>{shippingFee === 0 ? 'FREE' : formatPrice(shippingFee, currency)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/10">
                <span>Estimated Total</span>
                <span className="text-cyan-300 font-mono">{formatPrice(total, currency)}</span>
              </div>
            </div>

            <button
              id="proceed-checkout-btn"
              onClick={() => setIsCheckingOut(true)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  currency
}) => {
  if (!isOpen) return null;

  return (
    <CartDrawerContent
      onClose={onClose}
      items={items}
      onUpdateQuantity={onUpdateQuantity}
      onRemoveItem={onRemoveItem}
      onClearCart={onClearCart}
      currency={currency}
    />
  );
};
