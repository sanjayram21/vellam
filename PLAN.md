# Plan — Chennai Monsoon Flood Visualizer

Choices locked: **drainage-network engine** · **whole metro** · **intensity + duration sliders** · **React + TypeScript on Vite**.

Split of concerns: **offline compute is Python** (rasterio/numpy/scipy — the right tools for raster algebra, already installed and verified); **the frontend is TypeScript**. Python emits static `flowdir`/`capacity`/heightfield arrays plus a generated `.d.ts` contract, so the frontend cannot misuse their shapes.

React owns the **shell only** — panel, legend, history toggles. The MapLibre map and the simulation loop stay imperative in refs, because a 60 fps loop driven through React state will drop frames. Honesty note on realism: React does not affect realism — terrain, imagery and shaders do. The cost of this choice is a build step: Vite is required in dev, and builds the static bundle for Phase 5.

## What it will look like

Satellite Chennai in 3D. A control panel with a **rain intensity (0–200 mm/hr)** slider and a **duration (0–360 min)** slider. Press *Start*. Rain streaks and sheet water bloom, the sky darkens, lightning flashes. Water appears first on the lowest ground — Pallikaranai, the Adyar margins, the Velachery lake belt, the low rides along the river — pools, and starts moving **downhill along roads and the Adyar/Cooum channels**, not in circles. Speed control (1×–40×) lets 3 hours run in a few seconds. Stop rain and it drains: **fast near the rivers, very slow in the marsh**. A legend, a depth readout on hover, a restart button.

---

## Phase 0 — Data prep (offline, once)

- Acquire SRTM N12/N13 × E079/E080, void-fill to sea, mosaic, warp to Web Mercator.
- Resample to a **4096² Metro heightfield** (~8 m/cell) → Terrarium PNG for MapLibre terrain and float array for the sim.
- Microsoft Building Footprints for the metro's z13 tiles → rasterize to an **occluder mask** (buildings block flow, don't add height).
- Cache **Esri World Imagery z13–z16** for the metro to disk; z17–z18 fetched live on zoom.
- **Catchments:** clip HydroBASINS level-9 polygons to the metro, rasterize to a catchment-id layer; no cell may straddle two.
- **Verifiable exit:** heightfield opens in MapLibre as terrain; Adyar and all four river channels are visible as lines in a flow-accumulation render; every hotspot falls in exactly one catchment.

## Phase 0b — Buried lakes

- Pull OSM `natural=water` / `wetland` / `landuse=reservoir,basin` / `waterway` from the TN extract; clip to the metro; keep `name`.
- Cross-reference JRC occurrence for the large permanent bodies only.
- For each documented buried lake (Velachery, Pallikaranai, the 31 lost Pallikaranai-catchment lakes), author a **former-extent polygon** from the documented loss figures and OSM remnants.
- Bake per-catchment: **saddle elevation** (lowest ground out of the polder) and **outfall throttling**. A buried-lake catchment gets a depth floor and a slow outfall.
- Flag OSM-present water as *existing* and authored polygons as *former/buried*; map them differently.
- **Verifiable exit:** with zero rain, a buried-lake catchment visibly drains near-empty and slowly; with rain, it fills before its neighbours. Velachery floods under any preset — as it does in life.

## Phase 0c — Historical calibration set

- Import GCC hotspots 2015 (327, with depth class) and NEM 2020 (53), NRSC 2015 extent, IRS 2005 extent, ward depths.
- Reproject to the heightfield grid. **Split: calibrate on 2015, score on 2020**, keep 2005 as a decadal check.
- Score = per-hotspot hit rate (is a listed hotspot wet ≥ its depth class?) and false-positive rate on random dry cells.
- Emit a checked-in calibration report; the app shows it.
- **Verifiable exit:** ≥70% hit rate on the 2020 held-out list, and a *static* 250 mm/day run reproduces the documented "buried lakes flood first" ordering.

## Phase 1 — Map shell

