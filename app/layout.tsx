import './globals.css';
import { Shell } from '../components/Shell';

export const metadata = { title: 'Rakhis de Yudha // Personal archive', description: 'A personal archive of work, projects, notes, and what is happening now.' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><Shell>{children}</Shell></body></html>;
}
