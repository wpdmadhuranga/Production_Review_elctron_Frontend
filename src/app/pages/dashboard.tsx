import { AlertCircle, Calendar, CheckCircle2, Factory, TrendingUp } from "lucide-react";
import { ProductionStatus } from "../component/ProductionStatus";
import RevenueStats from "../component/RevenueStats";
import { StatsCard } from "../component/StatsCard";

function Dashboard() {
  // Mock data for the dashboard
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const productionLines = [
    { id: '1', name: 'Production Line A', status: 'running' as const, currentProduction: 850, target: 1000, efficiency: 95 },
    { id: '2', name: 'Production Line B', status: 'running' as const, currentProduction: 720, target: 1000, efficiency: 88 },
    { id: '3', name: 'Production Line C', status: 'maintenance' as const, currentProduction: 420, target: 1000, efficiency: 65 },
    { id: '4', name: 'Production Line D', status: 'idle' as const, currentProduction: 0, target: 1000, efficiency: 0 },
  ];

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
            value="26,800"
            icon={Factory}
            trend={{ value: 12.5, isPositive: true }}
            iconBgColor="bg-blue-100"
            iconColor="text-blue-600"
          />
          <StatsCard
            title="Quality Rate"
            value="97.2%"
            icon={CheckCircle2}
            trend={{ value: 2.3, isPositive: true }}
            iconBgColor="bg-green-100"
            iconColor="text-green-600"
          />
          <StatsCard
            title="Total Defects"
            value="700"
            icon={AlertCircle}
            trend={{ value: 5.1, isPositive: false }}
            iconBgColor="bg-red-100"
            iconColor="text-red-600"
          />
          <StatsCard
            title="Efficiency"
            value="92.5%"
            icon={TrendingUp}
            trend={{ value: 3.8, isPositive: true }}
            iconBgColor="bg-purple-100"
            iconColor="text-purple-600"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="col-span-2">
            <RevenueStats />
          </div>
          <div>
            <ProductionStatus lines={productionLines} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;