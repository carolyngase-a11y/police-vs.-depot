import taxDefaults from '../data/tax_defaults.json';

export type TaxParams = {
  withholding_tax_rate: number;
  soli_rate: number;
  church_tax_rate: number;
  partial_exemption_equity: number;
};

export const defaultTaxParams: TaxParams = taxDefaults;

export function effectiveTaxRate(isEquityFund: boolean, customerHasChurchTax: boolean, params: TaxParams = defaultTaxParams) {
  const baseRate = params.withholding_tax_rate;
  const soli = baseRate * params.soli_rate;
  const church = customerHasChurchTax ? baseRate * params.church_tax_rate : 0;
  const nominalRate = baseRate + soli + church;
  const reduction = isEquityFund ? params.partial_exemption_equity : 0;
  return nominalRate * (1 - reduction);
}

export function taxOnGain(gain: number, isEquityFund: boolean, churchTax: boolean, params: TaxParams = defaultTaxParams) {
  if (gain <= 0) return 0;
  return gain * effectiveTaxRate(isEquityFund, churchTax, params);
}

export function ertragsanteilForAge(age: number) {
  const table: Record<number, number> = {
    62: 0.21,
    63: 0.2,
    64: 0.19,
    65: 0.18,
    66: 0.17,
    67: 0.17
  };
  if (table[age] !== undefined) return table[age];
  // simple nearest approximation
  const closestAge = Object.keys(table)
    .map(Number)
    .reduce((prev, curr) => (Math.abs(curr - age) < Math.abs(prev - age) ? curr : prev));
  return table[closestAge];
}
