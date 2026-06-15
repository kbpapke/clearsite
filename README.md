# Healthy Homes — environmental home-search tool

Type a street address → see environmental and infrastructure concerns near it on a
map, with **distance + compass direction** to each, an **A+–E address score**, and a
**legend** explaining every layer and its data source.

Free stack, zero signups for local testing: Leaflet + OpenStreetMap tiles, the ArcGIS
World geocoder (Nominatim fallback), Turf.js, EPA's public ArcGIS service, and the OSM
Overpass API. No API keys.

## Sharing & links

- Every search updates the URL with `?q=<address>`, so the address bar is always a
  shareable, copy-pasteable link.
- The **Share** button uses the native share sheet on mobile and copies the link to the
  clipboard on desktop.
- Opening a `?q=` link (shared from the app or pasted) runs that search automatically.
- **Zillow links just work.** Paste a Zillow listing URL — e.g.
  `https://www.zillow.com/homedetails/3736-Highlander-Way-W-Ann-Arbor-MI-48108/24720986_zpid/?utm_source=txtshare`
  — and the app strips the marketing tags, extracts the address, and searches it.

## Install as an app (PWA)

The site is an installable Progressive Web App: a web manifest (`manifest.webmanifest`),
icons, and a service worker (`sw.js`) ship with it. On Android/desktop Chrome/Edge an
**Install** banner appears (dismissible, remembered); on iOS Safari use Share → "Add to
Home Screen". Installed, it opens standalone (no browser chrome). The service worker
caches the app shell so the page loads instantly and survives flaky connections (live
data still needs the network).

## Geocoding

The ArcGIS World geocoder is tried first (strong US street-address coverage, CORS-friendly,
no key), with Nominatim as a fallback. This resolves typical residential addresses that
OSM-only geocoding misses.

## Run it locally (no install)

Open `index.html` in a browser. That's it.

- Default view is centered on Ann Arbor, MI.
- Try: `100 N Main St, Ann Arbor, MI` — or any address you know
  (Dexter, Saline, Ypsilanti, Canton, Whitmore Lake, Pinckney...).
- Include city + state for the best geocoder hits.

If a data request is blocked by CORS in your browser, the app retries through the
bundled Netlify proxy automatically (only meaningful once deployed over http(s)).

## Concern layers

Each layer scans the address out to its own radius. Toggle any layer on/off in the
sidebar. Superfund and Brownfields are shown as **labels only** (no radius ring) —
their risk extent depends on the specific contaminants.

| Layer | Radius | Source |
|-------|--------|--------|
| Superfund sites | 3 mi (labels only) | EPA CERCLIS |
| Hazardous waste | 1 mi | EPA RCRA handlers |
| Toxic releases (TRI) | 1 mi | EPA Toxics Release Inventory |
| Air pollution | 1 mi | EPA air-emissions facilities |
| Water dischargers | 1 mi | EPA NPDES |
| Brownfields | 3 mi (labels only) | EPA ACRES (coverage patchy) |
| Power lines | 0.5 mi | OpenStreetMap |
| Cell / comm towers | 0.5 mi | OpenStreetMap (partial vs. FCC) |
| Highways / freeways | 1 mi | OpenStreetMap (motorway + trunk) |
| Airports | 5 mi | OpenStreetMap (aerodromes) |
| Golf courses | 3 mi | OpenStreetMap |
| Farms / cropland | 3 mi | OpenStreetMap (farmland) |

The six EPA layers come from one ArcGIS service (`EMEF/efpoints` layers 0–5); the six
OpenStreetMap layers come from a single Overpass query.

## Address score (A+ – E)

Each layer contributes a **capped** amount to a total "concern" number: its nearest
source sets the base (more-hazardous layers weigh more × how close it is), plus a
bounded bonus for additional nearby sources. The cap stops one dense layer (e.g. RCRA
hazardous-waste handlers, which include dentists and auto shops) from dominating. The
total maps to a letter grade. Weights and thresholds live in `LAYERS` / `GRADES` at
the top of the inline script and are easy to tune.

## Deploy to Netlify (free tier)

**Git auto-deploy:** Netlify → "Add new site" → "Import an existing project" → pick the
repo. Build settings are read from `netlify.toml`. Every push deploys. The live site is
https://healthy-homes.netlify.app/.

## What's in here

```
.
├── index.html                       # the entire app (HTML + CSS + JS inline)
├── netlify.toml                     # publish + functions config
├── netlify/functions/tri-proxy.mjs  # CORS-safe proxy: /api/epa + /api/osm (fallback only)
└── README.md
```

## How the proxy works

The app calls EPA and Overpass directly from the browser first. If a call fails (e.g.
CORS) and the site is served over http(s), it retries through the Netlify Function:
`/api/epa?layer=<0-5>&lat=&lng=&radius=` or `/api/osm?lat=&lng=`. The function is locked
to those two upstreams and builds the Overpass query server-side — it is not an open proxy.

## Next iterations

1. Per-layer custom radius controls (post-MVP in the brief).
2. Michigan EGLE Part 201 contamination sites as a state-specific layer.
3. USDA CropScape crop-type detail for farmland.
4. Richer FCC/utility-GIS tower & power-line data (needs keys or bulk loads).

## Usage etiquette (free services)

- Nominatim: geocodes only on explicit search (never per keystroke); max ~1 req/s.
- Overpass / OSM tiles: fine for personal testing; use a commercial provider before any
  real launch. Keep OpenStreetMap attribution (shown in the map corner, footer, legend).
