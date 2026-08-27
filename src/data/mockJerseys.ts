import { JerseyProduct } from '../types';

export const heroBannerImg = '/images/fragment_hero_banner_1787668127629.jpg';
export const catEdcImg = '/images/cat_edc_wallet_1787668177890.jpg';
export const catDeskmatImg = '/images/cat_deskmat_tech_1787668204562.jpg';
export const catJerseyKitImg = '/images/cat_jersey_kit_1787668237922.jpg';
export const prodFoldCaseImg = '/images/prod_fold_case_1787668257317.jpg';
export const prodPixelCaseImg = '/images/prod_pixel_case_1787668274006.jpg';

export interface CategoryCardData {
  id: string;
  name: string;
  subtitle?: string;
  image: string;
  tag?: string;
}

export const CATEGORY_CAROUSEL_ITEMS: CategoryCardData[] = [
  {
    id: 'EDC',
    name: 'EDC',
    subtitle: 'Wallets & Gear',
    image: catEdcImg,
    tag: 'Drop 01'
  },
  {
    id: 'Deskmat',
    name: 'Deskmat',
    subtitle: 'Studio Accessories',
    image: catDeskmatImg,
    tag: 'Drop 02'
  },
  {
    id: 'Kits',
    name: 'Pro Kits',
    subtitle: 'Matchwear Issues',
    image: catJerseyKitImg,
    tag: 'Vault'
  },
  {
    id: 'Real Madrid',
    name: 'Real Madrid',
    subtitle: '24/25 Champions',
    image: 'https://images.unsplash.com/photo-1577212017184-80cc0da11082?auto=format&fit=crop&w=800&q=80',
    tag: 'La Liga'
  },
  {
    id: 'Barcelona',
    name: 'Barcelona',
    subtitle: 'Cyber Blaugrana',
    image: 'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=800&q=80',
    tag: 'Limited'
  },
  {
    id: 'Manchester United',
    name: 'Man United',
    subtitle: 'Retro Remastered',
    image: 'https://images.unsplash.com/photo-1562771242-a02d9090c90c?auto=format&fit=crop&w=800&q=80',
    tag: 'Heritage'
  },
  {
    id: 'Special Editions',
    name: 'Special',
    subtitle: 'Cyber & Anime',
    image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
    tag: 'Exclusive'
  }
];

