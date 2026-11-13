// Preloader — short, numbered, never blocks longer than ~1.1s
(function preloader() {
  const pre = document.getElementById('preloader');
  const countEl = document.getElementById('preloaderCount');
  if (!pre) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function hide() {
    document.body.classList.remove('is-loading');
    pre.classList.add('is-hidden');
    setTimeout(() => pre.remove(), 700);
  }
  if (reduced) { hide(); return; }
  let n = 1;
  const tick = setInterval(() => {
    n++;
    if (countEl) countEl.textContent = String(Math.min(n, 8)).padStart(2, '0');
  }, 110);
  window.addEventListener('load', () => {
    clearInterval(tick);
    setTimeout(hide, 350);
  });
  setTimeout(() => { clearInterval(tick); hide(); }, 1600);
})();

// Adaptive nav: the bar is always transparent; each corner samples what is
// painted behind it and flips its text tone so it stays legible on any
// section. Sections declare their background with data-nav="dark"; anything
// without it is treated as light.
const navbar = document.getElementById('navbar');
(function adaptiveNav() {
  if (!navbar) return;
  const IGNORE = '#navbar, .scroll-rail, .preloader, .mobile-overlay, .project-cursor-preview, .skip-link';
  function bgAt(x, y) {
    const stack = document.elementsFromPoint(x, y);
    for (const el of stack) {
      if (el.closest(IGNORE)) continue;
      const host = el.closest('[data-nav]');
      return host && host.getAttribute('data-nav') === 'dark' ? 'dark' : 'light';
    }
    return 'light';
  }
  function sample() {
    navbar.setAttribute('data-left-bg', bgAt(70, 56));
    navbar.setAttribute('data-right-bg', bgAt(window.innerWidth - 70, 56));
  }
  // Sample on scroll/resize/load (so it is never stale) and on a light frame
  // loop (so it also follows scrubbed animations that keep moving after the
  // wheel stops, e.g. the dome still settling).
  let last = 0;
  function tick(t) {
    if (t - last > 90) { last = t; sample(); }
    requestAnimationFrame(tick);
  }
  window.addEventListener('scroll', sample, { passive: true });
  window.addEventListener('resize', sample);
  window.addEventListener('load', sample);
  sample();
  requestAnimationFrame(tick);
})();

// ─── DOME HEADLINE: one line, set on an arc that follows the dome's own curve ───
// The dome is an ellipse (148vw wide, capped at 2200px; 200vw on mobile) whose
// curved top is 60vh tall. We measure the dome's real edge drop at the text's
// end points and bend a circular arc to match, so the line stays parallel to
// the edge and well inside it at any screen size. Font size is chosen so the
// line spans ~90% of the viewport without squeezing glyphs past ~20%.
(function domeText() {
  const svg = document.getElementById('domeCurve');
  const path = document.getElementById('domeArc');
  const tp = document.getElementById('domeArcText');
  if (!svg || !path || !tp) return;
  const label = svg.querySelector('.dome-curve-label');

  function layout() {
    const W = window.innerWidth, Hv = window.innerHeight;
    // A tab opened in the background can report a 0x0 viewport; bail and retry
    // rather than writing NaN into the path.
    if (!W || !Hv) return false;
    const mobile = W <= 768;
    const domeW = Math.min((mobile ? 1.18 : 1.04) * W, 2200);
    const a = domeW / 2, b = 0.9 * Hv;                 // dome ellipse semi-axes
    document.documentElement.style.setProperty('--dome-a', a + 'px');
    document.documentElement.style.setProperty('--dome-b', b + 'px');
    const span = W * (mobile ? 0.8 : 0.66);                              // target text length
    const x0 = span / 2;                               // text half-length
    const edgeDrop = (x) => b * (1 - Math.sqrt(Math.max(0, 1 - Math.pow(x / a, 2))));
    const D = Math.max(8, edgeDrop(x0));               // edge drop at the text ends
    const R = Math.max((x0 * x0 + D * D) / (2 * D), x0 * 1.06);

    // Size the type: measure natural width per px of font, then aim for <=20% squeeze
    tp.removeAttribute('textLength');
    label.style.fontSize = '100px';
    const k = tp.getComputedTextLength() / 100;        // natural length per 1px font-size
    const fs = Math.min(W * (mobile ? 0.1 : 0.09), span / (0.8 * k));
    label.style.fontSize = fs + 'px';
    label.style.letterSpacing = (fs * 0.05) + 'px';

    const y0 = fs * 0.95;                              // apex baseline
    const xp = Math.min(W * 0.53, R * 0.98);           // arc runs a little past the text
    const yp = y0 + (R - Math.sqrt(R * R - xp * xp));
    path.setAttribute('d', `M ${W / 2 - xp} ${yp} A ${R} ${R} 0 0 1 ${W / 2 + xp} ${yp}`);

    const H = y0 + fs * 0.32;                          // box ends just under the apex line
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    document.documentElement.style.setProperty('--dome-svg-h', H + 'px');

    const natural = k * fs + 0.05 * fs * 27;
    tp.setAttribute('textLength', span);
    tp.setAttribute('lengthAdjust', span < natural ? 'spacingAndGlyphs' : 'spacing');
    return true;
  }

  // Retry each frame until the viewport has real dimensions (max ~2s)
  (function boot(tries) { if (!layout() && tries < 120) requestAnimationFrame(() => boot(tries + 1)); })(0);
  window.addEventListener('load', layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);  // re-measure once the serif loads
  let t; window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { layout(); if (window.ScrollTrigger) ScrollTrigger.refresh(); }, 120); });
})();

// Mobile menu
function toggleMenu() {
  const menu = document.getElementById('mobileMenu');
  if (menu) menu.classList.toggle('open');
  if (navbar) navbar.classList.toggle('menu-open', !!(menu && menu.classList.contains('open')));
}

// Active nav link on scroll
const sections = document.querySelectorAll('main section[id]');
const navLinks = document.querySelectorAll('.nav-links a:not(.nav-quote)');
window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(section => {
    const top = section.offsetTop - 130;
    if (window.scrollY >= top) current = section.getAttribute('id');
  });
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === '#' + current) link.classList.add('active');
  });
}, { passive: true });

