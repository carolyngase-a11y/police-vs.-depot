import tariffs from '../data/s3_privatrenten_no_guarantee_tariffs.json';
import { ertragsanteilForAge, taxOnGain, defaultTaxParams, TaxParams } from './tax_de';

type GlidePoint = { year: number; equity_share: number };

type DepotCosts = {
  ter_pa: number;
  aum_fee_pa: number;
  monthly_fee: number;
  switches_total: number;
};

type PayoutSettings = {
  target_net_withdrawal_monthly: number;
  end_age: number;
  payout_mode: 'capital_withdrawal_plan' | 'annuity';
  allow_deferral_years?: number;
};

export type ScenarioInput = {
  name: string;
  age: number;
  church_tax_enabled: boolean;
  retirement_age_base: number;
  retirement_age_policy: number;
  monthly_contribution: number;
  start_capital: number;
  gross_return_pa: number;
  inflation_target_pa: number;
  inflation_calc_pa: number;
  equity_fund: boolean;
  glidepath: GlidePoint[];
  depot_costs: DepotCosts;
  policy_tariff_id?: string;
  payout: PayoutSettings;
};

type MonthlyPoint = { month: number; age: number; depot: number; policy: number; glidepath_equity: number };

type ResultSummary = {
  depot_value_at_retirement: number;
  policy_value_at_retirement: number;
  depot_costs_paid: number;
  policy_costs_paid: number;
  depot_taxes_paid: number;
  policy_taxes_paid: number;
  capital_last_age_depot: number;
  capital_last_age_policy: number;
};

export type SimulationResult = {
  summary: ResultSummary;
  timeline: MonthlyPoint[];
};

export function getTariffById(id?: string) {
  return tariffs.find((t) => t.id === id);
}

function monthlyRate(pa: number) {
  return Math.pow(1 + pa, 1 / 12) - 1;
}

function interpolateGlidepath(glidepath: GlidePoint[], years: number): GlidePoint[] {
  if (glidepath.length === 0) return [];
  const sorted = [...glidepath].sort((a, b) => a.year - b.year);
  const result: GlidePoint[] = [];
  for (let y = 0; y <= years; y++) {
    const lower = sorted.filter((p) => p.year <= y).pop() ?? sorted[0];
    const upper = sorted.find((p) => p.year >= y) ?? sorted[sorted.length - 1];
    if (lower.year === upper.year) {
      result.push({ year: y, equity_share: lower.equity_share });
    } else {
      const ratio = (y - lower.year) / (upper.year - lower.year);
      const share = lower.equity_share + (upper.equity_share - lower.equity_share) * ratio;
      result.push({ year: y, equity_share: share });
    }
  }
  return result;
}

export function grossUpToNet(targetNet: number, netOfGrossFn: (gross: number) => number, tolerance = 0.01) {
  let low = targetNet;
  let high = targetNet * 2 + 1;
  for (let i = 0; i < 30; i++) {
    const mid = (low + high) / 2;
    const net = netOfGrossFn(mid);
    if (Math.abs(net - targetNet) < tolerance) return mid;
    if (net < targetNet) low = mid;
    else high = mid;
  }
  return high;
}

