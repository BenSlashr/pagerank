import React, { useState } from 'react';
import './ProjectDetail.css';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Typography, 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Table, 
  Button,
  Space,
  Tag,
  Tabs,
  Progress,
  Tooltip,
  Breadcrumb,
  Alert,
  App
} from 'antd';
import { 
  ExperimentOutlined, 
  BarChartOutlined,
  LinkOutlined,
  PlusOutlined,
  HomeOutlined,
  ProjectOutlined,
  FireOutlined,
  StarOutlined,
  WarningOutlined,
  TrophyOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  GoogleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useProject, useProjectPages, useCalculatePagerank } from '../hooks/useProjects';
import { useSimulations } from '../hooks/useSimulations';
import { useProjectAnalysis } from '../hooks/useAnalysis';
import { MultiRuleSimulationModal } from '../components/simulation/MultiRuleSimulationModal';
import { GSCImportModal } from '../components/gsc/GSCImportModal';
import { GSCAnalysis } from '../components/gsc/GSCAnalysis';
import { GSCCorrelationChart } from '../components/gsc/GSCCorrelationChart';
import { useHasGSCData, useCombinedPagesGSCData } from '../hooks/useGSC';
import type { Page, Simulation } from '../types';

const { Title, Text } = Typography;

const ProjectDetail: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [simulationModalVisible, setSimulationModalVisible] = useState(false);
  const [gscImportModalVisible, setGscImportModalVisible] = useState(false);
  
  const id = parseInt(projectId || '0');
  const { data: project } = useProject(id);
  const { data: pages, isLoading: pagesLoading } = useProjectPages(id);
  const { data: simulations } = useSimulations(id);
  const { data: analysis } = useProjectAnalysis(id);
  const { hasGSCData } = useHasGSCData(id);
  const { data: combinedData, isLoading: combinedLoading } = useCombinedPagesGSCData(id);
  const calculatePagerank = useCalculatePagerank();
  const { message: messageApi } = App.useApp();

  // Calculate analysis directly from pages data (since /analysis endpoint was removed)
  const calculatedAnalysis = React.useMemo(() => {
    if (!pages || pages.length === 0) {
      console.log('🔍 No pages data for analysis');
      return null;
    }

    const pageRanks = pages.map(p => p.current_pagerank);
    const validPageRanks = pageRanks.filter(pr => pr > 0);
    
    if (validPageRanks.length === 0) {
      console.log('🔍 No valid PageRank values found');
      return null;
    }

    const totalPageRank = validPageRanks.reduce((sum, pr) => sum + pr, 0);
    const average_pagerank = totalPageRank / validPageRanks.length;
    const max_pagerank = Math.max(...validPageRanks);
    const min_pagerank = Math.min(...validPageRanks);

    // Calculate type distribution
    const typeGroups: Record<string, Page[]> = {};
    pages.forEach(page => {
      const type = page.type || 'other';
      if (!typeGroups[type]) typeGroups[type] = [];
      typeGroups[type].push(page);
    });

    const type_distribution: Record<string, any> = {};
    Object.entries(typeGroups).forEach(([type, typePages]) => {
      const typePageRanks = typePages.map(p => p.current_pagerank).filter(pr => pr > 0);
      if (typePageRanks.length > 0) {
        type_distribution[type] = {
          count: typePages.length,
          average_pagerank: typePageRanks.reduce((sum, pr) => sum + pr, 0) / typePageRanks.length,
          max_pagerank: Math.max(...typePageRanks),
          min_pagerank: Math.min(...typePageRanks)
        };
      }
    });

    // Calculate top pages
    const sortedPages = pages
      .filter(p => p.current_pagerank > 0)
      .sort((a, b) => b.current_pagerank - a.current_pagerank);
    
    const top_pages = sortedPages.slice(0, 20).map(page => ({
      url: page.url,
      pagerank: page.current_pagerank,
      type: page.type
    }));

    const result = {
      average_pagerank,
      max_pagerank,
      min_pagerank,
      total_pages: pages.length,
      type_distribution,
      top_pages
    };

    console.log('✅ Calculated analysis from pages:', result);
    return result;
  }, [pages]);

  // Use calculated analysis as fallback
  const effectiveAnalysis = analysis || calculatedAnalysis;

  // Determine if PageRank has been calculated
  const hasPageRankCalculated = React.useMemo(() => {
    const hasAnalysis = !!effectiveAnalysis && (effectiveAnalysis.average_pagerank > 0 || effectiveAnalysis.max_pagerank > 0);
    const hasPageRankValues = pages && pages.some(p => p.current_pagerank > 0);
    const result = hasAnalysis || hasPageRankValues;
    
    console.log('🔍 PageRank calculation check:', {
      hasAnalysis,
      hasPageRankValues,
      result,
      averagePageRank: effectiveAnalysis?.average_pagerank,
      maxPageRank: effectiveAnalysis?.max_pagerank,
      samplePageRanks: pages?.slice(0, 3).map(p => ({ url: p.url, pr: p.current_pagerank }))
    });
    
    return result;
  }, [effectiveAnalysis, pages]);

  const handleCalculatePagerank = async () => {
    if (!project) return;
    
    try {
      messageApi.info(`Calcul du PageRank en cours pour "${project.name}"... Ce processus peut prendre plusieurs minutes pour les gros sites (${project.total_pages.toLocaleString()} pages).`);
      await calculatePagerank.mutateAsync(id);
      messageApi.success(`PageRank calculé avec succès pour "${project.name}"! Les scores ont été mis à jour. Actualisation des données en cours...`);
      
      // Force un rafraîchissement de la page après 2 secondes pour s'assurer que les données sont à jour
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      messageApi.error('Échec du calcul PageRank. Le serveur peut être surchargé - réessayez dans quelques minutes.');
    }
  };

  const pageColumns: ColumnsType<Page> = [
    {
      title: 'Performance',
      key: 'performance',
      width: 100,
      render: (_, record) => {
        const pr = record.current_pagerank;
        const avgPR = effectiveAnalysis?.average_pagerank || 0.001;
        const ratio = pr / avgPR;
        
        if (ratio > 3) return <Tag color="red" icon={<FireOutlined />}>TOP</Tag>;
        if (ratio > 2) return <Tag color="orange" icon={<StarOutlined />}>ÉLEVÉ</Tag>;
        if (ratio > 1.5) return <Tag color="blue" icon={<ThunderboltOutlined />}>BON</Tag>;
        if (ratio > 0.5) return <Tag color="default">MOYEN</Tag>;
        return <Tag color="gray" icon={<WarningOutlined />}>FAIBLE</Tag>;
      },
      filters: [
        { text: '🔥 Pages TOP (3x+ moyenne)', value: 'top' },
        { text: '⭐ Pages élevées (2x+ moyenne)', value: 'high' },
        { text: '⚡ Bonnes pages (1.5x+ moyenne)', value: 'good' },
        { text: '⚠️ Pages faibles (<50% moyenne)', value: 'low' },
      ],
      onFilter: (value, record) => {
        const pr = record.current_pagerank;
        const avgPR = effectiveAnalysis?.average_pagerank || 0.001;
        const ratio = pr / avgPR;
        
        if (value === 'top') return ratio > 3;
        if (value === 'high') return ratio > 2 && ratio <= 3;
        if (value === 'good') return ratio > 1.5 && ratio <= 2;
        if (value === 'low') return ratio < 0.5;
        return false;
      },
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      width: 350,
      render: (url: string) => (
        <Text copyable={{ text: url }} style={{ fontSize: '12px' }}>
          {url.length > 50 ? `${url.substring(0, 50)}...` : url}
        </Text>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      filters: [
        { text: 'Product', value: 'product' },
        { text: 'Category', value: 'category' },
        { text: 'Blog', value: 'blog' },
        { text: 'Other', value: 'other' },
      ],
      onFilter: (value, record) => record.type === value,
      render: (type: string | null) => (
        <Tag color={
          type === 'product' ? 'blue' :
          type === 'category' ? 'green' :
          type === 'blog' ? 'orange' : 'default'
        }>
          {type || 'other'}
        </Tag>
      ),
    },
    {
      title: 'PageRank',
      dataIndex: 'current_pagerank',
      key: 'current_pagerank',
      sorter: (a, b) => a.current_pagerank - b.current_pagerank,
      render: (value: number) => (
        <Space direction="vertical" size={0}>
          <Text strong>{value.toFixed(6)}</Text>
          <Progress 
            percent={(value / (effectiveAnalysis?.max_pagerank || 1)) * 100}
            showInfo={false}
            size="small"
            strokeColor="#1890ff"
          />
        </Space>
      ),
    },
    {
      title: 'Potentiel',
      key: 'potential',
      render: (_, record) => {
        const pr = record.current_pagerank;
        const avgPR = effectiveAnalysis?.average_pagerank || 0.001;
        const potential = avgPR - pr;
        
        if (potential > avgPR * 0.5) {
          return <Tag color="volcano" icon={<FireOutlined />}>FORT</Tag>;
        }
        if (potential > avgPR * 0.2) {
          return <Tag color="orange" icon={<StarOutlined />}>MOYEN</Tag>;
        }
        if (potential > 0) {
          return <Tag color="blue" icon={<ThunderboltOutlined />}>FAIBLE</Tag>;
        }
        return <Tag color="green" icon={<TrophyOutlined />}>OPTIMISÉ</Tag>;
      },
      tooltip: 'Potentiel d\'amélioration basé sur la moyenne du site',
    },
  ];

  const simulationColumns: ColumnsType<Simulation> = [
    {
      title: 'Simulation',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Simulation) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: record.status === 'completed' ? '#52c41a' : '#1890ff' }}>
            {name}
          </Text>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {new Date(record.created_at).toLocaleDateString('fr-FR')}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={
          status === 'completed' ? 'green' :
          status === 'running' ? 'blue' :
          status === 'failed' ? 'red' : 'default'
        } icon={
          status === 'completed' ? <TrophyOutlined /> :
          status === 'running' ? <ExperimentOutlined /> :
          status === 'failed' ? <WarningOutlined /> : undefined
        }>
          {status === 'completed' ? 'TERMINÉE' :
           status === 'running' ? 'EN COURS' :
           status === 'failed' ? 'ÉCHOUÉE' : status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Configuration',
      key: 'configuration',
      render: (_, record: Simulation) => (
        <Space direction="vertical" size={2}>
          <Space size={4}>
            <Tag color="blue" style={{ fontSize: '10px' }}>
              {record.rules?.length || 0} règles
            </Tag>
            {record.page_boosts?.length > 0 && (
              <Tag color="orange" icon={<ThunderboltOutlined />} style={{ fontSize: '10px' }}>
                {record.page_boosts.length} boosts
              </Tag>
            )}
            {record.protected_pages?.length > 0 && (
              <Tag color="cyan" icon={<SafetyOutlined />} style={{ fontSize: '10px' }}>
                {record.protected_pages.length} protégées
              </Tag>
            )}
          </Space>
          <Text type="secondary" style={{ fontSize: '10px' }}>
            {record.rules?.map(rule => rule.selection_method).join(', ') || 'Aucune règle'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record: Simulation) => (
        <Button 
          type={record.status === 'completed' ? 'primary' : 'default'}
          size="small" 
          disabled={record.status !== 'completed'}
          onClick={() => navigate(`/simulations/${record.id}`)}
          icon={record.status === 'completed' ? <BarChartOutlined /> : undefined}
        >
          {record.status === 'completed' ? 'Voir résultats' : 'En attente'}
        </Button>
      ),
    },
  ];

  // Combined table columns (Pages + GSC data)
  const combinedColumns: ColumnsType<any> = [
    {
      title: 'Performance',
      key: 'performance',
      width: 80,
      render: (_, record) => {
        const pr = record.current_pagerank;
        const avgPR = effectiveAnalysis?.average_pagerank || 0.001;
        const ratio = pr / avgPR;
        
        if (ratio > 3) return <Tag color="red" icon={<FireOutlined />}>TOP</Tag>;
        if (ratio > 2) return <Tag color="orange" icon={<StarOutlined />}>ÉLEVÉ</Tag>;
        if (ratio > 1.5) return <Tag color="blue" icon={<ThunderboltOutlined />}>BON</Tag>;
        if (ratio > 0.5) return <Tag color="default">MOYEN</Tag>;
        return <Tag color="gray" icon={<WarningOutlined />}>FAIBLE</Tag>;
      },
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      width: 300,
      render: (url: string) => (
        <Text copyable={{ text: url }} style={{ fontSize: '12px' }}>
          {url.length > 40 ? `${url.substring(0, 40)}...` : url}
        </Text>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: string) => (
        <Tag color={
          type === 'product' ? 'blue' :
          type === 'category' ? 'green' :
          type === 'blog' ? 'orange' : 'default'
        }>
          {type}
        </Tag>
      ),
    },
    {
      title: 'PageRank',
      dataIndex: 'current_pagerank',
      key: 'current_pagerank',
      width: 140,
      sorter: (a, b) => a.current_pagerank - b.current_pagerank,
      render: (value: number, record: any) => {
        // Calculate percentile position
        if (!combinedData || combinedData.length === 0) {
          return <Text strong style={{ fontSize: '11px' }}>{value.toFixed(6)}</Text>;
        }
        
        // Sort all PageRank values in descending order
        const sortedPageRanks = combinedData
          .map(item => item.current_pagerank)
          .sort((a, b) => b - a);
        
        // Find position of current value
        const position = sortedPageRanks.findIndex(pr => pr <= value) + 1;
        const percentile = Math.round((position / sortedPageRanks.length) * 100);
        
        // Determine color and label based on percentile
        let percentileColor = '#d9d9d9';
        let percentileLabel = `top ${percentile}%`;
        
        if (percentile <= 5) {
          percentileColor = '#722ed1'; // Purple for top 5%
          percentileLabel = `top ${percentile}%`;
        } else if (percentile <= 10) {
          percentileColor = '#ff4d4f'; // Red for top 10%
          percentileLabel = `top ${percentile}%`;
        } else if (percentile <= 25) {
          percentileColor = '#fa8c16'; // Orange for top 25%
          percentileLabel = `top ${percentile}%`;
        } else if (percentile <= 50) {
          percentileColor = '#1890ff'; // Blue for top 50%
          percentileLabel = `top ${percentile}%`;
        } else if (percentile <= 75) {
          percentileColor = '#52c41a'; // Green for top 75%
          percentileLabel = `${percentile}%`;
        } else {
          percentileColor = '#d9d9d9'; // Gray for bottom 25%
          percentileLabel = `${percentile}%`;
        }
        
        return (
          <Space direction="vertical" size={0}>
            <Text strong style={{ fontSize: '11px' }}>
              {value.toFixed(6)}
            </Text>
            <Tag 
              color={
                percentile <= 5 ? 'purple' :
                percentile <= 10 ? 'red' :
                percentile <= 25 ? 'orange' :
                percentile <= 50 ? 'blue' :
                percentile <= 75 ? 'green' : 'default'
              }
              size="small"
              style={{ fontSize: '9px', lineHeight: '14px' }}
            >
              {percentileLabel}
            </Tag>
          </Space>
        );
      },
    },
    {
      title: 'GSC Status',
      key: 'gsc_status',
      width: 80,
      render: (_, record) => (
        record.has_gsc_data ? 
          <Tag color="green" size="small">✓ GSC</Tag> : 
          <Tag color="default" size="small">- GSC</Tag>
      ),
      filters: [
        { text: 'Avec données GSC', value: true },
        { text: 'Sans données GSC', value: false },
      ],
      onFilter: (value, record) => record.has_gsc_data === value,
    },
    {
      title: 'Impressions',
      dataIndex: 'gsc_impressions',
      key: 'gsc_impressions',
      width: 100,
      sorter: (a, b) => (a.gsc_impressions || 0) - (b.gsc_impressions || 0),
      render: (value: number) => (
        <Text style={{ fontSize: '11px', color: value > 0 ? '#1890ff' : '#d9d9d9' }}>
          {value > 0 ? value.toLocaleString() : '-'}
        </Text>
      ),
    },
    {
      title: 'Clics',
      dataIndex: 'gsc_clicks',
      key: 'gsc_clicks',
      width: 80,
      sorter: (a, b) => (a.gsc_clicks || 0) - (b.gsc_clicks || 0),
      render: (value: number) => (
        <Text style={{ fontSize: '11px', color: value > 0 ? '#52c41a' : '#d9d9d9' }}>
          {value > 0 ? value.toLocaleString() : '-'}
        </Text>
      ),
    },
    {
      title: 'Position',
      dataIndex: 'gsc_position',
      key: 'gsc_position',
      width: 80,
      sorter: (a, b) => (a.gsc_position || 999) - (b.gsc_position || 999),
      render: (value: number) => {
        if (!value || value === 0) return <Text style={{ color: '#d9d9d9' }}>-</Text>;
        
        return (
          <Tag color={
            value <= 3 ? 'red' :
            value <= 10 ? 'orange' :
            value <= 20 ? 'blue' : 'default'
          }>
            #{value.toFixed(1)}
          </Tag>
        );
      },
    },
    {
      title: (
        <Tooltip title="Score : impressions + (clics × 10)">
          Score Valeur
        </Tooltip>
      ),
      dataIndex: 'gsc_traffic_score',
      key: 'gsc_traffic_score',
      width: 100,
      sorter: (a, b) => (a.gsc_traffic_score || 0) - (b.gsc_traffic_score || 0),
      render: (value: number) => (
        <Text style={{ 
          fontSize: '11px', 
          fontWeight: 'bold',
          color: value > 1000 ? '#fa8c16' : value > 100 ? '#52c41a' : value > 0 ? '#1890ff' : '#d9d9d9'
        }}>
          {value > 0 ? value.toLocaleString() : '-'}
        </Text>
      ),
    },
  ];

  // Calculate advanced metrics
  const advancedMetrics = React.useMemo(() => {
    if (!effectiveAnalysis || !pages) {
      console.log('🔍 Advanced metrics not available:', { 
        effectiveAnalysis: !!effectiveAnalysis, 
        pages: !!pages, 
        analysisKeys: effectiveAnalysis ? Object.keys(effectiveAnalysis) : null,
        pagesLength: pages?.length,
        averagePageRank: effectiveAnalysis?.average_pagerank,
        maxPageRank: effectiveAnalysis?.max_pagerank
      });
      return null;
    }
    
    const topPages = pages.filter(p => p.current_pagerank > effectiveAnalysis.average_pagerank * 2).length;
    const lowPages = pages.filter(p => p.current_pagerank < effectiveAnalysis.average_pagerank * 0.5).length;
    const optimizationPotential = Math.round((lowPages / pages.length) * 100);
    
    return {
      topPages,
      lowPages,
      optimizationPotential,
      completedSimulations: simulations?.filter(s => s.status === 'completed').length || 0
    };
  }, [analysis, pages, simulations]);

  const tabItems = [
    {
      key: '1',
      label: '📊 Vue d\'ensemble',
      children: (
        <div>
          {/* Alert d'état du projet */}
          <Alert
            message={`Projet ${project?.name} - Analyse PageRank`}
            description={`${project?.total_pages?.toLocaleString()} pages analysées sur ${project?.domain}. ${advancedMetrics?.completedSimulations || 0} simulations terminées.`}
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />

          {/* Métriques principales */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Pages totales"
                  value={project?.total_pages || 0}
                  prefix={<LinkOutlined />}
                  formatter={(value) => value?.toLocaleString() || '0'}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="PageRank moyen"
                  value={effectiveAnalysis?.average_pagerank || 0}
                  precision={6}
                  prefix={<BarChartOutlined />}
                  valueStyle={{ color: hasPageRankCalculated ? '#1890ff' : '#d9d9d9' }}
                />
                {!hasPageRankCalculated && (
                  <Text type="secondary" style={{ fontSize: '10px', display: 'block', textAlign: 'center' }}>
                    Cliquez sur "Calculer PageRank"
                  </Text>
                )}
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Page la plus forte"
                  value={effectiveAnalysis?.max_pagerank || 0}
                  precision={6}
                  prefix={<TrophyOutlined />}
                  valueStyle={{ color: hasPageRankCalculated ? '#52c41a' : '#d9d9d9' }}
                />
                {!hasPageRankCalculated && (
                  <Text type="secondary" style={{ fontSize: '10px', display: 'block', textAlign: 'center' }}>
                    Pas encore calculé
                  </Text>
                )}
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Simulations"
                  value={simulations?.length || 0}
                  prefix={<ExperimentOutlined />}
                  suffix={advancedMetrics?.completedSimulations ? `(${advancedMetrics.completedSimulations} OK)` : ''}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Métriques avancées */}
          {advancedMetrics && (
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic
                    title="Pages performantes"
                    value={advancedMetrics.topPages}
                    suffix={`/ ${pages?.length}`}
                    prefix={<FireOutlined />}
                    valueStyle={{ color: '#f5222d' }}
                  />
                  <Progress 
                    percent={(advancedMetrics.topPages / (pages?.length || 1)) * 100}
                    strokeColor="#f5222d"
                    showInfo={false}
                    size="small"
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic
                    title="Pages sous-performantes"
                    value={advancedMetrics.lowPages}
                    suffix={`/ ${pages?.length}`}
                    prefix={<WarningOutlined />}
                    valueStyle={{ color: '#faad14' }}
                  />
                  <Progress 
                    percent={(advancedMetrics.lowPages / (pages?.length || 1)) * 100}
                    strokeColor="#faad14"
                    showInfo={false}
                    size="small"
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic
                    title="Potentiel d'optimisation"
                    value={advancedMetrics.optimizationPotential}
                    suffix="%"
                    prefix={<ThunderboltOutlined />}
                    valueStyle={{ 
                      color: advancedMetrics.optimizationPotential > 50 ? '#f5222d' :
                             advancedMetrics.optimizationPotential > 25 ? '#faad14' : '#52c41a'
                    }}
                  />
                </Card>
              </Col>
            </Row>
          )}

          {effectiveAnalysis && (
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Card 
                  title={
                    <Space>
                      <BarChartOutlined />
                      Distribution par type de page
                    </Space>
                  }
                >
                  <div>
                    {Object.entries(effectiveAnalysis.type_distribution).map(([type, stats]) => (
                      <div key={type} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <Space>
                            <Tag color={
                              type === 'product' ? 'blue' :
                              type === 'category' ? 'green' :
                              type === 'blog' ? 'orange' : 'default'
                            }>
                              {type}
                            </Tag>
                            <Text>{stats.count} pages</Text>
                          </Space>
                          <Text strong>PR: {stats.average_pagerank.toFixed(6)}</Text>
                        </div>
                        <Progress 
                          percent={(stats.count / (project?.total_pages || 1)) * 100}
                          strokeColor={
                            type === 'product' ? '#1890ff' :
                            type === 'category' ? '#52c41a' :
                            type === 'blog' ? '#fa8c16' : '#d9d9d9'
                          }
                          showInfo={false}
                          size="small"
                        />
                      </div>
                    ))}
                  </div>
                </Card>
              </Col>
              
              <Col xs={24} lg={12}>
                <Card 
                  title={
                    <Space>
                      <TrophyOutlined />
                      Top 10 des pages les plus fortes
                    </Space>
                  }
                >
                  <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                    {effectiveAnalysis.top_pages?.slice(0, 10).map((page, index) => (
                      <div key={index} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 12,
                        padding: '8px 12px',
                        backgroundColor: index < 3 ? '#fff7e6' : '#fafafa',
                        borderRadius: '6px',
                        border: index < 3 ? '1px solid #ffec3d' : '1px solid #f0f0f0'
                      }}>
                        <div style={{ flex: 1, marginRight: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
                            <Tag color={index < 3 ? 'gold' : 'default'} style={{ marginRight: 8 }}>
                              #{index + 1}
                            </Tag>
                            <Text style={{ fontSize: '11px' }} copyable={{ text: page.url }}>
                              {page.url.length > 35 ? `${page.url.substring(0, 35)}...` : page.url}
                            </Text>
                          </div>
                          <Tag color="blue" size="small">{page.type}</Tag>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <Text strong style={{ color: index < 3 ? '#fa8c16' : '#1890ff' }}>
                            {page.pagerank.toFixed(6)}
                          </Text>
                          <br />
                          <Progress 
                            percent={(page.pagerank / (effectiveAnalysis.max_pagerank || 1)) * 100}
                            strokeColor={index < 3 ? '#fa8c16' : '#1890ff'}
                            showInfo={false}
                            size="small"
                            style={{ width: '60px', marginTop: 2 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </Col>
            </Row>
          )}

          {/* Message d'invitation si le PageRank n'est pas encore calculé */}
          {!hasPageRankCalculated && (
            <Alert
              message="🚀 Calcul PageRank requis"
              description={
                <div>
                  <Text>
                    Le PageRank de ce projet n'a pas encore été calculé. Cliquez sur le bouton "Calculer PageRank" 
                    ci-dessus pour analyser les {project?.total_pages?.toLocaleString()} pages de votre site.
                  </Text>
                  <div style={{ marginTop: 12 }}>
                    <Button 
                      type="primary" 
                      icon={<BarChartOutlined />}
                      onClick={handleCalculatePagerank}
                      loading={calculatePagerank.isPending}
                    >
                      Calculer PageRank maintenant
                    </Button>
                  </div>
                </div>
              }
              type="warning"
              showIcon
              style={{ marginBottom: 24 }}
            />
          )}

          {/* Graphiques identiques aux simulations */}
          {effectiveAnalysis && pages && (
            <>
              <div style={{ 
                marginTop: 32, 
                marginBottom: 16, 
                textAlign: 'center',
                borderTop: '2px solid #f0f0f0',
                paddingTop: 24
              }}>
                <Title level={3}>
                  📊 Analyse Détaillée PageRank
                </Title>
                <Text type="secondary">
                  Visualisations complètes de la distribution PageRank actuelle
                </Text>
              </div>
              
              <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
                <Col xs={24}>
                  <Card title="📊 Distribution Détaillée des Tranches PageRank" style={{ borderRadius: '12px' }}>
                    <div style={{ padding: '20px' }}>
                      {(() => {
                        const avgPR = effectiveAnalysis.average_pagerank;
                        const ranges = [
                          { min: avgPR * 5, max: Infinity, label: '5x+ moyenne (Pages Exceptionnelles)', color: '#722ed1', icon: '🏆' },
                          { min: avgPR * 3, max: avgPR * 5, label: '3x-5x moyenne (Pages TOP)', color: '#ff4d4f', icon: '🔥' },
                          { min: avgPR * 2, max: avgPR * 3, label: '2x-3x moyenne (Pages Élevées)', color: '#fa8c16', icon: '⭐' },
                          { min: avgPR * 1.5, max: avgPR * 2, label: '1.5x-2x moyenne (Bonnes Pages)', color: '#1890ff', icon: '⚡' },
                          { min: avgPR * 1, max: avgPR * 1.5, label: '1x-1.5x moyenne (Pages Moyennes+)', color: '#52c41a', icon: '✅' },
                          { min: avgPR * 0.7, max: avgPR * 1, label: '0.7x-1x moyenne (Pages Moyennes)', color: '#95de64', icon: '📋' },
                          { min: avgPR * 0.5, max: avgPR * 0.7, label: '0.5x-0.7x moyenne (Pages Correctes)', color: '#b7eb8f', icon: '📄' },
                          { min: avgPR * 0.3, max: avgPR * 0.5, label: '0.3x-0.5x moyenne (Pages Faibles)', color: '#ffd591', icon: '⚠️' },
                          { min: avgPR * 0.1, max: avgPR * 0.3, label: '0.1x-0.3x moyenne (Pages Très Faibles)', color: '#ffb37d', icon: '📉' },
                          { min: avgPR * 0.01, max: avgPR * 0.1, label: '0.01x-0.1x moyenne (Pages Critiques)', color: '#ff7875', icon: '🚨' },
                          { min: 0, max: avgPR * 0.01, label: '< 0.01x moyenne (Pages Orphelines)', color: '#d9d9d9', icon: '💀' }
                        ];
                        
                        const dataForChart = ranges.map(range => {
                          const filteredPages = pages.filter(p => {
                            if (range.min === 0) return p.current_pagerank >= range.min && p.current_pagerank < range.max;
                            if (range.max === Infinity) return p.current_pagerank >= range.min;
                            return p.current_pagerank >= range.min && p.current_pagerank < range.max;
                          });
                          
                          // Calculer le PageRank total pour cette tranche
                          const totalPRInRange = filteredPages.reduce((sum, p) => sum + p.current_pagerank, 0);
                          const avgPRInRange = filteredPages.length > 0 ? totalPRInRange / filteredPages.length : 0;
                          
                          return { 
                            ...range, 
                            count: filteredPages.length,
                            totalPageRank: totalPRInRange,
                            averagePageRank: avgPRInRange
                          };
                        }).filter(item => item.count > 0);
                        
                        const maxCount = Math.max(...dataForChart.map(d => d.count));
                        const totalPages = dataForChart.reduce((sum, d) => sum + d.count, 0);
                        const totalPageRank = dataForChart.reduce((sum, d) => sum + d.totalPageRank, 0);
                        
                        return (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                            {/* Graphique principal */}
                            <div>
                              <h4 style={{ marginBottom: '20px', textAlign: 'center', color: '#333' }}>
                                🎯 Répartition des {totalPages.toLocaleString()} pages par tranche
                              </h4>
                              <div style={{ height: '400px', overflowY: 'auto' }}>
                                {dataForChart.map((item, index) => {
                                  const percentage = totalPages > 0 ? (item.count / totalPages * 100) : 0;
                                  const prPercentage = totalPageRank > 0 ? (item.totalPageRank / totalPageRank * 100) : 0;
                                  const barWidth = Math.min(maxCount > 0 ? (item.count / maxCount * 100) : 0, 100);
                                  
                                  return (
                                    <div key={item.label} style={{ marginBottom: '20px', padding: '12px', border: '1px solid #f0f0f0', borderRadius: '8px' }}>
                                      {/* En-tête de la tranche */}
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                          <span style={{ fontSize: '16px' }}>{item.icon}</span>
                                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>
                                            {item.label}
                                          </span>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                          <span style={{ fontSize: '18px', fontWeight: 'bold', color: item.color }}>
                                            {item.count}
                                          </span>
                                          <span style={{ fontSize: '11px', color: '#666', marginLeft: '4px' }}>
                                            pages
                                          </span>
                                        </div>
                                      </div>
                                      
                                      {/* Barre de progression principale */}
                                      <div style={{ 
                                        position: 'relative', 
                                        height: '16px', 
                                        backgroundColor: '#f5f5f5', 
                                        borderRadius: '8px', 
                                        overflow: 'hidden',
                                        marginBottom: '8px'
                                      }}>
                                        <div 
                                          style={{ 
                                            width: `${barWidth}%`,
                                            height: '100%',
                                            background: `linear-gradient(90deg, ${item.color}, ${item.color}cc)`,
                                            transition: 'width 0.6s ease',
                                            borderRadius: '8px'
                                          }}
                                        />
                                        <div style={{ 
                                          position: 'absolute', 
                                          top: '50%', 
                                          right: '8px', 
                                          transform: 'translateY(-50%)',
                                          fontSize: '11px',
                                          color: barWidth > 25 ? 'white' : '#333',
                                          fontWeight: 'bold'
                                        }}>
                                          {percentage.toFixed(1)}% des pages
                                        </div>
                                      </div>
                                      
                                      {/* Statistiques détaillées */}
                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '11px', color: '#666' }}>
                                        <div>
                                          <strong>{percentage.toFixed(1)}%</strong><br/>
                                          des pages
                                        </div>
                                        <div>
                                          <strong>{prPercentage.toFixed(1)}%</strong><br/>
                                          du PageRank total
                                        </div>
                                        <div>
                                          <strong>{item.averagePageRank.toFixed(6)}</strong><br/>
                                          PR moyen tranche
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            
                            {/* Résumé et insights */}
                            <div>
                              <h4 style={{ marginBottom: '20px', textAlign: 'center', color: '#333' }}>
                                📈 Analyse & Insights
                              </h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '400px' }}>
                                {/* Métriques clés */}
                                <div style={{ padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                                  <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: '#333' }}>
                                    🎯 Métriques de Distribution
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                                    <div>
                                      <strong>Pages totales:</strong><br/>
                                      <span style={{ color: '#1890ff', fontSize: '16px', fontWeight: 'bold' }}>
                                        {totalPages.toLocaleString()}
                                      </span>
                                    </div>
                                    <div>
                                      <strong>PageRank moyen:</strong><br/>
                                      <span style={{ color: '#52c41a', fontSize: '14px', fontWeight: 'bold' }}>
                                        {avgPR.toFixed(6)}
                                      </span>
                                    </div>
                                    <div>
                                      <strong>Pages performantes:</strong><br/>
                                      <span style={{ color: '#fa8c16', fontSize: '14px', fontWeight: 'bold' }}>
                                        {pages.filter(p => p.current_pagerank > avgPR * 2).length}
                                      </span>
                                      <span style={{ color: '#666', fontSize: '10px' }}>
                                        {' '}({((pages.filter(p => p.current_pagerank > avgPR * 2).length / totalPages) * 100).toFixed(1)}%)
                                      </span>
                                    </div>
                                    <div>
                                      <strong>Pages faibles:</strong><br/>
                                      <span style={{ color: '#ff4d4f', fontSize: '14px', fontWeight: 'bold' }}>
                                        {pages.filter(p => p.current_pagerank < avgPR * 0.3).length}
                                      </span>
                                      <span style={{ color: '#666', fontSize: '10px' }}>
                                        {' '}({((pages.filter(p => p.current_pagerank < avgPR * 0.3).length / totalPages) * 100).toFixed(1)}%)
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Insights automatiques */}
                                <div style={{ padding: '16px', backgroundColor: '#fff7e6', borderRadius: '8px', border: '1px solid #ffd591', flex: 1 }}>
                                  <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: '#333' }}>
                                    💡 Insights Automatiques
                                  </div>
                                  <div style={{ fontSize: '12px', lineHeight: '1.5', color: '#666' }}>
                                    {(() => {
                                      const topPages = pages.filter(p => p.current_pagerank > avgPR * 3).length;
                                      const lowPages = pages.filter(p => p.current_pagerank < avgPR * 0.3).length;
                                      const concentration = (pages.filter(p => p.current_pagerank > avgPR * 2).length / totalPages) * 100;
                                      
                                      const insights = [];
                                      
                                      if (topPages > 0) {
                                        insights.push(`🏆 ${topPages} pages exceptionnelles détectées`);
                                      }
                                      
                                      if (concentration > 10) {
                                        insights.push(`✅ Bonne répartition avec ${concentration.toFixed(1)}% de pages performantes`);
                                      } else {
                                        insights.push(`⚠️ Seulement ${concentration.toFixed(1)}% de pages performantes`);
                                      }
                                      
                                      if (lowPages > totalPages * 0.3) {
                                        insights.push(`🚨 ${lowPages} pages nécessitent une attention (${((lowPages/totalPages)*100).toFixed(1)}%)`);
                                      }
                                      
                                      const orphanPages = pages.filter(p => p.current_pagerank < avgPR * 0.01).length;
                                      if (orphanPages > 0) {
                                        insights.push(`💀 ${orphanPages} pages quasi-orphelines à traiter en priorité`);
                                      }
                                      
                                      return insights.map((insight, i) => (
                                        <div key={i} style={{ 
                                          padding: '6px 8px', 
                                          marginBottom: '6px', 
                                          backgroundColor: 'rgba(255, 255, 255, 0.7)', 
                                          borderRadius: '4px',
                                          fontSize: '11px'
                                        }}>
                                          {insight}
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </Card>
                </Col>
              </Row>
              
              <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
                <Col xs={24} lg={12}>
                  <Card title="📋 PageRank moyen par type de page" style={{ height: '400px', borderRadius: '12px' }}>
                    <div style={{ height: '340px', overflowY: 'auto', padding: '12px' }}>
                      {Object.entries(effectiveAnalysis.type_distribution).map(([type, stats]) => {
                        const avgChange = (stats.average_pagerank / effectiveAnalysis.average_pagerank - 1) * 100;
                        return (
                          <div key={type} style={{ 
                            padding: '10px', 
                            border: '1px solid #f0f0f0', 
                            borderRadius: '6px',
                            textAlign: 'center',
                            backgroundColor: stats.average_pagerank > effectiveAnalysis.average_pagerank ? '#f6ffed' : '#fafafa',
                            marginBottom: '8px'
                          }}>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                              <Tag size="small" color={type === 'product' ? 'blue' : type === 'category' ? 'green' : 'orange'}>
                                {type}
                              </Tag>
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: stats.average_pagerank > effectiveAnalysis.average_pagerank ? '#52c41a' : '#666' }}>
                              {stats.average_pagerank.toFixed(6)}
                            </div>
                            <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>PageRank moyen</div>
                            <div style={{ fontSize: '9px', color: '#999', marginTop: '2px' }}>
                              {stats.count} pages
                            </div>
                            {stats.average_pagerank > effectiveAnalysis.average_pagerank * 1.5 && (
                              <div style={{ fontSize: '8px', color: '#52c41a', marginTop: '2px', fontWeight: 'bold' }}>
                                🎯 TYPE PERFORMANT
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="📊 Distribution PageRank par type (seuils globaux adaptatifs)" style={{ height: '600px', borderRadius: '12px' }}>
                    <div style={{ height: '540px', padding: '20px', overflowY: 'auto' }}>
                      {(() => {
                        // Calculer les percentiles GLOBAUX une seule fois sur toutes les pages
                        const allPageRanks = pages
                          .map(p => p.current_pagerank)
                          .sort((a, b) => b - a);
                        
                        const getPercentile = (arr, percentile) => {
                          const index = Math.ceil((percentile / 100) * arr.length) - 1;
                          return arr[Math.max(0, index)] || 0;
                        };
                        
                        const globalP95 = getPercentile(allPageRanks, 5);   // Top 5%
                        const globalP90 = getPercentile(allPageRanks, 10);  // Top 10%
                        const globalP75 = getPercentile(allPageRanks, 25);  // Top 25%
                        const globalP50 = getPercentile(allPageRanks, 50);  // Médiane
                        const globalP25 = getPercentile(allPageRanks, 75);  // Bottom 25%
                        
                        // Seuils globaux utilisés pour TOUS les types
                        const globalRanges = [
                          { min: globalP95, max: Infinity, label: `${globalP95.toFixed(6)}+ (top 5%)`, color: '#722ed1' },
                          { min: globalP90, max: globalP95, label: `${globalP90.toFixed(6)}-${globalP95.toFixed(6)} (top 10%)`, color: '#1f5582' },
                          { min: globalP75, max: globalP90, label: `${globalP75.toFixed(6)}-${globalP90.toFixed(6)} (top 25%)`, color: '#389e0d' },
                          { min: globalP50, max: globalP75, label: `${globalP50.toFixed(6)}-${globalP75.toFixed(6)} (médiane)`, color: '#52c41a' },
                          { min: globalP25, max: globalP50, label: `${globalP25.toFixed(6)}-${globalP50.toFixed(6)} (inf. médiane)`, color: '#95de64' },
                          { min: 0, max: globalP25, label: `0-${globalP25.toFixed(6)} (bottom 25%)`, color: '#d9d9d9' }
                        ].filter(range => range.min !== range.max);
                        
                        return Object.entries(effectiveAnalysis.type_distribution).map(([type, stats]) => {
                          const typePages = pages.filter(p => p.type === type);
                          
                          // Appliquer les MÊMES seuils globaux à chaque type
                          const ranges = globalRanges;
                        
                        const distribution = ranges.map(range => {
                          const count = typePages.filter(p => {
                            if (range.max === Infinity) return p.current_pagerank >= range.min;
                            return p.current_pagerank >= range.min && p.current_pagerank < range.max;
                          }).length;
                          return { ...range, count };
                        });
                        
                        const maxCount = Math.max(...distribution.map(d => d.count));
                        
                        return (
                          <div key={type} style={{ marginBottom: '32px' }}>
                            <div style={{ 
                              fontSize: '14px', 
                              fontWeight: 'bold', 
                              marginBottom: '12px',
                              textAlign: 'center'
                            }}>
                              <Tag color={type === 'product' ? 'blue' : type === 'category' ? 'green' : 'orange'}>
                                {type} ({stats.count} pages)
                              </Tag>
                            </div>
                            
                            {distribution.filter(d => d.count > 0).map(item => {
                              const barWidth = maxCount > 0 ? (item.count / maxCount * 100) : 0;
                              return (
                                <div key={`${type}-${item.label}`} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                                  <span style={{ fontSize: '10px', color: '#666', width: '80px' }}>{item.label}</span>
                                  <div style={{ flex: 1, height: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px', overflow: 'hidden', marginRight: '8px' }}>
                                    <div style={{ 
                                      width: `${barWidth}%`,
                                      height: '100%',
                                      backgroundColor: item.color,
                                      borderRadius: '4px'
                                    }} />
                                  </div>
                                  <span style={{ fontSize: '10px', color: '#666', width: '20px', textAlign: 'right' }}>{item.count}</span>
                                </div>
                              );
                            })}
                          </div>
                        );
                        });
                      })()}
                    </div>
                  </Card>
                </Col>
              </Row>
              
              {/* Tableau récapitulatif combiné Pages + GSC */}
              <Row style={{ marginTop: 32 }}>
                <Col xs={24}>
                  <Card 
                    title={
                      <Space>
                        <BarChartOutlined />
                        Tableau Récapitulatif : Pages + Données GSC
                        {hasGSCData && (
                          <Tag color="green">
                            {combinedData?.filter(item => item.has_gsc_data).length || 0} pages avec GSC
                          </Tag>
                        )}
                      </Space>
                    }
                    extra={
                      <Space>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {combinedData?.length || 0} pages totales
                        </Text>
                        {!hasGSCData && (
                          <Button 
                            size="small"
                            icon={<GoogleOutlined />}
                            onClick={() => setGscImportModalVisible(true)}
                            style={{ borderColor: '#4285F4', color: '#4285F4' }}
                          >
                            Importer GSC
                          </Button>
                        )}
                      </Space>
                    }
                  >
                    {!hasGSCData && (
                      <Alert
                        message="Données GSC non disponibles"
                        description="Importez vos données Google Search Console pour voir les métriques de trafic dans ce tableau."
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                      />
                    )}
                    
                    <Table
                      columns={combinedColumns}
                      dataSource={combinedData}
                      loading={combinedLoading}
                      rowKey="id"
                      size="small"
                      scroll={{ x: 1000 }}
                      pagination={{
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) => 
                          `${range[0]}-${range[1]} sur ${total} pages`,
                        defaultPageSize: 20,
                        pageSizeOptions: ['10', '20', '50', '100']
                      }}
                      rowClassName={(record) => {
                        if (!hasGSCData) return '';
                        
                        // Highlight rows based on PageRank vs GSC performance
                        const avgPR = effectiveAnalysis?.average_pagerank || 0.001;
                        const hasHighTraffic = (record.gsc_traffic_score || 0) > 1000;
                        const hasLowPageRank = record.current_pagerank < avgPR * 0.5;
                        const hasHighPageRank = record.current_pagerank > avgPR * 2;
                        const hasLowTraffic = (record.gsc_traffic_score || 0) < 100;
                        
                        if (hasHighTraffic && hasLowPageRank) return 'opportunity-row'; // Opportunity
                        if (hasHighPageRank && hasLowTraffic && record.has_gsc_data) return 'underperforming-row'; // Underperforming
                        if (hasHighPageRank && hasHighTraffic) return 'balanced-row'; // Well balanced
                        
                        return '';
                      }}
                    />
                  </Card>
                </Col>
              </Row>
            </>
          )}
        </div>
      ),
    },
    {
      key: '2',
      label: '📄 Pages du site',
      children: (
        <div>
          {/* Alert de résumé */}
          <Alert
            message="Analyse détaillée des pages"
            description={
              <Space>
                <Text>Explorez les {pages?.length?.toLocaleString()} pages de votre site.</Text>
                <Text>Filtrez par performance, type ou potentiel d'amélioration.</Text>
              </Space>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          
          <Card title={
            <Space>
              <LinkOutlined />
              Toutes les pages ({pages?.length?.toLocaleString()})
            </Space>
          }>
            <Table
              columns={pageColumns}
              dataSource={pages}
              loading={pagesLoading}
              rowKey="id"
              size="small"
              scroll={{ x: 1200 }}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} sur ${total} pages`,
                defaultPageSize: 50,
                pageSizeOptions: ['20', '50', '100', '200']
              }}
            />
          </Card>
        </div>
      ),
    },
    {
      key: '3',
      label: '⚗️ Simulations',
      children: (
        <div>
          {/* Alert de résumé */}
          <Alert
            message="Historique des simulations"
            description={
              <Space>
                <Text>{simulations?.length || 0} simulations créées dont {advancedMetrics?.completedSimulations || 0} terminées.</Text>
                <Text>Testez l'impact de nouvelles stratégies de maillage.</Text>
              </Space>
            }
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
          />
          
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <Space>
              <Button 
                icon={<ExperimentOutlined />}
                onClick={() => setSimulationModalVisible(true)}
              >
                Simulation simple
              </Button>
              <Button 
                type="primary" 
                icon={<ThunderboltOutlined />}
                onClick={() => setSimulationModalVisible(true)}
              >
                Simulation avancée
              </Button>
            </Space>
          </div>
          
          <Card title={
            <Space>
              <ExperimentOutlined />
              Toutes les simulations ({simulations?.length || 0})
            </Space>
          }>
            <Table
              columns={simulationColumns}
              dataSource={simulations}
              rowKey="id"
              size="small"
              locale={{
                emptyText: (
                  <div style={{ padding: '40px', textAlign: 'center' }}>
                    <ExperimentOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: 16 }} />
                    <Text type="secondary">Aucune simulation créée</Text>
                    <br />
                    <Button 
                      type="primary" 
                      icon={<PlusOutlined />}
                      onClick={() => setSimulationModalVisible(true)}
                      style={{ marginTop: 8 }}
                    >
                      Créer votre première simulation
                    </Button>
                  </div>
                )
              }}
            />
          </Card>
        </div>
      ),
    },
    {
      key: '4',
      label: hasGSCData ? `📊 Analyse GSC (${totalUrls})` : '📊 Analyse GSC',
      children: (
        <div>
          {hasGSCData ? (
            <div>
              {/* Analyse GSC complète */}
              <GSCAnalysis 
                projectId={id} 
                onStartSimulation={() => setSimulationModalVisible(true)}
              />
              
              {/* Graphiques de corrélation */}
              <div style={{ marginTop: 32 }}>
                <Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>
                  📈 Graphiques de Corrélation Avancés
                </Title>
                <GSCCorrelationChart 
                  projectId={id}
                  pages={pages?.map(p => ({
                    id: p.id,
                    url: p.url,
                    current_pagerank: p.current_pagerank,
                    type: p.type || 'other'
                  }))}
                />
              </div>
            </div>
          ) : (
            <div>
              <Alert
                message="Données Google Search Console"
                description={
                  <Space>
                    <Text>Analysez la performance SEO réelle de vos pages.</Text>
                    <Text>Croisez PageRank et données GSC pour des insights précis.</Text>
                  </Space>
                }
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              
              {/* Placeholder for GSC analysis */}
              <div style={{ 
                textAlign: 'center', 
                padding: '60px',
                backgroundColor: '#fafafa',
                borderRadius: '8px',
                border: '2px dashed #d9d9d9'
              }}>
                <GoogleOutlined style={{ fontSize: '48px', color: '#4285F4', marginBottom: '16px' }} />
                <Title level={4} style={{ color: '#666' }}>
                  Importez vos données GSC pour voir l'analyse croisée
                </Title>
                <Text type="secondary">
                  Utilisez le bouton "Import GSC" pour commencer l'analyse.
                </Text>
                <br />
                <Button 
                  type="primary" 
                  icon={<GoogleOutlined />}
                  onClick={() => setGscImportModalVisible(true)}
                  style={{ marginTop: '16px', backgroundColor: '#4285F4', borderColor: '#4285F4' }}
                  size="large"
                >
                  Importer les données GSC
                </Button>
              </div>
            </div>
          )}
        </div>
      ),
    },
  ];

  if (!project) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {/* Breadcrumb */}
      <Breadcrumb 
        style={{ marginBottom: 16 }}
        items={[
          {
            href: '/',
            title: <HomeOutlined />
          },
          {
            href: '/projects',
            title: (
              <span>
                <ProjectOutlined />
                <span style={{ marginLeft: 4 }}>Projets</span>
              </span>
            )
          },
          {
            title: (
              <span>
                <TrophyOutlined />
                <span style={{ marginLeft: 4 }}>{project.name}</span>
              </span>
            )
          }
        ]}
      />

      {/* En-tête amélioré */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: 24,
        padding: '20px 0',
        borderBottom: '1px solid #f0f0f0'
      }}>
        <div style={{ flex: 1 }}>
          <Space align="start">
            <div>
              <Title level={2} style={{ margin: 0, marginBottom: 8 }}>
                <Space>
                  <ProjectOutlined />
                  {project.name}
                </Space>
              </Title>
              <Space direction="vertical" size={2}>
                <Text type="secondary" style={{ fontSize: '14px' }}>
                  <LinkOutlined /> {project.domain}
                </Text>
                <Space>
                  <Tag color="blue">
                    {project.total_pages?.toLocaleString()} pages
                  </Tag>
                  <Tag color="purple">
                    {simulations?.length || 0} simulations
                  </Tag>
                  {project.page_types && (
                    <Tooltip title={`Types: ${project.page_types.join(', ')}`}>
                      <Tag color="green">
                        {project.page_types.length} types
                      </Tag>
                    </Tooltip>
                  )}
                </Space>
              </Space>
            </div>
          </Space>
        </div>
        
        <Space>
          <Button 
            icon={<GoogleOutlined />}
            onClick={() => setGscImportModalVisible(true)}
            style={{ borderColor: '#4285F4', color: '#4285F4' }}
          >
            Import GSC
          </Button>
          <Button 
            icon={<BarChartOutlined />}
            onClick={handleCalculatePagerank}
            loading={calculatePagerank.isPending}
            style={{ borderColor: '#52c41a', color: '#52c41a' }}
          >
            Calculer PageRank
          </Button>
          <Button 
            type="primary" 
            icon={<ThunderboltOutlined />}
            onClick={() => setSimulationModalVisible(true)}
            size="large"
          >
            Nouvelle simulation
          </Button>
        </Space>
      </div>

      <Tabs 
        items={tabItems}
        size="large" 
        tabBarStyle={{ 
          marginBottom: 24,
          borderBottom: '2px solid #f0f0f0'
        }}
      />

      <MultiRuleSimulationModal
        visible={simulationModalVisible}
        projectId={id}
        projectTypes={project?.page_types || []}
        onCancel={() => setSimulationModalVisible(false)}
      />

      <GSCImportModal
        visible={gscImportModalVisible}
        projectId={id}
        onCancel={() => setGscImportModalVisible(false)}
        onSuccess={() => {
          // Optionally refresh data after successful import
          console.log('GSC data imported successfully');
        }}
      />
    </div>
  );
};

export default ProjectDetail;