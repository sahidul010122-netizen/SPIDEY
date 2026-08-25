export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY';

export const CURRENCY_RATES: Record<CurrencyCode, { symbol: string; rate: number; prefix: boolean }> = {
  USD: { symbol: '$', rate: 1.0, prefix: true },
  EUR: { symbol: '€', rate: 0.92, prefix: false },
  GBP: { symbol: '£', rate: 0.79, prefix: true },
  JPY: { symbol: '¥', rate: 155.0, prefix: true }
};

export function formatPrice(amountInUSD: number, currency: CurrencyCode = 'USD'): string {
  const info = CURRENCY_RATES[currency] || CURRENCY_RATES.USD;
  const converted = amountInUSD * info.rate;

  if (currency === 'JPY') {
    return `${info.symbol}${Math.round(converted).toLocaleString()}`;
  }

  const formatted = converted.toFixed(2);
  return info.prefix ? `${info.symbol}${formatted}` : `${formatted} ${info.symbol}`;
}
