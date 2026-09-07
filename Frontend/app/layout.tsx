import './globals.css';
import { Shell } from '../components/Shell';
import { getSiteSettings } from '../lib/cms';

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ravedeprinz.me').replace(/\/$/, '');

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'Rakhis de Yudha // Personal archive', template: '%s // ravedeprinz' },
  description: 'A personal archive of work, projects, notes, and what is happening now.',
  openGraph: { type: 'website', siteName: 'ravedeprinz' },
  twitter: { card: 'summary' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const site = await getSiteSettings();

  return <html lang="en"><body><Shell footerName={site.footer_name} footerLabel={site.footer_label}>{children}</Shell></body></html>;
}
