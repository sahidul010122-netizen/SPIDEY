import React from 'react';
import { SiteSettings } from '../types/settings';

interface HeroBannerProps {
  onExplore?: () => void;
  siteSettings?: SiteSettings;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onExplore, siteSettings }) => {
  const bgImage = siteSettings?.heroBgImage || '/images/fragment_hero_banner_1787668127629.jpg';
  const headline = siteSettings?.heroHeadline || 'FRAGMENT';
  const tag = siteSettings?.heroTag || 'FRAGMENT / 2025';
  const urlText = siteSettings?.heroUrlText || 'WWW.ORIFAKE.COM';
  const timestamps = siteSettings?.heroTimestamps || '3.23 / 3.22 / 3.03 / 2.04';
  const subtext = siteSettings?.heroSubtext || 'WITH THE TOUCH OF OUR FASHION DESIGNER AND THE EMPIRE WHO STRENGTHENS THE SOUL OF EVERY CONCEPT, COBRA THE COURAGE TO PLAY BEYOND LIMITS, THROUGH ASYMMETRIC CUTS, AND RETRO SILHOUETTES AND UNCONVENTIONAL DETAILS.';

  return (
    <section className="w-full px-3 sm:px-6 lg:px-8 py-2 sm:py-4 max-w-7xl mx-auto">
      <div 
        onClick={onExplore}
        className="relative w-full rounded-xl sm:rounded-2xl overflow-hidden bg-[#8b0000] cursor-pointer group shadow-lg"
      >
        {/* Main Cinematic Red Image */}
        <div className="relative aspect-[16/9] sm:aspect-[21/9] md:aspect-[2.4/1] w-full overflow-hidden">
          <img
            src={bgImage}
            alt={tag}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center group-hover:scale-[1.02] transition-transform duration-700 ease-out"
          />

          {/* Red Cinematic Vignette & Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

          {/* Big Typography Overlay: FRAGMENT in center background */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <span className="text-[12vw] sm:text-[10vw] font-black tracking-widest text-red-600/30 blur-[1px] uppercase">
              {headline}
            </span>
          </div>

          {/* Left Vertical Brand URL */}
          <div className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 -rotate-90 origin-center pointer-events-none select-none">
            <span className="text-[8px] sm:text-[10px] font-mono tracking-[0.25em] text-white/70 uppercase">
              {urlText}
            </span>
          </div>

          {/* Right Vertical Timestamps */}
          <div className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 rotate-90 origin-center pointer-events-none select-none">
            <span className="text-[8px] sm:text-[9px] font-mono tracking-[0.2em] text-white/60">
              {timestamps}
            </span>
          </div>

          {/* Top Right Mini Skull Emblem */}
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 pointer-events-none">
            <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 text-white/80" fill="currentColor">
              <path d="M12 2C7.58 2 4 5.58 4 10c0 2.21.9 4.21 2.35 5.66L6 20h3l1-2h4l1 2h3l-.35-4.34C19.1 14.21 20 12.21 20 10c0-4.42-3.58-8-8-8zm-3 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm6 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
            </svg>
          </div>

          {/* Bottom Editorial Caption matching screenshot */}
          <div className="absolute bottom-2.5 sm:bottom-4 left-0 right-0 px-4 sm:px-8 text-center text-white pointer-events-none">
            <h2 className="text-xs sm:text-sm md:text-base font-bold tracking-[0.2em] uppercase text-white/95">
              {tag}
            </h2>
            <p className="hidden sm:block text-[8px] md:text-[9px] font-sans tracking-wide text-white/75 max-w-2xl mx-auto mt-1 uppercase line-clamp-1 leading-relaxed">
              {subtext}
            </p>
          </div>

        </div>
      </div>
    </section>
  );
};
