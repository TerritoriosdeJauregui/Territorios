// ==========================================================
// app.js (VERSIÓN FINAL Y MÁS SEGURA)
// ==========================================================

// La función principal que se ejecuta DESPUÉS del login exitoso
function initializeApp() {
  
  // --- PREPARACIÓN ---
  // Ahora que la página es visible, podemos seleccionar los elementos del DOM de forma segura.
  
  const $ = (q) => document.querySelector(q);
  const $$ = (q) => Array.from(document.querySelectorAll(q));
  
  const grid = $('#grid');
  const empty = $('#empty');
  const lb = {
    el: $('#lightbox'),
    canvas: $('#lbCanvas'),
    img: $('#lbImg'),
    title: $('#lbTitle'),
    download: $('#downloadBtn'),
    idx: -1, scale: 1, tx: 0, ty: 0, min: 0.2, max: 8, dragging: false, lx: 0, ly: 0
  };

  // Funciones de utilidad
  const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const copy = (t) => navigator.clipboard?.writeText(t).catch(() => {});
  
  // Lógica del Tema (claro/oscuro)
  const setTheme = (t) => { document.documentElement.setAttribute('data-theme', t); localStorage.setItem('theme', t); };
  setTheme(localStorage.getItem('theme') || 'light');
  $('#themeBtn').addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    setTheme(next);
  });

  // --- LÓGICA DEL RENDERIZADO ---
  function renderGrid() {
    grid.innerHTML = '';
    if (!window.MAPS || !window.MAPS.length) {
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    
    window.MAPS.forEach((m, i) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.dataset.id = slug(m.name || m.src);
      const thumbSrc = m.thumb || m.src;
      card.innerHTML = `
        <div class="thumb"><img src="${thumbSrc}" alt="Vista previa - ${m.name}" loading="lazy" /></div>
        <div class="meta">
          <div class="name">${m.name}</div>
          <div class="row">
            <button class="pill primary" data-view="${i}">👁️ Ver</button>
            <a class="pill" href="${m.src}" download>⬇️ Descargar</a>
            <button class="pill" data-copy="${i}">🔗 Copiar enlace</button>
          </div>
        </div>`;
      grid.appendChild(card);
    });

    $$('.pill[data-view]').forEach(b => b.addEventListener('click', () => openViewer(+b.dataset.view)));
    $$('.pill[data-copy]').forEach(b => b.addEventListener('click', () => {
      const m = window.MAPS[+b.dataset.copy];
      const url = `${location.origin}${location.pathname}#m=${slug(m.name || m.src)}`;
      copy(url);
      b.textContent = '✅ Copiado';
      setTimeout(() => b.textContent = '🔗 Copiar enlace', 1200);
    }));
  }

  // --- LÓGICA DEL VISOR (LIGHTBOX) ---
  function openViewer(index) {
    const m = window.MAPS[index];
    if (!m) return;
    lb.idx = index;
    lb.img.src = m.src;
    lb.title.textContent = m.name || m.src;
    lb.download.href = m.src;
    lb.el.classList.add('open');
    lb.img.onload = () => { fitToScreen(); history.replaceState(null, '', `#m=${slug(m.name || m.src)}`); };
  }

  function closeViewer() {
    lb.el.classList.remove('open');
    if (location.hash.startsWith('#m=')) history.replaceState(null, '', location.pathname);
  }

  function fitToScreen() {
    if (!lb.img.naturalWidth) return;
    const cw = lb.canvas.clientWidth, ch = lb.canvas.clientHeight, iw = lb.img.naturalWidth, ih = lb.img.naturalHeight;
    const s = Math.min(cw / iw, ch / ih, 1);
    lb.scale = s;
    lb.tx = (cw - iw * s) / 2;
    lb.ty = (ch - ih * s) / 2;
    renderTransform();
  }

  function renderTransform() { lb.img.style.transform = `translate(${lb.tx}px, ${lb.ty}px) scale(${lb.scale})`; }

  function zoomAt(mx, my, factor) {
    const ns = clamp(lb.scale * factor, lb.min, lb.max), ratio = ns / lb.scale;
    lb.tx = mx - (mx - lb.tx) * ratio;
    lb.ty = my - (my - lb.ty) * ratio;
    lb.scale = ns;
    renderTransform();
  }

  $('#closeBtn').addEventListener('click', closeViewer);
  $('#zoomInBtn').addEventListener('click', () => { const r = lb.canvas.getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, 1.2); });
  $('#zoomOutBtn').addEventListener('click', () => { const r = lb.canvas.getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, 1 / 1.2); });
  $('#fitBtn').addEventListener('click', fitToScreen);
  $('#prevBtn').addEventListener('click', () => openViewer((lb.idx - 1 + window.MAPS.length) % window.MAPS.length));
  $('#nextBtn').addEventListener('click', () => openViewer((lb.idx + 1) % window.MAPS.length));
  $('#shareBtn').addEventListener('click', () => {
    const m = window.MAPS[lb.idx];
    const url = `${location.origin}${location.pathname}#m=${slug(m.name || m.src)}`;
    copy(url); const btn = $('#shareBtn'); const old = btn.textContent; btn.textContent = '✅ Copiado'; setTimeout(()=> btn.textContent = old, 1200);
  });
  
  // Gestos (rueda, táctil, mouse)
  lb.canvas.addEventListener('wheel', (e) => { e.preventDefault(); const rect = lb.canvas.getBoundingClientRect(); zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY > 0 ? 0.9 : 1.1); }, { passive: false });
  // (El código de gestos es largo y no cambia, lo he omitido para brevedad pero debe estar aquí)

  // Teclado y hash
  window.addEventListener('keydown', (e) => {
    if (!lb.el.classList.contains('open')) return;
    if (e.key === 'Escape') closeViewer();
    if (e.key === 'ArrowRight') $('#nextBtn').click();
    if (e.key === 'ArrowLeft') $('#prevBtn').click();
  });

  function openFromHash() {
    const m = location.hash.match(/^#m=(.+)$/);
    if (!m) return;
    const id = m[1];
    const idx = window.MAPS.findIndex(x => slug(x.name || x.src) === id);
    if (idx >= 0) openViewer(idx);
  }

  // --- EJECUCIÓN ---
  renderGrid();
  openFromHash();
  window.addEventListener('hashchange', openFromHash);
}
