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
  document.body.classList.remove('is-loading');
  document.body.classList.add('is-ready', 'at-hero');
  if (hasLoader) {
    clearInterval(loadTick);
    loader.classList.add('is-done');
  }
  try { startReveals(); } catch (e) { console.warn('[main] reveals', e); }
  try { measure(); } catch (e) { console.warn('[main] measure', e); }
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
  if (window.__menuInitialized) return;
  window.__menuInitialized = true;

  const toggle = $('#navToggle');
  const menu = $('#navMenu');
  const closeBtn = $('#navMenuClose');
  if (!toggle || !menu) return;

  const close = () => {
    if (typeof window.closeCostaMenu === 'function') {
      window.closeCostaMenu();
    } else {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.classList.remove('is-active');
      menu.classList.remove('is-open');
      menu.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  };

  toggle.onclick = (e) => {
    if (typeof window.toggleCostaMenu === 'function') {
      window.toggleCostaMenu(e);
    } else {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.classList.toggle('is-active', open);
      menu.classList.toggle('is-open', open);
      menu.setAttribute('aria-hidden', open ? 'false' : 'true');
      document.body.style.overflow = open ? 'hidden' : '';
    }
  };

  if (closeBtn) {
    closeBtn.onclick = (e) => {
      e.preventDefault();
      close();
    };
  }

  $$('a', menu).forEach((a) => a.addEventListener('click', close));
  menu.addEventListener('click', (e) => { if (e.target === menu) close(); });
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

    window.open(`https://wa.me/917328089908?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
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
      if (modalTitle) modalTitle.textContent = 'Costa Furtune Triplex · Official Architecture & Floor Plans';
    } else if (phase === 'horizon') {
      if (paneTriplex) paneTriplex.style.display = 'none';
      if (paneHorizon) paneHorizon.style.display = 'block';
      if (modalTitle) modalTitle.textContent = 'Costa Furtune Horizon Heights · Superstructure & Floor Plans';
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

  document.querySelectorAll('.phase-gallery-item, .lightbox-trigger, .visual-card, .unit__floorplan-wrap').forEach(item => {
    item.style.cursor = 'zoom-in';
    item.addEventListener('click', () => {
      const src = item.getAttribute('data-lightbox') || item.querySelector('img')?.src || (item.tagName === 'IMG' ? item.src : null);
      const cap = item.getAttribute('data-caption') || item.querySelector('figcaption h4')?.textContent || item.querySelector('figcaption')?.textContent || item.querySelector('img')?.alt || '';
      if (src) openLightbox(src, cap);
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


/* ==========================================================================
   OFFICIAL BUILDER 3D VIRTUAL TOUR & LEAD FUNNEL CONTROLLER
   ========================================================================== */

function initCinemaAndBlueprints() {
  // 1. 4K Cinema Video Switcher
  const cinemaPlayer = document.getElementById('cinemaPlayer');
  const cinemaLabel = document.getElementById('cinemaVideoLabel');
  const cinemaBtns = document.querySelectorAll('.btn-cinema-switch');

  cinemaBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      cinemaBtns.forEach(b => {
        b.classList.remove('is-active');
        b.style.background = 'rgba(255,255,255,0.06)';
        b.style.color = '#D8D2C4';
        b.style.borderColor = 'rgba(255,255,255,0.15)';
      });
      btn.classList.add('is-active');
      btn.style.background = 'linear-gradient(135deg, #7A805E 0%, #614F33 100%)';
      btn.style.color = '#FFFFFF';
      btn.style.borderColor = '#D4AF37';

      const videoSrc = btn.getAttribute('data-video');
      const posterSrc = btn.getAttribute('data-poster');
      const title = btn.getAttribute('data-title');

      if (cinemaPlayer && videoSrc) {
        cinemaPlayer.src = videoSrc;
        if (posterSrc) cinemaPlayer.poster = posterSrc;
        cinemaPlayer.play().catch(() => {});
      }
      if (cinemaLabel && title) {
        cinemaLabel.textContent = title;
      }
    });
  });

  // 2. Architectural Blueprint Studio Tab Switcher
  const bpTabs = document.querySelectorAll('.btn-bp-tab');
  const bpImg = document.getElementById('bpMainImage');
  const bpTitle = document.getElementById('bpCurrentTitle');
  const bpBua = document.getElementById('bpBua');
  const bpLiving = document.getElementById('bpLiving');
  const bpMaster = document.getElementById('bpMaster');
  const bpKitchen = document.getElementById('bpKitchen');
  const bpFacing = document.getElementById('bpFacing');
  const bpDownload = document.getElementById('btnBpDownload');

  bpTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      bpTabs.forEach(t => {
        t.classList.remove('is-active');
        t.style.background = 'rgba(30,34,42,0.06)';
        t.style.color = 'var(--ink)';
        t.style.borderColor = 'rgba(184,145,75,0.3)';
      });
      tab.classList.add('is-active');
      tab.style.background = 'linear-gradient(135deg, #7A805E 0%, #614F33 100%)';
      tab.style.color = '#FFFFFF';
      tab.style.borderColor = '#D4AF37';

      const planSrc = tab.getAttribute('data-plan');
      const title = tab.getAttribute('data-title');
      const bua = tab.getAttribute('data-bua');
      const living = tab.getAttribute('data-living');
      const master = tab.getAttribute('data-master');
      const kitchen = tab.getAttribute('data-kitchen');
      const facing = tab.getAttribute('data-facing');

      if (bpImg && planSrc) {
        bpImg.style.opacity = '0.2';
        bpImg.style.transform = 'scale(0.97)';
        setTimeout(() => {
          bpImg.src = planSrc;
          bpImg.style.opacity = '1';
          bpImg.style.transform = 'scale(1)';
        }, 180);
      }
      if (bpTitle && title) bpTitle.textContent = title;
      if (bpBua && bua) bpBua.textContent = bua;
      if (bpLiving && living) bpLiving.innerHTML = living;
      if (bpMaster && master) bpMaster.innerHTML = master;
      if (bpKitchen && kitchen) bpKitchen.innerHTML = kitchen;
      if (bpFacing && facing) bpFacing.innerHTML = facing;
      if (bpDownload && planSrc) bpDownload.href = planSrc;
    });
  });
}

/* ── MULTI-CHANNEL LEAD FUNNELS & EMI CALCULATOR ─────────────── */
function initLeadFunnels() {
  const WHATSAPP_PHONE = "917328089908";

  // Dispatch Lead helper
  const dispatchLead = (leadType, data) => {
    try {
      const stored = JSON.parse(localStorage.getItem('cf_leads_crm') || '[]');
      stored.push({
        id: 'CF-' + Date.now(),
        type: leadType,
        timestamp: new Date().toISOString(),
        ...data
      });
      localStorage.setItem('cf_leads_crm', JSON.stringify(stored));
    } catch (e) {
      console.warn("Storage error", e);
    }
  };

  // 1. Hero Quick Allocation Form
  const heroQuickForm = document.getElementById('heroQuickForm');
  if (heroQuickForm) {
    heroQuickForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = heroQuickForm.querySelector('input[name="name"]')?.value || 'Guest';
      const phone = heroQuickForm.querySelector('input[name="phone"]')?.value || '';
      const unit = heroQuickForm.querySelector('select[name="typology"]')?.value || '3 BHK 1,845 sq.ft';

      if (!phone || phone.length < 10) {
        alert("Please enter a valid 10-digit mobile number for priority allocation.");
        return;
      }

      dispatchLead('hero_priority_allocation', { name, phone, unit });

      const msg = `Namaste Sai Harmony Builder Sales!%0A%0AI want to lock direct developer pricing at ₹5,700/sq.ft for Costa Furtune Crestview.%0A%0A*Name:* ${encodeURIComponent(name)}%0A*Mobile:* ${encodeURIComponent(phone)}%0A*Preferred Typology:* ${encodeURIComponent(unit)}%0A*Request:* Priority developer unit allocation & VIP site visit.`;
      
      alert(`Thank you, ${name}! Your direct developer priority allocation request has been registered. Connecting you with our Senior Relationship Manager.`);
      window.open(`https://wa.me/${WHATSAPP_PHONE}?text=${msg}`, '_blank');
    });
  }

  // 2. Enquire Funnel Tabs
  const tabBtns = document.querySelectorAll('.enquire-tab-btn');
  const tabPanes = document.querySelectorAll('.enquire__tab-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('is-active'));
      tabPanes.forEach(p => p.classList.remove('is-active'));

      btn.classList.add('is-active');
      const targetPane = document.getElementById(btn.getAttribute('data-tab'));
      if (targetPane) targetPane.classList.add('is-active');
    });
  });

  // 3. Interactive EMI & Cost Calculator
  const emiUnitSelect = document.getElementById('emiUnitSelect');
  const dpSlider = document.getElementById('dpSlider');
  const dpValDisplay = document.getElementById('dpValDisplay');
  const tenureSlider = document.getElementById('tenureSlider');
  const tenureValDisplay = document.getElementById('tenureValDisplay');
  const intSlider = document.getElementById('intSlider');
  const intValDisplay = document.getElementById('intValDisplay');

  const emiTotalPrice = document.getElementById('emiTotalPrice');
  const emiDownPayment = document.getElementById('emiDownPayment');
  const emiLoanAmount = document.getElementById('emiLoanAmount');
  const emiMonthly = document.getElementById('emiMonthly');
  const emiTotalInterest = document.getElementById('emiTotalInterest');

  const formatINR = (val) => '₹ ' + Math.round(val).toLocaleString('en-IN');

  const recalculateEMI = () => {
    const sba = parseFloat(emiUnitSelect?.value || '1845');
    const baseRate = 5700;
    const basePrice = sba * baseRate;
    // Include 5% GST and standard 1 car parking ₹2,50,000
    const parking = 250000;
    const gst = basePrice * 0.05;
    const allInclusiveCost = basePrice + parking + gst;

    const dpPercent = parseFloat(dpSlider?.value || '20');
    const tenureYears = parseInt(tenureSlider?.value || '20');
    const annualRate = parseFloat(intSlider?.value || '8.5');

    if (dpValDisplay) dpValDisplay.textContent = dpPercent + '%';
    if (tenureValDisplay) tenureValDisplay.textContent = tenureYears + ' Yrs';
    if (intValDisplay) intValDisplay.textContent = annualRate.toFixed(1) + '%';

    const downPayment = (allInclusiveCost * dpPercent) / 100;
    const principalLoan = allInclusiveCost - downPayment;

    // EMI formula: P * r * (1+r)^N / ((1+r)^N - 1)
    const monthlyRate = annualRate / 12 / 100;
    const totalMonths = tenureYears * 12;
    const emi = (principalLoan * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
    const totalPayment = emi * totalMonths;
    const totalInterest = totalPayment - principalLoan;

    if (emiTotalPrice) emiTotalPrice.textContent = formatINR(allInclusiveCost);
    if (emiDownPayment) emiDownPayment.textContent = formatINR(downPayment);
    if (emiLoanAmount) emiLoanAmount.textContent = formatINR(principalLoan);
    if (emiMonthly) emiMonthly.textContent = formatINR(emi) + ' / mo';
    if (emiTotalInterest) emiTotalInterest.textContent = formatINR(totalInterest);
  };

  if (emiUnitSelect && dpSlider && tenureSlider && intSlider) {
    emiUnitSelect.addEventListener('change', recalculateEMI);
    dpSlider.addEventListener('input', recalculateEMI);
    tenureSlider.addEventListener('input', recalculateEMI);
    intSlider.addEventListener('input', recalculateEMI);
    recalculateEMI();
  }

  // 4. Download Cost Sheet Form
  const calcGateForm = document.getElementById('calcGateForm');
  if (calcGateForm) {
    calcGateForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = calcGateForm.querySelector('input[name="calc_name"]')?.value || 'Guest';
      const phone = calcGateForm.querySelector('input[name="calc_phone"]')?.value || '';
      const unit = emiUnitSelect?.options[emiUnitSelect.selectedIndex]?.text || '3 BHK 1,845 sq.ft';
      const monthlyEmiVal = emiMonthly?.textContent || '';

      if (!phone || phone.length < 10) {
        alert("Please enter a valid phone number to receive the official cost sheet.");
        return;
      }

      dispatchLead('cost_sheet_download', { name, phone, unit, monthlyEmiVal });

      const msg = `Namaste Sai Harmony!%0A%0APlease send the official itemized cost break-up & payment schedule for Costa Furtune Crestview.%0A%0A*Name:* ${encodeURIComponent(name)}%0A*Phone:* ${encodeURIComponent(phone)}%0A*Unit Typology:* ${encodeURIComponent(unit)}%0A*Est. Monthly EMI:* ${encodeURIComponent(monthlyEmiVal)}`;

      alert(`Official Cost Sheet for ${unit} has been generated! Opening WhatsApp for instant PDF delivery.`);
      window.open(`https://wa.me/${WHATSAPP_PHONE}?text=${msg}`, '_blank');
    });
  }

  // 5. VIP Chauffeur Visit Form
  const visitForm = document.getElementById('visitForm');
  if (visitForm) {
    visitForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = visitForm.querySelector('input[name="visit_name"]')?.value || 'Guest';
      const phone = visitForm.querySelector('input[name="visit_phone"]')?.value || '';
      const date = visitForm.querySelector('input[name="visit_date"]')?.value || 'Upcoming Weekend';
      const pickup = visitForm.querySelector('select[name="pickup_location"]')?.value || 'Direct Site Arrival';

      if (!phone || phone.length < 10) {
        alert("Please enter a valid phone number to schedule chauffeur pickup.");
        return;
      }

      dispatchLead('chauffeur_site_visit', { name, phone, date, pickup });

      const msg = `Namaste Sai Harmony!%0A%0AI would like to book a complimentary VIP Chauffeur-driven site visit to Costa Furtune Crestview, Kantabada.%0A%0A*Name:* ${encodeURIComponent(name)}%0A*Phone:* ${encodeURIComponent(phone)}%0A*Preferred Date:* ${encodeURIComponent(date)}%0A*Pickup Point:* ${encodeURIComponent(pickup)}`;

      alert(`Thank you, ${name}! Your VIP Chauffeur Site Visit booking has been confirmed. Our fleet manager will call you to confirm pickup coordinates.`);
      window.open(`https://wa.me/${WHATSAPP_PHONE}?text=${msg}`, '_blank');
    });
  }

  // 6. NRI Video Concierge Form
  const nriForm = document.getElementById('nriForm');
  if (nriForm) {
    nriForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = nriForm.querySelector('input[name="nri_name"]')?.value || 'Guest';
      const country = nriForm.querySelector('input[name="nri_country"]')?.value || 'Overseas';
      const phone = nriForm.querySelector('input[name="nri_phone"]')?.value || '';
      const platform = nriForm.querySelector('select[name="nri_platform"]')?.value || 'WhatsApp Video';

      if (!phone || phone.length < 8) {
        alert("Please provide an international phone or WhatsApp number.");
        return;
      }

      dispatchLead('nri_concierge_consult', { name, country, phone, platform });

      const msg = `Namaste Sai Harmony NRI Desk!%0A%0AI would like to schedule an exclusive 1-on-1 3D Live Video Walkthrough & NRI Repatriation / Power of Attorney consultation for Costa Furtune Crestview.%0A%0A*Name:* ${encodeURIComponent(name)}%0A*Country/City:* ${encodeURIComponent(country)}%0A*WhatsApp:* ${encodeURIComponent(phone)}%0A*Preferred Channel:* ${encodeURIComponent(platform)}`;

      alert(`Thank you, ${name}! Your NRI Video Concierge session has been registered. Our Global NRI Desk will reach out via ${platform}.`);
      window.open(`https://wa.me/${WHATSAPP_PHONE}?text=${msg}`, '_blank');
    });
  }
}

