export const colors = {
  bg: '#0F1115',
  card: '#171A21',
  text: '#F2F4F8',
  muted: '#8A93A6',
  border: '#252A34',
  expense: '#F97316',
  income: '#22C55E',
  savings: '#38BDF8',
  danger: '#EF4444',
  primary: '#6366F1',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const CURRENCY = '₹';

export const MAX_AMOUNT = 9999999999.99;

export function sanitizeAmount(text) {
  const stripped = String(text).replace(/[^0-9.]/g, '');
  const [whole, ...rest] = stripped.split('.');
  if (rest.length === 0) return whole;
  return `${whole}.${rest.join('').slice(0, 2)}`;
}

export function money(n) {
  const value = Number(n);
  const amount = Number.isFinite(value) ? value : 0;
  const digits = Math.abs(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return (amount < 0 ? '-' : '') + CURRENCY + digits;
}
