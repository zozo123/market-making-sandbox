import { randn } from './rng.js';

// One step of arithmetic Brownian motion: s_{t+1} = s_t + sigma * sqrt(dt) * Z.
export function abmStep(s, sigma, dt, rng) {
  return s + sigma * Math.sqrt(dt) * randn(rng);
}

// Geometric BM step.
export function gbmStep(s, mu, sigma, dt, rng) {
  const z = randn(rng);
  return s * Math.exp((mu - 0.5 * sigma * sigma) * dt + sigma * Math.sqrt(dt) * z);
}

// Ornstein-Uhlenbeck step: dx = theta(mu - x)dt + sigma dW.
export function ouStep(x, theta, mu, sigma, dt, rng) {
  return x + theta * (mu - x) * dt + sigma * Math.sqrt(dt) * randn(rng);
}

// Jump-diffusion: ABM plus a compound Poisson with rate lambda, jump size ~ N(0, jumpSigma).
export function jumpStep(s, sigma, dt, lambda, jumpSigma, rng) {
  let next = abmStep(s, sigma, dt, rng);
  const p = 1 - Math.exp(-lambda * dt);
  if (rng() < p) next += jumpSigma * randn(rng);
  return next;
}
