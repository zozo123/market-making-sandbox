// Minimal limit-order book with FIFO matching at each price level.
// Price levels are tracked by integer ticks for stable hashing.

export class OrderBook {
  constructor({ tick = 0.01 } = {}) {
    this.tick = tick;
    this.bids = new Map(); // priceTick -> queue of {id, size}
    this.asks = new Map();
    this.seq = 0;
  }

  _t(p) { return Math.round(p / this.tick); }

  bestBid() {
    let best = null;
    for (const k of this.bids.keys()) if (best === null || k > best) best = k;
    return best === null ? null : best * this.tick;
  }
  bestAsk() {
    let best = null;
    for (const k of this.asks.keys()) if (best === null || k < best) best = k;
    return best === null ? null : best * this.tick;
  }

  depth(price, side) {
    const book = side === 'bid' ? this.bids : this.asks;
    const q = book.get(this._t(price));
    if (!q) return 0;
    let s = 0;
    for (const o of q) s += o.size;
    return s;
  }

  addLimit(side, price, size) {
    const book = side === 'bid' ? this.bids : this.asks;
    const k = this._t(price);
    if (!book.has(k)) book.set(k, []);
    const id = ++this.seq;
    book.get(k).push({ id, size });
    return id;
  }

  cancel(side, price, id) {
    const book = side === 'bid' ? this.bids : this.asks;
    const k = this._t(price);
    const q = book.get(k);
    if (!q) return false;
    const i = q.findIndex((o) => o.id === id);
    if (i < 0) return false;
    q.splice(i, 1);
    if (q.length === 0) book.delete(k);
    return true;
  }

  // Walks one side of the book consuming size. Returns list of fills.
  marketOrder(side, size) {
    // side: 'buy' eats asks, 'sell' eats bids.
    const fills = [];
    const book = side === 'buy' ? this.asks : this.bids;
    const order = side === 'buy'
      ? (a, b) => a - b // ascending
      : (a, b) => b - a; // descending
    const levels = [...book.keys()].sort(order);
    let remaining = size;
    for (const k of levels) {
      if (remaining <= 0) break;
      const q = book.get(k);
      while (q.length && remaining > 0) {
        const o = q[0];
        const take = Math.min(o.size, remaining);
        fills.push({ id: o.id, price: k * this.tick, size: take });
        o.size -= take;
        remaining -= take;
        if (o.size === 0) q.shift();
      }
      if (q.length === 0) book.delete(k);
    }
    return fills;
  }

  // Snapshot for rendering: top-N levels each side, ascending in price for asks, descending for bids.
  snapshot(levels = 10) {
    const sideArr = (book, dir) => {
      const ks = [...book.keys()].sort((a, b) => dir * (a - b));
      const out = [];
      for (const k of ks.slice(0, levels)) {
        let s = 0;
        for (const o of book.get(k)) s += o.size;
        out.push({ price: k * this.tick, size: s });
      }
      return out;
    };
    return { bids: sideArr(this.bids, -1), asks: sideArr(this.asks, 1) };
  }
}
