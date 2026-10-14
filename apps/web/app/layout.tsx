import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: { default: 'Honorar', template: '%s | Honorar' },
  description: 'Honorar pays writers every time an AI quotes them, and shows them the exact sentence that earned it. Settled in USDC on Arc.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  openGraph: { title: 'Honorar', description: 'Per-stream royalties, for the words AI reads.', images: ['/brand/og.svg'] },
  icons: { icon: '/brand/icon.svg' },
};

export const viewport: Viewport = { themeColor: '#F5F2FC', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
