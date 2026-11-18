# Chennai Rain / Flood Visualizer — Feasibility Research

Date: 2026-11-15. Status: research complete, plan not finalized.

Legend: **[VERIFIED]** = actually fetched/tested on this machine today. **[UNTESTED]** = plausible, needs checking.

## Machine reality (measured)

- WSL2, Python 3.8.5, **no node/npm**, no gdal, no docker, no ffmpeg. pip needed a manual bootstrap.
- GTX 1650 (4 GB) + driver 552.44 — **no CUDA toolkit**, but WebGL2 in Windows Chrome/Edge works.
- `C:` has 42 GB free.
- **Overpass API is unreachable from this network** on both IPv4 and IPv6 (TCP connect hangs). **[VERIFIED]**
- Python 3.8 is old; pinned wheels are required (rasterio 1.3.11 installed fine, later ones won't).

## Map stack

- **MapLibre GL JS** supports 3D terrain, `raster-dem` sources, and hillshade **[VERIFIED — docs API surface]**. MIT licensed, open-source, no vendor lock. This is the right base library.
- **MapTiler terrain-rgb** is 403 without an API key **[VERIFIED]**. `demotiles.maplibre.org` terrain 404s. So: **host the DEM ourselves from our own heightfield** — we need a local heightfield for the simulation anyway, so this costs nothing extra.
- **Base imagery: Esri World Imagery** (`server.arcgisonline.com/.../World_Imagery/MapServer/tile/{z}/{y}/{x}`) — satellite, no key, returns real Chennai imagery at z13/z15/z16/z17/z18 **[VERIFIED]**. Licence permits use, not bulk pre-fetch; fine for live tiles. Cache fallback for offline: MapTiler / Bing / Sentinel-2 cloudless (needs free key).
- Dark/clean mode: **CARTO dark_all** basemap **[VERIFIED 200]**.

## Elevation — the decisive finding

Chennai's real relief is tiny (sea level to ~25 m over 20 km). Two candidate DEMs were sampled at known flood locations:

| Location | Copernicus 30 m (DSM) | SRTM 30 m (bare-earth) | true ground ≈ |
|---|---|---|---|
| Chennai Central | 10.6 | **1** | ~1 |
| T. Nagar | 14.1 | **5** | ~5 |
| Marina Beach | 10.8 | **-1** | 0 |
| Pallikaranai marsh | 7.8 | **3** | ~2 |
| Adyar river mouth | 12.0 | **1** | 0 |
| Tambaram | 34.8 | **17** | ~17 |

**Copernicus GLO-30 is a surface model — it bakes in buildings and tree canopy, reading 5–10 m high over a 1–10 m city.** For a flood map that's fatal. **[VERIFIED by download + point sampling]**

Also flagged: the Oct–Dec 2023 floods (Pallikaranai, Velachery). Historical events are now sourced properly — see the addendum.


**Decision: SRTM 30 m (Skadi mirror, keyless, whole 1° × 1° blocks, ~5 MB) is the ground surface.** **[VERIFIED]** Sea is void-filled to 0; the city is clean land data (voids are only offshore). FABDEM would be nicer but its host wouldn't serve us today — worth one retry later. **[UNTESTED]**

**Buildings are not modelled as height — they're modelled as flow occluders** — which is exactly what you want: Microsoft Building Footprints covers Chennai including slums with real polygons (~1 MB gz per z13 quadkey tile) **[VERIFIED]**. Count them as obstacles, not elevation.

## Rain / hydrology

This is a **visualization**, not a calibrated hydraulic model. It should be labelled as illustrative. That doesn't mean it can't follow real topography — it should, or it's just a colour animation.

Two water routings considered:

1. **Precomputed drainage network, timed fill/drain** — priority-flood depression filling, D8 flow accumulation, sink capacity caps. Very fast, deterministic, 60 fps, ~1–2 days to build.
2. **GPU local-inertial shallow water** (Bates et al. 2010, the algorithm behind LISFLOOD-FP) — ping-pong heightfield, flux limited by CFL, Manning friction, semi-implicit. Water finds the lowest road/gully first and routes down the Adyar/Cooum to the Bay on its own. ~3–4 days, needs GPU debugging. This is what Anna University and IIT-Madras-style models actually do.

Recommendation: build **1** first, week one, and add **2** behind a toggle once the app stands up.

**Recession truth:** in a real monsoon the flooding that matters is stormwater drains into Adyar/Cooum. So recession = drain capacity + gravity outfall to the Bay, **fast near the rivers and in the north, very slow in Pallikaranai/Velachery** — that's realistic, not arbitrary.

## The world's data, in shape

- **Base imagery: Esri World Imagery** (`server.arcgisonline.com/.../World_Imagery/MapServer/tile/{z}/{y}/{x}`) — satellite, no key, returns real Chennai imagery at z13/z15/z16/z17/z18 **[VERIFIED]**. Licence permits use, not bulk pre-fetch; fine for live tiles. Cache fallback for offline: MapTiler / Bing / Sentinel-2 cloudless (needs free key).
- **Dark/clean mode: CARTO dark_all** basemap **[VERIFIED 200]**.

## The full pipeline (proven end-to-end today)

SRTM block → decode → window to city → void-fill sea → resize to 4096² heightfield → encode Terrarium PNG → WebGL2 texture decode back to metres **[VERIFIED, round-tripped to exact elevation]**.
Real imagery tiles → PNG/JPEG → local tile store **[VERIFIED]**.
Building footprints → geojsonl → rasterized occluder mask **[VERIFIED download, 12 MB gz, Chennai slums included]**.

## The layering

`Esri imagery` · `MapLibre terrain` · `water depth shader (blue, Fresnel, ripple/a spec by rain intensity)` · `rain streaks / lightning`. Water is **both** a map effect and the simulation state, one shader layer.

## The cost

One-off data prep: SRTM blocks (~30 MB) + z13–z18 imagery (~1–2 GB) + buildings (~500 MB) + vector layers. 42 GB free is enough. Everything runs offline after that.

## Addendum: buried lakes and 15 years of flood history

Both additions are viable, and the history turned out to be much better than expected — including **official government hotspot data for two separate monsoon years**.

### Lake burial — what's actually establishable

The premise is correct and now quantified. Documented figures (DGPS survey ordered by the NGT; Uvakai Research Foundation study):

- **Velachery Lake shrank >70% between 1980 and 2015** — ~255 acres → ~55 acres; half the lake across 100 Feet Road is gone and its feeder channel was covered.
- **Pallikaranai lost ~1,850 ha (75.5%) 1991–2015**; ~38% of the remnant is encroached by the GCC, Indian Railways, ELCOT and the Perungudi dumpyard.
- **165 water bodies (31 lakes, 134 tanks) have vanished** from the Pallikaranai catchment — 7.35 km², capacity up to 37.5 million m³.

So Pallikaranai + Velachery end up as **one drainage basin** (HydroBASINS level 9 `4090028490`), which is precisely why the Velachery lake bed floods first.

**Three data layers make this physical rather than a label:**

1. **OSM waterbody geometry** — 16,960 water features in the TN extract, and it names the right ones: Velachery, Madipakkam, Puzhuthivakkam, Adambakkam, Perumbakkam, Pallikaranai Anai, Perungalathur. Outperforms satellite water history in this city. **[VERIFIED]**
2. **JRC Global Surface Water** (open GCS bucket, free) — 37 years of Landsat occurrence, 30 m. Good for large permanent bodies (Chembarambakkam 68%, the Pallikaranai remnant); **blind where it matters** — Velachery lake and the Adyar both read 0%. **[VERIFIED]** So: OSM-led, JRC as support only.
3. **The heightfield itself** — Velachery and Pallikaranai are **not closed basins**; their lowest ground drains to a saddle 1–3 m below the surrounding city, i.e. a polder that only empties when the receiving drain will take it. Segmenting the SRTM surface into level-9 catchments makes that structural, so **water collects there under any rainfall** and sits because the outfall is throttled. **[VERIFIED]**

Layer 3 is the important one: it means burial is modelled, not painted on. A poldered, occluded, low-saddle basin will flood in the simulation even if someone forgets to add the label.

**Burying the lakes gets a water-reappears-once-you-stop animation for free** — rain on a buried lake bed floods it, and the recessed, throttled outfall holds it far longer than its modern street level would suggest.

**HydroBASINS** level-6 puts all of Chennai in one basin (useless); **level-9 separates catchments correctly** (Velachery+Pallikaranai / Tambaram+Kotturpuram / Anna Nagar all distinct). **[VERIFIED]**

### Historical floods — the data is real and citable

The Tamil Nadu government runs the Chennai Flood Monitoring & DSS portal (`chennaifloodmonitor.tn.gov.in`, live). Its layers were captured 2026-09-29 as GeoParquet under `CashlessConsumer/chennai-flood-history`. All verified present:

| Layer | Rows | Content |
|---|---|---|
| GCC flood hotspots 2015 | 327 | **Named streets + depth class** — 38 at >5 ft, 86 at 3–5 ft, 202 <2 ft, with zone/ward |
| GCC flood hotspots NEM 2020 | 53 | Named streets (separate year, so it tests persistence) |
| NRSC satellite flood extent, Dec 2015 | 4,001 | Official national remote-sensing extent — **distinct from UNOSAT and far more city-wide** |
| IRS satellite flood extent, 2005 | 235 | Decadal baseline |
| GCC ward flood depth min/max | 200 | Modelled depth per ward |
| Crowdsourced citizen reports | 173 | Nov/Dec 2025, 1–6 depth scale, geolocated |

UNOSAT also published Sentinel-1 flood extents for 12 Nov and 24 Nov 2015 (HDX, 10 m). **[VERIFIED]**

**UNOSAT is the weakest of the three sources** and should not be the benchmark: it covers essentially the coastal/wetland strip, and the first layer renders as ocean plus a thin shoreline. Its metro cells are 30 m fragments — Pallikaranai gets 233 ha within 2 km, Kotturpuram 42 ha, Chennai Central 0.2 ha. Use it for the marsh, not the city.

**The extents are elevation-consistent**, which is what makes them a calibration target rather than a picture. Comparing 2015 flooded cells with random inland cells: **2.4× more likely to sit at ≤2 m and 1.5× at ≤5 m; under-represented above 10 m**. **[VERIFIED]**

**Validation loop:** the 53 NEM-2020 names are a held-out year — calibrate drain capacity and occlusion on 2015, score on 2020. The 2005 layer is an independent decadal check. Report per-hotspot hit rate, not a single number.

### What "the history matters" should and shouldn't do

- **Should** set drain/sink capacity per catchment from recurring inundation, not guesswork.
- **Should** seed a growth curve — 2005 extent → 2015 327 hotspots → 2020 53 → 2025 crowdsourced — showing the city losing absorbency. A side-by-side "2015 rainfall on 2005 vs today's surface" toggle is the most persuasive thing in the whole app.
- **Should not** be treated as a waterproof benchmark. NRSC and UNOSAT disagree widely, neither is field-validated, and crowd reports are sparse and self-selected. Label it *illustrative* still.

### Two honest gaps

1. **There is no per-building date**, so a true change-detection over built-up epochs needs **GHSL** — ~1.3 GB per global epoch (1975/1980/…/2020), no per-tile spatial index, so expect a download-then-clip step. Cheaper alternative: use documented loss figures per lake as primitives rather than authoring polygons by hand.
2. **Copernicus EMS numbers were not retrievable** behind its new front-end; ReliefWeb's API also rejected our appname. Not blockers, but neither gives us anything we don't already have.

## Open questions for you

1. **Water mode:** precomputed drainage network (fast, ships in days) or a real GPU shallow-water flow? The first shows the *correct* basins but can't reroute; the second is a simulation and can.
2. **Coverage:** Chennai core (Adyar/Velachery/Pallikaranai, 8 × 12 km) or the whole metro?
3. **Rain source:** slider (mm/hr × minutes) or a scenario picker built from the actual Dec 2015 / Oct 2023 rainfall.
4. This machine has **no node** — do I install the Node + Vite stack, or keep it a static HTML/JS app you open in the browser?
