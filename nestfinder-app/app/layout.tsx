import type { Metadata } from 'next';
import './globals.css';
import ClientLayout from './ClientLayout';

export const metadata: Metadata = {
  title: 'NestFinder Agents',
  description: 'Manage properties and viewings with NestFinder',
  manifest: '/manifest.json',
  themeColor: '#1E293B',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'NestFinder Agents',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1E293B" />
      </head>
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
