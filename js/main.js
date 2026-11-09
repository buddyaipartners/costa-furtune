/* ═══════════════════════════════════════════════════════════════
   COSTA FURTUNE CRESTVIEW · INTERACTION
   ─────────────────────────────────────────────────────────────── */

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── loader ─────────────────────────────────────────────────── */
const loader   = $('#loader');
const loadBar  = $('#loadBar');
const loadPct  = $('#loadPct');

let shown = 0;
let target = 0;
const t0 = performance.now();
let scene = null;

const hasLoader = Boolean(loader && loadBar && loadPct);

function paintLoader() {
  if (!hasLoader) return;
  shown += (target - shown) * 0.14 + 0.0025;
  if (shown > target && target < 1) shown = Math.min(shown, target + 0.001);
  const pct = Math.min(100, Math.round(shown * 100));
  loadBar.style.width = `${pct}%`;
  loadPct.textContent = String(pct);
}

const loadTick = hasLoader ? setInterval(paintLoader, 40) : 0;

async function boot() {
  /* Preload hero building render for immediate display */
  const heroImg = new Image();
  heroImg.src = 'assets/render-elevation.webp';
  target = 1;

  const finish = () => {
    const elapsed = performance.now() - t0;
    if (shown < 0.985 && elapsed < 600) {
      requestAnimationFrame(finish);
      return;
    }
    clearInterval(loadTick);
    paintLoader();
    if (hasLoader) {
      loadBar.style.width = '100%';
      loadPct.textContent = '100';
    }

    setTimeout(() => {
      if (hasLoader) loader.classList.add('is-done');
      document.body.classList.remove('is-loading');
      document.body.classList.add('is-ready');
      document.body.classList.add('at-hero');
      try { startReveals(); } catch (e) { console.warn('[main] reveals', e); }
      try { measure(); } catch (e) { console.warn('[main] measure', e); }
    }, 240);
  };
  requestAnimationFrame(finish);

  /* safety net */
  setTimeout(() => {
    if (!document.body.classList.contains('is-ready')) {
      if (hasLoader) loader.classList.add('is-done');
      document.body.classList.remove('is-loading');
      document.body.classList.add('is-ready');
      document.body.classList.add('at-hero');
      try { startReveals(); measure(); } catch (e) { console.warn('[main] safety', e); }
    }
  }, 1800);
}

