// Labeled range slider with live readout. Returns an element + a get/set/onChange API.
export function makeSlider({ label, min, max, step, value, format = (v) => v.toFixed(2), onChange }) {
  const el = document.createElement('div');
  el.className = 'slider';
  el.innerHTML = `
    <div class="row">
      <span class="label">${label}</span>
      <span class="val"></span>
    </div>
    <input type="range" min="${min}" max="${max}" step="${step}" value="${value}" />
  `;
  const input = el.querySelector('input');
  const val = el.querySelector('.val');
  const update = (v) => { val.textContent = format(v); };
  update(value);
  input.addEventListener('input', () => {
    const v = parseFloat(input.value);
    update(v);
    if (onChange) onChange(v);
  });
  return {
    el,
    get value() { return parseFloat(input.value); },
    set value(v) { input.value = v; update(v); },
  };
}

export function makeButton(label, onClick, { primary = false } = {}) {
  const b = document.createElement('button');
  b.className = 'btn' + (primary ? ' primary' : '');
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

export function makeReadout(rows) {
  // rows: [{ key, value, cls? }]
  const el = document.createElement('div');
  el.className = 'readout';
  const refs = {};
  for (const r of rows) {
    const k = document.createElement('div'); k.className = 'k'; k.textContent = r.key;
    const v = document.createElement('div'); v.className = 'v' + (r.cls ? ' ' + r.cls : '');
    v.textContent = r.value;
    refs[r.key] = v;
    el.appendChild(k);
    el.appendChild(v);
  }
  return { el, set(key, value, cls) {
    if (!refs[key]) return;
    refs[key].textContent = value;
    if (cls !== undefined) refs[key].className = 'v ' + cls;
  }};
}
