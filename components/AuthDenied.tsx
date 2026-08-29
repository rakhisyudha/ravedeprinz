'use client';

import { motion, AnimatePresence } from 'motion/react';

export function AuthDenied({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  if (!message) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={message}
        initial={{ opacity: 0, x: -12, rotate: -1 }}
        animate={{ opacity: 1, x: 0, rotate: -1.2 }}
        exit={{ opacity: 0, x: 12 }}
        transition={{ duration: 0.22, ease: [0.65, 0, 0.35, 1] }}
        className="auth-denied cut"
        role="alert"
        aria-live="assertive"
      >
        {/* glitch slices */}
        <span className="auth-denied-slice auth-denied-slice-1" aria-hidden />
        <span className="auth-denied-slice auth-denied-slice-2" aria-hidden />

        {/* stamp */}
        <span className="auth-denied-stamp">DENIED</span>

        <div className="auth-denied-body">
          <p className="auth-denied-kicker">// ACCESS // BLOCKED</p>
          <p className="auth-denied-title display">{message}</p>
          <p className="auth-denied-hint">The Google account or email is not on the allowlist. Ask the owner to register it first.</p>
        </div>

        <button type="button" className="auth-denied-close touch-target" onClick={onDismiss} aria-label="Dismiss error">
          <span className="bracket">[</span> DISMISS <span className="bracket">]</span>
        </button>

        {/* corner notches */}
        <span className="auth-denied-notch auth-denied-notch-tl" aria-hidden />
        <span className="auth-denied-notch auth-denied-notch-br" aria-hidden />
      </motion.div>
    </AnimatePresence>
  );
}
