// Section 4: skew. Linear inventory penalty. Compare γ=0 vs γ>0 P&L distributions.
import { mulberry32, randn } from '../sim/rng.js';
import { arrivalIntensity } from '../sim/flow.js';
import { makeSlider, makeReadout, makeButton } from '../ui/slider.js';
import { $controls, $viz, plotlyTheme, plotlyConfig, spinner } from '../ui/card.js';

function runEpisode({ halfSpread, A, k, sigma, T, dt, gamma, seed }) {
  const rng = mulberry32(seed);
  let s = 100, q = 0, cash = 0;
  const steps = Math.floor(T / dt);
  for (let i = 0; i < steps; i++) {
    const skew = gamma * q;
    // skew shifts both quotes down when long: bid = s - δ - skew, ask = s + δ - skew
    const askD = halfSpread - skew;
    const bidD = halfSpread + skew;
    // intensities seen by each side
    const lamAsk = arrivalIntensity(Math.max(askD, 0.01), A, k);
    const lamBid = arrivalIntensity(Math.max(bidD, 0.01), A, k);
    if (rng() < 1 - Math.exp(-lamAsk * dt)) { cash += s + askD; q -= 1; }
    if (rng() < 1 - Math.exp(-lamBid * dt)) { cash -= s - bidD; q += 1; }
    s += sigma * Math.sqrt(dt) * randn(rng);
  }
  return { pnl: cash + q * s, q };
}

function monteCarlo(params, episodes) {
  const pnl = new Float64Array(episodes);
  const inv = new Float64Array(episodes);
  for (let i = 0; i < episodes; i++) {
    const r = runEpisode({ ...params, seed: 7000 + i });
    pnl[i] = r.pnl; inv[i] = r.q;
  }
  return { pnl, inv };
}

const stats = (a) => {
  const m = a.reduce((x, y) => x + y, 0) / a.length;
  const s = Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length);
  return { m, s };
};

export default class Skew {
  constructor(section) { this.section = section; }

  init() {
    const controls = $controls(this.section);
    const viz = $viz(this.section);

    this.params = { halfSpread: 0.5, A: 140, k: 1.5, T: 1, dt: 0.005, sigma: 2, gamma: 0.1 };

    const sg = makeSlider({
      label: 'skew strength γ', min: 0, max: 0.4, step: 0.01, value: this.params.gamma,
      format: (v) => v.toFixed(2), onChange: (v) => { this.params.gamma = v; },
    });
    const ss = makeSlider({
      label: 'volatility σ', min: 0, max: 4, step: 0.1, value: this.params.sigma,
      format: (v) => v.toFixed(1), onChange: (v) => { this.params.sigma = v; },
    });
    const sd = makeSlider({
      label: 'half-spread δ', min: 0.1, max: 2, step: 0.05, value: this.params.halfSpread,
      format: (v) => v.toFixed(2), onChange: (v) => { this.params.halfSpread = v; },
    });

    this.readout = makeReadout([
      { key: 'mean (γ=0)',    value: '—' },
      { key: 'std  (γ=0)',    value: '—' },
      { key: 'mean (γ)',      value: '—' },
      { key: 'std  (γ)',      value: '—' },
      { key: 'std reduction', value: '—', cls: 'good' },
    ]);

    const runBtn = makeButton('run comparison', () => this.run(), { primary: true });

    controls.appendChild(sg.el);
    controls.appendChild(ss.el);
    controls.appendChild(sd.el);
    controls.appendChild(this.readout.el);
    controls.appendChild(runBtn);

    const plotEl = document.createElement('div');
    plotEl.className = 'plot';
    plotEl.style.height = '320px';
    viz.appendChild(plotEl);
    this.plotEl = plotEl;
    Plotly.newPlot(plotEl, [], plotlyTheme({ barmode: 'overlay', bargap: 0.02,
      xaxis: { gridcolor: '#232c3b', title: 'episode P&L', titlefont: { size: 11 } },
      yaxis: { gridcolor: '#232c3b', title: 'count', titlefont: { size: 11 } },
    }), plotlyConfig);

    this.run();
  }

  run() {
    const viz = $viz(this.section);
    spinner(viz, true);
    requestAnimationFrame(() => {
      const base = monteCarlo({ ...this.params, gamma: 0 }, 600);
      const skewed = monteCarlo({ ...this.params }, 600);

      const sb = stats(base.pnl);
      const ss = stats(skewed.pnl);

      const all = [...base.pnl, ...skewed.pnl];
      const lo = Math.min(...all), hi = Math.max(...all);
      const xbins = { start: lo, end: hi, size: (hi - lo) / 50 };

      Plotly.react(this.plotEl, [
        { x: [...base.pnl],    type: 'histogram', name: 'γ = 0',        marker: { color: '#fb7185', opacity: 0.5, line: { color: '#fb7185', width: 1 } }, xbins, autobinx: false },
        { x: [...skewed.pnl],  type: 'histogram', name: 'γ = ' + this.params.gamma.toFixed(2), marker: { color: '#2dd4bf', opacity: 0.6, line: { color: '#2dd4bf', width: 1 } }, xbins, autobinx: false },
      ], plotlyTheme({ barmode: 'overlay', bargap: 0.02, showlegend: true, legend: { x: 0.02, y: 0.98, font: { color: '#a8b5c8' } },
        xaxis: { gridcolor: '#232c3b', title: 'episode P&L', titlefont: { size: 11 } },
        yaxis: { gridcolor: '#232c3b', title: 'count', titlefont: { size: 11 } },
      }), plotlyConfig);

      this.readout.set('mean (γ=0)', sb.m.toFixed(2));
      this.readout.set('std  (γ=0)', sb.s.toFixed(2));
      this.readout.set('mean (γ)',   ss.m.toFixed(2));
      this.readout.set('std  (γ)',   ss.s.toFixed(2));
      const red = sb.s > 0 ? sb.s / ss.s : 1;
      this.readout.set('std reduction', red.toFixed(2) + '×', red > 1.2 ? 'v good' : 'v');
      spinner(viz, false);
    });
  }

  destroy() {}
}
