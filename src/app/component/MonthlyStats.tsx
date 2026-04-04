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
    <div className={`p-8 rounded-2xl shadow-sm border transition-all hover:shadow-md ${
      isCurrent
        ? 'bg-gradient-to-br from-white to-indigo-50 border-indigo-100'
        : 'bg-white border-slate-100'
    }`}>
      <div className="flex justify-between items-center mb-8">
        <h3 className={`text-xl font-bold ${isCurrent ? 'text-indigo-900' : 'text-slate-700'}`}>
          {stats.period}
        </h3>
        <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${
          isCurrent ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
        }`}>
          {isCurrent ? 'Live Summary' : 'Finalized'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Main Metric */}
        <div className="col-span-2 mb-4">
          <p className="text-slate-500 text-base font-medium mb-1">Total Tyres Produced</p>
          <p className="text-5xl font-extrabold text-slate-900">{stats.totalTyres.toLocaleString()}</p>
        </div>

        {/* Metric Grid */}
        <MetricItem icon={<AlertCircle size={20}/>} label="Defects" value={stats.defects} color="text-red-500" />
        <MetricItem icon={<Activity size={20}/>} label="Efficiency" value={`${stats.efficiency}%`} color="text-indigo-600" />
        <MetricItem icon={<Award size={20}/>} label="Quality" value={`${stats.qualityRate}%`} color="text-emerald-500" />
        <MetricItem icon={<Target size={20}/>} label="Line Eff." value={`${stats.lineEfficiency}%`} color="text-amber-500" />
      </div>
    </div>
  );
};

const MetricItem = ({ icon, label, value, color }: any) => (
  <div className="flex flex-col">
    <span className="text-slate-500 text-sm flex items-center gap-1.5 mb-1.5 font-medium">
      {icon} {label}
    </span>
    <span className={`font-bold text-xl ${color}`}>{value}</span>
  </div>
);

export default function MonthlyStats() {
  const STORAGE_KEY = 'production.monthlySummary.v1';
  const [monthly, setMonthly] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadSummary = async (forceRefresh = false) => {
      setLoading(true);
      try {
        const resp = forceRefresh ? await getProductionMonthlySummary(true) : await getProductionMonthlySummary();
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
    };

    // Load cached value first
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setMonthly(parsed.data || parsed);
      }
    } catch (err) {
      console.warn('Failed to parse cached monthly summary', err);
    }

    loadSummary();

    const handleSummaryUpdate = () => loadSummary(true);
    window.addEventListener('productionMonthlySummaryUpdated', handleSummaryUpdate);
    return () => window.removeEventListener('productionMonthlySummaryUpdated', handleSummaryUpdate);
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-800">Monthly Summary</h2>
        <div className="text-base text-slate-500">{loading ? 'Refreshing…' : 'Cached view'}</div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <MonthlySummaryCard stats={currentStats} />
        <MonthlySummaryCard stats={previousStats} />
      </div>
    </div>
  );
}