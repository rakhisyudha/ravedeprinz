import Link from 'next/link';
import { createClient } from '../../lib/supabase/server';
import AdminSignOut from '../../components/admin/AdminSignOut';

const adminNav = [
  ['/admin', 'DASHBOARD'],
  ['/admin/home', 'HOME'],
  ['/admin/about', 'ABOUT'],
  ['/admin/work', 'WORK'],
  ['/admin/projects', 'PROJECTS'],
  ['/admin/notes', 'NOTES'],
  ['/admin/now', 'NOW'],
  ['/admin/users', 'USERS'],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="admin-page">
      <div className="admin-shell">
        <header className="admin-header">
          <div>
            <p className="eyebrow">// CONTENT CONTROL</p>
            <h1 className="display">CMS</h1>
          </div>
          <div className="admin-header-right">
            <span className="admin-user">{user?.email}</span>
            <AdminSignOut />
          </div>
        </header>
        <nav className="admin-nav" aria-label="CMS navigation">
          {adminNav.map(([href, label]) => <Link key={href} href={href} className="admin-nav-link touch-target">{label}</Link>)}
        </nav>
        {children}
      </div>
    </main>
  );
}
