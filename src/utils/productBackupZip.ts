import JSZip from 'jszip';
import { JerseyProduct } from '../types';

export interface ProductBackupMetadataEntry {
  filename: string;
  id?: string;
  code: string;
  title: string;
  price: number;
  originalPrice?: number;
  category?: string;
  season?: string;
  edition?: string;
  badge?: string;
  sizes?: string[];
  stockCount?: number;
  inStock?: boolean;
  customizable?: boolean;
  customizationChargeType?: 'free' | 'paid';
  customizationCharge?: number;
  description?: string;
}

export interface ParsedStructuredFilename {
  code?: string;
  title?: string;
  price?: string;
  isStructured: boolean;
}

/**
 * Sanitizes a segment so it is valid inside ZIP archives and on Windows/macOS/Linux/Android file systems.
 */
export function sanitizeFilenameSegment(value: string, maxLength = 100): string {
  const cleaned = String(value || '')
    .replace(/[\\/:*?"<>|\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength).trim();
}

/**
 * Resolves a clean file extension from MIME type or image URL.
 */
function inferExtension(mimeType?: string, url?: string): string {
  const mime = (mimeType || '').toLowerCase();
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('avif')) return 'avif';
  if (mime.includes('gif')) return 'gif';
  if (mime.includes('svg')) return 'svg';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';

  if (url && !url.startsWith('data:')) {
    const withoutQuery = url.split('?')[0].split('#')[0];
    const match = withoutQuery.match(/\.([a-zA-Z0-9]{2,5})$/);
    if (match) {
      const ext = match[1].toLowerCase();
      if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif'].includes(ext)) {
        return ext === 'jpeg' ? 'jpg' : ext;
      }
    }
  }
  return 'jpg';
}

/**
 * Builds a structured image filename encoding Code, Title, and Price:
 * e.g. "SJ-M8K2P ~~ AC Milan 2006-07 Home Kit ~~ 600.jpg"
 */
export function buildStructuredProductFilename(
  product: Pick<JerseyProduct, 'code' | 'title' | 'price'>,
  ext: string,
  usedNames: Set<string>
): string {
  const safeCode = sanitizeFilenameSegment(product.code || 'ITEM', 40) || 'ITEM';
  const safeTitle = sanitizeFilenameSegment(product.title || 'Jersey Product', 95) || 'Jersey Product';
  const numericPrice = typeof product.price === 'number' && Number.isFinite(product.price)
    ? Math.round(product.price)
    : 0;

  const baseName = `${safeCode} ~~ ${safeTitle} ~~ ${numericPrice}`;
  const cleanExt = (ext || 'jpg').replace(/^\./, '').toLowerCase();

  let candidate = `${baseName}.${cleanExt}`;
  let counter = 2;
  while (usedNames.has(candidate.toLowerCase())) {
    candidate = `${baseName} (${counter}).${cleanExt}`;
    counter++;
  }
  usedNames.add(candidate.toLowerCase());
  return candidate;
}

/**
 * Parses structured filenames written as "{CODE} ~~ {TITLE} ~~ {PRICE}.{ext}"
 * or "{CODE}__{TITLE}__{PRICE}.{ext}".
 */
