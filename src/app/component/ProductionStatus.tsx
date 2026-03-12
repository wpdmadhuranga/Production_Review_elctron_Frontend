import { Circle } from "lucide-react";

interface ProductionLine {
  id: string;
  name: string;
  status: 'running' | 'idle' | 'maintenance' | 'error';
  currentProduction: number;
  target: number;
  efficiency: number;
}

interface ProductionStatusProps {
  lines: ProductionLine[];
}

export function ProductionStatus({ lines }: ProductionStatusProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-green-600';
      case 'idle': return 'text-gray-400';
      case 'maintenance': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Production Lines Status</h3>
      <div className="space-y-4">
        {lines.map((line) => (
          <div key={line.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Circle className={`fill-current ${getStatusColor(line.status)}`} size={12} />
                <span className="font-medium text-gray-900">{line.name}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  line.status === 'running' ? 'bg-green-100 text-green-700' :
                  line.status === 'error' ? 'bg-red-100 text-red-700' :
                  line.status === 'maintenance' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {getStatusLabel(line.status)}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-900">{line.efficiency}%</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Progress</span>
                <span className="text-gray-900">{line.currentProduction} / {line.target} units</span>
              </div>
              <div className="bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    line.efficiency >= 90 ? 'bg-green-600' :
                    line.efficiency >= 70 ? 'bg-blue-600' :
                    line.efficiency >= 50 ? 'bg-yellow-600' :
                    'bg-red-600'
                  }`}
                  style={{ width: `${(line.currentProduction / line.target) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
