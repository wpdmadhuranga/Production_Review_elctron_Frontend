import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface RevenueDataPoint {
  month: string;
  revenue: number;
  target: number;
}

interface TooltipEntry {
  dataKey?: string | number;
  name?: string;
  value?: number | string;
  color?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

const data: RevenueDataPoint[] = [
  { month: "Jan", revenue: 42000, target: 38000 },
  { month: "Feb", revenue: 46000, target: 40000 },
  { month: "Mar", revenue: 52000, target: 45000 },
  { month: "Apr", revenue: 49000, target: 47000 },
  { month: "May", revenue: 58000, target: 50000 },
];

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-600/70 bg-slate-900/90 px-3 py-2 shadow-xl backdrop-blur-md">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-5 text-sm">
          <span className="font-medium text-slate-200">{entry.name}</span>
          <span style={{ color: entry.color }} className="font-semibold">
            ${Number(entry.value || 0).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function RevenueStats() {
  return (
    <div className="w-full rounded-2xl border border-slate-700/70 bg-gradient-to-br from-slate-800 via-slate-800/95 to-slate-900/95 p-5 shadow-2xl backdrop-blur-md">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-slate-100">Revenue Stats</h3>
        <p className="text-sm text-slate-400">Monthly Overview</p>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={8} barCategoryGap="25%" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(148, 163, 184, 0.18)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: "#cbd5e1", fontSize: 12 }}
              axisLine={{ stroke: "rgba(148, 163, 184, 0.35)" }}
              tickLine={{ stroke: "rgba(148, 163, 184, 0.35)" }}
            />
            <YAxis
              tick={{ fill: "#cbd5e1", fontSize: 12 }}
              axisLine={{ stroke: "rgba(148, 163, 184, 0.35)" }}
              tickLine={{ stroke: "rgba(148, 163, 184, 0.35)" }}
              tickFormatter={(value) => `$${(Number(value) / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(100, 116, 139, 0.2)" }} />
            <Legend
              iconType="circle"
              wrapperStyle={{ color: "#cbd5e1", paddingTop: "6px" }}
              formatter={(value) => <span className="text-sm text-slate-200">{value}</span>}
            />
            <Bar
              dataKey="revenue"
              name="Revenue"
              fill="#8b5cf6"
              radius={[8, 8, 0, 0]}
              animationDuration={900}
              animationEasing="ease-out"
            />
            <Bar
              dataKey="target"
              name="Target"
              fill="#14b8a6"
              radius={[8, 8, 0, 0]}
              animationDuration={1100}
              animationEasing="ease-out"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
