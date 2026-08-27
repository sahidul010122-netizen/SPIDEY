import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Order } from '../../types';
import { Printer, ArrowLeft, Download, CheckCircle2, Sliders, RefreshCw, ZoomIn, ZoomOut, AlertCircle } from 'lucide-react';
import JsBarcode from 'jsbarcode';

interface CompactInvoicePrintViewProps {
  orders: Order[];
  onClose: () => void;
}

// Helper to get the exact real Steadfast Consignment / Parcel ID (e.g. 289172303) returned from Steadfast
export function getSteadfastParcelId(order: Order): string {
  // 1. Exact real Steadfast Consignment ID / Parcel ID returned upon dispatch
  if (order.consignmentId) {
    const rawCid = String(order.consignmentId).trim();
    const cleanCid = rawCid.replace(/^CID-?/i, '').trim();
    if (cleanCid) {
      return cleanCid;
    }
  }

  // 2. Exact real Steadfast Tracking Code
  if (order.trackingCode) {
    const tc = String(order.trackingCode).trim();
    if (tc) {
      return tc;
    }
  }

  // 3. Fallback only if order is not yet dispatched to Steadfast
  return order.invoiceNumber || order.id || 'PENDING';
}

// Scannable SVG Barcode Renderer using JsBarcode
const ScannableBarcode: React.FC<{ code: string; height?: number; width?: number }> = ({ 
  code, 
  height = 20, 
  width = 1.1 
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && code) {
      try {
        JsBarcode(svgRef.current, code, {
          format: 'CODE128',
          width: width,
          height: height,
          displayValue: false,
          margin: 0,
          background: 'transparent',
          lineColor: '#000000'
        });
      } catch (err) {
        console.warn('Barcode generation failed for:', code, err);
      }
    }
  }, [code, height, width]);

  return (
    <svg 
      ref={svgRef} 
      className="max-h-[22px] w-auto inline-block print:max-h-[20px]" 
      style={{ display: 'block' }}
    />
  );
};

