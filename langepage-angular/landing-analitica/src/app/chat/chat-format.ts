const SIZE_UNITS = ['B', 'KB', 'MB', 'GB'];

/** File size in pt-BR (`1,5 MB`), for the attachment chip. */
export function formatFileSize(bytes: number): string {
  let value = Math.max(0, bytes);
  let unit = 0;
  while (value >= 1024 && unit < SIZE_UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: unit === 0 ? 0 : 1 }).format(value);
  return `${number} ${SIZE_UNITS[unit]}`;
}

const EMAIL = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/;

export function isEmail(value: string): boolean {
  return EMAIL.test(value);
}

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
