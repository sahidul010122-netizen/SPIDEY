import { CartItem, JerseyProduct, Order } from '../types';

export interface DtfPrintEntry {
  lineNumber: number;
  orderId: string;
  customerName: string;
  jerseyCode: string;
  jerseyTitle: string;
  size: string;
  customName: string;
  customNumber: string;
  formattedLine: string;
  createdAt: string;
}

export interface DtfGenerationResult {
  entries: DtfPrintEntry[];
  formattedText: string;
  totalSelectedOrders: number;
  includedOrdersCount: number;
  skippedOrdersCount: number;
  totalPrintLines: number;
}

const INVALID_PLACEHOLDERS = new Set(['N/A', 'NA', 'NONE', 'NULL', '-', '--', 'NO']);

function cleanValue(val?: string | null): string {
  if (!val) return '';
  const trimmed = String(val).trim();
  if (!trimmed || INVALID_PLACEHOLDERS.has(trimmed.toUpperCase())) return '';
  return trimmed;
}

/**
 * Resolve the actual Jersey Code from the order item or fallback to the product catalog.
 */
export function resolveOrderItemJerseyCode(
  item: CartItem,
  catalogProducts: JerseyProduct[] = []
): string {
  const directCode = cleanValue(item.product?.code || (item as any)?.code);
  if (directCode) return directCode.toUpperCase();

  if (catalogProducts.length > 0) {
    const productId = item.product?.id;
    const productTitle = (item.product?.title || '').trim().toLowerCase();

    if (productId) {
      const byId = catalogProducts.find((p) => p.id === productId && cleanValue(p.code));
      if (byId?.code) return byId.code.trim().toUpperCase();
    }

    if (productTitle) {
      const byTitle = catalogProducts.find(
        (p) => p.title.trim().toLowerCase() === productTitle && cleanValue(p.code)
      );
      if (byTitle?.code) return byTitle.code.trim().toUpperCase();
    }
  }

  return cleanValue(item.product?.id) || 'NO-CODE';
}

/**
 * Extract Name and Number cleanly from CartItem.
 * Supports both:
 *  - Separate fields (customName + customNumber)
 *  - Combined string inside customName (e.g. "RONALDO 7", "KAKA 22", "SOLAIMAN #7", "7")
 */
