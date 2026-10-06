// Exact amounts. A token amount, a supply or a percent is read from the text of the file as a decimal number (the digits
// and the number of places after the point) and turned into whole base units with BigInt, never through a floating point
// number, so 0.1 + 0.2 is 0.3 and a supply of 10^27 base units keeps every digit.

export const AMOUNT_LIMITS = { maxDigits: 100, maxExponent: 100 };

export const UINT256_MAX = (1n << 256n) - 1n;
export const U64_MAX = (1n << 64n) - 1n;

const DECIMAL = /^([+-]?)([0-9]+)(?:\.([0-9]+))?(?:[eE]([+-]?[0-9]+))?$/;

export const pow10 = (n) => 10n ** BigInt(n);

// A decimal number from its text: { negative, digits, scale } for the value digits / 10^scale, with the zeros at the end
// of the fraction dropped, so that scale is the number of places the value needs. null when the text is not a number in
// decimal notation or is longer than the limits.
export function parseDecimal(text, limits = AMOUNT_LIMITS) {
  if (typeof text !== 'string' || text.length > limits.maxDigits * 2 + 8) return null;
  const m = DECIMAL.exec(text);
  if (!m) return null;
  const [, sign, whole, fraction = '', exp = '0'] = m;
  const e = Number(exp);
  if (!Number.isInteger(e) || Math.abs(e) > limits.maxExponent) return null;
  if (whole.length + fraction.length > limits.maxDigits) return null;
  let digits = BigInt(`${whole}${fraction}`);
  let scale = fraction.length - e;
  if (scale < 0) {
    digits *= pow10(-scale);
    scale = 0;
  }
  while (scale > 0 && digits % 10n === 0n) {
    digits /= 10n;
    scale -= 1;
  }
  if (digits.toString().length > limits.maxDigits + limits.maxExponent) return null;
  return { negative: sign === '-' && digits !== 0n, digits, scale };
}

export const isWhole = (d) => d.scale === 0;

// Base units of a decimal amount of whole tokens: { units, exact }. When the amount has more places than decimals, the
// places past them are cut off and exact is false.
export function toUnits(d, decimals) {
  if (d.scale <= decimals) return { units: d.digits * pow10(decimals - d.scale), exact: true };
  const div = pow10(d.scale - decimals);
  return { units: d.digits / div, exact: d.digits % div === 0n };
}

// The part of a whole that a percent gives, rounded down to a base unit: { units, exact }.
export function percentOf(whole, p) {
  const den = 100n * pow10(p.scale);
  const n = whole * p.digits;
  return { units: n / den, exact: n % den === 0n };
}

// A string of digits with a comma between groups of three.
export function groupDigits(s) {
  let out = '';
  for (let i = 0; i < s.length; i += 1) {
    if (i > 0 && (s.length - i) % 3 === 0) out += ',';
    out += s[i];
  }
  return out;
}

// Base units as an amount of tokens for a report: whole tokens with groups of three, and the places of the fraction that
// are not zero. With plain set, no groups (for JSON); with places set, at most that many places, the rest cut off.
export function formatUnits(units, decimals, { plain = false, places = decimals } = {}) {
  const negative = units < 0n;
  const abs = negative ? -units : units;
  const base = pow10(decimals);
  const whole = (abs / base).toString();
  const fraction = decimals > 0 ? (abs % base).toString().padStart(decimals, '0').slice(0, places).replace(/0+$/, '') : '';
  const text = `${plain ? whole : groupDigits(whole)}${fraction ? `.${fraction}` : ''}`;
  return negative ? `-${text}` : text;
}

// An amount of tokens as the messages and the table show it: at most two places after the point, the rest cut off.
export const SHOWN_PLACES = 2;
export const formatAmount = (units, decimals) => formatUnits(units, decimals, { places: SHOWN_PLACES });

// A decimal as it was read, for a message.
export function formatDecimal(d) {
  const s = d.digits.toString().padStart(d.scale + 1, '0');
  const text = d.scale ? `${s.slice(0, -d.scale)}.${s.slice(-d.scale)}` : s;
  return d.negative ? `-${text}` : text;
}

// part / whole as a percent with at most two places, rounded down: '12.5%'. A whole of zero gives '-'.
export function percentText(part, whole) {
  if (whole === 0n) return '-';
  const hundredths = (part * 10000n) / whole;
  const s = hundredths.toString().padStart(3, '0');
  const text = `${s.slice(0, -2)}.${s.slice(-2)}`.replace(/\.?0+$/, '');
  return `${text}%`;
}

// a > share% of b, exactly, for a share given as a decimal.
export const overShare = (a, b, share) => a * 100n * pow10(share.scale) > share.digits * b;
