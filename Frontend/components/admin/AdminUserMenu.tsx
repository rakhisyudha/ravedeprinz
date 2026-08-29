'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/browser';

export default function AdminUserMenu({ email }: { email?: string | null }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="admin-user-menu">
      <span className="admin-user admin-user--desktop">{email}</span>
      <button type="button" className="admin-signout admin-signout--desktop touch-target" onClick={signOut}>
        SIGN OUT
      </button>

      <div className="admin-user-mobile">
        <button
          type="button"
          className="admin-user-icon touch-target"
          aria-label="User menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </button>
        {open && (
          <div className="admin-user-dropdown cut-small">
            <span className="admin-user-dropdown-email">{email}</span>
            <button type="button" className="admin-signout admin-signout--dropdown touch-target" onClick={signOut}>
              SIGN OUT
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
