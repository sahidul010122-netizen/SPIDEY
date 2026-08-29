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
  whatsappNumber?: string;
  whatsappMessageTemplate?: string;
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
  whatsappNumber: '+8801715123766',
  whatsappMessageTemplate: 'হ্যালো! আমি এই জার্সিটি নিতে চাচ্ছি।\n\nপ্রোডাক্ট: {PRODUCT_NAME}\n\nসাইজ: {SIZE}\n\nছবি: {IMAGE_URL}'
};

export interface CategoryItem {
  id: string;
  name: string;
  subtitle?: string;
  image: string;
  tag?: string;
}
