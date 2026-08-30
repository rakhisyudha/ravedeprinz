'use client';

import { useState } from 'react';

export default function ShareBar({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const shareUrl = url;
    if (navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="note-share">
      <div className="note-share-label">
        <span>SHARE THIS TRANSMISSION</span>
        <i />
      </div>
      <div className="note-share-actions">
        <button type="button" className="note-share-btn cut-small touch-target" onClick={handleShare}>
          {copied ? 'COPIED ✓' : 'SHARE ↗'}
        </button>
        <button type="button" className="note-share-copy touch-target" onClick={handleCopy}>
          COPY LINK
        </button>
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="note-share-copy touch-target"
        >
          X / TWITTER ↗
        </a>
      </div>
    </div>
  );
}
