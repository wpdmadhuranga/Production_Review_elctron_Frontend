import { AlertCircle, Calendar, CheckCircle2, ChevronDown, Package, Search, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

interface TyreTypeData {
  tyreType: string;
  totalTyres: number;
  gradeC: number;
  gradeD: number;
}

export function DefectWise() {
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState('today');
  const [selectedDefect, setSelectedDefect] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Available defect types
  const defectTypes = [
    { code: 'Air.Ble', name: 'Air Bubble' },
    { code: 'S.W', name: 'Sidewall' },
    { code: 'Tr.Cr', name: 'Tread Crack' },
    { code: 'C.Mr', name: 'Center Marking' },
    { code: 'L.Dam', name: 'Lateral Damage' },
    { code: 'Un.Bl', name: 'Under Blister' },
    { code: 'Bead.Dmg', name: 'Bead Damage' },
    { code: 'Surf.Def', name: 'Surface Defect' },
  ];

  // Filter defect types based on search
  const filteredDefectTypes = useMemo(() => {
    return defectTypes.filter(defect => 
      defect.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      defect.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  // Mock data for tire types by defect
  const getTyreDataByDefect = (defectType: string): TyreTypeData[] => {
    // This would normally come from your backend based on the selected defect type
    return [
      { tyreType: '195/65R15', totalTyres: 1250, gradeC: 1050, gradeD: 200 },
      { tyreType: '205/55R16', totalTyres: 980, gradeC: 820, gradeD: 160 },
      { tyreType: '225/45R17', totalTyres: 1420, gradeC: 980, gradeD: 440 },
      { tyreType: '235/60R18', totalTyres: 890, gradeC: 750, gradeD: 140 },
      { tyreType: '245/40R19', totalTyres: 1150, gradeC: 850, gradeD: 300 },
      { tyreType: '215/60R16', totalTyres: 1320, gradeC: 1120, gradeD: 200 },
      { tyreType: '185/70R14', totalTyres: 760, gradeC: 540, gradeD: 220 },
      { tyreType: '255/35R20', totalTyres: 540, gradeC: 460, gradeD: 80 },
    ];
  };

  const [tyreData, setTyreData] = useState<TyreTypeData[]>([]);

  const handleSearch = () => {
    if (!selectedDefect) {
      alert('Please select a defect type');
      return;
    }
    setShowResults(true);
    const data = getTyreDataByDefect(selectedDefect);
    setTyreData(data);
    console.log('Searching for defect type:', selectedDefect, 'from:', dateFrom, 'to:', dateTo);
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

  const handleDefectSelect = (defect: { code: string; name: string }) => {
    setSelectedDefect(`${defect.code} (${defect.name})`);
    setIsDropdownOpen(false);
    setSearchTerm('');
  };

  // Calculate summary statistics
  const totalTyres = tyreData.reduce((sum, item) => sum + item.totalTyres, 0);
  const totalGradeC = tyreData.reduce((sum, item) => sum + item.gradeC, 0);
  const totalGradeD = tyreData.reduce((sum, item) => sum + item.gradeD, 0);
  const defectRate = totalTyres > 0 ? ((totalGradeD / totalTyres) * 100).toFixed(2) : '0.00';
  const qualityRate = totalTyres > 0 ? ((totalGradeC / totalTyres) * 100).toFixed(2) : '0.00';

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Defect Wise Report</h1>
        <p className="text-gray-600 mt-2">Production reports categorized by defect types</p>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar size={20} />
          Filter Options
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Defect Type Selector with Search */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Defect Type</label>
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-left flex items-center justify-between"
              >
                <span className={selectedDefect ? 'text-gray-900' : 'text-gray-400'}>
                  {selectedDefect || 'Select Defect Type'}
                </span>
                <ChevronDown size={18} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg">
                  {/* Search Field */}
                  <div className="p-2 border-b border-gray-200">
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search defect type..."
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>

                  {/* Dropdown List */}
                  <div className="max-h-60 overflow-y-auto">
                    {filteredDefectTypes.length > 0 ? (
                      filteredDefectTypes.map((defect, index) => (
                        <button
                          key={index}
                          onClick={() => handleDefectSelect(defect)}
                          className={`w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors ${
                            selectedDefect === `${defect.code} (${defect.name})` 
                              ? 'bg-blue-100 text-blue-700 font-medium' 
                              : 'text-gray-700'
                          }`}
                        >
                          <span className="font-medium">{defect.code}</span>
                          <span className="text-gray-600 ml-2">({defect.name})</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">
                        No defect types found
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

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
                <span className="text-sm font-medium text-gray-700">Total Affected</span>
                <Package size={20} className="text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{totalTyres.toLocaleString()}</p>
              <p className="text-xs text-gray-600 mt-1">Tires with {selectedDefect}</p>
            </div>

            {/* Grade C Count */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm border border-green-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Grade C</span>
                <CheckCircle2 size={20} className="text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-600">{totalGradeC.toLocaleString()}</p>
              <p className="text-xs text-gray-600 mt-1">{qualityRate}% of total</p>
            </div>

            {/* Grade D Count */}
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg shadow-sm border border-yellow-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Grade D</span>
                <AlertCircle size={20} className="text-yellow-600" />
              </div>
              <p className="text-3xl font-bold text-yellow-600">{totalGradeD.toLocaleString()}</p>
              <p className="text-xs text-gray-600 mt-1">{defectRate}% of total</p>
            </div>

            {/* Performance Status */}
            <div className={`rounded-lg shadow-sm border p-5 ${
              parseFloat(qualityRate) >= 95 
                ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200'
                : parseFloat(qualityRate) >= 90
                  ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'
                  : 'bg-gradient-to-br from-red-50 to-red-100 border-red-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Performance</span>
                <TrendingUp size={20} className={
                  parseFloat(qualityRate) >= 95 ? 'text-green-600' :
                  parseFloat(qualityRate) >= 90 ? 'text-blue-600' : 'text-red-600'
                } />
              </div>
              <p className={`text-2xl font-bold ${
                parseFloat(qualityRate) >= 95 ? 'text-green-700' :
                parseFloat(qualityRate) >= 90 ? 'text-blue-700' : 'text-red-700'
              }`}>
                {parseFloat(qualityRate) >= 95 ? 'Excellent' :
                 parseFloat(qualityRate) >= 90 ? 'Good' : 'Poor'}
              </p>
              <p className="text-xs text-gray-600 mt-1">C grade ratio</p>
            </div>
          </div>

          {/* Main Data Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <AlertCircle size={20} />
                Tire Types Affected by {selectedDefect}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Showing breakdown from {new Date(dateFrom).toLocaleDateString()} to {new Date(dateTo).toLocaleDateString()}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Tire Type
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Total Tires
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-green-700 uppercase tracking-wider bg-green-50 border-r border-gray-300">
                      C (Grade C)
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-yellow-700 uppercase tracking-wider bg-yellow-50">
                      D (Grade D)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tyreData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">
                        {item.tyreType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900 font-semibold border-r border-gray-200">
                        {item.totalTyres.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center bg-green-50 border-r border-gray-200">
                        <span className="text-green-700 font-semibold">{item.gradeC.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center bg-yellow-50">
                        <span className="text-yellow-700 font-semibold">{item.gradeD.toLocaleString()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-blue-50 border-t-2 border-blue-300">
                  <tr>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 border-r border-gray-300">TOTAL</td>
                    <td className="px-6 py-4 text-sm text-center font-bold text-gray-900 border-r border-gray-300">
                      {totalTyres.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-center font-bold text-green-700 bg-green-100 border-r border-gray-300">
                      {totalGradeC.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-center font-bold text-yellow-700 bg-yellow-100">
                      {totalGradeD.toLocaleString()}
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
          <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Selected</h3>
          <p className="text-gray-600">Please select a defect type and date range, then click "Search" to view the defect wise report.</p>
        </div>
      )}
    </div>
  );
}
export default DefectWise;
