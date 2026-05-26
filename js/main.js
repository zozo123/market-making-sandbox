// Lazy-init widgets on scroll. Each section has data-widget="<slug>" matching js/widgets/<slug>.js.

const loaded = new WeakMap();

async function mount(section) {
  if (loaded.has(section)) return;
  const slug = section.dataset.widget;
  if (!slug) return;
  loaded.set(section, true);
  try {
    const mod = await import(`./widgets/${slug}.js`);
    const Widget = mod.default;
    if (!Widget) return;
    const w = new Widget(section);
    w.init();
  } catch (err) {
    console.error(`[widget ${slug}]`, err);
    const viz = section.querySelector('.viz');
    if (viz) viz.innerHTML = `<div style="padding:24px;color:var(--text-muted);font-family:var(--mono);font-size:12px">widget failed to load: ${err.message}</div>`;
  }
}

const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) mount(e.target);
}, { rootMargin: '200px 0px' });

document.querySelectorAll('section.card[data-widget]').forEach((el) => io.observe(el));

// Render KaTeX once it loads.
function renderMath() {
  if (window.renderMathInElement) {
    window.renderMathInElement(document.body, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
      ],
      throwOnError: false,
    });
  } else {
    setTimeout(renderMath, 50);
  }
}
renderMath();
