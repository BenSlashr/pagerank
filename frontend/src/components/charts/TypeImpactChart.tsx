import React from 'react';
import { Card } from 'antd';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

interface TypeImpactChartProps {
  data: Array<{
    type: string;
    average_delta: number;
    positive_count: number;
    negative_count: number;
    count: number;
  }>;
  title?: string;
}


export const TypeImpactChart: React.FC<TypeImpactChartProps> = ({ 
  data, 
  title = "Impact by Page Type" 
}) => {
  const formatTooltip = (value: any, _name: string, props: any) => {
    const { payload } = props;
    return [
      `Avg Delta: ${value.toFixed(6)}`,
      `Improved: ${payload.positive_count}`,
      `Degraded: ${payload.negative_count}`,
      `Total: ${payload.count}`
    ];
  };

  return (
    <Card title={title}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="type" />
          <YAxis tickFormatter={(value) => value.toFixed(6)} />
          <Tooltip 
            formatter={formatTooltip}
            labelStyle={{ color: '#666' }}
          />
          <Bar dataKey="average_delta" name="Average Delta">
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.average_delta >= 0 ? '#00C49F' : '#FF8042'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};