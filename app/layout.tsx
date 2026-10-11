import type { Metadata, Viewport } from 'next';
import { Archivo, Space_Grotesk } from 'next/font/google';
import { PortfolioShell } from '@/components/story/portfolio-shell';
import './globals.css';

const display = Archivo({ variable: '--font-display', subsets: ['latin', 'vietnamese'], weight: ['300', '400', '500', '600'] });
const body = Space_Grotesk({ variable: '--font-body', subsets: ['latin', 'vietnamese'], weight: ['400', '500', '600'] });

const title = 'Sussy / 001 — Portfolio Roblox Developer';
const description = 'Portfolio của một Roblox developer. Cuộn trang để Sussy, nhân vật R6, đi qua bộ công cụ, các dự án, rồi ngồi nghỉ dưới gốc cây lúc hoàng hôn.';

export const metadata: Metadata = {
  title,
  description,
  robots: { index: true, follow: true },
  openGraph: { title, description, type: 'website', locale: 'vi_VN', images: ['/brand/og-roblox.jpg'] },
  twitter: { card: 'summary_large_image', title, description, images: ['/brand/og-roblox.jpg'] },
};

export const viewport: Viewport = { themeColor: '#0a0f18', colorScheme: 'dark' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preload" href="/models/sussy/sussy-r6.glb" as="fetch" crossOrigin="anonymous" fetchPriority="low" />
      </head>
      <body className={`${display.variable} ${body.variable} antialiased`}><PortfolioShell>{children}</PortfolioShell></body>
    </html>
  );
}
