import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ShieldCheck, Star, ArrowRight, Smartphone, Navigation, Clock, MapPin } from 'lucide-react';

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
    <div ref={heroRef} className="space-y-20 pb-20 overflow-hidden">
      
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
          
          <div className="space-y-5 max-w-4xl mx-auto">
            
            {/* Top Pill Badge */}
            <div className="hero-fade hero-pill-badge">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              <span>NEXT-GEN INTERCITY TRANSIT</span>
            </div>

            {/* Headline */}
            <h1 className="hero-fade hero-headline">
              Intercity Travel Redefined.<br />
              Book <span className="text-cyan-400">VIP Sleeper Pods.</span>
            </h1>

            {/* Subtitle */}
            <p className="hero-fade hero-subtitle">
              Book luxury express double-decker coaches with interactive seat maps, live satellite GPS tracking, 4K entertainment pods, and 100% instant refunds.
            </p>
          </div>

          {/* Redesigned Search Widget */}
          <div className="hero-fade max-w-5xl mx-auto w-full">
            <SearchWidget />
          </div>

          {/* Quick Feature Badges */}
          <div className="hero-fade flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-slate-200">
            <div className="badge-tag">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Zero Cancellation Fee Guarantee</span>
            </div>
            <div className="badge-tag">
              <Navigation className="w-4 h-4 text-cyan-400" />
              <span>Sub-Second Live Satellite GPS</span>
            </div>
            <div className="badge-tag">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>4.9/5 Average Passenger Rating</span>
            </div>
          </div>

        </div>

      </section>

      {/* 2. STATS TICKER */}
      <section ref={statsRef} className="container">
        <div className="stats-grid">
          <div className="stats-item space-y-1">
            <h3 className="stat-number text-cyan-500">500+</h3>
            <p className="stat-label">Active Daily Routes</p>
          </div>
          <div className="stats-item space-y-1">
            <h3 className="stat-number theme-text-main">12M+</h3>
            <p className="stat-label">Happy Travelers</p>
          </div>
          <div className="stats-item space-y-1">
            <h3 className="stat-number text-emerald-500">99.8%</h3>
            <p className="stat-label">On-Time Dispatch</p>
          </div>
          <div className="stats-item space-y-1">
            <h3 className="stat-number text-purple-500">2,400+</h3>
            <p className="stat-label">Verified Fleet Buses</p>
          </div>
        </div>
      </section>

      {/* 3. POPULAR ROUTES & DEALS (PURE LUCIDE ICONS) */}
      <section className="container space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-cyan-500 uppercase tracking-widest">Popular Corridors</span>
            <h2 className="text-3xl font-extrabold theme-text-main font-display">Top Trending Express Routes</h2>
          </div>
          <Link
            to="/routes"
            className="text-xs font-bold text-cyan-500 hover:text-cyan-600 flex items-center space-x-1 transition-colors"
          >
            <span>View All 500+ Routes</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="routes-cards-grid">
          {POPULAR_ROUTES.slice(0, 6).map((route) => (
            <div key={route.id} className="full-image-route-card group">
              {/* Full Background Image */}
              <img
                src={route.imageName === 'scenic-route.jpg' ? scenicRouteImg : route.imageName === 'city-metropolis.jpg' ? cityMetropolisImg : passengerExpImg}
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
                  ${route.price.toFixed(2)}
                </span>
              </div>

              {/* Card Content at Bottom */}
              <div className="full-card-bottom-content">
                <h4 className="full-card-title">{route.from} ➔ {route.to}</h4>

                <div className="full-card-meta">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{route.duration}</span>
                  <span>•</span>
                  <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{route.distance}</span>
                </div>

                <div className="full-card-tags-row">
                  <span className="full-card-rating-tag">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{route.rating}</span>
                  </span>
                  {route.tags.slice(0, 2).map((tag, i) => (
                    <span key={i} className="full-card-pill-tag">
                      {tag}
                    </span>
                  ))}
                </div>

                <Link
                  to={`/search?from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}`}
                  className="full-card-cta-btn"
                >
                  <span>Check Bus Schedule</span>
                  <ArrowRight className="w-4 h-4" />
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
      <section className="container space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-cyan-500 uppercase tracking-widest">Verified Traveler Reviews</span>
          <h2 className="text-3xl font-extrabold theme-text-main font-display">Loved By Over 12 Million Passengers</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, idx) => (
            <div key={idx} className="glass-card p-6 space-y-4">
              <div className="flex items-center space-x-1 text-amber-500">
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-500" />
                ))}
              </div>
              <p className="theme-text-sub text-xs sm:text-sm leading-relaxed italic">"{t.text}"</p>
              
              <div className="flex items-center space-x-3 pt-2 border-t theme-border">
                <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover border border-cyan-500" />
                <div>
                  <h5 className="text-xs font-bold theme-text-main">{t.name}</h5>
                  <span className="text-[10px] theme-text-muted block">{t.role}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. MOBILE APP DOWNLOAD CTA */}
      <section className="container">
        <div className="glass-panel p-8 md:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-7 space-y-5">
              <span className="badge-tag text-cyan-500 font-bold">
                DOWNLOAD BOOKIFY MOBILE APP
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold theme-text-main font-display">
                Get Instant Boarding Passes On Your Phone
              </h2>
              <p className="theme-text-sub text-sm leading-relaxed max-w-xl">
                Scan your QR boarding pass offline, track live bus ETA on lock screen widgets, and receive instant delay alerts. Available on iOS & Android.
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                <a href="#download" className="btn-book-cta">
                  <Smartphone className="w-4 h-4" />
                  <span>App Store (iOS)</span>
                </a>
                <a href="#download" className="btn-swap-locations px-5 py-2.5 flex items-center space-x-2 font-bold text-xs">
                  <Smartphone className="w-4 h-4" />
                  <span>Google Play (Android)</span>
                </a>
              </div>
            </div>

            <div className="lg:col-span-5 flex justify-center">
              <img
                src={mobileAppPassImg}
                alt="Bookify Mobile App E-Ticket Pass"
                className="w-64 sm:w-72 h-auto rounded-3xl shadow-2xl border theme-border"
              />
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
