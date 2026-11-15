import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'FridgeGPT — Scan it. Cook it. Save it.', description: 'A little kitchen inspiration. A lot less food waste.' };
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body>{children}</body></html> }

