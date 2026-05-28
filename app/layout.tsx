import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Nav } from '@/components/nav';
import { AppInit } from '@/components/app-init';
import { SwRegister } from '@/components/sw-register';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Dolap Stilisti',
  description: 'Kişisel akıllı gardırop asistanın',
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: '#F8F7F4',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="font-[var(--font-inter)] bg-[var(--kum)] text-[var(--murekkep)] antialiased">
        <Providers>
          <AppInit />
          <SwRegister />
          <main className="mx-auto max-w-lg min-h-screen pb-24 px-4 pt-6">
            {children}
          </main>
          <Nav />
        </Providers>
      </body>
    </html>
  );
}
