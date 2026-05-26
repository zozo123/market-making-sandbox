// Kyle (1985) single-auction model.
// V ~ N(mu, sigma_v^2), noise demand u ~ N(0, sigma_u^2), informed demand x = beta*(V-mu).
// Competitive maker prices p = mu + lambda * y where y = x + u.

export function kyleLambda(sigmaV, sigmaU) {
  return sigmaV / (2 * sigmaU);
}

export function kyleBeta(sigmaV, sigmaU) {
  return sigmaU / sigmaV;
}

// Price impact for a given net order flow y.
export function priceImpact(y, sigmaV, sigmaU, mu = 0) {
  return mu + kyleLambda(sigmaV, sigmaU) * y;
}
