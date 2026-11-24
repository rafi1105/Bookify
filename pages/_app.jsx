import Head from 'next/head';
import '../src/styles/variables.css';
import '../src/styles/global.css';
import '../src/styles/components.css';
import '../src/styles/pages.css';
import { AuthProvider } from '../src/context/AuthContext.jsx';
import Layout from '../src/components/Layout.jsx';

export default function App({ Component, pageProps }) {
  const bare = Component.bare;
  const page = <Component {...pageProps} />;
  return (
    <AuthProvider>
      <Head>
        <title>Bookify · Intercity bus tickets</title>
        <meta name="description" content="Search intercity buses in Bangladesh, choose your seat and get your ticket on your phone." />
      </Head>
      {bare ? page : <Layout>{page}</Layout>}
    </AuthProvider>
  );
}
