/** Lenient number parser: "2,000", "2.000,50", "$1 500" … NaN when it is not a number. */
export function parseNum(str) {
  if (typeof str !== 'string') return NaN;
  let s = str.replace(/[\s$]/g, '');
  if (!/^-?[\d.,]+$/.test(s)) return NaN;
  const lc = s.lastIndexOf(','), ld = s.lastIndexOf('.');
  if (lc >= 0 && ld >= 0) {
    if (lc > ld) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (lc >= 0) {
    if (/^-?\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g, '');
    else if ((s.match(/,/g) || []).length === 1) s = s.replace(',', '.');
    else return NaN;
  } else if (ld >= 0 && (s.match(/\./g) || []).length > 1) {
    if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    else return NaN;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export function usd(n) {
  const v = Math.round((n + Number.EPSILON) * 100) / 100;
  const s = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (v < 0 ? '−' : '') + '$' + s;
}
export const usd0 = (n) => (n < 0 ? '−' : '') + '$' + Math.round(Math.abs(n)).toLocaleString('en-US');
export const fmtMiles = (n) => n.toLocaleString('en-US', { maximumFractionDigits: 1 });
export const rpm = (gross, miles) => (miles > 0 ? usd(gross / miles) : '—');

/** Compact axis label: $1.2K, $15K, $2M */
export function cmpUsd(v) {
  const a = Math.abs(v), s = v < 0 ? '−' : '';
  if (a >= 1e6) return s + '$' + (a / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
  if (a >= 1e3) return s + '$' + (a / 1e3).toFixed(a >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'K';
  return s + '$' + Math.round(a);
}
export function niceUp(v) {
  if (!(v > 0)) return 0;
  const p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
}
