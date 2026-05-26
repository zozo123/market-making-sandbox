// Section 3: inventory risk. Compare P&L distributions across volatility levels.
import { mulberry32, randn } from '../sim/rng.js';
import { arrivalIntensity } from '../sim/flow.js';
import { makeSlider, makeReadout, makeButton } from '../ui/slider.js';
import { $controls, $viz, plotlyTheme, plotlyConfig, spinner } from '../ui/card.js';

function runEpisode({ halfSpread, A, k, sigma, T, dt, seed }) {
  const rng = mulberry32(seed);
  let s = 100, q = 0, cash = 0;
  const lam = arrivalIntensity(halfSpread, A, k);
  const pSide = 1 - Math.exp(-lam * dt);
  const steps = Math.floor(T / dt);
  for (let i = 0; i < steps; i++) {
    if (rng() < pSide) { cash += s + halfSpread; q -= 1; } // we sell at ask
    if (rng() < pSide) { cash -= s - halfSpread; q += 1; } // we buy at bid
    s += sigma * Math.sqrt(dt) * randn(rng);
  }
  return cash + q * s; // mark-to-market terminal
}

function monteCarlo(params, episodes) {
  const out = new Float64Array(episodes);
  for (let i = 0; i < episodes; i++) out[i] = runEpisode({ ...params, seed: 1000 + i });
  return out;
}

export default class InventoryRisk {
  constructor(section) { this.section = section; }

  init() {
    const controls = $controls(this.section);
    const viz = $viz(this.section);

    this.params = { halfSpread: 0.5, A: 140, k: 1.5, T: 300, dt: 0.5, sigma: 0.5 };

    const s1 = makeSlider({
      label: 'half-spread δ', min: 0.1, max: 2, step: 0.05, value: this.params.halfSpread,
      format: (v) => v.toFixed(2), onChange: (v) => { this.params.halfSpread = v; },
    });
    const s2 = makeSlider({
      label: 'volatility σ', min: 0, max: 2, step: 0.05, value: this.params.sigma,
      format: (v) => v.toFixed(2), onChange: (v) => { this.params.sigma = v; },
    });
    const s3 = makeSlider({
      label: 'horizon T (s)', min: 60, max: 600, step: 30, value: this.params.T,
      format: (v) => v.toFixed(0), onChange: (v) => { this.params.T = v; },
    });

    this.readout = makeReadout([
      { key: 'episodes',    value: '0' },
      { key: 'mean P&L',    value: '—' },
      { key: 'std P&L',     value: '—' },
      { key: 'P5 / P95',    value: '—' },
    ]);

    const runBtn = makeButton('run 1000 episodes', () => this.run(), { primary: true });

    controls.appendChild(s1.el);
    controls.appendChild(s2.el);
    controls.appendChild(s3.el);
    controls.appendChild(this.readout.el);
    controls.appendChild(runBtn);

    const plotEl = document.createElement('div');
    plotEl.className = 'plot';
    plotEl.style.height = '320px';
    viz.appendChild(plotEl);
    this.plotEl = plotEl;
    Plotly.newPlot(plotEl, [], plotlyTheme({
      xaxis: { gridcolor: '#232c3b', title: 'episode P&L', titlefont: { size: 11 } },
      yaxis: { gridcolor: '#232c3b', title: 'count', titlefont: { size: 11 } },
      bargap: 0.02,
    }), plotlyConfig);

    this.run();
  }

  run() {
    spinner($viz(this.section), true);
    requestAnimationFrame(() => {
      const pnl = monteCarlo(this.params, 1000);
      const mean = pnl.reduce((a, b) => a + b, 0) / pnl.length;
      const std = Math.sqrt(pnl.reduce((a, b) => a + (b - mean) ** 2, 0) / pnl.length);
      const sorted = [...pnl].sort((a, b) => a - b);
      const p5 = sorted[Math.floor(sorted.length * 0.05)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];

      Plotly.react(this.plotEl, [
        { x: [...pnl], type: 'histogram', marker: { color: '#2dd4bf', line: { color: '#0b0e13', width: 1 } }, nbinsx: 40, name: 'P&L' },
      ], plotlyTheme({
        xaxis: { gridcolor: '#232c3b', title: 'episode P&L', titlefont: { size: 11 } },
        yaxis: { gridcolor: '#232c3b', title: 'count', titlefont: { size: 11 } },
        bargap: 0.02,
      }), plotlyConfig);

      this.readout.set('episodes', '1000');
      this.readout.set('mean P&L', mean.toFixed(2), mean > 0 ? 'v good' : 'v warn');
      this.readout.set('std P&L', std.toFixed(2));
      this.readout.set('P5 / P95', `${p5.toFixed(1)} / ${p95.toFixed(1)}`);
      spinner($viz(this.section), false);
    });
  }

  destroy() {}
}
