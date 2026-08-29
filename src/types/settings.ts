export interface SiteSettings {
  brandName: string;
  brandTagline: string;
  headerLogoImage?: string;
  headerSloganTop: string;
  headerSloganBottom: string;
  heroTag: string;
  heroHeadline: string;
  heroSubtext: string;
  heroUrlText: string;
  heroTimestamps: string;
  heroBgImage: string;
  categoryHeading: string;
  bestsellerHeading: string;
  footerText: string;
  footerQuote: string;
  adminGmail: string;
  adminPassword?: string;
  whatsappNumber?: string;
  whatsappMessageTemplate?: string;
  enableSizeGuide?: boolean;
  sizeGuideNote?: string;
  sizeGuideMeasurements?: Array<{ size: string; chest: string; length: string }>;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  brandName: 'spidey',
  brandTagline: 'DIFFERENTIATE, DON’T COMPARE',
  headerLogoImage: '',
  headerSloganTop: 'DIFFERENTIATE,',
  headerSloganBottom: "DON'T COMPARE",
  heroTag: 'FRAGMENT / 2025',
  heroHeadline: 'FRAGMENT',
  heroSubtext: 'WITH THE TOUCH OF OUR FASHION DESIGNER AND THE EMPIRE WHO STRENGTHENS THE SOUL OF EVERY CONCEPT, COBRA THE COURAGE TO PLAY BEYOND LIMITS, THROUGH ASYMMETRIC CUTS, AND RETRO SILHOUETTES AND UNCONVENTIONAL DETAILS.',
  heroUrlText: 'WWW.SPIDEY.COM',
  heroTimestamps: '3.23 / 3.22 / 3.03 / 2.04',
  heroBgImage: '/images/fragment_hero_banner_1787668127629.jpg',
  categoryHeading: 'Shop by Category',
  bestsellerHeading: 'Bestsellers',
  footerText: 'DIFFERENTIATE, DON’T COMPARE',
  footerQuote: 'Official Spidey Master Catalog',
  adminGmail: 'sahidul010122@gmail.com',
  adminPassword: 'Spidey#Admin@2026',
  whatsappNumber: '+8801715123766',
  whatsappMessageTemplate: 'হ্যালো! আমি এই জার্সিটি নিতে চাচ্ছি।\n\nপ্রোডাক্ট: {PRODUCT_NAME}\n\nসাইজ: {SIZE}\n\nছবি: {IMAGE_URL}',
  enableSizeGuide: true,
  sizeGuideNote: 'Standard Thai Fit',
  sizeGuideMeasurements: [
    { size: 'S', chest: '36 - 38"', length: '27"' },
    { size: 'M', chest: '38 - 40"', length: '28"' },
    { size: 'L', chest: '40 - 42"', length: '29"' },
    { size: 'XL', chest: '42 - 44"', length: '30"' },
    { size: 'XXL', chest: '44 - 46"', length: '31"' },
    { size: '3XL', chest: '46 - 48"', length: '32"' },
  ]
};

export interface CategoryItem {
  id: string;
  name: string;
  subtitle?: string;
  image: string;
  tag?: string;
}
