/* ============================================================
   Neptune — interactions
   - drifting + background
   - reveal-on-scroll sliding animations
   - download dropdown + OS detection
   - draggable feature panels
   ============================================================ */
(function () {
  'use strict';

  /* ---------------------------------------------------------
     CONFIG — edit these if your release asset names change
  --------------------------------------------------------- */
  const DOWNLOADS = {
    windows: 'https://github.com/TheOnly-Coder/neptune/releases/latest/download/Neptune.exe',
    linux:   'https://github.com/TheOnly-Coder/neptune/releases/latest/download/Neptune',
    all:     'https://github.com/TheOnly-Coder/neptune/releases'
  };
  const RELEASES_API = 'https://github.com/TheOnly-Coder/neptune/releases'; // fallback page

  /* ---------------------------------------------------------
     1. DRIFTING + BACKGROUND
  --------------------------------------------------------- */
  function initPlusField() {
    const field = document.getElementById('plusField');
    if (!field) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const COUNT = window.innerWidth < 760 ? 18 : 34;
    const frag = document.createDocumentFragment();

    for (let i = 0; i < COUNT; i++) {
      const el = document.createElement('span');
      el.className = 'plus';
      el.textContent = '+';
      el.setAttribute('aria-hidden', 'true');

      const size = 12 + Math.random() * 46;            // 12 - 58px
      const top = Math.random() * 100;                  // %
      const duration = 16 + Math.random() * 26;         // 16 - 42s
      const delay = -Math.random() * duration;          // start mid-cycle
      const drift = (Math.random() - 0.5) * 120;        // vertical drift
      const opacity = 0.18 + Math.random() * 0.42;      // 0.18 - 0.6
      const weight = Math.random() > 0.5 ? 700 : 400;

      el.style.fontSize = size + 'px';
      el.style.top = top + '%';
      el.style.animationDuration = duration + 's';
      el.style.animationDelay = delay + 's';
      el.style.fontWeight = weight;
      el.style.setProperty('--plus-drift', drift + 'px');
      el.style.setProperty('--plus-opacity', opacity);
      // stagger color slightly between blue-light and cyan
      if (Math.random() > 0.78) el.style.color = 'var(--cyan)';

      frag.appendChild(el);
    }
    field.appendChild(frag);
  }

  /* ---------------------------------------------------------
     2. REVEAL ON SCROLL (sliding animations)
  --------------------------------------------------------- */
  function initReveals() {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || els.length === 0) {
      els.forEach(e => e.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const delay = entry.target.getAttribute('data-reveal-delay') || 0;
          entry.target.style.setProperty('--reveal-delay', delay + 'ms');
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    els.forEach(el => io.observe(el));
  }

  /* ---------------------------------------------------------
     3. NAV scroll state
  --------------------------------------------------------- */
  function initNav() {
    const nav = document.getElementById('nav');
    if (!nav) return;
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------------------------------------------------------
     4. DOWNLOAD DROPDOWN + OS DETECTION
  --------------------------------------------------------- */
  function detectOS() {
    const ua = (navigator.userAgent || '').toLowerCase();
    const platform = (navigator.platform || '').toLowerCase();
    if (/win/.test(platform) || /windows/.test(ua)) return 'windows';
    if (/linux/.test(platform) || /linux/.test(ua) || /x11/.test(ua) || /cros/.test(ua)) return 'linux';
    if (/mac/.test(platform) || /macintosh|mac os x|iphone|ipad|ipod/.test(ua)) return 'mac';
    return 'windows';
  }

  function initDownload() {
    const wrap = document.querySelector('.download-wrap');
    const btn = document.getElementById('downloadBtn');
    const menu = document.getElementById('downloadMenu');
    if (!wrap || !btn || !menu) return;

    const os = detectOS();
    const recWin = document.getElementById('recWindows');
    const recLin = document.getElementById('recLinux');
    if (os === 'linux') {
      recWin && recWin.setAttribute('hidden', '');
    } else {
      recLin && recLin.setAttribute('hidden', '');
    }

    // Open / close
    const close = () => { wrap.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); };
    const open = () => { wrap.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); };

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      wrap.classList.contains('is-open') ? close() : open();
    });

    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });

    // Intercept the platform links: if the direct download 404s (no release yet),
    // gracefully fall back to the releases page so the user isn't stuck on a GH 404.
    menu.querySelectorAll('.dl-option[data-os]').forEach(link => {
      link.addEventListener('click', (e) => {
        const url = link.getAttribute('href');
        // Try a HEAD fetch to verify the asset exists; if not, route to releases page.
        e.preventDefault();
        fetch(url, { method: 'HEAD', redirect: 'follow' })
          .then(r => {
            if (r.ok) {
              window.location.href = url;
            } else {
              window.open(RELEASES_API, '_blank', 'noopener');
            }
          })
          .catch(() => {
            // CORS may block reading the status — assume the asset is fine and just navigate.
            window.location.href = url;
          });
      });
    });
  }

  /* ---------------------------------------------------------
     5. DRAGGABLE PANELS
  --------------------------------------------------------- */
  function initDraggablePanels() {
    const field = document.getElementById('panelField');
    if (!field) return;
    const panels = Array.from(field.querySelectorAll('.panel'));
    const resetBtn = document.getElementById('resetPanels');

    // Remember layout per slot index using transforms.
    const layout = new Map(); // panel -> {x, y}
    const initial = new Map();

    panels.forEach(p => {
      initial.set(p, { x: 0, y: 0 });
      layout.set(p, { x: 0, y: 0 });
      applyTransform(p);
      p.addEventListener('pointerdown', onDown);
    });

    function applyTransform(p) {
      const { x, y } = layout.get(p);
      p.style.transform = `translate(${x}px, ${y}px)`;
    }

    let active = null;
    let startPointer = { x: 0, y: 0 };
    let startLayout = { x: 0, y: 0 };
    let moved = false;
    let pointerId = null;

    function onDown(e) {
      // ignore clicks on interactive children (none here, but future-proof)
      if (e.target.closest('a, button, summary')) return;
      active = e.currentTarget;
      pointerId = e.pointerId;
      moved = false;
      startPointer = { x: e.clientX, y: e.clientY };
      startLayout = { ...layout.get(active) };
      active.classList.remove('placed');
      active.classList.add('dragging');
      try { active.setPointerCapture(pointerId); } catch (_) {}
      active.addEventListener('pointermove', onMove);
      active.addEventListener('pointerup', onUp);
      active.addEventListener('pointercancel', onUp);
      e.preventDefault();
    }

    function onMove(e) {
      if (!active || e.pointerId !== pointerId) return;
      const dx = e.clientX - startPointer.x;
      const dy = e.clientY - startPointer.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
      const nx = startLayout.x + dx;
      const ny = startLayout.y + dy;
      layout.set(active, { x: nx, y: ny });
      applyTransform(active);
    }

    function onUp(e) {
      if (!active || e.pointerId !== pointerId) return;
      const p = active;
      try { p.releasePointerCapture(pointerId); } catch (_) {}
      p.removeEventListener('pointermove', onMove);
      p.removeEventListener('pointerup', onUp);
      p.removeEventListener('pointercancel', onUp);
      p.classList.remove('dragging');
      p.classList.add('placed');
      active = null;
      pointerId = null;
    }

    // Reset
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        panels.forEach(p => {
          layout.set(p, { x: 0, y: 0 });
          p.classList.add('placed');
          applyTransform(p);
        });
      });
    }

    // Keep panels inside reasonable bounds on resize
    let resizeT;
    window.addEventListener('resize', () => {
      clearTimeout(resizeT);
      resizeT = setTimeout(() => {
        panels.forEach(p => {
          const { x, y } = layout.get(p);
          // clamp lightly
          const maxX = window.innerWidth * 0.4;
          const clamped = {
            x: Math.max(-maxX, Math.min(maxX, x)),
            y: Math.max(-200, Math.min(window.innerHeight * 0.5, y))
          };
          layout.set(p, clamped);
          applyTransform(p);
        });
      }, 200);
    });
  }

  /* ---------------------------------------------------------
     6. MISC — footer year
  --------------------------------------------------------- */
  function initYear() {
    const y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
  }

  /* ---------------------------------------------------------
     BOOT
  --------------------------------------------------------- */
  function boot() {
    initPlusField();
    initReveals();
    initNav();
    initDownload();
    initDraggablePanels();
    initYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
