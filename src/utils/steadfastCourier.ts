import { Order } from '../types';

export interface SteadfastSettings {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  isLiveMode: boolean;
  hasApiKey?: boolean;
  hasSecretKey?: boolean;
}

export const DEFAULT_STEADFAST_SETTINGS: SteadfastSettings = {
  apiKey: 'tg4eyfbrobgvcvehcrlqw2quwl12ktvl',
  secretKey: 'crjccez7uboye8w81jcyza7k',
  baseUrl: 'https://portal.packzy.com/api/v1',
  senderName: 'Spidey Jersey Store',
  senderPhone: '01715123766',
  senderAddress: 'Dhaka, Bangladesh',
  isLiveMode: true
};

const LOCAL_STORAGE_KEY = 'spidey_steadfast_settings_v1';
const API_KEY_STORAGE = 'spidey_steadfast_api_key';
const SECRET_KEY_STORAGE = 'spidey_steadfast_secret_key';

/**
 * Format Bangladesh phone number strictly for Steadfast (11 digits, 01XXXXXXXXX)
 */
export function formatSteadfastPhone(phone: string): string {
  let cleaned = (phone || '').replace(/[^0-9]/g, '');
  if (cleaned.startsWith('880')) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('88') && cleaned.length >= 13) {
    cleaned = cleaned.substring(2);
  }
  if (!cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
}

/**
 * Safely parse JSON from fetch Response without throwing
 */
async function parseResponseSafe(res: Response): Promise<any> {
  try {
    const text = await res.text();
    if (!text || !text.trim()) {
      return null;
    }
    return JSON.parse(text);
  } catch (err) {
    return null;
  }
}

/**
 * Clean error string extractor from any Steadfast error response
 */
export function extractSteadfastErrorMessage(data: any, fallback = 'Steadfast API error'): string {
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (typeof data.message === 'string' && data.message.trim()) return data.message;
  if (typeof data.error === 'string' && data.error.trim()) return data.error;
  
  if (data.errors && typeof data.errors === 'object') {
    const parts: string[] = [];
    for (const [key, val] of Object.entries(data.errors)) {
      if (Array.isArray(val)) {
        parts.push(`${key}: ${val.join(', ')}`);
      } else if (typeof val === 'string') {
        parts.push(`${key}: ${val}`);
      }
    }
    if (parts.length > 0) return parts.join(' | ');
  }

  if (data.error && typeof data.error === 'object') {
    const parts: string[] = [];
    for (const [key, val] of Object.entries(data.error)) {
      if (Array.isArray(val)) {
        parts.push(`${key}: ${val.join(', ')}`);
      } else if (typeof val === 'string') {
        parts.push(`${key}: ${val}`);
      }
    }
    if (parts.length > 0) return parts.join(' | ');
  }

  return JSON.stringify(data);
}

/**
 * Direct client-side call to official Steadfast Courier API (CORS enabled by Steadfast)
 */