// Scroll reveal
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Stagger grid children on reveal (pure CSS var — no animation library dependency).
// Called after dynamic sections render so generated rows get delays too.
function applyStagger() {
  document.querySelectorAll('.services-list-col, .projects-list, .circle-track').forEach(grid => {
    grid.querySelectorAll(':scope > .reveal').forEach((el, i) => {
      el.style.setProperty('--reveal-delay', (i * 0.08) + 's');
    });
  });
}

// ─── PROJECTS ───
// EDIT HERE to add real projects. Each entry renders one row.
// Set `image` to a real photo path (e.g. 'assets/photos/my-project.jpg') and the
// hover preview will show that photo; leave it empty ('') and the row keeps an
// honest "photo to be added" placeholder instead of inventing imagery.
const PROJECTS = [
  { title: 'Project 1', category: '', location: '', year: '', image: 'assets/projects/p01.jpg', thumb: 'assets/projects/p01-t.jpg', w: 1650, h: 2200, description: '' },
  { title: 'Project 2', category: '', location: '', year: '', image: 'assets/projects/p02.jpg', thumb: 'assets/projects/p02-t.jpg', w: 2200, h: 1650, description: '' },
  { title: 'Project 3', category: '', location: '', year: '', image: 'assets/projects/p03.jpg', thumb: 'assets/projects/p03-t.jpg', w: 1650, h: 2200, description: '' },
  { title: 'Project 4', category: '', location: '', year: '', image: 'assets/projects/p04.jpg', thumb: 'assets/projects/p04-t.jpg', w: 1650, h: 2200, description: '' },
  { title: 'Project 5', category: '', location: '', year: '', image: 'assets/projects/p05.jpg', thumb: 'assets/projects/p05-t.jpg', w: 1650, h: 2200, description: '' },
  { title: 'Project 6', category: '', location: '', year: '', image: 'assets/projects/p06.jpg', thumb: 'assets/projects/p06-t.jpg', w: 1650, h: 2200, description: '' },
  { title: 'Project 7', category: '', location: '', year: '', image: 'assets/projects/p07.jpg', thumb: 'assets/projects/p07-t.jpg', w: 2200, h: 1846, description: '' },
  { title: 'Project 8', category: '', location: '', year: '', image: 'assets/projects/p08.jpg', thumb: 'assets/projects/p08-t.jpg', w: 2200, h: 1521, description: '' },
  { title: 'Project 9', category: '', location: '', year: '', image: 'assets/projects/p09.jpg', thumb: 'assets/projects/p09-t.jpg', w: 2200, h: 1490, description: '' },
  { title: 'Project 10', category: '', location: '', year: '', image: 'assets/projects/p10.jpg', thumb: 'assets/projects/p10-t.jpg', w: 1237, h: 2200, description: '' },
  { title: 'Project 11', category: '', location: '', year: '', image: 'assets/projects/p11.jpg', thumb: 'assets/projects/p11-t.jpg', w: 1290, h: 1718, description: '' },
  { title: 'Project 12', category: '', location: '', year: '', image: 'assets/projects/p12.jpg', thumb: 'assets/projects/p12-t.jpg', w: 1290, h: 1715, description: '' },
  { title: 'Project 13', category: '', location: '', year: '', image: 'assets/projects/p13.jpg', thumb: 'assets/projects/p13-t.jpg', w: 838, h: 896, description: '' },
  { title: 'Project 14', category: '', location: '', year: '', image: 'assets/projects/p14.jpg', thumb: 'assets/projects/p14-t.jpg', w: 444, h: 536, description: '' },
  { title: 'Project 15', category: '', location: '', year: '', image: 'assets/projects/p15.jpg', thumb: 'assets/projects/p15-t.jpg', w: 426, h: 544, description: '' },
  { title: 'Project 16', category: '', location: '', year: '', image: 'assets/projects/p16.jpg', thumb: 'assets/projects/p16-t.jpg', w: 666, h: 410, description: '' },
  { title: 'Project 17', category: '', location: '', year: '', image: 'assets/projects/p17.jpg', thumb: 'assets/projects/p17-t.jpg', w: 662, h: 402, description: '' },
  { title: 'Project 18', category: '', location: '', year: '', image: 'assets/projects/p18.jpg', thumb: 'assets/projects/p18-t.jpg', w: 920, h: 596, description: '' },
  { title: 'Project 19', category: '', location: '', year: '', image: 'assets/projects/p19.jpg', thumb: 'assets/projects/p19-t.jpg', w: 808, h: 520, description: '' }
];

(function renderProjects() {
  const list = document.getElementById('projectsList');
  if (!list) return;
  list.innerHTML = PROJECTS.map((p, i) => {
    const idx = String(i + 1).padStart(2, '0');
    const title = p.title || '[ Project Name ]';
    const cat = p.category || '[ Project Type ]';
    const loc = [p.location, p.year].filter(Boolean).join(' · ') || '[ Location ]';
    return `<article class="project-row reveal" data-preview-img="${p.image || ''}">
      <span class="pr-index">${idx}</span>
      <div class="pr-name"><h3>${title}</h3><span class="pr-type">${cat}</span></div>
      <span class="pr-loc">${loc}</span>
      <span class="pr-arrow" aria-hidden="true">&rarr;</span>
    </article>`;
  }).join('');
  applyStagger();
})();


// ─── HERO FILM: construction → villa → interior, crossfading, looping ───
(function heroFilm() {
  const a = document.getElementById('heroVideoA'), b = document.getElementById('heroVideoB');
  if (!a || !b) return;
  const conn = navigator.connection || {};
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || conn.saveData) return;
  const CLIPS = ['assets/generated/hero/clip1-villa.mp4?v=2', 'assets/generated/hero/clip2-interior.mp4?v=2'];
  let i = 0, cur = a, idle = b;
  function load(v, n) { v.src = CLIPS[n % CLIPS.length]; v.load(); }
  function start(v) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
  load(cur, 0);
  cur.addEventListener('canplay', function first() { cur.removeEventListener('canplay', first); start(cur); cur.classList.add('is-on'); load(idle, 1); }, { once: false });
  function swap() {
    i++;
    const next = idle;
    start(next); next.classList.add('is-on'); cur.classList.remove('is-on');
    const old = cur; cur = next; idle = old;
    setTimeout(() => load(idle, i + 1), 1500);
    cur.onended = swap; 
  }
  a.onended = swap; b.onended = swap;
  // pause the film once the hero is scrolled away
  const io = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { if (cur.paused && cur.readyState > 2) start(cur); } else cur.pause(); }), { threshold: 0.05 });
  io.observe(document.getElementById('home'));
})();