/* ── build animation ────────────────────────────────────────── */
function startBuild() {
  if (!scene) return;
  if (reduced) { scene.setBuild(1); return; }

  const duration = 3000;
  const start = performance.now();
  const ease = (t) => 1 - Math.pow(1 - t, 3);

  function step(now) {
    const t = clamp((now - start) / duration, 0, 1);
    scene.setBuild(ease(t));
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ── chapter measurement ────────────────────────────────────── */
const sections = $$('[data-chapter]');
const anchors = [];

function contentOf(sec) {
  return sec.querySelector('.split, .hero__content, .wide__head, .enquire') || sec;
}

function measure() {
  anchors.length = 0;
  sections.forEach((sec) => {
    const el = contentOf(sec);
    const r = el.getBoundingClientRect();
    anchors.push({
      index: Number(sec.dataset.chapter),
      y: window.scrollY + r.top + r.height / 2 - window.innerHeight / 2,
      el
    });
  });
  anchors.sort((a, b) => a.index - b.index);
  updateScroll();
}

let scrollY = window.scrollY;
let ticking = false;

function onScroll() {
  scrollY = window.scrollY;
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(() => {
      updateScroll();
      ticking = false;
    });
  }
}

function updateScroll() {
  const y = window.scrollY;
  const vh = window.innerHeight;
  const docH = document.documentElement.scrollHeight;

  /* overall rail fill */
  const railFill = $('#railFill');
  if (railFill) {
    const p = clamp(y / Math.max(1, docH - vh), 0, 1);
    railFill.style.height = `${p * 100}%`;
  }

  /* show/hide rail once past hero */
  const rail = $('#rail');
  const railList = $('#railList');
  if (rail && railList) {
    const showRail = y > vh * 0.35;
    rail.classList.toggle('is-visible', showRail);
    railList.classList.toggle('is-visible', showRail);
  }

  /* chapter progress 0..7 */
  let p = 0;
  if (anchors.length) {
    if (y <= anchors[0].y) p = anchors[0].index;
    else if (y >= anchors[anchors.length - 1].y) p = anchors[anchors.length - 1].index;
    else {
      for (let i = 0; i < anchors.length - 1; i++) {
        const a = anchors[i], b = anchors[i + 1];
        if (y >= a.y && y <= b.y) {
          const span = Math.max(1, b.y - a.y);
          p = a.index + smooth(clamp((y - a.y) / span, 0, 1));
          break;
        }
      }
    }
  }

  if (scene) {
    scene.setProgress(p);

    /* explode through the architecture chapter only */
    const local = clamp(p - 2, 0, 1);
    const e = local < 0.62
      ? smooth(clamp(local / 0.42, 0, 1))
      : 1 - smooth(clamp((local - 0.62) / 0.26, 0, 1));
    scene.setExplode(local < 0.88 ? e : 0);
  }

  /* rail active */
  const active = clamp(Math.round(p), 0, 7);
  $$('#railList li').forEach((li) => {
    li.classList.toggle('is-active', Number(li.dataset.ch) === active);
  });

  /* nav */
  $('#nav')?.classList.toggle('is-scrolled', y > 40);

  /* reveal anything now in view */
  revealInView();

  /* parallax */
  if (!reduced) {
    $$('[data-parallax]').forEach((img) => {
      const fig = img.closest('figure') || img.parentElement;
      const r = fig.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      const centre = r.top + r.height / 2 - vh / 2;
      const speed = parseFloat(img.dataset.parallax) || 0.1;
      img.style.transform = `translate3d(0, ${(-centre * speed).toFixed(2)}px, 0)`;
    });
  }
}

/* ── reveals ────────────────────────────────────────────────── */
/* Scroll-driven rather than IntersectionObserver: the observer can be
   starved while the WebGL loop is busy, which would leave panels at
   opacity 0. This always resolves. */
const revealEls = $$('[data-reveal]');

function revealInView() {
  const vh = window.innerHeight;
  revealEls.forEach((el) => {
    if (el.classList.contains('is-in')) return;
    const r = el.getBoundingClientRect();
    if (r.top <= vh * 1.05 && r.bottom >= -50) {
      const delay = Number(el.dataset.revealDelay || 0);
      el.style.setProperty('--d', `${delay}ms`);
      el.classList.add('is-in');
    }
  });
}

function startReveals() {
  window.revealInView = revealInView;
  if (reduced) {
    revealEls.forEach((el) => el.classList.add('is-in'));
    return;
  }
  revealInView();
  requestAnimationFrame(revealInView);
  setTimeout(revealInView, 300);

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const delay = Number(el.dataset.revealDelay || 0);
          el.style.setProperty('--d', `${delay}ms`);
          el.classList.add('is-in');
          io.unobserve(el);
        }
      });
    }, { rootMargin: '0px 0px 80px 0px', threshold: 0.05 });
    revealEls.forEach((el) => {
      if (!el.classList.contains('is-in')) io.observe(el);
    });
  }
}

/* ── tabs ───────────────────────────────────────────────────── */
function initTabs() {
  const tabs = $$('.tab');
  const panes = $$('.pane');
  if (!tabs.length) return;

  function select(id) {
    tabs.forEach((t) => {
      const on = t.dataset.tab === String(id);
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    panes.forEach((p) => {
      const on = p.id === `pane-${id}`;
      p.classList.toggle('is-active', on);
      if (on) p.removeAttribute('hidden');
      else p.setAttribute('hidden', '');
    });
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab.dataset.tab));
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].focus();
      select(tabs[next].dataset.tab);
    });
  });
}

/* ── rail navigation ────────────────────────────────────────── */
function initRail() {
  $$('#railList li').forEach((li) => {
    li.addEventListener('click', () => {
      const idx = Number(li.dataset.ch);
      const a = anchors.find((x) => x.index === idx);
      if (a) a.el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    });
  });
}

/* ── mobile menu ────────────────────────────────────────────── */
function initMenu() {
  const toggle = $('#navToggle');
  const menu = $('#navMenu');
  if (!toggle || !menu) return;

  const close = () => {
    toggle.setAttribute('aria-expanded', 'false');
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    document.body.style.overflow = open ? 'hidden' : '';
  });

  $$('a', menu).forEach((a) => a.addEventListener('click', close));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}

