import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Order } from '../../types';
import { Printer, ArrowLeft, Download, CheckCircle2, Sliders, RefreshCw, ZoomIn, ZoomOut, AlertCircle, Sparkles } from 'lucide-react';
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

// Scannable SVG Barcode Renderer using JsBarcode with enlarged dimensions for rapid camera auto-detection
const ScannableBarcode: React.FC<{ code: string; height?: number; width?: number }> = ({ 
  code, 
  height = 32, 
  width = 1.6 
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
          margin: 2,
          background: '#ffffff',
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
      className="max-h-[38px] w-auto inline-block print:max-h-[36px]" 
      style={{ display: 'block' }}
    />
  );
};

// Helper to parse customization into player name and number cleanly
export function parseJerseyCustomization(rawText: string) {
  const trimmed = (rawText || '').trim();
  // Match trailing number (e.g. "DAVID 40", "TASIN 5", "LAMINE YAMAL 19", "RONALDO #7")
  const match = trimmed.match(/^(.*?)(?:\s+|#)(\d{1,3})$/);
  if (match && match[1].trim()) {
    return {
      name: match[1].trim(),
      number: match[2].trim(),
      hasNumber: true,
      original: trimmed
    };
  }
  return {
    name: trimmed,
    number: '',
    hasNumber: false,
    original: trimmed
  };
}

// Reusable Vertical Pill with smart text-wrapping, separate number slot & black size badge
const JerseyCustomPill: React.FC<{
  size: string;
  customText: string;
  heightClass?: string;
  widthClass?: string;
}> = ({ size, customText, heightClass = 'h-[96px]', widthClass = 'w-[38px]' }) => {
  const parsed = parseJerseyCustomization(customText);
  const namePart = parsed.name;
  const numPart = parsed.number;
  const nameLen = namePart.length;
  const sizeVal = size || 'L';

  return (
    <div className={`${widthClass} ${heightClass} bg-white rounded-xl py-1.5 px-0.5 border border-neutral-300 shadow-xs flex flex-col justify-between items-center shrink-0 box-border`}>
      {/* 1. Name Section with dynamic scaling, auto text wrapping, never overlaps */}
      <div className="flex-1 flex items-center justify-center overflow-hidden w-full py-0.5 min-h-0">
        <span 
          className="font-mono font-black text-neutral-950 uppercase tracking-tight select-none block text-center"
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            fontSize: nameLen > 16 ? '8px' : nameLen > 11 ? '9px' : nameLen > 6 ? '10px' : '11.5px',
            maxHeight: numPart ? '48px' : '62px',
            lineHeight: 1.05
          }}
        >
          {namePart || 'PRO'}
        </span>
      </div>

      {/* 2. Number Badge (if present) - positioned cleanly above size badge */}
      {numPart && (
        <div className="text-[10px] font-mono font-black text-neutral-950 bg-neutral-100 rounded px-1 py-0.5 border border-neutral-300 leading-none shrink-0 mb-1">
          {numPart}
        </div>
      )}

      {/* 3. Black Size Badge at Bottom - high contrast, guaranteed no overlap */}
      <div className={`bg-neutral-950 text-white font-mono font-black ${sizeVal.length > 2 ? 'text-[9.5px]' : 'text-[11px]'} w-[26px] h-[22px] flex items-center justify-center rounded-md leading-none shrink-0 shadow-xs`}>
        {sizeVal}
      </div>
    </div>
  );
};

