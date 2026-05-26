// Section 7: Avellaneda-Stoikov vs symmetric baseline. Monte Carlo comparison.
import { mulberry32, randn } from '../sim/rng.js';
import { arrivalIntensity } from '../sim/flow.js';
import { reservationPrice, optimalHalfSpread } from '../sim/as.js';
import { makeSlider, makeReadout, makeButton } from '../ui/slider.js';
import { $controls, $viz, plotlyTheme, plotlyConfig, spinner } from '../ui/card.js';

function episode({ strategy, gamma, sigma, k, T, dt, A, halfSpread, seed }) {
  const rng = mulberry32(seed);
  let s = 100, q = 0, cash = 0;
  const steps = Math.floor(T / dt);
  let maxAbsQ = 0;
  for (let i = 0; i < steps; i++) {
    const tau = T - i * dt;
    let bidD, askD;
    if (strategy === 'as') {
      const r = reservationPrice(s, q, gamma, sigma, tau);
      const half = optimalHalfSpread(gamma, sigma, tau, k);
      // bid = r - half, ask = r + half. Distances from mid s:
      askD = Math.max((r + half) - s, 0.01);
      bidD = Math.max(s - (r - half), 0.01);
    } else {
      askD = halfSpread; bidD = halfSpread;
    }
    const lamA = arrivalIntensity(askD, A, k);
    const lamB = arrivalIntensity(bidD, A, k);
    if (rng() < 1 - Math.exp(-lamA * dt)) { cash += s + askD; q -= 1; }
    if (rng() < 1 - Math.exp(-lamB * dt)) { cash -= s - bidD; q += 1; }
    s += sigma * Math.sqrt(dt) * randn(rng);
    if (Math.abs(q) > maxAbsQ) maxAbsQ = Math.abs(q);
  }
  return { pnl: cash + q * s, q, maxAbsQ };
}

function mc(params, N) {
  const pnl = new Float64Array(N), inv = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const r = episode({ ...params, seed: 31000 + i });
    pnl[i] = r.pnl; inv[i] = r.q;
  }
  return { pnl, inv };
}

const stats = (a) => {
  const m = a.reduce((x, y) => x + y, 0) / a.length;
  const s = Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length);
  return { m, s };
};

export default class AvellanedaStoikov {
  constructor(section) { this.section = section; }

  init() {
    const controls = $controls(this.section);
    const viz = $viz(this.section);

    this.params = { gamma: 0.1, sigma: 0.5, k: 1.5, T: 300, dt: 0.5, A: 140, halfSpread: 0.5, episodes: 600 };

    const sg = makeSlider({ label: 'risk aversion γ', min: 0.01, max: 0.6, step: 0.01, value: this.params.gamma, format: (v) => v.toFixed(2), onChange: (v) => { this.params.gamma = v; } });
    const ss = makeSlider({ label: 'volatility σ', min: 0.05, max: 2, step: 0.05, value: this.params.sigma, format: (v) => v.toFixed(2), onChange: (v) => { this.params.sigma = v; } });
    const sk = makeSlider({ label: 'fill-decay k', min: 0.5, max: 4, step: 0.1, value: this.params.k, format: (v) => v.toFixed(1), onChange: (v) => { this.params.k = v; } });
    const sT = makeSlider({ label: 'horizon T', min: 60, max: 600, step: 30, value: this.params.T, format: (v) => v.toFixed(0), onChange: (v) => { this.params.T = v; } });

    this.readout = makeReadout([
      { key: 'sym mean P&L', value: '—' },
      { key: 'sym std q',    value: '—' },
      { key: 'AS  mean P&L', value: '—' },
      { key: 'AS  std q',    value: '—' },
      { key: 'std q ratio',  value: '—', cls: 'good' },
    ]);

    const runBtn = makeButton('compare', () => this.run(), { primary: true });

    controls.appendChild(sg.el);
    controls.appendChild(ss.el);
    controls.appendChild(sk.el);
    controls.appendChild(sT.el);
    controls.appendChild(this.readout.el);
    controls.appendChild(runBtn);

    const plotEl = document.createElement('div');
    plotEl.className = 'plot';
    plotEl.style.height = '320px';
    viz.appendChild(plotEl);
    this.plotEl = plotEl;
    Plotly.newPlot(plotEl, [], plotlyTheme({}), plotlyConfig);

    this.run();
  }

  run() {
    const viz = $viz(this.section);
    spinner(viz, true);
    requestAnimationFrame(() => {
      const sym = mc({ ...this.params, strategy: 'sym' }, this.params.episodes);
      const as  = mc({ ...this.params, strategy: 'as'  }, this.params.episodes);

      const stPnL_sym = stats(sym.pnl), stInv_sym = stats(sym.inv);
      const stPnL_as  = stats(as.pnl),  stInv_as  = stats(as.inv);

      Plotly.react(this.plotEl, [
        { x: [...sym.pnl], type: 'histogram', name: 'symmetric', marker: { color: '#fb7185', opacity: 0.55 }, nbinsx: 40 },
        { x: [...as.pnl],  type: 'histogram', name: 'AS',        marker: { color: '#2dd4bf', opacity: 0.7  }, nbinsx: 40 },
      ], plotlyTheme({ barmode: 'overlay', bargap: 0.02, showlegend: true, legend: { x: 0.02, y: 0.98, font: { color: '#8b97ad' } },
        xaxis: { gridcolor: '#232c3b', title: 'terminal P&L', titlefont: { size: 11 } },
        yaxis: { gridcolor: '#232c3b', title: 'count', titlefont: { size: 11 } },
      }), plotlyConfig);

      this.readout.set('sym mean P&L', stPnL_sym.m.toFixed(2));
      this.readout.set('sym std q',    stInv_sym.s.toFixed(2));
      this.readout.set('AS  mean P&L', stPnL_as.m.toFixed(2));
      this.readout.set('AS  std q',    stInv_as.s.toFixed(2));
      const ratio = stInv_sym.s / Math.max(stInv_as.s, 1e-6);
      this.readout.set('std q ratio', ratio.toFixed(2) + '×', ratio > 1.2 ? 'v good' : 'v');
      spinner(viz, false);
    });
  }

  destroy() {}
}
