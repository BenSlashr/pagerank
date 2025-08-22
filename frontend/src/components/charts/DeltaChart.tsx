import React from 'react';
import { Card } from 'antd';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

interface DeltaChartProps {
  data: Array<{
    current_pagerank: number;
    pagerank_delta: number;
    url?: string;
    type?: string;
  }>;
  title?: string;
}

export const DeltaChart: React.FC<DeltaChartProps> = ({ 
  data, 
  title = "PageRank Changes" 
}) => {
  const formatTooltip = (value: any, name: string, props: any) => {
    const { payload } = props;
    if (name === 'pagerank_delta') {
      return [
        `Delta: ${value.toFixed(6)}`,
        `Current PR: ${payload.current_pagerank.toFixed(6)}`,
        payload.url ? `URL: ${payload.url.substring(0, 50)}...` : ''
      ];
    }
    return null;
  };

  return (
    <Card title={title}>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart
          data={data}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            type="number" 
            dataKey="current_pagerank" 
            name="Current PageRank"
            tickFormatter={(value) => value.toFixed(4)}
          />
          <YAxis 
            type="number" 
            dataKey="pagerank_delta" 
            name="PageRank Change"
            tickFormatter={(value) => value.toFixed(4)}
          />
          <Tooltip 
            formatter={formatTooltip}
            labelFormatter={() => ''}
          />
          <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
          <Scatter 
            dataKey="pagerank_delta" 
            fill="#8884d8"
            fillOpacity={0.6}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </Card>
  );
};