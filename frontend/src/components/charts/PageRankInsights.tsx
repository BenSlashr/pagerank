import React from 'react';
import { Card, Alert, List, Tag, Space, Button, Typography, Row, Col } from 'antd';
import { 
  BulbOutlined, 
  ExclamationCircleOutlined, 
  CheckCircleOutlined, 
  WarningOutlined,
  RocketOutlined,
  LinkOutlined,
  FireOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import type { Page, ProjectAnalysis } from '../../types';

const { Text, Title } = Typography;

interface PageRankInsightsProps {
  pages?: Page[];
  analysis?: ProjectAnalysis;
  onStartSimulation?: () => void;
}

interface Insight {
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  description: string;
  action?: {
    text: string;
    onClick: () => void;
  };
  priority: number;
}

export const PageRankInsights: React.FC<PageRankInsightsProps> = ({ 
  pages, 
  analysis, 
  onStartSimulation 
}) => {
  const insights = React.useMemo((): Insight[] => {
    if (!pages || !analysis) return [];

    const insights: Insight[] = [];
    const avgPR = analysis.average_pagerank;
    
    // Analyse des pages orphelines
    const zeroPages = pages.filter(p => p.current_pagerank < 0.000001);
    if (zeroPages.length > 0) {
      insights.push({
        type: 'error',
        title: `🚨 ${zeroPages.length} pages orphelines détectées`,
        description: `Ces pages n'ont quasiment aucun PageRank. Elles sont probablement mal intégrées dans votre maillage interne.`,
        action: onStartSimulation ? {
          text: 'Créer simulation de maillage',
          onClick: onStartSimulation
        } : undefined,
        priority: 1
      });
    }

    // Analyse de la concentration
    const sortedPages = [...pages].sort((a, b) => b.current_pagerank - a.current_pagerank);
    const top10Percent = Math.ceil(pages.length * 0.1);
    const top10PageRank = sortedPages.slice(0, top10Percent).reduce((sum, p) => sum + p.current_pagerank, 0);
    const concentration = (top10PageRank / analysis.total_pagerank) * 100;

    if (concentration > 60) {
      insights.push({
        type: 'warning',
        title: `⚠️ PageRank très concentré (${concentration.toFixed(1)}%)`,
        description: `Le top 10% de vos pages détient ${concentration.toFixed(1)}% du PageRank total. Une meilleure répartition améliorerait l'ensemble du site.`,
        action: onStartSimulation ? {
          text: 'Simuler redistribution',
          onClick: onStartSimulation
        } : undefined,
        priority: 2
      });
    } else if (concentration < 30) {
      insights.push({
        type: 'success',
        title: `✅ PageRank bien réparti (${concentration.toFixed(1)}%)`,
        description: `Excellente distribution ! Votre PageRank n'est pas trop concentré sur quelques pages.`,
        priority: 5
      });
    }

    // Analyse des pages performantes
    const highPerformers = pages.filter(p => p.current_pagerank > avgPR * 3);
    const lowPerformers = pages.filter(p => p.current_pagerank < avgPR * 0.5);
    
    if (lowPerformers.length > pages.length * 0.3) {
      insights.push({
        type: 'warning',
        title: `📉 ${lowPerformers.length} pages sous-performantes`,
        description: `${((lowPerformers.length / pages.length) * 100).toFixed(1)}% de vos pages ont un PageRank très faible. Optimisez votre maillage interne !`,
        action: onStartSimulation ? {
          text: 'Booster ces pages',
          onClick: onStartSimulation
        } : undefined,
        priority: 3
      });
    }

    if (highPerformers.length > 0) {
      insights.push({
        type: 'info',
        title: `🌟 ${highPerformers.length} pages très performantes`,
        description: `Ces pages ont un excellent PageRank. Utilisez-les comme sources de liens vers d'autres pages importantes.`,
        action: onStartSimulation ? {
          text: 'Optimiser le maillage depuis ces pages',
          onClick: onStartSimulation
        } : undefined,
        priority: 4
      });
    }

    // Analyse par type
    const typeDistribution = analysis.type_distribution;
    const typeAnalysis = Object.entries(typeDistribution).map(([type, stats]) => ({
      type,
      avgPR: stats.average_pagerank,
      count: stats.count,
      totalPR: stats.total_pagerank,
      relativePerformance: stats.average_pagerank / avgPR
    }));

    // Type le plus performant
    const bestType = typeAnalysis.reduce((best, current) => 
      current.avgPR > best.avgPR ? current : best
    );

    // Type le moins performant
    const worstType = typeAnalysis.reduce((worst, current) => 
      current.avgPR < worst.avgPR ? current : worst
    );

    if (typeAnalysis.length > 1 && bestType.avgPR > worstType.avgPR * 2) {
      insights.push({
        type: 'info',
        title: `📊 Écart important entre types de pages`,
        description: `Les pages "${bestType.type}" (${bestType.avgPR.toFixed(6)}) performent ${(bestType.avgPR / worstType.avgPR).toFixed(1)}x mieux que les pages "${worstType.type}" (${worstType.avgPR.toFixed(6)}).`,
        action: onStartSimulation ? {
          text: 'Équilibrer par types',
          onClick: onStartSimulation
        } : undefined,
        priority: 3
      });
    }

    // Recommandation générale selon la taille
    if (pages.length > 1000 && highPerformers.length < 10) {
      insights.push({
        type: 'warning',
        title: `🎯 Site important sans pages phares`,
        description: `Avec ${pages.length} pages, vous devriez avoir plus de pages très performantes. Considérez créer des pages hub ou améliorer les liens internes.`,
        action: onStartSimulation ? {
          text: 'Créer stratégie hub',
          onClick: onStartSimulation
        } : undefined,
        priority: 2
      });
    }

    return insights.sort((a, b) => a.priority - b.priority);
  }, [pages, analysis, onStartSimulation]);

  if (!insights.length) {
    return (
      <Card>
        <Alert
          message="✅ Analyse PageRank positive"
          description="Votre site présente une distribution PageRank équilibrée. Continuez à optimiser votre maillage interne !"
          type="success"
          showIcon
        />
      </Card>
    );
  }

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={16}>
        <Card 
          title={
            <Space>
              <BulbOutlined />
              Insights & Recommandations
            </Space>
          }
        >
          <List
            dataSource={insights}
            renderItem={(insight) => (
              <List.Item
                actions={insight.action ? [
                  <Button 
                    type="link" 
                    size="small"
                    onClick={insight.action.onClick}
                    icon={<RocketOutlined />}
                  >
                    {insight.action.text}
                  </Button>
                ] : []}
              >
                <List.Item.Meta
                  avatar={
                    <div style={{ fontSize: '24px' }}>
                      {insight.type === 'error' ? <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} /> :
                       insight.type === 'warning' ? <WarningOutlined style={{ color: '#fa8c16' }} /> :
                       insight.type === 'success' ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> :
                       <BulbOutlined style={{ color: '#1890ff' }} />}
                    </div>
                  }
                  title={insight.title}
                  description={insight.description}
                />
              </List.Item>
            )}
          />
        </Card>
      </Col>
      
      <Col xs={24} lg={8}>
        <Card title="🎯 Actions Recommandées" size="small">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button 
              type="primary" 
              block 
              icon={<ThunderboltOutlined />}
              onClick={onStartSimulation}
              size="large"
            >
              Créer une simulation
            </Button>
            
            <Text type="secondary" style={{ fontSize: '12px', textAlign: 'center', display: 'block' }}>
              Testez l'impact de nouvelles règles de maillage avant implémentation
            </Text>
            
            <div style={{ marginTop: 16 }}>
              <Text strong style={{ fontSize: '13px' }}>Stratégies suggérées:</Text>
              <div style={{ marginTop: 8 }}>
                <Tag color="blue" style={{ marginBottom: 4, fontSize: '11px' }}>
                  <LinkOutlined /> Maillage cross-category
                </Tag>
                <Tag color="green" style={{ marginBottom: 4, fontSize: '11px' }}>
                  <FireOutlined /> Boost pages importantes
                </Tag>
                <Tag color="orange" style={{ marginBottom: 4, fontSize: '11px' }}>
                  <ThunderboltOutlined /> Protection pages clés
                </Tag>
              </div>
            </div>
          </Space>
        </Card>
      </Col>
    </Row>
  );
};