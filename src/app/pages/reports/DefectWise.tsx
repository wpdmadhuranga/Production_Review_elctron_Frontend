import { AlertCircle, Calendar, ChevronDown, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useMeta } from "../../context/MetaContext";
import { getProductionReportFilter } from "../../services/productionService";
import { normalizeDefectKey } from "../../utils/reportUtils";

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

  // get metadata from context (loaded from localStorage)
  const { tyreItems, defects } = useMeta();

  // Defect types come from meta (localStorage)
  // `defects` is provided by `useMeta` and has shape [{id, name}, ...]
  const defectTypes = (defects || []).map((d: any) => ({ code: d.name, name: d.name }));

  // Filter defect types based on search
  const filteredDefectTypes = useMemo(() => {
    return defectTypes.filter(defect => 
      defect.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      defect.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  // Mock data for tire types by defect — kept as fallback/test data
  const getTyreDataByDefect = (defectType: string): TyreTypeData[] => {
    return [
      { tyreType: '195/65R15', totalTyres: 1250, gradeC: 1050, gradeD: 200 },
      { tyreType: '205/55R16', totalTyres: 980, gradeC: 820, gradeD: 160 },
      { tyreType: '225/45R17', totalTyres: 1420, gradeC: 980, gradeD: 440 },
    ];
  };

  const [tyreData, setTyreData] = useState<TyreTypeData[]>([]);
  // tyre metadata available from earlier `useMeta` call above

  const handleSearch = () => {
    if (!selectedDefect) {
      alert('Please select a defect type');
      return;
    }
    (async () => {
      try {
        setShowResults(true);
        const isoFrom = `${dateFrom}T00:00:00Z`;
        const isoTo = `${dateTo}T23:59:59Z`;
        const resp = await getProductionReportFilter({ dateFrom: isoFrom, dateTo: isoTo, defect: selectedDefect });
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

        const targetKey = normalizeDefectKey(selectedDefect || '');

        // aggregate by tyreTypeId
        const map: Record<string, { total: number; gradeC: number; gradeD: number }> = {};
        for (const it of items) {
          const raw = (it.defect || '').toString();
          const key = normalizeDefectKey(raw);
          if (!key) continue;
          if (targetKey && key !== targetKey) continue;
          const tid = it.tyreTypeId ?? 'unknown';
          const entry = map[tid] || { total: 0, gradeC: 0, gradeD: 0 };
          entry.total += 1;
          const cd = (it.cOrD || '').toUpperCase();
          if (cd === 'C') entry.gradeC += 1;
          if (cd === 'D') entry.gradeD += 1;
          map[tid] = entry;
        }

        // build tyreData aligned to tyreItems metadata
        const result: TyreTypeData[] = (tyreItems || []).map((meta: any) => {
          const key = meta.id != null ? String(meta.id) : String(meta.name);
          const found = map[key] || { total: 0, gradeC: 0, gradeD: 0 };
          return { tyreType: meta.name, totalTyres: found.total, gradeC: found.gradeC, gradeD: found.gradeD } as TyreTypeData;
        });

        setTyreData(result);
        console.log('Searching for defect type:', selectedDefect, 'from:', dateFrom, 'to:', dateTo, 'items:', items.length);
      } catch (err: any) {
        console.error('Failed fetching defect-wise report', err);
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

  const handleDefectSelect = (defect: { code: string; name: string }) => {
    // store selected defect name (from meta)
    setSelectedDefect(defect.name);
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
                                  selectedDefect === defect.name
                                    ? 'bg-blue-100 text-blue-700 font-medium'
                                    : 'text-gray-700'
                                }`}
                        >
                          {defect.code === defect.name ? (
                            <span className="font-medium">{defect.name}</span>
                          ) : (
                            <>
                              <span className="font-medium">{defect.code}</span>
                              <span className="text-gray-600 ml-2">({defect.name})</span>
                            </>
                          )}
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
                  {(tyreItems || []).map((meta, index) => {
                    // try to find counts for this meta entry from tyreData
                    const found = tyreData.find(td => String(td.tyreType) === String(meta.name) || String(td.tyreType) === String(meta.id));
                    const total = found ? found.totalTyres : 0;
                    const gc = found ? found.gradeC : 0;
                    const gd = found ? found.gradeD : 0;
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">
                          {meta.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900 font-semibold border-r border-gray-200">
                          {total.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center bg-green-50 border-r border-gray-200">
                          <span className="text-green-700 font-semibold">{gc.toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center bg-yellow-50">
                          <span className="text-yellow-700 font-semibold">{gd.toLocaleString()}</span>
                        </td>
                      </tr>
                    );
                  })}
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
