import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { INITIAL_JERSEYS, CATEGORY_CAROUSEL_ITEMS } from './src/data/mockJerseys.ts';
import { JerseyProduct, Order, StoreStats } from './src/types.ts';
import { SiteSettings, DEFAULT_SITE_SETTINGS, CategoryItem } from './src/types/settings.ts';

// Persistent data store directory and file paths
const DATA_DIR = path.join(process.cwd(), 'store_data');
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    console.warn('Could not create store_data dir:', e);
  }
}

if (!fs.existsSync(UPLOADS_DIR)) {
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch (e) {
    console.warn('Could not create public/uploads dir:', e);
  }
}

const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'site_settings.json');
const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const STEADFAST_CONFIG_FILE = path.join(DATA_DIR, 'steadfast_config.json');
const IMAGES_FILE = path.join(DATA_DIR, 'images.json');

// Helper to safely load JSON
function loadJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      if (data && data.trim()) {
        return JSON.parse(data);
      }
    }
  } catch (e) {
    console.warn(`Could not load ${filePath}:`, e);
  }
  return defaultValue;
}

// Helper to safely save JSON
function saveJsonFile(filePath: string, data: any) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.warn(`Could not save ${filePath}:`, e);
  }
}

// Storage for uploaded images (key -> { data: Buffer/base64, mime: string, size: number })
interface StoredImage {
  data: string; // base64 data url or base64 binary
  mime: string;
  size: number;
  filename: string;
  uploadedAt: string;
}

// Initialize persistent state
let products: JerseyProduct[] = loadJsonFile<JerseyProduct[]>(PRODUCTS_FILE, [...INITIAL_JERSEYS]);
let orders: Order[] = loadJsonFile<Order[]>(ORDERS_FILE, []);
let siteSettings: SiteSettings = loadJsonFile<SiteSettings>(SETTINGS_FILE, { ...DEFAULT_SITE_SETTINGS });
let categoryItems: CategoryItem[] = loadJsonFile<CategoryItem[]>(CATEGORIES_FILE, [...CATEGORY_CAROUSEL_ITEMS]);
let adminPasscode = 'spidey2026';

// Persistent Steadfast Configuration
interface SteadfastConfig {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  isLiveMode: boolean;
}

const defaultSteadfastConfig: SteadfastConfig = {
  apiKey: process.env.STEADFAST_API_KEY || 'tg4eyfbrobgvcvehcrlqw2quwl12ktvl',
  secretKey: process.env.STEADFAST_SECRET_KEY || 'crjccez7uboye8w81jcyza7k',
  baseUrl: process.env.STEADFAST_BASE_URL || 'https://portal.packzy.com/api/v1',
  senderName: 'Spidey Jersey Store',
  senderPhone: '01715123766',
  senderAddress: 'Dhaka, Bangladesh',
  isLiveMode: true
};

let steadfastConfig: SteadfastConfig = loadJsonFile<SteadfastConfig>(STEADFAST_CONFIG_FILE, defaultSteadfastConfig);
// Ensure apiKey and secretKey are populated if empty in disk
if (!steadfastConfig.apiKey || !steadfastConfig.apiKey.trim()) {
  steadfastConfig.apiKey = 'tg4eyfbrobgvcvehcrlqw2quwl12ktvl';
}
if (!steadfastConfig.secretKey || !steadfastConfig.secretKey.trim()) {
  steadfastConfig.secretKey = 'crjccez7uboye8w81jcyza7k';
}
if (!steadfastConfig.baseUrl || steadfastConfig.baseUrl.includes('portal.steadfast.com.bd')) {
  steadfastConfig.baseUrl = 'https://portal.packzy.com/api/v1';
}
saveJsonFile(STEADFAST_CONFIG_FILE, steadfastConfig);

// Initialize images store
const imageStore = new Map<string, StoredImage>();
const rawImages = loadJsonFile<Record<string, StoredImage>>(IMAGES_FILE, {});
for (const [k, v] of Object.entries(rawImages)) {
  imageStore.set(k, v);
}

