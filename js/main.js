/* ============================================================
   IDAR — main.js
   ============================================================ */

/* ----------------------------------------------------------
   1. Fade-in on scroll (IntersectionObserver)
---------------------------------------------------------- */
const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach(el => {
    if (el.isIntersecting) el.target.classList.add('visible');
  });
}, { threshold: 0.1 });

function observeFadeIn(root) {
  root.querySelectorAll(
    '.offer-card, .process-step, .testimonial, .venue-room, .dist-card, .vf-item'
  ).forEach((el, i) => {
    el.classList.add('fade-in');
    if (i % 3 === 1) el.classList.add('delay-1');
    if (i % 3 === 2) el.classList.add('delay-2');
    fadeObserver.observe(el);
  });
}
observeFadeIn(document);

/* ----------------------------------------------------------
   2. Hamburger menu (mobile)
---------------------------------------------------------- */
(function () {
  const btn   = document.querySelector('.nav-hamburger');
  const links = document.querySelector('.nav-links');
  if (!btn || !links) return;

  btn.addEventListener('click', () => {
    const open = links.classList.toggle('nav-open');
    btn.setAttribute('aria-expanded', open);
    btn.setAttribute('aria-label', open ? 'Zamknij menu' : 'Otwórz menu');
  });

  // Zamknij po kliknięciu w link
  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      links.classList.remove('nav-open');
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', 'Otwórz menu');
    });
  });

  // Zamknij po kliknięciu poza menu
  document.addEventListener('click', e => {
    if (!btn.contains(e.target) && !links.contains(e.target)) {
      links.classList.remove('nav-open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
})();

/* ----------------------------------------------------------
   3. Background slideshows (hero + process)
---------------------------------------------------------- */
function initBgSlideshow(selector, intervalMs) {
  const slides = document.querySelectorAll(selector);
  if (!slides.length) return;

  let current = 0;
  slides[0].classList.add('active');

  setInterval(() => {
    slides[current].classList.remove('active');
    current = (current + 1) % slides.length;
    slides[current].classList.add('active');
  }, intervalMs);
}

initBgSlideshow('.hero-bg-slide', 5000);
initBgSlideshow('.process-bg-slide', 6000); // inne tempo = nie są zsynchronizowane

/* ----------------------------------------------------------
   3. Google Reviews
---------------------------------------------------------- */
(async function () {
  const grid  = document.getElementById('reviews-grid');
  const meta  = document.getElementById('reviews-meta');
  if (!grid) return;

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function initials(name) {
    return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  function renderReview(r) {
    const stars   = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
    const text    = r.text.length > 300 ? r.text.slice(0, 297) + '…' : r.text;
    const avatar  = r.profile_photo_url
      ? `<img class="t-avatar-img" src="${esc(r.profile_photo_url)}" alt="${esc(r.author_name)}" loading="lazy">`
      : `<div class="t-avatar">${esc(initials(r.author_name))}</div>`;

    return `
      <div class="testimonial">
        <div class="t-stars">${stars}</div>
        <p class="t-text">${esc(text)}</p>
        <div class="t-author">
          ${avatar}
          <div>
            <p class="t-name">${esc(r.author_name)}</p>
            <p class="t-company">${esc(r.relative_time_description)}</p>
          </div>
        </div>
      </div>`;
  }

  try {
    const res  = await fetch('api/reviews.php');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (data.error || data.status !== 'OK') throw new Error(data.error || data.status);

    // Najnowsze, min. 4 gwiazdki, maks. 3 wyświetlane
    const reviews = (data.result?.reviews || [])
      .filter(r => r.rating >= 4 && r.text?.trim())
      .slice(0, 3);

    if (!reviews.length) throw new Error('Brak kwalifikujących się opinii');

    grid.innerHTML = reviews.map(renderReview).join('');
    observeFadeIn(grid);

    // Pokaż belkę ze średnią oceną
    const rating = data.result?.rating;
    const total  = data.result?.user_ratings_total;
    if (meta && rating) {
      document.getElementById('reviews-rating').textContent = `⭐ ${rating.toFixed(1)} / 5`;
      if (total) document.getElementById('reviews-count').textContent = `(${total} opinii)`;
      meta.hidden = false;
    }

  } catch (e) {
    // Ciche niepowodzenie — zostają statyczne opinie z HTML
    console.info('[IDAR reviews] Używam statycznych opinii:', e.message);
  }
})();

/* ----------------------------------------------------------
   4. Venue photo gallery slider
---------------------------------------------------------- */
(function () {
  const gallery = document.querySelector('.venue-gallery');
  if (!gallery) return;

  const slides   = gallery.querySelectorAll('.gallery-slide');
  const dots     = gallery.querySelectorAll('.gallery-dot');
  const counter  = gallery.querySelector('.gallery-counter');
  const btnPrev  = gallery.querySelector('.gallery-prev');
  const btnNext  = gallery.querySelector('.gallery-next');

  if (!slides.length) return;

  let current = 0;
  let autoTimer;

  function goTo(idx) {
    slides[current].classList.remove('active');
    dots[current]?.classList.remove('active');

    current = (idx + slides.length) % slides.length;

    slides[current].classList.add('active');
    dots[current]?.classList.add('active');

    if (counter) counter.textContent = `${current + 1} / ${slides.length}`;
  }

  function startAuto() {
    stopAuto();
    autoTimer = setInterval(() => goTo(current + 1), 4500);
  }

  function stopAuto() {
    clearInterval(autoTimer);
  }

  // Button controls
  btnPrev?.addEventListener('click', () => { goTo(current - 1); startAuto(); });
  btnNext?.addEventListener('click', () => { goTo(current + 1); startAuto(); });

  // Dot controls
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => { goTo(i); startAuto(); });
  });

  // Touch / swipe support
  let touchStartX = 0;
  gallery.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
  gallery.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) {
      goTo(dx < 0 ? current + 1 : current - 1);
      startAuto();
    }
  }, { passive: true });

  // Pause on hover
  gallery.addEventListener('mouseenter', stopAuto);
  gallery.addEventListener('mouseleave', startAuto);

  // Init
  goTo(0);
  startAuto();
})();