export function simulateScenario(input: ScenarioInput, taxParams: TaxParams = defaultTaxParams): SimulationResult {
  const monthsToRetirement = (input.retirement_age_base - input.age) * 12;
  const glide = interpolateGlidepath(input.glidepath, input.retirement_age_base - input.age);
  const monthlyReturnGross = monthlyRate(input.gross_return_pa);
  const depotCostMonthly = monthlyRate(input.depot_costs.ter_pa + input.depot_costs.aum_fee_pa);
  const policyTariff = getTariffById(input.policy_tariff_id);
  const policyCostMonthly = monthlyRate(policyTariff?.effective_cost_pa ?? 0);

  let depot = input.start_capital;
  let policy = input.start_capital;
  let depotCostPaid = 0;
  let policyCostPaid = 0;
  const timeline: MonthlyPoint[] = [];

  let depotCostBasis = input.start_capital;

  for (let m = 0; m <= monthsToRetirement; m++) {
    const ageYears = input.age + m / 12;
    const glideYear = Math.floor(m / 12);
    const equityShare = glide[glideYear]?.equity_share ?? (input.equity_fund ? 1 : 0.5);

    depot += input.monthly_contribution;
    policy += input.monthly_contribution;
    depotCostBasis += input.monthly_contribution;

    const depotGrossGrowth = depot * monthlyReturnGross;
    const depotCosts = depot * depotCostMonthly + input.depot_costs.monthly_fee;
    depot = depot + depotGrossGrowth - depotCosts;
    depotCostPaid += depotCosts;

    const policyGrossGrowth = policy * (monthlyReturnGross - policyCostMonthly);
    policy = policy + policyGrossGrowth;
    policyCostPaid += policy * policyCostMonthly;

    timeline.push({ month: m, age: ageYears, depot, policy, glidepath_equity: equityShare });
  }

  const payoutMonths = (input.payout.end_age - input.retirement_age_base) * 12;
  let depotTaxesPaid = 0;
  let policyTaxesPaid = 0;

  function netAfterDepotSale(gross: number) {
    const proportion = gross / depot;
    const gainPortion = Math.max(0, depot - depotCostBasis);
    const realizedGain = gainPortion * proportion;
    const tax = taxOnGain(realizedGain, input.equity_fund, input.church_tax_enabled, taxParams);
    return gross - tax;
  }

  function netAfterPolicyPayout(gross: number) {
    const gain = Math.max(0, policy - depotCostBasis);
    if (input.payout.payout_mode === 'annuity') {
      const ertragsanteil = ertragsanteilForAge(input.retirement_age_policy);
      const taxable = gross * ertragsanteil;
      const tax = taxOnGain(taxable, false, input.church_tax_enabled, taxParams);
      return gross - tax;
    }
    const contractYears = input.retirement_age_policy - input.age;
    const eligible = contractYears >= 12 && input.retirement_age_policy >= 62;
    const taxableGainShare = eligible ? 0.5 : 1;
    const tax = taxOnGain(gain * taxableGainShare * (gross / Math.max(policy, 1)), false, input.church_tax_enabled, taxParams);
    return gross - tax;
  }

  for (let m = 1; m <= payoutMonths; m++) {
    const targetNet = input.payout.target_net_withdrawal_monthly;

    const depotGross = grossUpToNet(targetNet, (gross) => netAfterDepotSale(gross));
    const policyGross = grossUpToNet(targetNet, (gross) => netAfterPolicyPayout(gross));

    const depotNet = netAfterDepotSale(depotGross);
    const policyNet = netAfterPolicyPayout(policyGross);

    const depotTax = depotGross - depotNet;
    const policyTax = policyGross - policyNet;

    depotTaxesPaid += depotTax;
    policyTaxesPaid += policyTax;

    depot -= depotGross;
    policy -= policyGross;

    timeline.push({
      month: monthsToRetirement + m,
      age: input.retirement_age_base + m / 12,
      depot: Math.max(0, depot),
      policy: Math.max(0, policy),
      glidepath_equity: glide[glide.length - 1]?.equity_share ?? (input.equity_fund ? 1 : 0.5)
    });

    if (depot <= 0 && policy <= 0) break;
  }

  return {
    summary: {
      depot_value_at_retirement: timeline[monthsToRetirement]?.depot ?? 0,
      policy_value_at_retirement: timeline[monthsToRetirement]?.policy ?? 0,
      depot_costs_paid: depotCostPaid,
      policy_costs_paid: policyCostPaid,
      depot_taxes_paid: depotTaxesPaid,
      policy_taxes_paid: policyTaxesPaid,
      capital_last_age_depot: input.age + timeline[timeline.length - 1].month / 12,
      capital_last_age_policy: input.age + timeline[timeline.length - 1].month / 12
    },
    timeline
  };
}
