// Section 9: latency tax. While the maker is updating, jumps can pick off her stale quotes.
import { mulberry32, randn } from '../sim/rng.js';
import { arrivalIntensity } from '../sim/flow.js';
import { makeSlider, makeReadout, makeButton } from '../ui/slider.js';
import { $controls, $viz, plotlyTheme, plotlyConfig, spinner } from '../ui/card.js';

// During latency window of length tau, price can move by sigma*sqrt(tau)*Z.
// If price jumps up, our stale ask gets sniped (we sell below new mid). And vice versa.
// We approximate: expected loss per latency-window = E[max(0, dS - delta)] for each side.
function expectedLatencyLoss(sigma, tau, halfSpread) {
  // dS ~ N(0, sigma^2 * tau). Maker stale at +/- halfSpread.
  // Loss event when |dS| > halfSpread; expected magnitude beyond halfSpread.
  // For normal X ~ N(0, s), E[max(0, X - c)] = s*phi(c/s) - c*(1 - Phi(c/s)) (truncated normal mean).
  const s = sigma * Math.sqrt(tau);
  if (s < 1e-9) return 0;
  const c = halfSpread;
  const phi = (z) => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  const Phi = (z) => 0.5 * (1 + erf(z / Math.sqrt(2)));
  function erf(x) {
    // Abramowitz-Stegun approx
    const sign = x < 0 ? -1 : 1; x = Math.abs(x);
    const a1=0.254829592, a2=-0.284496736, a3=1.421413741, a4=-1.453152027, a5=1.061405429, p=0.3275911;
    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t * Math.exp(-x*x);
    return sign * y;
  }
  const z = c / s;
  const e = s * phi(z) - c * (1 - Phi(z));
  return 2 * e; // both sides exposed
}

function fullSim({ sigma, halfSpread, A, k, latency, jumpsPerEpisode, T, dt, seed }) {
  const rng = mulberry32(seed);
  let s = 100, q = 0, cash = 0;
  const steps = Math.floor(T / dt);
  const lam = arrivalIntensity(halfSpread, A, k);
  const p = 1 - Math.exp(-lam * dt);
  const pJump = Math.min(1, jumpsPerEpisode / steps);
  for (let i = 0; i < steps; i++) {
    // normal flow
    if (rng() < p) { cash += s + halfSpread; q -= 1; }
    if (rng() < p) { cash -= s - halfSpread; q += 1; }
    // diffusion
    s += sigma * Math.sqrt(dt) * randn(rng);
    // jump during stale window: with prob pJump, mid moves by dz; if it exceeds halfSpread,
    // someone snipes the stale quote on that side
    if (rng() < pJump) {
      const dz = sigma * Math.sqrt(latency) * randn(rng);
      if (dz > halfSpread) {
        cash += s + halfSpread; q -= 1;
        s += dz;
      } else if (-dz > halfSpread) {
        cash -= s - halfSpread; q += 1;
        s += dz;
      } else {
        s += dz;
      }
    }
  }
  return cash + q * s;
}

export default class Latency {
  constructor(section) { this.section = section; }

  init() {
    const controls = $controls(this.section);
    const viz = $viz(this.section);
    this.params = { sigma: 2, halfSpread: 0.5, A: 140, k: 1.5, T: 1, dt: 0.005, jumpsPerEpisode: 15, episodes: 500 };

    const sl = makeSlider({ label: 'your latency τ', min: 0, max: 0.1, step: 0.002, value: 0.02, format: (v) => v.toFixed(3), onChange: (v) => { this.tau = v; this.draw(); } });
    const sj = makeSlider({ label: 'jumps per episode', min: 0, max: 40, step: 2, value: this.params.jumpsPerEpisode, format: (v) => v.toFixed(0), onChange: (v) => { this.params.jumpsPerEpisode = v; this.run(); } });
    const ss = makeSlider({ label: 'volatility σ', min: 0.1, max: 4, step: 0.1, value: this.params.sigma, format: (v) => v.toFixed(1), onChange: (v) => { this.params.sigma = v; this.run(); } });

    this.sl = sl;
    this.tau = 0.02;
    this.readout = makeReadout([
      { key: 'P&L at τ=0',    value: '—' },
      { key: 'P&L at your τ', value: '—', cls: 'warn' },
      { key: 'tax at your τ', value: '—', cls: 'warn' },
    ]);
    const runBtn = makeButton('re-sweep', () => this.run());

    controls.appendChild(sl.el);
    controls.appendChild(sj.el);
    controls.appendChild(ss.el);
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
      const taus = [];
      for (let t = 0; t <= 0.1; t += 0.005) taus.push(parseFloat(t.toFixed(4)));
      const meanPnl = [], analytic = [];
      const ep = this.params.episodes;
      for (const tau of taus) {
        const arr = new Float64Array(ep);
        for (let i = 0; i < ep; i++) arr[i] = fullSim({ ...this.params, latency: tau, seed: 41000 + i });
        meanPnl.push(arr.reduce((a, b) => a + b, 0) / ep);
        const lossPerJump = expectedLatencyLoss(this.params.sigma, tau, this.params.halfSpread);
        analytic.push(meanPnl[0] - lossPerJump * this.params.jumpsPerEpisode);
      }
      this.sweep = { taus, meanPnl, analytic };
      this.draw();
      spinner(viz, false);
    });
  }

  draw() {
    if (!this.sweep) return;
    const { taus, meanPnl, analytic } = this.sweep;
    // Linear interp at user's tau
    const tau = this.tau;
    let pnlAtTau = meanPnl[meanPnl.length - 1];
    for (let i = 0; i < taus.length - 1; i++) {
      if (tau >= taus[i] && tau <= taus[i+1]) {
        const a = (tau - taus[i]) / (taus[i+1] - taus[i]);
        pnlAtTau = meanPnl[i] * (1 - a) + meanPnl[i+1] * a;
        break;
      }
    }

    Plotly.react(this.plotEl, [
      { x: taus, y: meanPnl, type: 'scatter', mode: 'lines', name: 'measured mean P&L', line: { color: '#2dd4bf', width: 2 } },
      { x: taus, y: analytic, type: 'scatter', mode: 'lines', name: 'analytic', line: { color: '#fb7185', dash: 'dot', width: 2 } },
      { x: [tau, tau], y: [Math.min(...meanPnl, ...analytic), Math.max(...meanPnl, ...analytic)], type: 'scatter', mode: 'lines', line: { color: '#a8b5c8', width: 1, dash: 'dash' }, name: 'your τ', hoverinfo: 'skip' },
      { x: [tau], y: [pnlAtTau], type: 'scatter', mode: 'markers', marker: { color: '#fbbf24', size: 10, symbol: 'circle-open', line: { width: 2 } }, name: 'your P&L', hoverinfo: 'skip' },
    ], plotlyTheme({
      showlegend: true, legend: { x: 0.55, y: 0.98, font: { color: '#a8b5c8', size: 10 } },
      xaxis: { gridcolor: '#232c3b', title: 'latency τ', titlefont: { size: 11 } },
      yaxis: { gridcolor: '#232c3b', title: 'mean P&L', titlefont: { size: 11 } },
    }), plotlyConfig);

    this.readout.set('P&L at τ=0', meanPnl[0].toFixed(2));
    this.readout.set('P&L at your τ', pnlAtTau.toFixed(2));
    this.readout.set('tax at your τ', (meanPnl[0] - pnlAtTau).toFixed(2), 'v warn');
  }
  destroy() {}
}
