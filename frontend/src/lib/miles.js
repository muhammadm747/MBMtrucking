// Driving miles between two addresses: Nominatim (OpenStreetMap) geocoding + OSRM routing.
// Passenger-car route, so it is an estimate; the user can always edit the result.
const cache = new Map();

async function getJson(url) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 12000);
  try {
    const r = await fetch(url, { signal: ac.signal });
    if (!r.ok) throw new Error('http ' + r.status);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function geocode(q) {
  const key = q.toLowerCase();
  if (cache.has(key)) return cache.get(key);
  const j = await getJson(
    'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=us,ca,mx&q=' + encodeURIComponent(q),
  );
  if (!Array.isArray(j) || !j.length) return null;
  const r = { lat: +j[0].lat, lon: +j[0].lon, name: String(j[0].display_name || q) };
  cache.set(key, r);
  return r;
}

export const isCached = (q) => cache.has(q.toLowerCase());

const STATES = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA', Colorado: 'CO', Connecticut: 'CT',
  Delaware: 'DE', 'District of Columbia': 'DC', Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL',
  Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD',
  Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO', Montana: 'MT',
  Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA',
  'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT',
  Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY',
};
const PLACE_TYPES = new Set(['city', 'town', 'village', 'hamlet', 'suburb', 'locality', 'county', 'state', 'postcode']);

/**
 * Address suggestions while typing (Photon / OpenStreetMap), limited to the US, Canada and Mexico.
 * Returns [{label, sub, lat, lon}]: label is what goes into the field ("2242 Bushy Park Rd, Goose Creek, SC 29445").
 */
export async function suggest(q, signal) {
  const url = 'https://photon.komoot.io/api/?limit=7&lang=en&bbox=-170,14,-50,72&q=' + encodeURIComponent(q);
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error('http ' + r.status);
  const j = await r.json();
  const seen = new Set();
  const out = [];
  for (const f of j.features || []) {
    const p = f.properties || {};
    if (!['US', 'CA', 'MX'].includes(p.countrycode)) continue;
    const state = STATES[p.state] || p.state || '';
    const street = p.street ? [p.housenumber, p.street].filter(Boolean).join(' ') : '';
    const isPlace = PLACE_TYPES.has(p.osm_value) || PLACE_TYPES.has(p.type);
    const head = isPlace ? p.name : street || p.name;
    const town = isPlace ? '' : p.city || p.district || p.county || '';
    const tail = [state, p.postcode].filter(Boolean).join(' ');
    const label = [head, town, tail].filter(Boolean).join(', ');
    if (!label || seen.has(label)) continue;
    seen.add(label);
    const sub = [!isPlace && street && p.name && p.name !== street ? p.name : '', p.osm_value === 'county' ? 'County' : '', p.countrycode !== 'US' ? p.country : '']
      .filter(Boolean).join(' · ');
    const [lon, lat] = f.geometry.coordinates;
    out.push({ label, sub, lat, lon });
    if (out.length === 5) break;
  }
  return out;
}

export async function routeMiles(a, b) {
  const j = await getJson(
    `https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false&alternatives=false`,
  );
  if (!j || j.code !== 'Ok' || !j.routes || !j.routes.length) return 0;
  return j.routes[0].distance / 1609.344;
}

/** "Dallas, Dallas County, Texas, United States" -> "Dallas, Texas" */
export function shortPlace(n) {
  const p = n.split(',').map((x) => x.trim());
  return p.length > 2 ? p[0] + ', ' + p[p.length - 2] : n;
}

export function mapsUrl(a, b) {
  return 'https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=' + encodeURIComponent(a) +
    '&destination=' + encodeURIComponent(b);
}
