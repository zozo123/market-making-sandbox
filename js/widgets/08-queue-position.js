// Section 8: queue position. As you sit deeper in the FIFO queue at a price level,
// fill probability falls but conditional adverse selection drops too.
import { mulberry32 } from '../sim/rng.js';
import { makeSlider, makeReadout, makeButton } from '../ui/slider.js';
import { $controls, $viz, plotlyTheme, plotlyConfig, spinner } from '../ui/card.js';

// Simulate: at our level, queue ahead has size Q. Market eats r ~ Exp(meanEat) per arrival.
// Arrivals come at rate λ_arr; after k_clear arrivals, the level is "cleared" and price moves
// adversely by adverseTick. Estimate P(fill before clear) and E[P&L | fill] for various Q.
function simulate({ Q, meanEat, kClearMean, adverseTick, halfSpread, sims, seed }) {
  const rng = mulberry32(seed);
  let fills = 0, pnlSum = 0, pnlSumSq = 0;
  for (let i = 0; i < sims; i++) {
    let remainingAhead = Q;
    let arrivals = 0;
    const kClear = Math.max(1, Math.floor(kClearMean + (rng() - 0.5) * kClearMean));
    let filled = false;
    while (arrivals < kClear * 5) {
      arrivals++;
      const eat = meanEat * (-Math.log(1 - rng()));
      if (eat >= remainingAhead) { filled = true; break; }
      remainingAhead -= eat;
      if (arrivals >= kClear) break; // level cleared without reaching us
    }
    if (filled) {
      fills++;
      // P&L = halfSpread - (adverse-selection cost on fills near clear)
      // If we filled close to the clear point, we got adversely selected.
      const closeToClear = (arrivals / kClear);
      const adv = closeToClear * adverseTick;
      const p = halfSpread - adv;
      pnlSum += p; pnlSumSq += p * p;
    }
  }
  const fillRate = fills / sims;
  const mean = fills > 0 ? pnlSum / fills : 0;
  const std = fills > 0 ? Math.sqrt(pnlSumSq / fills - mean * mean) : 0;
  return { fillRate, condMean: mean, condStd: std };
}

export default class QueuePosition {
  constructor(section) { this.section = section; }

  init() {
    const controls = $controls(this.section);
    const viz = $viz(this.section);

    this.params = { meanEat: 25, kClear: 6, adverseTick: 0.4, halfSpread: 0.5, sims: 3000 };

    const sa = makeSlider({ label: 'adverse-selection tick',    min: 0.05, max: 1, step: 0.05, value: this.params.adverseTick, format: (v) => v.toFixed(2), onChange: (v) => { this.params.adverseTick = v; this.run(); } });
    const sh = makeSlider({ label: 'half-spread δ',              min: 0.1, max: 1.5, step: 0.05, value: this.params.halfSpread, format: (v) => v.toFixed(2), onChange: (v) => { this.params.halfSpread = v; this.run(); } });
    const sk = makeSlider({ label: 'mean arrivals to clear',      min: 2, max: 14, step: 1, value: this.params.kClear, format: (v) => v.toFixed(0), onChange: (v) => { this.params.kClear = v; this.run(); } });

    this.readout = makeReadout([
      { key: 'best Q*',         value: '—' },
      { key: 'best E[P&L]',     value: '—', cls: 'good' },
    ]);

    const runBtn = makeButton('re-run', () => this.run());

    controls.appendChild(sa.el);
    controls.appendChild(sh.el);
    controls.appendChild(sk.el);
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
      const Qs = [];
      for (let q = 0; q <= 300; q += 10) Qs.push(q);
      const fr = [], cond = [], total = [];
      for (const Q of Qs) {
        const r = simulate({ Q, kClearMean: this.params.kClear, ...this.params, seed: 19000 + Q });
        fr.push(r.fillRate);
        cond.push(r.condMean);
        total.push(r.fillRate * r.condMean);
      }
      const bestI = total.indexOf(Math.max(...total));

      Plotly.react(this.plotEl, [
        { x: Qs, y: fr,    yaxis: 'y',  type: 'scatter', mode: 'lines', name: 'fill rate',       line: { color: '#fbbf24', width: 2 } },
        { x: Qs, y: cond,  yaxis: 'y2', type: 'scatter', mode: 'lines', name: 'E[P&L | fill]',   line: { color: '#fb7185', width: 2 } },
        { x: Qs, y: total, yaxis: 'y2', type: 'scatter', mode: 'lines', name: 'E[P&L]',          line: { color: '#2dd4bf', width: 3 } },
        { x: [Qs[bestI]], y: [total[bestI]], yaxis: 'y2', type: 'scatter', mode: 'markers', marker: { color: '#2dd4bf', size: 10, symbol: 'circle-open', line: { width: 2 } }, name: 'best Q' },
      ], plotlyTheme({
        showlegend: true,
        legend: { x: 0.55, y: 0.98, font: { color: '#8b97ad', size: 10 } },
        xaxis: { gridcolor: '#232c3b', title: 'queue depth ahead Q', titlefont: { size: 11 } },
        yaxis: { gridcolor: '#232c3b', title: 'fill rate', side: 'left', titlefont: { size: 11 } },
        yaxis2: { overlaying: 'y', side: 'right', title: 'P&L', titlefont: { size: 11 }, gridcolor: 'rgba(0,0,0,0)' },
      }), plotlyConfig);

      this.readout.set('best Q*', String(Qs[bestI]));
      this.readout.set('best E[P&L]', total[bestI].toFixed(3), 'v good');
      spinner(viz, false);
    });
  }

  destroy() {}
}
