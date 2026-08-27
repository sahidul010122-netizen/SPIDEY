export interface ColorTheme {
  primary: string;
  accent: string;
  glow: string;
}

export interface JerseyProduct {
  id: string;
  code?: string; // e.g. SJ-CXYQD, SJ-C8MXU
  title: string;
  category: string;
  price: number;
  originalPrice?: number;
  season: string;
  edition: string;
  badge?: string;
  images: string[];
  description: string;
  features: string[];
  sizes: string[];
  inStock: boolean;
  stockCount: number;
  rating: number;
  reviewCount: number;
  customizable: boolean;
  colorTheme?: ColorTheme;
  createdAt: string;
  updatedAt?: string;
}

export interface CartItem {
  itemKey: string;
  product: JerseyProduct;
  selectedSize: string;
  customName?: string;
  customNumber?: string;
  quantity: number;
  addedAt: number;
}

export interface Order {
  id: string;
  items: CartItem[];
  customerName: string;
  customerEmail: string;
  phoneNumber?: string;
  shippingAddress: string;
  paymentMethod: string;
  isExchange?: boolean;
  orderNote?: string;
  orderType?: 'standard' | 'quick_form' | 'bulk_entry';
  subtotal: number;
  discount: number;
  shippingFee: number;
  totalAmount: number;
  codAmount?: number;
  status: 'confirmed' | 'processing' | 'shipped' | 'delivered';
  consignmentId?: string;
  trackingCode?: string; // 9-digit Steadfast tracking code
  courierStatus?: 'pending' | 'sent_to_courier' | 'in_transit' | 'delivered' | 'cancelled';
  courierName?: string;
  courierProcessedAt?: string;
  invoiceNumber?: string;
  createdAt: string;
}

export interface CategoryInfo {
  id: string;
  name: string;
  count?: number;
  accentColor: string;
}

export interface R2UploadResponse {
  success: boolean;
  key: string;
  url: string;
  size?: number;
  contentType?: string;
  message?: string;
}

export interface StoreStats {
  totalProducts: number;
  totalCategories: number;
  inStockCount: number;
  totalOrders: number;
  totalRevenue: number;
  r2BucketStatus: {
    binding: string;
    bucketName: string;
    connected: boolean;
    storageType: 'r2_worker' | 'local_emulated';
  };
}