// Single Compact Invoice Slip Component (Snug fitted container, tight image padding, dynamic font scaling)
const CompactInvoiceSlip: React.FC<{ order: Order; index: number }> = ({ order }) => {
  const parcelId = getSteadfastParcelId(order);
  const codAmt = order.codAmount !== undefined ? order.codAmount : order.totalAmount;
  const items = order.items && order.items.length > 0 ? order.items : [
    {
      itemKey: 'fallback-1',
      selectedSize: 'L',
      customName: 'STANDARD PRO',
      quantity: 1,
      product: {
        id: '1',
        title: 'Football Jersey',
        code: 'JERSEY-01',
        images: ['https://images.unsplash.com/photo-1577212017184-80cc0da11082?auto=format&fit=crop&w=200&q=80']
      } as any
    }
  ];
  const itemCount = items.length;
  const isMultiItem = itemCount > 1;
  const useTwoColSubgrid = itemCount >= 3;

  return (
    <article
      className="compact-thermal-slip relative bg-white text-neutral-900 rounded-2xl overflow-hidden border border-neutral-300 shadow-sm print:shadow-none print:border-neutral-900 flex flex-col justify-between break-inside-avoid print:break-inside-avoid print:page-break-inside-avoid w-full max-w-[340px] mx-auto select-none box-border"
      style={{
        width: '100%',
        maxWidth: '340px',
        height: 'auto',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        boxSizing: 'border-box'
      }}
    >
      {/* Red Left Accent Indicator Strip */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-600 z-10" />

      {/* SLIP INNER CONTENT - SNUG FLUSH CONTAINER */}
      <div className="pl-3 pr-2.5 pt-2 pb-2 flex flex-col justify-between h-full w-full box-border gap-1.5">
        
        {/* =========================================================================
            1. HEADER: STEADFAST LOGO, SCANNABLE BARCODE, 9-DIGIT PARCEL ID & RED COLLECT BADGE
            ========================================================================= */}
        <div 
          className="rounded-xl px-2.5 py-1.5 border border-neutral-200/90 relative overflow-hidden bg-white shrink-0"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, #fafafa, #fafafa 5px, #ffffff 5px, #ffffff 10px)'
          }}
        >
          <div className="flex items-center justify-between gap-2">
            
            {/* Left: Steadfast Label, Multi-item count, Barcode & 9-Digit Parcel ID */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-[8.5px] font-bold text-neutral-500 tracking-wider uppercase leading-none mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 inline-block" />
                <span>STEADFAST</span>
                {isMultiItem && (
                  <span className="bg-neutral-900 text-white font-mono px-1.5 py-0.5 rounded text-[7.5px] font-black tracking-normal">
                    {itemCount} JERSEYS
                  </span>
                )}
              </div>

              {/* High-density Compact Scannable Barcode SVG */}
              <div className="bg-white px-1 py-0.5 rounded border border-neutral-200/90 inline-block leading-none mb-0.5">
                <ScannableBarcode code={parcelId} height={16} width={1.05} />
              </div>

              {/* 9-Digit Steadfast Parcel ID */}
              <div className="font-mono font-black text-[13px] tracking-wider text-neutral-950 leading-none">
                #{parcelId}
              </div>
            </div>

            {/* Right: Coral/Red COLLECT COD Badge */}
            <div className="shrink-0 bg-rose-600 text-white rounded-xl px-2.5 py-1.5 text-center shadow-xs min-w-[70px]">
              <span className="text-[8px] font-bold uppercase tracking-wider block opacity-95 text-rose-100 leading-tight">
                COLLECT
              </span>
              <span className="text-sm font-black tracking-tight font-mono block leading-tight">
                ৳{codAmt}
              </span>
            </div>

          </div>
        </div>

        {/* =========================================================================
            2. ITEM DETAILS: ENLARGED PROPORTIONATE IMAGE BOXES & HIGH-VISIBILITY BADGES
            ========================================================================= */}
        <div className={`flex-1 ${useTwoColSubgrid ? 'grid grid-cols-2 gap-1.5' : 'flex flex-col gap-1.5'}`}>
          {items.map((item, itemIdx) => {
            const imgUrl = item.product?.images?.[0] || 'https://images.unsplash.com/photo-1577212017184-80cc0da11082?auto=format&fit=crop&w=200&q=80';
            const sizeVal = item.selectedSize || 'L';
            const customText = item.customName || (item.product?.code ? `[${item.product.code}]` : item.product?.title || 'STANDARD PRO');
            
            // Dynamic text scaling for long names (e.g. LAMINE YAMAL 19)
            const textLen = customText.trim().length;
            const fontClass = textLen > 15 
              ? 'text-[10px]' 
              : textLen > 10 
                ? 'text-[11px]' 
                : 'text-[12.5px]';

            if (useTwoColSubgrid) {
              // High-visibility 2-column item card inside multi-jersey slip (3+ items) with enlarged image box and larger text
              return (
                <div 
                  key={item.itemKey || itemIdx}
                  className="bg-[#343438] text-white rounded-xl p-1.5 shadow-inner border border-neutral-700 flex items-center gap-2 box-border min-h-[58px]"
                >
                  {/* Significantly enlarged image box for 3+ items */}
                  <div className="w-[52px] h-[52px] bg-white rounded-lg p-0.5 border border-neutral-300 shrink-0 overflow-hidden flex items-center justify-center shadow-xs">
                    <img
                      src={imgUrl}
                      alt={item.product?.title || 'Jersey'}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold text-amber-300 font-mono leading-none">#{itemIdx + 1}</span>
                      <span className="text-[9px] font-bold text-neutral-300 uppercase tracking-tight">SIZE</span>
                      <span className="bg-neutral-950 text-white font-black text-[10.5px] font-mono px-1.5 py-0.5 rounded border border-neutral-600 leading-none shadow-xs">
                        {sizeVal}
                      </span>
                    </div>
                    <div className="w-full">
                      <div className={`inline-block bg-white text-neutral-950 font-black ${textLen > 12 ? 'text-[9.5px]' : 'text-[10.5px]'} font-mono px-1.5 py-0.5 rounded shadow-xs tracking-tight uppercase truncate max-w-full border border-neutral-200 leading-snug`}>
                        {customText}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // Snug, flush container for 1 or 2 items
            const isSingleItem = itemCount === 1;
            return (
              <div 
                key={item.itemKey || itemIdx}
                className={`bg-[#343438] text-white rounded-xl p-1.5 shadow-inner border border-neutral-700 flex items-center gap-2.5 box-border ${
                  isSingleItem ? 'min-h-[76px]' : 'min-h-[64px]'
                }`}
              >
                {/* Snug White Rounded Box for Jersey Image Thumbnail */}
                <div className={`${isSingleItem ? 'w-[74px] h-[74px]' : 'w-[58px] h-[58px]'} bg-white rounded-xl p-0.5 border border-neutral-300 shrink-0 overflow-hidden flex items-center justify-center shadow-xs`}>
                  <img
                    src={imgUrl}
                    alt={item.product?.title || 'Jersey'}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Right: Size & Custom Name/Number integrated row */}
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
                  <div className="flex items-center gap-1.5">
                    {isMultiItem && (
                      <span className="text-[9px] font-bold text-amber-300 uppercase tracking-tight font-mono">
                        #{itemIdx + 1}
                      </span>
                    )}
                    <span className="text-[9.5px] font-bold text-neutral-300 uppercase tracking-wider">
                      SIZE
                    </span>
                    <span className="bg-neutral-950 text-white font-black text-xs font-mono px-2 py-0.5 rounded-md border border-neutral-600 shadow-xs leading-none">
                      {sizeVal}
                    </span>
                  </div>

                  {/* Auto-Scaled Custom Name & Number Badge Pill */}
                  <div className="w-full">
                    <div className={`inline-block bg-white text-neutral-950 font-black ${fontClass} font-mono px-2.5 py-0.5 rounded-lg shadow-xs tracking-tight uppercase truncate max-w-full border border-neutral-200 leading-normal`}>
                      {customText}
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>

        {/* =========================================================================
            3. OPTIONAL EXCHANGE PARCEL NOTICE
            ========================================================================= */}
        {order.isExchange && (
          <div className="border-t border-neutral-200 pt-0.5">
            <div className="bg-neutral-900 text-white px-1.5 py-0.5 font-bold text-center uppercase tracking-wider rounded text-[8px] leading-tight">
              ⚠️ EXCHANGE (রিসিভ করে রিটার্ন নিন)
            </div>
          </div>
        )}

      </div>
    </article>
  );
};

export const CompactInvoicePrintView: React.FC<CompactInvoicePrintViewProps> = ({
  orders,
  onClose
}) => {
  const [printLayout, setPrintLayout] = useState<'a4_grid' | 'thermal_roll'>('a4_grid');
  const [autoOptimizeOrder, setAutoOptimizeOrder] = useState<boolean>(true);
  const [scale, setScale] = useState<number>(100);
  const [isPrinting, setIsPrinting] = useState(false);
  const printableAreaRef = useRef<HTMLDivElement | null>(null);

  // 1. Intelligent Ordering base list
  const orderedList = useMemo(() => {
    return [...orders];
  }, [orders]);

  // 2. High-Density Zero-Waste 2-Column Multi-Bin A4 Page Packer
  // Accurately measures physical slip heights (in mm) so multi-item and single-item orders pack tightly with zero wasted space
  const orderPages = useMemo(() => {
    const remainingOrders = [...orderedList];
    if (autoOptimizeOrder) {
      // Sort descending by item count (bulk orders first, then doubles, then singles) to pack large containers first
      remainingOrders.sort((a, b) => {
        const countA = a.items?.length || 1;
        const countB = b.items?.length || 1;
        if (countA !== countB) return countB - countA;
        return (a.id || '').localeCompare(b.id || '');
      });
    }

    const pages: { leftColumn: Order[]; rightColumn: Order[] }[] = [];
    const MAX_COLUMN_HEIGHT_MM = 276; // Full printable A4 height budget per column (approx 276mm out of 297mm)
    const GAP_MM = 2.5; // Gap between slips

    const getOrderHeightMm = (order: Order): number => {
      const count = order.items?.length || 1;
      if (count === 1) return 59;
      if (count === 2) return 75;
      if (count <= 4) return 73; // 3 or 4 items in 2-col subgrid take 2 rows
      if (count <= 6) return 96; // 5 or 6 items in 2-col subgrid take 3 rows
      return 96 + Math.ceil((count - 6) / 2) * 23;
    };

    while (remainingOrders.length > 0) {
      const leftCol: Order[] = [];
      const rightCol: Order[] = [];
      let leftHeight = 0;
      let rightHeight = 0;

      let canFitMore = true;
      while (canFitMore && remainingOrders.length > 0) {
        // Choose column with lower current height
        const targetCol = leftHeight <= rightHeight ? 'left' : 'right';
        const targetCurrentHeight = targetCol === 'left' ? leftHeight : rightHeight;
        const targetCount = targetCol === 'left' ? leftCol.length : rightCol.length;
        const neededGap = targetCount > 0 ? GAP_MM : 0;
        const availableSpace = MAX_COLUMN_HEIGHT_MM - targetCurrentHeight - neededGap;

        // Find best fitting remaining order that fits in availableSpace
        const fitIndex = remainingOrders.findIndex(order => getOrderHeightMm(order) <= availableSpace + 2);

        if (fitIndex !== -1) {
          const [orderToPlace] = remainingOrders.splice(fitIndex, 1);
          const h = getOrderHeightMm(orderToPlace);
          if (targetCol === 'left') {
            leftCol.push(orderToPlace);
            leftHeight += h + (leftCol.length > 1 ? GAP_MM : 0);
          } else {
            rightCol.push(orderToPlace);
            rightHeight += h + (rightCol.length > 1 ? GAP_MM : 0);
          }
        } else {
          // Check if the OTHER column has room for any remaining order
          const otherCol = targetCol === 'left' ? 'right' : 'left';
          const otherCurrentHeight = otherCol === 'left' ? leftHeight : rightHeight;
          const otherCount = otherCol === 'left' ? leftCol.length : rightCol.length;
          const otherNeededGap = otherCount > 0 ? GAP_MM : 0;
          const otherAvailableSpace = MAX_COLUMN_HEIGHT_MM - otherCurrentHeight - otherNeededGap;
          const otherFitIndex = remainingOrders.findIndex(order => getOrderHeightMm(order) <= otherAvailableSpace + 2);

          if (otherFitIndex !== -1) {
            const [orderToPlace] = remainingOrders.splice(otherFitIndex, 1);
            const h = getOrderHeightMm(orderToPlace);
            if (otherCol === 'left') {
              leftCol.push(orderToPlace);
              leftHeight += h + (leftCol.length > 1 ? GAP_MM : 0);
            } else {
              rightCol.push(orderToPlace);
              rightHeight += h + (rightCol.length > 1 ? GAP_MM : 0);
            }
          } else {
            // Neither column on this page can fit any remaining order
            canFitMore = false;
          }
        }
      }

      // If page is completely empty but items remain (e.g. oversize order), force place the first one
      if (leftCol.length === 0 && rightCol.length === 0 && remainingOrders.length > 0) {
        const forcedOrder = remainingOrders.shift()!;
        leftCol.push(forcedOrder);
      }

      pages.push({ leftColumn: leftCol, rightColumn: rightCol });
    }

    return pages.length > 0 ? pages : [{ leftColumn: [], rightColumn: [] }];
  }, [orderedList, autoOptimizeOrder]);

  // Direct bulletproof print trigger using an isolated clean print frame
  const handlePrint = () => {
    if (!printableAreaRef.current) return;
    setIsPrinting(true);

    try {
      // Create an invisible iframe exclusively for printing invoices
      const printIframe = document.createElement('iframe');
      printIframe.name = 'invoice-print-frame';
      printIframe.style.position = 'fixed';
      printIframe.style.top = '-9999px';
      printIframe.style.left = '-9999px';
      printIframe.style.width = '0px';
      printIframe.style.height = '0px';
      printIframe.style.border = 'none';
      printIframe.style.opacity = '0';
      document.body.appendChild(printIframe);

      const contentHtml = printableAreaRef.current.innerHTML;
      const frameDoc = printIframe.contentWindow?.document || printIframe.contentDocument;

      if (!frameDoc || !printIframe.contentWindow) {
        throw new Error('Could not access print iframe document');
      }

      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invoices Print - Spidey Jersey Store</title>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @page {
                size: ${printLayout === 'a4_grid' ? 'A4 portrait' : '80mm auto'};
                margin: 5mm 4mm;
              }
              *, *::before, *::after {
                box-sizing: border-box !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
                box-shadow: none !important;
                text-shadow: none !important;
              }
              html, body {
                background: #ffffff !important;
                background-color: #ffffff !important;
                color: #000000 !important;
                padding: 0 !important;
                margin: 0 !important;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              }
              .a4-print-page {
                page-break-after: always !important;
                break-after: page !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                width: 100% !important;
                display: block !important;
                margin: 0 auto !important;
                padding: 2px !important;
              }
              .a4-print-page:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
              }
              .a4-two-columns {
                display: flex !important;
                flex-direction: row !important;
                gap: 12px !important;
                align-items: flex-start !important;
                width: 100% !important;
                max-width: 200mm !important;
                margin: 0 auto !important;
              }
              .a4-column-stack {
                flex: 1 1 50% !important;
                width: 50% !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 8px !important;
                align-items: stretch !important;
              }
              .compact-thermal-slip {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                margin: 0 auto !important;
                border: 1.5px solid #171717 !important;
                background: #ffffff !important;
                background-color: #ffffff !important;
                box-shadow: none !important;
                border-radius: 12px !important;
                width: 100% !important;
                max-width: 95mm !important;
                box-sizing: border-box !important;
              }
            </style>
          </head>
          <body>
            <div style="width: 100%; max-width: 200mm; margin: 0 auto;">
              ${contentHtml}
            </div>
          </body>
        </html>
      `);
      frameDoc.close();

      // Trigger print after Tailwind styles and barcodes are ready
      setTimeout(() => {
        try {
          printIframe.contentWindow?.focus();
          printIframe.contentWindow?.print();
        } catch (err) {
          console.warn('Iframe print failed, falling back to window.print:', err);
          window.print();
        } finally {
          setIsPrinting(false);
          // Cleanup iframe after a minute
          setTimeout(() => {
            try {
              if (document.body.contains(printIframe)) {
                document.body.removeChild(printIframe);
              }
            } catch (e) {}
          }, 60000);
        }
      }, 400);

    } catch (e) {
      console.warn('Isolated frame printing failed:', e);
      setIsPrinting(false);
      window.print();
    }
  };

  // Standalone Popup Window Printer (Bypasses iframe sandboxes cleanly)
  const handlePrintInNewWindow = () => {
    if (!printableAreaRef.current) return;
    
    try {
      const printWindow = window.open('', '_blank', 'width=900,height=800');
      if (!printWindow) {
        alert('Please allow popups for this site to open the invoice print preview.');
        return;
      }

      const contentHtml = printableAreaRef.current.innerHTML;
      
      printWindow.document.open();
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invoices Print - Spidey Jersey Store</title>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @page {
                margin: 5mm 4mm;
                size: A4 portrait;
              }
              *, *::before, *::after {
                box-sizing: border-box !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
                box-shadow: none !important;
              }
              html, body {
                background: #ffffff !important;
                color: #000000 !important;
                padding: 0 !important;
                margin: 0 !important;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              }
              .a4-print-page {
                page-break-after: always !important;
                break-after: page !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                width: 100% !important;
                display: block !important;
                margin: 0 auto !important;
              }
              .a4-print-page:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
              }
              .a4-two-columns {
                display: flex !important;
                flex-direction: row !important;
                gap: 12px !important;
                align-items: flex-start !important;
                width: 100% !important;
                max-width: 200mm !important;
                margin: 0 auto !important;
              }
              .a4-column-stack {
                flex: 1 1 50% !important;
                width: 50% !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 8px !important;
                align-items: stretch !important;
              }
              .compact-thermal-slip {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                margin: 0 auto !important;
                border: 1.5px solid #171717 !important;
                background-color: #ffffff !important;
                border-radius: 12px !important;
                width: 100% !important;
                max-width: 95mm !important;
              }
            </style>
          </head>
          <body>
            <div style="width: 100%; max-width: 200mm; margin: 0 auto; padding: 4px;">
              ${contentHtml}
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.focus();
                  window.print();
                }, 300);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.error('Failed to open standalone print window:', err);
      window.print();
    }
  };

  // Keyboard shortcut (Ctrl+P / Cmd+P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        handlePrint();
      }
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div id="invoice-print-portal" className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-md overflow-y-auto flex flex-col print:bg-white print:static print:overflow-visible print:inset-auto print:p-0 print:m-0">
      
      {/* Scoped CSS for on-screen A4 Preview & Print fidelity */}
      <style dangerouslySetInnerHTML={{ __html: `
        .a4-print-page {
          width: 100%;
          max-width: 210mm;
          min-height: 290mm;
          margin: 0 auto 24px auto;
          background: #ffffff;
          padding: 16px 14px;
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
          box-sizing: border-box;
        }
        .a4-two-columns {
          display: flex;
          flex-direction: row;
          gap: 14px;
          align-items: flex-start;
          width: 100%;
        }
        .a4-column-stack {
          flex: 1 1 50%;
          width: 50%;
          display: flex;
          flex-direction: column;
          gap: 10px;
          align-items: stretch;
        }
        @media print {
          .a4-print-page {
            margin: 0 auto !important;
            padding: 4px !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            page-break-after: always !important;
            break-after: page !important;
            min-height: auto !important;
          }
          .a4-two-columns {
            display: flex !important;
            flex-direction: row !important;
            gap: 12px !important;
            align-items: flex-start !important;
            width: 100% !important;
          }
          .a4-column-stack {
            flex: 1 1 50% !important;
            width: 50% !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
            align-items: stretch !important;
          }
        }
      `}} />

      {/* =========================================================================
          TOP NAVIGATION & PRINT CONTROL TOOLBAR (Hidden during actual print)
          ========================================================================= */}
      <header className="sticky top-0 z-50 bg-neutral-900 border-b border-neutral-800 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-white print:hidden shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition-all hover:scale-105 active:scale-95"
            title="Back to Admin Dashboard (Esc)"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold tracking-tight text-white">
                Invoice Print Center ({orders.length} {orders.length === 1 ? 'Parcel' : 'Parcels'})
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-mono font-bold">
                {orderPages.length} {orderPages.length === 1 ? 'A4 Sheet' : 'A4 Sheets'}
              </span>
              {autoOptimizeOrder && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                  ⚡ Auto-Optimized A4 Packing
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-400">
              মাল্টিপল জার্সি পার্সেল সাপোর্টসহ অটো-অপ্টিমাইজড A4 প্রিন্ট লেআউট
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Auto-Optimized Sorting Toggle */}
          <button
            onClick={() => setAutoOptimizeOrder(!autoOptimizeOrder)}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              autoOptimizeOrder 
                ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300' 
                : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-neutral-200'
            }`}
            title="স্মার্ট পেজ স্পেস সেভিং: সিঙ্গেল অর্ডার আগে, মাল্টি-অর্ডার পরে সাজানো"
          >
            <span>⚡ স্মার্ট স্পেস অপ্টিমাইজেশন</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${autoOptimizeOrder ? 'bg-emerald-600 text-white' : 'bg-neutral-700 text-neutral-300'}`}>
              {autoOptimizeOrder ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Layout Mode Toggle */}
          <div className="hidden sm:flex items-center bg-neutral-800 rounded-xl p-1 border border-neutral-700">
            <button
              onClick={() => setPrintLayout('a4_grid')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                printLayout === 'a4_grid' ? 'bg-neutral-700 text-white shadow-xs' : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Fit multiple slips onto A4 sheets"
            >
              A4 Sheet Batch
            </button>
            <button
              onClick={() => setPrintLayout('thermal_roll')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                printLayout === 'thermal_roll' ? 'bg-neutral-700 text-white shadow-xs' : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Continuous 3-inch thermal paper roll (POS printer)"
            >
              Thermal Roll (3-Inch)
            </button>
          </div>

          {/* Scale Adjustment */}
          <div className="hidden md:flex items-center gap-1 bg-neutral-800 px-2 py-1 rounded-xl border border-neutral-700 text-xs">
            <button
              onClick={() => setScale(s => Math.max(70, s - 10))}
              className="p-1 hover:text-white text-neutral-400"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] text-neutral-300 w-9 text-center font-bold">
              {scale}%
            </span>
            <button
              onClick={() => setScale(s => Math.min(130, s + 10))}
              className="p-1 hover:text-white text-neutral-400"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* New Window Quick Popout Button */}
          <button
            onClick={handlePrintInNewWindow}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white text-xs font-semibold transition-all border border-neutral-700 hover:scale-105 active:scale-95"
            title="Open in a standalone clean window to print without iframe restrictions"
          >
            <Download className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">New Window Print</span>
          </button>

          {/* Primary Print Button */}
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex items-center gap-2 px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
            title="Open browser print dialogue (Ctrl+P)"
          >
            <Printer className="w-4 h-4 text-white" />
            <span>{isPrinting ? 'Opening...' : `Print ${orders.length} Invoices`}</span>
          </button>
        </div>
      </header>

      {/* =========================================================================
          PRINT CANVAS & INVOICE SLIPS
          ========================================================================= */}
      <main id="invoice-print-container" className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 print:p-0 print:m-0 print:max-w-none flex flex-col items-center">
        
        {/* Printable Grid Wrapper */}
        <div 
          ref={printableAreaRef}
          className="w-full transition-all print:transform-none print:scale-100 flex flex-col gap-6 print:gap-0"
          style={{ transform: `scale(${scale / 100})`, transformOrigin: 'top center' }}
        >
          {orderPages.map((pageData, pageIdx) => {
            const totalParcelsOnPage = pageData.leftColumn.length + pageData.rightColumn.length;
            return (
              <div 
                key={`page-${pageIdx}`}
                className="a4-print-page w-full"
              >
                {/* On-screen page indicator (hidden when printing) */}
                {orderPages.length > 1 && (
                  <div className="text-center mb-2 text-xs font-mono font-bold text-neutral-400 print:hidden flex items-center justify-center gap-2">
                    <span className="w-8 h-px bg-neutral-700 inline-block" />
                    <span>A4 SHEET #{pageIdx + 1} ({totalParcelsOnPage} PARCELS)</span>
                    <span className="w-8 h-px bg-neutral-700 inline-block" />
                  </div>
                )}

                {/* 2 Independent Flex Columns of Slips (Zero-Waste Packing) */}
                <div className="a4-two-columns">
                  {/* Left Column Stack */}
                  <div className="a4-column-stack">
                    {pageData.leftColumn.map((order, slipIdx) => (
                      <CompactInvoiceSlip 
                        key={order.id || `l-${pageIdx}-${slipIdx}`}
                        order={order}
                        index={slipIdx}
                      />
                    ))}
                  </div>

                  {/* Right Column Stack */}
                  <div className="a4-column-stack">
                    {pageData.rightColumn.map((order, slipIdx) => (
                      <CompactInvoiceSlip 
                        key={order.id || `r-${pageIdx}-${slipIdx}`}
                        order={order}
                        index={slipIdx}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Print instructions hint (hidden during print) */}
        <div className="mt-8 text-center text-xs text-neutral-400 print:hidden flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 text-neutral-400" />
          <span>Tip: In the print dialog, ensure <strong>"Background graphics"</strong> is checked for highest quality colors.</span>
        </div>

      </main>
    </div>,
    document.body
  );
};
