/**
 * Cloudflare Worker / Cloudflare Pages Functions Backend for Spidey Jersey Store
 * Compatible with wrangler.toml:
 * 
 * [[r2_buckets]]
 * binding = "MY_BUCKET"
 * bucket_name = "spidey-jersey-images"
 */

import { INITIAL_JERSEYS } from './src/data/mockJerseys.ts';
import { JerseyProduct, Order } from './src/types.ts';

// Cloudflare Workers Type Definitions for TypeScript compatibility
export interface CloudflareR2Object {
  body: ReadableStream;
  httpEtag: string;
  writeHttpMetadata: (headers: Headers) => void;
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

let inMemoryProducts: JerseyProduct[] = [...INITIAL_JERSEYS];
let inMemoryOrders: Order[] = [];

export default {
  async fetch(request: Request, env: Env, ctx?: any): Promise<Response> {
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
      // 1. R2 Direct Image Fetching: /api/images/:key
      if (pathname.startsWith('/api/images/') && request.method === 'GET') {
        const key = decodeURIComponent(pathname.replace('/api/images/', ''));
        
        if (env.MY_BUCKET) {
          const object = await env.MY_BUCKET.get(key);
          if (!object) {
            return new Response('Image not found in R2 bucket', { status: 404, headers: corsHeaders });
          }

          const headers = new Headers(corsHeaders);
          object.writeHttpMetadata(headers);
          headers.set('etag', object.httpEtag);
          headers.set('Cache-Control', 'public, max-age=31536000, immutable');
          return new Response(object.body, { headers });
        }

        return new Response('R2 Bucket not bound in current runtime', { status: 404, headers: corsHeaders });
      }

      // 2. R2 Image Upload: POST /api/upload
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
        const cleanFilename = (filename || 'jersey').replace(/[^a-zA-Z0-9_-]/g, '_');
        const key = `jerseys/${Date.now()}-${cleanFilename}.${extension}`;

        // Decode Base64 to binary ArrayBuffer
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
            bucket: env.MY_BUCKET ? 'spidey-jersey-images' : 'inline-storage',
            binding: env.MY_BUCKET ? 'MY_BUCKET' : 'inline'
          }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // 3. Products Endpoints
      if (pathname === '/api/products' && request.method === 'GET') {
        const category = url.searchParams.get('category');
        const search = url.searchParams.get('search');
        const sortBy = url.searchParams.get('sortBy');

        let list = [...inMemoryProducts];
        if (category && category !== 'all') {
          list = list.filter((p) => p.category.toLowerCase() === category.toLowerCase());
        }
        if (search) {
          const q = search.toLowerCase();
          list = list.filter(
            (p) =>
              p.title.toLowerCase().includes(q) ||
              p.category.toLowerCase().includes(q) ||
              p.season.toLowerCase().includes(q)
          );
        }
        if (sortBy === 'price-low') list.sort((a, b) => a.price - b.price);
        if (sortBy === 'price-high') list.sort((a, b) => b.price - a.price);

        return new Response(JSON.stringify({ success: true, count: list.length, products: list }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // POST /api/products
      if (pathname === '/api/products' && request.method === 'POST') {
        const data: any = await request.json();
        const newProduct: JerseyProduct = {
          id: `spidey-${Date.now()}`,
          title: data.title,
          category: data.category,
          price: Number(data.price),
          season: data.season || '2024/25',
          edition: data.edition || 'Player Issue / Authentic',
          images: data.images || [],
          description: data.description || '',
          features: data.features || [],
          sizes: data.sizes || ['S', 'M', 'L', 'XL'],
          inStock: true,
          stockCount: Number(data.stockCount || 10),
          rating: 5.0,
          reviewCount: 1,
          customizable: true,
          createdAt: new Date().toISOString()
        };
        inMemoryProducts.unshift(newProduct);
        return new Response(JSON.stringify({ success: true, product: newProduct }), {
          status: 201,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // Status
      if (pathname === '/api/r2-status') {
        return new Response(
          JSON.stringify({
            status: 'active',
            binding: 'MY_BUCKET',
            bucketName: 'spidey-jersey-images',
            workerRuntime: 'Cloudflare Workers / Pages Functions'
          }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Fallback: static assets via Cloudflare Pages
      if (env.ASSETS) {
        return env.ASSETS.fetch(request);
      }

      return new Response('Spidey Jersey API is running', { headers: corsHeaders });
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }
};
