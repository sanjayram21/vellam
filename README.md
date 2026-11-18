# Chennai Monsoon Flood Visualizer

An interactive 3D satellite map of Chennai that simulates October–December monsoon flooding in sped-up time, shows which neighbourhoods flood first and why, and lets the water recede.

Illustrative, not a calibrated engineering model — see [RESEARCH.md](RESEARCH.md) for what it is and is not.

> **Note:** the `flood_extents/` filenames in the dataset README use a different prefix from the files themselves — use the on-disk names (`nrsc_flood_extent_2015.parquet`, `hotspots_gcc_nem2020.parquet`, …).

## Documents

- [RESEARCH.md](RESEARCH.md) — feasibility research: map stack, elevation sources, water engine, buried lakes, historical flood data. Includes what was tried and rejected.
- [PLAN.md](PLAN.md) — the phased build plan, with a verifiable exit criterion per phase.

## Key decisions

| | |
|---|---|
| Elevation | SRTM 30 m **bare-earth** (Copernicus DSM reads 5–10 m too high over a 1–25 m city) |
| Buildings | Microsoft Building Footprints as a flow **occluder**, not as height |
| Water | Precomputed drainage network — priority-flood sinks, D8 routing, per-catchment capacity |
| Buried lakes | Poldered catchments with throttled outfalls; burial is modelled, not labelled |
| Calibration | Official GCC 2015 hotspots; NEM-2020 held out as the test year |
| Map | MapLibre GL JS + Esri World Imagery, self-hosted DEM tiles |
| Frontend | React + TypeScript on Vite; sim and MapLibre imperative behind refs |
| Offline compute | Python (rasterio, numpy, scipy) — writes static arrays the frontend consumes |
| Output | Vite builds a static bundle; still opens offline with no server-side code |

## Data

Downloaded at build time, not committed. See `PLAN.md` Phase 0 for sources and licensing.

## Status

Planning. No application code yet.
