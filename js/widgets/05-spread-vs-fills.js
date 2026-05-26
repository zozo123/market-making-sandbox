// Section 5: sweep δ vs expected P&L; show the U-curve / interior optimum.
import { mulberry32, randn } from '../sim/rng.js';
import { arrivalIntensity } from '../sim/flow.js';
import { makeSlider, makeReadout, makeButton } from '../ui/slider.js';
import { $controls, $viz, plotlyTheme, plotlyConfig, spinner } from '../ui/card.js';

function episode({ halfSpread, A, k, sigma, T, dt, gamma, seed }) {
  const rng = mulberry32(seed);
  let s = 100, q = 0, cash = 0;
  const steps = Math.floor(T / dt);
  for (let i = 0; i < steps; i++) {
    const skew = gamma * q;
    const askD = Math.max(halfSpread - skew, 0.01);
    const bidD = Math.max(halfSpread + skew, 0.01);
    const lamA = arrivalIntensity(askD, A, k);
    const lamB = arrivalIntensity(bidD, A, k);
    if (rng() < 1 - Math.exp(-lamA * dt)) { cash += s + askD; q -= 1; }
    if (rng() < 1 - Math.exp(-lamB * dt)) { cash -= s - bidD; q += 1; }
    s += sigma * Math.sqrt(dt) * randn(rng);
  }
  return cash + q * s;
}

export default class SpreadVsFills {
  constructor(section) { this.section = section; }

  init() {
    const controls = $controls(this.section);
    const viz = $viz(this.section);

    this.params = { A: 140, k: 1.5, T: 1, dt: 0.005, sigma: 2, gamma: 0.1, episodes: 150 };

    const sk = makeSlider({
      label: 'fill-decay k', min: 0.5, max: 4, step: 0.1, value: this.params.k,
      format: (v) => v.toFixed(1), onChange: (v) => { this.params.k = v; this.run(); },
    });
    const ss = makeSlider({
      label: 'volatility σ', min: 0, max: 4, step: 0.1, value: this.params.sigma,
      format: (v) => v.toFixed(1), onChange: (v) => { this.params.sigma = v; this.run(); },
    });
    const sg = makeSlider({
      label: 'skew γ', min: 0, max: 0.4, step: 0.01, value: this.params.gamma,
      format: (v) => v.toFixed(2), onChange: (v) => { this.params.gamma = v; this.run(); },
    });

    this.readout = makeReadout([
      { key: 'best δ',     value: '—', cls: 'good' },
      { key: 'best E[P&L]',value: '—' },
      { key: 'grid points',value: '—' },
    ]);

    const runBtn = makeButton('re-run', () => this.run());

    controls.appendChild(sk.el);
    controls.appendChild(ss.el);
    controls.appendChild(sg.el);
    controls.appendChild(this.readout.el);
    controls.appendChild(runBtn);

    const plotEl = document.createElement('div');
    plotEl.className = 'plot';
    plotEl.style.height = '320px';
    viz.appendChild(plotEl);
    this.plotEl = plotEl;
    Plotly.newPlot(plotEl, [], plotlyTheme({
      xaxis: { gridcolor: '#232c3b', title: 'half-spread δ', titlefont: { size: 11 } },
      yaxis: { gridcolor: '#232c3b', title: 'E[P&L]', titlefont: { size: 11 } },
    }), plotlyConfig);

    this.run();
  }

  run() {
    const viz = $viz(this.section);
    spinner(viz, true);
    requestAnimationFrame(() => {
      const deltas = [];
      for (let d = 0.05; d <= 2.0; d += 0.05) deltas.push(parseFloat(d.toFixed(2)));
      const means = [], stds = [];
      for (const halfSpread of deltas) {
        const ep = this.params.episodes;
        const arr = new Float64Array(ep);
        for (let i = 0; i < ep; i++) arr[i] = episode({ ...this.params, halfSpread, seed: 9000 + i });
        const m = arr.reduce((a, b) => a + b, 0) / ep;
        const sd = Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / ep);
        means.push(m); stds.push(sd);
      }
      const bestI = means.indexOf(Math.max(...means));
      const upper = means.map((m, i) => m + stds[i] / Math.sqrt(this.params.episodes));
      const lower = means.map((m, i) => m - stds[i] / Math.sqrt(this.params.episodes));

      Plotly.react(this.plotEl, [
        { x: deltas, y: upper, type: 'scatter', mode: 'lines', line: { width: 0 }, hoverinfo: 'skip', showlegend: false },
        { x: deltas, y: lower, type: 'scatter', mode: 'lines', line: { width: 0 }, fill: 'tonexty', fillcolor: 'rgba(45,212,191,0.15)', hoverinfo: 'skip', showlegend: false },
        { x: deltas, y: means, type: 'scatter', mode: 'lines', line: { color: '#2dd4bf', width: 2 }, name: 'E[P&L]' },
        { x: [deltas[bestI]], y: [means[bestI]], type: 'scatter', mode: 'markers', marker: { color: '#fb7185', size: 10, symbol: 'circle-open', line: { width: 2 } }, name: 'optimum' },
      ], plotlyTheme({
        xaxis: { gridcolor: '#232c3b', title: 'half-spread δ', titlefont: { size: 11 } },
        yaxis: { gridcolor: '#232c3b', title: 'E[P&L]', titlefont: { size: 11 } },
      }), plotlyConfig);

      this.readout.set('best δ', deltas[bestI].toFixed(2));
      this.readout.set('best E[P&L]', means[bestI].toFixed(2));
      this.readout.set('grid points', String(deltas.length));
      spinner(viz, false);
    });
  }

  destroy() {}
}