// Single Compact Invoice Slip Component (4-inch width, enlarged image box, vertical pill layout matching reference)
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

  return (
    <article
      className="compact-thermal-slip relative bg-white text-neutral-900 rounded-2xl overflow-hidden border border-neutral-300 shadow-sm print:shadow-none print:border-neutral-900 flex flex-col justify-between break-inside-avoid print:break-inside-avoid print:page-break-inside-avoid select-none box-border"
      style={{
        width: '4in',
        maxWidth: '4in',
        minWidth: '4in',
        height: 'auto',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        boxSizing: 'border-box'
      }}
    >
      {/* Red Left Accent Indicator Strip */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-600 z-10" />

      {/* SLIP INNER CONTENT */}
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

              {/* High-visibility Enlarged Scannable Barcode SVG */}
              <div className="bg-white px-1.5 py-0.5 rounded-md border border-neutral-300 inline-block leading-none mb-1 shadow-2xs">
                <ScannableBarcode code={parcelId} height={30} width={1.55} />
              </div>

              {/* 9-Digit Steadfast Parcel ID */}
              <div className="font-mono font-black text-[14px] tracking-wider text-neutral-950 leading-none">
                #{parcelId}
              </div>
            </div>

            {/* Right: Coral/Red COLLECT COD Badge */}
            <div className="shrink-0 bg-rose-600 text-white rounded-xl px-2.5 py-1.5 text-center shadow-xs min-w-[72px]">
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
            2. ITEM DETAILS CONTAINER (DARK GRAY BACKGROUND AS IN REFERENCE IMAGE)
               - True 1:1 (5:5) Square Image Frames with increased size & clarity
               - Single order: Large 1:1 square image (98px x 98px) + vertical pill + product info
               - Multi order (2, 3, 4, 5, 6+): 2-Column Grid with 1:1 square images (96px x 96px) + vertical pills
            ========================================================================= */}
        <div className="bg-[#2d2d31] rounded-2xl p-2.5 border border-neutral-700/80 shadow-inner">
          {itemCount === 1 ? (
            /* Single Jersey Layout: Large 1:1 Square Image + Vertical Pill + Product Title */
            (() => {
              const item = items[0];
              const imgUrl = item.product?.images?.[0] || 'https://images.unsplash.com/photo-1577212017184-80cc0da11082?auto=format&fit=crop&w=300&q=80';
              const sizeVal = item.selectedSize || 'L';
              const customText = item.customName || (item.product?.code ? `[${item.product.code}]` : item.product?.title || 'STANDARD PRO');

              return (
                <div className="flex items-center gap-3 h-[98px]">
                  {/* True 1:1 (5:5) Square White Image Box - Full Fit */}
                  <div className="w-[98px] h-[98px] aspect-square bg-white rounded-xl border-2 border-neutral-200 shrink-0 overflow-hidden flex items-center justify-center shadow-xs box-border p-0">
                    <img
                      src={imgUrl}
                      alt={item.product?.title || 'Jersey'}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* White Vertical Pill Beside Image */}
                  <JerseyCustomPill
                    size={sizeVal}
                    customText={customText}
                    widthClass="w-[40px]"
                    heightClass="h-[98px]"
                  />

                  {/* Product Title & Code Info on Dark Container */}
                  <div className="flex-1 min-w-0 pl-1 flex flex-col justify-center gap-1.5 text-white">
                    <div className="text-xs font-bold text-neutral-100 line-clamp-2 leading-snug uppercase tracking-tight">
                      {item.product?.title || 'PREMIUM FOOTBALL JERSEY'}
                    </div>
                    {item.product?.code && (
                      <div className="text-[11px] font-mono text-amber-300 font-bold tracking-wide">
                        #{item.product.code}
                      </div>
                    )}
                    {item.quantity && item.quantity > 1 && (
                      <div className="text-[10px] font-mono font-bold text-rose-300">
                        QTY: {item.quantity}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          ) : (
            /* Multi-Jersey Layout (2, 3, 4, 5, 6+ jerseys): 2-Column Grid with 1:1 (5:5) Square Image Boxes */
            <div className="grid grid-cols-2 gap-2.5">
              {items.map((item, itemIdx) => {
                const imgUrl = item.product?.images?.[0] || 'https://images.unsplash.com/photo-1577212017184-80cc0da11082?auto=format&fit=crop&w=300&q=80';
                const sizeVal = item.selectedSize || 'L';
                const customText = item.customName || (item.product?.code ? `[${item.product.code}]` : item.product?.title || 'STANDARD PRO');

                return (
                  <div 
                    key={item.itemKey || itemIdx}
                    className="flex items-center justify-between gap-1.5 h-[96px] min-w-0"
                  >
                    {/* True 1:1 (5:5) Square Proportioned White Image Box - Full Fit */}
                    <div className="w-[96px] h-[96px] aspect-square bg-white rounded-xl border-2 border-neutral-200 shrink-0 overflow-hidden flex items-center justify-center shadow-xs box-border p-0">
                      <img
                        src={imgUrl}
                        alt={item.product?.title || 'Jersey'}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* White Rounded Vertical Pill (Player Name Rotated + Number + Black Size Badge at Bottom) */}
                    <JerseyCustomPill
                      size={sizeVal}
                      customText={customText}
                      widthClass="w-[38px]"
                      heightClass="h-[96px]"
                    />
                  </div>
                );
              })}
            </div>
          )}
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
      if (count === 1) return 66;
      if (count === 2) return 66;
      if (count <= 4) return 96; // 2 rows in 2-column grid
      if (count <= 6) return 126; // 3 rows in 2-column grid
      return 126 + Math.ceil((count - 6) / 2) * 30;
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
                gap: 8px !important;
                align-items: flex-start !important;
                justify-content: center !important;
                width: 100% !important;
                max-width: 210mm !important;
                margin: 0 auto !important;
              }
              .a4-column-stack {
                flex: 0 0 4in !important;
                width: 4in !important;
                max-width: 4in !important;
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
                border-radius: 14px !important;
                width: 4in !important;
                max-width: 4in !important;
                min-width: 4in !important;
                box-sizing: border-box !important;
              }
            </style>
          </head>
          <body>
            <div style="width: 100%; max-width: 210mm; margin: 0 auto;">
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
                gap: 8px !important;
                align-items: flex-start !important;
                justify-content: center !important;
                width: 100% !important;
                max-width: 210mm !important;
                margin: 0 auto !important;
              }
              .a4-column-stack {
                flex: 0 0 4in !important;
                width: 4in !important;
                max-width: 4in !important;
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
                border-radius: 14px !important;
                width: 4in !important;
                max-width: 4in !important;
                min-width: 4in !important;
                box-sizing: border-box !important;
              }
            </style>
          </head>
          <body>
            <div style="width: 100%; max-width: 210mm; margin: 0 auto; padding: 2px;">
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
          padding: 12px 6px;
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
          box-sizing: border-box;
        }
        .a4-two-columns {
          display: flex;
          flex-direction: row;
          gap: 8px;
          justify-content: center;
          align-items: flex-start;
          width: 100%;
        }
        .a4-column-stack {
          flex: 0 0 4in;
          width: 4in;
          max-width: 4in;
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: stretch;
        }
        @media print {
          .a4-print-page {
            margin: 0 auto !important;
            padding: 2px !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            page-break-after: always !important;
            break-after: page !important;
            min-height: auto !important;
          }
          .a4-two-columns {
            display: flex !important;
            flex-direction: row !important;
            gap: 8px !important;
            justify-content: center !important;
            align-items: flex-start !important;
            width: 100% !important;
          }
          .a4-column-stack {
            flex: 0 0 4in !important;
            width: 4in !important;
            max-width: 4in !important;
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
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-extrabold tracking-tight text-white flex items-center gap-2">
                <span>Invoice Print Center</span>
                <span className="text-xs font-semibold text-neutral-400">
                  ({orders.length} {orders.length === 1 ? 'Parcel' : 'Parcels'})
                </span>
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-mono font-bold">
                {orderPages.length} {orderPages.length === 1 ? 'A4 Sheet' : 'A4 Sheets'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Smart Packing Mode Toggle */}
          <button
            onClick={() => setAutoOptimizeOrder(!autoOptimizeOrder)}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              autoOptimizeOrder 
                ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300' 
                : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-neutral-200'
            }`}
            title="Auto-arrange parcel order to fit maximum slips on A4 pages"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Smart Packing</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${autoOptimizeOrder ? 'bg-emerald-600 text-white' : 'bg-neutral-700 text-neutral-300'}`}>
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

          {/* Redesigned Primary Print Button (Direct Standalone Window Print) */}
          <button
            onClick={handlePrintInNewWindow}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer border border-rose-400/30"
            title="Open clean print preview dialog"
          >
            <Printer className="w-4 h-4 text-white" />
            <span>Print {orders.length} {orders.length === 1 ? 'Invoice' : 'Invoices'}</span>
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
