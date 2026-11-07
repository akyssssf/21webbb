(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const nav = $('#nav');
  const burger = $('#burger');
  const hero = $('#hero');
  const news = $('#news');
  const track = $('#newsTrack');
  const parallaxImgs = $$('.everyday .card__img img');

  /* ---------- Smooth scroll (Lenis) ---------- */
  let lenis = null;
  if (!reduced && window.Lenis) {
    lenis = new Lenis({
      duration: 1.25,          // makin besar = makin "licin"
      easing: (t) => 1 - Math.pow(1 - t, 4),
      wheelMultiplier: 0.9,
      smoothWheel: true,
    });
    window.lenis = lenis;
    const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  /* ---------- Navigasi: scroll + bubble ---------- */
  const group = $('#navGroup');
  const bubble = $('#bubble');
  const navLinks = $$('#navlinks a').filter((a) => !a.classList.contains('nav__home'));
  const navTargets = navLinks.map((a) => $(a.getAttribute('href')));
  const mobile = matchMedia('(max-width: 900px)');
  let activeIdx = -1;   // section yang sedang aktif
  let shown = -1;       // posisi bubble saat ini
  let lock = false;     // true saat scroll otomatis dari klik nav
  let lockTimer = 0;
  let dragging = false;

  const scrollToHash = (id) => {
    const target = id === '#top' ? document.body : $(id);
    if (!target) return;
    const idx = navLinks.findIndex((a) => a.getAttribute('href') === id);
    if (idx >= 0) {
      lock = true; clearTimeout(lockTimer);
      lockTimer = setTimeout(() => { lock = false; }, 2400);
      setActive(idx);
    } else if (id === '#top') {
      setActive(-1);
    }
    if (lenis) lenis.scrollTo(id === '#top' ? 0 : target, { duration: 1.8 });
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  };

  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      scrollToHash(a.getAttribute('href'));
    });
  });

  // bubble: ukuran & posisi mengikuti link, relatif terhadap .nav__group
  const bubbleBox = (idx) => {
    const g = group.getBoundingClientRect();
    const r = navLinks[idx].getBoundingClientRect();
    return { w: r.width + 8, h: g.height - 8, x: r.left - g.left - 4, y: 4 };
  };
  const paint = (x, w, h, y = 4, scale = 1, visible = true) => {
    bubble.style.width = `${w}px`;
    bubble.style.height = `${h}px`;
    bubble.style.setProperty('--bx', `${x}px`);
    bubble.style.setProperty('--by', `${y}px`);
    bubble.style.setProperty('--bs', scale);
    bubble.style.opacity = visible ? 1 : 0;
  };
  const place = () => {
    if (mobile.matches || dragging) return;
    if (shown < 0) {
      // di hero: bubble disembunyikan (kecil & transparan)
      const b = bubbleBox(0);
      paint(b.x, b.w, b.h, b.y, 0.6, false);
      return;
    }
    const b = bubbleBox(shown);
    paint(b.x, b.w, b.h, b.y, 1, true);
  };
  const setActive = (idx) => {
    activeIdx = idx;
    navLinks.forEach((a, i) => a.classList.toggle('is-active', i === idx));
    if (!dragging) { shown = idx; place(); }
  };

  // ikuti perubahan ukuran pill (animasi mengecil) & resize
  if ('ResizeObserver' in window) new ResizeObserver(place).observe(group);
  mobile.addEventListener('change', place);
  addEventListener('load', place);
  if (document.fonts) document.fonts.ready.then(place);

  // press + drag ala iOS
  let startX = 0, moved = 0, bw = 0, bh = 0, dragIdx = -1;
  let suppressClick = false;
  const nearest = (cx) => {
    const g = group.getBoundingClientRect();
    let best = 0, bestD = Infinity;
    navLinks.forEach((a, i) => {
      const r = a.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - g.left - cx);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  };
  const follow = (clientX) => {
    const g = group.getBoundingClientRect();
    const first = navLinks[0].getBoundingClientRect();
    const last = navLinks[navLinks.length - 1].getBoundingClientRect();
    const minX = first.left - g.left - 4;
    const maxX = last.right - g.left + 4 - bw;
    const x = clamp(clientX - g.left - bw / 2, minX, maxX);
    paint(x, bw, bh, 4, 1.16, true);
    const hot = nearest(x + bw / 2);
    navLinks.forEach((a, i) => a.classList.toggle('is-hot', i === hot));
    return hot;
  };

  group.addEventListener('pointerdown', (e) => {
    if (mobile.matches || e.button > 0) return;
    const a = e.target.closest('a');
    if (!a || a.classList.contains('nav__home')) return;
    dragIdx = navLinks.indexOf(a);
    dragging = true; moved = 0; startX = e.clientX;
    const b = bubbleBox(dragIdx);
    bw = b.w; bh = b.h;
    group.setPointerCapture(e.pointerId);
    bubble.classList.add('is-pressed');
    follow(e.clientX);
  });
  group.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    moved = Math.max(moved, Math.abs(e.clientX - startX));
    if (moved > 3) bubble.classList.add('is-drag');
    dragIdx = follow(e.clientX);
  });
  const release = (e, cancelled) => {
    if (!dragging) return;
    dragging = false;
    bubble.classList.remove('is-pressed', 'is-drag');
    navLinks.forEach((a) => a.classList.remove('is-hot'));
    if (cancelled) { shown = activeIdx; place(); return; }
    // klik biasa -> link yang ditekan; drag -> link terdekat dari bubble
    const idx = moved < 4 ? dragIdx : dragIdx;
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 80);
    shown = idx; place();
    scrollToHash(navLinks[idx].getAttribute('href'));
  };
  group.addEventListener('pointerup', (e) => release(e, false));
  group.addEventListener('pointercancel', (e) => release(e, true));
  // cegah klik ganda setelah pointerup (capture: jalan sebelum handler anchor)
  group.addEventListener('click', (e) => {
    if (suppressClick) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  // section aktif berdasarkan posisi scroll
  const detectActive = (y, vh) => {
    if (lock || dragging) return;
    const docH = document.documentElement.scrollHeight;
    let best = -1, bestTop = -Infinity;
    const probe = y + vh * 0.35;
    navTargets.forEach((el, i) => {
      if (!el) return;
      const top = el.getBoundingClientRect().top + y;
      if (top <= probe && top > bestTop) { best = i; bestTop = top; }
    });
    if (y + vh >= docH - 4) best = navLinks.findIndex((a) => a.getAttribute('href') === '#location');
    if (best !== activeIdx) setActive(best);
  };

  /* ---------- Mobile menu ---------- */
  const setMenu = (open) => {
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Tutup menu' : 'Buka menu');
  };
  burger.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  $$('.nav__links a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => e.key === 'Escape' && setMenu(false));

  /* ---------- Horizontal pinned section ---------- */
  let travel = 0;
  const measure = () => {
    const vw = innerWidth;
    travel = Math.max(0, track.scrollWidth - vw);
    // scroll distance = horizontal travel + one viewport (pin height)
    news.style.height = `${travel + Math.max(innerHeight, 640) + innerHeight * 0.15}px`;
  };

  /* ---------- Scroll loop ---------- */
  let ticking = false;

  const update = () => {
    ticking = false;
    const y = scrollY;
    const vh = innerHeight;

    // nav: mengecil jadi pill kecil setelah sedikit scroll
    nav.classList.toggle('is-compact', y > 80);
    detectActive(y, vh);

    if (reduced) return;

    // hero progress
    const heroRange = hero.offsetHeight - vh;
    hero.style.setProperty('--p', clamp(y / heroRange).toFixed(4));

    // horizontal scroll progress
    const nTop = news.offsetTop;
    const nRange = news.offsetHeight - Math.max(vh, 640);
    const wp = clamp((y - nTop) / nRange);
    news.style.setProperty('--wp', wp.toFixed(4));
    const tp = clamp(wp / 0.92);
    track.style.setProperty('--tx', (-travel * tp).toFixed(1));

    // image parallax inside Everyday cards
    for (const img of parallaxImgs) {
      const r = img.parentElement.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) continue;
      const t = (r.top + r.height / 2 - vh / 2) / vh;
      img.style.setProperty('--py', `${(t * -48).toFixed(1)}px`);
    }
  };

  const onScroll = () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  };

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { measure(); onScroll(); });
  addEventListener('load', () => { measure(); update(); });
  measure();
  update();

  /* ---------- Reveal on scroll ---------- */
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }
})();