// Initialize on DOM load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initCinemaAndBlueprints();
    initLeadFunnels();
    initFinancialStudio();
  });
} else {
  initCinemaAndBlueprints();
  initLeadFunnels();
  initFinancialStudio();
}

/* ── Ultra-Luxury Parallax Scroll & Autoplay Handler ────────── */
window.addEventListener('scroll', () => {
  const scrollY = window.pageYOffset || document.documentElement.scrollTop;
  document.documentElement.style.setProperty('--scroll-y', `${scrollY}px`);
}, { passive: true });

// Auto-scroll handler for deep links & hash
window.addEventListener('load', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const targetId = urlParams.get('scroll') || (window.location.hash ? window.location.hash.substring(1) : null);
  if (targetId) {
    const el = document.getElementById(targetId);
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'instant', block: 'start' });
      }, 60);
    }
  }
});

/* ==========================================================================
   INTERACTIVE FINANCIAL STUDIO (EMI & ROI) CONTROLLER
   ========================================================================== */
function initFinancialStudio() {
  const modal = document.getElementById('financialStudioModal');
  const closeBtn = document.getElementById('closeFinStudio');
  if (!modal) return;

  const unitTitleEl = document.getElementById('finUnitTitle');
  const basePriceEl = document.getElementById('finBasePrice');

  // Sliders
  const rangeLoanPct = document.getElementById('rangeLoanPct');
  const rangeInterest = document.getElementById('rangeInterestRate');
  const rangeTenure = document.getElementById('rangeTenure');
  const rangeGrowth = document.getElementById('rangeGrowthRate');
  const rangeRent = document.getElementById('rangeEstRent');

  // Displays - EMI
  const dispLoanAmt = document.getElementById('dispLoanAmt');
  const dispDownPmt = document.getElementById('dispDownPmt');
  const dispInterestRate = document.getElementById('dispInterestRate');
  const dispTenure = document.getElementById('dispTenure');
  const dispMonthlyEmi = document.getElementById('dispMonthlyEmi');
  const dispStatPrincipal = document.getElementById('dispStatPrincipal');
  const dispStatInterest = document.getElementById('dispStatInterest');
  const dispStatTotal = document.getElementById('dispStatTotal');
  const barPrincipal = document.getElementById('barPrincipal');
  const barInterest = document.getElementById('barInterest');
  const pctPrincipal = document.getElementById('pctPrincipal');
  const pctInterest = document.getElementById('pctInterest');

  // Displays - ROI
  const dispGrowthRate = document.getElementById('dispGrowthRate');
  const dispEstRent = document.getElementById('dispEstRent');
  const roiAcqPrice = document.getElementById('roiAcqPrice');
  const roiPossessionVal = document.getElementById('roiPossessionVal');
  const roi5YrVal = document.getElementById('roi5YrVal');
  const dispTotalWealthGain = document.getElementById('dispTotalWealthGain');
  const dispCapitalGain = document.getElementById('dispCapitalGain');
  const dispRentalYield = document.getElementById('dispRentalYield');
  const disp5YrRent = document.getElementById('disp5YrRent');
  const dispTotalRoiPct = document.getElementById('dispTotalRoiPct');

  // CTAs
  const btnWhatsapp = document.getElementById('btnFinWhatsapp');
  const btnShare = document.getElementById('btnShareFinQuote');

  // Tabs
  const tabEmi = document.getElementById('tabFinEmi');
  const tabRoi = document.getElementById('tabFinRoi');
  const paneEmi = document.getElementById('paneFinEmi');
  const paneRoi = document.getElementById('paneFinRoi');

  let currentPrice = 10516500;
  let currentUnitName = "Type 1 · Grand Three (1,845 sq ft)";
  let currentRent = 32000;

  function formatRupees(num) {
    return '₹' + Math.round(num).toLocaleString('en-IN');
  }

  function formatCrores(num) {
    const cr = num / 10000000;
    return '₹' + cr.toFixed(2) + ' Cr';
  }

  function formatLakhs(num) {
    const lk = num / 100000;
    return '₹' + lk.toFixed(1) + ' Lakhs';
  }

  function recalculate() {
    // 1. EMI Calculation
    const loanPct = parseFloat(rangeLoanPct.value) / 100;
    const principal = currentPrice * loanPct;
    const downPayment = currentPrice - principal;

    const annualRate = parseFloat(rangeInterest.value);
    const monthlyRate = (annualRate / 12) / 100;
    const years = parseInt(rangeTenure.value, 10);
    const months = years * 12;

    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
    const totalPayment = emi * months;
    const totalInterest = totalPayment - principal;

    dispLoanAmt.textContent = `${formatRupees(principal)} (${rangeLoanPct.value}%)`;
    dispDownPmt.textContent = `${formatRupees(downPayment)} (${100 - parseInt(rangeLoanPct.value, 10)}%)`;
    dispInterestRate.textContent = `${annualRate.toFixed(2)}% p.a.`;
    dispTenure.textContent = `${years} Years (${months} Mos)`;

    dispMonthlyEmi.innerHTML = `${formatRupees(emi)} <small>/ month</small>`;
    dispStatPrincipal.textContent = formatRupees(principal);
    dispStatInterest.textContent = formatRupees(totalInterest);
    dispStatTotal.textContent = formatRupees(totalPayment);

    const principalPct = Math.round((principal / totalPayment) * 100);
    const interestPct = 100 - principalPct;
    barPrincipal.style.width = `${principalPct}%`;
    barInterest.style.width = `${interestPct}%`;
    pctPrincipal.textContent = `${principalPct}%`;
    pctInterest.textContent = `${interestPct}%`;

    // 2. ROI Calculation
    const growthRate = parseFloat(rangeGrowth.value) / 100;
    const monthlyRent = parseFloat(rangeRent.value);

    dispGrowthRate.textContent = `${(growthRate * 100).toFixed(2)}% CAGR`;
    dispEstRent.textContent = `${formatRupees(monthlyRent)} / month`;

    roiAcqPrice.textContent = formatCrores(currentPrice);
    // Aug 2028 is 2.5 years from early 2026
    const valPossession = currentPrice * Math.pow(1 + growthRate, 2.5);
    roiPossessionVal.textContent = formatCrores(valPossession);

    // 5-Year horizon (2031)
    const val5Yr = currentPrice * Math.pow(1 + growthRate, 5);
    roi5YrVal.textContent = formatCrores(val5Yr);

    const capitalGain = val5Yr - currentPrice;
    dispCapitalGain.textContent = `+${formatLakhs(capitalGain)}`;

    const annualRent = monthlyRent * 12;
    const grossYield = (annualRent / currentPrice) * 100;
    dispRentalYield.textContent = `${grossYield.toFixed(2)}% p.a.`;

    const cumulativeRent = annualRent * 5;
    disp5YrRent.textContent = formatLakhs(cumulativeRent);

    const totalWealthGain = capitalGain + cumulativeRent;
    dispTotalWealthGain.textContent = `+${formatLakhs(totalWealthGain)}`;

    const totalRoiPct = (totalWealthGain / currentPrice) * 100;
    dispTotalRoiPct.textContent = `+${totalRoiPct.toFixed(1)}%`;

    // Update WhatsApp action link
    const waPhone = "917328089908";
    const waText = encodeURIComponent(
      `Namaste Sai Harmony Finance Desk!\n\nI configured the Financial Studio for *${currentUnitName}*.\n- Unit Price: ${formatCrores(currentPrice)}\n- Loan Amount: ${formatRupees(principal)} (${rangeLoanPct.value}%)\n- Tenure: ${years} Years @ ${annualRate}% p.a.\n- Estimated EMI: ${formatRupees(emi)}/month\n- Projected 5-Year Wealth Gain: +${formatLakhs(totalWealthGain)}\n\nPlease assist me with Nationalized Bank Pre-Approval (SBI/HDFC/ICICI) and VIP priority unit lock.`
    );
    btnWhatsapp.href = `https://wa.me/${waPhone}?text=${waText}`;

    // Share / Copy button
    btnShare.onclick = () => {
      const summary = `Costa Furtune Crestview — Investment Summary\nUnit: ${currentUnitName}\nPrice: ${formatCrores(currentPrice)}\nEstimated EMI: ${formatRupees(emi)}/mo (${years} yrs @ ${annualRate}%)\n5-Yr Projected Value: ${formatCrores(val5Yr)}\nTotal Wealth Gain: +${formatLakhs(totalWealthGain)}\nOfficial Portal: https://buddyaipartners.github.io/costa-furtune/`;
      navigator.clipboard.writeText(summary).then(() => {
        alert("Investment summary copied to clipboard!");
      }).catch(() => {
        alert(summary);
      });
    };
  }

  // Sliders listeners
  [rangeLoanPct, rangeInterest, rangeTenure, rangeGrowth, rangeRent].forEach(slider => {
    slider?.addEventListener('input', recalculate);
  });

  // Tab listeners
  tabEmi?.addEventListener('click', () => {
    tabEmi.classList.add('is-active');
    tabRoi.classList.remove('is-active');
    paneEmi.classList.add('is-active');
    paneRoi.classList.remove('is-active');
  });

  tabRoi?.addEventListener('click', () => {
    tabRoi.classList.add('is-active');
    tabEmi.classList.remove('is-active');
    paneRoi.classList.add('is-active');
    paneEmi.classList.remove('is-active');
  });

  // Open / Close modal
  function openStudio(unitName, price, rent) {
    currentUnitName = unitName;
    currentPrice = price;
    currentRent = rent || 32000;

    unitTitleEl.textContent = currentUnitName;
    basePriceEl.textContent = `${formatRupees(currentPrice)}*`;
    rangeRent.value = currentRent;

    recalculate();
    modal.classList.add('is-open');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeStudio() {
    modal.classList.remove('is-open');
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  closeBtn?.addEventListener('click', closeStudio);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeStudio();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) closeStudio();
  });

  // Attach to button triggers
  document.querySelectorAll('.btn-calc-studio').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const unit = btn.getAttribute('data-unit-name');
      const price = parseFloat(btn.getAttribute('data-price')) || 10516500;
      const rent = parseFloat(btn.getAttribute('data-rent')) || 32000;
      openStudio(unit, price, rent);
    });
  });

  // Also clicking a size card opens the studio
  document.querySelectorAll('.unit--3bhk').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', (e) => {
      // If clicking zoom or link, don't hijack
      if (e.target.closest('.unit__floorplan-wrap') || e.target.closest('a')) return;
      const btn = card.querySelector('.btn-calc-studio');
      if (btn) btn.click();
    });
  });
}




