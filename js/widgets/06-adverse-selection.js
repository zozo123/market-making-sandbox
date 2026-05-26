// Section 6: adverse selection. A fraction α of trades arrives just before a price jump in their favor.
import { mulberry32, randn } from '../sim/rng.js';
import { arrivalIntensity } from '../sim/flow.js';
import { makeSlider, makeReadout, makeButton } from '../ui/slider.js';
import { $controls, $viz, plotlyTheme, plotlyConfig, spinner } from '../ui/card.js';

function runEpisode({ halfSpread, A, k, sigma, T, dt, alpha, jumpSize, seed }) {
  const rng = mulberry32(seed);
  let s = 100, q = 0, cash = 0;
  const steps = Math.floor(T / dt);
  const lam = arrivalIntensity(halfSpread, A, k);
  const p = 1 - Math.exp(-lam * dt);
  for (let i = 0; i < steps; i++) {
    if (rng() < p) {
      const informed = rng() < alpha;
      cash += s + halfSpread; q -= 1; // someone buys from us; we sold at ask
      if (informed) { s += jumpSize; }
    }
    if (rng() < p) {
      const informed = rng() < alpha;
      cash -= s - halfSpread; q += 1;
      if (informed) { s -= jumpSize; }
    }
    s += sigma * Math.sqrt(dt) * randn(rng);
  }
  return cash + q * s;
}

export default class AdverseSelection {
  constructor(section) { this.section = section; }

  init() {
    const controls = $controls(this.section);
    const viz = $viz(this.section);

    this.params = { halfSpread: 0.5, A: 140, k: 1.5, T: 300, dt: 0.5, sigma: 0.4, alpha: 0.15, jumpSize: 0.2 };

    const sa = makeSlider({ label: 'informed share α', min: 0, max: 0.6, step: 0.02, value: this.params.alpha, format: (v) => v.toFixed(2), onChange: (v) => { this.params.alpha = v; } });
    const sj = makeSlider({ label: 'informed jump size', min: 0.05, max: 0.8, step: 0.05, value: this.params.jumpSize, format: (v) => v.toFixed(2), onChange: (v) => { this.params.jumpSize = v; } });
    const sd = makeSlider({ label: 'half-spread δ', min: 0.1, max: 2, step: 0.05, value: this.params.halfSpread, format: (v) => v.toFixed(2), onChange: (v) => { this.params.halfSpread = v; } });

    this.readout = makeReadout([
      { key: 'α = 0   mean',  value: '—' },
      { key: 'α       mean',  value: '—' },
      { key: 'toxicity cost', value: '—', cls: 'warn' },
    ]);

    const runBtn = makeButton('run comparison', () => this.run(), { primary: true });

    controls.appendChild(sa.el);
    controls.appendChild(sj.el);
    controls.appendChild(sd.el);
    controls.appendChild(this.readout.el);
    controls.appendChild(runBtn);

    const plotEl = document.createElement('div');
    plotEl.className = 'plot';
    plotEl.style.height = '320px';
    viz.appendChild(plotEl);
    this.plotEl = plotEl;
    Plotly.newPlot(plotEl, [], plotlyTheme({ barmode: 'overlay', bargap: 0.02 }), plotlyConfig);

    this.run();
  }

  run() {
    const viz = $viz(this.section);
    spinner(viz, true);
    requestAnimationFrame(() => {
      const N = 800;
      const baseline = new Float64Array(N), toxic = new Float64Array(N);
      for (let i = 0; i < N; i++) {
        baseline[i] = runEpisode({ ...this.params, alpha: 0,            seed: 11000 + i });
        toxic[i]    = runEpisode({ ...this.params, alpha: this.params.alpha, seed: 11000 + i });
      }
      const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
      const m0 = mean(baseline), m1 = mean(toxic);

      Plotly.react(this.plotEl, [
        { x: [...baseline], type: 'histogram', name: 'α = 0',                     marker: { color: '#2dd4bf', opacity: 0.55 }, nbinsx: 40 },
        { x: [...toxic],    type: 'histogram', name: 'α = ' + this.params.alpha.toFixed(2), marker: { color: '#fb7185', opacity: 0.7  }, nbinsx: 40 },
      ], plotlyTheme({ barmode: 'overlay', bargap: 0.02, showlegend: true, legend: { x: 0.02, y: 0.98, font: { color: '#8b97ad' } },
        xaxis: { gridcolor: '#232c3b', title: 'episode P&L', titlefont: { size: 11 } },
        yaxis: { gridcolor: '#232c3b', title: 'count', titlefont: { size: 11 } },
      }), plotlyConfig);

      this.readout.set('α = 0   mean', m0.toFixed(2));
      this.readout.set('α       mean', m1.toFixed(2), m1 < 0 ? 'v warn' : 'v');
      this.readout.set('toxicity cost', (m0 - m1).toFixed(2), 'v warn');
      spinner(viz, false);
    });
  }

  destroy() {}
}
