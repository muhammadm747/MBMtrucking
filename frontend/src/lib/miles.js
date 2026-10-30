// Driving miles between two addresses: Esri ArcGIS geocoding (house-level US data) with
// Photon/Nominatim (OpenStreetMap) as fallback, + OSRM routing.
// Passenger-car route, so it is an estimate; the user can always edit the result.
import { addressCandidates } from './address.js';

const cache = new Map();
const ESRI = 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer';
const ESRI_KEY = import.meta.env.VITE_ARCGIS_KEY;
const ESRI_COMMON = 'f=json&countryCode=USA,CAN,MEX' + (ESRI_KEY ? '&token=' + encodeURIComponent(ESRI_KEY) : '');
const MIN_SCORE = 80;

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

/** "1260 W Sycamore Rd, Manteno, IL, 60950, USA" -> "1260 W Sycamore Rd, Manteno, IL 60950" */
const tidyLabel = (text) => text.replace(/, (USA|United States)$/, '').replace(/, ([A-Z]{2}), (\d{5})/, ', $1 $2');

function esriName(c) {
  const a = c.attributes || {};
  if (!a.City || !a.RegionAbbr) return tidyLabel(c.address);
  const head = a.StAddr || (a.PlaceName !== a.City ? a.PlaceName : '');
  return [head, a.City, [a.RegionAbbr, a.Postal].filter(Boolean).join(' ')].filter(Boolean).join(', ');
}

async function esriFind(text) {
  const j = await getJson(
    `${ESRI}/findAddressCandidates?${ESRI_COMMON}&maxLocations=1&outFields=StAddr,PlaceName,City,RegionAbbr,Postal&SingleLine=` +
    encodeURIComponent(text),
  );
  const c = j && Array.isArray(j.candidates) ? j.candidates[0] : null;
  return c && c.score >= MIN_SCORE ? { lat: c.location.y, lon: c.location.x, name: esriName(c) } : null;
}

let lastNominatim = 0;

async function nominatimFind(text) {
  const wait = lastNominatim + 1100 - Date.now(); // Nominatim: max 1 request/second
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastNominatim = Date.now();
  const j = await getJson(
    'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=us,ca,mx&q=' + encodeURIComponent(text),
  );
  if (!Array.isArray(j) || !j.length) return null;
  return { lat: +j[0].lat, lon: +j[0].lon, name: String(j[0].display_name || text) };
}

/** Coordinates of an address as typed or pasted: tries each cleaned-up form, Esri first. */
export async function geocode(q) {
  const key = q.toLowerCase();
  if (cache.has(key)) return cache.get(key);
  const texts = addressCandidates(q);
  let r = null;
  let failure = null;
  for (const find of [esriFind, nominatimFind]) {
    for (const text of texts) {
      try {
        r = await find(text);
      } catch (e) {
        failure = e; // this service is down: the next one may still answer
        break;
      }
      if (r) break;
    }
    if (r) break;
  }
  if (!r && failure) throw failure;
  if (r) cache.set(key, r);
  return r;
}

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
 * Address suggestions while typing, limited to the US, Canada and Mexico.
 * Returns [{label, sub, lat?, lon?}]: label is what goes into the field ("2242 Bushy Park Rd, Goose Creek, SC 29445").
 * Esri suggestions carry no coordinates; geocode(label) finds them when the miles are calculated.
 */
export async function suggest(q, signal) {
  try {
    for (const text of addressCandidates(q).slice(0, 2)) {
      const items = await esriSuggest(text, signal);
      if (items.length) return items;
    }
  } catch (e) {
    if (e.name === 'AbortError') throw e;
  }
  return photonSuggest(q, signal);
}

async function esriSuggest(text, signal) {
  const r = await fetch(`${ESRI}/suggest?${ESRI_COMMON}&maxSuggestions=5&text=` + encodeURIComponent(text), { signal });
  if (!r.ok) throw new Error('http ' + r.status);
  const j = await r.json();
  if (j.error) throw new Error(j.error.message || 'esri');
  const labels = (j.suggestions || []).filter((s) => !s.isCollection).map((s) => tidyLabel(s.text));
  return [...new Set(labels)].map((label) => ({ label, sub: '' }));
}

async function photonSuggest(q, signal) {
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
