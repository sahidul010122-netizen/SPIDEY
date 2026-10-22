import { Order } from '../types';
import { SiteSettings, DEFAULT_SITE_SETTINGS } from '../types/settings';

/**
 * Normalizes user-entered Telegram chat IDs to handle supergroup prefixes (-100...)
 */
export function normalizeTelegramChatIds(rawChatId: string): string[] {
  const clean = (rawChatId || '').trim();
  if (!clean) return [];
  const candidates = new Set<string>();

  if (clean.startsWith('-100')) {
    candidates.add(clean);
  } else if (clean.startsWith('100')) {
    candidates.add(`-${clean}`);
    candidates.add(clean);
  } else if (clean.startsWith('-')) {
    candidates.add(clean);
    candidates.add(`-100${clean.slice(1)}`);
  } else {
    candidates.add(`-100${clean}`);
    candidates.add(clean);
    candidates.add(`-${clean}`);
  }

  return Array.from(candidates);
}

/**
 * Formats order notification text in the exact clean format:
 * Name: ...
 * Mobile: ...
 * Address: ...
 * 
 * ITEMS:
 * 1. [SJ-CODE] Title (Size: L) - "NAME NUMBER"
 * Amount: 1200৳
 */
export function formatTelegramOrderPlain(order: Partial<Order>): string {
  const customerName = (order.customerName || 'N/A').trim();
  const phoneNumber = (order.phoneNumber || 'N/A').trim();
  const rawAddress = (order.shippingAddress || 'N/A').trim();
  
  let zoneLabel = '';
  if (order.deliveryZone === 'inside_dhaka') zoneLabel = ' (ঢাকার ভেতরে)';
  else if (order.deliveryZone === 'sub_dhaka') zoneLabel = ' (ঢাকার সাব-এরিয়া)';
  else if (order.deliveryZone === 'outside_dhaka') zoneLabel = ' (ঢাকার বাইরে)';
  const finalAddress = `${rawAddress}${zoneLabel}`;

  const orderItems = Array.isArray(order.items) ? order.items : [];
  const itemsList: string[] = [];
  let itemIndex = 1;

  for (const it of orderItems) {
    const qty = it.quantity && it.quantity > 0 ? it.quantity : 1;
    const codePart = it.product?.code ? `[${it.product.code}] ` : '';
    const titlePart = it.product?.title || 'Jersey';
    const sizePart = it.selectedSize || 'L';
    const customParts = [it.customName, it.customNumber].filter(Boolean);
    const customText = customParts.length > 0 ? ` -  "${customParts.join(' ')}"` : '';
    const singleLine = `${codePart}${titlePart} (Size: ${sizePart})${customText}`;

    for (let q = 0; q < qty; q++) {
      itemsList.push(`${itemIndex}. ${singleLine}`);
      itemIndex++;
    }
  }

  const itemsFormatted = itemsList.length > 0 ? itemsList.join('\n') : '1. Jersey (Size: L)';
  const amountVal = order.totalAmount || order.codAmount || 0;

  return `Name: ${customerName}
Mobile: ${phoneNumber}
Address: ${finalAddress}

ITEMS:
${itemsFormatted}
Amount: ${amountVal}৳`;
}

/**
 * Dispatches an order notification directly to Telegram.
 * Works seamlessly from browser/client in production even on static hosts,
 * or as an immediate fail-safe if backend dispatch fails.
 */
export async function sendDirectTelegramOrderNotification(
  order: Partial<Order>,
  settings?: Partial<SiteSettings>
): Promise<{ success: boolean; message?: string; chatId?: string }> {
  const token = (
    settings?.telegramBotToken ||
    DEFAULT_SITE_SETTINGS.telegramBotToken ||
    '8972453715:AAEHlxk5XLQgsozL1yTwpuCAgT0RSHOzwIw'
  ).trim();

  const rawChatId = (
    settings?.telegramChatId ||
    DEFAULT_SITE_SETTINGS.telegramChatId ||
    '-1003901747514'
  ).trim();

  if (!token || !rawChatId) {
    return { success: false, message: 'Telegram credentials missing' };
  }

  const text = formatTelegramOrderPlain(order);
  const candidates = normalizeTelegramChatIds(rawChatId);

  let lastError = '';
  for (const cid of candidates) {
    try {
      const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cid,
          text
        })
      });
      const data = await resp.json().catch(() => ({}));
      if (data.ok) {
        console.log(`✓ Direct Telegram order notification delivered to chat_id: ${cid}`);
        return { success: true, chatId: cid };
      } else {
        lastError = data.description || 'Unknown Telegram error';
      }
    } catch (e: any) {
      lastError = e?.message || 'Network error';
    }
  }

  return { success: false, message: lastError };
}
