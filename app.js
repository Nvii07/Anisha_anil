/* ==========================================================================
   ANISHA ANIL — Y2K JEWELCASE PORTFOLIO v2
   Deterministic Ransom Type, Torn Paper Edges, Dynamic Catalog & Lightbox
   ========================================================================== */

(() => {
  'use strict';

  /* ── 1. Deterministic PRNG & Cut-Out Generators (from template) ──────── */
  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function rng(seed) {
    let a = seed | 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const KINDS = ['a', 'box', 'serif', 'cond', 'low'];
  const WEIGHTS = [0.34, 0.2, 0.16, 0.16, 0.14];

  function ransom(word, salt = '') {
    const r = rng(hash(word + salt));
    const out = [];
    let prev = '';
    for (const ch of word) {
      if (ch === ' ') {
        out.push({ ch, kind: 'sp', rot: 0, dy: 0, size: 1 });
        prev = '';
        continue;
      }
      let kind = prev;
      for (let k = 0; k < 6 && kind === prev; k++) {
        let x = r();
        kind = KINDS[KINDS.length - 1];
        for (let i = 0; i < KINDS.length; i++) {
          if (x < WEIGHTS[i]) {
            kind = KINDS[i];
            break;
          }
          x -= WEIGHTS[i];
        }
      }
      prev = kind;
      out.push({
        ch,
        kind,
        rot: Math.round((r() * 10 - 5) * 10) / 10,
        dy: Math.round((r() * 0.12 - 0.06) * 100) / 100,
        size: Math.round((0.88 + r() * 0.24) * 100) / 100
      });
    }
    return out;
  }

  function torn(seed, side, n = 72, amp = 14) {
    const r = rng(hash(seed));
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const x = Math.round((i / n) * 10000) / 100;
      const j = Math.round(r() * amp * 10) / 10;
      pts.push(`${x}% ${side === 'top' ? `${j}px` : `calc(100% - ${j}px)`}`);
    }
    return side === 'top'
      ? `polygon(${pts.join(',')},100% 100%,0% 100%)`
      : `polygon(0% 0%,100% 0%,${pts.reverse().join(',')})`;
  }

  function tapeClip(seed) {
    const r = rng(hash(seed));
    const l = [];
    const rt = [];
    for (let i = 0; i <= 6; i++) {
      const y = Math.round((i / 6) * 100);
      l.push(`${Math.round(r() * 5)}% ${y}%`);
      rt.push(`${100 - Math.round(r() * 5)}% ${100 - y}%`);
    }
    return `polygon(${l.concat(rt).join(',')})`;
  }

  /* ── 2. Hydrate Ransom Words, Torn Edges & Tape Strips ───────────────── */
  function hydratePaperTypography() {
    document.querySelectorAll('[data-ransom]').forEach(el => {
      const word = el.getAttribute('data-ransom') || '';
      const salt = el.getAttribute('data-salt') || '';
      const letters = ransom(word, salt);
      el.classList.add('jf-ransom');
      el.setAttribute('aria-label', word);
      el.setAttribute('role', 'img');

      el.innerHTML = letters
        .map((l, i) => {
          if (l.kind === 'sp') {
            return '<span class="jf-sp" aria-hidden="true"></span>';
          }
          return `<span aria-hidden="true" class="jf-rl jf-k-${l.kind}" style="transform: translateY(${l.dy}em) rotate(${l.rot}deg); font-size: ${l.size}em; --i: ${i}">${l.ch}</span>`;
        })
        .join('');
    });

    document.querySelectorAll('[data-edge]').forEach(el => {
      const seed = el.getAttribute('data-edge') || 'edge';
      const side = el.getAttribute('data-side') === 'bottom' ? 'bottom' : 'top';
      el.innerHTML = `
        <div class="jf-edge-fibre" style="clip-path: ${torn(seed + 'f', side, 90, 18)}"></div>
        <div class="jf-edge-face" style="clip-path: ${torn(seed, side, 72, 14)}"></div>
      `;
    });

    document.querySelectorAll('[data-tape]').forEach(el => {
      const seed = el.getAttribute('data-tape') || el.textContent || 'tape';
      el.style.clipPath = tapeClip(seed);
    });
  }

  function makeTape(label, tilt = -3, extraClass = '') {
    return `<span class="jf-tape ${extraClass}" style="clip-path:${tapeClip(label)}; transform: rotate(${tilt}deg)">${label}</span>`;
  }

  /* ── 3. Render Portfolio Sections from PROJECTS_DATA ─────────────────── */
  function byId(id) {
    return PROJECTS_DATA.find(p => p.id === id);
  }

  function renderPostersWall() {
    const wall = document.getElementById('posters-wall');
    if (!wall) return;

    const posters = PROJECTS_DATA.filter(p => p.chapter === 1);
    const tilesHtml = posters
      .map(
        p => `
      <div class="jf-poster-tile" data-work-id="${p.id}" role="button" tabindex="0" aria-label="Inspect ${p.title}">
        <img src="${p.thumb}" alt="${p.title} — ${p.tagline}" loading="lazy" />
      </div>`
      )
      .join('');

    const indexTileHtml = `
      <div class="jf-poster-index-tile" id="poster-wall-index-btn" role="button" tabindex="0" aria-label="Open full 21-piece catalog index">
        <span class="jf-poster-index-num">CH. 01 · 01–09</span>
        <span class="jf-poster-index-title">POSTER<br/>ARCHIVE</span>
        <span class="jf-poster-index-sub">Click any poster to inspect · View full index →</span>
      </div>
    `;

    wall.innerHTML = tilesHtml + indexTileHtml;
  }

  function renderAdsSection() {
    const heroPair = document.getElementById('ads-hero-pair');
    const boardBlock = document.getElementById('ads-board-block');
    const cardsBlock = document.getElementById('ads-cards-block');
    const moodBlock = document.getElementById('ads-mood-block');

    const starbucks = byId(10);
    const kfc = byId(11);
    const burger = byId(12);
    const rocket = byId(13);
    const instamart = byId(14);
    const converse = byId(15);
    const tea = byId(16);
    const muffin = byId(17);

    if (heroPair && starbucks && converse) {
      heroPair.innerHTML = `
        <figure class="jf-pub-a" data-work-id="${starbucks.id}" role="button" tabindex="0">
          ${makeTape('Hero Concept', -4)}
          <img src="${starbucks.thumb}" alt="${starbucks.title}" loading="lazy" />
        </figure>
        <figure class="jf-pub-b" data-work-id="${converse.id}" role="button" tabindex="0">
          <img src="${converse.thumb}" alt="${converse.title}" loading="lazy" />
        </figure>
      `;
    }

    if (boardBlock && kfc && burger) {
      const feedPics = [10, 11, 12, 13, 14, 15, 16, 17, 1, 6, 18, 19]
        .map(id => byId(id))
        .filter(Boolean);

      boardBlock.innerHTML = `
        ${makeTape('Food & QSR', -2)}
        <div class="jf-board">
          <img src="${kfc.thumb}" alt="${kfc.title}" data-work-id="${kfc.id}" role="button" tabindex="0" loading="lazy" />
          <img src="${burger.thumb}" alt="${burger.title}" data-work-id="${burger.id}" role="button" tabindex="0" loading="lazy" />
          <div class="jf-phone">
            <div class="jf-phone-screen">
              <span class="jf-notch" aria-hidden="true"></span>
              <div class="jf-feed">
                <div class="jf-feed-top">
                  <span class="jf-avatar">A</span>
                  <span>
                    <b>@_suzume___._</b>
                    <i>21 works · Graphic Design</i>
                  </span>
                </div>
                <div class="jf-feed-grid">
                  ${feedPics.map(p => `<img src="${p.thumb}" alt="${p.title}" data-work-id="${p.id}" loading="lazy" />`).join('')}
                </div>
              </div>
            </div>
          </div>
        </div>
        <p class="jf-cap">High-impact food &amp; QSR campaigns: mid-air explosion lighting for KFC Spicy Chicken and low-angle street speed streaks for the Burger Launch teaser.</p>
      `;
    }

    if (cardsBlock && rocket && instamart && tea && muffin) {
      const strip = [rocket, instamart, tea, muffin];
      cardsBlock.innerHTML = `
        ${makeTape('Social & Product', 3)}
        <div class="jf-cards">
          ${strip
            .map(
              p => `<img src="${p.thumb}" alt="${p.title}" data-work-id="${p.id}" role="button" tabindex="0" loading="lazy" />`
            )
            .join('')}
        </div>
        <p class="jf-cap">Surreal rocket-burger flight paths, cling-film grocery freshness, cast-iron tea serenity, and split-screen dessert typography.</p>
      `;
    }

    if (moodBlock && starbucks && instamart && tea) {
      const palette = ['#F1E8AC', '#00704A', '#E86A17', '#D62828', '#F9A825', '#541212'];
      const moodFeed = [10, 15, 16, 17, 13, 14, 11, 12, 3, 4, 5, 20].map(id => byId(id)).filter(Boolean);

      moodBlock.innerHTML = `
        ${makeTape('Campaign Palette', -3)}
        <div class="jf-mood">
          <div class="jf-phone jf-phone-b">
            <div class="jf-phone-screen">
              <span class="jf-notch" aria-hidden="true"></span>
              <div class="jf-feed">
                <div class="jf-feed-top">
                  <span class="jf-avatar">A</span>
                  <span>
                    <b>@_.anisha_anil</b>
                    <i>Kerala, IN · Visuals</i>
                  </span>
                </div>
                <div class="jf-feed-grid">
                  ${moodFeed.map(p => `<img src="${p.thumb}" alt="${p.title}" data-work-id="${p.id}" loading="lazy" />`).join('')}
                </div>
              </div>
            </div>
          </div>
          <img src="${tea.thumb}" alt="${tea.title}" class="jf-mood-a" data-work-id="${tea.id}" loading="lazy" />
          <img src="${instamart.thumb}" alt="${instamart.title}" class="jf-mood-b" data-work-id="${instamart.id}" loading="lazy" />
          <img src="${starbucks.thumb}" alt="${starbucks.title}" class="jf-mood-c" data-work-id="${starbucks.id}" loading="lazy" />
          <div class="jf-mood-sw">
            ${palette.map(hex => `<span style="background:${hex}" data-copy-hex="${hex}" title="Copy ${hex}"></span>`).join('')}
          </div>
        </div>
        <p class="jf-cap">Campaign colour system across food, beverage, retail and apparel briefs — click any swatch to copy its hex code.</p>
      `;
    }
  }

  function renderDigitalArt() {
    const container = document.getElementById('digital-trio');
    if (!container) return;

    const works = PROJECTS_DATA.filter(p => p.chapter === 4);
    container.innerHTML = works
      .map(
        p => `
      <article class="jf-digital-card" data-work-id="${p.id}" role="button" tabindex="0" aria-label="Inspect ${p.title}">
        <img src="${p.thumb}" alt="${p.title} — ${p.tagline}" loading="lazy" />
        <div class="jf-digital-meta">
          <b>${p.title}</b>
          <span>#${p.number}</span>
        </div>
      </article>
    `
      )
      .join('');
  }

  function renderPrintSection() {
    const container = document.getElementById('print-showcase');
    if (!container) return;

    const menu = byId(18);
    if (!menu) return;

    container.innerHTML = `
      <figure class="jf-print-frame" data-work-id="${menu.id}" role="button" tabindex="0" aria-label="Inspect Lobster House Menu Cover">
        ${makeTape('Front Cover', -3)}
        <img src="${menu.thumb}" alt="${menu.title} — Cover" loading="lazy" />
        <figcaption class="jf-cap">Front Cover · Woven crimson linen texture &amp; vintage lobster cartouche (5.5 × 8.5 in · 300 dpi).</figcaption>
      </figure>
      <figure class="jf-print-frame jf-print-frame--back" data-work-id="${menu.id}" data-open-flipped="true" role="button" tabindex="0" aria-label="Inspect Lobster House Inside Menu">
        ${makeTape('Inside Spread', 2)}
        <img src="${menu.backThumb}" alt="${menu.title} — Inside Menu" loading="lazy" />
        <figcaption class="jf-cap">Inside Menu · Appetizers, soups &amp; salads, and entrées organized with ornamental dividers.</figcaption>
      </figure>
    `;
  }

  function renderFeaturedKits() {
    const container = document.getElementById('featured-kits');
    if (!container) return;

    const featured = [
      { project: byId(1), fontLabel: 'Display Serif & Kanji', fontFamily: 'Abril Fatface', faceCss: 'var(--font-serif)', flip: false },
      { project: byId(10), fontLabel: 'Campaign Sans', fontFamily: 'Poppins', faceCss: 'var(--font-sans)', flip: true },
      { project: byId(18), fontLabel: 'Fine-Dining Editorial', fontFamily: 'Archivo Black', faceCss: 'var(--font-black)', flip: false }
    ].filter(x => x.project);

    container.innerHTML = featured
      .map((item, idx) => {
        const p = item.project;
        const rows = [0, 1, 2, 3];
        const cols = ['400', '600', '400i', '700'];

        const specimenHtml = `
          <div>
            <span class="jf-mini">${item.fontLabel}</span>
            <div class="jf-spec-grid" style="font-family: ${item.faceCss}">
              ${cols
                .map(c =>
                  rows
                    .map(
                      () =>
                        `<span style="font-weight:${c.startsWith('7') ? 700 : c.startsWith('6') ? 600 : 400};font-style:${c.endsWith('i') ? 'italic' : 'normal'}">${item.fontFamily.split(' ')[0]}</span>`
                    )
                    .join('')
                )
                .join('')}
            </div>
          </div>
        `;

        const swatchesHtml = `
          <div>
            <span class="jf-mini">Colour palette (click to copy)</span>
            <div class="jf-swatches">
              ${p.colorStory.map(s => `<span style="background:${s.hex}" data-copy-hex="${s.hex}" title="${s.name} (${s.hex})"></span>`).join('')}
            </div>
          </div>
        `;

        const calloutsHtml = `
          <div class="jf-callout-chips">
            ${p.callouts.map(c => `<span>${c}</span>`).join('')}
          </div>
        `;

        const imgBlock = `<img src="${p.thumb}" alt="${p.title}" class="jf-kit-logo" data-work-id="${p.id}" role="button" tabindex="0" loading="lazy" />`;
        const infoBlock = `
          <div class="jf-kit-info">
            <h3 class="jf-kit-title">${p.title}</h3>
            <p>${p.description}</p>
            ${specimenHtml}
            ${swatchesHtml}
            ${calloutsHtml}
          </div>
        `;

        const divider = idx < featured.length - 1 ? '<hr class="jf-dash" />' : '';
        return `
          <div class="jf-kit ${item.flip ? 'jf-kit-flip' : ''} jf-rv">
            ${makeTape(`Featured 0${idx + 1}`, item.flip ? -3 : 2, 'jf-kit-tape')}
            ${item.flip ? infoBlock + imgBlock : imgBlock + infoBlock}
          </div>
          ${divider}
        `;
      })
      .join('');
  }

  /* ── 4. Hero CD Toggle (Illustrated ↔ Original Photo) ────────────────── */
  function initHeroDiscToggle() {
    const disc = document.getElementById('hero-cd-disc');
    if (!disc) return;

    const toggle = () => {
      const isPhoto = disc.classList.toggle('is-photo');
      showToast(isPhoto ? 'CD Artwork: Original Photograph' : 'CD Artwork: Illustrated Portrait');
    };

    disc.addEventListener('click', toggle);
    disc.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  }

  /* ── 5. Lightbox Modal & 3D Flip ─────────────────────────────────────── */
  let activeId = 1;

  function updateModalImage(startFlipped = false) {
    const p = byId(activeId);
    if (!p) return;

    const modalImg = document.getElementById('modal-img');
    const flipWrap = document.getElementById('modal-flip-container');
    const flipCard = document.getElementById('modal-flip-card');
    const frontImg = document.getElementById('modal-flip-img-front');
    const backImg = document.getElementById('modal-flip-img-back');
    const frontBadge = document.getElementById('modal-flip-badge-front');
    const backBadge = document.getElementById('modal-flip-badge-back');
    const flipBtnLabel = document.getElementById('modal-flip-btn');

    if (p.hasBackSide) {
      modalImg.style.display = 'none';
      flipWrap.style.display = 'flex';
      frontImg.src = p.thumb;
      frontImg.alt = `${p.title} — ${p.frontLabel || 'Cover'}`;
      backImg.src = p.backThumb || p.backSpread || '';
      backImg.alt = `${p.title} — ${p.backLabel || 'Inside'}`;
      frontBadge.textContent = p.frontLabel || 'Cover';
      backBadge.textContent = p.backLabel || 'Inside';
      flipCard.classList.toggle('is-flipped', Boolean(startFlipped));
      flipBtnLabel.textContent = startFlipped
        ? `Flip to ${p.frontLabel || 'Cover'}`
        : `Flip to ${p.backLabel || 'Inside'}`;
    } else {
      flipWrap.style.display = 'none';
      flipCard.classList.remove('is-flipped');
      modalImg.style.display = 'block';
      modalImg.src = p.thumb;
      modalImg.alt = p.title;
    }
  }

  function openLightbox(id, startFlipped = false) {
    const p = byId(id);
    if (!p) return;
    activeId = id;

    updateModalImage(startFlipped);

    document.getElementById('modal-number').textContent = `NO. ${p.number} · CHAPTER 0${p.chapter} (${p.chapterName.toUpperCase()})`;
    document.getElementById('modal-title').textContent = p.title;
    document.getElementById('modal-tagline').textContent = `"${p.tagline}"`;
    document.getElementById('modal-type').textContent = p.type;
    document.getElementById('modal-format').textContent = p.format;
    document.getElementById('modal-tools').textContent = p.tools;
    document.getElementById('modal-focus').textContent = p.focus;
    document.getElementById('modal-desc').textContent = p.description;
    document.getElementById('modal-counter').textContent = `${String(p.id).padStart(2, '0')} / ${String(PROJECTS_DATA.length).padStart(2, '0')}`;

    const calloutsEl = document.getElementById('modal-callouts');
    calloutsEl.innerHTML = p.callouts?.length
      ? `<h5>Design Callouts</h5><ul>${p.callouts.map(c => `<li>${c}</li>`).join('')}</ul>`
      : '';

    const swatchesEl = document.getElementById('modal-swatches');
    swatchesEl.innerHTML = p.colorStory?.length
      ? `<h5>Color Story (Click to Copy)</h5><div class="jf-modal-swatch-list">${p.colorStory
          .map(
            s => `<button type="button" class="jf-modal-swatch-chip" data-copy-hex="${s.hex}"><span class="jf-modal-swatch-dot" style="background:${s.hex}"></span><span>${s.name} (${s.hex})</span></button>`
          )
          .join('')}</div>`
      : '';

    document.getElementById('lightbox-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    document.getElementById('lightbox-modal').classList.remove('active');
    document.body.style.overflow = '';
  }

  function stepModal(delta) {
    let next = activeId + delta;
    if (next < 1) next = PROJECTS_DATA.length;
    if (next > PROJECTS_DATA.length) next = 1;
    openLightbox(next);
  }

  function initLightbox() {
    const backdrop = document.getElementById('lightbox-modal');
    const closeBtn = document.getElementById('modal-close-btn');
    const flipCard = document.getElementById('modal-flip-card');
    const flipBtn = document.getElementById('modal-flip-btn');

    const toggleFlip = () => {
      const p = byId(activeId);
      if (!p || !p.hasBackSide) return;
      const isFlipped = flipCard.classList.toggle('is-flipped');
      flipBtn.textContent = isFlipped ? `Flip to ${p.frontLabel || 'Cover'}` : `Flip to ${p.backLabel || 'Inside'}`;
    };

    flipBtn?.addEventListener('click', toggleFlip);
    flipCard?.addEventListener('click', toggleFlip);

    closeBtn?.addEventListener('click', closeLightbox);
    backdrop?.addEventListener('click', e => {
      if (e.target === backdrop) closeLightbox();
    });

    document.getElementById('modal-prev-btn')?.addEventListener('click', () => stepModal(-1));
    document.getElementById('modal-next-btn')?.addEventListener('click', () => stepModal(1));
    document.getElementById('modal-img-prev')?.addEventListener('click', () => stepModal(-1));
    document.getElementById('modal-img-next')?.addEventListener('click', () => stepModal(1));

    document.addEventListener('keydown', e => {
      if (!backdrop.classList.contains('active')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') stepModal(-1);
      if (e.key === 'ArrowRight') stepModal(1);
    });

    document.addEventListener('click', e => {
      const trigger = e.target.closest('[data-work-id]');
      if (!trigger) return;
      const id = Number(trigger.getAttribute('data-work-id'));
      const startFlipped = trigger.getAttribute('data-open-flipped') === 'true';
      if (id) openLightbox(id, startFlipped);
    });

    document.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const trigger = e.target.closest('[data-work-id]');
      if (!trigger) return;
      e.preventDefault();
      const id = Number(trigger.getAttribute('data-work-id'));
      const startFlipped = trigger.getAttribute('data-open-flipped') === 'true';
      if (id) openLightbox(id, startFlipped);
    });
  }

  /* ── 6. Receipt Index Drawer ─────────────────────────────────────────── */
  function initReceiptDrawer() {
    const drawer = document.getElementById('receipt-drawer');
    const toggleBtn = document.getElementById('receipt-toggle-btn');
    const closeBtn = document.getElementById('receipt-close-btn');
    const listEl = document.getElementById('receipt-items');
    const summaryEl = document.getElementById('receipt-summary');

    if (!drawer || !listEl) return;

    const counts = CHAPTERS_INFO.map(c => {
      const n = PROJECTS_DATA.filter(p => p.chapter === c.id).length;
      return `${String(n).padStart(2, '0')} ${c.title.toUpperCase()}`;
    }).join(' · ');

    if (summaryEl) {
      summaryEl.textContent = `${PROJECTS_DATA.length} ITEMS · ${counts}`;
    }

    listEl.innerHTML = PROJECTS_DATA.map(
      p => `
      <div class="jf-receipt-row" data-receipt-id="${p.id}">
        <span>#${p.number} ${p.title}</span>
        <span>CH.0${p.chapter}</span>
      </div>`
    ).join('');

    listEl.addEventListener('click', e => {
      const row = e.target.closest('[data-receipt-id]');
      if (!row) return;
      const id = Number(row.getAttribute('data-receipt-id'));
      drawer.classList.remove('open');
      openLightbox(id);
    });

    const openDrawer = () => drawer.classList.toggle('open');
    toggleBtn?.addEventListener('click', openDrawer);
    document.getElementById('poster-wall-index-btn')?.addEventListener('click', openDrawer);
    closeBtn?.addEventListener('click', () => drawer.classList.remove('open'));
  }

  /* ── 7. Copy Hex / Contact + Toast ───────────────────────────────────── */
  let toastTimer = null;
  function showToast(msg) {
    const el = document.getElementById('toast-notice');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  function copyText(text, label) {
    navigator.clipboard?.writeText(text).then(
      () => showToast(label),
      () => showToast(text)
    );
  }

  function initCopyActions() {
    document.addEventListener('click', e => {
      const swatch = e.target.closest('[data-copy-hex]');
      if (swatch) {
        const hex = swatch.getAttribute('data-copy-hex');
        copyText(hex, `Copied ${hex}`);
      }
    });

    document.getElementById('btn-copy-email')?.addEventListener('click', e => {
      e.preventDefault();
      copyText('anishanil708@gmail.com', 'Copied email: anishanil708@gmail.com');
    });

    document.getElementById('btn-copy-phone')?.addEventListener('click', e => {
      e.preventDefault();
      copyText('+91 96567 55464', 'Copied phone: +91 96567 55464');
    });
  }

  /* ── 8. Splash Screen & Reveal Motion ────────────────────────────────── */
  function activateHeroReady() {
    const root = document.getElementById('jf-root');
    if (root) {
      root.classList.add('jf-ready');
    }
  }

  function initSplashScreen() {
    const splash = document.getElementById('jf-splash');
    const fill = document.getElementById('splash-fill');
    const track = document.getElementById('splash-track');
    const pct = document.getElementById('splash-pct');

    if (!splash || !fill || !track) {
      activateHeroReady();
      return;
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      splash.style.display = 'none';
      activateHeroReady();
      return;
    }

    let exited = false;
    let rafId = null;
    let exitTimer = null;
    const DURATION = 1650;

    document.body.style.overflow = 'hidden';

    const easeProgress = t => (t < 0.5 ? 2.2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

    const exitSplash = () => {
      if (exited) return;
      exited = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (exitTimer !== null) clearTimeout(exitTimer);
      fill.style.transform = 'scaleX(1)';
      track.setAttribute('aria-valuenow', '100');
      if (pct) pct.textContent = '100%';
      splash.classList.add('is-exiting');
      document.body.style.overflow = '';
      setTimeout(activateHeroReady, 180);
      setTimeout(() => {
        splash.style.display = 'none';
      }, 650);
    };

    const startSplash = () => {
      if (exited) return;
      splash.classList.add('is-active');
      const startTime = performance.now() + 260;

      const tick = now => {
        if (exited) return;
        if (now < startTime) {
          rafId = requestAnimationFrame(tick);
          return;
        }
        const raw = Math.min((now - startTime) / DURATION, 1);
        const eased = Math.min(easeProgress(raw), 1);
        fill.style.transform = `scaleX(${eased.toFixed(4)})`;
        const val = Math.round(eased * 100);
        track.setAttribute('aria-valuenow', String(val));
        if (pct) pct.textContent = `${String(val).padStart(2, '0')}%`;

        if (raw < 1) {
          rafId = requestAnimationFrame(tick);
        } else {
          exitTimer = setTimeout(exitSplash, 260);
        }
      };

      rafId = requestAnimationFrame(tick);
    };

    splash.addEventListener('click', exitSplash);
    window.addEventListener('keydown', e => {
      if (!exited && (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        exitSplash();
      }
    });

    if (document.fonts && document.fonts.ready) {
      Promise.race([document.fonts.ready, new Promise(res => setTimeout(res, 450))]).then(startSplash);
    } else {
      startSplash();
    }
  }

  function initRevealMotion() {
    const items = Array.from(document.querySelectorAll('.jf-rv'));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof IntersectionObserver === 'undefined') {
      items.forEach(n => n.classList.add('jf-in'));
      return;
    }

    const io = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('jf-in');
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.01 }
    );
    items.forEach(n => io.observe(n));
  }

  /* ── Boot ────────────────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    hydratePaperTypography();
    initSplashScreen();
    renderPostersWall();
    renderAdsSection();
    renderDigitalArt();
    renderPrintSection();
    renderFeaturedKits();
    initHeroDiscToggle();
    initLightbox();
    initReceiptDrawer();
    initCopyActions();
    initRevealMotion();
  });
})();
