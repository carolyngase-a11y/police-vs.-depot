import Link from 'next/link';
import { all, run } from '../db/client';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

type Customer = {
  id: number;
  name: string;
  age: number;
  annual_income: number | null;
  marital_status: string | null;
  church_tax_enabled: number;
  created_at: string;
};

async function createCustomer(formData: FormData) {
  'use server';
  const name = String(formData.get('name') || '');
  const age = Number(formData.get('age') || 0);
  const annual_income = formData.get('annual_income') ? Number(formData.get('annual_income')) : null;
  const marital_status = formData.get('marital_status')?.toString() || null;
  const church_tax_enabled = formData.get('church_tax_enabled') === 'on' ? 1 : 0;

  if (!name || !age) return;

  await run(
    'INSERT INTO customers (name, age, annual_income, marital_status, church_tax_enabled) VALUES (?,?,?,?,?)',
    [name, age, annual_income, marital_status, church_tax_enabled]
  );
  revalidatePath('/');
}

async function getCustomers() {
  return all<Customer>('SELECT * FROM customers ORDER BY created_at DESC');
}

export default async function HomePage() {
  const customers = await getCustomers();
  return (
    <div className="space-y-8">
      <section className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-indigo-700">Neue Kundin / neuer Kunde</h1>
        <form action={createCustomer} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col text-sm">
            Name
            <input name="name" className="rounded border p-2" required />
          </label>
          <label className="flex flex-col text-sm">
            Alter
            <input name="age" type="number" min={18} className="rounded border p-2" required />
          </label>
          <label className="flex flex-col text-sm">
            Jahresbrutto (optional)
            <input name="annual_income" type="number" className="rounded border p-2" />
          </label>
          <label className="flex flex-col text-sm">
            Familienstand (optional)
            <input name="marital_status" className="rounded border p-2" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="church_tax_enabled" className="rounded" /> Kirchensteuerpflicht
          </label>
          <div className="text-xs text-slate-500">
            Hinweis: MVP, vereinfachtes Modell. Es werden lokale SQLite-Daten gespeichert.
          </div>
          <button className="rounded bg-indigo-600 px-4 py-2 text-white">Speichern</button>
        </form>
      </section>

      <section className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">Kundenübersicht</h2>
        {customers.length === 0 ? (
          <p className="text-sm text-slate-500">Noch keine Kunden angelegt.</p>
        ) : (
          <div className="mt-4 divide-y">
            {customers.map((customer) => (
              <div key={customer.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium">{customer.name}</p>
                  <p className="text-slate-500">Alter {customer.age} • Kirchensteuer {customer.church_tax_enabled ? 'ja' : 'nein'}</p>
                </div>
                <Link
                  href={`/customers/${customer.id}`}
                  className="text-indigo-700 underline decoration-dashed underline-offset-2"
                >
                  Szenario öffnen
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
