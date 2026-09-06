import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Tên của bạn — Product Designer & Frontend Developer',
  description: 'Portfolio của một Product Designer và Frontend Developer, tập trung vào trải nghiệm số rõ ràng, hữu ích và có thể triển khai tốt.',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Tên của bạn — Product Designer & Frontend Developer',
    description: 'Những trải nghiệm số rõ ràng, hữu ích và có thể triển khai tốt.',
    type: 'website',
    locale: 'vi_VN',
  },
  twitter: {
    card: 'summary',
    title: 'Tên của bạn — Product Designer & Frontend Developer',
    description: 'Những trải nghiệm số rõ ràng, hữu ích và có thể triển khai tốt.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${geistSans.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
