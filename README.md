# ClearSite — core-loop MVP

Type a street address → see EPA Toxics Release Inventory (TRI) facilities within
1 mile, on a map and in a nearest-first list with distance + compass bearing.

Free stack, zero signups for local testing: Leaflet + OpenStreetMap tiles,
Nominatim geocoding, Turf.js, EPA's public ArcGIS service. No API keys.

## Run it locally (no install)

Open `index.html` in a browser. That's it.

- Default view is centered on Ann Arbor, MI.
- Try: `100 N Main St, Ann Arbor, MI` — or any address you know
  (Dexter, Saline, Ypsilanti, Canton, Whitmore Lake, Pinckney...).
- Include city + state for the best geocoder hits.

If the EPA request is ever blocked by CORS in your browser, the sidebar will
say so cleanly — that's the signal to deploy to Netlify, where the included
serverless proxy takes over automatically.

## Deploy to Netlify (free tier — needs a Netlify login, pick one path)

**Path A — drag and drop (fastest):**
1. Go to https://app.netlify.com/drop
2. Drag this whole `clearsite` folder onto the page.
3. Done — you get a live URL. (Drop deploys include the `netlify/functions`
   folder, so the proxy works.)

**Path B — Git auto-deploy:**
1. Push this folder to a GitHub repo.
2. In Netlify: "Add new site" → "Import an existing project" → pick the repo.
3. Build settings are read from `netlify.toml` automatically. Every push deploys.

**Path C — CLI:**
```
npm install -g netlify-cli
cd clearsite
netlify deploy --prod
```

## What's in here

```
clearsite/
├── index.html                      # the entire app (HTML + CSS + JS inline)
├── netlify.toml                    # publish + functions config
├── netlify/functions/tri-proxy.mjs # CORS-safe EPA proxy at /api/tri (fallback only)
└── README.md
```

## How the EPA fallback works

The app queries EPA directly from the browser first. If that fails (e.g. CORS),
and the site is served over http(s), it retries the same query through
`/api/tri` — the Netlify Function — which calls EPA server-side. The function
is locked to the single EPA endpoint; it is not an open proxy.

## Next iterations (in order)

1. Michigan EGLE Part 201 contamination sites as a second layer (best local data).
2. Layer toggles in the sidebar.
3. Superfund label-only layer (same EPA service, layer 0).
4. SEMCOG farms, OSM golf courses / power lines, cell towers, freeways —
   per the full build plan.

## Usage etiquette (free services)

- Nominatim: geocodes only on explicit search (never per keystroke); max ~1 req/s.
- OSM tiles: fine for personal testing; swap to a commercial tile provider
  before any real launch.
- Attribution for OpenStreetMap is shown in the map corner and footer — keep it.
