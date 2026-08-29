'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '../../../lib/admin-api';
import { AdminTabs } from '../../../components/admin/AdminTabs';

type UserRow = { id: string; email: string; role: string; active: boolean };

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('editor');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await adminApi<{ users: UserRow[] }>('/api/admin/users');
    if (res.data) setUsers(res.data.users);
  }

  useEffect(() => { load(); }, []);

  async function register(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const res = await adminApi('/api/admin/users', { method: 'POST', body: { email, password, role } });
    if (res.error) setMessage(`ERROR // ${res.error}`);
    else {
      setMessage('REGISTERED. The email can now sign in with Google or email + password.');
      setEmail('');
      setPassword('');
      await load();
    }
    setBusy(false);
  }

  async function toggleActive(user: UserRow) {
    await adminApi(`/api/admin/users/${user.id}`, { method: 'PUT', body: { active: !user.active } });
    await load();
  }

  async function remove(user: UserRow) {
    await adminApi(`/api/admin/users/${user.id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <section className="admin-section">
      <AdminTabs
        tabs={[
          {
            id: 'register',
            label: 'REGISTER',
            content: (
              <div className="admin-editor" style={{ marginTop: 0 }}>
                <p className="eyebrow">REGISTER A NEW ADMIN</p>
                <p>Add an email + password. Once stored, that email can sign in with Google OAuth or with the stored password. Emails not in this list are always rejected.</p>
                <form className="admin-form" onSubmit={register}>
                  <label>EMAIL</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  <label>PASSWORD</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                  <label>ROLE</label>
                  <select value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="owner">owner</option>
                    <option value="editor">editor</option>
                  </select>
                  <button type="submit" className="auth-button touch-target" disabled={busy}>{busy ? 'REGISTERING…' : 'REGISTER ↗'}</button>
                </form>
                {message && <p className="auth-error">{message}</p>}
              </div>
            ),
          },
          {
            id: 'allowlist',
            label: 'ALLOWLIST',
            count: users.length,
            content: (
              <div className="admin-editor" style={{ marginTop: 0 }}>
                <p className="eyebrow">ALLOWLIST // {users.length} USERS</p>
                <div className="admin-accordion">
                  {users.map((user) => (
                    <div className="admin-accordion-item" key={user.id}>
                      <div className="admin-accordion-head" style={{ cursor: 'default' }}>
                        <span><b>{user.email}</b> <small>{user.role} · {user.active ? 'ACTIVE' : 'DISABLED'}</small></span>
                        <span className="admin-row-actions">
                          <button className="admin-nav-link touch-target" onClick={() => toggleActive(user)}>{user.active ? 'DISABLE' : 'ENABLE'}</button>
                          <button className="admin-nav-link touch-target" onClick={() => remove(user)}>REMOVE</button>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ),
          },
        ]}
      />
    </section>
  );
}
