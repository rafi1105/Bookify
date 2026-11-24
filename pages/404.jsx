import Link from 'next/link';
import { Compass } from 'lucide-react';
import { EmptyState } from '../src/components/ui.jsx';

export default function NotFound() {
  return (
    <div className="container">
      <EmptyState icon={Compass} title="We could not find that page" action={<Link href="/" className="btn btn-primary">Search buses</Link>}>
        The link may be old or mistyped.
      </EmptyState>
    </div>
  );
}
