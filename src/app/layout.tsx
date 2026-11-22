import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'ViceGrid WFC — Procedural 3D Vice City Generator',
  description:
    'Interactive 3D Wave Function Collapse (WFC) urban generator inspired by Vice City Golden Hour and Midnight Neon aesthetics, featuring real-time entropy visualization, GLSL interior mapping, and an Asset Museum.',
  openGraph: {
    title: 'ViceGrid WFC — Procedural 3D City Engine',
    description:
      'Generate infinite Vice City coastal sectors in real time using Wave Function Collapse, GLSL shaders, and Three.js.',
    url: 'https://vice-wfc.vercel.app',
    siteName: 'ViceGrid WFC',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-slate-950 text-slate-100 antialiased selection:bg-[#ff2a85]/40 selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
