import { notFound } from 'next/navigation';
import Link from 'next/link';
import { get, run } from '../../../db/client';
import { revalidatePath } from 'next/cache';
import tariffs from '../../../data/s3_privatrenten_no_guarantee_tariffs.json';
import { simulateScenario } from '../../../calc/engine';
import Charts from '../../../components/Charts';

export const dynamic = 'force-dynamic';

type Customer = {
  id: number;
  name: string;
  age: number;
  church_tax_enabled: number;
};

type Scenario = {
  id: number;
  customer_id: number;
  retirement_age_base: number;
  retirement_age_policy: number;
  monthly_contribution: number;
  start_capital: number;
  gross_return_pa: number;
  inflation_target_pa: number;
  inflation_calc_pa: number;
  equity_fund: number;
  glidepath_json: string;
  depot_ter_pa: number;
  depot_aum_fee_pa: number;
  depot_monthly_fee: number;
  depot_switches_total: number;
  policy_tariff_id: string | null;
  payout_target_net_withdrawal_monthly: number;
  payout_end_age: number;
  payout_mode: 'capital_withdrawal_plan' | 'annuity';
  allow_deferral_years: number;
};

async function getCustomer(id: number) {
  return get<Customer>('SELECT * FROM customers WHERE id = ?', [id]);
}

