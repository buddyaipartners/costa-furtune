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
  const closeBtn = $('#navMenuClose');

  const closeMenu = () => {
    if (!menu) return;
    toggle?.setAttribute('aria-expanded', 'false');
    toggle?.classList.remove('is-active');
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  const openMenu = () => {
    if (!menu) return;
    toggle?.setAttribute('aria-expanded', 'true');
    toggle?.classList.add('is-active');
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  const toggleMenu = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (menu?.classList.contains('is-open')) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  if (toggle) {
    toggle.onclick = toggleMenu;
  }
  if (closeBtn) {
    closeBtn.onclick = (e) => {
      e.preventDefault();
      closeMenu();
    };
  }
  if (menu) {
    $$('a', menu).forEach((a) => a.addEventListener('click', closeMenu));
    menu.addEventListener('click', (e) => {
      if (e.target === menu) closeMenu();
    });
  }
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
  window.closeCostaMenu = closeMenu;
  window.openCostaMenu = openMenu;
  window.toggleCostaMenu = toggleMenu;

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
  let toastTimer;

  const showToast = (msg) => {
    if (!toast) {
      alert(msg);
      return;
    }
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-on'), 4600);
  };

  if (form) {
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

  /* ── brochure download lead gate modal ────────────────────────── */
  let pendingBrochureUrl = '';
  let pendingBrochureName = '';

  const brochureModal = $('#brochureModal');
  const brochureClose = $('#closeBrochureModal');
  const brochureForm  = $('#brochureGateForm');

  const openBrochureGate = (url, filename, phaseName) => {
    pendingBrochureUrl = url || 'assets/brochure/costa-furtune-crestview-official.pdf';
    pendingBrochureName = filename || 'Costa-Furtune-Official-Brochure.pdf';

    if (!brochureModal) {
      triggerDirectDownload(pendingBrochureUrl, pendingBrochureName);
      return;
    }

    // Pre-populate previously remembered user credentials for effortless 1-tap submission
    const nameInput = $('#brochureName');
    const phoneInput = $('#brochurePhone');
    const savedName = localStorage.getItem('costa_user_name') || sessionStorage.getItem('costa_user_name') || '';
    const savedPhone = localStorage.getItem('costa_user_phone') || sessionStorage.getItem('costa_user_phone') || '';
    if (savedName && nameInput && !nameInput.value) nameInput.value = savedName;
    if (savedPhone && phoneInput && !phoneInput.value) phoneInput.value = savedPhone;

    // Pre-select phase in dropdown if matched
    const phaseSelect = $('#brochurePhase');
    if (phaseSelect && phaseName) {
      for (let i = 0; i < phaseSelect.options.length; i++) {
        if (phaseSelect.options[i].text.toLowerCase().includes(phaseName.toLowerCase())) {
          phaseSelect.selectedIndex = i;
          break;
        }
      }
    }

    brochureModal.classList.add('is-open');
    brochureModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  const closeBrochureGate = () => {
    if (!brochureModal) return;
    brochureModal.classList.remove('is-open');
    brochureModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  const triggerDirectDownload = (url, filename) => {
    const a = document.createElement('a');
    a.href = url;
    if (filename) a.download = filename;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 200);
  };

  if (brochureClose) brochureClose.addEventListener('click', closeBrochureGate);
  if (brochureModal) {
    brochureModal.addEventListener('click', (e) => {
      if (e.target === brochureModal) closeBrochureGate();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && brochureModal.classList.contains('is-open')) closeBrochureGate();
    });
  }

  if (brochureForm) {
    brochureForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = $('#brochureName');
      const phoneInput = $('#brochurePhone');
      const phaseInput = $('#brochurePhase');

      const name = (nameInput?.value || '').trim();
      const phone = (phoneInput?.value || '').replace(/\D/g, '');
      const phase = phaseInput?.value || 'Costa Furtune Crestview';

      if (name.length < 2) {
        showToast('Please enter your full name.');
        nameInput?.focus();
        return;
      }
      if (phone.length < 10) {
        showToast('Please enter a valid 10-digit WhatsApp number.');
        phoneInput?.focus();
        return;
      }

      // Push lead_form_submit event to dataLayer before executing download
      try {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: 'lead_form_submit',
          form_name: 'Gated Brochure Download Gate',
          form_location: window.location.pathname,
          phase: phase
        });
      } catch (err) {
        console.warn('GTM tracking error', err);
      }

      // Save user details
      sessionStorage.setItem('costa_user_name', name);
      sessionStorage.setItem('costa_user_phone', phone);
      localStorage.setItem('costa_user_name', name);
      localStorage.setItem('costa_user_phone', phone);

      // Persist lead locally
      try {
        const lead = { name, phone, phase, timestamp: new Date().toISOString() };
        localStorage.setItem('costa_last_lead', JSON.stringify(lead));
      } catch (err) {}

      // Asynchronous notification beacon
      try {
        fetch('https://knr-integrity-crm-web.onrender.com/api/v1/organic/property-inquiry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: name,
            phone_number: phone,
            project_interest: phase,
            source: 'Official Brochure Download Gate',
            brochure_url: pendingBrochureUrl
          }),
          mode: 'no-cors'
        }).catch(() => {});
      } catch (err) {}

      closeBrochureGate();
      showToast(`Thank you, ${name.split(' ')[0]}! Downloading official brochure.`);
      triggerDirectDownload(pendingBrochureUrl, pendingBrochureName);
      brochureForm.reset();
    });
  }

  // Intercept all brochure links site-wide
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href*=".pdf"], a[download*="Brochure"], a[download*="brochure"], .footer__brochure, [data-brochure], .btn-brochure, [data-action="brochure"]');
    if (!link) return;

    e.preventDefault();
    const href = link.getAttribute('href') || link.getAttribute('data-brochure') || 'assets/brochure/costa-furtune-crestview-official.pdf';
    const downloadAttr = link.getAttribute('download') || 'Costa-Furtune-Crestview-Official-Brochure.pdf';
    let phaseName = 'Crestview';
    if (href.includes('horizon')) phaseName = 'Horizon Heights';
    if (href.includes('triplex')) phaseName = 'Triplex';
    if (href.includes('club')) phaseName = 'Clubhouse';

    openBrochureGate(href, downloadAttr, phaseName);
  });

  window.openBrochureGate = openBrochureGate;
})();
