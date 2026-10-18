import type { Metadata, Viewport } from 'next';
import { Archivo, Space_Grotesk } from 'next/font/google';
import { PortfolioShell } from '@/components/story/portfolio-shell';
import './globals.css';

const display = Archivo({ variable: '--font-display', subsets: ['latin', 'vietnamese'], weight: ['300', '400', '500', '600'] });
const body = Space_Grotesk({ variable: '--font-body', subsets: ['latin', 'vietnamese'], weight: ['400', '500', '600'] });

const title = 'Sussy / 001 — Roblox Developer Portfolio';
const description = 'A Roblox developer portfolio. Scroll to run with Sussy, an R6 character, past the toolkit and the projects, then sit down under a tree at sunset.';

export const metadata: Metadata = {
  title,
  description,
  robots: { index: true, follow: true },
  openGraph: { title, description, type: 'website', locale: 'en_US', alternateLocale: ['vi_VN'], images: ['/brand/og-roblox.jpg'] },
  twitter: { card: 'summary_large_image', title, description, images: ['/brand/og-roblox.jpg'] },
};

export const viewport: Viewport = { themeColor: '#0a0f18', colorScheme: 'dark' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preload" href="/models/sussy/sussy-r6.glb" as="fetch" crossOrigin="anonymous" fetchPriority="low" />
      </head>
      <body className={`${display.variable} ${body.variable} antialiased`}><PortfolioShell>{children}</PortfolioShell></body>
    </html>
  );
}
