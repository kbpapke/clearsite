// ClearSite — EPA TRI proxy (Netlify Function, Functions 2.0 style)
// Exists only as a CORS safety net: the frontend tries EPA directly first
// and falls back to /api/tri if the browser blocks the cross-origin call.
// It only ever calls the one EPA endpoint below — it is not an open proxy.

const EPA_TRI_URL =
  "https://geopub.epa.gov/ArcGIS/rest/services/EMEF/efpoints/MapServer/1/query";

const RADIUS_METERS = 1609.34; // 1 mile, fixed server-side

export default async (req) => {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng) ||
      lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return Response.json({ error: "lat and lng query params required" }, { status: 400 });
  }

  const params = new URLSearchParams({
    f: "geojson",
    geometry: `${lng},${lat}`, // longitude first
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    outSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    distance: String(RADIUS_METERS),
    units: "esriSRUnit_Meter",
    outFields: "*",
    returnGeometry: "true",
  });

  try {
    const upstream = await fetch(`${EPA_TRI_URL}?${params}`);
    if (!upstream.ok) {
      return Response.json({ error: `EPA returned ${upstream.status}` }, { status: 502 });
    }
    const data = await upstream.json();
    return Response.json(data, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  } catch (err) {
    return Response.json({ error: "Upstream request failed" }, { status: 502 });
  }
};

export const config = {
  path: "/api/tri",
};
