import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WorkSync | Modern Workforce Management',
  description: 'Design and management platform for modern companies.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}