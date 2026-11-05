const MINUS = '−';

const currencyFormatters = new Map<string, Intl.NumberFormat>();

function currencyFormatter(currency: string): Intl.NumberFormat {
  let formatter = currencyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1
    });
    currencyFormatters.set(currency, formatter);
  }
  return formatter;
}

const percentFormatter = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });

/** e.g. "R$ 15 mi"; negative amounts use a typographic minus: "−R$ 15 mi". */
export function formatCurrency(value: number, unitScale: number, currency: string): string {
  const text = currencyFormatter(currency).format(Math.abs(value) * unitScale);
  return value < 0 ? `${MINUS}${text}` : text;
}

/** Share of `base`, e.g. "30%" or "−30%". */
export function formatShare(value: number, base: number): string {
  if (!base) {
    return '—';
  }
  const text = percentFormatter.format(Math.abs(value) / base);
  return value < 0 ? `${MINUS}${text}` : text;
}
