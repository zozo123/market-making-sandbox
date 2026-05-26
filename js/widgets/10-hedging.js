// Section 10: hedge ratio sweep. Plot residual portfolio variance vs h; mark h* = ρ σ_A / σ_B.
import { makeSlider, makeReadout } from '../ui/slider.js';
import { $controls, $viz, plotlyTheme, plotlyConfig } from '../ui/card.js';

export default class Hedging {
  constructor(section) { this.section = section; }

  init() {
    const controls = $controls(this.section);
    const viz = $viz(this.section);
    this.params = { sigmaA: 1.0, sigmaB: 1.0, rho: 0.7 };

    const sA = makeSlider({ label: 'σ_A (inventory asset)', min: 0.1, max: 2, step: 0.05, value: this.params.sigmaA, format: (v) => v.toFixed(2), onChange: (v) => { this.params.sigmaA = v; this.update(); } });
    const sB = makeSlider({ label: 'σ_B (hedge asset)',     min: 0.1, max: 2, step: 0.05, value: this.params.sigmaB, format: (v) => v.toFixed(2), onChange: (v) => { this.params.sigmaB = v; this.update(); } });
    const sR = makeSlider({ label: 'correlation ρ',          min: -1, max: 1,   step: 0.05, value: this.params.rho,    format: (v) => v.toFixed(2), onChange: (v) => { this.params.rho = v; this.update(); } });

    this.readout = makeReadout([
      { key: 'h*',              value: '—', cls: 'good' },
      { key: 'var at h=0',      value: '—' },
      { key: 'var at h*',       value: '—', cls: 'good' },
      { key: 'variance reduction', value: '—' },
    ]);
    controls.appendChild(sA.el);
    controls.appendChild(sB.el);
    controls.appendChild(sR.el);
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
    const { sigmaA, sigmaB, rho } = this.params;
    // Var(A - h*B) = σ_A² + h² σ_B² - 2h ρ σ_A σ_B
    const hs = [];
    for (let h = -2; h <= 3.01; h += 0.05) hs.push(parseFloat(h.toFixed(2)));
    const vars = hs.map((h) => sigmaA * sigmaA + h * h * sigmaB * sigmaB - 2 * h * rho * sigmaA * sigmaB);
    const hStar = rho * sigmaA / sigmaB;
    const varStar = sigmaA * sigmaA * (1 - rho * rho);
    const var0 = sigmaA * sigmaA;

    Plotly.react(this.plotEl, [
      { x: hs, y: vars, type: 'scatter', mode: 'lines', line: { color: '#2dd4bf', width: 2 }, name: 'portfolio variance' },
      { x: [hStar], y: [varStar], type: 'scatter', mode: 'markers', marker: { color: '#fb7185', size: 12, symbol: 'circle-open', line: { width: 2 } }, name: 'h*' },
    ], plotlyTheme({
      xaxis: { gridcolor: '#232c3b', title: 'hedge ratio h', titlefont: { size: 11 }, zerolinecolor: '#2f3b50' },
      yaxis: { gridcolor: '#232c3b', title: 'Var(A − h·B)', titlefont: { size: 11 }, range: [0, Math.max(...vars) * 1.05] },
    }), plotlyConfig);

    this.readout.set('h*', hStar.toFixed(3));
    this.readout.set('var at h=0', var0.toFixed(3));
    this.readout.set('var at h*', varStar.toFixed(3));
    this.readout.set('variance reduction', (1 - varStar / var0).toFixed(2));
  }
  destroy() {}
}
