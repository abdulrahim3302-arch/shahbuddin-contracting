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
