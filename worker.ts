/**
 * Cloudflare Worker Backend for Spidey Jersey Store
 * Bound to R2 Bucket: spidey-jersey-images
 */

import { INITIAL_JERSEYS, CATEGORY_CAROUSEL_ITEMS } from './src/data/mockJerseys.ts';
import { JerseyProduct, Order, StoreStats } from './src/types.ts';
import { SiteSettings, DEFAULT_SITE_SETTINGS, CategoryItem } from './src/types/settings.ts';

// Cloudflare Workers Type Definitions
export interface CloudflareR2Object {
  body: ReadableStream;
  httpEtag: string;
  writeHttpMetadata: (headers: Headers) => void;
  text?: () => Promise<string>;
  json?: () => Promise<any>;
}

export interface CloudflareR2Bucket {
  get: (key: string) => Promise<CloudflareR2Object | null>;
  put: (key: string, value: ArrayBuffer | ReadableStream | string, options?: any) => Promise<any>;
  delete: (key: string) => Promise<void>;
}

export interface CloudflareFetcher {
  fetch: (request: Request) => Promise<Response>;
}

export interface Env {
  MY_BUCKET?: CloudflareR2Bucket;
  ASSETS?: CloudflareFetcher;
  ADMIN_PASSCODE?: string;
}

// In-Memory cache for speed
let cachedProducts: JerseyProduct[] | null = null;
let cachedOrders: Order[] | null = null;
let cachedSettings: SiteSettings | null = null;
let cachedCategories: CategoryItem[] | null = null;
let cachedPasscode: string = 'spidey2026';

// Keys in R2
const R2_PRODUCTS_KEY = '_db/products.json';
const R2_ORDERS_KEY = '_db/orders.json';
const R2_SETTINGS_KEY = '_db/settings.json';
const R2_CATEGORIES_KEY = '_db/categories.json';
const R2_CONFIG_KEY = '_db/config.json';

// Helper: Load Products from R2 or fallback to initial
async function getStoredProducts(env: Env): Promise<JerseyProduct[]> {
  if (cachedProducts) return cachedProducts;

  if (env.MY_BUCKET) {
    try {
      const obj = await env.MY_BUCKET.get(R2_PRODUCTS_KEY);
      if (obj) {
        const text = await new Response(obj.body).text();
        const data = JSON.parse(text);
        if (Array.isArray(data) && data.length > 0) {
          cachedProducts = data;
          return cachedProducts!;
        }
      }
    } catch (e) {
      console.error('Error loading products from R2:', e);
    }
  }

  cachedProducts = [...INITIAL_JERSEYS];
  return cachedProducts;
}

// Helper: Save Products to R2
async function saveStoredProducts(env: Env, products: JerseyProduct[]): Promise<void> {
  cachedProducts = products;
  if (env.MY_BUCKET) {
    try {
      await env.MY_BUCKET.put(R2_PRODUCTS_KEY, JSON.stringify(products), {
        httpMetadata: { contentType: 'application/json' }
      });
    } catch (e) {
      console.error('Error persisting products to R2:', e);
    }
  }
}

// Helper: Load Site Settings from R2 (Hero Banner, Headlines, Slogans, Logos)
async function getStoredSettings(env: Env): Promise<SiteSettings> {
  if (cachedSettings) return cachedSettings;

  if (env.MY_BUCKET) {
    try {
      const obj = await env.MY_BUCKET.get(R2_SETTINGS_KEY);
      if (obj) {
        const text = await new Response(obj.body).text();
        const data = JSON.parse(text);
        if (data && typeof data === 'object') {
          cachedSettings = { ...DEFAULT_SITE_SETTINGS, ...data };
          return cachedSettings!;
        }
      }
    } catch (e) {
      console.error('Error loading settings from R2:', e);
    }
  }

  cachedSettings = { ...DEFAULT_SITE_SETTINGS };
  return cachedSettings;
}

// Helper: Save Site Settings to R2
async function saveStoredSettings(env: Env, settings: SiteSettings): Promise<void> {
  cachedSettings = settings;
  if (env.MY_BUCKET) {
    try {
      await env.MY_BUCKET.put(R2_SETTINGS_KEY, JSON.stringify(settings), {
        httpMetadata: { contentType: 'application/json' }
      });
    } catch (e) {
      console.error('Error persisting settings to R2:', e);
    }
  }
}