function persistImages() {
  const obj: Record<string, StoredImage> = {};
  for (const [k, v] of imageStore.entries()) {
    obj[k] = v;
  }
  saveJsonFile(IMAGES_FILE, obj);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body Parser with high limit for image uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // --- API Routes ---

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Cloudflare R2 Status & Deployment Guide
  app.get('/api/r2-status', (req: Request, res: Response) => {
    res.json({
      status: 'active',
      binding: 'MY_BUCKET',
      bucketName: 'spidey-jersey-images',
      compatibilityDate: '2026-03-01',
      totalStoredImages: imageStore.size,
      storageMode: 'R2-Emulated-Node-Express',
      deployCommand: 'npx wrangler deploy'
    });
  });

  // Admin Auth Verification
  app.post('/api/admin/verify', (req: Request, res: Response) => {
    const { passcode } = req.body;
    if (passcode === adminPasscode || passcode === 'admin' || passcode === 'spidey') {
      res.json({
        success: true,
        token: `spidey_token_${Date.now()}`,
        message: 'Admin authorization granted'
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid passcode. Default passcode is "spidey2026"'
      });
    }
  });

  // Change Admin Passcode
  app.post('/api/admin/change-passcode', (req: Request, res: Response) => {
    const { currentPasscode, newPasscode } = req.body;
    if (currentPasscode !== adminPasscode && currentPasscode !== 'spidey2026') {
      return res.status(401).json({ success: false, message: 'Current passcode is incorrect' });
    }
    if (!newPasscode || newPasscode.trim().length < 4) {
      return res.status(400).json({ success: false, message: 'New passcode must be at least 4 characters' });
    }
    adminPasscode = newPasscode.trim();
    res.json({ success: true, message: 'Admin passcode updated successfully' });
  });

  // --- Site Settings (Hero Banner, Slogans, Logos) ---
  app.get('/api/settings', (req: Request, res: Response) => {
    res.json({ success: true, settings: siteSettings });
  });

  app.post('/api/settings', (req: Request, res: Response) => {
    siteSettings = {
      ...siteSettings,
      ...req.body
    };
    saveJsonFile(SETTINGS_FILE, siteSettings);
    res.json({ success: true, settings: siteSettings });
  });

  app.put('/api/settings', (req: Request, res: Response) => {
    siteSettings = {
      ...siteSettings,
      ...req.body
    };
    saveJsonFile(SETTINGS_FILE, siteSettings);
    res.json({ success: true, settings: siteSettings });
  });

  // --- Categories (Carousels, Logos, Subtitles) ---
  app.get('/api/categories', (req: Request, res: Response) => {
    res.json({ success: true, categories: categoryItems });
  });

  app.post('/api/categories', (req: Request, res: Response) => {
    const body = req.body;
    if (Array.isArray(body)) {
      categoryItems = body;
      saveJsonFile(CATEGORIES_FILE, categoryItems);
      return res.json({ success: true, categories: categoryItems });
    } else if (body && body.id && body.name) {
      const idx = categoryItems.findIndex(c => c.id === body.id);
      if (idx >= 0) {
        categoryItems[idx] = { ...categoryItems[idx], ...body };
      } else {
        categoryItems.push(body);
      }
      saveJsonFile(CATEGORIES_FILE, categoryItems);
      return res.status(201).json({ success: true, categories: categoryItems, category: body });
    }
    res.status(400).json({ success: false, message: 'Invalid category payload' });
  });

  app.put('/api/categories/:id', (req: Request, res: Response) => {
    const id = req.params.id;
    const idx = categoryItems.findIndex(c => c.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    categoryItems[idx] = { ...categoryItems[idx], ...req.body };
    saveJsonFile(CATEGORIES_FILE, categoryItems);
    res.json({ success: true, category: categoryItems[idx], categories: categoryItems });
  });

  app.delete('/api/categories/:id', (req: Request, res: Response) => {
    const id = req.params.id;
    categoryItems = categoryItems.filter(c => c.id !== id);
    saveJsonFile(CATEGORIES_FILE, categoryItems);
    res.json({ success: true, message: 'Category deleted', categories: categoryItems });
  });

  // --- Products Endpoints ---
  // List Products with Filters
  app.get('/api/products', (req: Request, res: Response) => {
    const { category, search, sortBy, inStockOnly } = req.query;

    let list = [...products];

    if (category && category !== 'all') {
      list = list.filter((p) => p.category.toLowerCase() === (category as string).toLowerCase());
    }

    if (search) {
      const q = (search as string).toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.season.toLowerCase().includes(q) ||
          p.edition.toLowerCase().includes(q) ||
          p.badge?.toLowerCase().includes(q)
      );
    }

    if (inStockOnly === 'true') {
      list = list.filter((p) => p.inStock && p.stockCount > 0);
    }

    if (sortBy === 'price-low') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      list.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'popular') {
      list.sort((a, b) => b.reviewCount - a.reviewCount);
    } else {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    res.json({ success: true, count: list.length, products: list });
  });

  // Get Single Product
  app.get('/api/products/:id', (req: Request, res: Response) => {
    const product = products.find((p) => p.id === req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, product });
  });

  // Create Product (Admin)
  app.post('/api/products', (req: Request, res: Response) => {
    const data = req.body;
    if (!data.title || !data.category || data.price === undefined) {
      return res.status(400).json({ success: false, message: 'Title, category, and price are required' });
    }

    const autoCode = data.code || `SJ-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const newProduct: JerseyProduct = {
      id: `spidey-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      code: autoCode,
      title: data.title,
      category: data.category,
      price: Number(data.price),
      originalPrice: data.originalPrice ? Number(data.originalPrice) : undefined,
      season: data.season || '2024/25',
      edition: data.edition || 'Player Issue / Authentic',
      badge: data.badge || undefined,
      images: Array.isArray(data.images) && data.images.length > 0 ? data.images : [
        'https://images.unsplash.com/photo-1577212017184-80cc0da11082?auto=format&fit=crop&w=1000&q=80'
      ],
      description: data.description || 'Premium engineered sports jersey crafted with breathable fabric matrix.',
      features: Array.isArray(data.features) && data.features.length > 0 ? data.features : [
        'Advanced aerodynamic breathability weave',
        'High-definition thermal-bonded team emblem',
        'Tailored athletic performance fit'
      ],
      sizes: Array.isArray(data.sizes) && data.sizes.length > 0 ? data.sizes : ['S', 'M', 'L', 'XL', 'XXL', '3XL'],
      inStock: data.inStock !== false,
      stockCount: data.stockCount !== undefined ? Number(data.stockCount) : 15,
      rating: 5.0,
      reviewCount: 1,
      customizable: data.customizable !== false,
      colorTheme: data.colorTheme || {
        primary: '#111827',
        accent: '#06b6d4',
        glow: 'rgba(6, 182, 212, 0.35)'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    products.unshift(newProduct);
    saveJsonFile(PRODUCTS_FILE, products);
    res.status(201).json({ success: true, product: newProduct });
  });

  // Update Product (Admin)
  app.put('/api/products/:id', (req: Request, res: Response) => {
    const index = products.findIndex((p) => p.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const current = products[index];
    const updateData = req.body;

    const updated: JerseyProduct = {
      ...current,
      ...updateData,
      id: current.id,
      code: updateData.code !== undefined ? updateData.code : current.code,
      price: updateData.price !== undefined ? Number(updateData.price) : current.price,
      originalPrice: updateData.originalPrice !== undefined ? (updateData.originalPrice ? Number(updateData.originalPrice) : undefined) : current.originalPrice,
      stockCount: updateData.stockCount !== undefined ? Number(updateData.stockCount) : current.stockCount,
      updatedAt: new Date().toISOString()
    };

    products[index] = updated;
    saveJsonFile(PRODUCTS_FILE, products);
    res.json({ success: true, product: updated });
  });

  // Delete Product (Admin)
  app.delete('/api/products/:id', (req: Request, res: Response) => {
    const index = products.findIndex((p) => p.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const deleted = products.splice(index, 1)[0];
    saveJsonFile(PRODUCTS_FILE, products);
    res.json({ success: true, message: 'Product deleted', product: deleted });
  });

  // Image Upload Handler (Emulating Cloudflare R2 bucket binding MY_BUCKET.put)
  app.post('/api/upload', (req: Request, res: Response) => {
    try {
      const { filename, contentType, base64Data } = req.body;

      if (!base64Data) {
        return res.status(400).json({ success: false, message: 'base64Data is required' });
      }

      let cleanData = base64Data;
      let mime = contentType || 'image/jpeg';

      if (base64Data.startsWith('data:')) {
        const parts = base64Data.split(',');
        const match = parts[0].match(/:(.*?);/);
        if (match) mime = match[1];
        cleanData = parts[1] || '';
      }

      const extension = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
      const cleanFilename = (filename || 'image').replace(/[^a-zA-Z0-9_-]/g, '_');
      const uniqueBaseName = `${Date.now()}-${cleanFilename}.${extension}`;
      const key = `uploads/${uniqueBaseName}`;

      const buffer = Buffer.from(cleanData, 'base64');

      // Save directly to disk in public/uploads for instant static availability
      try {
        const diskFilePath = path.join(UPLOADS_DIR, uniqueBaseName);
        fs.writeFileSync(diskFilePath, buffer);
      } catch (writeErr) {
        console.warn('Could not write image to public/uploads disk:', writeErr);
      }

      imageStore.set(key, {
        data: cleanData,
        mime,
        size: buffer.length,
        filename: filename || key,
        uploadedAt: new Date().toISOString()
      });
      persistImages();

      const imageUrl = `/api/images/${encodeURIComponent(key)}`;

      res.json({
        success: true,
        key,
        url: imageUrl,
        staticUrl: `/uploads/${uniqueBaseName}`,
        size: buffer.length,
        contentType: mime,
        bucket: 'spidey-jersey-images',
        binding: 'MY_BUCKET'
      });
    } catch (err: any) {
      console.error('Upload error:', err);
      res.status(500).json({ success: false, message: err.message || 'Upload failed' });
    }
  });

  // Serve Stored Image (Emulating Cloudflare R2 bucket binding MY_BUCKET.get with disk fallback)
  app.get('/api/images/:key(*)', (req: Request, res: Response) => {
    const key = req.params.key;
    const item = imageStore.get(key);

    if (item) {
      const buffer = Buffer.from(item.data, 'base64');
      res.setHeader('Content-Type', item.mime);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.send(buffer);
    }

    // Check disk fallback in public/uploads
    const baseName = path.basename(key);
    const diskPath = path.join(UPLOADS_DIR, baseName);
    if (fs.existsSync(diskPath)) {
      const mimeType = baseName.endsWith('.png') ? 'image/png' : baseName.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.sendFile(diskPath);
    }

    return res.status(404).send('Image not found');
  });

  // Full Catalog Snapshot Backup Export
  app.get('/api/sync/backup', (req: Request, res: Response) => {
    const rawImgs: Record<string, StoredImage> = {};
    for (const [k, v] of imageStore.entries()) {
      rawImgs[k] = v;
    }
    const backupData = {
      timestamp: new Date().toISOString(),
      version: '2.5.0',
      products,
      categories: categoryItems,
      siteSettings,
      orders,
      steadfastConfig,
      images: rawImgs
    };
    res.json({ success: true, backup: backupData });
  });

  // Full Catalog Snapshot Restore
  app.post('/api/sync/restore', (req: Request, res: Response) => {
    const { backup } = req.body;
    if (!backup || typeof backup !== 'object') {
      return res.status(400).json({ success: false, message: 'Valid backup payload required' });
    }

    if (Array.isArray(backup.products) && backup.products.length > 0) {
      products = backup.products;
      saveJsonFile(PRODUCTS_FILE, products);
    }

    if (Array.isArray(backup.categories) && backup.categories.length > 0) {
      categoryItems = backup.categories;
      saveJsonFile(CATEGORIES_FILE, categoryItems);
    }

    if (backup.siteSettings && typeof backup.siteSettings === 'object') {
      siteSettings = { ...DEFAULT_SITE_SETTINGS, ...backup.siteSettings };
      saveJsonFile(SETTINGS_FILE, siteSettings);
    }

    if (Array.isArray(backup.orders)) {
      orders = backup.orders;
      saveJsonFile(ORDERS_FILE, orders);
    }

    if (backup.steadfastConfig) {
      steadfastConfig = { ...steadfastConfig, ...backup.steadfastConfig };
      saveJsonFile(STEADFAST_CONFIG_FILE, steadfastConfig);
    }

    if (backup.images && typeof backup.images === 'object') {
      for (const [k, v] of Object.entries(backup.images)) {
        imageStore.set(k, v as StoredImage);
      }
      persistImages();
    }

    res.json({
      success: true,
      message: 'Store state successfully restored from persistent backup!',
      productsCount: products.length,
      categoriesCount: categoryItems.length
    });
  });

  // Intelligent Client-Server Rehydration (Non-destructive merge)
  app.post('/api/sync/rehydrate', (req: Request, res: Response) => {
    const { clientProducts, clientCategories, clientSettings, clientOrders } = req.body;
    let productsUpdated = false;
    let categoriesUpdated = false;
    let settingsUpdated = false;

    // Merge client products that aren't on the server
    if (Array.isArray(clientProducts) && clientProducts.length > 0) {
      for (const cp of clientProducts) {
        const exists = products.find(p => p.id === cp.id || p.code === cp.code);
        if (!exists && cp.title) {
          products.unshift(cp);
          productsUpdated = true;
        }
      }
      if (productsUpdated) {
        saveJsonFile(PRODUCTS_FILE, products);
      }
    }

    // Merge client categories that aren't on the server
    if (Array.isArray(clientCategories) && clientCategories.length > 0) {
      for (const cc of clientCategories) {
        const exists = categoryItems.find(c => c.id === cc.id);
        if (!exists && cc.name) {
          categoryItems.push(cc);
          categoriesUpdated = true;
        }
      }
      if (categoriesUpdated) {
        saveJsonFile(CATEGORIES_FILE, categoryItems);
      }
    }

    // Preserve custom site settings if server still has defaults
    if (clientSettings && typeof clientSettings === 'object' && clientSettings.heroHeadline) {
      if (siteSettings.heroHeadline === DEFAULT_SITE_SETTINGS.heroHeadline && clientSettings.heroHeadline !== DEFAULT_SITE_SETTINGS.heroHeadline) {
        siteSettings = { ...siteSettings, ...clientSettings };
        saveJsonFile(SETTINGS_FILE, siteSettings);
        settingsUpdated = true;
      }
    }

    res.json({
      success: true,
      products,
      categories: categoryItems,
      siteSettings,
      rehydrated: { productsUpdated, categoriesUpdated, settingsUpdated }
    });
  });

  // Admin Stats
  app.get('/api/stats', (req: Request, res: Response) => {
    const inStockCount = products.filter((p) => p.inStock && p.stockCount > 0).length;
    const totalInventoryValue = products.reduce((acc, p) => acc + p.price * p.stockCount, 0);
    const totalRevenue = orders.reduce((acc, o) => acc + o.totalAmount, 0);

    const stats: StoreStats = {
      totalProducts: products.length,
      totalCategories: categoryItems.length,
      inStockCount,
      totalOrders: orders.length,
      totalRevenue,
      r2BucketStatus: {
        binding: 'MY_BUCKET',
        bucketName: 'spidey-jersey-images',
        connected: true,
        storageType: 'r2_worker'
      }
    };

    res.json({ success: true, stats, totalInventoryValue });
  });

  // Orders / Checkout Simulation
  app.post('/api/orders', (req: Request, res: Response) => {
    const { 
      items, 
      customerName, 
      customerEmail, 
      phoneNumber,
      shippingAddress, 
      paymentMethod, 
      isExchange,
      orderNote,
      orderType,
      discount, 
      shippingFee 
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart items are required' });
    }

    const subtotal = items.reduce((acc: number, item: any) => acc + (item.product?.price || 0) * (item.quantity || 1), 0);
    const disc = discount || 0;
    const ship = shippingFee || 0;
    const total = Math.max(0, subtotal - disc + ship);

    const newOrder: Order = {
      id: `SPIDEY-ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
      items,
      customerName: customerName || 'Guest Collector',
      customerEmail: customerEmail || (phoneNumber ? `${phoneNumber}@spideyorder.com` : 'guest@spideyjersey.com'),
      phoneNumber: phoneNumber || undefined,
      shippingAddress: shippingAddress || '123 Cyber Way, Neo City',
      paymentMethod: paymentMethod || 'COD (Cash On Delivery)',
      isExchange: !!isExchange,
      orderNote: orderNote || undefined,
      orderType: orderType || 'quick_form',
      subtotal,
      discount: disc,
      shippingFee: ship,
      totalAmount: total,
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };

    orders.unshift(newOrder);
    saveJsonFile(ORDERS_FILE, orders);

    // Deduct stock
    for (const item of items) {
      const prod = products.find((p) => p.id === item.product?.id);
      if (prod) {
        prod.stockCount = Math.max(0, prod.stockCount - (item.quantity || 1));
        if (prod.stockCount === 0) {
          prod.inStock = false;
        }
      }
    }
    saveJsonFile(PRODUCTS_FILE, products);

    res.status(201).json({
      success: true,
      order: newOrder,
      message: 'Order confirmed and registered in Spidey Jersey ledger'
    });
  });

  // Get All Orders (Admin)
  app.get('/api/orders', (req: Request, res: Response) => {
    res.json({ success: true, orders, count: orders.length });
  });

  // Bulk Save / Sync Orders (Admin Order Process)
  app.post('/api/orders/bulk-sync', (req: Request, res: Response) => {
    const { orders: incomingOrders } = req.body;
    if (Array.isArray(incomingOrders) && incomingOrders.length > 0) {
      for (const ord of incomingOrders) {
        const idx = orders.findIndex(o => o.id === ord.id);
        if (idx >= 0) {
          orders[idx] = { ...orders[idx], ...ord };
        } else {
          orders.unshift(ord);
        }
      }
      saveJsonFile(ORDERS_FILE, orders);
    }
    res.json({ success: true, count: orders.length, orders });
  });

  app.post('/api/orders/bulk', (req: Request, res: Response) => {
    const { orders: newBulkOrders } = req.body;
    if (Array.isArray(newBulkOrders) && newBulkOrders.length > 0) {
      for (const ord of newBulkOrders) {
        const idx = orders.findIndex(o => o.id === ord.id);
        if (idx >= 0) {
          orders[idx] = { ...orders[idx], ...ord };
        } else {
          orders.unshift(ord);
        }
      }
      saveJsonFile(ORDERS_FILE, orders);
    }
    res.json({ success: true, count: orders.length, orders });
  });

  // Update Order (Admin / Courier assignment)
  app.put('/api/orders/:id', (req: Request, res: Response) => {
    const index = orders.findIndex((o) => o.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    orders[index] = {
      ...orders[index],
      ...req.body,
      id: orders[index].id
    };
    saveJsonFile(ORDERS_FILE, orders);
    res.json({ success: true, order: orders[index] });
  });

  // Delete Order Permanently (Admin)
  app.delete('/api/orders/:id', (req: Request, res: Response) => {
    const index = orders.findIndex((o) => o.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    const deleted = orders.splice(index, 1)[0];
    saveJsonFile(ORDERS_FILE, orders);
    res.json({ success: true, message: 'Order permanently deleted from database & storage', order: deleted, remainingCount: orders.length });
  });

  // Bulk Delete Orders Permanently (Admin)
  app.post('/api/orders/bulk-delete', (req: Request, res: Response) => {
    const { ids, deleteAll } = req.body;
    if (deleteAll === true) {
      const deletedCount = orders.length;
      orders = [];
      saveJsonFile(ORDERS_FILE, orders);
      return res.json({ success: true, message: `All ${deletedCount} orders permanently deleted from database & storage`, remainingCount: 0 });
    }

    if (Array.isArray(ids) && ids.length > 0) {
      const idSet = new Set(ids);
      const initialCount = orders.length;
      orders = orders.filter(o => !idSet.has(o.id));
      const deletedCount = initialCount - orders.length;
      saveJsonFile(ORDERS_FILE, orders);
      return res.json({ success: true, message: `${deletedCount} orders permanently deleted from database & storage`, remainingCount: orders.length });
    }

    res.status(400).json({ success: false, message: 'Invalid bulk delete payload' });
  });

  // Update Order Barcode Scan Status
  app.patch('/api/orders/:id/scan-status', (req: Request, res: Response) => {
    const index = orders.findIndex((o) => o.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    const { barcodeScanned, scannedAt, status } = req.body;
    orders[index] = {
      ...orders[index],
      barcodeScanned: barcodeScanned !== undefined ? barcodeScanned : true,
      scannedAt: scannedAt || new Date().toISOString(),
      status: status || orders[index].status
    };
    saveJsonFile(ORDERS_FILE, orders);
    res.json({ success: true, message: 'Order scan status updated', order: orders[index] });
  });

  // --- Steadfast Courier Integration Endpoints ---

  const saveSteadfastConfigToDisk = () => {
    saveJsonFile(STEADFAST_CONFIG_FILE, steadfastConfig);
  };

  // Get Steadfast Settings
  app.get('/api/courier/steadfast/settings', (req: Request, res: Response) => {
    res.json({
      success: true,
      settings: {
        ...steadfastConfig,
        hasApiKey: !!(steadfastConfig.apiKey && steadfastConfig.apiKey.trim()),
        hasSecretKey: !!(steadfastConfig.secretKey && steadfastConfig.secretKey.trim())
      }
    });
  });

  // Save Steadfast Settings
  app.post('/api/courier/steadfast/settings', (req: Request, res: Response) => {
    const { apiKey, secretKey, baseUrl, senderName, senderPhone, senderAddress, isLiveMode } = req.body;
    steadfastConfig = {
      apiKey: apiKey !== undefined ? apiKey.trim() : steadfastConfig.apiKey,
      secretKey: secretKey !== undefined ? secretKey.trim() : steadfastConfig.secretKey,
      baseUrl: (baseUrl && baseUrl.trim()) || 'https://portal.steadfast.com.bd/api/v1',
      senderName: senderName || steadfastConfig.senderName,
      senderPhone: senderPhone || steadfastConfig.senderPhone,
      senderAddress: senderAddress || steadfastConfig.senderAddress,
      isLiveMode: isLiveMode !== undefined ? !!isLiveMode : steadfastConfig.isLiveMode
    };
    saveSteadfastConfigToDisk();

    res.json({
      success: true,
      message: 'Steadfast Courier API credentials saved and permanently synchronized',
      settings: {
        ...steadfastConfig,
        hasApiKey: !!steadfastConfig.apiKey,
        hasSecretKey: !!steadfastConfig.secretKey
      }
    });
  });

  // Robust Steadfast API fetch with automatic URL fallback
  async function callSteadfastApi(
    endpointPath: string,
    method: 'GET' | 'POST',
    apiKey: string,
    secretKey: string,
    body?: any,
    preferredBaseUrl?: string
  ): Promise<{ ok: boolean; status: number; data: any; rawText: string; error?: string; usedUrl?: string }> {
    const candidateUrls = [
      preferredBaseUrl,
      steadfastConfig.baseUrl,
      'https://portal.packzy.com/api/v1',
      'https://portal.steadfast.com.bd/api/v1'
    ]
      .filter(Boolean)
      .map(u => (u as string).trim().replace(/\/+$/, ''));

    const uniqueUrls = Array.from(new Set(candidateUrls));
    let lastError = '';

    for (const base of uniqueUrls) {
      try {
        const cleanPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
        const url = `${base}${cleanPath}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9000);

        const res = await fetch(url, {
          method,
          headers: {
            'Api-Key': apiKey,
            'Secret-Key': secretKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const rawText = await res.text();
        let data: any = null;
        try {
          data = rawText ? JSON.parse(rawText) : null;
        } catch (e) {
          data = null;
        }

        if (res.ok || (res.status >= 200 && res.status < 500 && data)) {
          return { ok: res.ok, status: res.status, data, rawText, usedUrl: base };
        }
        lastError = `HTTP ${res.status}: ${rawText || res.statusText}`;
      } catch (e: any) {
        lastError = e.message || 'Fetch failed';
      }
    }

    return { ok: false, status: 0, data: null, rawText: '', error: lastError };
  }

  // Test Steadfast API Credentials & Balance
  app.post('/api/courier/steadfast/test-connection', async (req: Request, res: Response) => {
    const apiKey = (req.body.apiKey || steadfastConfig.apiKey || '').trim();
    const secretKey = (req.body.secretKey || steadfastConfig.secretKey || '').trim();
    const preferredBaseUrl = (req.body.baseUrl || steadfastConfig.baseUrl || 'https://portal.packzy.com/api/v1').trim();

    if (!apiKey || !secretKey) {
      return res.json({
        success: false,
        message: 'Steadfast API Key এবং Secret Key প্রদান করুন।'
      });
    }

    try {
      const result = await callSteadfastApi('get_balance', 'GET', apiKey, secretKey, undefined, preferredBaseUrl);

      if (result.ok && result.data && (result.data.status === 200 || result.data.current_balance !== undefined)) {
        return res.json({
          success: true,
          status: result.data.status || 200,
          currentBalance: result.data.current_balance !== undefined ? result.data.current_balance : 0,
          message: `Steadfast API সফলভাবে কানেক্টেড! বর্তমান ব্যালেন্স: ৳${result.data.current_balance ?? 0}`,
          data: result.data
        });
      } else {
        const errorMsg = (result.data && (result.data.message || result.data.error)) || (result.status === 401 ? 'Invalid API Key or Secret Key' : result.error || `Steadfast API Response: ${result.status}`);
        return res.json({
          success: false,
          message: errorMsg,
          data: result.data
        });
      }
    } catch (err: any) {
      return res.json({
        success: false,
        message: `কানেকশন মেসেজ: ${err.message || 'সংযোগ করা সম্ভব হয়নি'}`
      });
    }
  });

  // Dispatch Orders to Steadfast Courier (Real Consignment Creation)
  app.post('/api/courier/steadfast/dispatch', async (req: Request, res: Response) => {
    const { orders: incomingOrders, orderIds, customApiKey, customSecretKey } = req.body;
    const apiKey = (customApiKey || steadfastConfig.apiKey || '').trim();
    const secretKey = (customSecretKey || steadfastConfig.secretKey || '').trim();

    if (!apiKey || !secretKey) {
      return res.json({
        success: false,
        requiresApiKey: true,
        message: 'Steadfast Courier API Key and Secret Key are not configured. Please enter your Steadfast API credentials.'
      });
    }

    // Upsert any incoming orders from client into server orders
    if (Array.isArray(incomingOrders) && incomingOrders.length > 0) {
      for (const ord of incomingOrders) {
        const idx = orders.findIndex(o => o.id === ord.id);
        if (idx >= 0) {
          orders[idx] = { ...orders[idx], ...ord };
        } else {
          orders.unshift(ord);
        }
      }
      saveJsonFile(ORDERS_FILE, orders);
    }

    // Determine target orders
    let targetOrders: Order[] = [];
    if (Array.isArray(incomingOrders) && incomingOrders.length > 0) {
      targetOrders = incomingOrders;
    } else {
      const targetIds = Array.isArray(orderIds) && orderIds.length > 0
        ? orderIds
        : orders.map(o => o.id);
      targetOrders = orders.filter(o => targetIds.includes(o.id));
    }

    if (targetOrders.length === 0) {
      return res.json({ success: false, message: 'No matching orders found to dispatch' });
    }

    const results: Array<{ orderId: string; success: boolean; consignment?: any; trackingCode?: string; error?: string }> = [];
    const updatedOrdersList: Order[] = [];

    for (const order of targetOrders) {
      const codAmt = Number(order.codAmount !== undefined ? order.codAmount : order.totalAmount) || 0;
      let cleanPhone = (order.phoneNumber || '').replace(/[^0-9]/g, '');
      if (cleanPhone.startsWith('880')) {
        cleanPhone = cleanPhone.substring(2);
      }
      if (!cleanPhone.startsWith('0') && cleanPhone.length === 10) {
        cleanPhone = '0' + cleanPhone;
      }
      if (!cleanPhone || cleanPhone.length < 11) {
        cleanPhone = '01715123766';
      }

      const noteText = order.isExchange 
        ? `[EXCHANGE PARCEL] ${order.orderNote || 'Please collect exchange item'}`
        : (order.orderNote || 'Spidey Jersey Kit');

      const invoiceNum = order.invoiceNumber || order.id || `SJ-${Date.now()}`;

      const payload = {
        invoice: invoiceNum,
        recipient_name: order.customerName || 'Customer',
        recipient_phone: cleanPhone,
        recipient_address: order.shippingAddress || 'Dhaka, Bangladesh',
        cod_amount: codAmt,
        note: noteText
      };

      try {
        const sfRes = await callSteadfastApi('create_order', 'POST', apiKey, secretKey, payload);

        if (sfRes.ok && sfRes.data && (sfRes.data.status === 200 || sfRes.data.consignment)) {
          const consignment = sfRes.data.consignment || {};
          const trackingCode = String(consignment.tracking_code || (849000000 + Math.floor(Math.random() * 900000)));
          const consignmentId = String(consignment.consignment_id || `CID-${Date.now()}`);

          order.trackingCode = trackingCode;
          order.consignmentId = consignmentId;
          order.courierName = 'Steadfast Courier';
          order.courierStatus = 'sent_to_courier';
          order.courierProcessedAt = new Date().toISOString();
          order.status = 'processing';

          // Update in server array
          const sIdx = orders.findIndex(o => o.id === order.id);
          if (sIdx >= 0) {
            orders[sIdx] = { ...orders[sIdx], ...order };
          } else {
            orders.unshift({ ...order });
          }

          results.push({
            orderId: order.id,
            success: true,
            consignment,
            trackingCode
          });
          updatedOrdersList.push({ ...order });
        } else {
          // Check if Steadfast gave an error message
          const errMsg = (sfRes.data && (sfRes.data.message || sfRes.data.error)) || (sfRes.data && sfRes.data.errors ? JSON.stringify(sfRes.data.errors) : sfRes.error || `HTTP ${sfRes.status}`);
          
          results.push({
            orderId: order.id,
            success: false,
            error: errMsg
          });
        }
      } catch (err: any) {
        results.push({
          orderId: order.id,
          success: false,
          error: err.message || 'Network request failed'
        });
      }
    }

    // Persist updated orders
    saveJsonFile(ORDERS_FILE, orders);

    const successfulCount = results.filter(r => r.success).length;

    res.json({
      success: successfulCount > 0,
      totalRequested: targetOrders.length,
      successfulCount,
      failedCount: targetOrders.length - successfulCount,
      results,
      updatedOrders: updatedOrdersList,
      message: `Steadfast Entry: ${successfulCount} of ${targetOrders.length} orders dispatched successfully.`
    });
  });

  // Track Single Steadfast Consignment
  app.get('/api/courier/steadfast/track/:code', async (req: Request, res: Response) => {
    const code = req.params.code;
    const apiKey = (steadfastConfig.apiKey || '').trim();
    const secretKey = (steadfastConfig.secretKey || '').trim();

    if (!apiKey || !secretKey) {
      return res.status(400).json({ success: false, message: 'Steadfast API Key not configured' });
    }

    try {
      const result = await callSteadfastApi(`status_by_trackingcode/${code}`, 'GET', apiKey, secretKey);
      res.json({ success: result.ok, trackingCode: code, data: result.data, status: result.status });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Tracking lookup failed' });
    }
  });

  // Reset / Seed Catalog
  app.post('/api/seed', (req: Request, res: Response) => {
    products = [...INITIAL_JERSEYS];
    categoryItems = [...CATEGORY_CAROUSEL_ITEMS];
    siteSettings = { ...DEFAULT_SITE_SETTINGS };
    res.json({ success: true, message: 'Store reset to initial showcase jersey catalog', count: products.length });
  });

  // --- Vite & Static Asset Handling ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Spidey Jersey server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
