// Healthy Homes — data proxy (Netlify Function, Functions 2.0 style)
// CORS safety net: the frontend calls EPA and Overpass directly first and
// falls back to these endpoints if the browser blocks the cross-origin call.
// Locked to two upstreams only (EPA Envirofacts + OSM Overpass) — not an open proxy.

const EPA_BASE =
  "https://geopub.epa.gov/ArcGIS/rest/services/EMEF/efpoints/MapServer";
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const OPENSKY_URL = "https://opensky-network.org/api/states/all";

const MAX_RADIUS_M = 20000; // hard cap to keep queries bounded

export default async (req) => {
  const url = new URL(req.url);
  if (url.pathname.endsWith("/epa")) return handleEpa(url);
  if (url.pathname.endsWith("/osm")) return handleOsm(url);
  if (url.pathname.endsWith("/flights")) return handleFlights(url);
  return Response.json({ error: "Not found" }, { status: 404 });
};

/* ---------- EPA Envirofacts (efpoints layers 0-5) ---------- */
async function handleEpa(url) {
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  const layer = Number(url.searchParams.get("layer"));
  let radius = Number(url.searchParams.get("radius"));
  if (!Number.isFinite(radius) || radius <= 0) radius = 1609.34;
  radius = Math.min(radius, MAX_RADIUS_M);

  if (!validLatLng(lat, lng)) {
    return Response.json({ error: "valid lat and lng required" }, { status: 400 });
  }
  if (!Number.isInteger(layer) || layer < 0 || layer > 5) {
    return Response.json({ error: "layer must be 0-5" }, { status: 400 });
  }

  const params = new URLSearchParams({
    f: "geojson",
    geometry: `${lng},${lat}`, // longitude first
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    outSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    distance: String(radius),
    units: "esriSRUnit_Meter",
    outFields: "*",
    returnGeometry: "true",
  });

  try {
    const upstream = await fetch(`${EPA_BASE}/${layer}/query?${params}`);
    if (!upstream.ok) {
      return Response.json({ error: `EPA returned ${upstream.status}` }, { status: 502 });
    }
    const data = await upstream.json();
    return Response.json(data, { headers: { "Cache-Control": "public, max-age=3600" } });
  } catch (err) {
    return Response.json({ error: "EPA request failed" }, { status: 502 });
  }
}

/* ---------- OSM Overpass (infrastructure layers) ---------- */
async function handleOsm(url) {
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  if (!validLatLng(lat, lng)) {
    return Response.json({ error: "valid lat and lng required" }, { status: 400 });
  }

  // Query is built server-side from fixed filters/radii — the request body is
  // never taken from the client, so this can't be used as an open Overpass proxy.
  const query = overpassQuery(lat, lng);

  try {
    const upstream = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(query),
    });
    if (!upstream.ok) {
      return Response.json({ error: `Overpass returned ${upstream.status}` }, { status: 502 });
    }
    const data = await upstream.json();
    return Response.json(data, { headers: { "Cache-Control": "public, max-age=3600" } });
  } catch (err) {
    return Response.json({ error: "Overpass request failed" }, { status: 502 });
  }
}

// Keep these filters/radii in sync with buildOverpassQuery() in index.html
function overpassQuery(lat, lng) {
  const a = (m) => `(around:${m},${lat},${lng})`;
  return (
    "[out:json][timeout:25];(" +
    `way["power"="line"]${a(805)};` +
    `node["man_made"="mast"]${a(805)};` +
    `node["man_made"="communications_tower"]${a(805)};` +
    `way["man_made"="communications_tower"]${a(805)};` +
    `node["tower:type"="communication"]${a(805)};` +
    `way["aeroway"="aerodrome"]${a(8047)};` +
    `node["aeroway"="aerodrome"]${a(8047)};` +
    `way["highway"="motorway"]${a(1609)};` +
    `way["highway"="trunk"]${a(1609)};` +
    `way["leisure"="golf_course"]${a(4828)};` +
    `way["landuse"="farmland"]${a(4828)};` +
    ");out geom 200;"
  );
}

/* ---------- OpenSky Network (live aircraft in a bounding box) ----------
   Flightradar24 has no free/open API and prohibits scraping; OpenSky is the
   free, ToS-friendly source for live aircraft state vectors. */
async function handleFlights(url) {
  const lamin = Number(url.searchParams.get("lamin"));
  const lomin = Number(url.searchParams.get("lomin"));
  const lamax = Number(url.searchParams.get("lamax"));
  const lomax = Number(url.searchParams.get("lomax"));

  const ok = [lamin, lomin, lamax, lomax].every(Number.isFinite) &&
    lamin >= -90 && lamax <= 90 && lamin < lamax &&
    lomin >= -180 && lomax <= 180 && lomin < lomax &&
    (lamax - lamin) <= 3 && (lomax - lomin) <= 3; // cap the box size
  if (!ok) {
    return Response.json({ error: "valid bounding box required" }, { status: 400 });
  }

  const params = new URLSearchParams({
    lamin: String(lamin), lomin: String(lomin), lamax: String(lamax), lomax: String(lomax)
  });
  try {
    const upstream = await fetch(`${OPENSKY_URL}?${params}`);
    if (!upstream.ok) {
      return Response.json({ error: `OpenSky returned ${upstream.status}` }, { status: 502 });
    }
    const data = await upstream.json();
    return Response.json(data, { headers: { "Cache-Control": "public, max-age=20" } });
  } catch (err) {
    return Response.json({ error: "OpenSky request failed" }, { status: 502 });
  }
}

function validLatLng(lat, lng) {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  );
}

export const config = {
  path: ["/api/epa", "/api/osm", "/api/flights"],
};