async function getScenario(customerId: number) {
  const row = await get<Scenario | undefined>('SELECT * FROM scenarios WHERE customer_id = ?', [customerId]);
  if (row) return row;
  await run(
    `INSERT INTO scenarios (
      customer_id, retirement_age_base, retirement_age_policy, monthly_contribution, start_capital, gross_return_pa,
      inflation_target_pa, inflation_calc_pa, equity_fund, glidepath_json, depot_ter_pa, depot_aum_fee_pa, depot_monthly_fee,
      depot_switches_total, policy_tariff_id, payout_target_net_withdrawal_monthly, payout_end_age, payout_mode, allow_deferral_years
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [customerId, 67, 67, 500, 0, 0.06, 0.02, 0, 1, JSON.stringify([{ year: 0, equity_share: 1 }]), 0, 0, 0, 3, tariffs[0].id, 1000, 88, 'capital_withdrawal_plan', 0]
  );
  return get<Scenario>('SELECT * FROM scenarios WHERE customer_id = ?', [customerId]);
}

async function saveScenario(formData: FormData) {
  'use server';
  const scenarioId = Number(formData.get('scenario_id'));
  const customerId = Number(formData.get('customer_id'));
  const values = [
    Number(formData.get('retirement_age_base')),
    Number(formData.get('retirement_age_policy')),
    Number(formData.get('monthly_contribution')),
    Number(formData.get('start_capital')),
    Number(formData.get('gross_return_pa')),
    Number(formData.get('inflation_target_pa')),
    Number(formData.get('inflation_calc_pa')),
    formData.get('equity_fund') === 'on' ? 1 : 0,
    formData.get('glidepath_json')?.toString() || '[]',
    Number(formData.get('depot_ter_pa')),
    Number(formData.get('depot_aum_fee_pa')),
    Number(formData.get('depot_monthly_fee')),
    Number(formData.get('depot_switches_total')),
    formData.get('policy_tariff_id')?.toString() || null,
    Number(formData.get('payout_target_net_withdrawal_monthly')),
    Number(formData.get('payout_end_age')),
    formData.get('payout_mode')?.toString() || 'capital_withdrawal_plan',
    Number(formData.get('allow_deferral_years'))
  ];

  await run(
    `UPDATE scenarios SET
      retirement_age_base=?, retirement_age_policy=?, monthly_contribution=?, start_capital=?, gross_return_pa=?,
      inflation_target_pa=?, inflation_calc_pa=?, equity_fund=?, glidepath_json=?, depot_ter_pa=?, depot_aum_fee_pa=?,
      depot_monthly_fee=?, depot_switches_total=?, policy_tariff_id=?, payout_target_net_withdrawal_monthly=?,
      payout_end_age=?, payout_mode=?, allow_deferral_years=?
    WHERE id=?`,
    [...values, scenarioId]
  );
  revalidatePath(`/customers/${customerId}`);
}

function parseGlidepath(json: string) {
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (e) {
    return [];
  }
}

export default async function CustomerScenarioPage({ params }: { params: { id: string } }) {
  const customerId = Number(params.id);
  const customer = await getCustomer(customerId);
  if (!customer) return notFound();
  const scenario = await getScenario(customerId);
  if (!scenario) return notFound();

  const glidepath = parseGlidepath(scenario.glidepath_json);
  const simulation = simulateScenario(
    {
      name: customer.name,
      age: customer.age,
      church_tax_enabled: !!customer.church_tax_enabled,
      retirement_age_base: scenario.retirement_age_base,
      retirement_age_policy: scenario.retirement_age_policy,
      monthly_contribution: scenario.monthly_contribution,
      start_capital: scenario.start_capital,
      gross_return_pa: scenario.gross_return_pa,
      inflation_target_pa: scenario.inflation_target_pa,
      inflation_calc_pa: scenario.inflation_calc_pa,
      equity_fund: !!scenario.equity_fund,
      glidepath,
      depot_costs: {
        ter_pa: scenario.depot_ter_pa,
        aum_fee_pa: scenario.depot_aum_fee_pa,
        monthly_fee: scenario.depot_monthly_fee,
        switches_total: scenario.depot_switches_total
      },
      policy_tariff_id: scenario.policy_tariff_id || undefined,
      payout: {
        target_net_withdrawal_monthly: scenario.payout_target_net_withdrawal_monthly,
        end_age: scenario.payout_end_age,
        payout_mode: scenario.payout_mode,
        allow_deferral_years: scenario.allow_deferral_years
      }
    },
    undefined
  );

  return (
    <div className="space-y-8">
      <Link href="/" className="text-sm text-indigo-700">
        ← zurück zur Liste
      </Link>
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-indigo-700">{customer.name} • Szenario</h1>
        <p className="text-xs text-slate-500">Vereinfachtes Modell, keine Steuerberatung.</p>
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <form action={saveScenario} className="space-y-4 rounded border p-4">
            <input type="hidden" name="scenario_id" value={scenario.id} />
            <input type="hidden" name="customer_id" value={customer.id} />
            <h2 className="font-semibold text-slate-800">Eingaben</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <label className="flex flex-col">
                Rentenalter Basis
                <input type="number" name="retirement_age_base" defaultValue={scenario.retirement_age_base} className="rounded border p-2" />
              </label>
              <label className="flex flex-col">
                Rentenalter Police (Aufschub)
                <input type="number" name="retirement_age_policy" defaultValue={scenario.retirement_age_policy} className="rounded border p-2" />
              </label>
              <label className="flex flex-col">
                Monatsbeitrag
                <input type="number" name="monthly_contribution" defaultValue={scenario.monthly_contribution} className="rounded border p-2" />
              </label>
              <label className="flex flex-col">
                Startkapital
                <input type="number" name="start_capital" defaultValue={scenario.start_capital} className="rounded border p-2" />
              </label>
              <label className="flex flex-col">
                Bruttorendite p.a.
                <input type="number" step="0.01" name="gross_return_pa" defaultValue={scenario.gross_return_pa} className="rounded border p-2" />
              </label>
              <label className="flex flex-col">
                Inflation Ziel
                <input type="number" step="0.01" name="inflation_target_pa" defaultValue={scenario.inflation_target_pa} className="rounded border p-2" />
              </label>
              <label className="flex flex-col">
                Inflation (Berechnung)
                <input type="number" step="0.01" name="inflation_calc_pa" defaultValue={scenario.inflation_calc_pa} className="rounded border p-2" />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="equity_fund" defaultChecked={!!scenario.equity_fund} /> Fondsart &gt;50% Aktien
              </label>
              <label className="flex flex-col col-span-2">
                Glidepath (JSON Jahr/Aktienquote)
                <textarea name="glidepath_json" defaultValue={scenario.glidepath_json} className="rounded border p-2" rows={3} />
              </label>
            </div>

            <h3 className="pt-2 text-sm font-semibold text-slate-700">Depot-Kosten</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <label className="flex flex-col">
                TER p.a.
                <input type="number" step="0.001" name="depot_ter_pa" defaultValue={scenario.depot_ter_pa} className="rounded border p-2" />
              </label>
              <label className="flex flex-col">
                AUM Fee p.a.
                <input type="number" step="0.001" name="depot_aum_fee_pa" defaultValue={scenario.depot_aum_fee_pa} className="rounded border p-2" />
              </label>
              <label className="flex flex-col">
                Monatliche Pauschale
                <input type="number" step="0.01" name="depot_monthly_fee" defaultValue={scenario.depot_monthly_fee} className="rounded border p-2" />
              </label>
              <label className="flex flex-col">
                Switche p.a.
                <input type="number" name="depot_switches_total" defaultValue={scenario.depot_switches_total} className="rounded border p-2" />
              </label>
            </div>

            <h3 className="pt-2 text-sm font-semibold text-slate-700">Fondspolice</h3>
            <label className="flex flex-col text-sm">
              Tarif (Fondspolice Schicht 3)
              <select name="policy_tariff_id" defaultValue={scenario.policy_tariff_id ?? undefined} className="rounded border p-2">
                {tariffs.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({(t.effective_cost_pa * 100).toFixed(2)}%)
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs text-slate-500">
              Effektivkosten (BIB-Untergrenze / Musterfall) – dient als RIY-basierte Renditeminderung.
            </p>

            <h3 className="pt-2 text-sm font-semibold text-slate-700">Payout</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <label className="flex flex-col">
                Ziel Netto-Entnahme/Monat
                <input
                  type="number"
                  name="payout_target_net_withdrawal_monthly"
                  defaultValue={scenario.payout_target_net_withdrawal_monthly}
                  className="rounded border p-2"
                />
              </label>
              <label className="flex flex-col">
                Entnahme bis Alter
                <input type="number" name="payout_end_age" defaultValue={scenario.payout_end_age} className="rounded border p-2" />
              </label>
              <label className="flex flex-col">
                Modus
                <select name="payout_mode" defaultValue={scenario.payout_mode} className="rounded border p-2">
                  <option value="capital_withdrawal_plan">Entnahmeplan</option>
                  <option value="annuity">Leibrente (Ertragsanteil)</option>
                </select>
              </label>
              <label className="flex flex-col">
                Aufschub-Jahre (Leibrente)
                <input type="number" name="allow_deferral_years" defaultValue={scenario.allow_deferral_years} className="rounded border p-2" />
              </label>
            </div>
            <button className="rounded bg-indigo-600 px-4 py-2 text-white">Speichern</button>
          </form>

          <div className="space-y-4 rounded border p-4 text-sm">
            <h2 className="font-semibold text-slate-800">Ergebnis</h2>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded bg-slate-50 p-3">
                <p className="font-semibold text-indigo-700">Depot</p>
                <p>Wert zu Rente: {simulation.summary.depot_value_at_retirement.toFixed(0)} €</p>
                <p>Kosten kum.: {simulation.summary.depot_costs_paid.toFixed(0)} €</p>
                <p>Steuern kum.: {simulation.summary.depot_taxes_paid.toFixed(0)} €</p>
              </div>
              <div className="rounded bg-slate-50 p-3">
                <p className="font-semibold text-indigo-700">Fondspolice</p>
                <p>Wert zu Rente: {simulation.summary.policy_value_at_retirement.toFixed(0)} €</p>
                <p>Kosten kum.: {simulation.summary.policy_costs_paid.toFixed(0)} €</p>
                <p>Steuern kum.: {simulation.summary.policy_taxes_paid.toFixed(0)} €</p>
              </div>
            </div>
            <p className="text-xs text-slate-500">Kapital reicht bis ca. Alter {simulation.summary.capital_last_age_policy.toFixed(1)}</p>
            <Charts timeline={simulation.timeline} />
          </div>
        </div>
      </div>
    </div>
  );
}
