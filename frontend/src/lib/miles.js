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
