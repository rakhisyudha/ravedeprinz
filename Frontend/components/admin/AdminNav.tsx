'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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

export default function AdminNav() {
  const path = usePathname();
  return (
    <nav className="admin-nav" aria-label="CMS navigation">
      {adminNav.map(([href, label]) => {
        const active = href === '/admin' ? path === '/admin' : path === href || path.startsWith(href + '/');
        return (
          <Link key={href} href={href} className={`admin-nav-link touch-target ${active ? 'is-active' : ''}`}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
