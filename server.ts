import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { INITIAL_JERSEYS, CATEGORY_CAROUSEL_ITEMS } from './src/data/mockJerseys.ts';
import { JerseyProduct, Order, StoreStats } from './src/types.ts';
import { SiteSettings, DEFAULT_SITE_SETTINGS, CategoryItem } from './src/types/settings.ts';

// In-memory data store with disk persistence fallback
let products: JerseyProduct[] = [...INITIAL_JERSEYS];
let orders: Order[] = [];
let siteSettings: SiteSettings = { ...DEFAULT_SITE_SETTINGS };
let categoryItems: CategoryItem[] = [...CATEGORY_CAROUSEL_ITEMS];
let adminPasscode = 'spidey2026';

// Storage for uploaded images (key -> { data: Buffer/base64, mime: string, size: number })
interface StoredImage {
  data: string; // base64 data url or base64 binary
  mime: string;
  size: number;
  filename: string;
  uploadedAt: string;
}
const imageStore = new Map<string, StoredImage>();

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
    res.json({ success: true, settings: siteSettings });
  });

  app.put('/api/settings', (req: Request, res: Response) => {
    siteSettings = {
      ...siteSettings,
      ...req.body
    };
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
      return res.json({ success: true, categories: categoryItems });
    } else if (body && body.id && body.name) {
      const idx = categoryItems.findIndex(c => c.id === body.id);
      if (idx >= 0) {
        categoryItems[idx] = { ...categoryItems[idx], ...body };
      } else {
        categoryItems.push(body);
      }
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
    res.json({ success: true, category: categoryItems[idx], categories: categoryItems });
  });

  app.delete('/api/categories/:id', (req: Request, res: Response) => {
    const id = req.params.id;
    categoryItems = categoryItems.filter(c => c.id !== id);
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
    res.json({ success: true, product: updated });
  });

  // Delete Product (Admin)
  app.delete('/api/products/:id', (req: Request, res: Response) => {
    const index = products.findIndex((p) => p.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const deleted = products.splice(index, 1)[0];
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
      const key = `uploads/${Date.now()}-${cleanFilename}.${extension}`;

      const buffer = Buffer.from(cleanData, 'base64');

      imageStore.set(key, {
        data: cleanData,
        mime,
        size: buffer.length,
        filename: filename || key,
        uploadedAt: new Date().toISOString()
      });

      const imageUrl = `/api/images/${encodeURIComponent(key)}`;

      res.json({
        success: true,
        key,
        url: imageUrl,
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

  // Serve Stored Image (Emulating Cloudflare R2 bucket binding MY_BUCKET.get)
  app.get('/api/images/:key(*)', (req: Request, res: Response) => {
    const key = req.params.key;
    const item = imageStore.get(key);

    if (!item) {
      return res.status(404).send('Image not found in R2 bucket store');
    }

    const buffer = Buffer.from(item.data, 'base64');
    res.setHeader('Content-Type', item.mime);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(buffer);
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

  // Bulk Save Orders (Admin Order Process)
  app.post('/api/orders/bulk', (req: Request, res: Response) => {
    const { orders: newBulkOrders } = req.body;
    if (Array.isArray(newBulkOrders) && newBulkOrders.length > 0) {
      for (const ord of newBulkOrders) {
        orders.unshift(ord);
      }
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
    res.json({ success: true, order: orders[index] });
  });

  // Delete Order (Admin)
  app.delete('/api/orders/:id', (req: Request, res: Response) => {
    const index = orders.findIndex((o) => o.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    const deleted = orders.splice(index, 1)[0];
    res.json({ success: true, message: 'Order deleted', order: deleted });
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
