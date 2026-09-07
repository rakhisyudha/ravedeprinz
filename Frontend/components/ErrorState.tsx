'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import type { ErrorStateData } from './errorStates';

type ErrorStateProps = ErrorStateData & {
  onAction?: () => void;
  href?: string;
};

export function ErrorState({ code, eyebrow, title, description, action, onAction, href }: ErrorStateProps) {
  const label = <><span className="bracket">[</span> {action} <span className="bracket">]</span></>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, rotate: -1.2 }}
      animate={{ opacity: 1, y: 0, rotate: -1.2 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2, ease: [0.65, 0, 0.35, 1] }}
      className="auth-denied cut"
      role="alert"
      aria-live="assertive"
    >
      <span className="auth-denied-slice auth-denied-slice-1" aria-hidden="true" />
      <span className="auth-denied-slice auth-denied-slice-2" aria-hidden="true" />

      <span className="auth-denied-stamp">{code}</span>

      <div className="auth-denied-body">
        <p className="auth-denied-kicker">// {eyebrow}</p>
        <p className="auth-denied-title display">{title}</p>
        <p className="auth-denied-hint">{description}</p>
      </div>

      {onAction ? (
        <button type="button" className="auth-denied-close touch-target" onClick={onAction}>
          {label}
        </button>
      ) : href ? (
        <Link href={href} className="auth-denied-close touch-target">
          {label}
        </Link>
      ) : null}

      <span className="auth-denied-notch auth-denied-notch-tl" aria-hidden="true" />
      <span className="auth-denied-notch auth-denied-notch-br" aria-hidden="true" />
    </motion.div>
  );
}
