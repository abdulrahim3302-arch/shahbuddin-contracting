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

// Stagger grid children on reveal (pure CSS var — no animation library dependency)
document.querySelectorAll('.services-grid, .why-grid, .projects-grid, .process-row').forEach(grid => {
  grid.querySelectorAll(':scope > .reveal').forEach((el, i) => {
    el.style.setProperty('--reveal-delay', (i * 0.08) + 's');
  });
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ─── HERO CONSTRUCTION ANIMATION SEQUENCER ───
// Cycles the SVG building through stages: empty -> foundation -> frame
// (floor-by-floor) -> blockwork -> lit -> reset. Pure CSS transitions
// driven by class toggles; timings tuned for a readable, non-frantic loop.
(function heroAnimation() {
  const wrap = document.getElementById('heroAnim');
  if (!wrap) return;
  const caption = document.getElementById('heroAnimCaption');
  const svg = wrap.querySelector('.building-svg');
  if (!svg) return;

  const STAGE_LABELS = {
    empty: 'Empty Site',
    foundation: 'Foundation',
    frame: 'Structural Frame',
    blockwork: 'Blockwork',
    lit: 'Completed & Illuminated'
  };

  function setCaption(stage) {
    if (caption) caption.textContent = STAGE_LABELS[stage] || '';
  }

  function clearAll() {
    svg.querySelectorAll('[data-appear-stage]').forEach(el => {
      el.classList.remove('visible');
      el.style.transitionDelay = '';
    });
    wrap.classList.remove('stage-lit');
  }

  function revealStage(stageName, staggerByFloor) {
    const els = svg.querySelectorAll(`[data-appear-stage="${stageName}"]`);
    els.forEach(el => {
      if (staggerByFloor) {
        const floor = parseFloat(el.getAttribute('data-floor')) || 0;
        el.style.transitionDelay = (floor * 0.22) + 's';
      }
      // force reflow so the delay applies before adding the class
      void el.offsetWidth;
      el.classList.add('visible');
    });
  }

  if (prefersReducedMotion) {
    // Show the completed, illuminated state as a static image.
    ['empty', 'foundation', 'frame', 'blockwork'].forEach(s => revealStage(s, false));
    wrap.classList.add('stage-lit');
    setCaption('lit');
    return;
  }

  const TIMINGS = [
    { stage: 'empty', hold: 2200 },
    { stage: 'foundation', hold: 2200 },
    { stage: 'frame', hold: 3600, stagger: true },
    { stage: 'blockwork', hold: 2400, stagger: true },
    { stage: 'lit', hold: 4200 }
  ];

  function runCycle() {
    clearAll();
    let t = 0;
    TIMINGS.forEach(({ stage, hold, stagger }) => {
      setTimeout(() => {
        if (stage === 'lit') {
          wrap.classList.add('stage-lit');
        } else {
          revealStage(stage, !!stagger);
        }
        setCaption(stage);
      }, t);
      t += hold;
    });
    setTimeout(runCycle, t + 900);
  }

  runCycle();
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
