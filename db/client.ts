import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'db', 'database.sqlite');

if (!fs.existsSync(path.dirname(dbPath))) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

const sqlite = sqlite3.verbose();
export const db = new sqlite.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      annual_income REAL,
      marital_status TEXT,
      church_tax_enabled INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

  db.run(`CREATE TABLE IF NOT EXISTS scenarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      retirement_age_base INTEGER NOT NULL,
      retirement_age_policy INTEGER NOT NULL,
      monthly_contribution REAL NOT NULL,
      start_capital REAL DEFAULT 0,
      gross_return_pa REAL DEFAULT 0.06,
      inflation_target_pa REAL DEFAULT 0.02,
      inflation_calc_pa REAL DEFAULT 0.0,
      equity_fund INTEGER DEFAULT 1,
      glidepath_json TEXT DEFAULT '[]',
      depot_ter_pa REAL DEFAULT 0,
      depot_aum_fee_pa REAL DEFAULT 0,
      depot_monthly_fee REAL DEFAULT 0,
      depot_switches_total INTEGER DEFAULT 3,
      policy_tariff_id TEXT,
      payout_target_net_withdrawal_monthly REAL DEFAULT 1000,
      payout_end_age INTEGER DEFAULT 88,
      payout_mode TEXT DEFAULT 'capital_withdrawal_plan',
      allow_deferral_years INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(customer_id) REFERENCES customers(id)
    )`);
});

export function run(query: string, params: any[] = []) {
  return new Promise<void>((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function get<T>(query: string, params: any[] = []): Promise<T> {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T);
    });
  });
}

export function all<T>(query: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}