// ─── PROJECTS: immersive scattered gallery ───
// Photos come from the PROJECTS array above (assets/projects). Add title/category/location
// there as the details arrive; empty fields are simply hidden. The gallery lays itself out
// from however many entries exist.
(function projectGallery() {
  const field = document.getElementById('pgField');
  const modal = document.getElementById('pgModal');
  if (!field || !modal) return;
  const items = PROJECTS.map((p, i) => ({
    title: p.title || ('Project ' + (i + 1)), category: p.category || '', location: [p.location, p.year].filter(Boolean).join(' · '),
    image: p.image, thumb: p.thumb || p.image, w: p.w || 1500, h: p.h || 1000
  }));
  field.innerHTML = items.map((p, i) =>
    `<button class="pg-item" type="button" data-i="${i}" aria-label="Open ${p.title}">
      <span class="pg-frame"><img src="${p.thumb}" alt="${p.title}" loading="lazy" decoding="async" />
        <span class="pg-info"><b>${p.title}</b>${p.location ? `<span>${p.location}</span>` : ''}${p.category ? `<span>${p.category}</span>` : ''}</span>
        <span class="pg-cta">View +</span></span>
    </button>`).join('');
  const els = [...field.querySelectorAll('.pg-item')];

  // Seeded random so the "random" arrangement is stable between loads and resizes.
  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function layout() {
    const W = field.clientWidth;
    if (!W) return;
    const mobile = W < 700, tablet = W < 1100;
    const w = mobile ? Math.round(W * 0.46) : tablet ? 280 : 350, h = Math.round(w * 0.72);
    const rand = rng(11);
    const zones = mobile ? [0.0, 1.0] : [0.04, 0.58, 0.30, 0.76, 0.12, 0.48, 0.68, 0.22, 0.54, 0.02, 0.8, 0.36];
    const stepY = mobile ? h * 0.78 : h * 0.6;   // tight: ~4-6 photos on screen at once
    const placed = [];
    let maxY = 0;
    els.forEach((el, i) => {
      let x = zones[i % zones.length] * (W - w) + (rand() - 0.5) * (mobile ? W * 0.04 : W * 0.06);
      x = Math.max(0, Math.min(W - w, x));
      let y = i * stepY + rand() * (mobile ? 24 : 70);
      const gap = mobile ? 14 : 34;
      for (let t = 0; t < 40; t++) {
        const hit = placed.some(r => x < r.x + w + gap && x + w + gap > r.x && y < r.y + h + gap && y + h + gap > r.y);
        if (!hit) break;
        y += 30;
      }
      placed.push({ x, y });
      maxY = Math.max(maxY, y + h);
      el.style.cssText += `;left:${x}px;top:${y}px;width:${w}px;height:${h}px;--d:${(rand() * -9).toFixed(2)}s`;
    });
    field.style.height = (maxY + 40) + 'px';
  }
  layout();
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { layout(); if (window.ScrollTrigger) ScrollTrigger.refresh(); }, 150); });

  // Fade + rise as they enter the viewport
  const io = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { setTimeout(() => e.target.classList.add('in'), Math.random() * 180); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  els.forEach(el => io.observe(el));

  // Bulldozer crosses the fixed background (right to left, blade first) as the section scrolls.
  const dozer = document.getElementById('pgDozer');
  if (dozer && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.fromTo(dozer, { x: () => window.innerWidth * 1.05 }, { x: () => -dozer.offsetWidth * 1.2, ease: 'none',
      scrollTrigger: { trigger: '#projects', start: 'top top', end: 'bottom bottom', scrub: 0.6, invalidateOnRefresh: true } });
  }

  // Continuous background video: load when near, play only while the section is on screen.
  const video = document.getElementById('pgVideo');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (video && !reduce) {
    const src = video.querySelector('source[data-src]');
    const vio = new IntersectionObserver((es) => es.forEach(e => {
      if (e.isIntersecting) {
        if (src && !src.src) { src.src = src.dataset.src; video.load(); }
        const p = video.play(); if (p && p.catch) p.catch(() => {});
      } else video.pause();
    }), { rootMargin: '200px 0px' });
    vio.observe(document.getElementById('projects'));
  }

  // ── Enlarged view: the photo flies from its thumbnail to a large centred frame ──
  const backdrop = document.getElementById('pgBackdrop'), hero = document.getElementById('pgHero');
  const heroImg = document.getElementById('pgHeroImg'), detail = document.getElementById('pgDetail');
  const minBtn = document.getElementById('pgMin');
  const dur = reduce ? 0.01 : 0.75;
  let openEl = null, busy = false;

  function target(p) {
    const vw = window.innerWidth, vh = window.innerHeight, mobile = vw < 700;
    const infoH = mobile ? 120 : 100, ar = (p && p.w && p.h) ? p.w / p.h : 1.5;
    const maxW = Math.min(vw * (mobile ? 0.92 : 0.82), 1280), maxH = vh - infoH - (mobile ? 80 : 110);
    let w = maxW, h = w / ar;
    if (h > maxH) { h = maxH; w = h * ar; }
    const left = (vw - w) / 2, top = Math.max(60, (vh - h - infoH) / 2);
    return { left, top, w, h, infoTop: top + h + 18 };
  }
  function place(el, r) { gsap.set(el, { left: r.left, top: r.top, width: r.width, height: r.height }); }

  function open(el) {
    if (busy || openEl) return;
    busy = true; openEl = el;
    const p = items[+el.dataset.i], r = el.querySelector('.pg-frame').getBoundingClientRect(), t = target(p);
    heroImg.src = p.image; heroImg.alt = p.title;
    document.getElementById('pgDName').textContent = p.title;
    const setTxt = (id, v) => { const e = document.getElementById(id); e.textContent = v; e.style.display = v ? '' : 'none'; };
    setTxt('pgDLoc', p.location); setTxt('pgDCat', p.category); setTxt('pgDNote', '');
    modal.hidden = false;
    place(hero, r);
    gsap.set(detail, { left: t.left, top: t.infoTop, width: t.w, opacity: 0, y: 10 });
    gsap.set(minBtn, { left: t.left + t.w - minBtn.offsetWidth, top: t.infoTop, opacity: 0 });
    el.classList.add('is-open');
    if (window.__lenis) window.__lenis.stop();
    document.documentElement.style.overflow = 'hidden';
    gsap.to(backdrop, { opacity: 1, duration: dur * 0.7, ease: 'power2.out' });
    gsap.to(hero, { left: t.left, top: t.top, width: t.w, height: t.h, duration: dur, ease: 'power3.inOut',
      onComplete: () => { busy = false; minBtn.focus({ preventScroll: true }); } });
    gsap.to([detail, minBtn], { opacity: 1, y: 0, duration: 0.5, delay: dur * 0.7, ease: 'power2.out' });
  }

  function close() {
    if (busy || !openEl) return;
    busy = true;
    const el = openEl, r = el.querySelector('.pg-frame').getBoundingClientRect();
    gsap.to([detail, minBtn], { opacity: 0, duration: 0.25 });
    gsap.to(backdrop, { opacity: 0, duration: dur * 0.8, ease: 'power2.inOut' });
    gsap.to(hero, { left: r.left, top: r.top, width: r.width, height: r.height, duration: dur, ease: 'power3.inOut',
      onComplete: () => {
        el.classList.remove('is-open'); modal.hidden = true; openEl = null; busy = false;
        document.documentElement.style.overflow = '';
        if (window.__lenis) window.__lenis.start();
        el.focus({ preventScroll: true });
      } });
  }

  els.forEach(el => el.addEventListener('click', () => open(el)));
  minBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  window.addEventListener('resize', () => { if (openEl && !busy) { const t = target(items[+openEl.dataset.i]); place(hero, { left: t.left, top: t.top, width: t.w, height: t.h }); gsap.set(detail, { left: t.left, top: t.infoTop, width: t.w }); gsap.set(minBtn, { left: t.left + t.w - minBtn.offsetWidth, top: t.infoTop }); } });
})();

