import Decimal from 'decimal.js';

export type MonetaryAsset = 'BNB' | 'BRL' | 'BTC' | 'USDT';

export interface MonetaryTooltipRates {
  bnbUsdt?: string | null;
  btcUsdt?: string | null;
  usdtBrl?: string | null;
}

export function buildMonetaryTooltip(
  amount: string | null | undefined,
  asset: MonetaryAsset,
  rates: MonetaryTooltipRates,
): string | undefined {
  const quantity = exactFinite(amount);
  const usdtBrl = exactPositive(rates.usdtBrl);
  if (quantity === null || usdtBrl === null) return undefined;

  if (asset === 'USDT') {
    return `Equivalent: ${formatBrl(quantity.times(usdtBrl))}`;
  }
  if (asset === 'BRL') {
    return `Equivalent: ${formatUsdt(quantity.dividedBy(usdtBrl))}`;
  }

  const assetUsdt = exactPositive(
    asset === 'BNB' ? rates.bnbUsdt : rates.btcUsdt,
  );
  if (assetUsdt === null) return undefined;
  const valueUsdt = quantity.times(assetUsdt);
  return `Equivalent: ${formatUsdt(valueUsdt)} · ${formatBrl(
    valueUsdt.times(usdtBrl),
  )}`;
}

function exactPositive(value: string | null | undefined): Decimal | null {
  const parsed = exactPositiveOrZero(value);
  return parsed?.greaterThan(0) ? parsed : null;
}

function exactPositiveOrZero(value: string | null | undefined): Decimal | null {
  if (value === null || value === undefined) return null;
  try {
    const parsed = new Decimal(value);
    return parsed.isFinite() && parsed.greaterThanOrEqualTo(0) ? parsed : null;
  } catch {
    return null;
  }
}

function exactFinite(value: string | null | undefined): Decimal | null {
  if (value === null || value === undefined) return null;
  try {
    const parsed = new Decimal(value);
    return parsed.isFinite() ? parsed : null;
  } catch {
    return null;
  }
}

function formatUsdt(value: Decimal): string {
  return `${formatDecimal(value)} USDT`;
}

function formatBrl(value: Decimal): string {
  const prefix = value.isNegative() ? '-R$ ' : 'R$ ';
  return `${prefix}${formatDecimal(value.absoluteValue(), 'pt-BR')}`;
}

function formatDecimal(value: Decimal, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value.toNumber());
}
