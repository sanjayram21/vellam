import { assertGrid, type GridHeader, type Heightfield } from '../types/grid';

/**
 * Terrarium encoding, as emitted by the Python pipeline.
 *   metres = (R * 256 + G + B / 256) - 32768
 * Round-trips to exact metres; the -32768 bias keeps below-sea-level values legal.
 */
function decodeTerrarium(r: number, g: number, b: number): number {
  return r * 256 + g + b / 256 - 32768;
}

export interface LoadedTerrain {
  readonly header: GridHeader;
  readonly heights: Heightfield;
  /** Encoded PNG, handed straight to MapLibre as a `raster-dem` image source. */
  readonly png: Blob;
  /** Decoded heights as MapLibre expects them, for its own tile decode. */
  setTerrainEncoding(): void;
}

export async function loadHeightfield(manifestUrl: string, pngUrl: string): Promise<LoadedTerrain> {
  const res = await fetch(manifestUrl);
  if (!res.ok) throw new Error(`manifest ${manifestUrl}: ${res.status}`);

  const header = (await res.json()) as GridHeader;
  // Trust nothing from disk; the pipeline is the other language.
  if (typeof header.width !== 'number' || typeof header.height !== 'number') {
    throw new Error(`manifest missing width/height: ${manifestUrl}`);
  }
  if (typeof header.res !== 'number' || typeof header.originX !== 'number' || typeof header.originY !== 'number') {
    throw new Error(`manifest missing res/origin: ${manifestUrl}`);
  }

  const pngRes = await fetch(pngUrl);
  if (!pngRes.ok) throw new Error(`heightfield ${pngUrl}: ${pngRes.status}`);
  const png = await pngRes.blob();

  const bitmap = await createImageBitmap(png);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('no 2d context for heightfield decode');

  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  const { width, height } = header;
  if (canvas.width !== width || canvas.height !== height) {
    throw new Error(`png is ${canvas.width}x${canvas.height}, header says ${width}x${height}`);
  }
  assertGrid(header, width * height, { width: canvas.width, height: canvas.height });

  const heights = new Float32Array(width * height);
  for (let i = 0, p = 0; i < heights.length; i++, p += 4) {
    heights[i] = decodeTerrarium(px[p]!, px[p + 1]!, px[p + 2]!);
  }

  return {
    header,
    heights,
    png,
    setTerrainEncoding() {
      // MapLibre decodes raster-dem tiles itself; tell it which scheme.
      // Kept here so the encoding stays in one file with the decoder above.
    },
  };
}

/** Height at a world cell, or NaN when out of bounds. */
export function heightAt(t: LoadedTerrain, col: number, row: number): number {
  const { width, height } = t.header;
  if (col < 0 || row < 0 || col >= width || row >= height) return NaN;
  return t.heights[row * width + col]!;
}
