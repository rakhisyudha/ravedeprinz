'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { createClient } from '../../lib/supabase/browser';
import { AuthDenied } from '../../components/AuthDenied';
import { TransitionLink } from '../../components/TransitionLink';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const blocked = params.get('error') === 'notallowed';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(blocked ? 'Who are you? I don\'t remember you.' : '');
  const [busy, setBusy] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');

  // shake the card when error appears
  useEffect(() => {
    if (error) setShakeKey((k) => k + 1);
  }, [error]);

  // show DENIED on top of everything, then scrub the query param
  useEffect(() => {
    if (blocked) {
      window.history.replaceState({}, '', '/login');
    }
  }, [blocked]);

  async function oauth() {
    const supabase = createClient();
    setError('');
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setError('SUPABASE CLIENT VARIABLES ARE MISSING FROM THIS BUILD.');
      return;
    }
    const { error: authError } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${siteUrl}/auth/callback` } });
    if (authError) setError(authError.message.toUpperCase());
  }

  async function passwordLogin(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError('INVALID EMAIL OR PASSWORD.');
      setBusy(false);
      return;
    }
    const { data: allowed } = await supabase.rpc('is_admin_user', { target_email: email });
    if (!allowed) {
      await supabase.auth.signOut();
      setError('Who are you? This account does not belong here.');
      setBusy(false);
      return;
    }
    router.push('/admin');
    router.refresh();
  }

  return (
    <main className="auth-page">
      <MotionConfig reducedMotion="user">
        <motion.div className="auth-home-wrap" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .1, duration: .25, ease: 'easeOut' }}>
          <TransitionLink href="/" className="auth-home" aria-label="Back to home"><span aria-hidden="true">←</span> HOME</TransitionLink>
        </motion.div>

        <motion.span className="auth-backdrop" aria-hidden="true" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .9, ease: 'easeOut' }}>ARCHIVE</motion.span>

        <motion.div className="auth-card-enter" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4, ease: [0.22, 1, 0.36, 1] }}>
          <motion.div
            key={shakeKey}
            animate={error ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
            transition={{ duration: 0.36, ease: [0.65, 0, 0.35, 1] }}
            className="auth-card"
          >
            <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .12, duration: .34, ease: [0.22, 1, 0.36, 1] }}>
              <p className="eyebrow"><span className="slash">//</span> PRIVATE ARCHIVE</p>
              <h1 className="display auth-title">SIGN<br /><span>IN</span></h1>
            </motion.div>

            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .2, duration: .3, ease: 'easeOut' }}>Only registered accounts can access the content archive. If your email is not on the allowlist, Google or password sign-in will be rejected.</motion.p>

            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .3, duration: .34, ease: 'easeOut' }}>
              <button className="auth-button touch-target" onClick={oauth} disabled={busy}>CONTINUE WITH GOOGLE →</button>

              <div className="auth-divider"><span>OR</span></div>

              <form onSubmit={passwordLogin} className="auth-form">
                <label htmlFor="email">EMAIL</label>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                <label htmlFor="password">PASSWORD</label>
                <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
                <button type="submit" className="auth-button auth-button-primary touch-target" disabled={busy}>{busy ? 'SIGNING IN…' : 'SIGN IN →'}</button>
              </form>
            </motion.div>
          </motion.div>
        </motion.div>

        <p className="auth-meta"><strong>r</strong>avedeprinz_ <span>PERSONAL ARCHIVE</span></p>

        <AnimatePresence>
          {error && (
            <motion.div
              className="auth-denied-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              aria-hidden={error ? 'false' : 'true'}
            >
              <AuthDenied message={error} onDismiss={() => setError('')} />
            </motion.div>
          )}
        </AnimatePresence>
      </MotionConfig>
    </main>
  );
}

export default function Login() {
  return <Suspense fallback={<main className="auth-page" />}><LoginForm /></Suspense>;
}