export function extractJerseyNameAndNumber(item: CartItem): { name: string; number: string } {
  let rawName = cleanValue(item.customName);
  let rawNumber = cleanValue(item.customNumber).replace(/^#/, '').trim();

  if (rawNumber && INVALID_PLACEHOLDERS.has(rawNumber.toUpperCase())) {
    rawNumber = '';
  }

  // Case A: Both fields already separated
  if (rawName && rawNumber) {
    return { name: rawName, number: rawNumber };
  }

  // Case B: Only customNumber is provided
  if (!rawName && rawNumber) {
    return { name: '', number: rawNumber };
  }

  // Case C: Only customName is provided (may contain name + number combined, or only number, or only name)
  if (rawName && !rawNumber) {
    // Handle explicit labeled format: "নাম: KAKA, নাম্বার: 22" or "Name: RONALDO, Number: 7"
    const labeledMatch =
      rawName.match(/(?:নাম|name)\s*[:\-]\s*(.+?)\s*[,|/\n]\s*(?:নাম্বার|number|no)\s*[:\-]\s*#?(\d+)/i) ||
      rawName.match(/(?:নাম|name)\s*[:\-]\s*(.+)/i);

    if (labeledMatch) {
      if (labeledMatch[2]) {
        return {
          name: cleanValue(labeledMatch[1]),
          number: cleanValue(labeledMatch[2])
        };
      }
      rawName = cleanValue(labeledMatch[1]);
    }

    // Only a number inside customName (e.g. "7", "#10", "22")
    const onlyNumMatch = rawName.match(/^#?(\d+)$/);
    if (onlyNumMatch) {
      return { name: '', number: onlyNumMatch[1] };
    }

    // Combined Name + #Number (e.g. "RONALDO #7", "RONALDO#7")
    const hashNumMatch = rawName.match(/^(.+?)\s*#(\d+)$/);
    if (hashNumMatch) {
      return {
        name: cleanValue(hashNumMatch[1]),
        number: hashNumMatch[2]
      };
    }

    // Combined Name + Number separated by space or punctuation (e.g. "RONALDO 7", "DI MARIA 11", "KAKA - 22")
    const trailingNumMatch = rawName.match(/^(.+?)(?:\s*[-–,|/]\s*|\s+)(\d+)$/);
    if (trailingNumMatch) {
      return {
        name: cleanValue(trailingNumMatch[1]),
        number: trailingNumMatch[2]
      };
    }

    // Only Name
    return { name: rawName, number: '' };
  }

  return { name: '', number: '' };
}

/**
 * Special Rule:
 * Only when the jersey name is KAKA, output KAKA' (with a trailing apostrophe).
 * All other names remain without an apostrophe.
 */
export function formatDtfJerseyName(name: string): string {
  const normalized = name.trim().replace(/\s+/g, ' ').toUpperCase();
  if (!normalized) return '';
  if (normalized === 'KAKA' || normalized === "KAKA'" || normalized === 'KAKA’') {
    return "KAKA'";
  }
  return normalized;
}

/**
 * Generate DTF Print entries and clean formatted text for the selected orders,
 * strictly preserving order serial and duplicates, and excluding orders without Name/Number.
 */
export function generateDtfPrintList(
  selectedOrders: Order[],
  catalogProducts: JerseyProduct[] = []
): DtfGenerationResult {
  const entries: DtfPrintEntry[] = [];
  let includedOrdersCount = 0;
  let skippedOrdersCount = 0;

  for (const order of selectedOrders) {
    const items = Array.isArray(order.items) ? order.items : [];
    let orderHasCustomizedItem = false;

    for (const item of items) {
      const { name: rawExtractedName, number: rawExtractedNumber } = extractJerseyNameAndNumber(item);
      const formattedName = formatDtfJerseyName(rawExtractedName);
      const formattedNumber = rawExtractedNumber.trim();

      // Filtering rule: must have either Jersey Name or Jersey Number
      if (!formattedName && !formattedNumber) {
        continue;
      }

      orderHasCustomizedItem = true;
      const jerseyCode = resolveOrderItemJerseyCode(item, catalogProducts);

      // Build formatted line according to the 3 required cases:
      // Case 1: Name + Number -> [Jersey Code], [Name], [Number]
      // Case 2: Name only     -> [Jersey Code], [Name]
      // Case 3: Number only   -> [Jersey Code], [Number]
      let formattedLine = '';
      if (formattedName && formattedNumber) {
        formattedLine = `${jerseyCode}, ${formattedName}, ${formattedNumber}`;
      } else if (formattedName) {
        formattedLine = `${jerseyCode}, ${formattedName}`;
      } else {
        formattedLine = `${jerseyCode}, ${formattedNumber}`;
      }

      const qty = Math.max(1, Number(item.quantity) || 1);
      for (let q = 0; q < qty; q++) {
        entries.push({
          lineNumber: entries.length + 1,
          orderId: order.id,
          customerName: order.customerName || 'Customer',
          jerseyCode,
          jerseyTitle: item.product?.title || 'Jersey',
          size: item.selectedSize || 'L',
          customName: formattedName,
          customNumber: formattedNumber,
          formattedLine,
          createdAt: order.createdAt
        });
      }
    }

    if (orderHasCustomizedItem) {
      includedOrdersCount++;
    } else {
      skippedOrdersCount++;
    }
  }

  const formattedText = entries.map((e) => e.formattedLine).join('\n');

  return {
    entries,
    formattedText,
    totalSelectedOrders: selectedOrders.length,
    includedOrdersCount,
    skippedOrdersCount,
    totalPrintLines: entries.length
  };
}
