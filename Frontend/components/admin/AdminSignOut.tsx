'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/browser';

export default function AdminSignOut() {
  const router = useRouter();
  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }
  return <button type="button" className="admin-signout touch-target" onClick={signOut}>SIGN OUT</button>;
}
