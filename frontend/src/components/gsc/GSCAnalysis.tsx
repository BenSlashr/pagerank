import React from 'react';
import { Card, Row, Col, Statistic, Alert, Typography, Space, Tag, Table, Progress, Button, Tooltip } from 'antd';
import { 
  GoogleOutlined, 
  BarChartOutlined, 
  TrophyOutlined,
  FireOutlined,
  ThunderboltOutlined,
  WarningOutlined,
  RocketOutlined,
  BulbOutlined,
  EyeOutlined,
  LinkOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useGSCData, useGSCPageRankAnalysis, GSCData, GSCPageRankAnalysis } from '../../hooks/useGSC';

const { Title, Text } = Typography;

interface GSCAnalysisProps {
  projectId: number;
  onStartSimulation?: () => void;
}

interface InsightPageData {
  url: string;
  pagerank: number;
  impressions: number;
  clicks: number;
  position: number;
  traffic_score: number;
}

export const GSCAnalysis: React.FC<GSCAnalysisProps> = ({
  projectId,
  onStartSimulation
}) => {
  const { data: gscData, isLoading: gscLoading } = useGSCData(projectId);
  const { data: analysis, isLoading: analysisLoading } = useGSCPageRankAnalysis(projectId);

  const isLoading = gscLoading || analysisLoading;

  // Prepare table columns for insights
  const insightColumns: ColumnsType<InsightPageData> = [
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      width: 300,
      render: (url: string) => (
        <Text copyable={{ text: url }} style={{ fontSize: '12px' }}>
          {url.length > 50 ? `${url.substring(0, 50)}...` : url}
        </Text>
      ),
    },
    {
      title: 'PageRank',
      dataIndex: 'pagerank',
      key: 'pagerank',
      width: 120,
      sorter: (a, b) => a.pagerank - b.pagerank,
      render: (value: number) => (
        <Text strong style={{ color: value > 0.001 ? '#52c41a' : '#ff4d4f' }}>
          {value.toFixed(6)}
        </Text>
      ),
    },
    {
      title: 'Impressions / Clics',
      key: 'traffic',
      width: 150,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: '#1890ff' }}>
            👀 {record.impressions.toLocaleString()}
          </Text>
          <Text strong style={{ color: '#52c41a' }}>
            🖱️ {record.clicks.toLocaleString()}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Position',
      dataIndex: 'position',
      key: 'position',
      width: 100,
      sorter: (a, b) => a.position - b.position,
      render: (value: number) => (
        <Tag color={
          value <= 3 ? 'red' :
          value <= 10 ? 'orange' :
          value <= 20 ? 'blue' : 'default'
        }>
          #{value.toFixed(1)}
        </Tag>
      ),
    },
    {
      title: (
        <Tooltip title="Score calculé : impressions + (clics × 10) - Pondère plus fortement les clics réels">
          Score Valeur
        </Tooltip>
      ),
      dataIndex: 'traffic_score',
      key: 'traffic_score',
      width: 120,
      sorter: (a, b) => a.traffic_score - b.traffic_score,
      render: (value: number) => (
        <Tooltip title={`Formule : impressions + (clics × 10)`}>
          <div>
            <Text strong>{value.toLocaleString()}</Text>
            <Progress 
              percent={Math.min((value / 1000) * 100, 100)} 
              showInfo={false} 
              size="small"
              strokeColor="#1890ff"
            />
          </div>
        </Tooltip>
      ),
    }
  ];

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <GoogleOutlined style={{ fontSize: '48px', color: '#4285F4', marginBottom: '16px' }} />
        <Title level={4}>Chargement de l'analyse GSC...</Title>
      </div>
    );
  }

  if (!gscData || gscData.total_urls === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '60px',
        backgroundColor: '#fafafa',
        borderRadius: '8px',
        border: '2px dashed #d9d9d9'
      }}>
        <GoogleOutlined style={{ fontSize: '48px', color: '#4285F4', marginBottom: '16px' }} />
        <Title level={4} style={{ color: '#666' }}>
          Aucune donnée GSC trouvée
        </Title>
        <Text type="secondary">
          Importez vos données Google Search Console pour commencer l'analyse.
        </Text>
      </div>
    );
  }

  return (
    <div>
      {/* Alert de résumé */}
      <Alert
        message="🎯 Analyse Croisée PageRank × Google Search Console"
        description={
          <Space>
            <Text>
              {gscData.total_urls.toLocaleString()} URLs analysées • 
              {gscData.total_impressions.toLocaleString()} impressions • 
              {gscData.total_clicks.toLocaleString()} clics
            </Text>
          </Space>
        }
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      {/* Métriques principales GSC */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="URLs Analysées"
              value={gscData.total_urls}
              prefix={<LinkOutlined />}
              formatter={(value) => value?.toLocaleString()}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Impressions Totales"
              value={gscData.total_impressions}
              prefix={<EyeOutlined />}
              formatter={(value) => value?.toLocaleString()}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Clics Totaux"
              value={gscData.total_clicks}
              prefix={<FireOutlined />}
              formatter={(value) => value?.toLocaleString()}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Position Moyenne"
              value={gscData.average_position}
              precision={1}
              prefix={<BarChartOutlined />}
              suffix="ème"
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {analysis && analysis.insights && (
        <>
          {/* Insights Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
            {/* Pages à Fort Trafic + PageRank Faible */}
            <Col xs={24} lg={6}>
              <Card 
                style={{ 
                  backgroundColor: '#fff2e8',
                  border: '1px solid #ffbb96'
                }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ textAlign: 'center' }}>
                    <RocketOutlined style={{ fontSize: '32px', color: '#fa8c16' }} />
                  </div>
                  <Statistic
                    title="🚀 Opportunités PageRank"
                    value={analysis.insights.high_traffic_low_pagerank.count}
                    valueStyle={{ color: '#fa8c16', fontSize: '24px' }}
                  />
                  <Text type="secondary" style={{ fontSize: '12px', textAlign: 'center', display: 'block' }}>
                    Pages avec fort trafic GSC mais PageRank faible
                  </Text>
                  {onStartSimulation && (
                    <Button 
                      type="primary" 
                      size="small" 
                      block
                      onClick={onStartSimulation}
                      style={{ backgroundColor: '#fa8c16', borderColor: '#fa8c16' }}
                    >
                      Booster ces pages
                    </Button>
                  )}
                </Space>
              </Card>
            </Col>

            {/* Pages à Fort PageRank + Pas de Trafic */}
            <Col xs={24} lg={6}>
              <Card 
                style={{ 
                  backgroundColor: '#f6ffed',
                  border: '1px solid #b7eb8f'
                }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ textAlign: 'center' }}>
                    <TrophyOutlined style={{ fontSize: '32px', color: '#52c41a' }} />
                  </div>
                  <Statistic
                    title="🏆 Pages sous-exploitées"
                    value={analysis.insights.high_pagerank_no_traffic.count}
                    valueStyle={{ color: '#52c41a', fontSize: '24px' }}
                  />
                  <Text type="secondary" style={{ fontSize: '12px', textAlign: 'center', display: 'block' }}>
                    Fort PageRank mais peu de trafic GSC
                  </Text>
                  <Button type="default" size="small" block>
                    Analyser contenu
                  </Button>
                </Space>
              </Card>
            </Col>

            {/* Pages Équilibrées */}
            <Col xs={24} lg={6}>
              <Card 
                style={{ 
                  backgroundColor: '#e6f7ff',
                  border: '1px solid #91d5ff'
                }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ textAlign: 'center' }}>
                    <ThunderboltOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
                  </div>
                  <Statistic
                    title="⚡ Pages Optimales"
                    value={analysis.insights.balanced_pages.count}
                    valueStyle={{ color: '#1890ff', fontSize: '24px' }}
                  />
                  <Text type="secondary" style={{ fontSize: '12px', textAlign: 'center', display: 'block' }}>
                    Bon équilibre PageRank/Trafic GSC
                  </Text>
                  <Button type="default" size="small" block>
                    Voir détails
                  </Button>
                </Space>
              </Card>
            </Col>

            {/* Pages Orphelines GSC */}
            <Col xs={24} lg={6}>
              <Card 
                style={{ 
                  backgroundColor: '#fff1f0',
                  border: '1px solid #ffccc7'
                }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ textAlign: 'center' }}>
                    <WarningOutlined style={{ fontSize: '32px', color: '#ff4d4f' }} />
                  </div>
                  <Statistic
                    title="⚠️ URLs Orphelines"
                    value={analysis.insights.orphan_gsc.count}
                    valueStyle={{ color: '#ff4d4f', fontSize: '24px' }}
                  />
                  <Text type="secondary" style={{ fontSize: '12px', textAlign: 'center', display: 'block' }}>
                    Dans GSC mais pas en base PageRank
                  </Text>
                  <Button type="default" size="small" block>
                    Importer URLs
                  </Button>
                </Space>
              </Card>
            </Col>
          </Row>

          {/* Tables détaillées */}
          <Row gutter={[16, 16]}>
            {/* Opportunités PageRank */}
            {analysis.insights.high_traffic_low_pagerank.top_10.length > 0 && (
              <Col xs={24} xl={12}>
                <Card 
                  title={
                    <Space>
                      <RocketOutlined style={{ color: '#fa8c16' }} />
                      Top Opportunités PageRank
                    </Space>
                  }
                  extra={
                    <Tag color="orange">
                      {analysis.insights.high_traffic_low_pagerank.count} pages
                    </Tag>
                  }
                >
                  <Alert
                    message="💡 Recommandation SEO"
                    description="Ces pages reçoivent beaucoup de trafic GSC mais ont un PageRank faible. Créez des liens internes vers ces pages depuis vos pages à fort PageRank."
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16, fontSize: '12px' }}
                  />
                  
                  <Table
                    columns={insightColumns}
                    dataSource={analysis.insights.high_traffic_low_pagerank.top_10}
                    rowKey="url"
                    size="small"
                    pagination={false}
                    scroll={{ x: 600 }}
                  />
                </Card>
              </Col>
            )}

            {/* Pages sous-exploitées */}
            {analysis.insights.high_pagerank_no_traffic.top_10.length > 0 && (
              <Col xs={24} xl={12}>
                <Card 
                  title={
                    <Space>
                      <TrophyOutlined style={{ color: '#52c41a' }} />
                      Pages Sous-exploitées
                    </Space>
                  }
                  extra={
                    <Tag color="green">
                      {analysis.insights.high_pagerank_no_traffic.count} pages
                    </Tag>
                  }
                >
                  <Alert
                    message="🔍 Points d'attention"
                    description="Ces pages ont un excellent PageRank mais peu de trafic GSC. Vérifiez le contenu, les balises title/meta et l'indexation."
                    type="info"
                    showIcon
                    style={{ marginBottom: 16, fontSize: '12px' }}
                  />
                  
                  <Table
                    columns={insightColumns}
                    dataSource={analysis.insights.high_pagerank_no_traffic.top_10}
                    rowKey="url"
                    size="small"
                    pagination={false}
                    scroll={{ x: 600 }}
                  />
                </Card>
              </Col>
            )}
          </Row>

          {/* Call to Action */}
          <Card style={{ marginTop: 24, textAlign: 'center' }}>
            <Space direction="vertical" size="large">
              <BulbOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
              <Title level={4}>
                Prêt à optimiser votre SEO ?
              </Title>
              <Text type="secondary">
                Utilisez ces insights pour créer des simulations de maillage interne ciblées
              </Text>
              {onStartSimulation && (
                <Button 
                  type="primary" 
                  size="large"
                  icon={<ThunderboltOutlined />}
                  onClick={onStartSimulation}
                >
                  Créer une simulation optimisée
                </Button>
              )}
            </Space>
          </Card>
        </>
      )}
    </div>
  );
};