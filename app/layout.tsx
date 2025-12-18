import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import React from 'react';

export const metadata: Metadata = {
  title: 'Depot vs. Fondspolice (Schicht 3 Privatrente ohne Garantie)',
  description: 'Interne MVP-App für Kundenberatung – vereinfachtes Modell, keine Steuerberatung.'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="bg-slate-50 text-slate-900">
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <div>
              <Link href="/" className="text-lg font-semibold text-indigo-700">
                Depot vs. Fondspolice
              </Link>
              <p className="text-xs text-slate-500">
                MVP – vereinfachtes Modell, keine Steuerberatung.
              </p>
            </div>
            <nav className="flex items-center gap-4 text-sm text-slate-600">
              <Link href="/">Kunden</Link>
              <Link href="/print" className="text-indigo-700">
                Druckansicht
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
