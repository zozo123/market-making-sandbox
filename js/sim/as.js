// Avellaneda-Stoikov closed-form (Avellaneda & Stoikov 2008).
// All inputs in their natural units; T-t is time remaining.

export function reservationPrice(s, q, gamma, sigma, tau) {
  return s - q * gamma * sigma * sigma * tau;
}

export function optimalHalfSpread(gamma, sigma, tau, k) {
  return 0.5 * gamma * sigma * sigma * tau + (1 / gamma) * Math.log(1 + gamma / k);
}

// Convenience: given current state, return (bid, ask) under AS.
export function asQuotes(s, q, gamma, sigma, tau, k) {
  const r = reservationPrice(s, q, gamma, sigma, tau);
  const half = optimalHalfSpread(gamma, sigma, tau, k);
  return { bid: r - half, ask: r + half, r, half };
}

// Symmetric baseline quotes at fixed half-spread.
export function symmetricQuotes(s, halfSpread) {
  return { bid: s - halfSpread, ask: s + halfSpread, r: s, half: halfSpread };
}
