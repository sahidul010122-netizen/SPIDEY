import { JerseyProduct, Order, CartItem } from '../types';
import { convertBengaliToEnglishDigits, cleanAndFormatPhoneNumber } from './phoneUtils';

export interface ParsedOrderItem {
  id: string;
  rawText: string;
  code?: string;
  title: string;
  selectedSize: string;
  customName?: string;
  quantity: number;
  matchedProduct?: JerseyProduct;
}

export interface ParsedOrder {
  tempId: string;
  rawBlock: string;
  customerName: string;
  phoneNumber: string;
  shippingAddress: string;
  items: ParsedOrderItem[];
  codAmount: number;
  isExchange: boolean;
  orderNote?: string;
  isValid: boolean;
  validationErrors: string[];
}

/**
 * Split bulk raw text into individual order chunks.
 * Handles multiple orders separated by dividers, blank lines, or repeated "Name:" headers.
 */
export function splitRawTextIntoOrderBlocks(rawText: string): string[] {
  if (!rawText || !rawText.trim()) return [];

  // Normalize line breaks
  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  // Check if divided by explicit divider lines (like ━━━━━━━━, ------, =====, etc.)
  const dividerRegex = /\n\s*[-━=_*#]{3,}\s*\n/g;
  if (dividerRegex.test(normalized)) {
    return normalized
      .split(dividerRegex)
      .map(b => b.trim())
      .filter(b => b.length > 5);
  }

  // Check if text has multiple "Name:" or "Customer Name:" or "নাম:" or "Order #" markers
  const orderStartRegex = /(?=(?:^|\n)(?:Name\s*:|Customer\s*:|নাম\s*:|Order\s*(?:ID|#)?\s*:|১\.|1\.\s*Name))/gi;
  const splitByName = normalized.split(orderStartRegex).map(b => b.trim()).filter(b => b.length > 5);
  if (splitByName.length > 1) {
    return splitByName;
  }

  // Check if split by double newlines (\n\n+)
  const doubleNewlineBlocks = normalized
    .split(/\n\s*\n\s*\n+/)
    .map(b => b.trim())
    .filter(b => b.length > 5);

  if (doubleNewlineBlocks.length > 1) {
    return doubleNewlineBlocks;
  }

  // If none matched, treat as a single order block
  return [normalized];
}

/**
 * Match a jersey code or title against the available product list to find thumbnail images.
 */
export function matchProductForOrder(
  code: string | undefined, 
  title: string, 
  products: JerseyProduct[]
): JerseyProduct | undefined {
  if (!products || products.length === 0) return undefined;

  // 1. Match by exact code (e.g. SJ-ZLC6N)
  if (code) {
    const cleanCode = code.replace(/[\[\]]/g, '').trim().toLowerCase();
    const byCode = products.find(p => p.code && p.code.toLowerCase() === cleanCode);
    if (byCode) return byCode;

    // Partial code match
    const partialCode = products.find(p => p.code && (
      p.code.toLowerCase().includes(cleanCode) || cleanCode.includes(p.code.toLowerCase())
    ));
    if (partialCode) return partialCode;
  }

  // 2. Match by title
  if (title) {
    const cleanTitle = title.toLowerCase().trim();
    
    // Direct include
    const byTitle = products.find(p => 
      cleanTitle.includes(p.title.toLowerCase()) || p.title.toLowerCase().includes(cleanTitle)
    );
    if (byTitle) return byTitle;

    // Word similarity match (e.g. "Real Madrid 2016-17 Purple")
    const words = cleanTitle.split(/[\s,()\-]+/).filter(w => w.length > 2);
    let bestMatch: JerseyProduct | undefined = undefined;
    let maxMatchCount = 0;

    for (const prod of products) {
      const prodText = `${prod.title} ${prod.category} ${prod.season || ''} ${prod.edition || ''}`.toLowerCase();
      let matchCount = 0;
      for (const w of words) {
        if (prodText.includes(w)) {
          matchCount++;
        }
      }
      if (matchCount > maxMatchCount && matchCount >= 2) {
        maxMatchCount = matchCount;
        bestMatch = prod;
      }
    }

    if (bestMatch) return bestMatch;
  }

  return undefined;
}

/**
 * Parse an individual item line (e.g. `1. [SJ-ZLC6N] REAL MADRID 2016-17 PURPLE JERSEY (FULL SLEEVE) (Size: L)- "SOLAIMAN 7"`)
 */
export function parseOrderItemLine(line: string, products: JerseyProduct[]): ParsedOrderItem {
  const cleanLine = line.trim();
  
  // Extract Code if present: [SJ-XXXX] or SJ-XXXX
  let code: string | undefined = undefined;
  const codeMatch = cleanLine.match(/\[([A-Za-z0-9-_]+)\]/);
  if (codeMatch) {
    code = codeMatch[1];
  } else {
    const rawCodeMatch = cleanLine.match(/\b(SJ-[A-Za-z0-9]{4,8})\b/i);
    if (rawCodeMatch) {
      code = rawCodeMatch[1];
    }
  }

  // Extract Size: (Size: L) or Size: L or (L) or Size - L
  let size = 'L'; // fallback default
  const sizeMatch = cleanLine.match(/(?:Size\s*[:\-]\s*|\(Size\s*[:\-]\s*)([A-Za-z0-9]+)\)?/i) ||
                    cleanLine.match(/\b(Size\s*[:\-]?\s*(?:S|M|L|XL|XXL|3XL|4XL|XXXL))\b/i) ||
                    cleanLine.match(/\((S|M|L|XL|XXL|3XL|4XL|XXXL)\)/i);
  if (sizeMatch) {
    size = sizeMatch[1].replace(/Size\s*[:\-]?\s*/i, '').trim().toUpperCase();
  }

  // Extract Custom Name / Number: - "SOLAIMAN 7" or "MESSI 10" or (SOLAIMAN 7)
  let customName: string | undefined = undefined;
  const customMatch = cleanLine.match(/["“]([^"”]+)["”]/) || 
                      cleanLine.match(/-\s*["']?([^("'\n]+(?:[0-9]+)?)["']?$/) ||
                      cleanLine.match(/(?:Custom|Name|Printed)\s*[:\-]\s*([^\n,]+)/i);
  if (customMatch && customMatch[1]) {
    const cust = customMatch[1].trim();
    // make sure custom is not just the size or the title
    if (cust.toLowerCase() !== size.toLowerCase() && !cust.toLowerCase().startsWith('size:')) {
      customName = cust.toUpperCase();
    }
  }

  // Clean Title: strip line numbers (1.), code brackets, size strings, and custom strings
  let title = cleanLine
    .replace(/^[\d+•\-\*.]+\s*/, '') // remove "1. ", "• "
    .replace(/\[[A-Za-z0-9-_]+\]/g, '') // remove [SJ-XXX]
    .replace(/\bSJ-[A-Za-z0-9]{4,8}\b/gi, '')
    .replace(/\(?Size\s*[:\-]\s*[A-Za-z0-9]+\)?/gi, '')
    .replace(/\((?:S|M|L|XL|XXL|3XL|4XL)\)/gi, '')
    .replace(/["“][^"”]+["”]/g, '')
    .replace(/-\s*["']?[^"'\n]+["']?$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // If title was stripped too much, fallback to original line without numbers
  if (!title || title.length < 3) {
    title = cleanLine.replace(/^[\d+•\-\*.]+\s*/, '').trim();
  }

  // Match Product thumbnail from catalog
  const matched = matchProductForOrder(code, title, products);

  return {
    id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    rawText: cleanLine,
    code: code || matched?.code,
    title: matched ? matched.title : title,
    selectedSize: size,
    customName,
    quantity: 1,
    matchedProduct: matched
  };
}

/**
 * Master parser that converts a raw order block into a structured, validated ParsedOrder.
 */
export function parseSingleOrderBlock(block: string, products: JerseyProduct[], index: number = 0): ParsedOrder {
  const lines = block
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  let customerName = '';
  let phoneNumber = '';
  let shippingAddress = '';
  let codAmount = 0;
  let isExchange = false;
  let orderNote = '';

  const itemLines: string[] = [];
  let isInsideItemsSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    // 1. Check for Name:
    if (/^(?:customer\s*)?name\s*[:\-]/i.test(line) || /^নাম\s*[:\-]/i.test(line)) {
      customerName = line.replace(/^(?:customer\s*)?name\s*[:\-]\s*/i, '').replace(/^নাম\s*[:\-]\s*/i, '').trim();
      continue;
    }

    // 2. Check for Phone / Mobile:
    if (/^(?:mobile|phone|contact|cell|মোবাইল|ফোন)\s*[:\-]/i.test(line)) {
      const rawPhone = line.replace(/^(?:mobile|phone|contact|cell|মোবাইল|ফোন)\s*[:\-]\s*/i, '').trim();
      phoneNumber = cleanAndFormatPhoneNumber(convertBengaliToEnglishDigits(rawPhone));
      continue;
    }

    // 3. Check for Address:
    if (/^(?:delivery\s*)?address\s*[:\-]/i.test(line) || /^ঠিকানা\s*[:\-]/i.test(line)) {
      shippingAddress = line.replace(/^(?:delivery\s*)?address\s*[:\-]\s*/i, '').replace(/^ঠিকানা\s*[:\-]\s*/i, '').trim();
      continue;
    }

    // 4. Check for COD Amount / Total:
    if (/^(?:amount|cod\s*amount|total|price|টাকা|মূল্য)\s*[:\-]/i.test(line) || /\d+\s*৳/.test(line) || /৳\s*\d+/.test(line)) {
      const converted = convertBengaliToEnglishDigits(line);
      const digitsMatch = converted.match(/(?:amount|cod|total|price|৳|\b)\s*[:\-]?\s*(\d+(?:\.\d+)?)/i);
      if (digitsMatch) {
        codAmount = Math.max(0, parseFloat(digitsMatch[1]) || 0);
      }
      continue;
    }

    // 5. Check for Exchange Parcel:
    if (/exchange\s*(?:parcel)?\s*[:\-]/i.test(line) || /এক্সচেঞ্জ/i.test(line)) {
      isExchange = /yes|true|হ্যাঁ|1/i.test(line);
      const noteMatch = line.match(/note\s*[:\-]\s*(.*)/i);
      if (noteMatch) {
        orderNote = noteMatch[1].trim();
      }
      continue;
    }

    // 6. Check for ITEMS Header:
    if (/^(?:ordered\s*)?items\s*[:\-]?$/i.test(line) || /^আইটেম\s*[:\-]?$/i.test(line)) {
      isInsideItemsSection = true;
      continue;
    }

    // 7. Check if line is an item line (starts with 1., 2., •, contains [SJ-...] or "Size:")
    if (
      isInsideItemsSection || 
      /^[\d+•\-\*.]+\s*\[/i.test(line) || 
      /\[SJ-[A-Za-z0-9]+\]/i.test(line) || 
      /size\s*[:\-]/i.test(line)
    ) {
      // It's an item line
      itemLines.push(line);
      continue;
    }

    // Fallback: If name/phone/address are still empty, use line-by-line heuristic
    const digits = convertBengaliToEnglishDigits(line).replace(/\D/g, '');
    if (!phoneNumber && (digits.length === 11 || (digits.startsWith('01') && digits.length >= 10))) {
      phoneNumber = cleanAndFormatPhoneNumber(line);
      continue;
    }

    if (!customerName && i === 0 && !digits.startsWith('01')) {
      customerName = line;
      continue;
    }

    if (!shippingAddress && !customerName.includes(line) && !line.includes(phoneNumber)) {
      shippingAddress = shippingAddress ? `${shippingAddress}, ${line}` : line;
    }
  }

  // Parse item lines
  let parsedItems: ParsedOrderItem[] = [];
  if (itemLines.length > 0) {
    parsedItems = itemLines.map(l => parseOrderItemLine(l, products));
  } else {
    // If no distinct item lines found, fallback to first product or placeholder
    const firstProd = products[0];
    parsedItems = [
      {
        id: `item-${Date.now()}-1`,
        rawText: 'Standard Jersey Order',
        code: firstProd?.code || 'SJ-PROD',
        title: firstProd?.title || 'Selected Jersey Item',
        selectedSize: 'L',
        quantity: 1,
        matchedProduct: firstProd
      }
    ];
  }

  // Validation
  const errors: string[] = [];

  // 1. Customer Name validation
  if (!customerName || customerName.trim().length < 2) {
    errors.push('Customer name is required');
  }

  // 2. Mobile number strictly 11 digits
  if (!phoneNumber || phoneNumber.length !== 11) {
    errors.push(`Mobile number must be 11 digits (found ${phoneNumber ? phoneNumber.length : 0})`);
  }

  // 3. Price validation: strictly numbers, non-negative
  if (isNaN(codAmount) || codAmount < 0) {
    errors.push('COD Amount must be a valid positive number');
  }

  return {
    tempId: `bulk-parsed-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
    rawBlock: block,
    customerName: customerName || `Customer #${index + 1}`,
    phoneNumber: phoneNumber,
    shippingAddress: shippingAddress || 'N/A',
    items: parsedItems,
    codAmount: codAmount,
    isExchange: isExchange,
    orderNote: orderNote || undefined,
    isValid: errors.length === 0,
    validationErrors: errors
  };
}

/**
 * Parse entire raw text containing multiple orders.
 */
export function parseBulkOrders(rawText: string, products: JerseyProduct[]): ParsedOrder[] {
  const safeProducts = Array.isArray(products) ? products : [];
  const blocks = splitRawTextIntoOrderBlocks(rawText);
  return (blocks || []).map((b, idx) => parseSingleOrderBlock(b, safeProducts, idx));
}

/**
 * Convert a ParsedOrder into a final Order ready to be saved into master orders database.
 */
export function convertParsedOrderToMasterOrder(parsed: ParsedOrder, index: number = 0): Order {
  const parsedItems = Array.isArray(parsed.items) ? parsed.items : [];
  const cartItems: CartItem[] = parsedItems.map((it, idx) => {
    // Fallback dummy product if no match
    const dummyProduct: JerseyProduct = it.matchedProduct || {
      id: `prod-${it.code || 'custom'}-${idx}`,
      code: it.code || `SJ-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      title: it.title,
      category: 'Matchwear',
      price: parsed.codAmount > 0 ? parsed.codAmount : 1000,
      season: '2025/26',
      edition: 'Pro Issue',
      images: [
        'https://images.unsplash.com/photo-1577212017184-80cc0da11082?auto=format&fit=crop&w=600&q=80'
      ],
      description: it.title,
      features: ['Dri-FIT Breathable matrix'],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      inStock: true,
      stockCount: 50,
      rating: 5.0,
      reviewCount: 1,
      customizable: !!it.customName,
      createdAt: new Date().toISOString()
    };

    return {
      itemKey: `cart-item-${Date.now()}-${index}-${idx}`,
      product: dummyProduct,
      selectedSize: it.selectedSize || 'L',
      customName: it.customName,
      quantity: it.quantity || 1,
      addedAt: Date.now()
    };
  });

  return {
    id: `SPIDEY-${Date.now().toString(36).toUpperCase()}-${(index + 1).toString().padStart(2, '0')}`,
    items: cartItems,
    customerName: parsed.customerName.trim(),
    customerEmail: `${parsed.phoneNumber}@spideyorder.com`,
    phoneNumber: parsed.phoneNumber,
    shippingAddress: parsed.shippingAddress.trim(),
    paymentMethod: 'Cash On Delivery (COD)',
    isExchange: parsed.isExchange,
    orderNote: parsed.orderNote,
    orderType: 'bulk_entry',
    subtotal: parsed.codAmount,
    discount: 0,
    shippingFee: 0,
    totalAmount: parsed.codAmount,
    codAmount: parsed.codAmount,
    status: 'confirmed',
    courierStatus: 'pending',
    createdAt: new Date().toISOString()
  };
}