export const INITIAL_JERSEYS: JerseyProduct[] = [
  {
    id: 'spidey-barca-1999-centenary',
    code: 'SJ-CXYQD',
    title: 'Barcelona 1999-00 Centenary Nike Home',
    category: 'Barcelona',
    price: 139.99,
    originalPrice: 169.99,
    season: '1999/00 Centenary',
    edition: 'Retro Remastered',
    badge: 'Centenary Icon',
    images: [
      'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'The legendary 1899-1999 Barcelona Centenary split-color heritage jersey with central club crest and embroidery.',
    features: [
      'Authentic split Blaugrana 50/50 heritage design',
      'Embroidered 1899-1999 centenary chest badge',
      'Premium classic mesh knit construction',
      'Tailored athletic vintage fit'
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL', '3XL'],
    inStock: true,
    stockCount: 25,
    rating: 5.0,
    reviewCount: 412,
    customizable: true,
    colorTheme: {
      primary: '#1e3a8a',
      accent: '#dc2626',
      glow: 'rgba(220, 38, 38, 0.35)'
    },
    createdAt: '2024-08-01T10:00:00.000Z'
  },
  {
    id: 'spidey-rm-2627-third',
    code: 'SJ-C8MXU',
    title: 'REAL MADRID 3RD SHIRT 2026/27 AUTHENTIC',
    category: 'Real Madrid',
    price: 144.99,
    originalPrice: 174.99,
    season: '2026/27',
    edition: 'Player Issue Authentic',
    badge: 'New Season',
    images: [
      'https://images.unsplash.com/photo-1577212017184-80cc0da11082?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Deep burgundy and metallic gold Madrid third shirt engineered with ultra-breathable Heat.RDY match specs.',
    features: [
      'Heat.RDY cooling and lightweight match technology',
      'Heat-applied metallic gold crest',
      'Ergonomic athletic performance cut'
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL', '3XL'],
    inStock: true,
    stockCount: 30,
    rating: 4.9,
    reviewCount: 198,
    customizable: true,
    colorTheme: {
      primary: '#881337',
      accent: '#f59e0b',
      glow: 'rgba(245, 158, 11, 0.35)'
    },
    createdAt: '2025-01-15T12:00:00.000Z'
  },
  {
    id: 'spidey-rm-2009-away',
    code: 'SJ-EAXKF',
    title: 'Real Madrid 2009-10 Away Long-Sleeve',
    category: 'Real Madrid',
    price: 134.99,
    originalPrice: 159.99,
    season: '2009/10',
    edition: 'Retro Long-Sleeve',
    badge: 'CR9 Era',
    images: [
      'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1577212017184-80cc0da11082?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'The iconic black & gold long-sleeve away jersey from the iconic 2009/10 era with Bwin front sponsor.',
    features: [
      'Full-length performance sleeves with ribbed cuffs',
      'Metallic gold triple shoulder stripes',
      'High-definition club crest'
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL', '3XL'],
    inStock: true,
    stockCount: 16,
    rating: 4.9,
    reviewCount: 280,
    customizable: true,
    colorTheme: {
      primary: '#09090b',
      accent: '#eab308',
      glow: 'rgba(234, 179, 8, 0.35)'
    },
    createdAt: '2024-08-03T10:00:00.000Z'
  },
  {
    id: 'spidey-chelsea-retro-home',
    code: 'SJ-TV5VQ',
    title: 'Chelsea home retro jersey',
    category: 'Retro Classics',
    price: 129.99,
    originalPrice: 149.99,
    season: '2011/12',
    edition: 'Champions Heritage',
    badge: 'Munich Icon',
    images: [
      'https://images.unsplash.com/photo-1562771242-a02d9090c90c?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1521967906867-14ec9d64bee8?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Classic Royal Blue Chelsea home shirt commemorating the historic European triumph with Samsung sponsor.',
    features: [
      'Signature royal blue weave with white shoulder trim',
      'Embroidered golden star details',
      'Heavyweight match-grade fabric'
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL', '3XL'],
    inStock: true,
    stockCount: 20,
    rating: 4.8,
    reviewCount: 165,
    customizable: true,
    colorTheme: {
      primary: '#1d4ed8',
      accent: '#ffffff',
      glow: 'rgba(29, 78, 216, 0.35)'
    },
    createdAt: '2024-08-04T15:00:00.000Z'
  },
  {
    id: 'spidey-rm-2425-home',
    code: 'SJ-RM24H',
    title: 'Real Madrid 24/25 Authentic Home Kit',
    category: 'Real Madrid',
    price: 139.99,
    originalPrice: 169.99,
    season: '2024/25',
    edition: 'Player Issue Authentic',
    badge: 'UCL Champion',
    images: [
      'https://images.unsplash.com/photo-1577212017184-80cc0da11082?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'The iconic Los Blancos crisp white jersey woven with subtle houndstooth fabric textures, gold thermal-bonded UEFA Champions League badges, and elite athletic airflow ventilation.',
    features: [
      'HEAT.RDY cooling and lightweight technology',
      'Heat-applied metallic gold crest and authentic hem tag',
      'Ribbed V-neck with engineered micro-mesh side inserts',
      'Officially licensed Real Madrid CF authentic kit'
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL', '3XL'],
    inStock: true,
    stockCount: 18,
    rating: 4.9,
    reviewCount: 124,
    customizable: true,
    colorTheme: {
      primary: '#ffffff',
      accent: '#eab308',
      glow: 'rgba(234, 179, 8, 0.3)'
    },
    createdAt: '2024-08-10T10:00:00.000Z'
  },
  {
    id: 'spidey-mufc-treble-99',
    code: 'SJ-MU99T',
    title: 'Manchester United 1999 Treble Remastered',
    category: 'Manchester United',
    price: 129.99,
    originalPrice: 159.99,
    season: '1998/99 Heritage',
    edition: 'Retro Remastered',
    badge: 'Retro Icon',
    images: [
      'https://images.unsplash.com/photo-1562771242-a02d9090c90c?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'The immortal 1999 Camp Nou final jersey faithfully remastered with premium heavy jacquard knit, retro fold-down zip collar, and vintage embroidered crest.',
    features: [
      'Heavyweight 220 GSM heritage jacquard fabric',
      'Classic embroidered gold-shield crest and Sharp sponsor detail',
      'Camp Nou 90+1 / 90+3 commemorative sleeve timestamps',
      'Authentic vintage boxy fit'
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL', '3XL'],
    inStock: true,
    stockCount: 14,
    rating: 4.9,
    reviewCount: 215,
    customizable: true,
    colorTheme: {
      primary: '#b91c1c',
      accent: '#fbbf24',
      glow: 'rgba(185, 28, 28, 0.35)'
    },
    createdAt: '2024-08-05T09:15:00.000Z'
  },
  {
    id: 'spidey-arsenal-neon-volt',
    code: 'SJ-ARS24V',
    title: 'Arsenal FC Stealth Volt Third Kit',
    category: 'Arsenal',
    price: 134.99,
    originalPrice: 154.99,
    season: '2024/25',
    edition: 'Player Issue Authentic',
    badge: 'Trending',
    images: [
      'https://images.unsplash.com/photo-1543351611-58f69d7c1781?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'A striking stealth obsidian base contrasted by electric volt accents and the minimalist Gothic cannon crest. Engineered for high performance on European nights.',
    features: [
      'Ultralight Aeroready seamless matrix structure',
      'Reflective neon cannon badge on left chest',
      'Ergonomic laser-cut shoulder venting slits',
      'Anti-odor silver yarn integration'
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL', '3XL'],
    inStock: true,
    stockCount: 22,
    rating: 4.8,
    reviewCount: 95,
    customizable: true,
    colorTheme: {
      primary: '#0f172a',
      accent: '#84cc16',
      glow: 'rgba(132, 204, 22, 0.35)'
    },
    createdAt: '2024-08-15T11:00:00.000Z'
  },
  {
    id: 'spidey-psg-fourth-noir',
    code: 'SJ-PSG24N',
    title: 'Paris Saint-Germain Stealth Cyber Noir Kit',
    category: 'PSG',
    price: 144.99,
    originalPrice: 174.99,
    season: '2024/25 Limited',
    edition: 'Player Issue Authentic',
    badge: 'Collab Exclusive',
    images: [
      'https://images.unsplash.com/photo-1521967906867-14ec9d64bee8?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'High-fashion meets Parisian football elite. Matte deep obsidian body with chrome metallic silicone badges and iridescent elephant-print textured side panels.',
    features: [
      'Signature Parisian high-stretch knit chassis',
      'Liquid-chrome Eiffel Tower emblem with 3D relief',
      'Hidden Parc des Princes chant on inner collar',
      'Numbered authenticity patch at lower left hem'
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL', '3XL'],
    inStock: true,
    stockCount: 11,
    rating: 4.9,
    reviewCount: 160,
    customizable: true,
    colorTheme: {
      primary: '#18181b',
      accent: '#06b6d4',
      glow: 'rgba(6, 182, 212, 0.35)'
    },
    createdAt: '2024-08-18T16:20:00.000Z'
  },
  {
    id: 'spidey-concept-spider-edition',
    code: 'SJ-VNM25X',
    title: 'Spidey Venom Web Cyber Concept Edition',
    category: 'Special Editions',
    price: 159.99,
    originalPrice: 199.99,
    season: '2025/26 Concept',
    edition: 'Concept Edition',
    badge: 'Spidey Signature',
    images: [
      'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1562771242-a02d9090c90c?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'The hallmark Spidey Jersey flagship design. Features cybernetic spider web topography printed in luminescent ink, carbon-fiber textured shoulder patches, and custom Spidey-01 chest badge.',
    features: [
      'Phosphorescent glow-in-the-dark web pattern overlay',
      'Carbon-weave composite shoulder pads with aero vents',
      'Smart thermal regulation fabric core',
      'Collector edition metal authentication badge with serial # included'
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL', '3XL'],
    inStock: true,
    stockCount: 7,
    rating: 5.0,
    reviewCount: 310,
    customizable: true,
    colorTheme: {
      primary: '#09090b',
      accent: '#ef4444',
      glow: 'rgba(239, 68, 68, 0.4)'
    },
    createdAt: '2024-08-20T19:00:00.000Z'
  },
  {
    id: 'spidey-retro-milan-kaka',
    code: 'SJ-MIL07K',
    title: 'AC Milan 2007 Athens Gold Remastered',
    category: 'Retro Classics',
    price: 134.99,
    originalPrice: 164.99,
    season: '2006/07 Heritage',
    edition: 'Retro Remastered',
    badge: 'Ballon dOr Era',
    images: [
      'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1577212017184-80cc0da11082?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'The legendary all-white Rossoneri kit worn in Athens 2007. Adorned with gold embroidery, the iconic Bwin front sponsor, and 7-time Champions badge on left sleeve.',
    features: [
      'Classic Rossoneri satin-finish breathable mesh',
      'Athens 2007 Final matchday embroidery below chest crest',
      'Honorary 7 European Cups badge on sleeve',
      'Heritage cut with gold trim piping along seams'
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL', '3XL'],
    inStock: true,
    stockCount: 12,
    rating: 4.9,
    reviewCount: 142,
    customizable: true,
    colorTheme: {
      primary: '#fafafa',
      accent: '#dc2626',
      glow: 'rgba(220, 38, 38, 0.3)'
    },
    createdAt: '2024-08-02T13:45:00.000Z'
  },
  {
    id: 'orifake-slim-armor-fold6',
    code: 'SJ-EDC01F',
    title: 'Slim Armor Pro S (Mag Fit)',
    category: 'EDC',
    price: 99.99,
    originalPrice: 119.99,
    season: '2025 Edition',
    edition: 'Galaxy Z Fold 6 Case',
    badge: 'Bestseller',
    images: [
      prodFoldCaseImg,
      'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Precision engineered semi-automatic hinge protection with integrated MagSafe magnetic alignment ring and dual-layer shock dispersion framework.',
    features: [
      'Semi-automatic sliding hinge protection technology',
      'Integrated ultra-strong neodymium magnetic ring for MagSafe',
      'Air Cushion Technology corner drop absorption'
    ],
    sizes: ['Z Fold 6', 'Z Fold 5'],
    inStock: true,
    stockCount: 42,
    rating: 4.9,
    reviewCount: 312,
    customizable: false,
    colorTheme: {
      primary: '#111827',
      accent: '#38bdf8',
      glow: 'rgba(56, 189, 248, 0.25)'
    },
    createdAt: '2025-01-10T10:00:00.000Z'
  },
  {
    id: 'orifake-tough-armor-pixel9',
    code: 'SJ-EDC02P',
    title: 'Tough Armor AI (Mag Fit)',
    category: 'EDC',
    price: 59.99,
    originalPrice: 69.99,
    season: '2025 Edition',
    edition: 'Pixel 9 Series Case',
    badge: 'Trending',
    images: [
      prodPixelCaseImg,
      'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Military-grade shock protection optimized for Google Pixel 9 Series. Features aerodynamic camera visor cutouts, impact foam linings, and kickstand deployment.',
    features: [
      'Extreme impact yellow foam interior layer',
      'Built-in color-matched reinforced kickstand for hands-free viewing',
      'Tactile textured buttons with precise tactile click feedback'
    ],
    sizes: ['Pixel 9 Pro XL', 'Pixel 9 Pro', 'Pixel 9'],
    inStock: true,
    stockCount: 28,
    rating: 4.8,
    reviewCount: 245,
    customizable: false,
    colorTheme: {
      primary: '#18181b',
      accent: '#22c55e',
      glow: 'rgba(34, 197, 94, 0.25)'
    },
    createdAt: '2025-01-12T14:30:00.000Z'
  }
];

export const CATEGORIES = [
  { id: 'all', name: 'All', accentColor: '#111827' },
  { id: 'EDC', name: 'EDC', accentColor: '#e11d48' },
  { id: 'Deskmat', name: 'Deskmat', accentColor: '#2563eb' },
  { id: 'Real Madrid', name: 'Real Madrid', accentColor: '#eab308' },
  { id: 'Barcelona', name: 'Barcelona', accentColor: '#3b82f6' },
  { id: 'Manchester United', name: 'Man United', accentColor: '#ef4444' },
  { id: 'Arsenal', name: 'Arsenal', accentColor: '#84cc16' },
  { id: 'Special Editions', name: 'Special Editions', accentColor: '#ec4899' },
];
