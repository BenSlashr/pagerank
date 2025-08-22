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
  Legend
} from 'recharts';


interface PageRankDistributionProps {
  data: Array<{
    range: string;
    current: number;
    new?: number;
  }>;
  title?: string;
}

export const PageRankDistribution: React.FC<PageRankDistributionProps> = ({ 
  data, 
  title = "PageRank Distribution" 
}) => {
  const formatTooltip = (value: any, name: string) => {
    return [`${value} pages`, name === 'current' ? 'Current' : 'After Simulation'];
  };

  return (
    <Card title={title}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="range" 
            angle={-45}
            textAnchor="end"
            height={60}
            fontSize={12}
          />
          <YAxis />
          <Tooltip formatter={formatTooltip} />
          <Legend />
          <Bar 
            dataKey="current" 
            fill="#8884d8" 
            name="Current"
          />
          {data.some(d => d.new !== undefined) && (
            <Bar 
              dataKey="new" 
              fill="#82ca9d" 
              name="After Simulation"
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};