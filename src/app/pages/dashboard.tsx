import { AlertCircle, Calendar, CheckCircle2, Factory, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import MonthlyStats from "../component/MonthlyStats";
import { ProductionStatus } from "../component/ProductionStatus";
import RevenueStats from "../component/RevenueStats";
import { StatsCard } from "../component/StatsCard";
import { getProductionMonthlySummary } from "../services/productionService";
import {
  buildDailySeriesFromBatches,
  buildLineSummariesForDate,
  getAggregatesForDate,
  getPreviousMonthSameDayAggregates,
} from "../utils/reportUtils";

function Dashboard() {
  // Mock data for the dashboard
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const [dailySeries, setDailySeries] = useState<any[]>([]);
  const [productionLines, setProductionLines] = useState<any[]>([]);
  const [todayAgg, setTodayAgg] = useState<any | null>(null);
  const [lastMonthAgg, setLastMonthAgg] = useState<any | null>(null);

  useEffect(() => {
    const loadDashboardData = async (forceRefresh = false) => {
      try {
        const STORAGE_KEY = 'production.monthlySummary.v1';
        let resp = forceRefresh ? await getProductionMonthlySummary(true) : await getProductionMonthlySummary();

        if (!resp || ((resp.currentMonth?.report?.length || 0) === 0 && (resp.previousMonth?.report?.length || 0) === 0)) {
          try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
              const parsed = JSON.parse(raw);
              resp = parsed.data || parsed || resp;
            }
          } catch (e) {
            // ignore parse errors
          }
        }

        const currentBatches = resp?.currentMonth?.report || [];
        const previousBatches = resp?.previousMonth?.report || [];

        setDailySeries(buildDailySeriesFromBatches(currentBatches || []));

        const today = new Date();
        setTodayAgg(getAggregatesForDate(currentBatches, today));
        setLastMonthAgg(getPreviousMonthSameDayAggregates(previousBatches, today));
        setProductionLines(buildLineSummariesForDate(currentBatches || [], today));
      } catch (err) {
        console.error('Failed to load monthly summary', err);
      }
    };

    loadDashboardData();

    const handleSummaryUpdate = () => loadDashboardData(true);
    window.addEventListener('productionMonthlySummaryUpdated', handleSummaryUpdate);
    return () => window.removeEventListener('productionMonthlySummaryUpdated', handleSummaryUpdate);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tyre Manufacturing Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                <Calendar size={16} />
                {currentDate}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">Shift</p>
                <p className="text-lg font-semibold text-gray-900">Day Shift</p>
              </div>
              <div className="h-12 w-px bg-gray-300" />
              <div className="text-right">
                <p className="text-sm text-gray-600">Time</p>
                <p className="text-lg font-semibold text-gray-900">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Production Today"
            value={todayAgg ? (todayAgg.totalTyres || 0).toLocaleString() : '—'}
            icon={Factory}
            trend={
              lastMonthAgg && lastMonthAgg.totalTyres
                ? { value: Math.round(((todayAgg.totalTyres - lastMonthAgg.totalTyres) / Math.max(1, lastMonthAgg.totalTyres)) * 100 * 10) / 10, isPositive: (todayAgg.totalTyres - lastMonthAgg.totalTyres) >= 0 }
                : undefined
            }
            iconBgColor="bg-blue-100"
            iconColor="text-blue-600"
          />
          <StatsCard
            title="Quality Rate"
            value={todayAgg ? `${(todayAgg.qualityRatePct || 0).toFixed(2)}%` : '—'}
            icon={CheckCircle2}
            trend={
              lastMonthAgg
                ? { value: Math.round(((todayAgg.qualityRatePct || 0) - (lastMonthAgg.qualityRatePct || 0)) * 10) / 10, isPositive: (todayAgg.qualityRatePct || 0) - (lastMonthAgg.qualityRatePct || 0) >= 0 }
                : undefined
            }
            iconBgColor="bg-green-100"
            iconColor="text-green-600"
          />
          <StatsCard
            title="Total Defects"
            value={todayAgg ? (todayAgg.defectCount || 0).toLocaleString() : '—'}
            icon={AlertCircle}
            trend={
              lastMonthAgg && lastMonthAgg.defectCount
                ? { value: Math.round(((todayAgg.defectCount - lastMonthAgg.defectCount) / Math.max(1, lastMonthAgg.defectCount)) * 100 * 10) / 10, isPositive: (todayAgg.defectCount - lastMonthAgg.defectCount) <= 0 }
                : undefined
            }
            iconBgColor="bg-red-100"
            iconColor="text-red-600"
          />
          <StatsCard
            title="Efficiency"
            value={todayAgg ? `${(todayAgg.performancePct || 0).toFixed(2)}%` : '—'}
            icon={TrendingUp}
            trend={
              lastMonthAgg
                ? { value: Math.round(((todayAgg.performancePct || 0) - (lastMonthAgg.performancePct || 0)) * 10) / 10, isPositive: (todayAgg.performancePct || 0) - (lastMonthAgg.performancePct || 0) >= 0 }
                : undefined
            }
            iconBgColor="bg-purple-100"
            iconColor="text-purple-600"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="col-span-2 space-y-6">
            <RevenueStats data={dailySeries.map((d: any) => ({ date: d.date, total: d.produced, qualityRatePct: d.qualityRatePct }))} />
          </div>
          <div>
            <ProductionStatus lines={productionLines} />
          </div>
        </div>

        {/* Monthly Summary */}
        <div className="mb-8">
          <MonthlyStats />
        </div>
      </main>
    </div>
  );
}

export default Dashboard;