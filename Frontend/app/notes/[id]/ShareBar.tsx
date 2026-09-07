'use client';

import { useState } from 'react';
import { getShareUrls } from '../../../lib/seo';

export default function ShareBar({ url, title, description }: { url: string; title: string; description: string }) {
  const [copied, setCopied] = useState(false);

  async function flashCopied() {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title, text: description || title, url });
        return;
      } catch (error) {
        // User cancellation is not an error; anything else falls back to copy.
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      await flashCopied();
    } catch {
      /* clipboard unavailable — the copy button remains */
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      await flashCopied();
    } catch {
      /* clipboard unavailable — leave the label alone */
    }
  }

  const targets = getShareUrls({ title, url, description });

  return (
    <div className="note-share">
      <div className="note-share-label">
        <span>SHARE THIS TRANSMISSION</span>
        <i />
      </div>
      <div className="note-share-actions">
        <button type="button" className="note-share-btn cut-small touch-target" onClick={handleShare} aria-label="Share this note">
          {copied ? 'COPIED ✓' : 'SHARE ↗'}
        </button>
        {targets.map((target) => (
          <a
            key={target.label}
            href={target.href}
            target={target.external ? '_blank' : undefined}
            rel={target.external ? 'noopener noreferrer' : undefined}
            className="note-share-copy touch-target"
            aria-label={`Share on ${target.label === 'FB' ? 'Facebook' : target.label === 'IN' ? 'LinkedIn' : target.label === 'WA' ? 'WhatsApp' : target.label.charAt(0) + target.label.slice(1).toLowerCase()}`}
          >
            {target.label}
          </a>
        ))}
        <button type="button" className="note-share-copy touch-target" onClick={handleCopy} aria-label="Copy link to this note">
          {copied ? 'COPIED ✓' : 'COPY'}
        </button>
      </div>
    </div>
  );
}
