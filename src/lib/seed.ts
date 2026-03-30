// djb2 string hash — maps any string to a uint32 suitable as a PRNG seed.
// Uses >>> 0 at each step to stay in unsigned 32-bit range.
export function hashSeed(seed: string): number {
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}
