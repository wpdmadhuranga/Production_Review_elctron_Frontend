import { AlertCircle, Calendar, CheckCircle2, ChevronDown, Package, Search, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { useMeta } from "../../context/MetaContext";
import { getProductionReportFilter } from "../../services/productionService";
import { normalizeDefectKey } from "../../utils/reportUtils";

interface DefectData {
  defectName: string;
  totalTyres: number;
  gradeC: number;
  gradeD: number;
  percentage: number;
}

export function ItemWise() {
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState('today');
  const [selectedTyreType, setSelectedTyreType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Tyre types and defects come from meta (which loads from localStorage)
  const { tyreItems, defects } = useMeta();
  const tyreTypes = tyreItems.map((t) => t.name);

  // Filter tire types based on search
  const filteredTyreTypes = useMemo(() => {
    return tyreTypes.filter((type) =>
      String(type).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  // Mock data for defects by tire type
  const getDefectDataByTyreType = (tyreType: string): DefectData[] => {
    // placeholder — actual data built from API in handleSearch
    return [];
  };

  const [defectData, setDefectData] = useState<DefectData[]>([]);

  const handleSearch = () => {
    if (!selectedTyreType) {
      alert('Please select a tire type');
      return;
    }
    (async () => {
      try {
        setShowResults(true);
        const tyreMeta = tyreItems.find((t) => t.name === selectedTyreType);
        const tyreId = tyreMeta?.id;
        const isoFrom = `${dateFrom}T00:00:00Z`;
        const isoTo = `${dateTo}T23:59:59Z`;
        const resp = await getProductionReportFilter({ dateFrom: isoFrom, dateTo: isoTo });
        const batches = Array.isArray(resp) ? resp : resp?.items ?? [];

        // collect all tyre items from batches and records
        const items: any[] = [];
        for (const b of batches) {
          if (Array.isArray(b.tyreItems)) items.push(...b.tyreItems);
          if (Array.isArray((b as any).records)) {
            for (const r of (b as any).records) {
              if (Array.isArray(r.tyreItems)) items.push(...r.tyreItems);
            }
          }
        }

        // filter by selected tyre id (if available), otherwise attempt match by tyreTypeName
        const filtered = items.filter((it) => {
          if (tyreId != null) return String(it.tyreTypeId) === String(tyreId);
          // fallback: match by name in case server returns tyreTypeName
          return String(it.tyreTypeName || it.tyreItem || '').toLowerCase().includes(selectedTyreType.toLowerCase());
        });

        const totalTyresForType = filtered.length;

        const defectMap: Record<string, { name: string; total: number; gradeC: number; gradeD: number }> = {};
        const metaDefects = (defects || []).map((d) => ({ key: normalizeDefectKey(d.name), label: d.name }));

        for (const it of filtered) {
          const raw = (it.defect || '').toString();
          const key = normalizeDefectKey(raw);
          if (!key) continue;
          if (!defectMap[key]) {
            // try to find label from meta
            const m = metaDefects.find((md) => md.key === key);
            defectMap[key] = { name: m ? m.label : raw || key, total: 0, gradeC: 0, gradeD: 0 };
          }
          defectMap[key].total += 1;
          const cd = (it.cOrD || '').toUpperCase();
          if (cd === 'C') defectMap[key].gradeC += 1;
          if (cd === 'D') defectMap[key].gradeD += 1;
        }

        // build array preserving order from meta.defects, then append any unknown defects
        const orderedKeys = (defects || []).map((d) => normalizeDefectKey(d.name));
        const result: DefectData[] = [];
        for (const k of orderedKeys) {
          const v = defectMap[k];
          result.push({
            defectName: v?.name ?? (k || ''),
            totalTyres: v?.total ?? 0,
            gradeC: v?.gradeC ?? 0,
            gradeD: v?.gradeD ?? 0,
            percentage: totalTyresForType > 0 ? ((v?.total ?? 0) / totalTyresForType) * 100 : 0,
          });
        }
        // append defects not in meta
        for (const k of Object.keys(defectMap)) {
          if (orderedKeys.includes(k)) continue;
          const v = defectMap[k];
          result.push({ defectName: v.name, totalTyres: v.total, gradeC: v.gradeC, gradeD: v.gradeD, percentage: totalTyresForType > 0 ? (v.total / totalTyresForType) * 100 : 0 });
        }

        setDefectData(result);
        console.log('Searching for tire type:', selectedTyreType, 'from:', dateFrom, 'to:', dateTo, 'found', totalTyresForType);
      } catch (err: any) {
        console.error('Failed fetching production filter for itemwise', err);
        alert(err?.message ?? String(err));
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

  const handleTyreTypeSelect = (type: string) => {
    setSelectedTyreType(type);
    setIsDropdownOpen(false);
    setSearchTerm('');
  };

  // Calculate summary statistics
  const totalTyres = defectData.length > 0 ? defectData[0].totalTyres : 0;
  const totalGradeC = defectData.length > 0 ? defectData[0].gradeC : 0;
  const totalGradeD = defectData.length > 0 ? defectData[0].gradeD : 0;
  const totalDefectPercentage = defectData.reduce((sum, item) => sum + item.percentage, 0);
  const qualityRate = (100 - totalDefectPercentage).toFixed(2);
  const defectRate = totalDefectPercentage.toFixed(2);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Item Wise Report</h1>
        <p className="text-gray-600 mt-2">Production reports categorized by tire item type</p>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar size={20} />
          Filter Options
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Tire Type Selector with Search */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Tire Type</label>
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-left flex items-center justify-between"
              >
                <span className={selectedTyreType ? 'text-gray-900' : 'text-gray-400'}>
                  {selectedTyreType || 'Select Tire Type'}
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
                        placeholder="Search tire type..."
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>

                  {/* Dropdown List */}
                  <div className="max-h-60 overflow-y-auto">
                    {filteredTyreTypes.length > 0 ? (
                      filteredTyreTypes.map((type, index) => (
                        <button
                          key={index}
                          onClick={() => handleTyreTypeSelect(type)}
                          className={`w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors ${
                            selectedTyreType === type ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700'
                          }`}
                        >
                          {type}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">
                        No tire types found
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
                <span className="text-sm font-medium text-gray-700">Total Production</span>
                <Package size={20} className="text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{totalTyres.toLocaleString()}</p>
              <p className="text-xs text-gray-600 mt-1">Tires of {selectedTyreType}</p>
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
                <span className="text-sm font-medium text-gray-700">Total Defect Rate</span>
                <AlertCircle size={20} className="text-red-600" />
              </div>
              <p className="text-3xl font-bold text-red-600">{defectRate}%</p>
              <p className="text-xs text-gray-600 mt-1">All defects combined</p>
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
                Defect Analysis for {selectedTyreType}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Showing defect breakdown from {new Date(dateFrom).toLocaleDateString()} to {new Date(dateTo).toLocaleDateString()}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Defect Type
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Total Tires
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-green-700 uppercase tracking-wider bg-green-50 border-r border-gray-300">
                      C (Grade C)
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-yellow-700 uppercase tracking-wider bg-yellow-50 border-r border-gray-300">
                      D (Grade D)
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Defect %
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {defectData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">
                        {item.defectName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900 font-semibold border-r border-gray-200">
                        {item.totalTyres.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center bg-green-50 border-r border-gray-200">
                        <span className="text-green-700 font-semibold">{item.gradeC.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center bg-yellow-50 border-r border-gray-200">
                        <span className="text-yellow-700 font-semibold">{item.gradeD.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <span className={`font-semibold ${
                          item.percentage < 2 ? 'text-green-600' :
                          item.percentage < 4 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {item.percentage.toFixed(1)}%
                        </span>
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
                    <td className="px-6 py-4 text-sm text-center font-bold text-yellow-700 bg-yellow-100 border-r border-gray-300">
                      {totalGradeD.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-center font-bold text-red-600">
                      {defectRate}%
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
          <Package size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Selected</h3>
          <p className="text-gray-600">Please select a tire type and date range, then click "Search" to view the item wise report.</p>
        </div>
      )}
    </div>
  );
}
export default ItemWise;