import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Ignat',
  description:
    'Ignat’s personal space. Aerospace PhD student in Shanghai. Research, games, digital life, code, travel and photography.',
  icons: { icon: './favicon.svg' },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
