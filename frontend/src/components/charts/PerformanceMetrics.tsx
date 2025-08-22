import React from 'react';
import { Card, Row, Col, Statistic, Progress, Tag, Tooltip } from 'antd';
import { 
  TrophyOutlined, 
  FireOutlined, 
  WarningOutlined, 
  ThunderboltOutlined,
  BarChartOutlined,
  FallOutlined 
} from '@ant-design/icons';
import type { Page, ProjectAnalysis } from '../../types';

interface PerformanceMetricsProps {
  pages?: Page[];
  analysis?: ProjectAnalysis;
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ 
  pages, 
  analysis 
}) => {
  const metrics = React.useMemo(() => {
    if (!pages || !analysis) return null;

    const avgPR = analysis.average_pagerank;
    
    // Calculs des métriques de performance
    const highPerformers = pages.filter(p => p.current_pagerank > avgPR * 3);
    const goodPerformers = pages.filter(p => p.current_pagerank > avgPR * 2 && p.current_pagerank <= avgPR * 3);
    const averagePerformers = pages.filter(p => p.current_pagerank > avgPR * 0.5 && p.current_pagerank <= avgPR * 2);
    const lowPerformers = pages.filter(p => p.current_pagerank <= avgPR * 0.5);
    
    // Pages avec zéro ou très faible PageRank (problématiques)
    const zeroPages = pages.filter(p => p.current_pagerank < 0.000001);
    const criticalPages = pages.filter(p => p.current_pagerank < avgPR * 0.1);
    
    // Distribution de la qualité
    const qualityScore = Math.round(((highPerformers.length + goodPerformers.length) / pages.length) * 100);
    
    // Concentration du PageRank (top 10%)
    const sortedPages = [...pages].sort((a, b) => b.current_pagerank - a.current_pagerank);
    const top10Percent = Math.ceil(pages.length * 0.1);
    const top10PageRank = sortedPages.slice(0, top10Percent).reduce((sum, p) => sum + p.current_pagerank, 0);
    const concentration = Math.round((top10PageRank / analysis.total_pagerank) * 100);
    
    return {
      highPerformers: highPerformers.length,
      goodPerformers: goodPerformers.length,
      averagePerformers: averagePerformers.length,
      lowPerformers: lowPerformers.length,
      zeroPages: zeroPages.length,
      criticalPages: criticalPages.length,
      qualityScore,
      concentration,
      // Ratios
      highPerformersPct: Math.round((highPerformers.length / pages.length) * 100),
      lowPerformersPct: Math.round((lowPerformers.length / pages.length) * 100),
      criticalPct: Math.round((criticalPages.length / pages.length) * 100)
    };
  }, [pages, analysis]);

  if (!metrics || !analysis) return null;

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      {/* Score de qualité global */}
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="Score de Qualité"
            value={metrics.qualityScore}
            suffix="%"
            prefix={
              metrics.qualityScore > 20 ? <TrophyOutlined style={{ color: '#52c41a' }} /> :
              metrics.qualityScore > 10 ? <ThunderboltOutlined style={{ color: '#fa8c16' }} /> :
              <WarningOutlined style={{ color: '#ff4d4f' }} />
            }
            valueStyle={{ 
              color: metrics.qualityScore > 20 ? '#52c41a' : 
                     metrics.qualityScore > 10 ? '#fa8c16' : '#ff4d4f' 
            }}
          />
          <Progress 
            percent={metrics.qualityScore} 
            strokeColor={
              metrics.qualityScore > 20 ? '#52c41a' : 
              metrics.qualityScore > 10 ? '#fa8c16' : '#ff4d4f'
            }
            showInfo={false} 
            size="small" 
          />
          <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
            Pages performantes (2x+ moyenne)
          </div>
        </Card>
      </Col>

      {/* Concentration PageRank */}
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="Concentration Top 10%"
            value={metrics.concentration}
            suffix="%"
            prefix={<BarChartOutlined />}
            valueStyle={{ 
              color: metrics.concentration > 50 ? '#ff4d4f' : 
                     metrics.concentration > 30 ? '#fa8c16' : '#52c41a' 
            }}
          />
          <Progress 
            percent={metrics.concentration} 
            strokeColor={
              metrics.concentration > 50 ? '#ff4d4f' : 
              metrics.concentration > 30 ? '#fa8c16' : '#52c41a'
            }
            showInfo={false} 
            size="small" 
          />
          <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
            PageRank détenu par le top 10%
          </div>
        </Card>
      </Col>

      {/* Pages problématiques */}
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="Pages Critiques"
            value={metrics.criticalPages}
            suffix={`/ ${pages?.length || 0}`}
            prefix={<WarningOutlined />}
            valueStyle={{ 
              color: metrics.criticalPct > 20 ? '#ff4d4f' : 
                     metrics.criticalPct > 10 ? '#fa8c16' : '#52c41a' 
            }}
          />
          <Progress 
            percent={metrics.criticalPct} 
            strokeColor="#ff4d4f"
            showInfo={false} 
            size="small" 
          />
          <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
            PageRank {'< 10% de la moyenne'}
          </div>
        </Card>
      </Col>

      {/* Pages sans PageRank */}
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="Pages Orphelines"
            value={metrics.zeroPages}
            suffix={`/ ${pages?.length || 0}`}
            prefix={<FallOutlined />}
            valueStyle={{ 
              color: metrics.zeroPages > 0 ? '#ff4d4f' : '#52c41a' 
            }}
          />
          <Progress 
            percent={Math.round((metrics.zeroPages / (pages?.length || 1)) * 100)} 
            strokeColor="#ff4d4f"
            showInfo={false} 
            size="small" 
          />
          <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
            PageRank quasi-nul (≈ 0)
          </div>
        </Card>
      </Col>

      {/* Détail de la répartition */}
      <Col xs={24}>
        <Card title="🎯 Répartition des performances" size="small">
          <Row gutter={[8, 8]}>
            <Col>
              <Tooltip title={`${metrics.highPerformers} pages avec PageRank > 3x moyenne`}>
                <Tag color="red" icon={<FireOutlined />}>
                  🔥 TOP: {metrics.highPerformers} ({metrics.highPerformersPct}%)
                </Tag>
              </Tooltip>
            </Col>
            <Col>
              <Tooltip title={`${metrics.goodPerformers} pages avec PageRank 2-3x moyenne`}>
                <Tag color="orange" icon={<TrophyOutlined />}>
                  ⭐ ÉLEVÉ: {metrics.goodPerformers} ({Math.round((metrics.goodPerformers / (pages?.length || 1)) * 100)}%)
                </Tag>
              </Tooltip>
            </Col>
            <Col>
              <Tooltip title={`${metrics.averagePerformers} pages avec PageRank 0.5-2x moyenne`}>
                <Tag color="blue" icon={<ThunderboltOutlined />}>
                  ⚡ BON: {metrics.averagePerformers} ({Math.round((metrics.averagePerformers / (pages?.length || 1)) * 100)}%)
                </Tag>
              </Tooltip>
            </Col>
            <Col>
              <Tooltip title={`${metrics.lowPerformers} pages avec PageRank < 50% moyenne`}>
                <Tag color="default" icon={<WarningOutlined />}>
                  ⚠️ FAIBLE: {metrics.lowPerformers} ({metrics.lowPerformersPct}%)
                </Tag>
              </Tooltip>
            </Col>
          </Row>
        </Card>
      </Col>
    </Row>
  );
};