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

// Navbar scroll effect
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
}

// Mobile menu
function toggleMenu() {
  const menu = document.getElementById('mobileMenu');
  if (menu) menu.classList.toggle('open');
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
  { title: '', category: '', location: '', year: '', image: '', description: '' },
  { title: '', category: '', location: '', year: '', image: '', description: '' },
  { title: '', category: '', location: '', year: '', image: '', description: '' },
  { title: '', category: '', location: '', year: '', image: '', description: '' },
  { title: '', category: '', location: '', year: '', image: '', description: '' },
  { title: '', category: '', location: '', year: '', image: '', description: '' }
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

  // Persistent scroll rail: section counter + progress fill.
  // Plain scroll listener (same approach as the nav active-link logic above) —
  // simpler and more predictable here than chaining per-section ScrollTriggers.
  const railCount = document.getElementById('scrollRailCount');
  const railFill = document.getElementById('scrollRailFill');
  const railEls = ['home', 'about', 'services', 'projects', 'process', 'why', 'contact']
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
