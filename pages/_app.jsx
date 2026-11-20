import React from 'react';
import Head from 'next/head';
import Navbar from '../src/components/Navbar';
import Footer from '../src/components/Footer';
import { ThemeProvider } from '../src/context/ThemeContext';
import { DemoSessionProvider } from '../src/context/DemoSessionContext';
import '../src/index.css';

export default function Bookify({ Component, pageProps }) {
  return (
    <ThemeProvider>
      <DemoSessionProvider>
        <Head>
          <title>Bookify — Intercity Bus Booking</title>
          <meta name="description" content="Find intercity buses, choose your seat, and manage your Bookify ticket." />
          <link rel="icon" href="/favicon.svg" />
        </Head>
        <div className="app-layout">
          <Navbar />
          <main className="app-main-content"><Component {...pageProps} /></main>
          <Footer />
        </div>
      </DemoSessionProvider>
    </ThemeProvider>
  );
}
