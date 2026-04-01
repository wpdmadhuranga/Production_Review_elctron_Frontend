import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getProductionReportFilter } from "../services/productionService";

interface RevenueDataPoint {
  date: string;
  total: number;
  qualityRatePct?: number;
}

interface TooltipEntry {
  dataKey?: string | number;
  name?: string;
  value?: number | string;
  color?: string;
  payload?: any;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const defaultData: RevenueDataPoint[] = [];

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload && payload[0] && payload[0].payload ? payload[0].payload : null;
  const quality = point ? (point.qualityRatePct ?? point.qualityRate) : null;

  return (
    <div className="rounded-xl border border-slate-600/70 bg-slate-900/90 px-3 py-2 shadow-xl backdrop-blur-md">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">{label}</p>
      {typeof quality === 'number' && (
        <div className="flex items-center justify-between gap-5 text-sm mb-2">
          <span className="font-medium text-slate-200">Quality Rate</span>
          <span className="font-semibold text-slate-100">{Number(quality).toFixed(2)}%</span>
        </div>
      )}
      {payload.map((entry: any) => (
        <div key={String(entry.dataKey)} className="flex items-center justify-between gap-5 text-sm">
          <span className="font-medium text-slate-200">{entry.name}</span>
          <span style={{ color: entry.color }} className="font-semibold">
            {Number(entry.value || 0).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

interface RevenueStatsProps {
  data?: RevenueDataPoint[];
}

export default function RevenueStats({ data: externalData }: RevenueStatsProps) {
  const [chartData, setChartData] = useState<RevenueDataPoint[]>(externalData || defaultData);

  useEffect(() => {
    if (externalData) {
      setChartData(externalData);
      return;
    }

    (async () => {
      try {
        const to = new Date();
        const from = new Date();
        from.setDate(to.getDate() - 6); // last 7 days by default

        const resp = await getProductionReportFilter({ dateFrom: from, dateTo: to });

        // resp may be an array of production records. Aggregate totals by productionDate.
        const map = new Map<string, number>();

        if (Array.isArray(resp)) {
          for (const r of resp) {
            const date = r.productionDate ? new Date(r.productionDate).toISOString().slice(0, 10) : null;
            const value = r.actualTotalTyres ?? r.productEntries?.reduce((s: number, p: any) => s + (p.totalProduction ?? 0), 0) ?? 0;
            if (!date) continue;
            map.set(date, (map.get(date) || 0) + Number(value));
          }
        }

        const out: RevenueDataPoint[] = Array.from(map.entries())
          .map(([date, total]) => ({ date, total }))
          .sort((a, b) => (a.date < b.date ? -1 : 1));

        setChartData(out);
      } catch (err) {
        console.error("Failed to load production report:", err);
      }
    })();
  }, [externalData]);

  return (
    <div className="w-full rounded-2xl border border-slate-700/70 bg-gradient-to-br from-slate-800 via-slate-800/95 to-slate-900/95 p-5 shadow-2xl backdrop-blur-md">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-slate-100">Production Totals</h3>
        <p className="text-sm text-slate-400">Daily production (last 7 days)</p>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={8} barCategoryGap="25%" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(148, 163, 184, 0.18)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: "#cbd5e1", fontSize: 12 }}
              axisLine={{ stroke: "rgba(148, 163, 184, 0.35)" }}
              tickLine={{ stroke: "rgba(148, 163, 184, 0.35)" }}
              tickFormatter={(val: string) => new Date(val).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            />
            <YAxis
              tick={{ fill: "#cbd5e1", fontSize: 12 }}
              axisLine={{ stroke: "rgba(148, 163, 184, 0.35)" }}
              tickLine={{ stroke: "rgba(148, 163, 184, 0.35)" }}
              tickFormatter={(value) => `${Number(value).toLocaleString()}`}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "rgba(100, 116, 139, 0.2)" }}
              labelFormatter={(label) => new Date(label).toLocaleString()}
            />
            <Legend
              iconType="circle"
              wrapperStyle={{ color: "#cbd5e1", paddingTop: "6px" }}
              formatter={(value) => <span className="text-sm text-slate-200">{value}</span>}
            />
            <Bar
              dataKey="total"
              name="Total Production"
              fill="#8b5cf6"
              radius={[8, 8, 0, 0]}
              animationDuration={900}
              animationEasing="ease-out"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
