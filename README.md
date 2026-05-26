# How market makers print money

Citadel Securities. Jane Street. Virtu. Optiver. Hudson River. A handful of electronic market-making firms clear **tens of billions of dollars a year** by quoting both sides of an order book and capturing the spread millions of times a day. In a Trump-era tape that re-prices on every tariff and every Fed leak, the spread machine runs hotter — volatility *is* their revenue.

This is an interactive explainer. 13 live in-browser simulations walk you from the limit order book up through Avellaneda–Stoikov, Glosten–Milgrom, and Kyle's λ. Drag the sliders, watch the order book breathe, the inventory drift, the P&L distribution narrow once you skew.

Live: **https://zozo123.github.io/market-making-sandbox/**

Sibling to [microprice-sandbox](https://github.com/zozo123/microprice-sandbox).

## Sections

1. **The limit order book** — animated LOB with random arrivals/cancels.
2. **The naive market maker** — quote ±δ, capture spread.
3. **Inventory risk** — turn on a Brownian mid; watch the P&L distribution widen.
4. **Skew the quotes** — shift by −γq; inventory mean-reverts.
5. **Spread vs. fill rate** — the U-curve in δ.
6. **Adverse selection** — informed flow drags P&L left.
7. **Avellaneda–Stoikov** — optimal reservation price + δ*; Monte Carlo against the symmetric baseline.
8. **Queue position** — fill rate vs conditional P&L as you sit deeper in the FIFO queue.
9. **Latency** — stale quotes get sniped on jumps.
10. **Hedging** — h* = ρ σ_A / σ_B.
11. **Glosten–Milgrom** — Bayesian sequential trade model.
12. **Kyle's λ** — single-auction price impact.
13. **Microprice** — order-book-imbalance-weighted fair value.

## Stack

Vanilla ES modules + [Plotly.js](https://plotly.com/javascript/) + [KaTeX](https://katex.org/). No backend, no build step. Open `index.html` in a browser (or via any static HTTP server).

```bash
python3 -m http.server 8000
# → http://localhost:8000/
```

## Layout

```
js/
  sim/        pure simulation primitives (rng, orderbook, price flow, AS, GM, Kyle)
  ui/         reusable slider + card helpers
  widgets/    one widget per section (01-orderbook.js ... 13-microprice.js)
  main.js     IntersectionObserver lazy-init
```

Every widget exposes a `Widget` class with `init()` / `destroy()`, mounted as the reader scrolls.

## License

MIT.