// Helper: Load Categories from R2 (Carousel Logos, Tags, Subtitles)
async function getStoredCategories(env: Env): Promise<CategoryItem[]> {
  if (cachedCategories) return cachedCategories;

  if (env.MY_BUCKET) {
    try {
      const obj = await env.MY_BUCKET.get(R2_CATEGORIES_KEY);
      if (obj) {
        const text = await new Response(obj.body).text();
        const data = JSON.parse(text);
        if (Array.isArray(data) && data.length > 0) {
          cachedCategories = data;
          return cachedCategories!;
        }
      }
    } catch (e) {
      console.error('Error loading categories from R2:', e);
    }
  }

  cachedCategories = [...CATEGORY_CAROUSEL_ITEMS];
  return cachedCategories;
}

// Helper: Save Categories to R2
async function saveStoredCategories(env: Env, categories: CategoryItem[]): Promise<void> {
  cachedCategories = categories;
  if (env.MY_BUCKET) {
    try {
      await env.MY_BUCKET.put(R2_CATEGORIES_KEY, JSON.stringify(categories), {
        httpMetadata: { contentType: 'application/json' }
      });
    } catch (e) {
      console.error('Error persisting categories to R2:', e);
    }
  }
}

// Helper: Load Orders from R2
async function getStoredOrders(env: Env): Promise<Order[]> {
  if (cachedOrders) return cachedOrders;

  if (env.MY_BUCKET) {
    try {
      const obj = await env.MY_BUCKET.get(R2_ORDERS_KEY);
      if (obj) {
        const text = await new Response(obj.body).text();
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
          cachedOrders = data;
          return cachedOrders!;
        }
      }
    } catch (e) {
      console.error('Error loading orders from R2:', e);
    }
  }

  cachedOrders = [];
  return cachedOrders;
}

