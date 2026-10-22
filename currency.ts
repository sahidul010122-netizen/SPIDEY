export type CurrencyCode = 'BDT';

export const CURRENCY_RATES: Record<string, { symbol: string; rate: number; prefix: boolean; label: string }> = {
  BDT: { symbol: '৳', rate: 1.0, prefix: true, label: 'BDT (৳)' },
  USD: { symbol: '৳', rate: 1.0, prefix: true, label: 'BDT (৳)' },
  EUR: { symbol: '৳', rate: 1.0, prefix: true, label: 'BDT (৳)' },
  GBP: { symbol: '৳', rate: 1.0, prefix: true, label: 'BDT (৳)' },
  JPY: { symbol: '৳', rate: 1.0, prefix: true, label: 'BDT (৳)' }
};

export function formatPrice(amount: number | string | undefined | null, _currency?: any): string {
  const numericAmount = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
  const safeVal = isNaN(numericAmount) ? 0 : numericAmount;
  return `৳${Math.round(safeVal).toLocaleString('en-IN')}`;
}


