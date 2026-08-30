'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';

export function AdminImageUpload({ label, value, onChange }: { label: string; value: string; onChange: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(file: File) {
    if (!file) return;
    setBusy(true);
    setError('');

    if (file.size > 5 * 1024 * 1024) {
      setError('Too large. Max 5MB.');
      setBusy(false);
      return;
    }

    const body = new FormData();
    body.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? 'Upload failed.');
        setBusy(false);
        return;
      }
      onChange(json.url as string);
    } catch {
      setError('Could not reach the server.');
    }
    setBusy(false);
  }

  return (
    <div className="admin-upload">
      <span className="admin-field-label">{label}</span>

      <div className="admin-upload-preview">
        {value ? (
          <div className="admin-upload-frame">
            <Image src={value} alt="Upload preview" fill sizes="120px" unoptimized />
          </div>
        ) : (
          <div className="admin-upload-empty">NO IMAGE</div>
        )}
      </div>

      <div className="admin-upload-actions">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = '';
          }}
        />
        <button type="button" className="admin-nav-link touch-target" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? 'UPLOADING…' : value ? 'REPLACE' : 'UPLOAD'}
        </button>
        {value && (
          <button type="button" className="admin-nav-link touch-target" onClick={() => onChange('')}>
            REMOVE
          </button>
        )}
      </div>

      {error && <p className="auth-error" style={{ margin: '8px 0 0' }}>{error}</p>}
    </div>
  );
}