/* ── form ───────────────────────────────────────────────────── */
function initForm() {
  const form = $('#enquiryForm');
  const toast = $('#toast');
  if (!form) return;

  let toastTimer;

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-on'), 4200);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = $('#name').value.trim();
    const phone = $('#phone').value.trim();
    const interest = $('#interest').value;
    const when = $('#when').value;

    if (name.length < 2) {
      showToast('Please add your name');
      $('#name').focus();
      return;
    }
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      showToast('Please add a valid phone number');
      $('#phone').focus();
      return;
    }

    const msg =
      `Hello Sai Harmony, I would like to arrange a private viewing of Costa Furtune Crestview.\n\n` +
      `Name: ${name}\nPhone: ${phone}\nInterested in: ${interest}\nPreferred time: ${when}\n\n` +
      `Sent from the Crestview presentation.`;

    window.open(`https://wa.me/917735536906?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    showToast('Opening WhatsApp — we will confirm shortly');
  });
}

/* ── smooth in-page links ───────────────────────────────────── */

/* ── 3D video modal ─────────────────────────────────────────── */
function initVideoModal() {
  const modal = document.querySelector('#videoModal');
  const player = document.querySelector('#masterVideoPlayer');
  const modalTitle = document.querySelector('#videoModalTitle');
  const btnHeader = document.querySelector('#btnTourModal');
  const btnHero = document.querySelector('#btnHeroTour');
  const btnHeroWalkthrough = document.querySelector('#btnHeroWalkthrough');
  const btnClose = document.querySelector('#closeVideoModal');
  const tabBtns = [...document.querySelectorAll('.btn-video-tab')];
  if (!modal || !player) return;

  function setVideo(src, title) {
    if (!src) return;
    if (player.src !== src && !player.src.endsWith(src)) {
      player.pause();
      player.src = src;
      player.load();
    }
    if (modalTitle && title) {
      modalTitle.textContent = title;
    }
    tabBtns.forEach(btn => {
      const match = btn.getAttribute('data-src') === src;
      btn.classList.toggle('is-active', match);
      btn.style.border = match ? '1px solid var(--gold)' : '1px solid var(--line-2)';
      btn.style.background = match ? 'rgba(184,145,75,0.18)' : 'transparent';
      btn.style.color = match ? 'var(--gold-3)' : 'var(--muted)';
    });
  }

  function openModal(defaultSrc, defaultTitle) {
    if (defaultSrc) {
      setVideo(defaultSrc, defaultTitle);
    }
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    try {
      player.currentTime = 0;
      player.play();
    } catch (e) {}
    if (window.__scene && typeof window.__scene.pause === 'function') {
      window.__scene.pause();
    }
  }

  function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    try {
      player.pause();
    } catch (e) {}
    if (window.__scene && typeof window.__scene.resume === 'function') {
      window.__scene.resume();
    }
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const src = btn.getAttribute('data-src');
      const title = btn.getAttribute('data-title');
      setVideo(src, title);
      try {
        player.play();
      } catch (e) {}
    });
  });

  if (btnHeader) btnHeader.addEventListener('click', () => openModal('assets/video/costa-furtune-master-cinematic.mp4', 'Costa Furtune · 31s Drone Aerial Flight'));
  if (btnHero) btnHero.addEventListener('click', () => openModal('assets/video/costa-furtune-master-cinematic.mp4', 'Costa Furtune · 31s Drone Aerial Flight'));
  if (btnHeroWalkthrough) btnHeroWalkthrough.addEventListener('click', () => openModal('assets/video/costa-furtune-master-walkthrough.mp4', 'Costa Furtune · 45s Architectural Walkthrough & Club Fantacy'));
  if (btnClose) btnClose.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
  });
}

/* ── interactive phase explorer modal ───────────────────────── */
function initPhaseModal() {
  const modal = document.querySelector('#phaseModal');
  const modalTitle = document.querySelector('#phaseModalTitle');
  const btnClose = document.querySelector('#closePhaseModal');
  const btns = [...document.querySelectorAll('.btn-open-phase')];
  const paneTriplex = document.querySelector('#paneTriplex');
  const paneHorizon = document.querySelector('#paneHorizon');
  if (!modal) return;

  function openPhase(phase) {
    if (phase === 'triplex') {
      if (paneTriplex) paneTriplex.style.display = 'block';
      if (paneHorizon) paneHorizon.style.display = 'none';
      if (modalTitle) modalTitle.textContent = 'Costa Fortune Triplex · Official Architecture & Floor Plans';
    } else if (phase === 'horizon') {
      if (paneTriplex) paneTriplex.style.display = 'none';
      if (paneHorizon) paneHorizon.style.display = 'block';
      if (modalTitle) modalTitle.textContent = 'Costa Furtune Horizon Heights · Twin Towers & Layouts';
    }
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closePhase() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  btns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openPhase(btn.dataset.phase);
    });
  });

  if (btnClose) btnClose.addEventListener('click', closePhase);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closePhase();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) closePhase();
  });
}

/* ── 3 BHK unit selector ────────────────────────────────────── */
function init3BHKSelector() {
  const units = [...document.querySelectorAll('.unit--3bhk')];
  const interestSelect = document.querySelector('#interest');
  if (!units.length) return;

  units.forEach((unit) => {
    unit.addEventListener('click', () => {
      units.forEach((u) => u.classList.remove('is-selected'));
      unit.classList.add('is-selected');

      const plan = unit.dataset.plan;
      if (interestSelect) {
        if (plan === '1845') interestSelect.selectedIndex = 0;
        else if (plan === '1941') interestSelect.selectedIndex = 1;
        else if (plan === '2013') interestSelect.selectedIndex = 2;
        else if (plan === '2033') interestSelect.selectedIndex = 3;
      }
    });
  });
}

/* ── exact 3D building render background scroller with 3D parallax ── */
function initBackgroundScroller() {
  const slides = [...document.querySelectorAll('.bg-slide')];
  if (!slides.length) return;

  const chapters = [
    { id: '#top', slide: 0 },
    { id: '#developer', slide: 1 },
    { id: '#township', slide: 2 },
    { id: '#residences', slide: 3 },
    { id: '#amenities', slide: 4 },
    { id: '#progress', slide: 5 },
    { id: '#leadership', slide: 6 },
    { id: '#verification', slide: 7 },
    { id: '#enquire', slide: 7 }
  ];

  let targetTiltX = 0, targetTiltY = 0;
  let curTiltX = 0, curTiltY = 0;
  let activeIdx = 0;

  if (window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('mousemove', (e) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      targetTiltX = ((e.clientX - cx) / cx) * 2.6; // degrees
      targetTiltY = ((e.clientY - cy) / cy) * -2.0;
    }, { passive: true });
  }

  function renderLoop() {
    const scrollY = window.scrollY;
    const vh = window.innerHeight;

    chapters.forEach((ch) => {
      const el = document.querySelector(ch.id);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= vh * 0.55) {
          activeIdx = ch.slide;
        }
      }
    });

    document.body.classList.toggle('at-hero', activeIdx === 0);

    // Smooth tilt lerp
    curTiltX += (targetTiltX - curTiltX) * 0.08;
    curTiltY += (targetTiltY - curTiltY) * 0.08;

    slides.forEach((s, idx) => {
      const match = idx === activeIdx;
      s.classList.toggle('is-active', match);
      if (match) {
        const offset = ((scrollY % (vh * 1.5)) / (vh * 1.5)) * 24;
        s.style.transform = `scale(1.02) translate3d(${curTiltX * 3.5}px, ${-offset + curTiltY * 3.5}px, 0) rotateX(${curTiltY}deg) rotateY(${curTiltX}deg)`;
      }
    });

    requestAnimationFrame(renderLoop);
  }

  requestAnimationFrame(renderLoop);
}

function initAnchors() {
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', id);
    });
  });
}

/* ── init ───────────────────────────────────────────────────── */
initTabs();
initVideoModal();
initPhaseModal();
init3BHKSelector();
initBackgroundScroller();
initRail();
initMenu();
initForm();
initAnchors();

window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', () => { measure(); }, { passive: true });
window.addEventListener('load', () => setTimeout(measure, 120));
setTimeout(measure, 600);

boot();


/* ── AMBIENT AUDIO TOGGLE ───────────────────────────────────── */
function initAmbientAudio() {
  const btn = document.getElementById('btnSoundToggle');
  const audio = document.getElementById('ambientAudio');
  if (!btn || !audio) return;

  btn.addEventListener('click', () => {
    if (audio.paused) {
      audio.play().then(() => {
        btn.classList.add('is-playing');
        btn.querySelector('span').textContent = 'Mute Score';
      }).catch(e => console.warn('Audio play error:', e));
    } else {
      audio.pause();
      btn.classList.remove('is-playing');
      btn.querySelector('span').textContent = 'Play Soundtrack';
    }
  });
}

/* ── FULLSCREEN IMAGE LIGHTBOX ──────────────────────────────── */
function initLightbox() {
  let modal = document.getElementById('lightboxModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'lightbox-modal';
    modal.id = 'lightboxModal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <div class="lightbox-modal__box">
        <button class="lightbox-modal__close" id="closeLightbox" aria-label="Close lightbox">&times;</button>
        <img src="" alt="" class="lightbox-modal__img" id="lightboxImg" />
        <div class="lightbox-modal__caption" id="lightboxCaption"></div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const imgEl = document.getElementById('lightboxImg');
  const capEl = document.getElementById('lightboxCaption');
  const closeBtn = document.getElementById('closeLightbox');

  const openLightbox = (src, caption) => {
    imgEl.src = src;
    imgEl.alt = caption || 'Architectural View';
    capEl.textContent = caption || '';
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
  };

  closeBtn?.addEventListener('click', closeLightbox);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeLightbox();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) closeLightbox();
  });

  document.querySelectorAll('.phase-gallery-item, .lightbox-trigger').forEach(item => {
    item.style.cursor = 'zoom-in';
    item.addEventListener('click', () => {
      const img = item.querySelector('img') || (item.tagName === 'IMG' ? item : null);
      const cap = item.getAttribute('data-caption') || item.querySelector('figcaption')?.textContent || img?.alt || '';
      if (img?.src) openLightbox(img.src, cap);
    });
  });
}

/* ── LIVE INTERACTIVE PRICE CALCULATOR ───────────────────────── */
function initPriceCalculator() {
  const calc = document.querySelector('[data-price-calculator]');
  if (!calc) return;

  const rate = parseFloat(calc.getAttribute('data-base-rate')) || 5700;
  const unitSelect = calc.querySelector('#calcUnit');
  const floorSelect = calc.querySelector('#calcFloor');
  const parkingSelect = calc.querySelector('#calcParking');

  const basePriceEl = calc.querySelector('#calcBasePrice');
  const floorRiseEl = calc.querySelector('#calcFloorRise');
  const parkingPriceEl = calc.querySelector('#calcParkingPrice');
  const gstEl = calc.querySelector('#calcGST');
  const grandTotalEl = calc.querySelector('#calcGrandTotal');

  const formatINR = (val) => {
    return '₹ ' + Math.round(val).toLocaleString('en-IN');
  };

  const updatePrice = () => {
    const sba = parseFloat(unitSelect?.value) || 1845;
    const floor = parseInt(floorSelect?.value) || 1;
    const parkingSlots = parseInt(parkingSelect?.value) || 1;

    const baseAmount = sba * rate;
    const floorRisePerSqft = floor > 4 ? (floor - 4) * 45 : 0;
    const floorRiseAmount = floorRisePerSqft * sba;
    const parkingAmount = parkingSlots * 250000;
    const taxableSubtotal = baseAmount + floorRiseAmount;
    const gstAmount = taxableSubtotal * 0.05;
    const grandTotal = taxableSubtotal + parkingAmount + gstAmount;

    if (basePriceEl) basePriceEl.textContent = formatINR(baseAmount);
    if (floorRiseEl) floorRiseEl.textContent = floorRiseAmount > 0 ? formatINR(floorRiseAmount) : 'NIL (Standard)';
    if (parkingPriceEl) parkingPriceEl.textContent = formatINR(parkingAmount);
    if (gstEl) gstEl.textContent = formatINR(gstAmount);
    if (grandTotalEl) grandTotalEl.textContent = formatINR(grandTotal);
  };

  unitSelect?.addEventListener('change', updatePrice);
  floorSelect?.addEventListener('change', updatePrice);
  parkingSelect?.addEventListener('change', updatePrice);

  updatePrice();
}

initAmbientAudio();
initLightbox();
initPriceCalculator();
