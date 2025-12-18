import Link from 'next/link';

export default function PrintInfoPage() {
  return (
    <div className="space-y-4 rounded-lg bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-indigo-700">Druckansicht</h1>
      <p className="text-sm text-slate-600">
        Öffne eine Kundin / einen Kunden und nutze im Browser die Druckfunktion (Strg+P), um die Ergebnisse zu exportieren.
        Charts und Tabellen sind druckfreundlich gestaltet. Vereinfachtes Modell, keine Steuerberatung.
      </p>
      <Link href="/" className="text-indigo-700 text-sm">
        ← zurück zur Kundenliste
      </Link>
    </div>
  );
}
