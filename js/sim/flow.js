// Order-arrival intensity as a function of distance from mid.
// Classic AS-style: lambda(delta) = A * exp(-k * delta).
export function arrivalIntensity(delta, A = 140, k = 1.5) {
  return A * Math.exp(-k * delta);
}

// Probability of at least one fill on this side during dt at half-spread delta.
export function fillProb(delta, dt, A, k) {
  return 1 - Math.exp(-arrivalIntensity(delta, A, k) * dt);
}
