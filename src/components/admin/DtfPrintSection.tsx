import React, { useState, useEffect, useMemo } from 'react';
import {
  Copy,
  Check,
  Sparkles,
  ArrowLeft,
  CheckSquare,
  Square,
  Search
} from 'lucide-react';
import { JerseyProduct, Order } from '../../types';
import {
  extractJerseyNameAndNumber,
  generateDtfPrintList
} from '../../utils/dtfPrintFormatter';

interface DtfPrintSectionProps {
  products: JerseyProduct[];
  selectedOrderIds: Set<string>;
  onUpdateSelectedOrderIds: (next: Set<string>) => void;
  onGoToOrderProcess?: () => void;
}

export const DtfPrintSection: React.FC<DtfPrintSectionProps> = ({
  products = [],
  selectedOrderIds,
  onUpdateSelectedOrderIds,
  onGoToOrderProcess
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOrderPicker, setShowOrderPicker] = useState<boolean>(false);

  // Single Copy Box text state
  const [outputText, setOutputText] = useState<string>('');
  const [hasGenerated, setHasGenerated] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [notice, setNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 2800);
  };

  // Load master orders from API + localStorage (read-only)
  const loadOrders = async () => {
    let deletedIds = new Set<string>();
    try {
      const rawDeleted = localStorage.getItem('spidey_deleted_order_ids');
      if (rawDeleted) {
        const parsed = JSON.parse(rawDeleted);
        if (Array.isArray(parsed)) deletedIds = new Set(parsed);
      }
    } catch {}

    let serverOrders: Order[] = [];
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.orders)) {
          serverOrders = data.orders.filter((o: Order) => !deletedIds.has(o.id));
        }
      }
    } catch {}

    let localOrders: Order[] = [];
    try {
      const cached = localStorage.getItem('spidey_master_orders');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          localOrders = parsed.filter((o: Order) => !deletedIds.has(o.id));
        }
      }
    } catch {}

    if (localOrders.length > 0 && serverOrders.length === 0) {
      setOrders(localOrders);
    } else if (serverOrders.length > 0) {
      const serverMap = new Map(serverOrders.map((o) => [o.id, o]));
      const merged: Order[] = [...serverOrders];
      for (const l of localOrders) {
        if (!serverMap.has(l.id)) {
          merged.push(l);
        }
      }
      setOrders(merged);
    } else {
      setOrders([]);
    }
  };

  useEffect(() => {
    loadOrders();

    const handleOrdersSync = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt.detail && Array.isArray(customEvt.detail.orders)) {
        setOrders(customEvt.detail.orders);
      } else {
        loadOrders();
      }
    };

    window.addEventListener('spidey-orders-updated', handleOrdersSync);
    return () => window.removeEventListener('spidey-orders-updated', handleOrdersSync);
  }, []);

  // Open picker automatically only if no orders are currently selected
  useEffect(() => {
    if (selectedOrderIds.size === 0) {
      setShowOrderPicker(true);
    }
  }, [selectedOrderIds.size]);

  // Preserve exact serial from Master Order Ledger
  const selectedOrdersInSerial = useMemo(() => {
    return orders.filter((o) => selectedOrderIds.has(o.id));
  }, [orders, selectedOrderIds]);

  const filteredPickerOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase();
    return orders.filter(
      (order) =>
        order.id.toLowerCase().includes(q) ||
        (order.customerName || '').toLowerCase().includes(q) ||
        (order.phoneNumber || '').includes(q) ||
        (order.items || []).some(
          (it) =>
            (it.product?.code || '').toLowerCase().includes(q) ||
            (it.customName || '').toLowerCase().includes(q) ||
            (it.customNumber || '').toLowerCase().includes(q)
        )
    );
  }, [orders, searchQuery]);

  const handleToggleOrder = (id: string) => {
    const next = new Set(selectedOrderIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onUpdateSelectedOrderIds(next);
  };

  const isAllVisibleSelected =
    filteredPickerOrders.length > 0 &&
    filteredPickerOrders.every((o) => selectedOrderIds.has(o.id));

  const handleToggleSelectAllVisible = () => {
    const next = new Set(selectedOrderIds);
    if (isAllVisibleSelected) {
      filteredPickerOrders.forEach((o) => next.delete(o.id));
    } else {
      filteredPickerOrders.forEach((o) => next.add(o.id));
    }
    onUpdateSelectedOrderIds(next);
  };

  // Generate clean DTF lines into the SINGLE Copy Box
  const handleGenerate = () => {
    if (selectedOrdersInSerial.length === 0) {
      showNotice('প্রথমে প্রয়োজনীয় অর্ডার সিলেক্ট করুন।');
      setShowOrderPicker(true);
      return;
    }

    const result = generateDtfPrintList(selectedOrdersInSerial, products);
    setOutputText(result.formattedText);
    setHasGenerated(true);
    setCopied(false);

    if (!result.formattedText) {
      showNotice('সিলেক্ট করা অর্ডারগুলোতে কোনো Name বা Number পাওয়া যায়নি।');
    } else {
      showNotice('DTF Print লিস্ট জেনারেট হয়েছে।');
    }
  };

  // Copy entire box content in one click
  const handleCopy = async () => {
    if (!outputText.trim()) return;

    try {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
      showNotice('সব ডাটা কপি হয়েছে!');
      setTimeout(() => setCopied(false), 2200);
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = outputText;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setCopied(true);
        showNotice('সব ডাটা কপি হয়েছে!');
        setTimeout(() => setCopied(false), 2200);
      } catch {
        showNotice('কপি করা যায়নি, অনুগ্রহ করে টেক্সট বক্স থেকে কপি করুন।');
      }
    }
  };

  return (
    <div className="space-y-4">
      {notice && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-2xl bg-neutral-950 text-white text-xs font-bold shadow-2xl border border-white/10">
          {notice}
        </div>
      )}

      {/* Compact Action Toolbar */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          {onGoToOrderProcess && (
            <button
              type="button"
              onClick={onGoToOrderProcess}
              className="px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Order Process</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowOrderPicker((prev) => !prev)}
            className="px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition-all cursor-pointer"
          >
            {showOrderPicker
              ? `Hide Orders (${selectedOrdersInSerial.length} Selected)`
              : `Select Orders (${selectedOrdersInSerial.length} Selected)`}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={selectedOrdersInSerial.length === 0}
            className="px-5 py-2.5 rounded-xl bg-[#0d0f12] hover:bg-black disabled:opacity-40 text-white text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Generate ({selectedOrdersInSerial.length})</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            disabled={!outputText.trim()}
            className={`px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-40 ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Collapsible Order Selector Checklist (for picking orders directly if needed) */}
      {showOrderPicker && (
        <div className="bg-white border border-neutral-200 rounded-3xl p-4 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search order, customer, code, name..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:bg-white focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleToggleSelectAllVisible}
              className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              {isAllVisibleSelected ? (
                <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
              ) : (
                <Square className="w-3.5 h-3.5 text-neutral-500" />
              )}
              <span>{isAllVisibleSelected ? 'Deselect All' : 'Select All'}</span>
            </button>
          </div>

          <div className="max-h-56 overflow-y-auto divide-y divide-neutral-100 border border-neutral-200 rounded-2xl">
            {filteredPickerOrders.length === 0 ? (
              <div className="py-6 text-center text-xs text-neutral-400">
                কোনো অর্ডার পাওয়া যায়নি।
              </div>
            ) : (
              filteredPickerOrders.map((order, idx) => {
                const isSelected = selectedOrderIds.has(order.id);
                const hasCustom = (order.items || []).some((it) => {
                  const { name, number } = extractJerseyNameAndNumber(it);
                  return Boolean(name || number);
                });

                return (
                  <div
                    key={`${order.id}-${idx}`}
                    onClick={() => handleToggleOrder(order.id)}
                    className={`px-3 py-2 flex items-center justify-between gap-3 cursor-pointer text-xs ${
                      isSelected ? 'bg-indigo-50/50' : 'hover:bg-neutral-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-neutral-400 shrink-0" />
                      )}
                      <span className="font-bold text-neutral-900 uppercase truncate">
                        {order.customerName}
                      </span>
                      <span className="text-neutral-400 font-mono text-[11px] truncate">
                        {(order.items || [])
                          .map((it) => {
                            const { name, number } = extractJerseyNameAndNumber(it);
                            return [name, number].filter(Boolean).join(' ');
                          })
                          .filter(Boolean)
                          .join(' | ')}
                      </span>
                    </div>

                    {!hasCustom && (
                      <span className="text-[10px] text-neutral-400 shrink-0">
                        No Name/Num
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SINGLE BIG COPY BOX ONLY */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-4 sm:p-5 shadow-xs">
        <textarea
          readOnly
          value={
            hasGenerated
              ? outputText
              : ''
          }
          placeholder={
            hasGenerated && !outputText
              ? 'সিলেক্ট করা অর্ডারগুলোতে কোনো Name বা Number পাওয়া যায়নি।'
              : 'অর্ডার সিলেক্ট করে Generate বাটনে চাপ দিন — সব DTF Print লাইন এখানে একসাথে দেখাবে...'
          }
          onClick={(e) => {
            if (outputText) (e.target as HTMLTextAreaElement).select();
          }}
          rows={18}
          className="w-full p-5 rounded-2xl bg-[#0d0f12] text-emerald-300 placeholder:text-neutral-500 font-mono text-sm sm:text-base leading-relaxed border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y select-all"
        />
      </div>
    </div>
  );
};
