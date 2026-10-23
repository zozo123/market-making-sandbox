# How market making works: an interactive sandbox

Electronic market makers quote both sides of an order book and earn the spread while managing inventory risk and adverse selection. This interactive explainer is 13 in-browser simulations, from the limit order book to Avellaneda–Stoikov, Glosten–Milgrom, and Kyle's λ. Drag the sliders to see each effect.

Live: **https://zozo123.github.io/market-making-sandbox/**

Sibling to [microprice-sandbox](https://github.com/zozo123/microprice-sandbox).

## Sections

1. **The limit order book** — animated LOB with random arrivals/cancels.
2. **The naive market maker** — quote ±δ, capture spread.
3. **Inventory risk** — turn on a Brownian mid; watch the P&L distribution widen.
4. **Skew the quotes** — shift by −γq; inventory mean-reverts.
5. **Spread vs. fill rate** — P&L vs half-spread δ has an interior (inverted-U) optimum.
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

[MIT](LICENSE) © 2026 Yossi Eliaz.
