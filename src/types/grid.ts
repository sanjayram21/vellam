/**
 * Contract between the Python offline pipeline and the frontend.
 *
 * Every array the pipeline emits carries this header. A mismatch does not throw
 * at runtime — it silently renders the metro mirrored or offset — so both halves
 * validate against `assertGrid` before use.
 *
 * Conventions, non-negotiable:
 *   - row-major, rows run north (row 0) to south
 *   - Web Mercator metres, EPSG:3857, at `res` metres per cell
 *   - elevations and depths in metres, sea level = 0, land = positive
 *   - `data` is exactly `width * height` long
 */
export interface GridHeader {
  readonly width: number;
  readonly height: number;
  /** Web Mercator metres per cell. 8 for the 4096² metro heightfield. */
  readonly res: number;
  /** Web Mercator x of the west edge, in metres. */
  readonly originX: number;
  /** Web Mercator y of the *north* edge, in metres. */
  readonly originY: number;
}

export interface ArrayMeta extends GridHeader {
  /** Which pipeline pass produced this array, for provenance in the UI. */
  readonly layer: 'height' | 'occluder' | 'catchment' | 'flowdir' | 'accumulation' | 'capacity';
  readonly source: string;
  readonly generated: string;
}

export type Heightfield = Float32Array;
export type OccluderMask = Uint8Array;
export type CatchmentId = Uint32Array;
export type FlowDir = Uint8Array;
export type Accumulation = Float32Array;
export type Capacity = Uint8Array;

/** World cell → flat array index. Callers must bounds-check first. */
export function cellIndex(h: GridHeader, col: number, row: number): number {
  return row * h.width + col;
}

/** D8 neighbours in clockwise order from north, matching the flowdir byte values. */
export const D8_DCOL = [0, 1, 1, 1, 0, -1, -1, -1] as const;
export const D8_DROW = [-1, -1, 0, 1, 1, 1, 0, -1] as const;

export class GridShapeError extends Error {}

/**
 * Validate a header against its payload. `len` alone cannot catch a transposed
 * grid (w*h is invariant under it), so pass `expect` when the true dimensions
 * are known — the PNG size, or the manifest the data came with.
 */
export function assertGrid(h: GridHeader, len: number, expect?: { width: number; height: number }): void {
  const { width, height, res } = h;
  if (expect && (width !== expect.width || height !== expect.height)) {
    throw new GridShapeError(`grid is ${width}x${height}, expected ${expect.width}x${expect.height}`);
  }
  if (!Number.isInteger(width) || width <= 0) throw new GridShapeError(`bad width ${width}`);
  if (!Number.isInteger(height) || height <= 0) throw new GridShapeError(`bad height ${height}`);
  if (!(res > 0)) throw new GridShapeError(`bad res ${res}`);
  if (len !== width * height) {
    throw new GridShapeError(`array is ${len}, grid is ${width}x${height} = ${width * height}`);
  }
  if (h.originX + width * res > 20_037_508) {
    throw new GridShapeError('grid runs past the Web Mercator east limit');
  }
  if (h.originY - height * res < -20_037_508) {
    throw new GridShapeError('grid runs past the Web Mercator south limit');
  }
}
