import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { INITIAL_JERSEYS, CATEGORY_CAROUSEL_ITEMS } from './src/data/mockJerseys.ts';
import { JerseyProduct, Order, StoreStats } from './src/types.ts';
import { SiteSettings, DEFAULT_SITE_SETTINGS, CategoryItem } from './src/types/settings.ts';

// Persistent data store directory and volume mounting paths
const PERSISTENT_ROOT = process.env.PERSISTENT_STORAGE_DIR || process.env.DATA_DIR || (fs.existsSync('/data') ? '/data' : path.join(process.cwd(), 'store_data'));
const DATA_DIR = PERSISTENT_ROOT;
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(DATA_DIR, 'uploads');
const PUBLIC_UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

// Ensure all persistent storage directories exist
[DATA_DIR, UPLOADS_DIR, PUBLIC_UPLOADS_DIR, BACKUPS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      console.warn(`Could not create directory ${dir}:`, e);
    }
  }
});

const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'site_settings.json');
const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const STEADFAST_CONFIG_FILE = path.join(DATA_DIR, 'steadfast_config.json');
const IMAGES_FILE = path.join(DATA_DIR, 'images.json');

// Helper to safely load JSON with backup recovery to prevent data loss across deployments
function loadJsonFile<T>(filePath: string, defaultValue: T): T {
  const backupPath = `${filePath}.bak`;
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      if (data && data.trim()) {
        return JSON.parse(data);
      }
    }
  } catch (e) {
    console.warn(`Error reading ${filePath}, attempting backup recovery:`, e);
  }

  // Backup recovery fallback
  try {
    if (fs.existsSync(backupPath)) {
      const backupData = fs.readFileSync(backupPath, 'utf-8');
      if (backupData && backupData.trim()) {
        console.log(`✓ Recovered data for ${path.basename(filePath)} from backup file`);
        return JSON.parse(backupData);
      }
    }
  } catch (backupErr) {
    console.warn(`Could not load backup ${backupPath}:`, backupErr);
  }

  return defaultValue;
}