export function parseStructuredProductFilename(filename: string): ParsedStructuredFilename {
  const withoutExt = String(filename || '')
    .replace(/\.[^/.]+$/, '')
    .replace(/\s+\(\d+\)$/, '')
    .trim();

  if (!withoutExt) {
    return { isStructured: false };
  }

  // Primary separator: " ~~ "
  if (withoutExt.includes('~~')) {
    const parts = withoutExt.split(/\s*~~\s*/).map((p) => p.trim());
    if (parts.length >= 3) {
      const code = parts[0] || undefined;
      const rawPrice = parts[parts.length - 1].replace(/[^\d.]/g, '');
      const title = parts.slice(1, -1).join(' ').trim() || undefined;
      const parsedNum = Number(rawPrice);
      const price = rawPrice && Number.isFinite(parsedNum) && parsedNum > 0 ? String(parsedNum) : undefined;
      return {
        code,
        title,
        price,
        isStructured: Boolean(code || title || price)
      };
    }
    if (parts.length === 2) {
      const possiblePrice = parts[1].replace(/[^\d.]/g, '');
      if (possiblePrice && /^\d+(\.\d+)?$/.test(parts[1])) {
        return { title: parts[0], price: possiblePrice, isStructured: true };
      }
      return { code: parts[0], title: parts[1], isStructured: true };
    }
  }

  // Secondary separator: "__"
  if (withoutExt.includes('__')) {
    const parts = withoutExt.split(/\s*__\s*/).map((p) => p.trim());
    if (parts.length >= 3) {
      const code = parts[0] || undefined;
      const rawPrice = parts[parts.length - 1].replace(/[^\d.]/g, '');
      const title = parts.slice(1, -1).join(' ').trim() || undefined;
      const parsedNum = Number(rawPrice);
      const price = rawPrice && Number.isFinite(parsedNum) && parsedNum > 0 ? String(parsedNum) : undefined;
      return {
        code,
        title,
        price,
        isStructured: Boolean(code || title || price)
      };
    }
  }

  return {
    code: withoutExt,
    title: withoutExt
      .replace(/^\d+[-_]/, '')
      .replace(/[-_]/g, ' ')
      .trim(),
    isStructured: false
  };
}

/**
 * Fetches an image URL (data URI, relative asset/upload path, or remote URL) as a Blob.
 */
async function fetchImageBlob(url: string): Promise<Blob | null> {
  if (!url) return null;

  try {
    if (url.startsWith('data:')) {
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.blob();
    }

    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) return null;
    return await res.blob();
  } catch (err) {
    console.warn('Could not fetch product image for ZIP backup:', url, err);
    return null;
  }
}

/**
 * Exports all products into a downloadable backup ZIP file containing:
 * - Image files named `{CODE} ~~ {TITLE} ~~ {PRICE}.{ext}`
 * - `products-metadata.json` containing complete per-product details (Title, Code, Price, Category, Sizes, etc.)
 */
export async function downloadAllProductsAsZip(
  products: JerseyProduct[],
  onProgress?: (current: number, total: number) => void
): Promise<{ exportedImages: number; totalProducts: number }> {
  const zip = new JSZip();
  const usedNames = new Set<string>();
  const metadataEntries: ProductBackupMetadataEntry[] = [];
  let exportedImages = 0;

  const total = products.length;

  for (let i = 0; i < total; i++) {
    const product = products[i];
    const primaryUrl = Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : '';

    let blob: Blob | null = null;
    if (primaryUrl) {
      blob = await fetchImageBlob(primaryUrl);
    }

    const ext = inferExtension(blob?.type, primaryUrl);
    const filename = buildStructuredProductFilename(product, ext, usedNames);

    if (blob && blob.size > 0) {
      zip.file(filename, blob);
      exportedImages++;
    }

    metadataEntries.push({
      filename,
      id: product.id,
      code: product.code || '',
      title: product.title || '',
      price: Number(product.price) || 0,
      originalPrice: product.originalPrice !== undefined ? Number(product.originalPrice) : undefined,
      category: product.category,
      season: product.season,
      edition: product.edition,
      badge: product.badge,
      sizes: Array.isArray(product.sizes) ? product.sizes : undefined,
      stockCount: product.stockCount,
      inStock: product.inStock,
      customizable: product.customizable,
      customizationChargeType: product.customizationChargeType,
      customizationCharge: product.customizationCharge,
      description: product.description
    });

    if (onProgress) {
      onProgress(i + 1, total);
    }
  }

  zip.file(
    'products-metadata.json',
    JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        totalProducts: total,
        products: metadataEntries
      },
      null,
      2
    )
  );

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const dateStamp = new Date().toISOString().slice(0, 10);
  const downloadUrl = URL.createObjectURL(zipBlob);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = `spidey-products-backup-${dateStamp}.zip`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 4000);

  return { exportedImages, totalProducts: total };
}