- MapLibre GL + self-hosted tile server (simple static file + tiny CORS server), terrain on, pitch 60°, imagery layer, river/waterbody overlay from OSM (Geofabrik extract, since Overpass doesn't reach us), attribution (Esri / © OpenStreetMap contributors) and building data credit.
- **Exit:** smooth zoom/pan across the metro at 60 fps, terrain crisp at z18.

## Phase 2 — Drainage network (offline compute)

- Priority-flood depression filling; D8 flow direction; flow accumulation; per-cell **sink capacity** from drain + river proximity (Adyar and Cooum get high capacity, Pallikaranai/Velachery very low).
- Output: `flowdir.u8`, `accumulation.f32`, `capacity.u8` arrays.
- **Exit:** a static *final* flood extent at 50 mm/hr matches the known 2023 hotspots (Pallikaranai, Velachery) by eye.

## Phase 3 — Simulation loop

- Water balance per cell: `in = rain·dt·infiltration`, `out = min(water, capacity·dt + buried-lake outfall)` routed strictly along `flowdir`, plus evaporation. Water depth and flux written into a GPU texture.
- **Exit:** 3 simulated hours complete in under 5 s at 40×; water only ever reaches low ground; recession is visibly slower in the marsh.

## Phase 3b — Calibration run

- Drive the model with the actual 2015 and NEM-2020 rainfall series, score against the held-out hotspot lists, tune infiltration / capacity / outfall constants per catchment.
- Commit the resulting constant table and the calibration report to the repo.
- **Exit:** Phase 0c threshold met, and no single catchment is tuned so hard that the 2005 check degrades.

## Phase 4 — Water + rain rendering (the look)

- Water layer: depth → colour ramp, Fresnel sheen, specular streaks modulated by rain intensity.
- Rain: instanced screen-space streaks, intensity-driven density; darkening tone map; lightning flashes; puddle agitation.
- UI polish: panel, legend, time scrubber, reset.
- **Buried-lake rendering:** former lake beds get a distinct tint that the water fills over, so a "reclaimed" area reads as one.
- **History mode:** toggle the 2005 / 2015 / 2020 / 2025 extents and hotspot dots over the terrain; a "2015 rainfall on 2005 city vs today" comparison.
- **Exit:** looks like a storm, not a spreadsheet; a viewer can tell a buried lake bed from a modern colony without a legend.

## Phase 5 — Offline package

- `vite build` to a static bundle, manifest + local static server; everything runs with the network unplugged; cached tiles; no key required. React stays in the bundle, so Phase 5 must confirm the build output has no dev-server dependency.

---

## Compute budget

- Heightfield 64 MB; occlusion/capacity arrays small. GTX 1650 (4 GB) has room for a sparse view of the metro.
- Priority-flood on 16.7 M cells in Python is minutes, not seconds — acceptable, it's a one-off offline step. If too slow, try a `richdem` wheel; if that fails on Python 3.8, keep the heap version.
- z13–z16 metro imagery ≈ 2 GB. Disk has 42 GB.

## Language split

Offline compute in Python; frontend in TypeScript on React + Vite. The shared contract is the emitted arrays plus a hand-checked `.d.ts`. Both halves must agree on grid size, origin, orientation and units (metres, row-major, north-up, y increasing south) — a mismatch here silently renders the map mirrored rather than failing, so the heightfield round-trip is the first test written in Phase 0.

## Known risks

- **Buried-lake polygons are partly authored.** The loss is documented in hectares per lake but not as geometry; the former extents are a reconstruction, so treat their edges as approximate.
- **History sources disagree.** UNOSAT's 2015 layer is a coastal-strip product; NRSC's is city-wide. Calibrate to NRSC, use UNOSAT only for the marsh.
- **The official portal can change or drop layers** — it was captured 2026-09-29, so keep the local parquet copies and re-pull only via an explicit request.

- **No Overpass** — use a Geofabrik OSM extract for rivers, waterbodies, roads.
- **No DMA(s)/drain network ground truth** — capacities are estimates; label the app *illustrative*.
- **SRTM's 30 m cells can't resolve 5–10 m gullies** — some roads will flood as bands. Buildings occluding flow compensates a lot.
- **FABDEM retry** — better ground surface than SRTM if its host serves us; fetch attempt is cheap.

## Licensing

Esri World Imagery © Esri/Maxar; SRTM public domain; MS Buildings ODbL; OSM ODbL (roads, rivers, water); HydroBASINS CC-BY (WWF); JRC surface water free use. **The flood history layers are Tamil Nadu government data redistributed under unstated terms** — attribute the Chennai Flood Monitoring & DSS portal and cite the capture. All credit on screen; Metro heightfield is a derived work, fine to keep local.

Want me to start Phase 0, or adjust scope first?
