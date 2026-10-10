import type { Metadata, Viewport } from 'next';
import { Archivo, Space_Grotesk } from 'next/font/google';
import { PortfolioShell } from '@/components/story/portfolio-shell';
import './globals.css';

const display = Archivo({ variable: '--font-display', subsets: ['latin', 'vietnamese'], weight: ['300', '400', '500', '600'] });
const body = Space_Grotesk({ variable: '--font-body', subsets: ['latin', 'vietnamese'], weight: ['400', '500', '600'] });

const title = 'Sussy / 001 — Portfolio Frontend & Roblox Developer';
const description = 'Portfolio 3D: nhân vật Roblox Sussy chạy qua tech stack, dự án và ngồi ngắm hoàng hôn ở phần liên hệ.';

export const metadata: Metadata = {
  title,
  description,
  robots: { index: true, follow: true },
  openGraph: { title, description, type: 'website', locale: 'vi_VN', images: ['/brand/sussy-poster.png'] },
  twitter: { card: 'summary_large_image', title, description, images: ['/brand/sussy-poster.png'] },
};

export const viewport: Viewport = { themeColor: '#0b0b0d', colorScheme: 'dark' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preload" href="/brand/sussy-head.png" as="image" />
        <link rel="preload" href="/models/sussy/sussy-r6.glb" as="fetch" crossOrigin="anonymous" />
      </head>
      <body className={`${display.variable} ${body.variable} antialiased`}><PortfolioShell>{children}</PortfolioShell></body>
    </html>
  );
}