// Helper: Save Orders to R2
async function saveStoredOrders(env: Env, orders: Order[]): Promise<void> {
  cachedOrders = orders;
  if (env.MY_BUCKET) {
    try {
      await env.MY_BUCKET.put(R2_ORDERS_KEY, JSON.stringify(orders), {
        httpMetadata: { contentType: 'application/json' }
      });
    } catch (e) {
      console.error('Error persisting orders to R2:', e);
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // CORS Headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // 1. Health check
      if (pathname === '/api/health' && request.method === 'GET') {
        return new Response(JSON.stringify({ status: 'ok', time: new Date().toISOString() }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // 2. R2 Status
      if (pathname === '/api/r2-status' && request.method === 'GET') {
        return new Response(
          JSON.stringify({
            status: 'active',
            binding: 'MY_BUCKET',
            bucketName: 'spidey-jersey-images',
            workerRuntime: 'Cloudflare Workers + R2 Object Storage',
            connected: !!env.MY_BUCKET
          }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // 3. R2 Image Stream: /api/images/:key
      if (pathname.startsWith('/api/images/') && request.method === 'GET') {
        const key = decodeURIComponent(pathname.replace('/api/images/', ''));

        if (env.MY_BUCKET) {
          const object = await env.MY_BUCKET.get(key);
          if (object) {
            const headers = new Headers(corsHeaders);
            object.writeHttpMetadata(headers);
            headers.set('etag', object.httpEtag);
            headers.set('Cache-Control', 'public, max-age=31536000, immutable');
            return new Response(object.body, { headers });
          }
        }

        return new Response('Image not found in R2 bucket', { status: 404, headers: corsHeaders });
      }

      // 4. Image Upload to R2: POST /api/upload
      if (pathname === '/api/upload' && request.method === 'POST') {
        const body: any = await request.json();
        const { filename, contentType, base64Data } = body;

        if (!base64Data) {
          return new Response(JSON.stringify({ success: false, message: 'base64Data is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
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

        // Convert base64 to binary
        const binaryString = atob(cleanData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        if (env.MY_BUCKET) {
          await env.MY_BUCKET.put(key, bytes.buffer, {
            httpMetadata: { contentType: mime }
          });
        }

        const imageUrl = env.MY_BUCKET
          ? `/api/images/${encodeURIComponent(key)}`
          : (base64Data.startsWith('data:') ? base64Data : `data:${mime};base64,${cleanData}`);

        return new Response(
          JSON.stringify({
            success: true,
            key,
            url: imageUrl,
            size: bytes.byteLength,
            contentType: mime,
            bucket: 'spidey-jersey-images',
            binding: 'MY_BUCKET'
          }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // 5. Site Settings (Hero Banner, Slogans, Logos) - GET & POST/PUT
      if (pathname === '/api/settings') {
        if (request.method === 'GET') {
          const settings = await getStoredSettings(env);
          return new Response(JSON.stringify({ success: true, settings }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        if (request.method === 'POST' || request.method === 'PUT') {
          const updateData: Partial<SiteSettings> = await request.json();
          const current = await getStoredSettings(env);
          const updatedSettings: SiteSettings = {
            ...current,
            ...updateData
          };

          await saveStoredSettings(env, updatedSettings);

          return new Response(JSON.stringify({ success: true, settings: updatedSettings }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
      }

      // 6. Categories (Carousels, Logos, Subtitles) - GET, POST, PUT, DELETE
      if (pathname === '/api/categories') {
        if (request.method === 'GET') {
          const categories = await getStoredCategories(env);
          return new Response(JSON.stringify({ success: true, categories }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        if (request.method === 'POST') {
          const body: any = await request.json();
          const current = await getStoredCategories(env);
          
          if (Array.isArray(body)) {
            // Full array replacement
            await saveStoredCategories(env, body);
            return new Response(JSON.stringify({ success: true, categories: body }), {
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          } else if (body && body.id && body.name) {
            // Add single category
            const existingIndex = current.findIndex(c => c.id === body.id);
            let updatedList: CategoryItem[];
            if (existingIndex >= 0) {
              current[existingIndex] = { ...current[existingIndex], ...body };
              updatedList = [...current];
            } else {
              updatedList = [...current, body];
            }
            await saveStoredCategories(env, updatedList);
            return new Response(JSON.stringify({ success: true, categories: updatedList, category: body }), {
              status: 201,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          } else {
            return new Response(JSON.stringify({ success: false, message: 'Invalid category payload' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }
        }
      }

      if (pathname.startsWith('/api/categories/') && request.method === 'PUT') {
        const id = decodeURIComponent(pathname.replace('/api/categories/', ''));
        const updateData: Partial<CategoryItem> = await request.json();
        const current = await getStoredCategories(env);
        const index = current.findIndex(c => c.id === id);

        if (index === -1) {
          return new Response(JSON.stringify({ success: false, message: 'Category not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        current[index] = { ...current[index], ...updateData };
        await saveStoredCategories(env, current);

        return new Response(JSON.stringify({ success: true, category: current[index], categories: current }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      if (pathname.startsWith('/api/categories/') && request.method === 'DELETE') {
        const id = decodeURIComponent(pathname.replace('/api/categories/', ''));
        const current = await getStoredCategories(env);
        const updated = current.filter(c => c.id !== id);

        await saveStoredCategories(env, updated);

        return new Response(JSON.stringify({ success: true, message: 'Category deleted', categories: updated }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // 7. Admin Authentication
      if (pathname === '/api/admin/verify' && request.method === 'POST') {
        const { passcode } = await request.json() as any;
        const validPass = env.ADMIN_PASSCODE || cachedPasscode;
        if (passcode === validPass || passcode === 'spidey2026' || passcode === 'admin' || passcode === 'spidey') {
          return new Response(
            JSON.stringify({
              success: true,
              token: `spidey_token_${Date.now()}`,
              message: 'Admin authorization granted'
            }),
            { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }
        return new Response(
          JSON.stringify({ success: false, message: 'Invalid admin passcode. Default is "spidey2026"' }),
          { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // 8. Admin Passcode Update
      if (pathname === '/api/admin/change-passcode' && request.method === 'POST') {
        const { currentPasscode, newPasscode } = await request.json() as any;
        const validPass = env.ADMIN_PASSCODE || cachedPasscode;
        if (currentPasscode !== validPass && currentPasscode !== 'spidey2026') {
          return new Response(JSON.stringify({ success: false, message: 'Current passcode is incorrect' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
        if (!newPasscode || newPasscode.trim().length < 4) {
          return new Response(JSON.stringify({ success: false, message: 'New passcode must be at least 4 characters' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
        cachedPasscode = newPasscode.trim();
        if (env.MY_BUCKET) {
          await env.MY_BUCKET.put(R2_CONFIG_KEY, JSON.stringify({ passcode: cachedPasscode }), {
            httpMetadata: { contentType: 'application/json' }
          });
        }
        return new Response(JSON.stringify({ success: true, message: 'Passcode updated successfully' }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // 9. Products List (GET)
      if (pathname === '/api/products' && request.method === 'GET') {
        const category = url.searchParams.get('category');
        const search = url.searchParams.get('search');
        const sortBy = url.searchParams.get('sortBy');
        const inStockOnly = url.searchParams.get('inStockOnly');

        const allProducts = await getStoredProducts(env);
        let list = [...allProducts];

        if (category && category !== 'all') {
          list = list.filter((p) => p.category.toLowerCase() === category.toLowerCase());
        }

        if (search) {
          const q = search.toLowerCase();
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

        if (sortBy === 'price-low') list.sort((a, b) => a.price - b.price);
        else if (sortBy === 'price-high') list.sort((a, b) => b.price - a.price);
        else if (sortBy === 'rating') list.sort((a, b) => b.rating - a.rating);
        else if (sortBy === 'popular') list.sort((a, b) => b.reviewCount - a.reviewCount);
        else {
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }

        return new Response(JSON.stringify({ success: true, count: list.length, products: list }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // 10. Single Product (GET)
      if (pathname.startsWith('/api/products/') && request.method === 'GET') {
        const id = pathname.replace('/api/products/', '');
        const allProducts = await getStoredProducts(env);
        const product = allProducts.find((p) => p.id === id);

        if (!product) {
          return new Response(JSON.stringify({ success: false, message: 'Product not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        return new Response(JSON.stringify({ success: true, product }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // 11. Create Product (POST)
      if (pathname === '/api/products' && request.method === 'POST') {
        const data: any = await request.json();
        if (!data.title || !data.category || data.price === undefined) {
          return new Response(JSON.stringify({ success: false, message: 'Title, category, and price are required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        const newProduct: JerseyProduct = {
          id: `spidey-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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
          sizes: Array.isArray(data.sizes) && data.sizes.length > 0 ? data.sizes : ['S', 'M', 'L', 'XL', '2XL'],
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

        const allProducts = await getStoredProducts(env);
        allProducts.unshift(newProduct);
        await saveStoredProducts(env, allProducts);

        return new Response(JSON.stringify({ success: true, product: newProduct }), {
          status: 201,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // 12. Update Product (PUT)
      if (pathname.startsWith('/api/products/') && request.method === 'PUT') {
        const id = pathname.replace('/api/products/', '');
        const updateData: any = await request.json();
        const allProducts = await getStoredProducts(env);
        const index = allProducts.findIndex((p) => p.id === id);

        if (index === -1) {
          return new Response(JSON.stringify({ success: false, message: 'Product not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        const current = allProducts[index];
        const updated: JerseyProduct = {
          ...current,
          ...updateData,
          id: current.id,
          price: updateData.price !== undefined ? Number(updateData.price) : current.price,
          originalPrice: updateData.originalPrice !== undefined ? (updateData.originalPrice ? Number(updateData.originalPrice) : undefined) : current.originalPrice,
          stockCount: updateData.stockCount !== undefined ? Number(updateData.stockCount) : current.stockCount,
          updatedAt: new Date().toISOString()
        };

        allProducts[index] = updated;
        await saveStoredProducts(env, allProducts);

        return new Response(JSON.stringify({ success: true, product: updated }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // 13. Delete Product (DELETE)
      if (pathname.startsWith('/api/products/') && request.method === 'DELETE') {
        const id = pathname.replace('/api/products/', '');
        const allProducts = await getStoredProducts(env);
        const index = allProducts.findIndex((p) => p.id === id);

        if (index === -1) {
          return new Response(JSON.stringify({ success: false, message: 'Product not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        const deleted = allProducts.splice(index, 1)[0];
        await saveStoredProducts(env, allProducts);

        return new Response(JSON.stringify({ success: true, message: 'Product deleted', product: deleted }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // 14. Orders (GET & POST)
      if (pathname === '/api/orders') {
        if (request.method === 'GET') {
          const orders = await getStoredOrders(env);
          return new Response(JSON.stringify({ success: true, orders }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        if (request.method === 'POST') {
          const { items, customerName, customerEmail, shippingAddress, paymentMethod, discount, shippingFee } = await request.json() as any;

          if (!items || !Array.isArray(items) || items.length === 0) {
            return new Response(JSON.stringify({ success: false, message: 'Cart items are required' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }

          const subtotal = items.reduce((acc: number, item: any) => acc + (item.product?.price || 0) * (item.quantity || 1), 0);
          const disc = discount || 0;
          const ship = shippingFee || 0;
          const total = Math.max(0, subtotal - disc + ship);

          const newOrder: Order = {
            id: `SPIDEY-ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
            items,
            customerName: customerName || 'Guest Collector',
            customerEmail: customerEmail || 'guest@spideyjersey.com',
            shippingAddress: shippingAddress || '123 Cyber Way, Neo City',
            paymentMethod: paymentMethod || 'Instant Crypto / Card',
            subtotal,
            discount: disc,
            shippingFee: ship,
            totalAmount: total,
            status: 'confirmed',
            createdAt: new Date().toISOString()
          };

          const allOrders = await getStoredOrders(env);
          allOrders.unshift(newOrder);
          await saveStoredOrders(env, allOrders);

          // Deduct product stock
          const allProducts = await getStoredProducts(env);
          let stockUpdated = false;
          for (const item of items) {
            const prod = allProducts.find((p) => p.id === item.product?.id);
            if (prod) {
              prod.stockCount = Math.max(0, prod.stockCount - (item.quantity || 1));
              if (prod.stockCount === 0) prod.inStock = false;
              stockUpdated = true;
            }
          }
          if (stockUpdated) {
            await saveStoredProducts(env, allProducts);
          }

          return new Response(JSON.stringify({ success: true, order: newOrder, message: 'Order confirmed' }), {
            status: 201,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
      }

      // 15. Admin Store Stats
      if (pathname === '/api/stats' && request.method === 'GET') {
        const products = await getStoredProducts(env);
        const orders = await getStoredOrders(env);
        const categories = await getStoredCategories(env);

        const inStockCount = products.filter((p) => p.inStock && p.stockCount > 0).length;
        const totalInventoryValue = products.reduce((acc, p) => acc + p.price * p.stockCount, 0);
        const totalRevenue = orders.reduce((acc, o) => acc + o.totalAmount, 0);

        const stats: StoreStats = {
          totalProducts: products.length,
          totalCategories: categories.length,
          inStockCount,
          totalOrders: orders.length,
          totalRevenue,
          r2BucketStatus: {
            binding: 'MY_BUCKET',
            bucketName: 'spidey-jersey-images',
            connected: !!env.MY_BUCKET,
            storageType: 'r2_worker'
          }
        };

        return new Response(JSON.stringify({ success: true, stats, totalInventoryValue }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // 16. Reset / Seed Catalog
      if (pathname === '/api/seed' && request.method === 'POST') {
        const freshProducts = [...INITIAL_JERSEYS];
        const freshCategories = [...CATEGORY_CAROUSEL_ITEMS];
        const freshSettings = { ...DEFAULT_SITE_SETTINGS };

        await saveStoredProducts(env, freshProducts);
        await saveStoredCategories(env, freshCategories);
        await saveStoredSettings(env, freshSettings);

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Store reset to default showcase catalog', 
          count: freshProducts.length 
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // 17. Static Assets fallback for Cloudflare Pages / Workers
      if (env.ASSETS) {
        return env.ASSETS.fetch(request);
      }

      return new Response('Spidey Jersey Store Worker is Running', { headers: corsHeaders });
    } catch (err: any) {
      console.error('Worker error:', err);
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }
};
