// Section 11: Glosten-Milgrom. Simulate sequential trades; plot bid/ask + posterior over time.
import { mulberry32, bern } from '../sim/rng.js';
import { posterior, bidAsk } from '../sim/gm.js';
import { makeSlider, makeReadout, makeButton } from '../ui/slider.js';
import { $controls, $viz, plotlyTheme, plotlyConfig } from '../ui/card.js';

function runGM({ alpha, p0, vl, vh, vTrue, N, seed }) {
  const rng = mulberry32(seed);
  let p = p0;
  const xs = [], bids = [], asks = [], post = [];
  for (let i = 0; i < N; i++) {
    const { bid, ask } = bidAsk(p, vl, vh, alpha);
    xs.push(i);
    bids.push(bid);
    asks.push(ask);
    post.push(p);
    // Generate the next trade
    const informed = bern(rng, alpha) === 1;
    let side;
    if (informed) side = vTrue === vh ? 1 : -1;
    else side = bern(rng, 0.5) === 1 ? 1 : -1;
    p = posterior(p, side, alpha);
  }
  return { xs, bids, asks, post };
}

export default class GlostenMilgrom {
  constructor(section) { this.section = section; }
  init() {
    const controls = $controls(this.section);
    const viz = $viz(this.section);
    this.params = { alpha: 0.3, p0: 0.5, vl: 99, vh: 101, vTrue: 101, N: 200 };

    const sa = makeSlider({ label: 'informed fraction α', min: 0.05, max: 0.95, step: 0.05, value: this.params.alpha, format: (v) => v.toFixed(2), onChange: (v) => { this.params.alpha = v; this.run(); } });
    const sp = makeSlider({ label: 'prior Pr(V = V_H)',    min: 0.05, max: 0.95, step: 0.05, value: this.params.p0,    format: (v) => v.toFixed(2), onChange: (v) => { this.params.p0 = v; this.run(); } });
    const sv = makeSlider({ label: 'true V (V_L=99, V_H=101)', min: 99, max: 101, step: 2, value: this.params.vTrue, format: (v) => v.toFixed(0), onChange: (v) => { this.params.vTrue = v; this.run(); } });

    this.readout = makeReadout([
      { key: 'initial spread', value: '—' },
      { key: 'final mid',      value: '—' },
      { key: 'truth',          value: '—' },
    ]);
    const reBtn = makeButton('new sample', () => { this.seedBump = (this.seedBump || 0) + 1; this.run(); });

    controls.appendChild(sa.el);
    controls.appendChild(sp.el);
    controls.appendChild(sv.el);
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
    const seed = 51000 + (this.seedBump || 0);
    const r = runGM({ ...this.params, seed });
    const mid = r.bids.map((b, i) => (b + r.asks[i]) / 2);
    Plotly.react(this.plotEl, [
      { x: r.xs, y: r.asks, type: 'scatter', mode: 'lines', name: 'ask',    line: { color: '#fb7185', width: 2 } },
      { x: r.xs, y: r.bids, type: 'scatter', mode: 'lines', name: 'bid',    line: { color: '#2dd4bf', width: 2 } },
      { x: r.xs, y: mid,    type: 'scatter', mode: 'lines', name: 'E[V]',   line: { color: '#d8e0ee', dash: 'dot', width: 1.5 } },
      { x: r.xs, y: new Array(r.xs.length).fill(this.params.vTrue), type: 'scatter', mode: 'lines', name: 'true V', line: { color: '#fbbf24', dash: 'dash', width: 1.5 } },
    ], plotlyTheme({
      showlegend: true, legend: { x: 0.55, y: 0.5, font: { color: '#8b97ad', size: 10 } },
      xaxis: { gridcolor: '#232c3b', title: 'trade #', titlefont: { size: 11 } },
      yaxis: { gridcolor: '#232c3b', title: 'price', titlefont: { size: 11 } },
    }), plotlyConfig);

    this.readout.set('initial spread', (r.asks[0] - r.bids[0]).toFixed(3));
    this.readout.set('final mid', mid[mid.length - 1].toFixed(3));
    this.readout.set('truth', String(this.params.vTrue));
  }
  destroy() {}
}
