import Head from 'next/head';
import { PageHeader } from './ui.jsx';

export default function Prose({ title, updated, children }) {
  return (
    <>
      <Head><title>{title} · Bookify</title></Head>
      <PageHeader title={title} subtitle={updated ? `Last updated ${updated}` : undefined} />
      <div className="container narrow-wide"><div className="card card-pad prose">{children}</div></div>
    </>
  );
}
