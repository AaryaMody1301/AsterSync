import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Page not found', robots: { index: false } };

export default function NotFound() {
  return <main id="main" className="wrap recovery-page">
    <p className="eyebrow">404 / PAGE NOT FOUND</p>
    <h1>Let’s get you<br/>back on track.</h1>
    <p>This page may have moved, or the address may be incomplete. Explore our services or tell us about your project.</p>
    <div className="recovery-actions">
      <Link href="/" className="button">Back to home</Link>
      <a href="/contact" className="button button-outline">Discuss your project</a>
    </div>
  </main>;
}
