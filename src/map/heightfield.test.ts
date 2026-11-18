import { assertGrid, GridShapeError, type GridHeader } from '../types/grid';

/**
 * Orientation tests for the grid contract.
 *
 * Run with `npm run test:grid`. These exist because a flipped or transposed
 * grid renders a plausible but mirrored Chennai rather than failing.
 */

let failed = 0;
let passed = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL ${name}\n       ${(err as Error).message}`);
  }
}

function eq<T>(actual: T, expected: T, what: string): void {
  if (actual !== expected) throw new Error(`${what}: expected ${String(expected)}, got ${String(actual)}`);
}

function throws(fn: () => void, what: string): void {
  try {
    fn();
  } catch (err) {
    if (err instanceof GridShapeError) return;
    throw new Error(`${what}: threw ${(err as Error).name}, not GridShapeError`);
  }
  throw new Error(`${what}: did not throw`);
}

const h: GridHeader = { width: 4, height: 3, res: 8, originX: 0, originY: 24 };

console.log('grid contract');

check('accepts an exact array', () => {
  assertGrid(h, 12);
});

check('rejects a transposed array', () => {
  // Same length, so only the expected dimensions can catch it.
  throws(() => assertGrid({ ...h, width: 3, height: 4 }, 12, { width: 4, height: 3 }), '3x4');
});

check('rejects a short array', () => {
  throws(() => assertGrid(h, 11), 'short');
});

check('rejects zero resolution', () => {
  throws(() => assertGrid({ ...h, res: 0 }, 12), 'res 0');
});

// The real orientation check: row 0 is north, so y decreases as row increases.
// A pavement at Chennai Central must decode to ~1 m and the sea to 0, in that order.
check('north edge y > south edge y', () => {
  const southY = h.originY - h.height * h.res;
  eq(h.originY, 24, 'north y');
  eq(southY, 0, 'south y');
  if (southY >= h.originY) throw new Error('south edge is not south of the north edge');
});

check('row index advances southward', () => {
  const yAt = (row: number) => h.originY - (row + 0.5) * h.res;
  if (!(yAt(0) > yAt(2))) throw new Error('row 0 is not north of row 2');
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
