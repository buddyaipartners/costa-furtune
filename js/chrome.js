/* ═══════════════════════════════════════════════════════════════
   COSTA FURTUNE · SUB-PAGE CHROME
   Nav state, mobile menu, scroll reveals, enquiry form.
   The main index page uses js/main.js for the full experience.
   ═══════════════════════════════════════════════════════════════ */

(() => {
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ── nav scroll state ───────────────────────────────────────── */
  const nav = $('#nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ── mobile menu ────────────────────────────────────────────── */
  const toggle = $('#navToggle');
  const menu = $('#navMenu');
  if (toggle && menu) {
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

  /* ── scroll reveals ─────────────────────────────────────────── */
  const reveals = $$('[data-reveal]');
  if (reveals.length) {
    if (!('IntersectionObserver' in window)) {
      reveals.forEach((el) => el.classList.add('is-in'));
    } else {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });
      reveals.forEach((el) => io.observe(el));
    }
  }

  /* ── enquiry form ───────────────────────────────────────────── */
  const form = $('#enquiryForm');
  const toast = $('#toast');
  if (form) {
    let toastTimer;

    const showToast = (msg) => {
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.add('is-on');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove('is-on'), 4600);
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const nameInput = $('#name');
      const phoneInput = $('#phone');
      const name = (nameInput?.value || '').trim();
      const phone = (phoneInput?.value || '').replace(/\D/g, '');

      if (name.length < 2) {
        showToast('Please enter your name.');
        nameInput?.focus();
        return;
      }
      if (phone.length < 10) {
        showToast('Please enter a valid 10-digit mobile number.');
        phoneInput?.focus();
        return;
      }

      const first = name.split(' ')[0];
      showToast(`Thank you, ${first}. Sai Harmony will call +91 ${phone.slice(-10)} within 24 hours.`);
      form.reset();
    });
  }
})();
