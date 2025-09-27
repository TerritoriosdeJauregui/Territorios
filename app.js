// ==========================================================
// app.js (VERSIÓN FINAL)
// ==========================================================

// Funciones de utilidad que no dependen del DOM
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const copy = (t) => navigator.clipboard?.writeText(t).catch(() => {});

// La función principal que se ejecuta DESPUÉS del login exitoso
function initializeApp() {
  
  // --- PREPARACIÓN (Ahora dentro de initializeApp) ---
  
  // Helpers del DOM
  const $ = (q) => document.querySelector(q);
  const $$ = (q) => Array.from(document.querySelectorAll(q));

  // Elementos principales de la página
  const grid = $('#grid');
  const empty = $('#empty');
  
  // Lógica del Tema (claro/oscuro)
  const setTheme = (t) => { document.documentElement.setAttribute('data-theme', t); localStorage.setItem('theme', t); };
  setTheme(localStorage.getItem('theme') || 'light');
  $('#themeBtn').addEventListener('click', () => { const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light'; setTheme(next); });

  // --- LÓGICA DEL VISOR (LIGHTBOX) ---
  
  const lb = { el: $('#lightbox'), canvas: $('#lbCanvas'), img: $('#lbImg'), title: $('#lbTitle'), download: $('#downloadBtn'), idx: -1, scale: 1, tx: 0, ty: 0, min: 0.2, max: 8, dragging: false, lx: 0, ly: 0 };

  function openViewer(index) {
    const m = MAPS[index];
    if (!m) return;
    lb.idx = index;
    lb.img.src = m.src;
    lb.title.textContent = m.name || m.src;
    lb.download.href = m.src;
    lb.el.classList.add('open');
    lb.el.setAttribute('aria-hidden', 'false');
    lb.img.onload = () => { fitToScreen(); history.replaceState(null, '', `#m=${slug(m.name || m.src)}`); };
  }

  function closeViewer() {
    lb.el.classList.remove('open');
    lb.el.setAttribute('aria-hidden', 'true');
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
  
  // Controles y eventos del visor (ahora se asignan de forma segura)
  $('#closeBtn').addEventListener('click', closeViewer);
  $('#zoomInBtn').addEventListener('click', () => { const r = lb.canvas.getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, 1.2); });
  $('#zoomOutBtn').addEventListener('click', () => { const r = lb.canvas.getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, 1 / 1.2); });
  $('#fitBtn').addEventListener('click', fitToScreen);
  $('#prevBtn').addEventListener('click', () => openViewer((lb.idx - 1 + MAPS.length) % MAPS.length));
  $('#nextBtn').addEventListener('click', () => openViewer((lb.idx + 1) % MAPS.length));
  $('#shareBtn').addEventListener('click', () => {
    const m = MAPS[lb.idx];
    const url = `${location.origin}${location.pathname}#m=${slug(m.name || m.src)}`;
    copy(url);
    const btn = $('#shareBtn');
    const old = btn.textContent;
    btn.textContent = '✅ Copiado';
    setTimeout(() => btn.textContent = old, 1200);
  });
  
  // Gestos (rueda, táctil, mouse)
  lb.canvas.addEventListener('wheel', (e) => { e.preventDefault(); const rect = lb.canvas.getBoundingClientRect(); zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY > 0 ? 0.9 : 1.1); }, { passive: false });
  lb.canvas.style.touchAction = 'none';
  (function enableGestures() { /* ...código de gestos sin cambios... */ const el = lb.canvas, pts = new Map(); let lastCenter = null, lastDist = 0; const getCenter = () => { const a = [...pts.values()]; return { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 }; }; const getDist = () => { const a = [...pts.values()]; return Math.hypot(a[1].x - a[0].x, a[1].y - a[0].y); }; if ('PointerEvent' in window) { el.addEventListener('pointerdown', e => { el.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 1) { lb.dragging = true; lb.lx = e.clientX; lb.ly = e.clientY; el.style.cursor = 'grabbing'; } else if (pts.size === 2) { lastCenter = getCenter(); lastDist = getDist(); } }); el.addEventListener('pointermove', e => { const p = pts.get(e.pointerId); if (!p) return; p.x = e.clientX; p.y = e.clientY; if (pts.size === 1 && lb.dragging) { const dx = e.clientX - lb.lx, dy = e.clientY - lb.ly; lb.tx += dx; lb.ty += dy; lb.lx = e.clientX; lb.ly = e.clientY; renderTransform(); } else if (pts.size >= 2) { const c = getCenter(), d = getDist(); lb.tx += (c.x - lastCenter.x); lb.ty += (c.y - lastCenter.y); lastCenter = c; const rect = el.getBoundingClientRect(); const factor = d / lastDist; lastDist = d; zoomAt(c.x - rect.left, c.y - rect.top, factor); } }); ['pointerup', 'pointercancel', 'pointerleave', 'pointerout'].forEach(t => el.addEventListener(t, e => { pts.delete(e.pointerId); if (pts.size === 0) { lb.dragging = false; el.style.cursor = 'default'; } })); } el.addEventListener('dblclick', e => { const r = el.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, 1.4); }); let lastTap = 0; el.addEventListener('touchend', e => { const now = Date.now(); if (now - lastTap < 300 && e.changedTouches[0]) { const t = e.changedTouches[0]; const r = el.getBoundingClientRect(); zoomAt(t.clientX - r.left, t.clientY - r.top, 1.4); } lastTap = now; }, { passive: true }); })();
  
  // Teclado y hash
  window.addEventListener('keydown', (e) => {
    if (!$('#lightbox').classList.contains('open')) return;
    if (e.key === 'Escape') closeViewer();
    if (e.key === 'ArrowRight') $('#nextBtn').click();
    if (e.key === 'ArrowLeft') $('#prevBtn').click();
    if (e.key === '+' || e.key === '=') $('#zoomInBtn').click();
    if (e.key === '-') $('#zoomOutBtn').click();
    if (e.key.toLowerCase() === 'f') $('#fitBtn').click();
  });
  function openFromHash() { const m = location.hash.match(/^#m=(.+)$/); if (!m) return; const id = m[1]; const idx = MAPS.findIndex(x => slug(x.name || x.src) === id); if (idx >= 0) openViewer(idx); }

  // --- EJECUCIÓN (Ahora dentro de initializeApp) ---
  
  function renderGrid() {
    grid.innerHTML = '';
    if (!MAPS || !MAPS.length) { empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    MAPS.forEach((m, i) => {
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
        </div>
      `;
      grid.appendChild(card);
    });
    // Se asignan los eventos a los nuevos botones
    $$('.pill[data-view]').forEach(b => b.addEventListener('click', () => openViewer(+b.dataset.view)));
    $$('.pill[data-copy]').forEach(b => b.addEventListener('click', () => {
      const m = MAPS[+b.dataset.copy];
      const url = `${location.origin}${location.pathname}#m=${slug(m.name || m.src)}`;
      copy(url);
      b.textContent = '✅ Copiado';
      setTimeout(() => b.textContent = '🔗 Copiar enlace', 1200);
    }));
  }

  // Llamadas iniciales
  renderGrid();
  openFromHash();
  window.addEventListener('hashchange', openFromHash);
}
