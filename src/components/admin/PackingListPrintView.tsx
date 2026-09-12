import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Order } from '../../types';
import { Printer, X, CheckSquare, Boxes, FileText, ArrowLeft, Layers } from 'lucide-react';

interface PackingListPrintViewProps {
  orders: Order[];
  onClose: () => void;
}

interface GroupedJerseyItem {
  key: string;
  code: string;
  title: string;
  image: string;
  category?: string;
  sizes: Record<string, number>;
  totalQuantity: number;
  orderCount: number;
}

const STANDARD_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];

export const PackingListPrintView: React.FC<PackingListPrintViewProps> = ({
  orders,
  onClose
}) => {
  // Density toggle: default compact (~24 items per A4 sheet)
  const [layoutMode, setLayoutMode] = useState<'compact_24' | 'table'>('compact_24');

  // Aggregate all jerseys across the selected orders
  const groupedItems = useMemo(() => {
    const map = new Map<string, GroupedJerseyItem>();

    for (const order of orders) {
      if (!Array.isArray(order.items)) continue;

      for (const item of order.items) {
        const code = (item.product?.code || '').trim().toUpperCase();
        const title = (item.product?.title || 'Jersey Item').trim();
        // Unique grouping key by code or title
        const groupKey = code || title.toLowerCase();

        const rawSize = (item.selectedSize || 'L').trim().toUpperCase();
        // Normalize size string
        let normSize = rawSize;
        if (rawSize === '2XL') normSize = 'XXL';
        if (rawSize === 'XXXL') normSize = '3XL';

        const qty = Number(item.quantity) || 1;
        const img = item.product?.images?.[0] || (item.product as any)?.image || '/images/prod_pixel_case_1787668274006.jpg';

        if (!map.has(groupKey)) {
          map.set(groupKey, {
            key: groupKey,
            code: code,
            title: title,
            image: img,
            category: item.product?.category,
            sizes: { [normSize]: qty },
            totalQuantity: qty,
            orderCount: 1
          });
        } else {
          const existing = map.get(groupKey)!;
          existing.sizes[normSize] = (existing.sizes[normSize] || 0) + qty;
          existing.totalQuantity += qty;
          existing.orderCount += 1;
        }
      }
    }

    // Sort by code or totalQuantity descending
    return Array.from(map.values()).sort((a, b) => {
      if (a.code && b.code) return a.code.localeCompare(b.code);
      return b.totalQuantity - a.totalQuantity;
    });
  }, [orders]);

  // Overall totals
  const totalPcs = useMemo(() => {
    return groupedItems.reduce((sum, item) => sum + item.totalQuantity, 0);
  }, [groupedItems]);

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-neutral-900/90 backdrop-blur-sm overflow-y-auto flex flex-col font-sans select-none print:p-0 print:bg-white print:static print:overflow-visible">
      
      {/* =========================================================================
          TOP CONTROL BAR (Hidden during actual print)
          ========================================================================= */}
      <header className="sticky top-0 z-50 bg-[#0d0f12] text-white border-b border-white/10 px-4 py-3 sm:px-6 shadow-xl flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-all cursor-pointer"
            title="Close Preview"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-600 flex items-center justify-center text-white font-bold shadow-xs">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold tracking-tight">
                Warehouse Packing List (প্যাকিং লিস্ট)
              </h2>
              <p className="text-[11px] text-neutral-400">
                {orders.length} Orders Selected • {groupedItems.length} Jersey Models • {totalPcs} Total Items
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Layout Mode Selector */}
          <div className="hidden sm:flex items-center bg-white/10 p-0.5 rounded-xl border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setLayoutMode('compact_24')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                layoutMode === 'compact_24' ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-300 hover:text-white'
              }`}
            >
              A4 Grid (24-25 / Page)
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('table')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                layoutMode === 'table' ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-300 hover:text-white'
              }`}
            >
              Clean Table
            </button>
          </div>

          {/* Print Trigger Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Packing List</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-all cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* =========================================================================
          PRINTABLE A4 SHEET CONTAINER
          ========================================================================= */}
      <main className="flex-1 p-3 sm:p-6 flex justify-center print:p-0 print:m-0 print:block">
        <div 
          id="packing-list-print-sheet"
          className="w-full max-w-[210mm] min-h-[297mm] bg-white text-neutral-900 p-6 sm:p-7 shadow-2xl rounded-2xl print:rounded-none print:shadow-none print:p-3 print:max-w-none print:w-full print:border-none mx-auto"
        >
          
          {/* Header Row on A4 */}
          <div className="border-b-2 border-neutral-900 pb-2.5 mb-3 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-neutral-950 flex items-center justify-center text-white font-mono font-black text-sm">
                S
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black tracking-tight uppercase leading-none text-neutral-950">
                  SPIDEY JERSEY • WAREHOUSE PACKING LIST
                </h1>
                <p className="text-[10px] text-neutral-600 font-medium mt-1">
                  আইটেম ও সাইজ সামারি তালিকা (Grouped by Jersey Model & Size)
                </p>
              </div>
            </div>

            <div className="text-right text-[11px] leading-tight">
              <div className="font-bold text-neutral-900 font-mono">
                Date: {currentDate} {currentTime}
              </div>
              <div className="text-neutral-600 font-medium mt-0.5">
                Orders: <span className="font-bold text-neutral-950 font-mono">{orders.length}</span> | 
                Total Qty: <span className="font-black text-neutral-950 font-mono text-xs ml-1 bg-neutral-100 px-1.5 py-0.5 rounded">{totalPcs} pcs</span>
              </div>
            </div>
          </div>

          {/* Empty State */}
          {groupedItems.length === 0 ? (
            <div className="py-20 text-center text-neutral-500">
              <Boxes className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
              <p className="text-sm font-bold">No jersey items found in the selected orders.</p>
            </div>
          ) : layoutMode === 'compact_24' ? (
            /* =========================================================================
               MODE 1: 2-COLUMN A4 COMPACT GRID (~24-25 ITEMS PER PAGE)
               ========================================================================= */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 print:grid-cols-2 print:gap-1.5">
              {groupedItems.map((item, index) => {
                // Collect ordered sizes with quantities > 0
                const orderedSizePairs = Object.entries(item.sizes)
                  .filter(([_, qty]) => Number(qty) > 0)
                  .map(([s, qty]) => [s, Number(qty)] as [string, number]);
                
                // Sort sizes standard: S, M, L, XL, XXL, 3XL, then others
                orderedSizePairs.sort(([sA], [sB]) => {
                  const idxA = STANDARD_SIZES.indexOf(sA);
                  const idxB = STANDARD_SIZES.indexOf(sB);
                  if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                  if (idxA !== -1) return -1;
                  if (idxB !== -1) return 1;
                  return sA.localeCompare(sB);
                });

                return (
                  <div
                    key={item.key}
                    className="flex items-center gap-2 p-1.5 sm:p-2 rounded-xl border border-neutral-300 bg-white hover:border-neutral-400 print:border-neutral-400 print:rounded-lg break-inside-avoid shadow-2xs"
                    style={{ minHeight: '52px' }}
                  >
                    {/* Index + Warehouse Checkbox */}
                    <div className="flex flex-col items-center justify-center shrink-0 w-5">
                      <span className="text-[9px] font-mono font-bold text-neutral-500">
                        #{index + 1}
                      </span>
                      <div className="w-3.5 h-3.5 border border-neutral-400 rounded-sm mt-0.5 bg-white print:border-neutral-900" />
                    </div>

                    {/* Product Thumbnail */}
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-neutral-100 border border-neutral-200 p-0.5 shrink-0 flex items-center justify-center overflow-hidden">
                      <img
                        src={item.image}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>

                    {/* Jersey Details & Size Breakdown */}
                    <div className="flex-1 min-w-0 pr-1">
                      {/* Top row: Code badge + Title */}
                      <div className="flex items-center gap-1.5 leading-tight">
                        {item.code && (
                          <span className="font-mono font-black text-[10px] sm:text-[11px] bg-neutral-900 text-white px-1.5 py-0.2 rounded shrink-0">
                            {item.code}
                          </span>
                        )}
                        <h3 className="font-bold text-[11px] sm:text-xs text-neutral-900 truncate" title={item.title}>
                          {item.title}
                        </h3>
                      </div>

                      {/* Serial Size breakdown pills */}
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        {orderedSizePairs.map(([sizeName, qty]) => (
                          <span
                            key={sizeName}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-[10px] sm:text-[11px] font-bold text-neutral-900 leading-none"
                          >
                            <span className="text-neutral-500 font-semibold">{sizeName}:</span>
                            <span className="font-black text-neutral-950 font-mono">{qty}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Total Quantity for this Jersey */}
                    <div className="text-right shrink-0 pl-1 border-l border-neutral-200">
                      <span className="text-[9px] uppercase font-bold text-neutral-500 block leading-none">
                        Total
                      </span>
                      <span className="text-xs sm:text-sm font-black text-neutral-950 font-mono block leading-tight">
                        {item.totalQuantity} <span className="text-[9px] font-normal text-neutral-600">pc</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* =========================================================================
               MODE 2: COMPACT TABLE VIEW
               ========================================================================= */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-100 text-neutral-800 font-bold border-y border-neutral-300 text-[10px] uppercase tracking-wider">
                    <th className="py-2 px-2 w-8 text-center">Chk</th>
                    <th className="py-2 px-2 w-8">#</th>
                    <th className="py-2 px-2 w-12 text-center">Image</th>
                    <th className="py-2 px-2">Code</th>
                    <th className="py-2 px-3">Jersey Title</th>
                    <th className="py-2 px-3">Sizes Ordered (Qty)</th>
                    <th className="py-2 px-3 text-right">Total Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 font-sans text-xs">
                  {groupedItems.map((item, idx) => {
                    const orderedSizePairs = Object.entries(item.sizes)
                      .filter(([_, q]) => Number(q) > 0)
                      .map(([s, q]) => [s, Number(q)] as [string, number]);
                    return (
                      <tr key={item.key} className="break-inside-avoid hover:bg-neutral-50">
                        <td className="py-1.5 px-2 text-center">
                          <div className="w-3.5 h-3.5 border border-neutral-400 rounded-sm mx-auto bg-white" />
                        </td>
                        <td className="py-1.5 px-2 text-neutral-500 font-mono font-bold text-[10px]">
                          {idx + 1}
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <img
                            src={item.image}
                            alt=""
                            className="w-8 h-8 object-contain rounded border border-neutral-200 mx-auto"
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                        </td>
                        <td className="py-1.5 px-2 font-mono font-black text-neutral-900 text-[11px]">
                          {item.code || '-'}
                        </td>
                        <td className="py-1.5 px-3 font-bold text-neutral-900 text-xs">
                          {item.title}
                        </td>
                        <td className="py-1.5 px-3">
                          <div className="flex flex-wrap gap-1">
                            {orderedSizePairs.map(([sName, q]) => (
                              <span key={sName} className="px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-[10px] font-bold">
                                {sName}: <strong className="text-neutral-950 font-mono">{q}</strong>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-1.5 px-3 text-right font-black font-mono text-neutral-950 text-xs">
                          {item.totalQuantity} pcs
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer note on A4 */}
          <div className="mt-4 pt-2 border-t border-neutral-200 flex items-center justify-between text-[10px] text-neutral-500">
            <div>
              Spidey Jersey Store Dispatch • Checked By: __________________ • Signature: __________________
            </div>
            <div className="font-mono">
              Total Jerseys: <strong>{totalPcs} pcs</strong> across {orders.length} orders
            </div>
          </div>

        </div>
      </main>

      {/* Print Specific CSS Rules */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          header {
            display: none !important;
          }
          #packing-list-print-sheet {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

    </div>,
    document.body
  );
};