// ─── SERVICES: full-screen, one at a time (scroll steps through; click jumps) ───
(function servicesFull() {
  const pin = document.getElementById('svxPin');
  if (!pin) return;
  const items = [...pin.querySelectorAll('.svx-item')], bgs = [...pin.querySelectorAll('.svx-bg')];
  const label = document.getElementById('svxLabel'), text = document.getElementById('svxText'), count = document.getElementById('svxCount');
  const DESC = [
    'Full-scale construction of residential and commercial buildings, from foundation to finish.',
    'Private villa builds managed end-to-end, with close client and design-team collaboration.',
    'Ongoing building maintenance covering civil, MEP and finishing trades after handover.',
    'Groundworks, block work and civil construction executed to a consistent site standard.',
    'Structural concrete and steelwork, engineered and executed for long-term integrity.',
    'Tiling, carpentry and detailed finishing carried through to a consistent standard.',
    'Gypsum partitions and ceiling systems, installed with clean, precise detailing.',
    'Interior and exterior painting and decorative finishing for a polished result.'
  ];
  const n = items.length, pad2 = (i) => String(i + 1).padStart(2, '0');
  let cur = 0, pinned = false, st = null;
  function show(i) {
    if (i === cur) return;
    cur = i;
    items.forEach((el, k) => el.classList.toggle('is-active', k === i));
    bgs.forEach((el, k) => el.classList.toggle('is-active', k === i));
    label.innerHTML = items[i].querySelector('.svx-t').innerHTML; text.textContent = DESC[i]; count.textContent = pad2(i) + ' / ' + pad2(n - 1);
    gsap.fromTo([label, text], { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', stagger: 0.08, overwrite: true });
  }
  count.textContent = '01 / ' + pad2(n - 1);
  // Clicking changes the screen immediately; on desktop it also moves the scroll to that
  // service's spot (the scroll handler is paused while that glide runs so it can't undo the click).
  let lock = false, lockT;
  items.forEach((el) => el.addEventListener('click', () => {
    const i = +el.dataset.i;
    show(i);
    if (pinned && st) {
      const y = st.start + (st.end - st.start) * (i / (n - 1)) * 0.999;
      lock = true; clearTimeout(lockT); lockT = setTimeout(() => { lock = false; }, 1300);
      if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1, onComplete: () => { lock = false; } }); else window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }));
  gsap.matchMedia().add('(min-width: 901px)', () => {
    pin.style.setProperty('--n', n); pin.classList.add('is-pinned'); pinned = true;
    st = ScrollTrigger.create({ trigger: pin, start: 'top top', end: 'bottom bottom',
      onUpdate: (self) => { if (!lock) show(Math.min(n - 1, Math.max(0, Math.round(self.progress * (n - 1))))); } });
    return () => { st && st.kill(); st = null; pinned = false; pin.classList.remove('is-pinned'); pin.style.removeProperty('--n'); };
  });
})();

// ─── ABOUT: slow grid drift (the props animate in CSS) ───
(function aboutMotion() {
  const grid = document.querySelector('.ab-grid');
  if (!grid || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  gsap.fromTo(grid, { y: -40 }, { y: 40, ease: 'none', scrollTrigger: { trigger: '#about', start: 'top bottom', end: 'bottom top', scrub: true } });
})();

// ─── PROCESS STAGES ───
// EDIT HERE to update the construction stages shown in the horizontal
// Process section. `video` is optional — set it to a real file and the
// panel will autoplay it (muted/looped) while in view; left blank, the
// panel just shows the poster image.
const PROCESS_STAGES = [
  { title: 'Earthworks', desc: 'The plot is cleared, excavated, and levelled to the depth required for the foundation.', poster: 'assets/generated/stages/p1-earthworks.jpg', video: 'assets/generated/stages/p1-earthworks.mp4' },
  { title: 'Blinding', desc: 'A thin layer of lean concrete is laid to give the foundation a clean, level base to build on.', poster: 'assets/generated/stages/p2-blinding.jpg?v=2', video: 'assets/generated/stages/p2-blinding.mp4?v=2' },
  { title: 'Foundations', desc: 'Reinforcement is fixed and the foundation is cast to carry the full structural load.', poster: 'assets/generated/stages/p3-foundations.jpg?v=2', video: 'assets/generated/stages/p3-foundations.mp4?v=2' },
  { title: 'Columns', desc: 'Vertical columns rise floor by floor, forming the structural grid of the building.', poster: 'assets/generated/stages/p4-columns.jpg', video: 'assets/generated/stages/p4-columns.mp4' },
  { title: 'Slabs', desc: 'Each floor slab is cast in turn, locking the columns together at every level.', poster: 'assets/generated/stages/p5-slabs.jpg', video: 'assets/generated/stages/p5-slabs.mp4' },
  { title: 'Block & Plaster', desc: 'Block walls fill the frame and are plastered to a smooth, consistent finish.', poster: 'assets/generated/stages/p6-blockplaster.jpg', video: 'assets/generated/stages/p6-blockplaster.mp4' },
  { title: 'Finishing', desc: 'Tiling, carpentry, gypsum, and painting are carried through to final handover.', poster: 'assets/generated/stages/p7-finishing.jpg', video: 'assets/generated/stages/p7-finishing.mp4' }
];

(function renderProcessStages() {
  const track = document.getElementById('processHscrollTrack');
  if (!track) return;
  track.innerHTML = PROCESS_STAGES.map((s, i) => {
    const idx = String(i + 1).padStart(2, '0');
    const media = s.video
      ? `<video class="process-panel-media-el" muted loop playsinline preload="none" poster="${s.poster}"><source src="${s.video}" type="video/mp4"></video>`
      : `<img src="${s.poster}" alt="${s.title} stage" loading="lazy" decoding="async" />`;
    return `<article class="hs-panel">
      <div class="process-panel">
        <span class="process-panel-num">${idx} / ${String(PROCESS_STAGES.length).padStart(2, '0')}</span>
        <h3>${s.title}</h3>
        <p>${s.desc}</p>
        <div class="process-panel-media">${media}</div>
      </div>
    </article>`;
  }).join('');
})();

// Project rows: cursor-following circular preview
(function projectCursorPreview() {
  const preview = document.getElementById('projectCursorPreview');
  const rows = document.querySelectorAll('#projectsList .project-row');
  if (!preview || !rows.length) return;
  const label = preview.querySelector('span');
  const baseLabel = label ? label.innerHTML : '';
  const imgEl = document.createElement('img');
  imgEl.className = 'pcp-img';
  imgEl.alt = '';
  preview.appendChild(imgEl);

  rows.forEach(row => {
    const src = row.getAttribute('data-preview-img');
    row.addEventListener('mouseenter', () => {
      if (src) {
        imgEl.src = src;
        preview.classList.add('has-img');
      } else {
        preview.classList.remove('has-img');
        if (label) label.innerHTML = baseLabel;
      }
      preview.classList.add('active');
    });
    row.addEventListener('mouseleave', () => preview.classList.remove('active'));
    row.addEventListener('mousemove', (e) => {
      preview.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%) scale(1)`;
    });
  });
})();

// Services: hover-reveal preview image (desktop) / tap-to-expand accordion (touch)
(function servicesInteractive() {
  const rows = document.querySelectorAll('.service-row');
  const previewImg = document.getElementById('servicePreviewImg');
  if (!rows.length) return;
  const hasHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function activate(row) {
    rows.forEach(r => r.classList.remove('is-active'));
    row.classList.add('is-active');
    if (previewImg) {
      const src = row.getAttribute('data-img');
      if (src && previewImg.getAttribute('src') !== src) {
        previewImg.classList.remove('is-shown');
        const next = new Image();
        next.onload = () => { previewImg.src = src; previewImg.classList.add('is-shown'); };
        next.src = src;
      } else {
        previewImg.classList.add('is-shown');
      }
    }
  }

  rows.forEach(row => {
    if (hasHover) {
      row.addEventListener('mouseenter', () => activate(row));
      row.addEventListener('focus', () => activate(row));
    } else {
      row.addEventListener('click', () => {
        const already = row.classList.contains('is-active');
        rows.forEach(r => r.classList.remove('is-active'));
        if (!already) row.classList.add('is-active');
      });
    }
  });

  if (previewImg) requestAnimationFrame(() => previewImg.classList.add('is-shown'));
})();

// Why-Us manifesto list: highlight the row nearest the viewport's reading line as you scroll
(function manifestoScrollSpy() {
  const rows = document.querySelectorAll('#manifestoList .manifesto-row');
  if (!rows.length) return;
  function updateActive() {
    const line = window.innerHeight * 0.45;
    let closest = null, closestDist = Infinity;
    rows.forEach(row => {
      const r = row.getBoundingClientRect();
      const dist = Math.abs((r.top + r.height / 2) - line);
      if (dist < closestDist) { closestDist = dist; closest = row; }
    });
    rows.forEach(row => row.classList.toggle('is-active', row === closest));
  }
  window.addEventListener('scroll', updateActive, { passive: true });
  window.addEventListener('resize', updateActive);
  updateActive();
})();

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ─── PROCESS: scroll-driven construction sequence ───
// Scrubbed by the pinned #processPinWrap section: scrolling advances the
// building through its 8 real stages instead of auto-looping on a timer.
(function processSequence() {
  const wrap = document.getElementById('heroAnim');
  const numEl = document.getElementById('processBigNum');
  const titleEl = document.getElementById('processBigTitle');
  const descEl = document.getElementById('processBigDesc');
  const dots = document.querySelectorAll('#processDots .pdot');
  if (!wrap) return;
  const svg = wrap.querySelector('.building-svg');
  if (!svg) return;

  // 8 stages from the company's stated process, mapped onto the diagram's
  // 5 drawable layers (several finishing stages share the completed shell).
  const STEPS = [
    { title: 'Planning',   desc: 'Scope, drawings, and site logistics are agreed before any work begins.',        layers: [] },
    { title: 'Excavation', desc: 'The plot is cleared and excavated to the required depth and level.',            layers: ['empty'] },
    { title: 'Foundation', desc: 'Reinforcement and formwork are set, then the foundation is cast.',              layers: ['empty', 'foundation'] },
    { title: 'Structure',  desc: 'Columns and slabs rise floor by floor to form the structural frame.',           layers: ['empty', 'foundation', 'frame'] },
    { title: 'Blockwork',  desc: 'Block walls fill the frame, defining rooms and window openings.',               layers: ['empty', 'foundation', 'frame', 'blockwork'] },
    { title: 'Plastering', desc: 'Surfaces are plastered to a smooth, consistent finish inside and out.',         layers: ['empty', 'foundation', 'frame', 'blockwork'] },
    { title: 'Finishing',  desc: 'Tiling, carpentry, gypsum, and painting are carried through to completion.',    layers: ['empty', 'foundation', 'frame', 'blockwork'] },
    { title: 'Completion', desc: 'Final checks, handover, and ongoing maintenance support after occupancy.',      layers: ['empty', 'foundation', 'frame', 'blockwork'], lit: true }
  ];

  function applyStep(i) {
    const step = STEPS[i];
    if (!step) return;
    svg.querySelectorAll('[data-appear-stage]').forEach(el => {
      const on = step.layers.indexOf(el.getAttribute('data-appear-stage')) !== -1;
      el.classList.toggle('visible', on);
    });
    wrap.classList.toggle('stage-lit', !!step.lit);
    if (numEl) numEl.textContent = String(i + 1).padStart(2, '0');
    if (titleEl) titleEl.textContent = step.title;
    if (descEl) descEl.textContent = step.desc;
    dots.forEach((d, di) => d.classList.toggle('is-active', di === i));
  }

  // Reduced motion / no-GSAP: show the finished building, list stays readable.
  if (prefersReducedMotion || typeof ScrollTrigger === 'undefined') {
    applyStep(STEPS.length - 1);
    return;
  }

  applyStep(0);
  ScrollTrigger.create({
    trigger: '#processPinWrap',
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      const i = Math.min(STEPS.length - 1, Math.floor(self.progress * STEPS.length));
      applyStep(i);
    }
  });
})();

// ─── SMOOTH SCROLL + SCROLL-DRIVEN ANIMATION ───
// Lenis (momentum smooth scroll) + GSAP/ScrollTrigger, loaded via CDN.
// Everything here is additive: if the CDN fails to load, or the visitor
// prefers reduced motion, the page still works — all content is visible
// by default and only gets animated on top of that, never hidden by it.
(function scrollExperience() {
  if (prefersReducedMotion) return;
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  // Momentum smooth scroll
  let lenis;
  if (typeof Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    window.__lenis = lenis;

    // Lenis owns the scroll position, so in-page anchors must be routed through
    // it — otherwise native anchor jumps fight the smooth-scroll loop.
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      a.addEventListener('click', (e) => {
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -80, duration: 1.2 });
      });
    });
  }

  // Hero: staggered word entrance
  const heroWords = document.querySelectorAll('.hero-stack .word');
  if (heroWords.length) {
    gsap.set(heroWords, { yPercent: 130, opacity: 0 });
    gsap.to(heroWords, {
      yPercent: 0, opacity: 1, duration: 1.1, ease: 'power4.out',
      stagger: 0.09, delay: 0.3
    });
  }

  // Hero + image-break: subtle parallax on the photo
  gsap.utils.toArray('.hero-bg-photo').forEach((img) => {
    gsap.fromTo(img, { yPercent: -6 }, {
      yPercent: 6, ease: 'none',
      scrollTrigger: { trigger: img.closest('.hero'), start: 'top top', end: 'bottom top', scrub: true }
    });
  });
  gsap.utils.toArray('.image-break img').forEach((img) => {
    gsap.fromTo(img, { yPercent: -10 }, {
      yPercent: 10, ease: 'none',
      scrollTrigger: { trigger: img.closest('.image-break'), start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });

  // Stat band: count-up numbers, once, when scrolled into view
  document.querySelectorAll('[data-count-to]').forEach((el) => {
    const target = parseFloat(el.getAttribute('data-count-to'));
    const suffix = el.getAttribute('data-suffix') || '';
    const pad = parseInt(el.getAttribute('data-pad') || '0', 10);
    const counter = { val: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 85%', once: true,
      onEnter: () => {
        gsap.to(counter, {
          val: target, duration: 1.6, ease: 'power2.out',
          onUpdate: () => {
            const n = Math.round(counter.val);
            el.textContent = (pad ? String(n).padStart(pad, '0') : String(n)) + suffix;
          }
        });
      }
    });
  });

  // ─── DOME TRANSITION: hero stays pinned while a dome rises over it ───
  // Base CSS already renders the dome in its fully-risen resting position
  // (the correct static fallback). Here we push it down further with an
  // additional GSAP `y` and animate that back to 0 as the user scrolls —
  // GSAP decomposes the CSS translateX(-50%) and layers y/scale on top of
  // it rather than overwriting it, so centering survives untouched.
  const mobileDome = () => window.innerWidth <= 768;
  (function domeTransition() {
    const wrap = document.getElementById('heroDomeWrap');
    const dome = document.getElementById('domeShape');
    if (!wrap || !dome) return;
    const curve = dome.querySelector('.dome-curve');
    const center = dome.querySelector('.dome-center');
    const dropLine = dome.querySelector('.dome-drop-line');

    const heroContent = wrap.querySelector('.hero-content');

    // yPercent is relative to the element's OWN height (120vh), so yPercent:100
    // always pushes it fully clear of the fold no matter the viewport size —
    // unlike a fixed vh guess, which under-hid it on shorter viewports.
    gsap.set(dome, { yPercent: 100, scale: mobileDome() ? 0.8 : 0.68, transformOrigin: '50% 100%' });
        gsap.set([center, dropLine], { opacity: 0, y: 14 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: wrap, start: 'top top', end: '+=120%', pin: true, scrub: 0.6
      }
    });
    tl.to(dome, { yPercent: 0, scale: 1, duration: 1, ease: 'none' }, 0)
      .to(center, { opacity: 1, y: 0, duration: 0.3, ease: 'none' }, 0.55)
      .to(dropLine, { opacity: 1, y: 0, duration: 0.3, ease: 'none' }, 0.7);

    // Hero copy recedes as the dome covers it: slight lift + fade/dim.
    if (heroContent) {
      tl.to(heroContent, { y: -40, opacity: 0.15, duration: 1, ease: 'none' }, 0);
    }
  })();

  // ─── SLIDESHOW: auto-advancing, pauses on hover, arrows + progress line ───
  (function slideshow() {
    const section = document.getElementById('slideshow');
    if (!section) return;
    const headline = document.getElementById('slideHeadline');
    const desc = document.getElementById('slideDesc');
    const tagline = document.getElementById('slideTagline');
    const current = document.getElementById('slideCurrent');
    const fill = document.getElementById('slideProgressFill');
    const imgA = document.getElementById('slideImgA');
    const imgB = document.getElementById('slideImgB');
    const prevBtn = document.getElementById('slidePrev');
    const nextBtn = document.getElementById('slideNext');
    if (!headline || !imgA || !imgB) return;

    const SLIDES = [
      { headline: 'Real-Life Location', image: 'assets/generated/slides/s1-location.jpg', desc: 'Based in Bahrain, every project is run by a team that knows the site, the suppliers, and the regulations first-hand.', tagline: 'Built On Site, Not Outsourced' },
      { headline: 'Built To Stay', image: 'assets/generated/slides/s2-builttostay.jpg', desc: 'Structural work is engineered and executed for long-term integrity, not just to pass handover.', tagline: 'Structure First, Finish Second' },
      { headline: 'One Accountable Team', image: 'assets/generated/slides/s3-team.jpg', desc: 'Civil, structural, and finishing trades are coordinated under a single point of responsibility.', tagline: 'One Contractor, Every Trade' }
    ];
    const DURATION = 5000;
    let index = 0, imgToggle = true, timer = null, progressTween = null;

    // The headline is a masked line: its text lives in an inner span that slides
    // up out of the clip and the next one slides in. Animating the h2 itself would
    // drag the whole box (and its clip) across the image below.
    function setHeadlineText(text) {
      headline.innerHTML = '';
      const inner = document.createElement('span');
      inner.className = 'sh-inner';
      inner.textContent = text;
      headline.appendChild(inner);
      return inner;
    }

    function render(i, animateHeadline) {
      const s = SLIDES[i];
      const nextImg = imgToggle ? imgB : imgA;
      const prevImg = imgToggle ? imgA : imgB;
      nextImg.src = s.image;
      nextImg.classList.add('is-active');
      prevImg.classList.remove('is-active');
      imgToggle = !imgToggle;
      if (current) current.textContent = String(i + 1);
      if (desc) desc.textContent = s.desc;
      if (tagline) tagline.textContent = s.tagline;
      const oldInner = headline.querySelector('.sh-inner');
      if (animateHeadline && !prefersReducedMotion && oldInner) {
        gsap.killTweensOf(oldInner);
        gsap.to(oldInner, {
          yPercent: -105, duration: 0.35, ease: 'power2.in',
          onComplete: () => {
            const inner = setHeadlineText(s.headline);
            gsap.fromTo(inner, { yPercent: 105 }, { yPercent: 0, duration: 0.55, ease: 'power3.out' });
          }
        });
      } else {
        setHeadlineText(s.headline);
      }
    }

    function startProgress() {
      if (progressTween) progressTween.kill();
      if (!fill) return;
      gsap.set(fill, { width: '0%' });
      progressTween = gsap.to(fill, { width: '100%', duration: DURATION / 1000, ease: 'none' });
    }

    function goTo(i, animateHeadline) {
      index = (i + SLIDES.length) % SLIDES.length;
      render(index, animateHeadline);
      startProgress();
    }

    function next() { goTo(index + 1, true); }
    function prev() { goTo(index - 1, true); }

    render(0, false);

    if (!prefersReducedMotion) {
      startProgress();
      timer = setInterval(next, DURATION);
      section.addEventListener('mouseenter', () => {
        clearInterval(timer);
        if (progressTween) progressTween.pause();
      });
      section.addEventListener('mouseleave', () => {
        if (progressTween) progressTween.resume();
        timer = setInterval(next, DURATION);
      });
    } else if (fill) {
      fill.style.width = '100%';
    }

    if (nextBtn) nextBtn.addEventListener('click', () => { clearInterval(timer); next(); if (!prefersReducedMotion) timer = setInterval(next, DURATION); });
    if (prevBtn) prevBtn.addEventListener('click', () => { clearInterval(timer); prev(); if (!prefersReducedMotion) timer = setInterval(next, DURATION); });
  })();

  // ─── Autoplay clips only while on screen (process stages + gallery); pause otherwise ───
  (function processVideoAutoplay() {
    const videos = document.querySelectorAll('.process-panel-media-el, video[data-inview]');
    if (!videos.length) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.play().catch(() => {});
        else entry.target.pause();
      });
    }, { threshold: 0.4 });
    videos.forEach(v => io.observe(v));
  })();

  // ─── ON SITE: horizontal scroll driven by vertical scroll ───
  // Shared driver for the two horizontal sections (On Site, Process).
  //
  // The section is pinned with CSS `position: sticky` inside a tall wrapper, so
  // the wrapper's height IS the pin length. It used to be a fixed 340vh, which
  // is far shorter than a 7-panel track needs: the page let go after ~44% of
  // the track and scrolled on. Now the wrapper is sized from the real distance
  // the track has to travel:
  //     pin height = viewport + distance + a hold at the end
  // The tween also reaches its final position at HOLD_AT of the way through and
  // then sits still, so the scrub's smoothing lag can never leave the last
  // panel half-shown when the pin releases.
  //
  // gsap.matchMedia re-evaluates on resize/rotate, so this builds only when
  // wide enough and tears down cleanly when it isn't.
  const HOLD_AT = 0.88;     // fraction of the scroll at which the track has fully arrived
  const EXTRA_HOLD = 0.2;   // extra pinned scroll (as a fraction of distance) after it arrives
  function buildHorizontalScroll(pinId, trackId, barId) {
    const pin = document.getElementById(pinId);
    const track = document.getElementById(trackId);
    const bar = barId && document.getElementById(barId);
    if (!pin || !track) return;
    gsap.matchMedia().add('(min-width: 901px)', () => {
      // Measured from the last panel's real edge (+ the track's right padding),
      // not scrollWidth, which can fall short of the final padding.
      const getDistance = () => {
        const last = track.lastElementChild;
        if (!last) return 0;
        const padR = parseFloat(getComputedStyle(track).paddingRight) || 0;
        return Math.max(0, last.offsetLeft + last.offsetWidth + padR - window.innerWidth);
      };
      const sizePin = () => { pin.style.height = Math.round(window.innerHeight + getDistance() * (1 + EXTRA_HOLD)) + 'px'; };
      sizePin();
      ScrollTrigger.addEventListener('refreshInit', sizePin);   // re-size before every measurement

      const tween = gsap.to(track, {
        x: () => -getDistance(),
        ease: (t) => Math.min(1, t / HOLD_AT),                 // linear, arrives at HOLD_AT, then holds
        scrollTrigger: {
          trigger: pin,
          start: 'top top',
          end: () => '+=' + Math.round(getDistance() * (1 + EXTRA_HOLD)),
          scrub: 0.5,
          invalidateOnRefresh: true,
          onUpdate: (self) => { if (bar) bar.style.width = (Math.min(1, self.progress / HOLD_AT) * 100) + '%'; }
        }
      });
      // Depth: parallax layers of construction props behind the track.
      const vp = pin.querySelector('.hscroll-viewport');
      const mk = (cls, f, html) => {
        const d = document.createElement('div');
        d.className = 'hs-deco ' + cls; d.setAttribute('aria-hidden', 'true'); d.innerHTML = html;
        vp.insertBefore(d, vp.firstChild); d.dataset.f = f; return d;
      };
      const R = 'assets/generated/';
      const craneImg = R + 'projects/crane.png';
      const far = mk('hs-deco-far', 0.2,
        [10, 50, 88].map(p => `<img class="hs-far-crane" style="left:${p}%" src="${craneImg}" alt="" loading="lazy">`).join(''));
      const mid = mk('hs-deco-mid', 0.55,
        [14, 46, 83].map((p, i) => `<span class="hs-hang" style="left:${p}%;--dl:${-i * 1.7}s"><img src="${R}rebar-${'abc'[i]}.png?v=2" alt="" loading="lazy"></span>`).join('') +
        [28, 72].map((p, i) => `<span class="hs-crane-rig" style="left:${p}%"><img class="hs-rig-crane" src="${craneImg}" alt="" loading="lazy"><span class="hs-hang hs-rig-load" style="--dl:${-i * 2.3}s"><img src="${R}rebar-${'ca'[i]}.png?v=2" alt="" loading="lazy"></span></span>`).join(''));
      const decos = [far, mid];
      const sizeDeco = () => decos.forEach(d => { d.style.width = Math.round(window.innerWidth + getDistance() * d.dataset.f) + 'px'; });
      sizeDeco(); ScrollTrigger.addEventListener('refreshInit', sizeDeco);
      const decoTweens = decos.map(d => gsap.to(d, {
        x: () => -getDistance() * d.dataset.f, ease: (t) => Math.min(1, t / HOLD_AT),
        scrollTrigger: { trigger: pin, start: 'top top', end: () => '+=' + Math.round(getDistance() * (1 + EXTRA_HOLD)), scrub: 0.5, invalidateOnRefresh: true }
      }));

      return () => {
        ScrollTrigger.removeEventListener('refreshInit', sizeDeco);
        decoTweens.forEach(t => { t.scrollTrigger && t.scrollTrigger.kill(); t.kill(); });
        decos.forEach(d => d.remove());
        ScrollTrigger.removeEventListener('refreshInit', sizePin);
        tween.scrollTrigger && tween.scrollTrigger.kill(); tween.kill();
        gsap.set(track, { clearProps: 'x' });
        pin.style.height = '';
      };
    });
  }
  buildHorizontalScroll('hscrollPin', 'hscrollTrack', 'hscrollBar');
  buildHorizontalScroll('processHscrollPin', 'processHscrollTrack', 'processHscrollBar');

  // ─── MASK "PULL UP" REVEALS ───
  // Headings and figures rise out of a clipping mask instead of plain fading —
  // transform + clip-path only, so it stays on the compositor.
  (function maskReveals() {
    const targets = document.querySelectorAll('[data-mask]');
    targets.forEach(el => {
      gsap.fromTo(el,
        { yPercent: 18, opacity: 0, clipPath: 'inset(100% 0% 0% 0%)' },
        {
          yPercent: 0, opacity: 1, clipPath: 'inset(0% 0% 0% 0%)',
          duration: 1.05, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true }
        }
      );
    });
  })();

  // Persistent scroll rail: section counter + progress fill.
  // Plain scroll listener (same approach as the nav active-link logic above) —
  // simpler and more predictable here than chaining per-section ScrollTriggers.
  const railCount = document.getElementById('scrollRailCount');
  const railFill = document.getElementById('scrollRailFill');
  // Order matches document order (process now sits right after the dome,
  // before about/services/projects) so the counter climbs monotonically.
  const railEls = ['home', 'process', 'about', 'services', 'projects', 'why', 'onsite', 'contact']
    .map(id => document.getElementById(id)).filter(Boolean);
  if (railCount || railFill) {
    ScrollTrigger.create({
      trigger: document.body, start: 'top top', end: 'bottom bottom',
      onUpdate: (self) => {
        if (railFill) railFill.style.height = (self.progress * 100) + '%';
        if (railCount) {
          const mid = window.scrollY + window.innerHeight / 2;
          let idx = 0;
          railEls.forEach((el, i) => { if (mid >= el.offsetTop) idx = i; });
          railCount.textContent = String(idx).padStart(2, '0');
        }
      }
    });
  }
})();

// ─── CONTACT FORM ───
// This is a static site with no backend, so the form composes a pre-filled
// email in the visitor's own mail client rather than pretending to send.
// If a form endpoint (Formspree/Netlify/etc.) is added later, POST here instead.
(function contactForm() {
  const form = document.getElementById('contactForm');
  const note = document.getElementById('cfNote');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const d = new FormData(form);
    const get = (k) => (d.get(k) || '').toString().trim();
    const subject = `Project enquiry — ${get('name')}${get('company') ? ' (' + get('company') + ')' : ''}`;
    const body = [
      `Name: ${get('name')}`,
      `Company: ${get('company') || '—'}`,
      `Email: ${get('email')}`,
      `Phone: ${get('phone') || '—'}`,
      `Project Type: ${get('projectType') || '—'}`,
      '',
      get('message')
    ].join('\n');
    window.location.href = `mailto:Shahbuddin3917@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    if (note) note.textContent = 'Opening your email app with the enquiry ready to send…';
  });
})();

// ─── MICRO-INTERACTIONS: magnetic buttons ───
(function magneticButtons() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  document.querySelectorAll('.btn-primary, .btn-secondary, .btn-ghost, [data-magnetic]').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      const mx = e.clientX - r.left - r.width / 2;
      const my = e.clientY - r.top - r.height / 2;
      btn.style.transform = `translate(${mx * 0.18}px, ${my * 0.28}px)`;
    });
    btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
  });
})();
