# Build checklist

Work top to bottom. **An item is done only when its test passes** — tick it, then move on.
Never tick an item whose test is red or unwritten. `PLAN.md` has the *why* for each phase; this file has the *what next*.

Legend: `[ ]` open · `[x]` done · `[!]` blocked on the user

Commands (Node comes from nvm; the stale Windows node is unusable — see NEXT.md):

```
export PATH="$HOME/.nvm/versions/node/v22.23.5/bin:$PATH"
npm run typecheck && npm run test
```

---

## Phase 0 — Scaffold  ✅

- [x] Vite + React + TS project builds · `test: scaffold typechecks` (`npm run typecheck` clean)
- [x] Grid contract with north-up orientation and Web Mercator bounds · `test: rejection cases in src/map/heightfield.test.ts`
- [x] Transposition is caught, not just length · `test: "rejects a transposed array"`
- [x] Dev server reachable from Windows Chrome · `test: curl localhost:5173 returns 200`

## Phase 0a — Elevation

- [ ] Fetch SRTM N12/N13 × E079/E080 from Skadi · `test: 4 non-empty .hgt.gz, each exactly 2884802 bytes gzipped-out`
- [ ] Verify blocks decode as big-endian int16 and Chennai cell heights are sane · `test: Chennai Central ≈1 m ±3, T. Nagar ≈5 m ±3, Tambaram ≈17 m ±5`
- [ ] Void-fill sea to 0, mosaic the 4 blocks, warp to EPSG:3857 · `test: output bounds cover the metro; no NaN; sea samples == 0`
- [ ] Resample to 4096² @8 m · `test: array is exactly 16777216 long`
- [ ] Encode Terrarium PNG · `test: decode(encode(x)) == x for a random sample`
- [ ] Write `manifest.json` alongside the PNG · `test: manifest w/h/res/origin match the array`
- [ ] **Exit:** heightfield opens in MapLibre as terrain; Adyar plus all four rivers visible in a flow-accumulation render · `test: manual — screenshot`

## Phase 0b — Buildings and catchments

- [ ] Microsoft Building Footprints for metro z13 tiles → GeoJSONSeq · `test: file non-empty, feature count > 100k`
- [ ] Rasterize footprints to an occluder mask at grid resolution · `test: mask length == heightfield length; T. Nagar dense built-up reads >50% occluded, Pallikaranai marsh <10%`
- [ ] Clip HydroBASINS L9 to the metro and rasterize catchment ids · `test: every cell has exactly one id; ≥20 distinct catchments`
- [ ] Assert Pallikaranai and Velachery land in the one documented basin `4090028490` · `test: cell at both lakes returns that id`

## Phase 0c — Buried lakes

- [ ] OSM water features clipped, named ones kept · `test: Velachery, Pallikaranai and Madipakkam present by name`
- [ ] Former-extent polygons authored for the three documented lakes · `test: each has area within ±40% of its documented loss figure`
- [ ] Saddle elevation and throttled outfall per buried-lake catchment · `test: with zero rain, a buried catchment drains near-empty and slowly; with rain it fills before its neighbours`
- [ ] **Exit:** Velachery floods under every preset · `test: hit at 3 intensities × 3 durations`

## Phase 0d — Historical calibration set

- [ ] Import the parquet layers using **on-disk** filenames · `test: 327 rows GCC 2015, 53 rows NEM 2020, 4001 rows NRSC 2015`
- [ ] Reproject hotspots to grid cells · `test: ≥95% of rows land inside the grid`
- [ ] Scorer: per-hotspot hit rate + false-positive rate on random dry cells · `test: perfect prediction scores 100%, inverted scores 0%`
- [ ] **Exit:** ≥70% hit rate on held-out NEM 2020; 2015-only calibration reproduces "buried lakes first" ordering · `test: score run, report committed`

## Phase 1 — Map shell

- [ ] MapLibre at pitch 60°, self-hosted terrain, Esri imagery, attribution · `test: manual — attribution string visible`
- [ ] Static + CORS tile server · `test: tile fetch from the page returns 200 with an image content-type`
- [ ] Perf: sustained 60 fps across the metro at z18 · `test: fps overlay ≥55 over a 30 s pan`

## Phase 2 — Drainage network

- [ ] Priority-flood depression fill, D8 direction, accumulation · `test: synthetic cone gives radial outward flow, and a pit with one outlet routes only through it`
- [ ] Capacity from drain/river proximity · `test: Adyar cells > Pallikaranai cells`
- [ ] **Exit:** static 50 mm/hr extent matches known 2023 hotspots · `test: manual — Pallikaranai and Velachery wet`

## Phase 3 — Simulation

- [ ] Water balance with infiltration, capacity caps, outfall throttling · `test: mass in == mass out + stored, to 1e-4`
- [ ] **Exit:** 3 h at 40× under 5 s; recession slower in marsh than on the river · `test: timing assert + recession comparison`

## Phase 3b — Calibration run

- [ ] Drive with real 2015 and NEM-2020 rainfall; tune per catchment · `test: 2020 hit rate ≥70%, 2005 check not degraded`
- [ ] Commit constants table + calibration report · `test: files present, report matches a fresh run`

## Phase 4 — Look

- [ ] Depth ramp, Fresnel, rain streaks, tone map, lightning · `test: manual — review screenshots`
- [ ] Legend, scrubber, reset, history toggle · `test: each control changes state`
- [ ] **Exit:** a viewer can tell a buried lake bed from a modern colony without the legend · `test: manual`

## Phase 5 — Offline package

- [ ] `vite build`, everything cached, no network needed · `test: load with network disabled; console clean`
- [ ] **Exit:** full app runs from `dist/` over `python3 -m http.server` · `test: manual — all phases still work offline`
