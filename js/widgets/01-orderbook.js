// Section 1: live limit order book.
import { OrderBook } from '../sim/orderbook.js';
import { mulberry32, exp as expRng } from '../sim/rng.js';
import { abmStep } from '../sim/price.js';
import { makeSlider, makeReadout, makeButton } from '../ui/slider.js';
import { $controls, $viz } from '../ui/card.js';

export default class OrderBookWidget {
  constructor(section) {
    this.section = section;
    this.book = new OrderBook({ tick: 0.01 });
    this.mid = 100;
    this.rng = mulberry32(42);
    this.params = { arrival: 8, mktRate: 1.2, vol: 0.4 };
  }

  init() {
    const controls = $controls(this.section);
    const viz = $viz(this.section);

    const s1 = makeSlider({
      label: 'limit arrival rate (orders / s)', min: 1, max: 30, step: 1, value: this.params.arrival,
      format: (v) => v.toFixed(0),
      onChange: (v) => { this.params.arrival = v; },
    });
    const s2 = makeSlider({
      label: 'market order rate (orders / s)', min: 0.1, max: 6, step: 0.1, value: this.params.mktRate,
      format: (v) => v.toFixed(1),
      onChange: (v) => { this.params.mktRate = v; },
    });
    const s3 = makeSlider({
      label: 'price volatility σ', min: 0, max: 2, step: 0.05, value: this.params.vol,
      format: (v) => v.toFixed(2),
      onChange: (v) => { this.params.vol = v; },
    });

    this.readout = makeReadout([
      { key: 'best bid',   value: '—', cls: 'bid' },
      { key: 'best ask',   value: '—', cls: 'ask' },
      { key: 'mid',        value: '—' },
      { key: 'microprice', value: '—' },
      { key: 'spread',     value: '—' },
      { key: 'imbalance',  value: '—' },
    ]);

    const resetBtn = makeButton('reset book', () => this.seed());

    controls.appendChild(s1.el);
    controls.appendChild(s2.el);
    controls.appendChild(s3.el);
    controls.appendChild(this.readout.el);
    controls.appendChild(resetBtn);

    // Canvas
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '380px';
    viz.appendChild(canvas);
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.seed();
    this.lastT = performance.now();
    this.frame();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = rect.width;
    this.h = rect.height;
  }

  seed() {
    this.book = new OrderBook({ tick: 0.01 });
    this.mid = 100;
    const levels = 12;
    for (let i = 1; i <= levels; i++) {
      const sz = Math.floor(20 + 80 * Math.random() * (1 - i / (levels + 2)));
      this.book.addLimit('bid', this.mid - i * 0.01, sz);
      this.book.addLimit('ask', this.mid + i * 0.01, sz);
    }
  }

  step(dt) {
    // 1. drift mid
    this.mid = abmStep(this.mid, this.params.vol, dt, this.rng);

    // 2. limit arrivals: Poisson(arrival * dt). Distribute around mid by exponential-ish offset.
    const nAdds = Math.floor(this.params.arrival * dt) + (Math.random() < (this.params.arrival * dt) % 1 ? 1 : 0);
    for (let i = 0; i < nAdds; i++) {
      const side = Math.random() < 0.5 ? 'bid' : 'ask';
      const offsetTicks = 1 + Math.floor(expRng(this.rng, 0.35));
      const price = side === 'bid' ? this.mid - offsetTicks * 0.01 : this.mid + offsetTicks * 0.01;
      const size = Math.floor(10 + 80 * Math.random());
      this.book.addLimit(side, price, size);
    }

    // 3. market orders consume best
    const nMkt = Math.floor(this.params.mktRate * dt) + (Math.random() < (this.params.mktRate * dt) % 1 ? 1 : 0);
    for (let i = 0; i < nMkt; i++) {
      const side = Math.random() < 0.5 ? 'buy' : 'sell';
      this.book.marketOrder(side, 20 + Math.floor(60 * Math.random()));
    }

    // 4. random cancels: thin tails
    for (const [, q] of this.book.bids) {
      if (q.length && Math.random() < 0.05 * dt * 10) q.pop();
    }
    for (const [, q] of this.book.asks) {
      if (q.length && Math.random() < 0.05 * dt * 10) q.pop();
    }

    // 5. if book gets too thin, repopulate so the demo never empties
    if (this.book.snapshot(3).bids.length < 3) {
      for (let i = 1; i <= 5; i++) this.book.addLimit('bid', this.mid - i * 0.01, 30 + Math.floor(40 * Math.random()));
    }
    if (this.book.snapshot(3).asks.length < 3) {
      for (let i = 1; i <= 5; i++) this.book.addLimit('ask', this.mid + i * 0.01, 30 + Math.floor(40 * Math.random()));
    }
  }

