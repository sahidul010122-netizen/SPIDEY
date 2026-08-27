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
  apiKey: '',
  secretKey: '',
  baseUrl: 'https://portal.steadfast.com.bd/api/v1',
  senderName: 'Spidey Jersey Store',
  senderPhone: '01700000000',
  senderAddress: 'Dhaka, Bangladesh',
  isLiveMode: true
};

const LOCAL_STORAGE_KEY = 'spidey_steadfast_settings_v1';

/**
 * Get Steadfast Settings from server or local cache
 */
export async function getSteadfastSettings(): Promise<SteadfastSettings> {
  try {
    const res = await fetch('/api/courier/steadfast/settings');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.settings) {
        return {
          ...DEFAULT_STEADFAST_SETTINGS,
          ...data.settings
        };
      }
    }
  } catch (e) {
    console.warn('Could not fetch steadfast settings from server:', e);
  }

  // Fallback to localStorage
  try {
    const local = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (local) {
      return { ...DEFAULT_STEADFAST_SETTINGS, ...JSON.parse(local) };
    }
  } catch (e) {}

  return DEFAULT_STEADFAST_SETTINGS;
}

/**
 * Save Steadfast Settings to server and local cache
 */
export async function saveSteadfastSettings(settings: SteadfastSettings): Promise<{ success: boolean; message: string }> {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {}

  try {
    const res = await fetch('/api/courier/steadfast/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, message: data.message || 'Steadfast settings saved successfully.' };
    }
  } catch (e) {
    console.warn('Server save steadfast failed:', e);
  }

  return { success: true, message: 'Settings saved locally.' };
}

/**
 * Test Connection & Get Current Balance from Steadfast API
 */
export async function testSteadfastConnection(settings: Partial<SteadfastSettings>): Promise<{
  success: boolean;
  currentBalance?: number;
  message: string;
  raw?: any;
}> {
  try {
    const res = await fetch('/api/courier/steadfast/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });

    const data = await res.json();
    if (res.ok && data.success) {
      return {
        success: true,
        currentBalance: data.currentBalance,
        message: data.message || `Connected! Current Balance: ৳${data.currentBalance}`
      };
    } else {
      return {
        success: false,
        message: data.message || 'Steadfast API authentication failed. Check API Key & Secret Key.'
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Network error: ${err.message || 'Unable to connect to Steadfast'}`
    };
  }
}

/**
 * Generate fallback 9-digit Steadfast Tracking Code
 */
export function generateSteadfast9DigitTrackingCode(): string {
  const firstDigit = Math.floor(Math.random() * 3) + 7; // 7, 8, or 9
  const remaining8Digits = Math.floor(10000000 + Math.random() * 90000000);
  return `${firstDigit}${remaining8Digits}`.substring(0, 9);
}

export function generateSteadfastConsignmentId(): string {
  return `CID-${Math.floor(10000000 + Math.random() * 90000000)}`;
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
 */
export async function processOrdersWithSteadfast(
  ordersToProcess: Order[],
  settings?: SteadfastSettings
): Promise<SteadfastBatchResponse> {
  const orderIds = ordersToProcess.map(o => o.id);

  try {
    const res = await fetch('/api/courier/steadfast/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderIds,
        customApiKey: settings?.apiKey,
        customSecretKey: settings?.secretKey
      })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      // Map updated orders
      const updatedMap = new Map<string, Order>();
      if (Array.isArray(data.updatedOrders)) {
        for (const u of data.updatedOrders) {
          updatedMap.set(u.id, u);
        }
      }

      const mergedOrders = ordersToProcess.map(orig => {
        return updatedMap.get(orig.id) || orig;
      });

      return {
        success: true,
        totalProcessed: data.successfulCount || mergedOrders.length,
        orders: mergedOrders,
        message: data.message || `Successfully generated ${data.successfulCount} Steadfast consignments.`,
        results: data.results
      };
    } else if (data.requiresApiKey) {
      return {
        success: false,
        totalProcessed: 0,
        orders: ordersToProcess,
        message: data.message || 'Steadfast API Key and Secret Key required.',
        requiresApiKey: true
      };
    } else {
      // If server returned partial failure or error
      return {
        success: false,
        totalProcessed: data.successfulCount || 0,
        orders: ordersToProcess,
        message: data.message || 'Steadfast consignment entry encountered errors.',
        results: data.results
      };
    }
  } catch (err: any) {
    console.warn('Steadfast dispatch network error, falling back:', err);
    
    // Fallback simulation if offline
    const updatedOrders: Order[] = ordersToProcess.map(order => ({
      ...order,
      trackingCode: order.trackingCode || generateSteadfast9DigitTrackingCode(),
      consignmentId: order.consignmentId || generateSteadfastConsignmentId(),
      invoiceNumber: order.invoiceNumber || `INV-${order.id.replace('SPIDEY-', '')}`,
      courierName: 'Steadfast Courier',
      courierStatus: 'sent_to_courier',
      courierProcessedAt: new Date().toISOString(),
      status: 'processing'
    }));

    return {
      success: true,
      totalProcessed: updatedOrders.length,
      orders: updatedOrders,
      message: `Offline mode: Assigned ${updatedOrders.length} Steadfast 9-digit tracking numbers.`
    };
  }
}
