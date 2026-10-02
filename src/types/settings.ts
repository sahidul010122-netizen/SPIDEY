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
  sizeGuideMeasurements?: Array<{ size: string; chest: string; length: string; shoulder?: string }>;

  // Trust Badges & Features Section
  trustBadge1Title?: string;
  trustBadge1Subtitle?: string;
  trustBadge1Icon?: string;
  trustBadge1Enabled?: boolean;
  trustBadge2Title?: string;
  trustBadge2Subtitle?: string;
  trustBadge2Icon?: string;
  trustBadge2Enabled?: boolean;
  trustBadge3Title?: string;
  trustBadge3Subtitle?: string;
  trustBadge3Icon?: string;
  trustBadge3Enabled?: boolean;

  // 1. Telegram Order Notification Integration
  telegramBotToken?: string;
  telegramChatId?: string;
  telegramNotificationsEnabled?: boolean;

  // 4. Delivery Charges & Zone Titles by Location
  deliveryChargeInsideDhaka?: number;
  deliveryChargeSubDhaka?: number;
  deliveryChargeOutsideDhaka?: number;
  deliveryZoneInsideDhakaTitle?: string;
  deliveryZoneSubDhakaTitle?: string;
  deliveryZoneOutsideDhakaTitle?: string;

  // 5. Popup Coupon System
  enableCouponPopup?: boolean;
  couponPopupDelaySeconds?: number;
  couponPopupTitle?: string;
  couponPopupSubtitle?: string;
  couponPopupCode?: string;
  couponPopupDiscountAmount?: number;
  couponPopupDiscountType?: 'fixed' | 'percent';

  // 2. Customization Defaults
  defaultCustomizationCharge?: number;
  defaultCustomizationChargeType?: 'free' | 'paid';
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
    { size: 'S', chest: '36"', length: '26"', shoulder: '15.5"' },
    { size: 'M', chest: '38"', length: '27"', shoulder: '16.5"' },
    { size: 'L', chest: '40"', length: '28"', shoulder: '17.5"' },
    { size: 'XL', chest: '42"', length: '29"', shoulder: '18.5"' },
    { size: 'XXL', chest: '44"', length: '30"', shoulder: '19.5"' },
    { size: 'XXXL', chest: '46"', length: '31"', shoulder: '20.5"' },
  ],

  trustBadge1Title: 'ফ্রি ডেলিভারি',
  trustBadge1Subtitle: '৳২০০০+ অর্ডারে',
  trustBadge1Icon: 'truck',
  trustBadge1Enabled: true,
  trustBadge2Title: '১০০% অরিজিনাল',
  trustBadge2Subtitle: 'অথেনটিক গ্যারান্টি',
  trustBadge2Icon: 'shield',
  trustBadge2Enabled: true,
  trustBadge3Title: '৭ দিন রিটার্ন',
  trustBadge3Subtitle: 'সহজ পলিসি',
  trustBadge3Icon: 'rotate-ccw',
  trustBadge3Enabled: true,

  // Default Telegram configuration as requested by user
  telegramBotToken: '8972453715:AAEHlxk5XLQgsozL1yTwpuCAgT0RSHOzwIw',
  telegramChatId: '-1003901747514',
  telegramNotificationsEnabled: true,

  // Default 3-tier delivery charges (BDT) & Zone Titles
  deliveryChargeInsideDhaka: 70,
  deliveryChargeSubDhaka: 100,
  deliveryChargeOutsideDhaka: 130,
  deliveryZoneInsideDhakaTitle: 'ঢাকার ভেতরে',
  deliveryZoneSubDhakaTitle: 'ঢাকার সাব-এরিয়া',
  deliveryZoneOutsideDhakaTitle: 'ঢাকার বাইরে',

  // Default Popup Coupon configuration
  enableCouponPopup: true,
  couponPopupDelaySeconds: 10,
  couponPopupTitle: 'স্পেশাল ডিসকাউন্ট অফার!',
  couponPopupSubtitle: 'আজকের অর্ডারে উপভোগ করুন ৫০৳ বিশেষ ছাড়!',
  couponPopupCode: 'SPIDEY50',
  couponPopupDiscountAmount: 50,
  couponPopupDiscountType: 'fixed',

  // Customization defaults
  defaultCustomizationCharge: 0,
  defaultCustomizationChargeType: 'free'
};

export interface CategoryItem {
  id: string;
  name: string;
  subtitle?: string;
  image: string;
  tag?: string;
  sortOrder?: number;
  position?: number;
  priority?: number;
}
