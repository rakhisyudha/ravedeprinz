'use client';

export function Field({ label, value, onChange, textarea, type = 'text', placeholder }: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  textarea?: boolean;
  type?: string;
  placeholder?: string;
}) {
  const common = {
    className: 'admin-input',
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    placeholder,
  };
  return (
    <label className="admin-field">
      <span>{label}</span>
      {textarea
        ? <textarea rows={3} {...common} />
        : <input type={type} {...common} />}
    </label>
  );
}

export function Section({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="admin-editor">
      <p className="eyebrow">{eyebrow}</p>
      {children}
    </div>
  );
}

export function SaveBar({ status, onSave, onPublish }: { status: string; onSave: () => void; onPublish?: () => void }) {
  return (
    <div className="admin-savebar">
      <span>{status}</span>
      <div>
        {onPublish && <button type="button" className="admin-nav-link touch-target" onClick={onPublish}>PUBLISH</button>}
        <button type="button" className="auth-button touch-target" onClick={onSave}>SAVE</button>
      </div>
    </div>
  );
}
