import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="auth-denied-overlay" role="alert">
      <div className="auth-denied cut">
        <span className="auth-denied-slice auth-denied-slice-1" aria-hidden="true" />
        <span className="auth-denied-slice auth-denied-slice-2" aria-hidden="true" />

        <span className="auth-denied-stamp">404</span>

        <div className="auth-denied-body">
          <p className="auth-denied-kicker">// ROUTE NOT FOUND</p>
          <p className="auth-denied-title display">PAGE NOT FOUND</p>
          <p className="auth-denied-hint">The page you’re looking for doesn’t exist here. Return to the archive and start from the index.</p>
        </div>

        <Link href="/" className="auth-denied-close touch-target" style={{ marginTop: '28px' }} aria-label="Back to home">
          <span className="bracket">[</span> DISMISS <span className="bracket">]</span>
        </Link>

        <span className="auth-denied-notch auth-denied-notch-tl" aria-hidden="true" />
        <span className="auth-denied-notch auth-denied-notch-br" aria-hidden="true" />
      </div>
    </main>
  );
}
