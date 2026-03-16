import { AlertCircle, Calendar, CheckCircle2, Package, Search, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useMeta } from "../../context/MetaContext";
import { getProductionReportFilter } from "../../services/productionService";
import { computeAggregatesFromBatches, groupTyreItemsByType, safePercent, TyreTypeRow } from "../../utils/reportUtils";

interface DefectBreakdown {
  airBubble: number;
  sidewall: number;
  treadCrack: number;
  centerMarking: number;
  lateralDamage: number;
  underBlister: number;
}

interface TyreItem {
  tyreItem: string;
  totalTyres: number;
  totalDefects: number;
  defects: DefectBreakdown;
  gradeC: number;
  gradeD: number;
}

export function Summary() {
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState('today');
  const [showResults, setShowResults] = useState(false);

  const [tyreData, setTyreData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = () => {
    setShowResults(true);
    setError(null);
    (async () => {
      try {
        setLoading(true);
        // send dateFrom as start of day and dateTo fixed as requested
        const isoFrom = `${dateFrom}T00:00:00Z`;
        const isoTo = `2026-03-15T23:59:59Z`;
        const resp = await getProductionReportFilter({ dateFrom: isoFrom, dateTo: isoTo });
        // Attempt to map response to TyreItem[] shape. Adjust as necessary for actual API shape.
        if (Array.isArray(resp)) {
          setTyreData(resp as TyreItem[]);
        } else if (resp && resp.items && Array.isArray(resp.items)) {
          setTyreData(resp.items as TyreItem[]);
        } else {
          setTyreData([]);
        }
      } catch (err: any) {
        console.error('Failed to fetch production report filter', err);
        setError(err?.message ?? String(err));
      } finally {
        setLoading(false);
      }
    })();
  };

  const handleDurationChange = (selectedDuration: string) => {
    setDuration(selectedDuration);
    const today = new Date();
    let fromDate = new Date();

    switch (selectedDuration) {
      case 'today':
        fromDate = new Date();
        break;
      case 'week':
        fromDate.setDate(today.getDate() - 7);
        break;
      case 'month':
        fromDate.setMonth(today.getMonth() - 1);
        break;
      case 'quarter':
        fromDate.setMonth(today.getMonth() - 3);
        break;
      case 'year':
        fromDate.setFullYear(today.getFullYear() - 1);
        break;
      default:
        break;
    }

    if (selectedDuration !== 'custom') {
      setDateFrom(fromDate.toISOString().split('T')[0]);
      setDateTo(today.toISOString().split('T')[0]);
    }
  };

  // Calculate summary statistics via report utils
  // `tyreData` here contains API batches; use utils to compute aggregates and grouping
  const aggregates = computeAggregatesFromBatches(tyreData as any);
  const grouped = groupTyreItemsByType(tyreData as any) as TyreTypeRow[];
  const { tyreItems } = useMeta();

  const totalTyres = aggregates.totalTyres;
  const totalDefects = aggregates.defectCount;
  const totalGradeC = aggregates.totalGradeC;
  const totalGradeD = aggregates.totalGradeD;
  const defectRate = safePercent(aggregates.defectRatePct);
  const qualityRate = safePercent(aggregates.qualityRatePct);

  const getMetaName = (list: { id: number; name: string }[], value: string | number) => {
    const found = list.find((it) => String(it.id) === String(value));
    return found ? found.name : String(value);
  };

  // defect breakdown - try to pull common keys or show the map values
  const totalAirBubble = aggregates.defectsByType["airBubble"] || aggregates.defectsByType["AirBubble"] || aggregates.defectsByType["AIRBUBBLE"] || 0;
  const totalSidewall = aggregates.defectsByType["sidewall"] || 0;
  const totalTreadCrack = aggregates.defectsByType["treadCrack"] || 0;
  const totalCenterMarking = aggregates.defectsByType["centerMarking"] || 0;
  const totalLateralDamage = aggregates.defectsByType["lateralDamage"] || 0;
  const totalUnderBlister = aggregates.defectsByType["underBlister"] || 0;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Production Summary Report</h1>
        <p className="text-gray-600 mt-2">View tire production summary by date range and duration</p>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar size={20} />
          Filter by Date Range
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
            <select
              value={duration}
              onChange={(e) => handleDurationChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last Month</option>
              <option value="quarter">Last Quarter</option>
              <option value="year">Last Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              disabled={duration !== 'custom'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              disabled={duration !== 'custom'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleSearch}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Search size={18} />
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {showResults && (
        <div>
          {/* Summary Statistics - Above Table */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* Total Production */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-sm border border-blue-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Total Production</span>
                <Package size={20} className="text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{totalTyres.toLocaleString()}</p>
              <p className="text-xs text-gray-600 mt-1">Tires produced</p>
            </div>

            {/* Quality Rate */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm border border-green-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Quality Rate</span>
                <CheckCircle2 size={20} className="text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-600">{qualityRate}%</p>
              <p className="text-xs text-gray-600 mt-1">Good quality tires</p>
            </div>

            {/* Defect Rate */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg shadow-sm border border-red-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Defect Rate</span>
                <AlertCircle size={20} className="text-red-600" />
              </div>
              <p className="text-3xl font-bold text-red-600">{defectRate}%</p>
              <p className="text-xs text-gray-600 mt-1">{totalDefects} defective tires</p>
            </div>

            {/* Performance Status */}
            <div className={`rounded-lg shadow-sm border p-5 ${
              parseFloat(qualityRate) >= 95 
                ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200'
                : parseFloat(qualityRate) >= 90
                  ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'
                  : 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Performance</span>
                <TrendingUp size={20} className={
                  parseFloat(qualityRate) >= 95 ? 'text-green-600' :
                  parseFloat(qualityRate) >= 90 ? 'text-blue-600' : 'text-yellow-600'
                } />
              </div>
              <p className={`text-2xl font-bold ${
                parseFloat(qualityRate) >= 95 ? 'text-green-700' :
                parseFloat(qualityRate) >= 90 ? 'text-blue-700' : 'text-yellow-700'
              }`}>
                {parseFloat(qualityRate) >= 95 ? 'Excellent' :
                 parseFloat(qualityRate) >= 90 ? 'Good' : 'Fair'}
              </p>
              <p className="text-xs text-gray-600 mt-1">Overall status</p>
            </div>
          </div>

          {/* Main Data Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Package size={20} />
                Tire Production Details
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Showing results from {new Date(dateFrom).toLocaleDateString()} to {new Date(dateTo).toLocaleDateString()}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Tire Item
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Total Tires
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Defects
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Air.Ble
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      S.W
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Tr.Cr
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      C.Mr
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      L.Dam
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Un.Bl
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-green-700 uppercase tracking-wider bg-green-50 border-r border-gray-300">
                      C
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-yellow-700 uppercase tracking-wider bg-yellow-50">
                      D
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {grouped.length > 0 ? grouped.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">
                            {getMetaName(tyreItems, row.tyreTypeId) ?? row.tyreTypeName ?? String(row.tyreTypeId)}
                      </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-900 font-semibold border-r border-gray-200">
                              {row.producedTotal ? Number(row.producedTotal).toLocaleString() : '-'}
                      </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center border-r border-gray-200">
                          <span className="text-red-600 font-semibold">{row.totalDefects}</span>
                      </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-center text-gray-700 border-r border-gray-200">
                          {row.defects.airBubble || 0}
                      </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-center text-gray-700 border-r border-gray-200">
                          {row.defects.sidewall || 0}
                      </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-center text-gray-700 border-r border-gray-200">
                          {row.defects.treadCrack || 0}
                      </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-center text-gray-700 border-r border-gray-200">
                          {row.defects.centerMarking || 0}
                      </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-center text-gray-700 border-r border-gray-200">
                          {row.defects.lateralDamage || 0}
                      </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-center text-gray-700 border-r border-gray-200">
                          {row.defects.underBlister || 0}
                      </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center bg-green-50 border-r border-gray-200">
                          <span className="text-green-700 font-semibold">{row.gradeC}</span>
                      </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center bg-yellow-50">
                          <span className="text-yellow-700 font-semibold">{row.gradeD}</span>
                      </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={11} className="px-4 py-6 text-center text-sm text-gray-500">No tyre items found for selected filters.</td>
                      </tr>
                    )}
                </tbody>
                <tfoot className="bg-blue-50 border-t-2 border-blue-300">
                  <tr>
                    <td className="px-4 py-4 text-sm font-bold text-gray-900 border-r border-gray-300">TOTAL</td>
                    <td className="px-4 py-4 text-sm text-center font-bold text-gray-900 border-r border-gray-300">
                      {totalTyres.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-sm text-center font-bold text-red-600 border-r border-gray-300">
                      {totalDefects}
                    </td>
                    <td className="px-3 py-4 text-sm text-center font-bold text-gray-900 border-r border-gray-300">
                      {totalAirBubble}
                    </td>
                    <td className="px-3 py-4 text-sm text-center font-bold text-gray-900 border-r border-gray-300">
                      {totalSidewall}
                    </td>
                    <td className="px-3 py-4 text-sm text-center font-bold text-gray-900 border-r border-gray-300">
                      {totalTreadCrack}
                    </td>
                    <td className="px-3 py-4 text-sm text-center font-bold text-gray-900 border-r border-gray-300">
                      {totalCenterMarking}
                    </td>
                    <td className="px-3 py-4 text-sm text-center font-bold text-gray-900 border-r border-gray-300">
                      {totalLateralDamage}
                    </td>
                    <td className="px-3 py-4 text-sm text-center font-bold text-gray-900 border-r border-gray-300">
                      {totalUnderBlister}
                    </td>
                    <td className="px-4 py-4 text-sm text-center font-bold text-green-700 bg-green-100 border-r border-gray-300">
                      {totalGradeC}
                    </td>
                    <td className="px-4 py-4 text-sm text-center font-bold text-yellow-700 bg-yellow-100">
                      {totalGradeD}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!showResults && (
        <div className="bg-white rounded-lg p-12 shadow-sm border border-gray-200 text-center">
          <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Selected</h3>
          <p className="text-gray-600">Please select a date range and click "Search" to view the production summary.</p>
        </div>
      )}
    </div>
  );
}
export default Summary;
