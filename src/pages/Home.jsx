import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ShieldCheck, Star, ArrowRight, Smartphone, Navigation, CheckCircle2, Clock, MapPin } from 'lucide-react';

import SearchWidget from '../components/SearchWidget';
import OperatorSaaSPreview from '../components/OperatorSaaSPreview';
import { POPULAR_ROUTES, TESTIMONIALS } from '../data/mockData';

// Assets
import heroFullBannerImg from '../assets/images/hero-full-banner.jpg';
import passengerExpImg from '../assets/images/passenger-exp.jpg';
import scenicRouteImg from '../assets/images/scenic-route.jpg';
import cityMetropolisImg from '../assets/images/city-metropolis.jpg';
import mobileAppPassImg from '../assets/images/mobile-app-pass.jpg';

gsap.registerPlugin(ScrollTrigger);

export default function Home({ today }) {
  const heroRef = useRef(null);
  const statsRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.hero-fade', {
        y: 30,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out',
      });

      gsap.from('.stats-item', {
        scrollTrigger: {
          trigger: statsRef.current,
          start: 'top 85%',
        },
        y: 25,
        opacity: 0,
        duration: 0.7,
        stagger: 0.1,
        ease: 'power2.out',
      });
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={heroRef} className="home-page">
      
      {/* 1. HERO SECTION WITH HIGH-CONTRAST FULL BG SHOWCASE */}
      <section className="hero-wrapper">
        
        {/* Full Screen High-Res Photograph Background */}
        <div className="hero-bg-media">
          <img
            src={heroFullBannerImg.src}
            alt="Bookify Luxury Bus Terminal Banner"
          />
          <div className="hero-overlay-mask"></div>
        </div>

        <div className="hero-content">
          
          <div className="hero-header-block">
            
            {/* Top Pill Badge */}
            <div className="hero-fade hero-pill-badge">
              <span className="hero-ping-dot"></span>
              <span>NEXT-GEN INTERCITY TRANSIT</span>
            </div>

            {/* Headline */}
            <h1 className="hero-fade hero-headline">
              Intercity Travel Redefined.<br />
              Book <span className="hero-highlight-cyan">VIP Sleeper Pods.</span>
            </h1>

            {/* Subtitle */}
            <p className="hero-fade hero-subtitle">
              Book luxury express double-decker coaches with interactive seat maps, live satellite GPS tracking, 4K entertainment pods, and 100% instant refunds.
            </p>
          </div>

          {/* Redesigned Search Widget */}
          <div className="hero-fade hero-search-wrapper">
            <SearchWidget initialDate={today} />
          </div>

          {/* Quick Feature Badges */}
          <div className="hero-fade hero-badges-row">
            <div className="badge-tag">
              <ShieldCheck size={16} className="badge-icon-emerald" />
              <span>Zero Cancellation Fee Guarantee</span>
            </div>
            <div className="badge-tag">
              <Navigation size={16} className="badge-icon-cyan" />
              <span>Sub-Second Live Satellite GPS</span>
            </div>
            <div className="badge-tag">
              <Star size={16} className="badge-icon-amber" />
              <span>4.9/5 Average Passenger Rating</span>
            </div>
          </div>

        </div>

      </section>

      {/* 2. STATS TICKER */}
      <section ref={statsRef} className="home-section stats-section">
        <div className="stats-grid">
          <div className="stats-item">
            <h3 className="stat-number stat-cyan">500+</h3>
            <p className="stat-label">Active Daily Routes</p>
          </div>
          <div className="stats-item">
            <h3 className="stat-number stat-main">12M+</h3>
            <p className="stat-label">Happy Travelers</p>
          </div>
          <div className="stats-item">
            <h3 className="stat-number stat-emerald">99.8%</h3>
            <p className="stat-label">On-Time Dispatch</p>
          </div>
          <div className="stats-item">
            <h3 className="stat-number stat-purple">2,400+</h3>
            <p className="stat-label">Verified Fleet Buses</p>
          </div>
        </div>
      </section>

      {/* 3. POPULAR ROUTES & DEALS (3-COLUMN GRID) */}
      <section className="home-section routes-section">
        <div className="routes-header-row">
          <div className="routes-header-info">
            <span className="section-category-badge">Popular Corridors</span>
            <h2 className="section-title">Top Trending Express Routes</h2>
          </div>
          <Link
            href="/routes"
            className="routes-view-all-link"
          >
            <span>View All 500+ Routes</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="routes-cards-grid">
          {POPULAR_ROUTES.slice(0, 6).map((route) => (
            <div key={route.id} className="full-image-route-card">
              {/* Full Background Image */}
              <img
                src={route.imageName === 'scenic-route.jpg' ? scenicRouteImg.src : route.imageName === 'city-metropolis.jpg' ? cityMetropolisImg.src : passengerExpImg.src}
                alt={route.from + ' to ' + route.to}
                className="full-card-bg-img"
              />

              {/* Dark Overlay Gradient */}
              <div className="full-card-gradient-overlay"></div>

              {/* Top Badges */}
              <div className="full-card-top-badges">
                <span className="full-card-top-badge">
                  {route.tripsPerDay} Trips Daily
                </span>
                <span className="full-card-price-badge">
                  ৳{route.price.toLocaleString()}
                </span>
              </div>

              {/* Card Content at Bottom */}
              <div className="full-card-bottom-content">
                <h4 className="full-card-title">
                  <span>{route.from}</span>
                  <ArrowRight size={16} className="full-card-title-arrow" />
                  <span>{route.to}</span>
                </h4>

                <div className="full-card-meta">
                  <span className="full-card-meta-item">
                    <Clock size={14} className="meta-icon" />
                    <span>{route.duration}</span>
                  </span>
                  <span className="full-card-meta-divider">•</span>
                  <span className="full-card-meta-item">
                    <MapPin size={14} className="meta-icon" />
                    <span>{route.distance}</span>
                  </span>
                </div>

                <div className="full-card-tags-row">
                  <span className="full-card-rating-tag">
                    <Star size={14} className="route-star-icon" />
                    <span>{route.rating}</span>
                  </span>
                  {route.tags.slice(0, 2).map((tag, i) => (
                    <span key={i} className="full-card-pill-tag">
                      {tag}
                    </span>
                  ))}
                </div>

                <Link
                  href={`/search?from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}`}
                  className="full-card-cta-btn"
                >
                  <span>Check Bus Schedule</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. B2B OPERATOR SAAS SECTION */}
      <section className="home-section">
        <OperatorSaaSPreview />
      </section>

      {/* 5. PASSENGER TESTIMONIALS (REDESIGNED REVIEWS GRID) */}
      <section className="home-section reviews-section">
        <div className="section-header-center">
          <span className="section-category-badge">Verified Traveler Reviews</span>
          <h2 className="section-title">Loved By Over 12 Million Passengers</h2>
        </div>

        <div className="reviews-cards-grid">
          {TESTIMONIALS.map((t, idx) => (
            <div key={idx} className="review-card">
              <div className="review-card-header">
                <div className="review-avatar-box">
                  <img src={t.avatar} alt={t.name} className="review-avatar-img" />
                </div>
                <div className="review-author-info">
                  <h5 className="review-author-name">{t.name}</h5>
                  <span className="review-author-role">{t.role}</span>
                </div>
              </div>

              <div className="review-stars-row">
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} className="review-star-icon" />
                ))}
              </div>

              <p className="review-quote-text">"{t.text}"</p>

              {t.verified && (
                <div className="review-verified-badge">
                  <CheckCircle2 size={14} className="review-check-icon" />
                  <span>Verified Passenger</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 6. MOBILE APP DOWNLOAD CTA */}
      <section className="home-section mobile-app-section">
        <div className="app-download-banner">
          <div className="app-download-grid">
            
            <div className="app-download-content">
              <span className="section-category-badge">
                DOWNLOAD BOOKIFY MOBILE APP
              </span>
              <h2 className="app-download-title">
                Get Instant Boarding Passes On Your Phone
              </h2>
              <p className="app-download-desc">
                Scan your QR boarding pass offline, track live bus ETA on lock screen widgets, and receive instant delay alerts. Available on iOS & Android.
              </p>

              <div className="app-download-buttons">
                <a href="#download" className="app-download-btn-primary">
                  <Smartphone size={18} />
                  <span>App Store (iOS)</span>
                </a>
                <a href="#download" className="app-download-btn-secondary">
                  <Smartphone size={18} />
                  <span>Google Play (Android)</span>
                </a>
              </div>
            </div>

            <div className="app-download-media">
              <img
                src={mobileAppPassImg.src}
                alt="Bookify Mobile App E-Ticket Pass"
                className="app-download-mockup"
              />
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
