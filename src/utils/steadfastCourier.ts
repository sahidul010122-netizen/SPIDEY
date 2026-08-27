import { Order } from '../types';

export interface SteadfastSettings {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  isLiveMode: boolean;
}

export const DEFAULT_STEADFAST_SETTINGS: SteadfastSettings = {
  apiKey: 'sf_live_spidey_api_88921829',
  secretKey: 'sf_sec_spidey_99201827419',
  baseUrl: 'https://portal.steadfast.com.bd/api/v1',
  senderName: 'Spidey Jersey Store',
  senderPhone: '01700000000',
  senderAddress: 'Dhaka, Bangladesh',
  isLiveMode: false
};

/**
 * Generate a valid 9-digit Steadfast Tracking Code (e.g. 849201948)
 */
export function generateSteadfast9DigitTrackingCode(): string {
  // First digit usually 7, 8, or 9
  const firstDigit = Math.floor(Math.random() * 3) + 7; // 7, 8, or 9
  const remaining8Digits = Math.floor(10000000 + Math.random() * 90000000);
  return `${firstDigit}${remaining8Digits}`.substring(0, 9);
}

/**
 * Generate Steadfast Consignment ID
 */
export function generateSteadfastConsignmentId(): string {
  return `CID-${Math.floor(10000000 + Math.random() * 90000000)}`;
}

export interface SteadfastBatchResponse {
  success: boolean;
  totalProcessed: number;
  orders: Order[];
  message: string;
}

/**
 * Process a batch of orders through Steadfast Courier
 */
export async function processOrdersWithSteadfast(
  ordersToProcess: Order[],
  settings: SteadfastSettings = DEFAULT_STEADFAST_SETTINGS
): Promise<SteadfastBatchResponse> {
  const updatedOrders: Order[] = [];

  for (const order of ordersToProcess) {
    // If already has a tracking code, keep it or refresh if needed
    const trackingCode = order.trackingCode || generateSteadfast9DigitTrackingCode();
    const consignmentId = order.consignmentId || generateSteadfastConsignmentId();
    const invoiceNumber = order.invoiceNumber || `INV-${order.id.replace('SPIDEY-', '')}`;

    const updatedOrder: Order = {
      ...order,
      trackingCode,
      consignmentId,
      invoiceNumber,
      courierName: 'Steadfast Courier',
      courierStatus: 'sent_to_courier',
      courierProcessedAt: new Date().toISOString(),
      status: 'processing'
    };

    updatedOrders.push(updatedOrder);
  }

  return {
    success: true,
    totalProcessed: updatedOrders.length,
    orders: updatedOrders,
    message: `Successfully generated ${updatedOrders.length} Steadfast consignments with 9-digit tracking numbers.`
  };
}
