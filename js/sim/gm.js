// Glosten-Milgrom (1985) sequential trade model.
// State: posterior p = Pr(V = V_H).
// Each step: trade is informed with prob alpha; informed buys iff V=V_H, sells iff V=V_L.
// Uninformed buys/sells with prob 1/2.

// Bayesian posterior update after observing a side.
export function posterior(p, side, alpha) {
  // side: +1 = buy from maker (maker hits ask), -1 = sell to maker (maker hits bid).
  // P(buy | V_H) = alpha + (1-alpha)/2 = (1+alpha)/2
  // P(buy | V_L) = (1-alpha)/2
  const pBuyH = (1 + alpha) / 2;
  const pBuyL = (1 - alpha) / 2;
  if (side > 0) {
    const num = p * pBuyH;
    return num / (num + (1 - p) * pBuyL);
  } else {
    const num = p * (1 - pBuyH);
    return num / (num + (1 - p) * (1 - pBuyL));
  }
}

// Zero-profit bid/ask given a posterior p, value bounds [vl, vh], and informed fraction alpha.
// ask = E[V | buy], bid = E[V | sell].
export function bidAsk(p, vl, vh, alpha) {
  const pBuyH = (1 + alpha) / 2;
  const pBuyL = (1 - alpha) / 2;
  // E[V | buy] = (vh*p*pBuyH + vl*(1-p)*pBuyL) / (p*pBuyH + (1-p)*pBuyL)
  const askNum = vh * p * pBuyH + vl * (1 - p) * pBuyL;
  const askDen = p * pBuyH + (1 - p) * pBuyL;
  const bidNum = vh * p * (1 - pBuyH) + vl * (1 - p) * (1 - pBuyL);
  const bidDen = p * (1 - pBuyH) + (1 - p) * (1 - pBuyL);
  return { bid: bidNum / bidDen, ask: askNum / askDen };
}
