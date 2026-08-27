import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Order } from '../../types';
import { Printer, ArrowLeft, Download, CheckCircle2, Sliders, RefreshCw, ZoomIn, ZoomOut, AlertCircle } from 'lucide-react';
import JsBarcode from 'jsbarcode';

interface CompactInvoicePrintViewProps {
  orders: Order[];
  onClose: () => void;
}

// Scannable SVG Barcode Renderer using JsBarcode
const ScannableBarcode: React.FC<{ code: string; height?: number; width?: number }> = ({ 
  code, 
  height = 28, 
  width = 1.3 
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && code) {
      try {
        JsBarcode(svgRef.current, code.trim(), {
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
      className="max-h-[30px] w-auto inline-block print:max-h-[28px]" 
      style={{ display: 'block' }}
    />
  );
};

// Single Compact Invoice Slip Component
const CompactInvoiceSlip: React.FC<{ order: Order; index: number }> = ({ order, index }) => {
  const trackingNum = order.trackingCode || (849000000 + (index * 139)).toString().substring(0, 9);
  const codAmt = order.codAmount !== undefined ? order.codAmount : order.totalAmount;

  return (
    <article
      className="compact-thermal-slip relative bg-white text-neutral-900 rounded-2xl overflow-hidden border border-neutral-300 shadow-md print:shadow-none print:border-neutral-900 flex flex-col justify-between break-inside-avoid print:break-inside-avoid print:page-break-inside-avoid w-full max-w-[340px] mx-auto select-none"
      style={{
        width: '100%',
        maxWidth: '340px',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        boxSizing: 'border-box'
      }}
    >
      {/* Red Left Accent Indicator Strip */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-600 z-10" />

      {/* SLIP INNER CONTENT */}
      <div className="pl-3.5 pr-2.5 pt-2.5 pb-2 flex flex-col flex-1 justify-between">
        
        {/* =========================================================================
            1. HEADER: STEADFAST LOGO, SCANNABLE BARCODE & RED COLLECT BADGE
            ========================================================================= */}
        <div 
          className="rounded-xl p-2 pb-1.5 border border-neutral-200/80 mb-2 relative overflow-hidden"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, #fafafa, #fafafa 6px, #ffffff 6px, #ffffff 12px)'
          }}
        >
          <div className="flex items-start justify-between gap-1.5">
            
            {/* Left: Steadfast Label & Barcode */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 text-[10px] font-bold text-neutral-500 tracking-wider uppercase mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 inline-block" />
                <span>STEADFAST</span>
              </div>

              {/* High-density Scannable Barcode SVG */}
              <div className="bg-white px-1 py-0.5 rounded border border-neutral-200 inline-block mb-1">
                <ScannableBarcode code={trackingNum} height={26} width={1.2} />
              </div>

              {/* 9-Digit Steadfast Tracking Code */}
              <div className="font-mono font-black text-lg tracking-tight text-neutral-950 leading-none">
                {trackingNum}
              </div>
            </div>

            {/* Right: Coral/Red COLLECT COD Badge */}
            <div className="shrink-0 bg-rose-600 text-white rounded-2xl px-3 py-1.5 text-center shadow-sm min-w-[76px]">
              <span className="text-[9px] font-bold uppercase tracking-wider block opacity-95 text-rose-100">
                COLLECT
              </span>
              <span className="text-base font-black tracking-tight font-mono block leading-tight">
                ৳{codAmt}
              </span>
            </div>

          </div>
        </div>

        {/* =========================================================================
            2. ITEM DETAILS CARD: DARK CHARCOAL CONTAINER
            ========================================================================= */}
        <div className="space-y-1.5 mb-2 flex-1">
          {order.items.map((item, itemIdx) => {
            const imgUrl = item.product?.images?.[0] || 'https://images.unsplash.com/photo-1577212017184-80cc0da11082?auto=format&fit=crop&w=200&q=80';
            const sizeVal = item.selectedSize || 'XL';
            const qtyVal = item.quantity || 1;
            const customText = item.customName || (item.product?.code ? `[${item.product.code}]` : 'STANDARD PRO');

            return (
              <div 
                key={item.itemKey || itemIdx}
                className="bg-[#505054] text-white rounded-2xl p-2 shadow-inner border border-neutral-700 flex items-center gap-2.5"
              >
                {/* Left: White Rounded Card for Jersey Image */}
                <div className="w-14 h-14 bg-white rounded-xl p-1 border border-neutral-300 shrink-0 overflow-hidden flex items-center justify-center shadow-xs">
                  <img
                    src={imgUrl}
                    alt={item.product?.title || 'Jersey'}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Right: Size, Qty & Customization Badge */}
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                  {/* Top Stats Row: SIZE & QTY */}
                  <div className="flex items-baseline gap-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
                        SIZE
                      </span>
                      <span className="text-sm font-black text-white font-mono">
                        {sizeVal}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
                        QTY
                      </span>
                      <span className="text-sm font-black text-rose-400 font-mono">
                        {qtyVal}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Row: White Customization Badge Pill */}
                  <div>
                    <div className="inline-block bg-white text-neutral-950 font-black text-[11px] font-mono px-2.5 py-0.5 rounded-lg shadow-xs tracking-tight uppercase truncate max-w-full">
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
          <div className="border-t border-neutral-300 pt-1 mt-0.5">
            <div className="bg-neutral-900 text-white px-2 py-0.5 font-bold text-center uppercase tracking-wider rounded-md text-[9px]">
              ⚠️ EXCHANGE PARCEL (রিসিভ করে রিটার্ন নিন)
              {order.orderNote && ` - ${order.orderNote}`}
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
  const [scale, setScale] = useState<number>(100);
  const [isPrinting, setIsPrinting] = useState(false);
  const printableAreaRef = useRef<HTMLDivElement | null>(null);

  // Exact 8 slips (4 rows of 2 columns) per A4 sheet for zero-overflow pagination
  const SLIPS_PER_A4_PAGE = 8;
  const orderPages = useMemo(() => {
    if (printLayout === 'thermal_roll') {
      return [orders];
    }
    const pages: Order[][] = [];
    for (let i = 0; i < orders.length; i += SLIPS_PER_A4_PAGE) {
      pages.push(orders.slice(i, i + SLIPS_PER_A4_PAGE));
    }
    return pages;
  }, [orders, printLayout]);

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
              .a4-grid-columns {
                display: grid !important;
                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                column-gap: 12px !important;
                row-gap: 8px !important;
                width: 100% !important;
                max-width: 200mm !important;
                margin: 0 auto !important;
                align-items: start !important;
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
              .a4-grid-columns {
                display: grid !important;
                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                column-gap: 12px !important;
                row-gap: 8px !important;
                width: 100% !important;
                max-width: 200mm !important;
                margin: 0 auto !important;
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
                Invoice Print Center ({orders.length} {orders.length === 1 ? 'Slip' : 'Slips'})
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-mono font-bold">
                {orderPages.length} {orderPages.length === 1 ? 'A4 Sheet' : 'A4 Sheets'}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">
              8 Slips per A4 sheet (2 Columns × 4 Rows) with scannable barcodes
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Layout Mode Toggle */}
          <div className="hidden sm:flex items-center bg-neutral-800 rounded-xl p-1 border border-neutral-700">
            <button
              onClick={() => setPrintLayout('a4_grid')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                printLayout === 'a4_grid' ? 'bg-neutral-700 text-white shadow-xs' : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Fit multiple 3-inch slips onto A4 sheets"
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
          {orderPages.map((pageOrders, pageIdx) => {
            const startIdx = pageIdx * SLIPS_PER_A4_PAGE;
            
            return (
              <div 
                key={`page-${pageIdx}`}
                className="a4-print-page w-full"
              >
                {/* On-screen page indicator (hidden when printing) */}
                {orderPages.length > 1 && (
                  <div className="text-center mb-2 text-xs font-mono font-bold text-neutral-400 print:hidden flex items-center justify-center gap-2">
                    <span className="w-8 h-px bg-neutral-700 inline-block" />
                    <span>A4 SHEET #{pageIdx + 1} ({pageOrders.length} SLIPS)</span>
                    <span className="w-8 h-px bg-neutral-700 inline-block" />
                  </div>
                )}

                {/* 2-Column Grid of Slips */}
                <div className="a4-grid-columns">
                  {pageOrders.map((order, slipIdx) => (
                    <CompactInvoiceSlip 
                      key={order.id || `${pageIdx}-${slipIdx}`}
                      order={order}
                      index={startIdx + slipIdx}
                    />
                  ))}
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
