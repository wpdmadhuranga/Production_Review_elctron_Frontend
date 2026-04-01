import { Activity, AlertCircle, Award, Target } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getProductionMonthlySummary } from '../services/productionService';
import { computeAggregatesFromBatches } from '../utils/reportUtils';

interface MonthlyStats {
  period: string;
  totalTyres: number;
  defects: number;
  efficiency: number;
  qualityRate: number;
  lineEfficiency: number;
  isCurrent?: boolean;
}

const MonthlySummaryCard = ({ stats }: { stats: MonthlyStats }) => {
  const isCurrent = stats.isCurrent;

  return (
    <div className={`p-6 rounded-2xl shadow-sm border transition-all hover:shadow-md ${
      isCurrent
        ? 'bg-gradient-to-br from-white to-indigo-50 border-indigo-100'
        : 'bg-white border-slate-100'
    }`}>
      <div className="flex justify-between items-center mb-6">
        <h3 className={`text-lg font-bold ${isCurrent ? 'text-indigo-900' : 'text-slate-700'}`}>
          {stats.period}
        </h3>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          isCurrent ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
        }`}>
          {isCurrent ? 'Live Summary' : 'Finalized'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Main Metric */}
        <div className="col-span-2 mb-2">
          <p className="text-slate-500 text-sm">Total Tyres Produced</p>
          <p className="text-3xl font-extrabold text-slate-900">{stats.totalTyres.toLocaleString()}</p>
        </div>

        {/* Metric Grid */}
        <MetricItem icon={<AlertCircle size={16}/>} label="Defects" value={stats.defects} color="text-red-500" />
        <MetricItem icon={<Activity size={16}/>} label="Efficiency" value={`${stats.efficiency}%`} color="text-indigo-600" />
        <MetricItem icon={<Award size={16}/>} label="Quality" value={`${stats.qualityRate}%`} color="text-emerald-500" />
        <MetricItem icon={<Target size={16}/>} label="Line Eff." value={`${stats.lineEfficiency}%`} color="text-amber-500" />
      </div>
    </div>
  );
};

const MetricItem = ({ icon, label, value, color }: any) => (
  <div className="flex flex-col">
    <span className="text-slate-400 text-xs flex items-center gap-1 mb-1">
      {icon} {label}
    </span>
    <span className={`font-bold text-sm ${color}`}>{value}</span>
  </div>
);

export default function MonthlyStats() {
  const STORAGE_KEY = 'production.monthlySummary.v1';
  const [monthly, setMonthly] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load cached value first
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // parsed may be { data, fetchedAt } or the raw payload
        setMonthly(parsed.data || parsed);
      }
    } catch (err) {
      console.warn('Failed to parse cached monthly summary', err);
    }

    (async () => {
      setLoading(true);
      try {
        const resp = await getProductionMonthlySummary();
        if (resp) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ data: resp, fetchedAt: new Date().toISOString() }));
          } catch (e) {
            console.warn('Failed to cache monthly summary', e);
          }
          setMonthly(resp);
        }
      } catch (err) {
        console.error('Failed to fetch monthly summary', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const currBatches = monthly?.currentMonth?.report || [];
  const prevBatches = monthly?.previousMonth?.report || [];

  const curAgg = computeAggregatesFromBatches(currBatches);
  const prevAgg = computeAggregatesFromBatches(prevBatches);

  const formatPeriod = (from?: string, to?: string, fallback?: string) => {
    if (!from) return fallback || '';
    try {
      const d = new Date(from);
      return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    } catch {
      return fallback || '';
    }
  };

  const currentStats: MonthlyStats = {
    period: formatPeriod(monthly?.currentMonth?.from, monthly?.currentMonth?.to, 'Current Month'),
    totalTyres: curAgg.totalTyres || 0,
    defects: curAgg.defectCount || 0,
    efficiency: Number(((curAgg.performancePct || 0)).toFixed(2)),
    qualityRate: Number(((curAgg.qualityRatePct || 0)).toFixed(2)),
    lineEfficiency: Number(((curAgg.performancePct || 0)).toFixed(2)),
    isCurrent: true,
  };

  const previousStats: MonthlyStats = {
    period: formatPeriod(monthly?.previousMonth?.from, monthly?.previousMonth?.to, 'Previous Month'),
    totalTyres: prevAgg.totalTyres || 0,
    defects: prevAgg.defectCount || 0,
    efficiency: Number(((prevAgg.performancePct || 0)).toFixed(2)),
    qualityRate: Number(((prevAgg.qualityRatePct || 0)).toFixed(2)),
    lineEfficiency: Number(((prevAgg.performancePct || 0)).toFixed(2)),
    isCurrent: false,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-800">Monthly Summary</h2>
        <div className="text-sm text-slate-500">{loading ? 'Refreshing…' : 'Cached view'}</div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <MonthlySummaryCard stats={currentStats} />
        <MonthlySummaryCard stats={previousStats} />
      </div>
    </div>
  );
}