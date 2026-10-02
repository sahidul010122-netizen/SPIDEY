import React from 'react';
import { Ruler } from 'lucide-react';

interface ProductSizeChartSectionProps {
  selectedSize?: string;
  onSelectSize?: (size: string) => void;
  measurements?: Array<{ size: string; chest: string; length: string; shoulder?: string }>;
}

export const ProductSizeChartSection: React.FC<ProductSizeChartSectionProps> = ({
  selectedSize,
  onSelectSize,
  measurements
}) => {
  // Use provided measurements from siteSettings or fallback to standard S-XXXL ratio
  const activeMeasurements = Array.isArray(measurements) && measurements.length > 0
    ? measurements
    : [
        { size: 'S', chest: '36"', length: '26"' },
        { size: 'M', chest: '38"', length: '27"' },
        { size: 'L', chest: '40"', length: '28"' },
        { size: 'XL', chest: '42"', length: '29"' },
        { size: 'XXL', chest: '44"', length: '30"' },
        { size: 'XXXL', chest: '46"', length: '31"' },
      ];

  return (
    <div className="pt-2 space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-xs sm:text-sm font-black text-neutral-900 flex items-center gap-1.5 uppercase tracking-wide">
          <Ruler className="w-4 h-4 text-neutral-800" />
          <span>সাইজ চার্ট ও মেজারমেন্ট (Size Chart)</span>
        </h3>
        <span className="text-[11px] text-neutral-500 font-medium">
          পরিমাপ ইঞ্চিতে (Inches)
        </span>
      </div>

      {/* Main Container matching Image 2 style: Technical Diagram + Black Banner Grid Table */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-300 shadow-xs space-y-5">
        
        {/* =========================================================================
            TOP: TECHNICAL LINE-ART T-SHIRT VECTOR DIAGRAM (MATCHING IMAGE 2 EXACTLY)
            ========================================================================= */}
        <div className="flex justify-center items-center py-2">
          <div className="relative w-full max-w-[280px] sm:max-w-[320px] aspect-4/3 flex items-center justify-center">
            <svg
              viewBox="0 0 340 260"
              className="w-full h-full text-black select-none"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer T-Shirt Silhouette */}
              <path
                d="M125 38 
                   C145 52 195 52 215 38 
                   L265 65 
                   L305 110 
                   L270 135 
                   L245 105 
                   L245 225 
                   L95 225 
                   L95 105 
                   L70 135 
                   L35 110 
                   L75 65 
                   Z"
                fill="#ffffff"
                stroke="#000000"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {/* Collar Outer Ribbing */}
              <path
                d="M125 38 C145 54 195 54 215 38"
                stroke="#000000"
                strokeWidth="1.8"
                fill="none"
              />
              {/* Collar Inner Neckline */}
              <path
                d="M136 44 C150 56 190 56 204 44"
                stroke="#000000"
                strokeWidth="1.5"
                fill="none"
              />

              {/* Sleeve Seam Details */}
              <path
                d="M75 65 L95 105"
                stroke="#000000"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M265 65 L245 105"
                stroke="#000000"
                strokeWidth="1.5"
                strokeLinecap="round"
              />

              {/* Bottom Hem & Sleeve Hem Stitch Guide Lines */}
              <line x1="95" y1="221" x2="245" y2="221" stroke="#000000" strokeWidth="1" strokeDasharray="3 2" />
              <line x1="37" y1="108" x2="68" y2="133" stroke="#000000" strokeWidth="0.8" strokeDasharray="2 2" />
              <line x1="303" y1="108" x2="272" y2="133" stroke="#000000" strokeWidth="0.8" strokeDasharray="2 2" />

              {/* -------------------------------------------------------------
                  DIMENSION A: LENGTH (Vertical guide on the left of shirt)
                  ------------------------------------------------------------- */}
              {/* Top Extension Guide Line from Shoulder */}
              <line x1="75" y1="38" x2="16" y2="38" stroke="#000000" strokeWidth="1" />
              {/* Bottom Extension Guide Line from Hem */}
              <line x1="95" y1="225" x2="16" y2="225" stroke="#000000" strokeWidth="1" />
              {/* Main Vertical Dimension Line */}
              <line x1="20" y1="39" x2="20" y2="224" stroke="#000000" strokeWidth="1.2" />
              {/* Top Arrow Head */}
              <polygon points="20,38 17,45 23,45" fill="#000000" />
              {/* Bottom Arrow Head */}
              <polygon points="20,225 17,218 23,218" fill="#000000" />
              {/* LENGTH Text Badge */}
              <rect x="5" y="118" width="30" height="24" fill="#ffffff" />
              <text
                x="20"
                y="134"
                textAnchor="middle"
                fill="#000000"
                fontSize="9"
                fontWeight="900"
                fontFamily="sans-serif"
                letterSpacing="0.8"
                transform="rotate(-90 20 132)"
              >
                LENGTH
              </text>

              {/* -------------------------------------------------------------
                  DIMENSION B: WIDTH (Horizontal guide across the chest)
                  ------------------------------------------------------------- */}
              {/* Main Horizontal Dimension Line (Armpit to Armpit) */}
              <line x1="97" y1="112" x2="243" y2="112" stroke="#000000" strokeWidth="1.2" />
              {/* Left Arrow Head */}
              <polygon points="95,112 102,109 102,115" fill="#000000" />
              {/* Right Arrow Head */}
              <polygon points="245,112 238,109 238,115" fill="#000000" />
              {/* Centered WIDTH Text Badge */}
              <rect x="140" y="102" width="60" height="20" fill="#ffffff" />
              <text
                x="170"
                y="116"
                textAnchor="middle"
                fill="#000000"
                fontSize="10"
                fontWeight="900"
                fontFamily="sans-serif"
                letterSpacing="1"
              >
                WIDTH
              </text>
            </svg>
          </div>
        </div>

        {/* =========================================================================
            BOTTOM: EXACT SIZE CHART TABLE MATCHING IMAGE 2
            - Solid Black Header: SIZE CHART
            - Grid with WIDTH & LENGTH Rows
            ========================================================================= */}
        <div className="overflow-hidden border border-black rounded-sm shadow-xs">
          
          {/* Black Banner Bar Header */}
          <div className="bg-black text-white text-center py-2 px-3 text-xs sm:text-sm font-black tracking-widest uppercase">
            SIZE CHART
          </div>

          {/* Grid Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-black bg-neutral-50/50">
                  <th className="py-2.5 px-3 border-r border-black font-black text-neutral-900 text-[11px] sm:text-xs w-20 text-center uppercase tracking-wider font-sans">
                    SIZE
                  </th>
                  {activeMeasurements.map((m) => {
                    const isSelected = selectedSize === m.size;
                    return (
                      <th
                        key={m.size}
                        onClick={() => onSelectSize?.(m.size)}
                        className={`py-2.5 px-2.5 sm:px-3.5 border-r last:border-r-0 border-black font-black text-xs sm:text-sm cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-neutral-900 text-white'
                            : 'hover:bg-neutral-100 text-neutral-900'
                        }`}
                      >
                        {m.size}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {/* Row 1: WIDTH */}
                <tr className="border-b border-black bg-white">
                  <td className="py-2.5 px-3 border-r border-black font-black text-neutral-950 text-[11px] sm:text-xs font-sans tracking-wide uppercase bg-neutral-50/80">
                    WIDTH
                  </td>
                  {activeMeasurements.map((m) => {
                    const isSelected = selectedSize === m.size;
                    return (
                      <td
                        key={m.size}
                        onClick={() => onSelectSize?.(m.size)}
                        className={`py-2.5 px-2 sm:px-3 border-r last:border-r-0 border-black font-bold text-xs sm:text-sm cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-neutral-800 text-amber-300 font-black'
                            : 'hover:bg-neutral-50 text-neutral-900'
                        }`}
                      >
                        {m.chest}
                      </td>
                    );
                  })}
                </tr>

                {/* Row 2: LENGTH */}
                <tr className="bg-white">
                  <td className="py-2.5 px-3 border-r border-black font-black text-neutral-950 text-[11px] sm:text-xs font-sans tracking-wide uppercase bg-neutral-50/80">
                    LENGTH
                  </td>
                  {activeMeasurements.map((m) => {
                    const isSelected = selectedSize === m.size;
                    return (
                      <td
                        key={m.size}
                        onClick={() => onSelectSize?.(m.size)}
                        className={`py-2.5 px-2 sm:px-3 border-r last:border-r-0 border-black font-bold text-xs sm:text-sm cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-neutral-800 text-white font-black'
                            : 'hover:bg-neutral-50 text-neutral-800'
                        }`}
                      >
                        {m.length}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

        </div>

        {/* Small Note */}
        <p className="text-[11px] text-neutral-500 text-center">
          * পরিমাপ ইঞ্চিতে দেওয়া হয়েছে। উপরে সাইজ কলামে ট্যাপ করে আপনার সাইজ নির্বাচন করতে পারেন।
        </p>

      </div>
    </div>
  );
};
