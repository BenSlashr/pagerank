import React from 'react';
import { Card, Typography, Row, Col } from 'antd';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { BarChartOutlined, PieChartOutlined, LineChartOutlined } from '@ant-design/icons';
import type { Page, ProjectAnalysis } from '../../types';

const { Title, Text } = Typography;

interface PageRankCurrentDistributionProps {
  pages?: Page[];
  analysis?: ProjectAnalysis;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export const PageRankCurrentDistribution: React.FC<PageRankCurrentDistributionProps> = ({ 
  pages,
  analysis
}) => {
  // Préparer la distribution par tranches de PageRank
  const distributionData = React.useMemo(() => {
    if (!pages || !analysis) return [];

    const ranges = [
      { min: 0, max: 0.001, label: '< 0.001' },
      { min: 0.001, max: 0.01, label: '0.001-0.01' },
      { min: 0.01, max: 0.05, label: '0.01-0.05' },
      { min: 0.05, max: 0.1, label: '0.05-0.1' },
      { min: 0.1, max: 0.5, label: '0.1-0.5' },
      { min: 0.5, max: 1, label: '> 0.5' },
    ];

    return ranges.map(range => {
      const count = pages.filter(page => 
        page.current_pagerank >= range.min && 
        (range.max === 1 ? page.current_pagerank >= range.min : page.current_pagerank < range.max)
      ).length;
      
      return {
        range: range.label,
        count,
        percentage: Math.round((count / pages.length) * 100)
      };
    });
  }, [pages, analysis]);

  // Préparer les données pour la distribution par type
  const typeDistributionData = React.useMemo(() => {
    if (!analysis?.type_distribution) return [];
    
    return Object.entries(analysis.type_distribution).map(([type, stats]) => ({
      type,
      count: stats.count,
      averagePagerank: stats.average_pagerank,
      totalPagerank: stats.total_pagerank
    }));
  }, [analysis]);

  // Top pages pour le graphique linéaire
  const topPagesData = React.useMemo(() => {
    if (!analysis?.top_pages) return [];
    
    return analysis.top_pages.slice(0, 20).map((page, index) => ({
      rank: index + 1,
      pagerank: page.pagerank,
      url: page.url.length > 30 ? `${page.url.substring(0, 30)}...` : page.url
    }));
  }, [analysis]);

  const formatTooltip = (value: any, name: string) => {
    if (name === 'count') return [`${value} pages`, 'Nombre de pages'];
    if (name === 'pagerank') return [`${value.toFixed(6)}`, 'PageRank'];
    return [value, name];
  };

  return (
    <Row gutter={[16, 16]}>
      {/* Distribution par tranches */}
      <Col xs={24} lg={12}>
        <Card 
          title={
            <div>
              <BarChartOutlined /> Distribution par tranches de PageRank
            </div>
          }
          size="small"
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={distributionData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="range" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={11}
              />
              <YAxis />
              <Tooltip formatter={formatTooltip} />
              <Bar dataKey="count" fill="#1890ff" name="count">
                {distributionData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={
                      entry.range.includes('< 0.001') ? '#ff4d4f' :
                      entry.range.includes('0.001-0.01') ? '#fa8c16' :
                      entry.range.includes('0.01-0.05') ? '#fadb14' :
                      entry.range.includes('0.05-0.1') ? '#52c41a' :
                      entry.range.includes('0.1-0.5') ? '#1890ff' : '#722ed1'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Col>

      {/* Distribution par type (Pie Chart) */}
      <Col xs={24} lg={12}>
        <Card 
          title={
            <div>
              <PieChartOutlined /> Répartition PageRank par type
            </div>
          }
          size="small"
        >
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={typeDistributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ type, percentage }) => `${type}: ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="totalPagerank"
              >
                {typeDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: any, name: string, props: any) => [
                  `${(value as number).toFixed(6)}`,
                  `PageRank total (${props.payload.count} pages)`
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </Col>

      {/* Top 20 pages */}
      <Col xs={24}>
        <Card 
          title={
            <div>
              <LineChartOutlined /> Courbe des 20 pages avec le plus fort PageRank
            </div>
          }
          size="small"
        >
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={topPagesData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="rank" 
                label={{ value: 'Classement', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                tickFormatter={(value) => value.toFixed(4)}
                label={{ value: 'PageRank', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value: any, name: string, props: any) => [
                  `${value.toFixed(6)}`,
                  `PageRank (#${props.payload.rank})`
                ]}
                labelFormatter={(rank) => `Page #${rank}: ${topPagesData[rank as number - 1]?.url || ''}`}
              />
              <Area
                type="monotone"
                dataKey="pagerank"
                stroke="#1890ff"
                fill="#1890ff"
                fillOpacity={0.3}
                strokeWidth={2}
                name="pagerank"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </Col>

      {/* Statistiques détaillées */}
      <Col xs={24}>
        <Card title="📊 Analyse statistique détaillée" size="small">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Text strong>Distribution des performances:</Text>
              <div style={{ marginTop: 8 }}>
                {distributionData.map((item, index) => (
                  <div key={item.range} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    marginBottom: 4,
                    fontSize: '12px'
                  }}>
                    <span>{item.range}:</span>
                    <span>{item.count} pages ({item.percentage}%)</span>
                  </div>
                ))}
              </div>
            </Col>
            
            <Col xs={24} sm={8}>
              <Text strong>PageRank moyen par type:</Text>
              <div style={{ marginTop: 8 }}>
                {typeDistributionData.map((item, index) => (
                  <div key={item.type} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    marginBottom: 4,
                    fontSize: '12px'
                  }}>
                    <span>{item.type}:</span>
                    <span>{item.averagePagerank.toFixed(6)}</span>
                  </div>
                ))}
              </div>
            </Col>
            
            <Col xs={24} sm={8}>
              <Text strong>Métriques clés:</Text>
              <div style={{ marginTop: 8, fontSize: '12px' }}>
                <div>Pages totales: <strong>{pages?.length || 0}</strong></div>
                <div>PageRank total: <strong>{analysis?.total_pagerank.toFixed(6) || '0'}</strong></div>
                <div>PageRank moyen: <strong>{analysis?.average_pagerank.toFixed(6) || '0'}</strong></div>
                <div>PageRank maximum: <strong>{analysis?.max_pagerank.toFixed(6) || '0'}</strong></div>
                <div>PageRank minimum: <strong>{analysis?.min_pagerank.toFixed(6) || '0'}</strong></div>
              </div>
            </Col>
          </Row>
        </Card>
      </Col>
    </Row>
  );
};