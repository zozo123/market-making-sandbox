// Section 2: naive market maker. Constant mid, symmetric quotes, Poisson fills.
import { mulberry32 } from '../sim/rng.js';
import { arrivalIntensity } from '../sim/flow.js';
import { makeSlider, makeReadout, makeButton } from '../ui/slider.js';
import { $controls, $viz, plotlyTheme, plotlyConfig } from '../ui/card.js';

export default class NaiveMM {
  constructor(section) { this.section = section; }

  init() {
    const controls = $controls(this.section);
    const viz = $viz(this.section);

    this.params = { halfSpread: 0.5, A: 140, k: 1.5, dt: 0.01 };
    this.state = { t: 0, pnl: 0, fills: 0, inv: 0 };
    this.rng = mulberry32(1);
    this.history = { t: [0], pnl: [0], inv: [0] };
    this.mid = 100;

    const s1 = makeSlider({
      label: 'half-spread δ (price units)', min: 0.05, max: 2, step: 0.05, value: this.params.halfSpread,
      format: (v) => v.toFixed(2),
      onChange: (v) => { this.params.halfSpread = v; },
    });
    const s2 = makeSlider({
      label: 'flow intensity A (orders/s at the touch)', min: 20, max: 400, step: 10, value: this.params.A,
      format: (v) => v.toFixed(0),
      onChange: (v) => { this.params.A = v; },
    });
    const s3 = makeSlider({
      label: 'fill-decay k (1 / price unit)', min: 0.3, max: 5, step: 0.1, value: this.params.k,
      format: (v) => v.toFixed(1),
      onChange: (v) => { this.params.k = v; },
    });

    this.readout = makeReadout([
      { key: 'cum P&L',    value: '0.00', cls: 'good' },
      { key: 'fills',      value: '0' },
      { key: 'avg /fill',  value: '0.000' },
      { key: 'inventory',  value: '0' },
    ]);

    const resetBtn = makeButton('reset', () => this.reset());

    controls.appendChild(s1.el);
    controls.appendChild(s2.el);
    controls.appendChild(s3.el);
    controls.appendChild(this.readout.el);
    controls.appendChild(resetBtn);

    const plotEl = document.createElement('div');
    plotEl.className = 'plot';
    plotEl.style.height = '320px';
    viz.appendChild(plotEl);
    this.plotEl = plotEl;

    Plotly.newPlot(plotEl, [
      { x: [0], y: [0], type: 'scatter', mode: 'lines', line: { color: '#2dd4bf', width: 2 }, name: 'P&L' },
    ], plotlyTheme({ yaxis: { gridcolor: '#232c3b', title: 'cum P&L', titlefont: { size: 11 } }, xaxis: { gridcolor: '#232c3b', title: 't (s)', titlefont: { size: 11 } } }), plotlyConfig);

    this.lastT = performance.now();
    this.frame();
  }

  reset() {
    this.state = { t: 0, pnl: 0, fills: 0, inv: 0 };
    this.history = { t: [0], pnl: [0], inv: [0] };
    Plotly.restyle(this.plotEl, { x: [[0]], y: [[0]] });
  }

  step(dt) {
    const { halfSpread, A, k } = this.params;
    // intensities at half-spread δ
    const lam = arrivalIntensity(halfSpread, A, k); // per side
    // Prob of a fill on each side in this dt
    const pBuyHitsAsk = 1 - Math.exp(-lam * dt);  // someone buys -> we sell at ask
    const pSellHitsBid = 1 - Math.exp(-lam * dt); // someone sells -> we buy at bid

    if (this.rng() < pBuyHitsAsk) {
      this.state.pnl += halfSpread; // we sell at mid + δ; closing later at mid yields δ
      this.state.fills++;
      this.state.inv -= 1;
    }
    if (this.rng() < pSellHitsBid) {
      this.state.pnl += halfSpread;
      this.state.fills++;
      this.state.inv += 1;
    }
    this.state.t += dt;
  }

  frame = () => {
    const now = performance.now();
    const elapsed = Math.min(0.25, (now - this.lastT) / 1000);
    this.lastT = now;
    const subSteps = 20;
    const sdt = elapsed / subSteps;
    for (let i = 0; i < subSteps; i++) this.step(sdt);

    this.history.t.push(this.state.t);
    this.history.pnl.push(this.state.pnl);
    this.history.inv.push(this.state.inv);

    if (this.history.t.length > 2000) {
      this.history.t.shift(); this.history.pnl.shift(); this.history.inv.shift();
    }

    Plotly.restyle(this.plotEl, { x: [this.history.t], y: [this.history.pnl] });
    this.readout.set('cum P&L', this.state.pnl.toFixed(2), this.state.pnl >= 0 ? 'v good' : 'v warn');
    this.readout.set('fills', String(this.state.fills));
    this.readout.set('avg /fill', this.state.fills ? (this.state.pnl / this.state.fills).toFixed(3) : '0.000');
    this.readout.set('inventory', String(this.state.inv), Math.abs(this.state.inv) > 5 ? 'v warn' : 'v');

    this._raf = requestAnimationFrame(this.frame);
  }

  destroy() { if (this._raf) cancelAnimationFrame(this._raf); }
}
