export type CurrencyCode = 'BDT' | 'USD' | 'EUR' | 'GBP' | 'JPY';

export const CURRENCY_RATES: Record<CurrencyCode, { symbol: string; rate: number; prefix: boolean; label: string }> = {
  BDT: { symbol: '৳', rate: 120.0, prefix: true, label: 'BDT (৳)' },
  USD: { symbol: '$', rate: 1.0, prefix: true, label: 'USD ($)' },
  EUR: { symbol: '€', rate: 0.92, prefix: false, label: 'EUR (€)' },
  GBP: { symbol: '£', rate: 0.79, prefix: true, label: 'GBP (£)' },
  JPY: { symbol: '¥', rate: 155.0, prefix: true, label: 'JPY (¥)' }
};

export function formatPrice(amountInUSD: number, currency: CurrencyCode = 'BDT'): string {
  const info = CURRENCY_RATES[currency] || CURRENCY_RATES.BDT;
  const converted = amountInUSD * info.rate;

  if (currency === 'BDT') {
    return `${info.symbol}${Math.round(converted).toLocaleString('en-IN')}`;
  }

  if (currency === 'JPY') {
    return `${info.symbol}${Math.round(converted).toLocaleString()}`;
  }

  const formatted = converted.toFixed(2);
  return info.prefix ? `${info.symbol}${formatted}` : `${formatted} ${info.symbol}`;
}

