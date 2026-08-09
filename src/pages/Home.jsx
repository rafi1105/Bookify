import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ShieldCheck, Star, ArrowRight, Smartphone, Navigation } from 'lucide-react';

import SearchWidget from '../components/SearchWidget';
import OperatorSaaSPreview from '../components/OperatorSaaSPreview';
import { POPULAR_ROUTES, TESTIMONIALS } from '../data/mockData';

// Assets
import heroShowcaseImg from '../assets/images/hero-showcase.jpg';
import passengerExpImg from '../assets/images/passenger-exp.jpg';
import scenicRouteImg from '../assets/images/scenic-route.jpg';
import cityMetropolisImg from '../assets/images/city-metropolis.jpg';
import mobileAppPassImg from '../assets/images/mobile-app-pass.jpg';

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
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
            src={heroShowcaseImg}
            alt="Bookify Luxury Bus Terminal"
          />
          <div className="hero-overlay-mask"></div>
        </div>

        <div className="hero-content">
          
          <div className="hero-header-block">
            
            {/* Top Pill Badge */}
            <div className="hero-fade hero-pill-badge">
              <span className="hero-ping-dot animate-ping"></span>
              <span>NEXT-GEN INTERCITY TRANSIT</span>
            </div>

            {/* Headline */}
            <h1 className="hero-fade hero-headline">
              Intercity Travel Redefined.<br />
              Book <span className="highlight-cyan">VIP Sleeper Pods.</span>
            </h1>

            {/* Subtitle */}
            <p className="hero-fade hero-subtitle">
              Book luxury express double-decker coaches with interactive seat maps, live satellite GPS tracking, 4K entertainment pods, and 100% instant refunds.
            </p>
          </div>

          {/* Redesigned Search Widget */}
          <div className="hero-fade hero-search-wrapper">
            <SearchWidget />
          </div>

          {/* Quick Feature Badges */}
          <div className="hero-fade hero-badges-row">
            <div className="badge-tag">
              <ShieldCheck size={16} />
              <span>Zero Cancellation Fee Guarantee</span>
            </div>
            <div className="badge-tag">
              <Navigation size={16} />
              <span>Sub-Second Live Satellite GPS</span>
            </div>
            <div className="badge-tag">
              <Star size={16} />
              <span>4.9/5 Average Passenger Rating</span>
            </div>
          </div>

        </div>

      </section>

      {/* 2. STATS TICKER */}
      <section ref={statsRef} className="container">
        <div className="stats-grid">
          <div className="stats-item">
            <h3 className="stat-number highlight-cyan">500+</h3>
            <p className="stat-label">Active Daily Routes</p>
          </div>
          <div className="stats-item">
            <h3 className="stat-number">12M+</h3>
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

      {/* 3. POPULAR ROUTES & DEALS */}
      <section className="container">
        <div className="routes-header-row">
          <div className="routes-header-info">
            <span className="page-badge">Popular Corridors</span>
            <h2 className="page-title">Top Trending Express Routes</h2>
          </div>
          <Link
            to="/routes"
            className="routes-view-all-link"
          >
            <span>View All 500+ Routes</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="routes-cards-grid">
          {POPULAR_ROUTES.slice(0, 6).map((route) => (
            <div key={route.id} className="route-card">
              <div className="route-card-media">
                <img
                  src={route.imageName === 'scenic-route.jpg' ? scenicRouteImg : route.imageName === 'city-metropolis.jpg' ? cityMetropolisImg : passengerExpImg}
                  alt={route.from + ' to ' + route.to}
                  className="route-card-img"
                />
                <div className="route-daily-badge">
                  {route.tripsPerDay} Trips Daily
                </div>
                <div className="route-price-tag">
                  ${route.price.toFixed(2)}
                </div>
              </div>

              <div className="route-card-details">
                <div className="route-card-top">
                  <h4 className="route-card-title">{route.from} ➔ {route.to}</h4>
                  <div className="route-card-rating">
                    <Star size={14} />
                    <span>{route.rating}</span>
                  </div>
                </div>

                <div className="route-card-meta">
                  <span>⏱ {route.duration}</span>
                  <span>•</span>
                  <span>📍 {route.distance}</span>
                </div>

                <div className="route-card-tags">
                  {route.tags.map((tag, i) => (
                    <span key={i} className="badge-tag">
                      {tag}
                    </span>
                  ))}
                </div>

                <Link
                  to={`/search?from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}`}
                  className="btn-search-cta"
                >
                  <span>Check Bus Schedule</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. B2B OPERATOR SAAS SECTION */}
      <section className="container">
        <OperatorSaaSPreview />
      </section>

      {/* 5. PASSENGER TESTIMONIALS */}
      <section className="container">
        <div className="testimonials-section">
          <div className="testimonials-header">
            <span className="page-badge">Verified Traveler Reviews</span>
            <h2 className="page-title">Loved By Over 12 Million Passengers</h2>
          </div>

          <div className="testimonials-grid">
            {TESTIMONIALS.map((t, idx) => (
              <div key={idx} className="testimonial-card">
                <div className="testimonial-stars">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} size={16} />
                  ))}
                </div>
                <p className="testimonial-text">"{t.text}"</p>
                
                <div className="testimonial-author">
                  <img src={t.avatar} alt={t.name} className="testimonial-avatar" />
                  <div className="testimonial-meta">
                    <h5 className="testimonial-name">{t.name}</h5>
                    <span className="testimonial-role">{t.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. MOBILE APP DOWNLOAD CTA */}
      <section className="container">
        <div className="app-download-banner">
          <div className="app-download-grid">
            
            <div className="app-download-content">
              <span className="page-badge">
                DOWNLOAD BOOKIFY MOBILE APP
              </span>
              <h2 className="app-download-title">
                Get Instant Boarding Passes On Your Phone
              </h2>
              <p className="app-download-desc">
                Scan your QR boarding pass offline, track live bus ETA on lock screen widgets, and receive instant delay alerts. Available on iOS & Android.
              </p>

              <div className="app-download-buttons">
                <a href="#download" className="btn-book-cta">
                  <Smartphone size={16} />
                  <span>App Store (iOS)</span>
                </a>
                <a href="#download" className="app-download-btn-secondary">
                  <Smartphone size={16} />
                  <span>Google Play (Android)</span>
                </a>
              </div>
            </div>

            <div className="app-download-media">
              <img
                src={mobileAppPassImg}
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
