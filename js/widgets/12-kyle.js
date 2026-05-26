// Section 12: Kyle's λ. Show the linear price-impact line, plus a simulated cloud.
import { mulberry32, randn } from '../sim/rng.js';
import { kyleLambda, kyleBeta } from '../sim/kyle.js';
import { makeSlider, makeReadout } from '../ui/slider.js';
import { $controls, $viz, plotlyTheme, plotlyConfig } from '../ui/card.js';

export default class Kyle {
  constructor(section) { this.section = section; }
  init() {
    const controls = $controls(this.section);
    const viz = $viz(this.section);
    this.params = { sigmaV: 1.0, sigmaU: 1.0, samples: 600 };

    const sv = makeSlider({ label: 'σ_v  (value uncertainty)', min: 0.1, max: 3, step: 0.05, value: this.params.sigmaV, format: (v) => v.toFixed(2), onChange: (v) => { this.params.sigmaV = v; this.update(); } });
    const su = makeSlider({ label: 'σ_u  (noise traders)',      min: 0.1, max: 3, step: 0.05, value: this.params.sigmaU, format: (v) => v.toFixed(2), onChange: (v) => { this.params.sigmaU = v; this.update(); } });

    this.readout = makeReadout([
      { key: 'λ',          value: '—', cls: 'good' },
      { key: 'β (informed)',value: '—' },
      { key: 'depth 1/λ',   value: '—' },
    ]);

    controls.appendChild(sv.el);
    controls.appendChild(su.el);
    controls.appendChild(this.readout.el);

    const plotEl = document.createElement('div');
    plotEl.className = 'plot';
    plotEl.style.height = '320px';
    viz.appendChild(plotEl);
    this.plotEl = plotEl;
    Plotly.newPlot(plotEl, [], plotlyTheme({}), plotlyConfig);
    this.update();
  }

  update() {
    const { sigmaV, sigmaU } = this.params;
    const lambda = kyleLambda(sigmaV, sigmaU);
    const beta = kyleBeta(sigmaV, sigmaU);
    // Sample (y, p) where y = β(V-μ) + u, p = μ + λ y
    const rng = mulberry32(61000);
    const ys = [], ps = [];
    for (let i = 0; i < this.params.samples; i++) {
      const v = sigmaV * randn(rng);
      const u = sigmaU * randn(rng);
      const x = beta * v;
      const y = x + u;
      const p = lambda * y;
      ys.push(y); ps.push(p);
    }
    const yMin = Math.min(...ys), yMax = Math.max(...ys);
    const lineY = [yMin, yMax];
    const lineP = lineY.map((y) => lambda * y);

    Plotly.react(this.plotEl, [
      { x: ys, y: ps, type: 'scatter', mode: 'markers', marker: { color: 'rgba(45,212,191,0.45)', size: 5 }, name: 'auctions' },
      { x: lineY, y: lineP, type: 'scatter', mode: 'lines', line: { color: '#fb7185', width: 2 }, name: 'p = λ y' },
    ], plotlyTheme({
      showlegend: true, legend: { x: 0.55, y: 0.05, font: { color: '#8b97ad', size: 10 } },
      xaxis: { gridcolor: '#232c3b', title: 'net order flow y', titlefont: { size: 11 }, zerolinecolor: '#2f3b50' },
      yaxis: { gridcolor: '#232c3b', title: 'price impact p − μ', titlefont: { size: 11 }, zerolinecolor: '#2f3b50' },
    }), plotlyConfig);

    this.readout.set('λ', lambda.toFixed(3));
    this.readout.set('β (informed)', beta.toFixed(3));
    this.readout.set('depth 1/λ', (1 / lambda).toFixed(3));
  }
  destroy() {}
}