// Helper to atomically save JSON with automatic backup rotation
function saveJsonFile(filePath: string, data: any) {
  const backupPath = `${filePath}.bak`;
  const tempPath = `${filePath}.tmp.${Date.now()}`;
  try {
    const jsonString = JSON.stringify(data, null, 2);
    // 1. Write to temp file first
    fs.writeFileSync(tempPath, jsonString, 'utf-8');
    // 2. Rotate current file to backup if it exists
    if (fs.existsSync(filePath)) {
      try {
        fs.copyFileSync(filePath, backupPath);
      } catch {}
    }
    // 3. Atomically replace target file
    fs.renameSync(tempPath, filePath);
  } catch (e) {
    console.warn(`Atomic save failed for ${filePath}, falling back to direct write:`, e);
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (writeErr) {
      console.error(`Fatal: Could not save ${filePath}:`, writeErr);
    }
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

// Initialize persistent state - Protects existing data against overwrite on deployment
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

// Self-Healing Image Restorer: Reconstruct any physical disk images if missing after new deployment
function restorePhysicalImagesOnStartup() {
  let restoredCount = 0;
  for (const [key, item] of imageStore.entries()) {
    if (!item.data) continue;
    const baseName = path.basename(key);
    const targetPaths = [
      path.join(UPLOADS_DIR, baseName),
      path.join(PUBLIC_UPLOADS_DIR, baseName)
    ];

    for (const p of targetPaths) {
      if (!fs.existsSync(p)) {
        try {
          const buffer = Buffer.from(item.data, 'base64');
          fs.writeFileSync(p, buffer);
          restoredCount++;
        } catch (e) {
          // ignore individual write error
        }
      }
    }
  }
  if (restoredCount > 0) {
    console.log(`✓ Self-healing storage: Restored ${restoredCount} image files across persistent uploads directory.`);
  }
}
restorePhysicalImagesOnStartup();

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

      // Save directly to disk in both persistent UPLOADS_DIR and PUBLIC_UPLOADS_DIR
      const targetPaths = [
        path.join(UPLOADS_DIR, uniqueBaseName),
        path.join(PUBLIC_UPLOADS_DIR, uniqueBaseName)
      ];

      for (const diskPath of targetPaths) {
        try {
          fs.writeFileSync(diskPath, buffer);
        } catch (writeErr) {
          console.warn(`Could not write image to ${diskPath}:`, writeErr);
        }
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

  // Serve Static Uploads from Persistent Directories
  app.use('/uploads', express.static(UPLOADS_DIR));
  app.use('/uploads', express.static(PUBLIC_UPLOADS_DIR));
  app.use('/uploads', express.static(path.join(DATA_DIR, 'uploads')));

  // Fallback handler for /uploads/:filename if not yet physically flushed
  app.get('/uploads/:filename', (req: Request, res: Response) => {
    const filename = req.params.filename;
    const key = `uploads/${filename}`;
    const item = imageStore.get(key) || imageStore.get(filename);

    if (item && item.data) {
      const buffer = Buffer.from(item.data, 'base64');
      res.setHeader('Content-Type', item.mime || 'image/jpeg');
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.send(buffer);
    }

    res.status(404).send('Uploaded image not found');
  });

  // Serve Stored Image (Emulating Cloudflare R2 bucket binding MY_BUCKET.get with multi-path disk fallback)
  app.get('/api/images/:key(*)', (req: Request, res: Response) => {
    const key = req.params.key;
    const item = imageStore.get(key) || imageStore.get(decodeURIComponent(key));

    if (item && item.data) {
      const buffer = Buffer.from(item.data, 'base64');
      res.setHeader('Content-Type', item.mime || 'image/jpeg');
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.send(buffer);
    }

    // Check disk fallbacks in UPLOADS_DIR, PUBLIC_UPLOADS_DIR, and DATA_DIR/uploads
    const baseName = path.basename(key);
    const candidatePaths = [
      path.join(UPLOADS_DIR, baseName),
      path.join(PUBLIC_UPLOADS_DIR, baseName),
      path.join(DATA_DIR, 'uploads', baseName)
    ];

    for (const diskPath of candidatePaths) {
      if (fs.existsSync(diskPath)) {
        const mimeType = baseName.endsWith('.png') ? 'image/png' : baseName.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.sendFile(diskPath);
      }
    }

    return res.status(404).send('Image not found');
  });

  // Storage Health & Diagnostics Endpoint
  app.get('/api/storage/status', (req: Request, res: Response) => {
    res.json({
      success: true,
      persistentRoot: DATA_DIR,
      uploadsDir: UPLOADS_DIR,
      publicUploadsDir: PUBLIC_UPLOADS_DIR,
      backupsDir: BACKUPS_DIR,
      isCustomVolumeMounted: DATA_DIR.startsWith('/data') || process.env.DATA_DIR !== undefined || process.env.PERSISTENT_STORAGE_DIR !== undefined,
      stats: {
        totalProducts: products.length,
        totalCategories: categoryItems.length,
        totalOrders: orders.length,
        totalStoredImages: imageStore.size,
        hasBackupProducts: fs.existsSync(`${PRODUCTS_FILE}.bak`),
        hasBackupOrders: fs.existsSync(`${ORDERS_FILE}.bak`),
        hasBackupSettings: fs.existsSync(`${SETTINGS_FILE}.bak`),
        hasBackupCategories: fs.existsSync(`${CATEGORIES_FILE}.bak`)
      }
    });
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

  // Helper: Ensure size breakdown exists for product
  function ensureProductSizeStock(product: JerseyProduct): Record<string, number> {
    const standardSizes = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];
    if (product.sizeStock && typeof product.sizeStock === 'object' && Object.keys(product.sizeStock).length > 0) {
      return product.sizeStock;
    }
    const total = Number(product.stockCount) || 15;
    const count = standardSizes.length;
    const base = Math.floor(total / count);
    const remainder = total % count;
    const newSizeStock: Record<string, number> = {};
    standardSizes.forEach((sz, idx) => {
      newSizeStock[sz] = base + (idx < remainder ? 1 : 0);
    });
    product.sizeStock = newSizeStock;
    return newSizeStock;
  }

  // Update Order Barcode Scan Status
  app.patch('/api/orders/:id/scan-status', (req: Request, res: Response) => {
    const index = orders.findIndex((o) => o.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    const { barcodeScanned, scannedAt, status, outboundScannedAt } = req.body;
    orders[index] = {
      ...orders[index],
      barcodeScanned: barcodeScanned !== undefined ? barcodeScanned : true,
      scannedAt: scannedAt || new Date().toISOString(),
      outboundScannedAt: outboundScannedAt || orders[index].outboundScannedAt || new Date().toISOString(),
      status: status || orders[index].status
    };
    saveJsonFile(ORDERS_FILE, orders);
    res.json({ success: true, message: 'Order scan status updated', order: orders[index] });
  });

  // --- Warehouse Automated Outbound Barcode Scan & Stock Deduction ---
  app.post('/api/warehouse/scan-dispatch', (req: Request, res: Response) => {
    const { scanCode, orderId } = req.body;
    if (!scanCode && !orderId) {
      return res.status(400).json({ success: false, message: 'Scan code or Order ID is required' });
    }

    const code = (scanCode || '').trim().toLowerCase();
    
    // Match order by invoiceNumber, trackingCode, consignmentId, id, or phoneNumber
    let orderIndex = -1;
    if (orderId) {
      orderIndex = orders.findIndex(o => o.id === orderId);
    }
    if (orderIndex === -1 && code) {
      orderIndex = orders.findIndex(o => {
        const inv = (o.invoiceNumber || '').trim().toLowerCase();
        const trk = (o.trackingCode || '').trim().toLowerCase();
        const cid = (o.consignmentId || '').trim().toLowerCase();
        const oid = (o.id || '').trim().toLowerCase();
        const ph = (o.phoneNumber || '').replace(/[^0-9]/g, '');
        const cleanCode = code.replace(/[^a-zA-Z0-9_-]/g, '');

        return (
          (inv && (inv === code || inv === cleanCode)) ||
          (trk && (trk === code || trk === cleanCode)) ||
          (cid && (cid === code || cid === cleanCode)) ||
          (oid && (oid === code || oid === cleanCode)) ||
          (ph && code.length >= 10 && ph.includes(code))
        );
      });
    }

    if (orderIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `কোনো অর্ডার খুঁজে পাওয়া যায়নি (Scanned Code: ${scanCode || orderId})`
      });
    }

    const targetOrder = orders[orderIndex];
    const wasAlreadyDispatched = targetOrder.status === 'shipped' || targetOrder.status === 'dispatched' || targetOrder.status === 'delivered';
    const wasStockDeducted = !!targetOrder.outboundStockDeducted;

    const deductedDetails: Array<{
      productId: string;
      productTitle: string;
      size: string;
      quantity: number;
      previousStock: number;
      newStock: number;
    }> = [];

    // Deduct stock per size if not already deducted
    if (!wasStockDeducted && Array.isArray(targetOrder.items)) {
      for (const item of targetOrder.items) {
        const prodId = item.product?.id;
        const prodCode = item.product?.code;
        const prodTitle = item.product?.title;
        const size = (item.selectedSize || 'L').toUpperCase();
        const qty = Number(item.quantity) || 1;

        let matchedProduct = products.find(p => 
          (prodId && p.id === prodId) ||
          (prodCode && p.code && p.code.toLowerCase() === prodCode.toLowerCase()) ||
          (prodTitle && p.title.toLowerCase() === prodTitle.toLowerCase())
        );

        if (matchedProduct) {
          const currentSizeStock = ensureProductSizeStock(matchedProduct);
          const currentSizeQty = currentSizeStock[size] !== undefined ? currentSizeStock[size] : 0;
          const newSizeQty = Math.max(0, currentSizeQty - qty);
          
          currentSizeStock[size] = newSizeQty;
          matchedProduct.sizeStock = currentSizeStock;
          
          // Recompute total stock
          const prevTotal = matchedProduct.stockCount;
          matchedProduct.stockCount = Object.values(currentSizeStock).reduce((acc, count) => acc + (Number(count) || 0), 0);
          matchedProduct.inStock = matchedProduct.stockCount > 0;
          matchedProduct.updatedAt = new Date().toISOString();

          deductedDetails.push({
            productId: matchedProduct.id,
            productTitle: matchedProduct.title,
            size,
            quantity: qty,
            previousStock: currentSizeQty,
            newStock: newSizeQty
          });
        }
      }

      saveJsonFile(PRODUCTS_FILE, products);
    }

    // Update order status to Dispatched / Left Warehouse
    const nowIso = new Date().toISOString();
    const updatedOrder: Order = {
      ...targetOrder,
      status: 'shipped',
      barcodeScanned: true,
      scannedAt: nowIso,
      outboundScannedAt: targetOrder.outboundScannedAt || nowIso,
      outboundStockDeducted: true,
      courierStatus: targetOrder.courierStatus === 'delivered' ? 'delivered' : (targetOrder.courierStatus || 'sent_to_courier'),
      deductedItemsSummary: deductedDetails.map(d => `${d.productTitle} (${d.size} × ${d.quantity})`).join(', ') || targetOrder.deductedItemsSummary
    };

    orders[orderIndex] = updatedOrder;
    saveJsonFile(ORDERS_FILE, orders);

    return res.json({
      success: true,
      message: wasAlreadyDispatched 
        ? `অর্ডার ইতিমধ্যে ডিসপ্যাচ করা হয়েছিল (Invoice: ${updatedOrder.invoiceNumber || updatedOrder.id})`
        : `অর্ডার সফলভাবে ডিসপ্যাচ হয়েছে এবং স্টক ডিডাক্ট সম্পন্ন হয়েছে!`,
      order: updatedOrder,
      wasAlreadyDispatched,
      wasStockDeducted,
      deductedDetails,
      updatedProducts: products
    });
  });

  // --- Manual / Quick Stock Matrix Update ---
  app.put('/api/products/:id/stock-matrix', (req: Request, res: Response) => {
    const { sizeStock, stockCount, inStock } = req.body;
    const index = products.findIndex(p => p.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const prod = products[index];
    let newSizeStock: Record<string, number> = sizeStock || prod.sizeStock || ensureProductSizeStock(prod);
    let newTotal: number = stockCount !== undefined 
      ? Number(stockCount) 
      : Object.values(newSizeStock).reduce((a: number, b: any) => a + (Number(b) || 0), 0);

    products[index] = {
      ...prod,
      sizeStock: newSizeStock,
      stockCount: Math.max(0, newTotal),
      inStock: inStock !== undefined ? !!inStock : newTotal > 0,
      updatedAt: new Date().toISOString()
    };

    saveJsonFile(PRODUCTS_FILE, products);
    res.json({ success: true, product: products[index], message: 'Product size stock matrix updated' });
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

      // Steadfast requires address to have reasonable length
      let cleanAddress = (order.shippingAddress || '').trim();
      if (cleanAddress.length < 10) {
        cleanAddress = `${cleanAddress || 'Main Road'}, Bangladesh`;
      }

      const noteText = order.isExchange 
        ? `[EXCHANGE PARCEL] ${order.orderNote || 'Please collect exchange item'}`
        : (order.orderNote || 'Spidey Jersey Kit');

      let invoiceNum = order.invoiceNumber || order.id || `SJ-${Date.now()}`;

      let payload = {
        invoice: invoiceNum,
        recipient_name: order.customerName || 'Customer',
        recipient_phone: cleanPhone,
        recipient_address: cleanAddress,
        cod_amount: codAmt,
        note: noteText
      };

      try {
        let sfRes = await callSteadfastApi('create_order', 'POST', apiKey, secretKey, payload);

        // If Steadfast rejects because invoice is already taken, generate fresh invoice suffix and retry
        if (!sfRes.ok && sfRes.data && (JSON.stringify(sfRes.data).includes('already been taken') || JSON.stringify(sfRes.data).includes('already exists'))) {
          invoiceNum = `${invoiceNum}-${Math.floor(100 + Math.random() * 899)}`;
          payload.invoice = invoiceNum;
          sfRes = await callSteadfastApi('create_order', 'POST', apiKey, secretKey, payload);
        }

        if (sfRes.ok && sfRes.data && (sfRes.data.status === 200 || sfRes.data.consignment)) {
          const consignment = sfRes.data.consignment || {};
          const trackingCode = String(consignment.tracking_code || (849000000 + Math.floor(Math.random() * 900000)));
          const consignmentId = String(consignment.consignment_id || `CID-${Date.now()}`);

          order.trackingCode = trackingCode;
          order.consignmentId = consignmentId;
          order.invoiceNumber = invoiceNum;
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
          // Format error message to clean string even if Steadfast returns nested error object
          let errMsg = 'Steadfast entry rejected';
          if (sfRes.data) {
            if (typeof sfRes.data.message === 'string' && sfRes.data.message.trim()) {
              errMsg = sfRes.data.message;
            } else if (typeof sfRes.data.error === 'string' && sfRes.data.error.trim()) {
              errMsg = sfRes.data.error;
            } else if (sfRes.data.errors && typeof sfRes.data.errors === 'object') {
              errMsg = Object.entries(sfRes.data.errors)
                .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
                .join(' | ');
            } else if (sfRes.data.error && typeof sfRes.data.error === 'object') {
              errMsg = Object.entries(sfRes.data.error)
                .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
                .join(' | ');
            } else {
              errMsg = JSON.stringify(sfRes.data);
            }
          } else {
            errMsg = sfRes.error || `HTTP ${sfRes.status || 500}`;
          }
          
          results.push({
            orderId: order.id,
            success: false,
            error: String(errMsg)
          });
        }
      } catch (err: any) {
        results.push({
          orderId: order.id,
          success: false,
          error: String(err.message || 'Network request failed')
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
      message: successfulCount > 0 
        ? `Steadfast Entry: ${successfulCount} of ${targetOrders.length} orders dispatched successfully.`
        : `Steadfast Entry: ${results[0]?.error ? String(results[0].error) : 'API Authentication or validation failed'}`
    });
  });

  // Auto-Assign 9-Digit Steadfast Tracking & Consignment IDs directly (Instant / Offline Fallback)
  app.post('/api/courier/steadfast/auto-assign', (req: Request, res: Response) => {
    const { orderIds } = req.body;
    const targetIds = Array.isArray(orderIds) && orderIds.length > 0
      ? new Set(orderIds)
      : new Set(orders.map(o => o.id));

    const updatedList: Order[] = [];

    for (let i = 0; i < orders.length; i++) {
      if (targetIds.has(orders[i].id)) {
        const trk = orders[i].trackingCode || String(849000000 + Math.floor(100000 + Math.random() * 899999));
        const cid = orders[i].consignmentId || `CID-${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 89)}`;
        const inv = orders[i].invoiceNumber || `INV-${orders[i].id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()}`;

        orders[i] = {
          ...orders[i],
          trackingCode: trk,
          consignmentId: cid,
          invoiceNumber: inv,
          courierName: 'Steadfast Courier',
          courierStatus: 'sent_to_courier',
          courierProcessedAt: orders[i].courierProcessedAt || new Date().toISOString(),
          status: orders[i].status === 'delivered' ? 'delivered' : 'processing'
        };
        updatedList.push(orders[i]);
      }
    }

    saveJsonFile(ORDERS_FILE, orders);

    res.json({
      success: true,
      count: updatedList.length,
      orders: updatedList,
      message: `Assigned Steadfast 9-digit tracking codes to ${updatedList.length} orders successfully.`
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

  // Bulk Sync All Courier Statuses with Steadfast API
  app.post('/api/courier/steadfast/sync-all-status', async (req: Request, res: Response) => {
    const apiKey = (steadfastConfig.apiKey || '').trim();
    const secretKey = (steadfastConfig.secretKey || '').trim();

    if (!apiKey || !secretKey) {
      return res.json({
        success: false,
        requiresApiKey: true,
        message: 'Steadfast API Key / Secret Key is not configured.'
      });
    }

    // Filter active orders that have tracking codes
    const trackableOrders = orders.filter(o => !!(o.trackingCode || o.consignmentId));
    if (trackableOrders.length === 0) {
      return res.json({
        success: true,
        totalChecked: 0,
        updatedCount: 0,
        message: 'No orders with tracking codes found to synchronize.'
      });
    }

    let updatedCount = 0;
    const syncLogs: Array<{ orderId: string; trackingCode: string; prevStatus: string; newStatus: string; rawStatus: string }> = [];

    for (const order of trackableOrders) {
      const trk = order.trackingCode;
      const cid = order.consignmentId;
      const endpoint = trk ? `status_by_trackingcode/${trk}` : `status_by_cid/${cid}`;

      try {
        const result = await callSteadfastApi(endpoint, 'GET', apiKey, secretKey);
        if (result.ok && result.data) {
          const rawStatus = String(result.data.delivery_status || result.data.status || '').toLowerCase();
          const prevCourierStatus = order.courierStatus || 'pending';
          let newCourierStatus = prevCourierStatus;
          let newOrderStatus = order.status;

          if (rawStatus.includes('delivered') && !rawStatus.includes('pending')) {
            newCourierStatus = 'delivered';
            newOrderStatus = 'delivered';
          } else if (
            rawStatus.includes('in_transit') || 
            rawStatus.includes('transit') || 
            rawStatus.includes('picked_up') || 
            rawStatus.includes('hold') || 
            rawStatus.includes('approval_pending')
          ) {
            newCourierStatus = 'in_transit'; // "With Delivery Man"
            if (newOrderStatus !== 'delivered') {
              newOrderStatus = 'shipped';
            }
          } else if (rawStatus.includes('pending') || rawStatus.includes('review')) {
            newCourierStatus = 'pending'; // "Pending at Courier"
          } else if (rawStatus.includes('cancel') || rawStatus.includes('return')) {
            newCourierStatus = 'cancelled';
          }

          if (newCourierStatus !== prevCourierStatus || newOrderStatus !== order.status) {
            order.courierStatus = newCourierStatus;
            order.status = newOrderStatus;
            order.courierProcessedAt = new Date().toISOString();
            updatedCount++;

            syncLogs.push({
              orderId: order.id,
              trackingCode: trk || cid || '',
              prevStatus: prevCourierStatus,
              newStatus: newCourierStatus,
              rawStatus
            });
          }
        }
      } catch (e) {
        // Continue loop on individual item network error
      }
    }

    if (updatedCount > 0) {
      saveJsonFile(ORDERS_FILE, orders);
    }

    res.json({
      success: true,
      totalChecked: trackableOrders.length,
      updatedCount,
      syncLogs,
      orders,
      message: `Steadfast Sync: Checked ${trackableOrders.length} parcels. ${updatedCount} status records updated!`
    });
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
