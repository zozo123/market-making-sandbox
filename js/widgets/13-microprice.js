// Section 13: microprice. Compare mid vs microprice as predictors of the next trade.
import { mulberry32, randn, bern } from '../sim/rng.js';
import { makeSlider, makeReadout, makeButton } from '../ui/slider.js';
import { $controls, $viz, plotlyTheme, plotlyConfig } from '../ui/card.js';

// At each step, draw (qb, qa) sizes that drift; the next trade direction is more likely
// on the thin side. Track realized next-trade price and compare to mid and microprice.
function simulate({ T, dt, sigma, biasStrength, seed }) {
  const rng = mulberry32(seed);
  let mid = 100;
  const xs = [], midArr = [], microArr = [], nextArr = [];
  let qb = 50, qa = 50;
  for (let i = 0; i < T; i++) {
    // size drift
    qb = Math.max(5, qb + (randn(rng)) * 5);
    qa = Math.max(5, qa + (randn(rng)) * 5);
    const I = qb / (qb + qa);
    const bid = mid - 0.5;
    const ask = mid + 0.5;
    const micro = ask * I + bid * (1 - I);
    // next trade direction biased by imbalance: thicker bid -> more likely to print at ask
    const probAsk = 0.5 + biasStrength * (I - 0.5);
    const nextPrice = bern(rng, probAsk) === 1 ? ask : bid;
    xs.push(i);
    midArr.push(mid);
    microArr.push(micro);
    nextArr.push(nextPrice);
    mid += sigma * Math.sqrt(dt) * randn(rng);
  }
  // forecast error: |microprice_t - nextPrice_t| vs |mid_t - nextPrice_t|
  let errMid = 0, errMicro = 0;
  for (let i = 0; i < T; i++) {
    errMid   += Math.abs(midArr[i] - nextArr[i]);
    errMicro += Math.abs(microArr[i] - nextArr[i]);
  }
  return { xs, mid: midArr, micro: microArr, next: nextArr, errMid: errMid / T, errMicro: errMicro / T };
}

export default class Microprice {
  constructor(section) { this.section = section; }
  init() {
    const controls = $controls(this.section);
    const viz = $viz(this.section);
    this.params = { T: 300, dt: 1, sigma: 0.05, biasStrength: 0.8 };
    const sb = makeSlider({ label: 'imbalance bias strength', min: 0, max: 1, step: 0.05, value: this.params.biasStrength, format: (v) => v.toFixed(2), onChange: (v) => { this.params.biasStrength = v; this.run(); } });
    const ss = makeSlider({ label: 'volatility σ', min: 0, max: 0.3, step: 0.01, value: this.params.sigma, format: (v) => v.toFixed(2), onChange: (v) => { this.params.sigma = v; this.run(); } });

    this.readout = makeReadout([
      { key: 'mean |mid − next|',   value: '—', cls: 'warn' },
      { key: 'mean |micro − next|', value: '—', cls: 'good' },
      { key: 'improvement',         value: '—' },
    ]);
    const reBtn = makeButton('new sample', () => { this.seedBump = (this.seedBump || 0) + 1; this.run(); });
    controls.appendChild(sb.el);
    controls.appendChild(ss.el);
    controls.appendChild(this.readout.el);
    controls.appendChild(reBtn);

    const plotEl = document.createElement('div');
    plotEl.className = 'plot';
    plotEl.style.height = '320px';
    viz.appendChild(plotEl);
    this.plotEl = plotEl;
    Plotly.newPlot(plotEl, [], plotlyTheme({}), plotlyConfig);
    this.run();
  }

  run() {
    const r = simulate({ ...this.params, seed: 71000 + (this.seedBump || 0) });
    Plotly.react(this.plotEl, [
      { x: r.xs, y: r.next,  type: 'scatter', mode: 'markers', marker: { color: 'rgba(139,151,173,0.55)', size: 4 }, name: 'next trade' },
      { x: r.xs, y: r.mid,   type: 'scatter', mode: 'lines',   line: { color: '#fb7185', width: 1.5 }, name: 'mid' },
      { x: r.xs, y: r.micro, type: 'scatter', mode: 'lines',   line: { color: '#2dd4bf', width: 1.5 }, name: 'microprice' },
    ], plotlyTheme({
      showlegend: true, legend: { x: 0.55, y: 0.98, font: { color: '#8b97ad', size: 10 } },
      xaxis: { gridcolor: '#232c3b', title: 't', titlefont: { size: 11 } },
      yaxis: { gridcolor: '#232c3b', title: 'price', titlefont: { size: 11 } },
    }), plotlyConfig);

    this.readout.set('mean |mid − next|',   r.errMid.toFixed(3));
    this.readout.set('mean |micro − next|', r.errMicro.toFixed(3));
    this.readout.set('improvement', ((r.errMid - r.errMicro) / r.errMid * 100).toFixed(1) + '%', r.errMicro < r.errMid ? 'v good' : 'v warn');
  }
  destroy() {}
}
