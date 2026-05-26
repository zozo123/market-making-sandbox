// Mulberry32: tiny seedable RNG. Returns a function ()->[0,1).
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Standard normal via Box-Muller, consuming two uniforms per call.
export function randn(rng) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Exponential with rate lambda.
export function exp(rng, lambda) {
  return -Math.log(1 - rng()) / lambda;
}

// Bernoulli.
export function bern(rng, p) {
  return rng() < p ? 1 : 0;
}