  render() {
    const { ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);
    const snap = this.book.snapshot(14);
    const bestBid = this.book.bestBid();
    const bestAsk = this.book.bestAsk();
    const bidTop = snap.bids[0]?.size ?? 0;
    const askTop = snap.asks[0]?.size ?? 0;
    const mid = (bestBid != null && bestAsk != null) ? (bestBid + bestAsk) / 2 : this.mid;
    const I = bidTop + askTop > 0 ? bidTop / (bidTop + askTop) : 0.5;
    const micro = (bestBid != null && bestAsk != null) ? bestAsk * I + bestBid * (1 - I) : mid;
    const spread = (bestBid != null && bestAsk != null) ? bestAsk - bestBid : 0;

    this.readout.set('best bid', bestBid?.toFixed(2) ?? '—');
    this.readout.set('best ask', bestAsk?.toFixed(2) ?? '—');
    this.readout.set('mid', mid.toFixed(3));
    this.readout.set('microprice', micro.toFixed(3));
    this.readout.set('spread', (spread * 100).toFixed(1) + ' bp');
    this.readout.set('imbalance', I.toFixed(2), I > 0.55 ? 'v bid' : (I < 0.45 ? 'v ask' : 'v'));

    const maxSz = Math.max(
      ...snap.bids.map((l) => l.size),
      ...snap.asks.map((l) => l.size),
      1
    );

    const cx = w / 2;
    const rowH = Math.min(14, (h - 60) / 28);
    const padTop = 16;
    const midY = padTop + 14 * rowH;

    // mid line
    ctx.strokeStyle = '#2f3b50';
    ctx.beginPath(); ctx.moveTo(0, midY); ctx.lineTo(w, midY); ctx.stroke();

    // asks (above)
    ctx.font = '11px ui-monospace, Menlo, monospace';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < snap.asks.length; i++) {
      const lvl = snap.asks[i];
      const y = midY - (i + 1) * rowH;
      const barW = (lvl.size / maxSz) * (w / 2 - 80);
      ctx.fillStyle = 'rgba(251,113,133,0.18)';
      ctx.fillRect(cx, y - rowH / 2 + 1, barW, rowH - 2);
      ctx.fillStyle = '#fb7185';
      ctx.textAlign = 'left';
      ctx.fillText(lvl.price.toFixed(2), cx + 6, y);
      ctx.fillStyle = '#8b97ad';
      ctx.textAlign = 'right';
      ctx.fillText(String(lvl.size), w - 6, y);
    }

    // bids (below)
    for (let i = 0; i < snap.bids.length; i++) {
      const lvl = snap.bids[i];
      const y = midY + (i + 1) * rowH;
      const barW = (lvl.size / maxSz) * (w / 2 - 80);
      ctx.fillStyle = 'rgba(45,212,191,0.18)';
      ctx.fillRect(cx - barW, y - rowH / 2 + 1, barW, rowH - 2);
      ctx.fillStyle = '#2dd4bf';
      ctx.textAlign = 'right';
      ctx.fillText(lvl.price.toFixed(2), cx - 6, y);
      ctx.fillStyle = '#8b97ad';
      ctx.textAlign = 'left';
      ctx.fillText(String(lvl.size), 6, y);
    }

    // mid label
    ctx.fillStyle = '#d8e0ee';
    ctx.textAlign = 'center';
    ctx.fillText(`mid ${mid.toFixed(2)}    μ ${micro.toFixed(3)}    spread ${(spread * 100).toFixed(1)}bp`, cx, midY);
  }

  frame = () => {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastT) / 1000);
    this.lastT = now;
    this.step(dt);
    this.render();
    this._raf = requestAnimationFrame(this.frame);
  }

  destroy() { if (this._raf) cancelAnimationFrame(this._raf); }
}
