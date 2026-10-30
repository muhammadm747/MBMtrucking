// Cleans addresses pasted from rate confirmations, where spaces are often lost:
// "MANTENOCOLDSTORAGE 1260SYCAMORERD MANTENO IL60950" -> "1260 SYCAMORE RD MANTENO IL 60950".
const STATE_CODES = new Set((
  'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI ' +
  'SC SD TN TX UT VT VA WA WV WI WY AB BC MB NB NL NS ON PE QC SK'
).split(' '));

const SUFFIXES = [
  'EXPRESSWAY', 'BOULEVARD', 'PARKWAY', 'HIGHWAY', 'TERRACE', 'AVENUE', 'CIRCLE', 'STREET', 'COURT', 'DRIVE', 'PLACE',
  'TRAIL', 'BLVD', 'LANE', 'PKWY', 'ROAD', 'AVE', 'CIR', 'HWY', 'TER', 'TRL', 'WAY', 'CT', 'DR', 'LN', 'PL', 'RD', 'ST',
];

// Whole street names that only look like "name + suffix".
const NOT_GLUED = new Set([
  'BROADWAY', 'BOULEVARD', 'CREST', 'EAST', 'EXPRESSWAY', 'FOREST', 'FREEWAY', 'HARVEST', 'HIGHWAY', 'MIDWAY', 'ORCHARD',
  'PARKWAY', 'RAILWAY', 'RICHARD', 'SKYWAY', 'WEST',
]);

// A number after one of these is a road or unit number, not the start of the street address.
const NOT_HOUSE_BEFORE = new Set(['CR', 'FM', 'HIGHWAY', 'HWY', 'I', 'ROUTE', 'RT', 'SR', 'STE', 'SUITE', 'UNIT', 'US', '#']);

function ordinal(n) {
  const last2 = n % 100;
  if (last2 >= 11 && last2 <= 13) return 'TH';
  return { 1: 'ST', 2: 'ND', 3: 'RD' }[n % 10] || 'TH';
}

function splitSuffix(word) {
  const up = word.toUpperCase();
  if (NOT_GLUED.has(up)) return word;
  const suffix = SUFFIXES.find((s) => up.endsWith(s) && up.length - s.length >= 3);
  return suffix ? `${word.slice(0, -suffix.length)} ${word.slice(-suffix.length)}` : word;
}

/** "1260SYCAMORERD" -> "1260 SYCAMORE RD", "12THST" -> "12TH ST"; other tokens are returned as they are. */
function splitNumberToken(token) {
  const m = token.match(/^(\d+)([A-Za-z]{3,})$/);
  if (!m) return token;
  const [, num, rest] = m;
  const ord = ordinal(Number(num));
  const up = rest.toUpperCase();
  if (up.startsWith(ord) && SUFFIXES.includes(up.slice(2))) return `${num}${rest.slice(0, 2)} ${rest.slice(2)}`;
  return `${num} ${splitSuffix(rest)}`;
}

/** "IL60950" -> "IL 60950", "MANTENOIL60950" -> "MANTENO IL 60950", "MANTENOIL 60950" -> "MANTENO IL 60950". */
function splitStateZip(text) {
  return text
    .replace(/\b([A-Za-z]{3,})([A-Za-z]{2})\s*(\d{5}(?:-\d{4})?)\b/g, (all, city, st, zip) => (
      STATE_CODES.has(st.toUpperCase()) && !STATE_CODES.has((city + st).toUpperCase()) ? `${city} ${st} ${zip}` : all
    ))
    .replace(/\b([A-Za-z]{2})(\d{5}(?:-\d{4})?)\b/g, (all, st, zip) => (
      STATE_CODES.has(st.toUpperCase()) ? `${st} ${zip}` : all
    ));
}

export function cleanAddress(text) {
  return splitStateZip(String(text || '').trim())
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(splitNumberToken)
    .join(' ');
}

/** The address from the house number on, dropping a company name in front of it; null if there is no such part. */
function fromHouseNumber(clean) {
  const tokens = clean.split(' ');
  const i = tokens.findIndex((tok, idx) => (
    idx > 0 && idx < tokens.length - 1
    && /^\d+$/.test(tok)
    && !NOT_HOUSE_BEFORE.has(tokens[idx - 1].toUpperCase())
    && /^[A-Za-z]/.test(tokens[idx + 1])
  ));
  return i > 0 ? tokens.slice(i).join(' ') : null;
}

/** Texts to send to a geocoder, best first: street address only, the whole cleaned text, the original. */
export function addressCandidates(text) {
  const original = String(text || '').trim();
  const clean = cleanAddress(original);
  const seen = new Set();
  return [fromHouseNumber(clean), clean, original].filter((c) => {
    if (!c || seen.has(c.toLowerCase())) return false;
    seen.add(c.toLowerCase());
    return true;
  });
}
