import { createClient } from '../../lib/supabase/server';
import AdminUserMenu from '../../components/admin/AdminUserMenu';
import AdminNav from '../../components/admin/AdminNav';
import AdminWelcome from '../../components/admin/AdminWelcome';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="admin-page">
      <div className="admin-shell">
        <header className="admin-header">
          <div className="admin-header-top">
            <div>
              <p className="eyebrow">// CONTENT CONTROL</p>
              <h1 className="display">CMS</h1>
            </div>
            <AdminUserMenu email={user?.email} />
          </div>
          <AdminWelcome />
        </header>
        <AdminNav />
        {children}
      </div>
    </main>
  );
}
