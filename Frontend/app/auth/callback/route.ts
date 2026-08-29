import { createClient } from '../../../lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const supabase = await createClient();

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;
  const { data: { user } } = await supabase.auth.getUser();
  const email = user?.email ?? '';

  if (!email) {
    return NextResponse.redirect(new URL('/login', siteUrl));
  }

  // Allowlist gate: only registered emails may enter the admin.
  const { data: allowed } = await supabase.rpc('is_admin_user', { target_email: email });
  if (!allowed) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/login?error=notallowed', siteUrl));
  }

  return NextResponse.redirect(new URL('/admin', siteUrl));
}
