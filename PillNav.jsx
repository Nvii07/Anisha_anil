'use client';

import React, { useState, useEffect, useRef } from 'react';
import './PillNav.css';

/**
 * PillNav Component — React Bits (JavaScript + CSS)
 *
 * A modern pill-shaped navigation bar with elastic glide hover micro-interactions,
 * sliding active indicator dot with spring bounce physics, and responsive collapse.
 */
export default function PillNav({
  logo,
  logoAlt = 'Logo',
  items = [],
  activeHref = '/',
  itemStyle = 'plain',     // 'plain' | 'pill'
  hoverEffect = 'glide',   // 'glide' | 'fill' | 'none'
  indicator = 'dot',       // 'dot' | 'pill' | 'none'
  layout = 'joined',       // 'joined' | 'split'
  surface = 'none',        // 'none' | 'glass' | 'solid'
  size = 'lg',             // 'sm' | 'md' | 'lg'
  bounce = 0.48,           // spring overshoot factor (0 - 1)
  stretch = 0.5,            // elastic elongation factor during motion (0 - 1)
  collapse = 'auto',       // 'auto' | 'never'
  intro = true,
  rightActions,
  className = '',
  onItemClick
}) {
  const [currentActive, setCurrentActive] = useState(activeHref);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const trackRef = useRef(null);
  const glideRef = useRef(null);
  const dotRef = useRef(null);
  const prevIndexRef = useRef(0);

  // Sync activeHref when passed externally
  useEffect(() => {
    if (activeHref) setCurrentActive(activeHref);
  }, [activeHref]);

  // Compute active item index
  const activeIndex = items.findIndex(
    item => item.href === currentActive || (currentActive.startsWith('#') && item.href === currentActive)
  );

  // Update glide highlight position
  useEffect(() => {
    if (!trackRef.current || !glideRef.current || hoverEffect !== 'glide') return;

    const targetIndex = hoveredIndex !== null ? hoveredIndex : (activeIndex !== -1 ? activeIndex : null);
    const linkElements = trackRef.current.querySelectorAll('.pill-nav__link');

    if (targetIndex !== null && linkElements[targetIndex]) {
      const target = linkElements[targetIndex];
      const trackRect = trackRef.current.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();

      const left = targetRect.left - trackRect.left;
      const width = targetRect.width;
      const height = targetRect.height;
      const top = targetRect.top - trackRect.top;

      // Calculate directional stretch
      const prevIdx = prevIndexRef.current;
      const dir = targetIndex > prevIdx ? 1 : targetIndex < prevIdx ? -1 : 0;
      const stretchAmount = dir !== 0 ? Math.min(Math.abs(targetIndex - prevIdx) * 12 * stretch, 24) : 0;

      prevIndexRef.current = targetIndex;

      glideRef.current.style.opacity = '1';
      glideRef.current.style.transform = `translate3d(${left}px, ${top}px, 0) scaleX(${1 + stretchAmount / width})`;
      glideRef.current.style.width = `${width}px`;
      glideRef.current.style.height = `${height}px`;

      // Reset stretch after spring settle
      setTimeout(() => {
        if (glideRef.current) {
          glideRef.current.style.transform = `translate3d(${left}px, ${top}px, 0) scaleX(1)`;
        }
      }, 160);
    } else {
      glideRef.current.style.opacity = '0';
    }
  }, [hoveredIndex, activeIndex, hoverEffect, stretch]);

  // Update sliding indicator dot position
  useEffect(() => {
    if (!trackRef.current || !dotRef.current || indicator !== 'dot') return;

    const linkElements = trackRef.current.querySelectorAll('.pill-nav__link');
    if (activeIndex !== -1 && linkElements[activeIndex]) {
      const target = linkElements[activeIndex];
      const trackRect = trackRef.current.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();

      const centerX = (targetRect.left - trackRect.left) + targetRect.width / 2;
      const bottomY = (targetRect.top - trackRect.top) + targetRect.height - 4;

      dotRef.current.style.opacity = '1';
      dotRef.current.style.transform = `translate3d(${centerX}px, ${bottomY}px, 0)`;
    } else {
      dotRef.current.style.opacity = '0';
    }
  }, [activeIndex, indicator]);

  const handleLinkClick = (e, item, idx) => {
    setCurrentActive(item.href);
    setIsMobileOpen(false);
    if (onItemClick) onItemClick(item, idx);
  };

  const navClasses = [
    'pill-nav',
    `pill-nav--size-${size}`,
    `pill-nav--layout-${layout}`,
    `pill-nav--item-${itemStyle}`,
    `pill-nav--surface-${surface}`,
    `pill-nav--hover-${hoverEffect}`,
    `pill-nav--indicator-${indicator}`,
    intro ? 'pill-nav--intro' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <nav className={navClasses} style={{ '--pill-bounce': bounce, '--pill-stretch': stretch }}>
      <div className="pill-nav__container">
        {/* Brand / Logo */}
        {logo && (
          <a href="#hero" className="pill-nav__logo" aria-label={logoAlt}>
            {typeof logo === 'string' ? (
              <img src={logo} alt={logoAlt} className="pill-nav__logo-img" />
            ) : (
              logo
            )}
          </a>
        )}

        {/* Navigation Items Track */}
        <div 
          className={`pill-nav__track ${isMobileOpen ? 'is-open' : ''}`} 
          ref={trackRef}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {/* Elastic Glide Pill Background */}
          {hoverEffect === 'glide' && (
            <div className="pill-nav__glide" ref={glideRef} aria-hidden="true" />
          )}

          {/* Active Dot Indicator */}
          {indicator === 'dot' && (
            <div className="pill-nav__dot" ref={dotRef} aria-hidden="true" />
          )}

          <ul className="pill-nav__list">
            {items.map((item, idx) => {
              const isActive = item.href === currentActive;
              return (
                <li key={item.href || idx} className="pill-nav__item">
                  <a
                    href={item.href}
                    className={`pill-nav__link ${isActive ? 'is-active' : ''}`}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onClick={(e) => handleLinkClick(e, item, idx)}
                  >
                    <span className="pill-nav__label">{item.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Right Actions Slot (e.g. CTA Button & Theme Switcher) */}
        {rightActions && (
          <div className="pill-nav__actions">
            {rightActions}
          </div>
        )}

        {/* Responsive Mobile Toggle Button */}
        {collapse === 'auto' && (
          <button 
            className={`pill-nav__toggle ${isMobileOpen ? 'is-active' : ''}`}
            onClick={() => setIsMobileOpen(prev => !prev)}
            aria-label="Toggle Navigation Menu"
            aria-expanded={isMobileOpen}
          >
            <span className="pill-nav__toggle-bar" />
            <span className="pill-nav__toggle-bar" />
          </button>
        )}
      </div>
    </nav>
  );
}
