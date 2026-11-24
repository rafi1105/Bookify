import Head from 'next/head';
import { useRouter } from 'next/router';
import OperatorShell from '../../../src/components/OperatorShell.jsx';
import BusDetail from '../../../src/components/BusDetail.jsx';

export default function OperatorBus() {
  const { query } = useRouter();
  return (
    <OperatorShell title="Bus details" subtitle="Details, current position and history of one bus.">
      <Head><title>Bus details · Operator · Bookify</title></Head>
      {query.id && <BusDetail endpoint={`/api/operator/buses/${query.id}`} backHref="/operator/buses" backLabel="All buses" patchUrl={(id) => `/api/operator/buses/${id}`} />}
    </OperatorShell>
  );
}
