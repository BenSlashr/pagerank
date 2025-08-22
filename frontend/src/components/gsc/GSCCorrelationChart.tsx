import React from 'react';
import { Card, Row, Col, Typography, Space, Tag, Tooltip } from 'antd';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { BarChartOutlined, LineChartOutlined, DotChartOutlined } from '@ant-design/icons';
import { useGSCData, type GSCData } from '../../hooks/useGSC';

const { Title, Text } = Typography;

interface GSCCorrelationChartProps {
  projectId: number;
  pages?: Array<{ id: number; url: string; current_pagerank: number; type: string }>;
}

interface CorrelationDataPoint {
  url: string;
  pagerank: number;
  impressions: number;
  clicks: number;
  position: number;
  ctr: number;
  traffic_score: number;
  type?: string;
  priority: 'high' | 'medium' | 'low' | 'balanced';
}

export const GSCCorrelationChart: React.FC<GSCCorrelationChartProps> = ({
  projectId,
  pages = []
}) => {
  // Fetch GSC data using the hook
  const { data: gscSummary } = useGSCData(projectId);
  const gscData = gscSummary?.data || [];
  // Prepare correlation data
  const correlationData: CorrelationDataPoint[] = React.useMemo(() => {
    const pageMap = new Map(pages.map(p => [p.url, p]));
    
    return gscData
      .filter(gsc => gsc.page_id) // Only pages with PageRank data
      .map(gsc => {
        const page = pageMap.get(gsc.url);
        const pagerank = page?.current_pagerank || 0;
        const traffic_score = gsc.impressions + (gsc.clicks * 10);
        
        // Determine priority based on PageRank vs Traffic
        let priority: 'high' | 'medium' | 'low' | 'balanced' = 'low';
        if (traffic_score > 1000 && pagerank < 0.001) {
          priority = 'high'; // High opportunity
        } else if (pagerank > 0.002 && traffic_score < 100) {
          priority = 'medium'; // Under-utilized 
        } else if (pagerank > 0.001 && traffic_score > 500) {
          priority = 'balanced'; // Well balanced
        }
        
        return {
          url: gsc.url,
          pagerank,
          impressions: gsc.impressions,
          clicks: gsc.clicks,
          position: gsc.position,
          ctr: gsc.ctr,
          traffic_score,
          type: page?.type || 'other',
          priority
        };
      })
      .sort((a, b) => b.traffic_score - a.traffic_score)
      .slice(0, 200); // Limit to top 200 for performance
  }, [gscData, pages]);

  const getColorByPriority = (priority: string) => {
    switch (priority) {
      case 'high': return '#fa8c16'; // Orange - High opportunity
      case 'medium': return '#52c41a'; // Green - Under-utilized
      case 'balanced': return '#1890ff'; // Blue - Well balanced
      default: return '#d9d9d9'; // Gray - Low priority
    }
  };

  const getColorByPosition = (position: number) => {
    if (position <= 3) return '#ff4d4f'; // Red - Top 3
    if (position <= 10) return '#fa8c16'; // Orange - Top 10
    if (position <= 20) return '#1890ff'; // Blue - Top 20
    return '#d9d9d9'; // Gray - Beyond 20
  };

  // Prepare traffic distribution data
  const trafficDistribution = React.useMemo(() => {
    const ranges = [
      { min: 10000, max: Infinity, label: '10k+', color: '#ff4d4f' },
      { min: 5000, max: 10000, label: '5k-10k', color: '#fa8c16' },
      { min: 1000, max: 5000, label: '1k-5k', color: '#fadb14' },
      { min: 500, max: 1000, label: '500-1k', color: '#52c41a' },
      { min: 100, max: 500, label: '100-500', color: '#1890ff' },
      { min: 0, max: 100, label: '0-100', color: '#d9d9d9' }
    ];

    return ranges.map(range => {
      const count = correlationData.filter(d => {
        if (range.max === Infinity) return d.impressions >= range.min;
        return d.impressions >= range.min && d.impressions < range.max;
      }).length;

      return { ...range, count };
    }).filter(item => item.count > 0);
  }, [correlationData]);

  const formatTooltip = (value: any, name: string, props: any) => {
    const data = props.payload;
    if (!data) return [value, name];

    return [
      <div key="tooltip" style={{ fontSize: '12px' }}>
        <div><strong>{data.url.length > 40 ? `${data.url.substring(0, 40)}...` : data.url}</strong></div>
        <div>PageRank: {data.pagerank.toFixed(6)}</div>
        <div>Impressions: {data.impressions.toLocaleString()}</div>
        <div>Clics: {data.clicks.toLocaleString()}</div>
        <div>Position: #{data.position.toFixed(1)}</div>
        <div>Score Trafic: {data.traffic_score.toLocaleString()}</div>
      </div>,
      ''
    ];
  };

  return (
    <Row gutter={[16, 16]}>
      {/* Scatter Plot: PageRank vs Impressions */}
      <Col xs={24} lg={12}>
        <Card 
          title={
            <Space>
              <DotChartOutlined />
              Corrélation PageRank × Impressions GSC
            </Space>
          }
          size="small"
        >
          <ResponsiveContainer width="100%" height={350}>
            <ScatterChart margin={{ top: 20, right: 20, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                dataKey="pagerank"
                name="PageRank"
                tickFormatter={(value) => value.toFixed(4)}
                label={{ value: 'PageRank', position: 'bottom' }}
              />
              <YAxis 
                type="number" 
                dataKey="impressions"
                name="Impressions"
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                label={{ value: 'Impressions GSC', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload || !payload[0]) return null;
                return formatTooltip(null, '', payload[0]);
              }} />
              <Scatter data={correlationData}>
                {correlationData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getColorByPriority(entry.priority)}
                    fillOpacity={0.7}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          
          {/* Legend */}
          <div style={{ marginTop: '12px', textAlign: 'center' }}>
            <Space wrap>
              <Tag color="orange">🚀 Opportunités (fort trafic, faible PR)</Tag>
              <Tag color="green">🏆 Sous-exploitées (fort PR, faible trafic)</Tag>
              <Tag color="blue">⚡ Équilibrées</Tag>
              <Tag color="default">📋 Autres</Tag>
            </Space>
          </div>
        </Card>
      </Col>

      {/* Position vs Clicks */}
      <Col xs={24} lg={12}>
        <Card 
          title={
            <Space>
              <BarChartOutlined />
              Position GSC × Clics
            </Space>
          }
          size="small"
        >
          <ResponsiveContainer width="100%" height={350}>
            <ScatterChart margin={{ top: 20, right: 20, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                dataKey="position"
                name="Position"
                domain={[0, 50]}
                tickFormatter={(value) => `#${value}`}
                label={{ value: 'Position Moyenne GSC', position: 'bottom' }}
              />
              <YAxis 
                type="number" 
                dataKey="clicks"
                name="Clics"
                tickFormatter={(value) => value.toLocaleString()}
                label={{ value: 'Clics GSC', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload || !payload[0]) return null;
                return formatTooltip(null, '', payload[0]);
              }} />
              <Scatter data={correlationData}>
                {correlationData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getColorByPosition(entry.position)}
                    fillOpacity={0.7}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          
          {/* Legend */}
          <div style={{ marginTop: '12px', textAlign: 'center' }}>
            <Space wrap>
              <Tag color="red">🥇 Top 3</Tag>
              <Tag color="orange">🏅 Top 10</Tag>
              <Tag color="blue">📈 Top 20</Tag>
              <Tag color="default">📋 +20</Tag>
            </Space>
          </div>
        </Card>
      </Col>

      {/* Traffic Distribution */}
      <Col xs={24} lg={12}>
        <Card 
          title={
            <Space>
              <BarChartOutlined />
              Distribution du Trafic GSC
            </Space>
          }
          size="small"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trafficDistribution} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="label"
                label={{ value: 'Tranches d\'impressions', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                label={{ value: 'Nombre de pages', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value: any, name: string) => [`${value} pages`, 'Nombre de pages']}
                labelFormatter={(label) => `Tranche: ${label} impressions`}
              />
              <Bar dataKey="count" name="Pages">
                {trafficDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Col>

      {/* Top Pages Performance Trend */}
      <Col xs={24} lg={12}>
        <Card 
          title={
            <Space>
              <LineChartOutlined />
              Top 20 Pages - Score de Performance
            </Space>
          }
          size="small"
        >
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart 
              data={correlationData.slice(0, 20).map((item, index) => ({ 
                ...item, 
                rank: index + 1,
                performance_score: (item.clicks * 100) / Math.max(item.position, 1) // Higher is better
              }))}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="rank"
                label={{ value: 'Classement', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                tickFormatter={(value) => value.toFixed(0)}
                label={{ value: 'Score Performance', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value: any, _name: string, _props: any) => [
                  `${value.toFixed(2)}`,
                  'Score Performance'
                ]}
                labelFormatter={(rank: any) => {
                  const item = correlationData[rank - 1];
                  return item ? `#${rank}: ${item.url.substring(0, 30)}...` : `Page #${rank}`;
                }}
              />
              <Area
                type="monotone"
                dataKey="performance_score"
                stroke="#1890ff"
                fill="#1890ff"
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </Col>
    </Row>
  );
};