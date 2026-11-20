import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { SiteSettings } from '../types/settings';

interface HeroBannerProps {
  onExplore?: () => void;
  siteSettings?: SiteSettings;
}

interface EmberParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
  phase: number;
  freq: number;
  hue: 'crimson' | 'amber' | 'soft';
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onExplore, siteSettings }) => {
  const bgImage = siteSettings?.heroBgImage ? siteSettings.heroBgImage.trim() : '';
  const headline = siteSettings?.heroHeadline || 'FRAGMENT';
  const tag = siteSettings?.heroTag || 'FRAGMENT / 2025';
  const urlText = siteSettings?.heroUrlText || 'WWW.SPIDEY.COM';
  const timestamps = siteSettings?.heroTimestamps || '3.23 / 3.22 / 3.03 / 2.04';
  const subtext =
    siteSettings?.heroSubtext ||
    'WITH THE TOUCH OF OUR FASHION DESIGNER AND THE EMPIRE WHO STRENGTHENS THE SOUL OF EVERY CONCEPT, COBRA THE COURAGE TO PLAY BEYOND LIMITS, THROUGH ASYMMETRIC CUTS, AND RETRO SILHOUETTES AND UNCONVENTIONAL DETAILS.';

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  // Floating studio embers & light particles canvas overlay (Option 3)
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId = 0;
    let width = 0;
    let height = 0;
    let particles: EmberParticle[] = [];

    const createParticle = (initial = false): EmberParticle => {
      const roll = Math.random();
      const hue: EmberParticle['hue'] =
        roll < 0.62 ? 'crimson' : roll < 0.88 ? 'amber' : 'soft';
      return {
        x: Math.random() * (width || 800),
        y: initial ? Math.random() * (height || 400) : (height || 400) + Math.random() * 24,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -(0.24 + Math.random() * 0.58),
        radius: 0.9 + Math.random() * 2.1,
        baseAlpha: 0.22 + Math.random() * 0.55,
        phase: Math.random() * Math.PI * 2,
        freq: 0.014 + Math.random() * 0.025,
        hue
      };
    };

    const syncCanvasSize = () => {
      const rect = container.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const targetCount = width < 640 ? 24 : 42;
      if (particles.length === 0) {
        particles = Array.from({ length: targetCount }, () => createParticle(true));
      } else if (particles.length !== targetCount) {
        particles = Array.from({ length: targetCount }, () => createParticle(true));
      }
    };

    syncCanvasSize();

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => syncCanvasSize())
        : null;
    if (resizeObserver) {
      resizeObserver.observe(container);
    }

    let tick = 0;
    const render = () => {
      if (document.hidden) {
        animFrameId = requestAnimationFrame(render);
        return;
      }

      tick += 1;
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx + Math.sin(tick * p.freq + p.phase) * 0.22;
        p.y += p.vy;

        if (p.y < -12 || p.x < -16 || p.x > width + 16) {
          particles[i] = createParticle(false);
          continue;
        }

        const twinkle = 0.65 + 0.35 * Math.sin(tick * 0.04 + p.phase);
        const edgeFade = Math.min(1, Math.min(p.y / (height * 0.18), (height - p.y) / (height * 0.12)));
        const alpha = Math.max(0.05, p.baseAlpha * twinkle * Math.max(0.25, edgeFade));

        const glowRadius = p.radius * 3.4;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRadius);

        if (p.hue === 'crimson') {
          grad.addColorStop(0, `rgba(255, 110, 110, ${Math.min(1, alpha * 1.15)})`);
          grad.addColorStop(0.45, `rgba(220, 38, 38, ${alpha * 0.65})`);
          grad.addColorStop(1, 'rgba(220, 38, 38, 0)');
        } else if (p.hue === 'amber') {
          grad.addColorStop(0, `rgba(253, 224, 150, ${Math.min(1, alpha * 1.1)})`);
          grad.addColorStop(0.45, `rgba(249, 115, 22, ${alpha * 0.55})`);
          grad.addColorStop(1, 'rgba(249, 115, 22, 0)');
        } else {
          grad.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.9})`);
          grad.addColorStop(0.45, `rgba(255, 255, 255, ${alpha * 0.3})`);
          grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      animFrameId = requestAnimationFrame(render);
    };

    animFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameId);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, []);

  const handlePointerMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const relX = (e.clientX - rect.left) / rect.width - 0.5;
    const relY = (e.clientY - rect.top) / rect.height - 0.5;
    setParallax({ x: relX * 10, y: relY * 8 });
  };

  const handlePointerLeave = () => {
    setParallax({ x: 0, y: 0 });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="w-full px-3 sm:px-6 lg:px-8 pt-3 pb-2 sm:py-5 max-w-7xl mx-auto"
    >
      <div
        ref={containerRef}
        onClick={onExplore}
        onMouseMove={handlePointerMove}
        onMouseLeave={handlePointerLeave}
        className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-br from-[#0e0b0d] via-[#7f0912] to-[#0c0b0e] border border-white/10 cursor-pointer group shadow-[0_24px_56px_-18px_rgba(220,38,38,0.28),0_18px_40px_-14px_rgba(0,0,0,0.85)]"
      >
        {/* Main Cinematic Red Image / Ken Burns Perpetual Loop */}
        <div className="relative aspect-[16/9] sm:aspect-[21/9] md:aspect-[2.4/1] w-full overflow-hidden rounded-2xl sm:rounded-3xl">
          {bgImage && (
            <div className="w-full h-full hero-ken-burns">
              <img
                src={bgImage}
                alt={tag}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-700 ease-out"
              />
            </div>
          )}

          {/* Subtle Breathing Crimson Studio Glow Orbs */}
          <div className="absolute -bottom-16 -left-12 w-56 h-56 sm:w-80 sm:h-80 rounded-full bg-red-600/25 blur-3xl pointer-events-none hero-aura-pulse" />
          <div className="absolute -top-16 -right-12 w-52 h-52 sm:w-72 sm:h-72 rounded-full bg-rose-500/20 blur-3xl pointer-events-none hero-aura-pulse" />

          {/* Red Cinematic Vignette & Studio Seam Blending */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0e]/90 via-transparent to-black/35 pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(11,11,14,0.55)_100%)] pointer-events-none" />

          {/* Option 1: Perpetual Specular Crimson & Warm Gold Light Sweep */}
          <div className="absolute inset-y-0 left-0 w-1/2 sm:w-2/5 pointer-events-none overflow-visible hero-light-sweep">
            <div className="w-full h-full bg-gradient-to-r from-transparent via-red-400/15 to-transparent mix-blend-screen blur-md" />
          </div>

          {/* Option 3: Floating Studio Embers & Ambient Bokeh Canvas Layer */}
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="absolute inset-0 w-full h-full pointer-events-none"
          />

          {/* Big Typography Overlay: FRAGMENT in center background with subtle pointer parallax */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none transition-transform duration-500 ease-out"
            style={{ transform: `translate3d(${parallax.x * -0.9}px, ${parallax.y * -0.9}px, 0)` }}
          >
            <span className="text-[12vw] sm:text-[10vw] font-black tracking-widest text-red-600/25 blur-[1px] uppercase">
              {headline}
            </span>
          </div>

          {/* Left Vertical Brand URL */}
          <div className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 -rotate-90 origin-center pointer-events-none select-none">
            <span className="text-[8px] sm:text-[10px] font-mono tracking-[0.25em] text-white/75 uppercase">
              {urlText}
            </span>
          </div>

          {/* Right Vertical Timestamps */}
          <div className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 rotate-90 origin-center pointer-events-none select-none">
            <span className="text-[8px] sm:text-[9px] font-mono tracking-[0.2em] text-white/65">
              {timestamps}
            </span>
          </div>

          {/* Top Right Mini Skull Emblem */}
          <div
            className="absolute top-3 right-3 sm:top-4 sm:right-4 pointer-events-none transition-transform duration-500 ease-out"
            style={{ transform: `translate3d(${parallax.x * 0.5}px, ${parallax.y * 0.5}px, 0)` }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 text-white/80 drop-shadow-[0_0_8px_rgba(220,38,38,0.45)]" fill="currentColor">
              <path d="M12 2C7.58 2 4 5.58 4 10c0 2.21.9 4.21 2.35 5.66L6 20h3l1-2h4l1 2h3l-.35-4.34C19.1 14.21 20 12.21 20 10c0-4.42-3.58-8-8-8zm-3 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm6 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
            </svg>
          </div>

          {/* Bottom Editorial Caption */}
          <div
            className="absolute bottom-2.5 sm:bottom-4 left-0 right-0 px-4 sm:px-8 text-center text-white pointer-events-none transition-transform duration-500 ease-out"
            style={{ transform: `translate3d(${parallax.x * 0.35}px, ${parallax.y * 0.35}px, 0)` }}
          >
            <h2 className="text-xs sm:text-sm md:text-base font-bold tracking-[0.2em] uppercase text-white/95 drop-shadow-sm">
              {tag}
            </h2>
            <p className="hidden sm:block text-[8px] md:text-[9px] font-sans tracking-wide text-neutral-300 max-w-2xl mx-auto mt-1 uppercase line-clamp-1 leading-relaxed">
              {subtext}
            </p>
          </div>
        </div>
      </div>
    </motion.section>
  );
};
