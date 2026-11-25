/**
 * PillNav — Vanilla JavaScript Component Engine (React Bits)
 * Variant: JavaScript + CSS
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PillNav = factory();
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  class PillNav {
    constructor(container, options = {}) {
      this.container = typeof container === 'string' ? document.querySelector(container) : container;
      if (!this.container) return;

      this.options = Object.assign({
        logo: null,
        logoAlt: 'Company',
        items: [
          { label: 'About', href: '#about' },
          { label: 'Toolkit', href: '#toolkit' },
          { label: 'Works', href: '#portfolio' }
        ],
        activeHref: '#hero',
        itemStyle: 'plain',
        hoverEffect: 'glide',
        indicator: 'dot',
        layout: 'joined',
        surface: 'none',
        size: 'lg',
        bounce: 0.48,
        stretch: 0.5,
        collapse: 'auto',
        intro: true,
        onItemClick: null
      }, options);

      this.currentActive = this.options.activeHref;
      this.hoveredIndex = null;
      this.prevIndex = 0;
      this.isMobileOpen = false;

      this.init();
    }

    init() {
      this.buildDOM();
      this.bindEvents();
      this.initScrollSpy();

      // Initial layout update
      requestAnimationFrame(() => {
        this.updateActiveItem(this.currentActive, false);
      });
    }

    buildDOM() {
      this.container.classList.add(
        'pill-nav',
        `pill-nav--size-${this.options.size}`,
        `pill-nav--layout-${this.options.layout}`,
        `pill-nav--item-${this.options.itemStyle}`,
        `pill-nav--surface-${this.options.surface}`,
        `pill-nav--hover-${this.options.hoverEffect}`,
        `pill-nav--indicator-${this.options.indicator}`
      );

      if (this.options.intro) {
        this.container.classList.add('pill-nav--intro');
      }

      this.container.style.setProperty('--pill-bounce', this.options.bounce);
      this.container.style.setProperty('--pill-stretch', this.options.stretch);

      // Main inner capsule
      const navContainer = document.createElement('div');
      navContainer.className = 'pill-nav__container';

      // 1. Logo
      const logoEl = document.createElement('a');
      logoEl.href = '#hero';
      logoEl.className = 'pill-nav__logo nav-brand';
      logoEl.setAttribute('aria-label', this.options.logoAlt);

      if (this.options.logo && typeof this.options.logo === 'object' && this.options.logo.icon) {
        logoEl.innerHTML = `${this.options.logo.icon}<span>${this.options.logo.text || this.options.logoAlt}</span>`;
      } else if (typeof this.options.logo === 'string') {
        logoEl.innerHTML = `<span>${this.options.logo}</span>`;
      } else {
        logoEl.innerHTML = `<svg class="brand-logo-mark" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 4h4v4" /><path d="M20 8v4h-4" /><path d="M16 20h-4v-4" /><path d="M4 16v-4h4" /><line x1="5" y1="5" x2="8" y2="8" stroke-width="2.9" /><line x1="19" y1="5" x2="16" y2="8" stroke-width="2.9" /><line x1="19" y1="19" x2="16" y2="16" stroke-width="2.9" /><line x1="5" y1="19" x2="8" y2="16" stroke-width="2.9" /></svg><span class="brand-name">Anisha Anil</span>`;
      }
      navContainer.appendChild(logoEl);

      // 2. Navigation items track
      const track = document.createElement('div');
      track.className = 'pill-nav__track';
      this.trackEl = track;

      // Glide highlight element
      if (this.options.hoverEffect === 'glide') {
        this.glideEl = document.createElement('div');
        this.glideEl.className = 'pill-nav__glide';
        this.glideEl.setAttribute('aria-hidden', 'true');
        track.appendChild(this.glideEl);
      }

      // Active dot element
      if (this.options.indicator === 'dot') {
        this.dotEl = document.createElement('div');
        this.dotEl.className = 'pill-nav__dot';
        this.dotEl.setAttribute('aria-hidden', 'true');
        track.appendChild(this.dotEl);
      }

      // Nav list
      const ul = document.createElement('ul');
      ul.className = 'pill-nav__list';

      this.linkElements = [];
      this.options.items.forEach((item, idx) => {
        const li = document.createElement('li');
        li.className = 'pill-nav__item';

        const a = document.createElement('a');
        a.href = item.href;
        a.className = 'pill-nav__link';
        a.setAttribute('data-index', idx);
        a.innerHTML = `<span class="pill-nav__label">${item.label}</span>`;

        li.appendChild(a);
        ul.appendChild(li);
        this.linkElements.push(a);
      });

      track.appendChild(ul);
      navContainer.appendChild(track);

      // 3. Right Actions
      const actions = document.createElement('div');
      actions.className = 'pill-nav__actions';
      actions.innerHTML = `
        <a href="#contact" class="pill-nav__cta-btn">Contact Us</a>
        <button id="theme-toggle-btn" class="pill-nav__grid-btn pill-nav__theme-btn" aria-label="Toggle Dark/Light Mode" title="Toggle Dark/Light Theme">
          <svg class="theme-icon theme-icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
          <svg class="theme-icon theme-icon-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
        </button>
      `;
      navContainer.appendChild(actions);

      // 4. Mobile Toggle
      if (this.options.collapse === 'auto') {
        const toggle = document.createElement('button');
        toggle.className = 'pill-nav__toggle';
        toggle.setAttribute('aria-label', 'Toggle Navigation Menu');
        toggle.innerHTML = `
          <span class="pill-nav__toggle-bar"></span>
          <span class="pill-nav__toggle-bar"></span>
        `;
        navContainer.appendChild(toggle);
        this.toggleEl = toggle;
      }

      this.container.innerHTML = '';
      this.container.appendChild(navContainer);
    }

    bindEvents() {
      // Hover events on links
      this.linkElements.forEach((link, idx) => {
        link.addEventListener('mouseenter', () => {
          this.setHovered(idx);
        });

        link.addEventListener('click', (e) => {
          const href = link.getAttribute('href');
          if (href && href.startsWith('#')) {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
              const targetY = target.offsetTop - 80;
              window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
            }
          }
          this.updateActiveItem(href, true);
          this.closeMobile();

          if (this.options.onItemClick) {
            this.options.onItemClick(this.options.items[idx], idx);
          }
        });
      });

      // Track mouseleave returns glide to active link
      if (this.trackEl) {
        this.trackEl.addEventListener('mouseleave', () => {
          this.setHovered(null);
        });
      }

      // Mobile toggle
      if (this.toggleEl) {
        this.toggleEl.addEventListener('click', () => {
          this.isMobileOpen = !this.isMobileOpen;
          this.trackEl.classList.toggle('is-open', this.isMobileOpen);
          this.toggleEl.classList.toggle('is-active', this.isMobileOpen);
        });
      }

      // Resize listener to re-align positions
      window.addEventListener('resize', () => {
        this.repositionElements();
      });
    }

    setHovered(idx) {
      this.hoveredIndex = idx;
      this.updateGlidePosition();
    }

    updateGlidePosition() {
      if (!this.glideEl || this.options.hoverEffect !== 'glide') return;

      const activeIdx = this.options.items.findIndex(it => it.href === this.currentActive);
      const targetIdx = this.hoveredIndex !== null ? this.hoveredIndex : (activeIdx !== -1 ? activeIdx : null);

      if (targetIdx !== null && this.linkElements[targetIdx]) {
        const target = this.linkElements[targetIdx];
        const trackRect = this.trackEl.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();

        const left = targetRect.left - trackRect.left;
        const width = targetRect.width;
        const height = targetRect.height;
        const top = targetRect.top - trackRect.top;

        // Elastic stretch physics
        const prevIdx = this.prevIndex;
        const dir = targetIdx > prevIdx ? 1 : targetIdx < prevIdx ? -1 : 0;
        const stretchAmount = dir !== 0 ? Math.min(Math.abs(targetIdx - prevIdx) * 14 * this.options.stretch, 26) : 0;
        this.prevIndex = targetIdx;

        this.glideEl.style.opacity = '1';
        this.glideEl.style.transform = `translate3d(${left}px, ${top}px, 0) scaleX(${1 + stretchAmount / width})`;
        this.glideEl.style.width = `${width}px`;
        this.glideEl.style.height = `${height}px`;

        clearTimeout(this._stretchTimer);
        this._stretchTimer = setTimeout(() => {
          if (this.glideEl) {
            this.glideEl.style.transform = `translate3d(${left}px, ${top}px, 0) scaleX(1)`;
          }
        }, 150);
      } else {
        this.glideEl.style.opacity = '0';
      }
    }

    updateDotPosition() {
      if (!this.dotEl || this.options.indicator !== 'dot') return;

      const activeIdx = this.options.items.findIndex(it => it.href === this.currentActive);
      if (activeIdx !== -1 && this.linkElements[activeIdx]) {
        const target = this.linkElements[activeIdx];
        const trackRect = this.trackEl.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();

        const centerX = (targetRect.left - trackRect.left) + targetRect.width / 2;
        const bottomY = (targetRect.top - trackRect.top) + targetRect.height - 4;

        this.dotEl.style.opacity = '1';
        this.dotEl.style.transform = `translate3d(${centerX}px, ${bottomY}px, 0)`;
      } else {
        this.dotEl.style.opacity = '0';
      }
    }

    repositionElements() {
      this.updateGlidePosition();
      this.updateDotPosition();
    }

    updateActiveItem(href, animate = true) {
      this.currentActive = href;
      this.linkElements.forEach(link => {
        const isActive = link.getAttribute('href') === href;
        link.classList.toggle('is-active', isActive);
      });

      this.updateGlidePosition();
      this.updateDotPosition();
    }

    closeMobile() {
      if (this.isMobileOpen) {
        this.isMobileOpen = false;
        if (this.trackEl) this.trackEl.classList.remove('is-open');
        if (this.toggleEl) this.toggleEl.classList.remove('is-active');
      }
    }

    initScrollSpy() {
      const sectionIds = ['hero', 'about', 'toolkit', 'portfolio', 'contact'];
      let isScrolling = false;

      const checkSections = () => {
        const scrollY = window.scrollY + 160;
        let activeId = 'hero';

        for (let i = sectionIds.length - 1; i >= 0; i--) {
          const el = document.getElementById(sectionIds[i]);
          if (el && el.offsetTop <= scrollY) {
            activeId = sectionIds[i];
            break;
          }
        }

        const href = `#${activeId}`;
        if (this.currentActive !== href) {
          this.updateActiveItem(href, true);
        }
      };

      window.addEventListener('scroll', () => {
        if (!isScrolling) {
          isScrolling = true;
          requestAnimationFrame(() => {
            checkSections();
            isScrolling = false;
          });
        }
      }, { passive: true });

      checkSections();
    }
  }

  return PillNav;
});
