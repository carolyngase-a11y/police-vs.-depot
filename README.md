# Depot vs. Fondspolice (Schicht 3 Privatrente ohne Garantie)

Interne Beratungs-MVP mit Next.js (App Router), TypeScript, TailwindCSS, SQLite und Recharts. Vereinfachtes Modell, keine Steuerberatung.

## Struktur
- `/app` – Routen (Kundenliste, Szenario, Druckhinweis)
- `/components` – UI-Komponenten (Charts)
- `/calc` – Rechenkern (Simulation & Steuerlogik)
- `/data` – Tarife & Steuer-Defaults
- `/db` – SQLite-Initialisierung

## Lokale Entwicklung (GitHub Codespaces)
```bash
npm install
npm run dev
```

Dann `http://localhost:3000` öffnen.

## Anpassungen
- **Tarife**: `data/s3_privatrenten_no_guarantee_tariffs.json` bearbeiten (effective_cost_pa in Dezimalform).
- **Steuer-Sätze**: `data/tax_defaults.json` anpassen.
- **Berechnungslogik**: `calc/engine.ts` bzw. `calc/tax_de.ts` erweitern.

## Hinweis
Alle Berechnungen sind stark vereinfacht und ersetzen keine Steuer- oder Anlageberatung.
