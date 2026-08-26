import './globals.css';
import { Shell } from '../components/Shell';

export const metadata = { title: 'Ravedeprinz // Developer portfolio', description: 'Backend developer and CS student building useful systems.' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><Shell>{children}</Shell></body></html>;
}
