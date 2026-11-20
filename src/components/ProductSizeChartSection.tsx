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
        <h3 className="text-xs sm:text-sm font-black text-neutral-100 flex items-center gap-1.5 uppercase tracking-wide">
          <Ruler className="w-4 h-4 text-red-400" />
          <span>সাইজ চার্ট ও মেজারমেন্ট (Size Chart)</span>
        </h3>
        <span className="text-[11px] text-neutral-400 font-medium">
          পরিমাপ ইঞ্চিতে (Inches)
        </span>
      </div>

      <div className="p-4 sm:p-5 rounded-2xl bg-[#141418] border border-white/10 shadow-xs space-y-5">
        
        {/* Technical Line-Art T-Shirt Vector Diagram */}
        <div className="flex justify-center items-center py-2">
          <div className="relative w-full max-w-[280px] sm:max-w-[320px] aspect-4/3 flex items-center justify-center">
            <svg
              viewBox="0 0 340 260"
              className="w-full h-full text-neutral-100 select-none"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
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
                fill="#1b1b22"
                stroke="#e5e5e7"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              <path
                d="M125 38 C145 54 195 54 215 38"
                stroke="#e5e5e7"
                strokeWidth="1.8"
                fill="none"
              />
              <path
                d="M136 44 C150 56 190 56 204 44"
                stroke="#e5e5e7"
                strokeWidth="1.5"
                fill="none"
              />

              <path d="M75 65 L95 105" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M265 65 L245 105" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" />

              <line x1="95" y1="221" x2="245" y2="221" stroke="#71717a" strokeWidth="1" strokeDasharray="3 2" />
              <line x1="37" y1="108" x2="68" y2="133" stroke="#71717a" strokeWidth="0.8" strokeDasharray="2 2" />
              <line x1="303" y1="108" x2="272" y2="133" stroke="#71717a" strokeWidth="0.8" strokeDasharray="2 2" />

              {/* DIMENSION A: LENGTH */}
              <line x1="75" y1="38" x2="16" y2="38" stroke="#ef4444" strokeWidth="1" />
              <line x1="95" y1="225" x2="16" y2="225" stroke="#ef4444" strokeWidth="1" />
              <line x1="20" y1="39" x2="20" y2="224" stroke="#ef4444" strokeWidth="1.2" />
              <polygon points="20,38 17,45 23,45" fill="#ef4444" />
              <polygon points="20,225 17,218 23,218" fill="#ef4444" />
              <rect x="5" y="118" width="30" height="24" fill="#141418" />
              <text
                x="20"
                y="134"
                textAnchor="middle"
                fill="#f87171"
                fontSize="9"
                fontWeight="900"
                fontFamily="sans-serif"
                letterSpacing="0.8"
                transform="rotate(-90 20 132)"
              >
                LENGTH
              </text>

              {/* DIMENSION B: WIDTH */}
              <line x1="97" y1="112" x2="243" y2="112" stroke="#ef4444" strokeWidth="1.2" />
              <polygon points="95,112 102,109 102,115" fill="#ef4444" />
              <polygon points="245,112 238,109 238,115" fill="#ef4444" />
              <rect x="140" y="102" width="60" height="20" fill="#1b1b22" rx="4" />
              <text
                x="170"
                y="116"
                textAnchor="middle"
                fill="#f87171"
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

        {/* Size Chart Table */}
        <div className="overflow-hidden border border-white/15 rounded-xl shadow-xs">
          
          <div className="bg-gradient-to-r from-[#2b090f] via-[#7f1d1d] to-[#2b090f] text-white text-center py-2 px-3 text-xs sm:text-sm font-black tracking-widest uppercase border-b border-white/10">
            SIZE CHART
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-white/10 bg-[#1a1a21]">
                  <th className="py-2.5 px-3 border-r border-white/10 font-black text-neutral-300 text-[11px] sm:text-xs w-20 text-center uppercase tracking-wider font-sans">
                    SIZE
                  </th>
                  {activeMeasurements.map((m) => {
                    const isSelected = selectedSize === m.size;
                    return (
                      <th
                        key={m.size}
                        onClick={() => onSelectSize?.(m.size)}
                        className={`py-2.5 px-2.5 sm:px-3.5 border-r last:border-r-0 border-white/10 font-black text-xs sm:text-sm cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-red-600 text-white'
                            : 'hover:bg-white/[0.06] text-neutral-100'
                        }`}
                      >
                        {m.size}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/10 bg-[#121216]">
                  <td className="py-2.5 px-3 border-r border-white/10 font-black text-neutral-300 text-[11px] sm:text-xs font-sans tracking-wide uppercase bg-[#16161c]">
                    WIDTH
                  </td>
                  {activeMeasurements.map((m) => {
                    const isSelected = selectedSize === m.size;
                    return (
                      <td
                        key={m.size}
                        onClick={() => onSelectSize?.(m.size)}
                        className={`py-2.5 px-2 sm:px-3 border-r last:border-r-0 border-white/10 font-bold text-xs sm:text-sm cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-red-600/20 text-red-400 font-black'
                            : 'hover:bg-white/[0.04] text-neutral-200'
                        }`}
                      >
                        {m.chest}
                      </td>
                    );
                  })}
                </tr>

                <tr className="bg-[#121216]">
                  <td className="py-2.5 px-3 border-r border-white/10 font-black text-neutral-300 text-[11px] sm:text-xs font-sans tracking-wide uppercase bg-[#16161c]">
                    LENGTH
                  </td>
                  {activeMeasurements.map((m) => {
                    const isSelected = selectedSize === m.size;
                    return (
                      <td
                        key={m.size}
                        onClick={() => onSelectSize?.(m.size)}
                        className={`py-2.5 px-2 sm:px-3 border-r last:border-r-0 border-white/10 font-bold text-xs sm:text-sm cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-red-600/20 text-red-400 font-black'
                            : 'hover:bg-white/[0.04] text-neutral-200'
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

        <p className="text-[11px] text-neutral-400 text-center">
          * পরিমাপ ইঞ্চিতে দেওয়া হয়েছে। উপরে সাইজ কলামে ট্যাপ করে আপনার সাইজ নির্বাচন করতে পারেন।
        </p>

      </div>
    </div>
  );
};
