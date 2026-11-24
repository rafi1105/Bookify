import Head from 'next/head';
import Header from './Header.jsx';
import Footer from './Footer.jsx';

export default function Layout({ children }) {
  return (
    <div className="app">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" />
      </Head>
      <a href="#main" className="sr-only">Skip to content</a>
      <Header />
      <main id="main" className="app-main">{children}</main>
      <Footer />
    </div>
  );
}