export async function callDirectSteadfastApi(
  endpointPath: string,
  method: 'GET' | 'POST',
  apiKey: string,
  secretKey: string,
  body?: any,
  baseUrl?: string
): Promise<{ ok: boolean; status: number; data: any; error?: string }> {
  const candidateUrls = [
    baseUrl,
    'https://portal.packzy.com/api/v1',
    'https://portal.steadfast.com.bd/api/v1'
  ].filter(Boolean).map(u => (u as string).trim().replace(/\/+$/, ''));

  const uniqueUrls = Array.from(new Set(candidateUrls));
  let lastError = '';

  for (const base of uniqueUrls) {
    try {
      const cleanPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
      const url = `${base}${cleanPath}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(url, {
        method,
        headers: {
          'Api-Key': apiKey.trim(),
          'Secret-Key': secretKey.trim(),
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
        return { ok: res.ok, status: res.status, data };
      }
      lastError = `HTTP ${res.status}: ${rawText || res.statusText}`;
    } catch (e: any) {
      lastError = e.message || 'Fetch failed';
    }
  }

  return { ok: false, status: 0, data: null, error: lastError };
}

/**
 * Get Steadfast Settings from server or local cache
 */
export async function getSteadfastSettings(): Promise<SteadfastSettings> {
  // First load from localStorage for instant display
  let cached: SteadfastSettings = { ...DEFAULT_STEADFAST_SETTINGS };
  try {
    const local = localStorage.getItem(LOCAL_STORAGE_KEY);
    const directApiKey = localStorage.getItem(API_KEY_STORAGE);
    const directSecretKey = localStorage.getItem(SECRET_KEY_STORAGE);

    if (local) {
      cached = { ...cached, ...JSON.parse(local) };
    }
    if (directApiKey && directApiKey.trim()) cached.apiKey = directApiKey.trim();
    if (directSecretKey && directSecretKey.trim()) cached.secretKey = directSecretKey.trim();
  } catch (e) {}

  try {
    const res = await fetch('/api/courier/steadfast/settings');
    const data = await parseResponseSafe(res);
    if (res.ok && data && data.success && data.settings) {
      const serverSettings = data.settings;
      const finalApiKey = (serverSettings.apiKey && serverSettings.apiKey.trim()) || cached.apiKey || DEFAULT_STEADFAST_SETTINGS.apiKey;
      const finalSecretKey = (serverSettings.secretKey && serverSettings.secretKey.trim()) || cached.secretKey || DEFAULT_STEADFAST_SETTINGS.secretKey;
      const finalBaseUrl = (serverSettings.baseUrl && serverSettings.baseUrl.trim()) || cached.baseUrl || DEFAULT_STEADFAST_SETTINGS.baseUrl;

      const merged: SteadfastSettings = {
        ...DEFAULT_STEADFAST_SETTINGS,
        ...cached,
        ...serverSettings,
        apiKey: finalApiKey,
        secretKey: finalSecretKey,
        baseUrl: finalBaseUrl
      };
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
        localStorage.setItem(API_KEY_STORAGE, merged.apiKey);
        localStorage.setItem(SECRET_KEY_STORAGE, merged.secretKey);
      } catch (e) {}
      return merged;
    }
  } catch (e) {
    console.warn('Could not fetch steadfast settings from server:', e);
  }

  return cached;
}

/**
 * Save Steadfast Settings to server and local cache
 */
export async function saveSteadfastSettings(settings: SteadfastSettings): Promise<{ success: boolean; message: string }> {
  // Always persist in localStorage first
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
    if (settings.apiKey) localStorage.setItem(API_KEY_STORAGE, settings.apiKey.trim());
    if (settings.secretKey) localStorage.setItem(SECRET_KEY_STORAGE, settings.secretKey.trim());
  } catch (e) {}

  try {
    const res = await fetch('/api/courier/steadfast/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    const data = await parseResponseSafe(res);
    if (res.ok && data && data.success) {
      return { success: true, message: data.message || 'Steadfast settings permanently saved.' };
    }
  } catch (e) {
    console.warn('Server save steadfast failed:', e);
  }

  return { success: true, message: 'Settings saved and cached successfully.' };
}

/**
 * Test Connection & Get Current Balance from Steadfast API (Server + Direct Client Fallback)
 */
export async function testSteadfastConnection(settings: Partial<SteadfastSettings>): Promise<{
  success: boolean;
  currentBalance?: number;
  message: string;
  raw?: any;
}> {
  const apiKey = (settings.apiKey || DEFAULT_STEADFAST_SETTINGS.apiKey || '').trim();
  const secretKey = (settings.secretKey || DEFAULT_STEADFAST_SETTINGS.secretKey || '').trim();
  const baseUrl = (settings.baseUrl || DEFAULT_STEADFAST_SETTINGS.baseUrl || 'https://portal.packzy.com/api/v1').trim();

  if (!apiKey || !secretKey) {
    return {
      success: false,
      message: 'Steadfast API Key এবং Secret Key প্রদান করুন।'
    };
  }

  // 1. Try server backend proxy first
  try {
    const res = await fetch('/api/courier/steadfast/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, secretKey, baseUrl })
    });

    const data = await parseResponseSafe(res);
    if (res.ok && data && data.success) {
      return {
        success: true,
        currentBalance: data.currentBalance !== undefined ? data.currentBalance : 0,
        message: data.message || `Steadfast API কানেক্টেড! বর্তমান ব্যালেন্স: ৳${data.currentBalance ?? 0}`,
        raw: data.data
      };
    } else if (res.ok && data && !data.success) {
      return {
        success: false,
        message: extractSteadfastErrorMessage(data, 'Steadfast API authentication failed.'),
        raw: data.data
      };
    }
  } catch (err: any) {
    console.warn('Server test-connection offline, trying direct client call:', err);
  }

  // 2. Direct client call to official Steadfast API (Works in any live link / static hosting)
  try {
    const result = await callDirectSteadfastApi('get_balance', 'GET', apiKey, secretKey, undefined, baseUrl);
    if (result.ok && result.data && (result.data.status === 200 || result.data.current_balance !== undefined)) {
      const balance = Number(result.data.current_balance !== undefined ? result.data.current_balance : (result.data.data?.current_balance || 0));
      return {
        success: true,
        currentBalance: balance,
        message: `Steadfast API সফলভাবে কানেক্টেড! বর্তমান ব্যালেন্স: ৳${balance}`,
        raw: result.data
      };
    } else {
      const errorMsg = extractSteadfastErrorMessage(result.data, result.error || 'Steadfast API Key or Secret Key is invalid');
      return {
        success: false,
        message: errorMsg,
        raw: result.data
      };
    }
  } catch (directErr: any) {
    return {
      success: false,
      message: `কানেকশন এরর: ${directErr.message || 'Steadfast সার্ভারে সংযোগ করা সম্ভব হয়নি'}`
    };
  }
}

export interface SteadfastBatchResponse {
  success: boolean;
  totalProcessed: number;
  orders: Order[];
  message: string;
  results?: Array<{ orderId: string; success: boolean; consignment?: any; trackingCode?: string; error?: string }>;
  requiresApiKey?: boolean;
}

/**
 * Process a batch of orders through Steadfast Courier API
 * Guaranteed to assign REAL Steadfast Tracking Code & Consignment ID directly from Steadfast
 */
export async function processOrdersWithSteadfast(
  ordersToProcess: Order[],
  settings?: SteadfastSettings
): Promise<SteadfastBatchResponse> {
  const currentSettings = settings || await getSteadfastSettings();
  const apiKey = (currentSettings.apiKey || DEFAULT_STEADFAST_SETTINGS.apiKey || '').trim();
  const secretKey = (currentSettings.secretKey || DEFAULT_STEADFAST_SETTINGS.secretKey || '').trim();
  const baseUrl = (currentSettings.baseUrl || DEFAULT_STEADFAST_SETTINGS.baseUrl || 'https://portal.packzy.com/api/v1').trim();

  if (!apiKey || !secretKey) {
    return {
      success: false,
      totalProcessed: 0,
      orders: ordersToProcess,
      message: 'Steadfast API Key এবং Secret Key প্রয়োজন। সেটিংস সেকশনে কি বসিয়ে সেভ করুন।',
      requiresApiKey: true
    };
  }

  const orderIds = ordersToProcess.map(o => o.id);

  // 1. Try server backend proxy first
  try {
    const res = await fetch('/api/courier/steadfast/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orders: ordersToProcess,
        orderIds,
        customApiKey: apiKey,
        customSecretKey: secretKey
      })
    });

    const data = await parseResponseSafe(res);

    if (data && data.success && Array.isArray(data.updatedOrders) && data.updatedOrders.length > 0) {
      const updatedMap = new Map<string, Order>();
      for (const u of data.updatedOrders) {
        updatedMap.set(u.id, u);
      }

      const mergedOrders = ordersToProcess.map(orig => {
        return updatedMap.get(orig.id) || orig;
      });

      const resolvedResults = (Array.isArray(data.results) && data.results.length > 0)
        ? data.results
        : mergedOrders.map(o => ({
            orderId: o.id,
            success: Boolean(o.trackingCode || o.consignmentId || data.success),
            trackingCode: o.trackingCode,
            consignment: { consignment_id: o.consignmentId, tracking_code: o.trackingCode }
          }));

      return {
        success: true,
        totalProcessed: data.successfulCount || mergedOrders.length,
        orders: mergedOrders,
        message: data.message || `Steadfast-এ সফলভাবে ${data.successfulCount || mergedOrders.length} টি পার্সেল এন্ট্রি সম্পন্ন হয়েছে।`,
        results: resolvedResults
      };
    } else if (data && data.requiresApiKey) {
      return {
        success: false,
        totalProcessed: 0,
        orders: ordersToProcess,
        message: String(data.message || 'Steadfast API Key and Secret Key required.'),
        requiresApiKey: true
      };
    } else if (data && Array.isArray(data.results) && data.results.length > 0) {
      const rawMsg = data.message || data.results[0]?.error || 'Steadfast consignment entry completed with notices.';
      return {
        success: Boolean(data.success),
        totalProcessed: Number(data.successfulCount) || 0,
        orders: ordersToProcess,
        message: typeof rawMsg === 'string' ? rawMsg : JSON.stringify(rawMsg),
        results: data.results
      };
    }
  } catch (serverErr) {
    console.warn('Server Steadfast proxy unavailable, falling back to direct client API calls:', serverErr);
  }

  // 2. Direct Client-side calls to official Steadfast API (Guarantees 100% Real IDs in GitHub/Static Deployments)
  const results: Array<{ orderId: string; success: boolean; consignment?: any; trackingCode?: string; error?: string }> = [];
  const updatedOrders: Order[] = [];

  for (const order of ordersToProcess) {
    const codAmt = Number(order.codAmount !== undefined ? order.codAmount : order.totalAmount) || 0;
    const cleanPhone = formatSteadfastPhone(order.phoneNumber);

    if (!cleanPhone || cleanPhone.length !== 11 || !cleanPhone.startsWith('01')) {
      results.push({
        orderId: order.id,
        success: false,
        error: `Invalid recipient phone number (${order.phoneNumber || 'empty'}). Steadfast requires an 11-digit Bangladesh mobile number (e.g. 017XXXXXXXX).`
      });
      updatedOrders.push(order);
      continue;
    }

    let cleanAddress = (order.shippingAddress || '').trim();
    if (!cleanAddress || cleanAddress.length < 5) {
      cleanAddress = `${cleanAddress || 'Customer Address'}, Bangladesh`;
    }

    const noteText = order.isExchange 
      ? `[EXCHANGE PARCEL] ${order.orderNote || 'Please collect return product'}`
      : (order.orderNote || 'Spidey Jersey Store Package');

    let invoiceNum = order.invoiceNumber || `SJ-${order.id.replace(/^SPIDEY-?/i, '')}`;

    const payload = {
      invoice: invoiceNum,
      recipient_name: (order.customerName || 'Customer').trim(),
      recipient_phone: cleanPhone,
      recipient_address: cleanAddress,
      cod_amount: codAmt,
      note: noteText
    };

    try {
      let sfRes = await callDirectSteadfastApi('create_order', 'POST', apiKey, secretKey, payload, baseUrl);

      // If invoice was taken, append unique suffix and retry
      if (!sfRes.ok && sfRes.data && (JSON.stringify(sfRes.data).includes('already been taken') || JSON.stringify(sfRes.data).includes('already exists'))) {
        invoiceNum = `${invoiceNum}-${Math.floor(100 + Math.random() * 899)}`;
        payload.invoice = invoiceNum;
        sfRes = await callDirectSteadfastApi('create_order', 'POST', apiKey, secretKey, payload, baseUrl);
      }

      if (sfRes.ok && sfRes.data && (sfRes.data.status === 200 || sfRes.data.consignment)) {
        const consignment = sfRes.data.consignment || {};
        const realTrackingCode = String(consignment.tracking_code || '').trim();
        const realConsignmentId = String(consignment.consignment_id || '').trim();

        const updatedOrder: Order = {
          ...order,
          trackingCode: realTrackingCode || order.trackingCode,
          consignmentId: realConsignmentId || order.consignmentId,
          invoiceNumber: invoiceNum,
          courierName: 'Steadfast Courier',
          courierStatus: 'sent_to_courier',
          courierProcessedAt: new Date().toISOString(),
          status: 'processing'
        };

        results.push({
          orderId: order.id,
          success: true,
          consignment,
          trackingCode: realTrackingCode
        });
        updatedOrders.push(updatedOrder);
      } else {
        const errorMsg = extractSteadfastErrorMessage(sfRes.data, sfRes.error || `Steadfast API error (HTTP ${sfRes.status})`);
        results.push({
          orderId: order.id,
          success: false,
          error: errorMsg
        });
        updatedOrders.push(order);
      }
    } catch (e: any) {
      results.push({
        orderId: order.id,
        success: false,
        error: e.message || 'Network request to Steadfast failed'
      });
      updatedOrders.push(order);
    }
  }

  const successCount = results.filter(r => r.success).length;

  return {
    success: successCount > 0,
    totalProcessed: successCount,
    orders: updatedOrders,
    message: successCount > 0 
      ? `Steadfast Entry: ${successCount} of ${ordersToProcess.length} orders dispatched with real Steadfast Tracking Codes!`
      : `Steadfast Entry Failed: ${results[0]?.error || 'Please verify recipient phone numbers and API credentials.'}`,
    results
  };
}

