import { Area, AreaChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface ProductionData {
  date: string;
  produced: number;
  target: number;
  defective: number;
}

interface ProductionChartProps {
  data: ProductionData[];
}

export function ProductionChart({ data }: ProductionChartProps) {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Production Overview</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorProduced" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="date" 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}
          />
          <Legend wrapperStyle={{ fontSize: '14px' }} />
          <Area 
            type="monotone" 
            dataKey="produced" 
            stroke="#3b82f6" 
            fillOpacity={1} 
            fill="url(#colorProduced)"
            name="Produced"
            strokeWidth={2}
          />
          <Area 
            type="monotone" 
            dataKey="target" 
            stroke="#10b981" 
            fillOpacity={1} 
            fill="url(#colorTarget)"
            name="Target"
            strokeWidth={2}
          />
          <Line 
            type="monotone" 
            dataKey="defective" 
            stroke="#ef4444" 
            name="Defective"
            strokeWidth={2}
            dot={{ fill: '#ef4444', r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
