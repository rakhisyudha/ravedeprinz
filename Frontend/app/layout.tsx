import './globals.css';
import { Shell } from '../components/Shell';
import { getSiteSettings } from '../lib/cms';

export const metadata = { title: 'Rakhis de Yudha // Personal archive', description: 'A personal archive of work, projects, notes, and what is happening now.' };

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const site = await getSiteSettings();

  return <html lang="en"><body><Shell footerName={site.footer_name} footerLabel={site.footer_label}>{children}</Shell></body></html>;
}
