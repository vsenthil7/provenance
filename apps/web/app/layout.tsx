import type { Metadata } from 'next';
import { Providers } from './providers';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SequencerBanner } from '@/components/layout/SequencerBanner';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Provenance — royalties enforced by Move resources',
  description:
    'A Move-based marketplace where royalty enforcement is structural, not aspirational.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-paper text-ink antialiased">
        <Providers>
          <SequencerBanner />
          <Header />
          <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
          <Footer />
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
