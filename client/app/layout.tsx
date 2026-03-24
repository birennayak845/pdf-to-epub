import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Card Game 29',
  description: 'Play the classic South Asian card game 29 online',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen felt-table">{children}</body>
    </html>
  );
}
