// Small helpers used by every widget.
export function $controls(section) { return section.querySelector('.controls'); }
export function $viz(section) { return section.querySelector('.viz'); }

export function plotlyTheme(extra = {}) {
  return {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { family: 'ui-monospace, "SF Mono", Menlo, monospace', color: '#8b97ad', size: 11 },
    margin: { l: 44, r: 16, t: 16, b: 36 },
    xaxis: { gridcolor: '#232c3b', zerolinecolor: '#2f3b50', linecolor: '#2f3b50', tickcolor: '#2f3b50' },
    yaxis: { gridcolor: '#232c3b', zerolinecolor: '#2f3b50', linecolor: '#2f3b50', tickcolor: '#2f3b50' },
    showlegend: false,
    ...extra,
  };
}

export const plotlyConfig = { displayModeBar: false, responsive: true };

export function spinner(viz, on) {
  let s = viz.querySelector('.spinner');
  if (!s) {
    s = document.createElement('div');
    s.className = 'spinner';
    s.textContent = 'simulating';
    viz.appendChild(s);
  }
  s.classList.toggle('on', !!on);
}
