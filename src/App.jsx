import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { ThemeProvider } from './context/ThemeContext';

// Pages
import Home from './pages/Home';
import SearchPage from './pages/SearchPage';
import FleetPage from './pages/FleetPage';
import RoutesPage from './pages/RoutesPage';
import OperatorsPage from './pages/OperatorsPage';
import MyBookingsPage from './pages/MyBookingsPage';
import ContactPage from './pages/ContactPage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <ScrollToTop />
        <div className="app-layout">
          <Navbar />
          <main className="app-main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/fleet" element={<FleetPage />} />
              <Route path="/routes" element={<RoutesPage />} />
              <Route path="/operators" element={<OperatorsPage />} />
              <Route path="/my-bookings" element={<MyBookingsPage />} />
              <Route path="/contact" element={<ContactPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </ThemeProvider>
  );
}
