import { AlertCircle, Calendar, CheckCircle2, Package, Search, TrendingUp } from "lucide-react";
import { useState } from "react";

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

  // Mock data for tire items
  const [tyreData, setTyreData] = useState<TyreItem[]>([
    { 
      tyreItem: '195/65R15', 
      totalTyres: 1250, 
      totalDefects: 45,
      defects: { airBubble: 12, sidewall: 8, treadCrack: 5, centerMarking: 7, lateralDamage: 9, underBlister: 4 },
      gradeC: 1050,
      gradeD: 200
    },
    { 
      tyreItem: '205/55R16', 
      totalTyres: 980, 
      totalDefects: 32,
      defects: { airBubble: 8, sidewall: 6, treadCrack: 4, centerMarking: 5, lateralDamage: 6, underBlister: 3 },
      gradeC: 820,
      gradeD: 160
    },
    { 
      tyreItem: '225/45R17', 
      totalTyres: 1420, 
      totalDefects: 78,
      defects: { airBubble: 18, sidewall: 15, treadCrack: 12, centerMarking: 10, lateralDamage: 14, underBlister: 9 },
      gradeC: 980,
      gradeD: 440
    },
    { 
      tyreItem: '235/60R18', 
      totalTyres: 890, 
      totalDefects: 28,
      defects: { airBubble: 7, sidewall: 5, treadCrack: 3, centerMarking: 4, lateralDamage: 6, underBlister: 3 },
      gradeC: 750,
      gradeD: 140
    },
    { 
      tyreItem: '245/40R19', 
      totalTyres: 1150, 
      totalDefects: 65,
      defects: { airBubble: 15, sidewall: 12, treadCrack: 9, centerMarking: 8, lateralDamage: 13, underBlister: 8 },
      gradeC: 850,
      gradeD: 300
    },
    { 
      tyreItem: '215/60R16', 
      totalTyres: 1320, 
      totalDefects: 41,
      defects: { airBubble: 10, sidewall: 8, treadCrack: 6, centerMarking: 6, lateralDamage: 7, underBlister: 4 },
      gradeC: 1120,
      gradeD: 200
    },
    { 
      tyreItem: '185/70R14', 
      totalTyres: 760, 
      totalDefects: 52,
      defects: { airBubble: 14, sidewall: 10, treadCrack: 8, centerMarking: 7, lateralDamage: 9, underBlister: 4 },
      gradeC: 540,
      gradeD: 220
    },
    { 
      tyreItem: '255/35R20', 
      totalTyres: 540, 
      totalDefects: 19,
      defects: { airBubble: 5, sidewall: 3, treadCrack: 2, centerMarking: 3, lateralDamage: 4, underBlister: 2 },
      gradeC: 460,
      gradeD: 80
    },
  ]);

  const handleSearch = () => {
    setShowResults(true);
    // Here you would fetch data based on date range and duration
    console.log('Searching from:', dateFrom, 'to:', dateTo, 'duration:', duration);
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

  // Calculate summary statistics
  const totalTyres = tyreData.reduce((sum, item) => sum + item.totalTyres, 0);
  const totalDefects = tyreData.reduce((sum, item) => sum + item.totalDefects, 0);
  const totalGradeC = tyreData.reduce((sum, item) => sum + item.gradeC, 0);
  const totalGradeD = tyreData.reduce((sum, item) => sum + item.gradeD, 0);
  const defectRate = ((totalDefects / totalTyres) * 100).toFixed(2);
  const qualityRate = (100 - parseFloat(defectRate)).toFixed(2);

  // Calculate total defects by type
  const totalAirBubble = tyreData.reduce((sum, item) => sum + item.defects.airBubble, 0);
  const totalSidewall = tyreData.reduce((sum, item) => sum + item.defects.sidewall, 0);
  const totalTreadCrack = tyreData.reduce((sum, item) => sum + item.defects.treadCrack, 0);
  const totalCenterMarking = tyreData.reduce((sum, item) => sum + item.defects.centerMarking, 0);
  const totalLateralDamage = tyreData.reduce((sum, item) => sum + item.defects.lateralDamage, 0);
  const totalUnderBlister = tyreData.reduce((sum, item) => sum + item.defects.underBlister, 0);

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
                  {tyreData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">
                        {item.tyreItem}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-900 font-semibold border-r border-gray-200">
                        {item.totalTyres.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center border-r border-gray-200">
                        <span className="text-red-600 font-semibold">{item.totalDefects}</span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-center text-gray-700 border-r border-gray-200">
                        {item.defects.airBubble}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-center text-gray-700 border-r border-gray-200">
                        {item.defects.sidewall}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-center text-gray-700 border-r border-gray-200">
                        {item.defects.treadCrack}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-center text-gray-700 border-r border-gray-200">
                        {item.defects.centerMarking}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-center text-gray-700 border-r border-gray-200">
                        {item.defects.lateralDamage}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-center text-gray-700 border-r border-gray-200">
                        {item.defects.underBlister}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center bg-green-50 border-r border-gray-200">
                        <span className="text-green-700 font-semibold">{item.gradeC}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center bg-yellow-50">
                        <span className="text-yellow-700 font-semibold">{item.gradeD}</span>
                      </td>
                    </tr>
                  ))}
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
