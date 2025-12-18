'use client';

import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type MonthlyPoint = { month: number; age: number; depot: number; policy: number; glidepath_equity: number };

export default function Charts({ timeline }: { timeline: MonthlyPoint[] }) {
  const yearly = timeline.filter((p) => p.month % 12 === 0);
  const waterfall = yearly.map((p, idx) => ({
    name: `Jahr ${idx}`,
    Depot: Math.max(p.depot, 0),
    Police: Math.max(p.policy, 0)
  }));
  const glide = yearly.map((p) => ({ name: `Alter ${p.age.toFixed(0)}`, equity: p.glidepath_equity * 100 }));
  return (
    <div className="space-y-6">
      <div className="h-64">
        <ResponsiveContainer>
          <LineChart data={yearly} margin={{ left: 0, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="age" tickFormatter={(v) => v.toFixed(0)} label={{ value: 'Alter', position: 'insideBottom', offset: -4 }} />
            <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => `${v.toFixed(0)} €`} />
            <Legend />
            <Line type="monotone" dataKey="depot" name="Depot" stroke="#6366f1" dot={false} />
            <Line type="monotone" dataKey="policy" name="Police" stroke="#16a34a" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="h-64">
        <ResponsiveContainer>
          <AreaChart data={waterfall} margin={{ left: 0, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => `${v.toFixed(0)} €`} />
            <Legend />
            <Area type="monotone" dataKey="Depot" stackId="1" stroke="#6366f1" fill="#c7d2fe" />
            <Area type="monotone" dataKey="Police" stackId="1" stroke="#16a34a" fill="#bbf7d0" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="h-48">
        <ResponsiveContainer>
          <LineChart data={glide}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis unit=" %" domain={[0, 100]} />
            <Tooltip formatter={(v: number) => `${v.toFixed(0)} %`} />
            <Line type="monotone" dataKey="equity" name="Aktienquote" stroke="#0ea5e9" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
