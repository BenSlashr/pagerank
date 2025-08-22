import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Typography, 
  Card, 
  Row, 
  Col, 
  Table,
  Tag,
  Button,
  Space,
  Breadcrumb,
  Alert
} from 'antd';
import { 
  HomeOutlined,
  ProjectOutlined,
  ExperimentOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useSimulation } from '../hooks/useSimulations';
import { useSimulationAnalysis } from '../hooks/useAnalysis';
import { useGSCData } from '../hooks/useGSC';
import { exportApi } from '../services/api';
import type { SimulationResult } from '../types';

const { Title, Text } = Typography;

const SimulationDetail: React.FC = () => {
  const { simulationId } = useParams<{ simulationId: string }>();
  const id = parseInt(simulationId || '0');
  const queryClient = useQueryClient();
  const [renderKey, setRenderKey] = useState(0);
  
  // Force cache invalidation when simulationId changes
  useEffect(() => {
    console.log('SimulationDetail: ID changed, invalidating cache for:', id);
    queryClient.clear(); // Clear ALL cache
    setRenderKey(prev => prev + 1); // Force re-render
  }, [id, queryClient]);
  
  const { data: simulationData, isLoading } = useSimulation(id);
  const { data: analysis } = useSimulationAnalysis(id);
  
  // Get project ID from simulation data to fetch GSC data
  console.log('📊 Full simulation data:', simulationData?.simulation);
  console.log('📊 Simulation keys:', Object.keys(simulationData?.simulation || {}));
  const projectId = simulationData?.simulation?.id;
  console.log('📊 SimulationDetail - ProjectID for GSC:', projectId);
  const { data: gscSummary } = useGSCData(projectId || 0);
  console.log('📊 SimulationDetail - GSC Summary:', gscSummary);
  
  // Debug logging
  console.log('SimulationDetail render:', { 
    simulationId, 
    id, 
    simulationDataId: simulationData?.simulation?.id,
    simulationName: simulationData?.simulation?.name,
    ruleName: simulationData?.simulation?.rules?.[0]?.selection_method || 'Unknown',
    resultsCount: simulationData?.results?.length,
    gscDataCount: gscSummary?.data?.length || 0,
    gscTotalUrls: gscSummary?.total_urls || 0
  });

  // Debug GSC matching
  if (simulationData?.results && gscSummary?.data) {
    const simulationUrls = simulationData.results.slice(0, 5).map(r => r.url);
    const gscUrls = gscSummary.data.slice(0, 5).map(g => g.url);
    console.log('URL matching debug:', {
      simulationUrls,
      gscUrls,
      matches: simulationUrls.filter(sUrl => gscSummary.data.some(g => g.url === sUrl))
    });
  }

  const handleExport = async (type: 'csv' | 'plan') => {
    try {
      const response = type === 'csv' 
        ? await exportApi.exportSimulationCSV(id)
        : await exportApi.exportImplementationPlan(id);
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 
        type === 'csv' 
          ? `simulation_${id}_results.csv`
          : `simulation_${id}_implementation_plan.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  
  // Prepare type impact data
  const typeImpactData = React.useMemo(() => {
    if (!analysis?.type_impact) return [];
    
    return Object.entries(analysis.type_impact).map(([type, impact]: [string, any]) => ({
      type,
      average_delta: impact.average_delta,
      positive_count: impact.positive_count,
      negative_count: impact.negative_count,
      count: impact.count,
    }));
  }, [analysis]);

  if (isLoading || !simulationData) {
    return <div>Loading...</div>;
  }

  const { simulation, results } = simulationData;

  const resultColumns: ColumnsType<SimulationResult> = [
    {
      title: 'Priorité',
      key: 'priority',
      width: 80,
      render: (_, record) => {
        if (record.percent_change > 10) return <Tag color="red">🔥 HAUTE</Tag>
        if (record.percent_change > 5) return <Tag color="orange">⭐ MOYENNE</Tag>
        if (record.percent_change > 1) return <Tag color="blue">📋 BASSE</Tag>
        if (record.percent_change < -10) return <Tag color="volcano">⚠️ RISQUE</Tag>
        return <Tag color="default">➖ NEUTRE</Tag>
      },
      filters: [
        { text: '🔥 Haute priorité (+10%)', value: 'high' },
        { text: '⭐ Moyenne priorité (+5%)', value: 'medium' },
        { text: '⚠️ Pages à risque (-10%)', value: 'risk' },
      ],
      onFilter: (value, record) => {
        if (value === 'high') return record.percent_change > 10
        if (value === 'medium') return record.percent_change > 5 && record.percent_change <= 10
        if (value === 'risk') return record.percent_change < -10
        return false
      },
    },
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
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      filters: [
        { text: 'Produit', value: 'produit' },
        { text: 'Catégorie', value: 'catégorie' },
        { text: 'Blog', value: 'blog' },
      ],
      onFilter: (value, record) => record.type === value,
      render: (type: string | null) => (
        <Tag color={
          type === 'produit' ? 'blue' :
          type === 'catégorie' ? 'green' :
          type === 'blog' ? 'orange' : 'default'
        }>
          {type || 'autre'}
        </Tag>
      ),
    },
    {
      title: 'Impact SEO',
      dataIndex: 'percent_change',
      key: 'percent_change',
      sorter: (a, b) => Math.abs(b.percent_change) - Math.abs(a.percent_change),
      render: (value: number) => (
        <span style={{ 
          color: value > 0 ? '#52c41a' : value < 0 ? '#ff4d4f' : '#666',
          fontWeight: 'bold',
          fontSize: '14px'
        }}>
          {value > 0 && '+'}
          {value.toFixed(1)}%
        </span>
      ),
    },
    {
      title: 'PR Actuel',
      dataIndex: 'current_pagerank',
      key: 'current_pagerank',
      sorter: (a, b) => a.current_pagerank - b.current_pagerank,
      width: 120,
      render: (value: number) => (
        <span style={{ fontSize: '11px', color: '#666' }}>
          {value.toFixed(6)}
        </span>
      ),
    },
    {
      title: 'PR Nouveau',
      dataIndex: 'new_pagerank',
      key: 'new_pagerank',
      sorter: (a, b) => a.new_pagerank - b.new_pagerank,
      width: 120,
      render: (value: number, record) => (
        <span style={{ 
          fontSize: '11px', 
          color: record.percent_change > 0 ? '#52c41a' : record.percent_change < 0 ? '#ff4d4f' : '#666',
          fontWeight: 'bold'
        }}>
          {value.toFixed(6)}
        </span>
      ),
    },
    {
      title: '🔍 DEBUG Impressions GSC',
      key: 'gsc_impressions',
      width: 110,
      sorter: (a, b) => {
        const gscData = gscSummary?.data || [];
        const aGSC = gscData.find((item: any) => item.url === a.url);
        const bGSC = gscData.find((item: any) => item.url === b.url);
        return (aGSC?.impressions || 0) - (bGSC?.impressions || 0);
      },
      render: (_, record) => {
        const gscData = gscSummary?.data || [];
        const gscItem = gscData.find((item: any) => item.url === record.url);
        const impressions = gscItem?.impressions || 0;
        
        // Debug for first few rows
        if (gscData.length > 0 && Math.random() < 0.1) {
          console.log('GSC matching debug for impressions:', {
            recordUrl: record.url,
            gscDataLength: gscData.length,
            gscItem: gscItem,
            impressions: impressions,
            firstGscUrl: gscData[0]?.url
          });
        }
        
        return (
          <Text style={{ 
            fontSize: '11px', 
            color: impressions > 0 ? '#1890ff' : '#d9d9d9',
            fontWeight: impressions > 1000 ? 'bold' : 'normal'
          }}>
            {impressions > 0 ? impressions.toLocaleString() : '-'}
          </Text>
        );
      },
    },
    {
      title: 'Clics GSC',
      key: 'gsc_clicks',
      width: 90,
      sorter: (a, b) => {
        const gscData = gscSummary?.data || [];
        const aGSC = gscData.find((item: any) => item.url === a.url);
        const bGSC = gscData.find((item: any) => item.url === b.url);
        return (aGSC?.clicks || 0) - (bGSC?.clicks || 0);
      },
      render: (_, record) => {
        const gscData = gscSummary?.data || [];
        const gscItem = gscData.find((item: any) => item.url === record.url);
        const clicks = gscItem?.clicks || 0;
        
        return (
          <Text style={{ 
            fontSize: '11px', 
            color: clicks > 0 ? '#52c41a' : '#d9d9d9',
            fontWeight: clicks > 50 ? 'bold' : 'normal'
          }}>
            {clicks > 0 ? clicks.toLocaleString() : '-'}
          </Text>
        );
      },
    },
    {
      title: 'Position GSC',
      key: 'gsc_position',
      width: 100,
      sorter: (a, b) => {
        const gscData = gscSummary?.data || [];
        const aGSC = gscData.find((item: any) => item.url === a.url);
        const bGSC = gscData.find((item: any) => item.url === b.url);
        return (aGSC?.position || 999) - (bGSC?.position || 999);
      },
      render: (_, record) => {
        const gscData = gscSummary?.data || [];
        const gscItem = gscData.find((item: any) => item.url === record.url);
        const position = gscItem?.position || 0;
        
        if (!position) return <Text style={{ color: '#d9d9d9' }}>-</Text>;
        
        return (
          <Tag color={
            position <= 3 ? 'red' :
            position <= 10 ? 'orange' :
            position <= 20 ? 'blue' : 'default'
          }>
            #{position.toFixed(1)}
          </Tag>
        );
      },
    },
    {
      title: (
        <span style={{ fontSize: '11px' }}>
          Score Valeur GSC
        </span>
      ),
      key: 'gsc_traffic_score',
      width: 110,
      sorter: (a, b) => {
        const gscData = gscSummary?.data || [];
        const aGSC = gscData.find((item: any) => item.url === a.url);
        const bGSC = gscData.find((item: any) => item.url === b.url);
        const aScore = aGSC ? (aGSC.impressions + (aGSC.clicks * 10)) : 0;
        const bScore = bGSC ? (bGSC.impressions + (bGSC.clicks * 10)) : 0;
        return aScore - bScore;
      },
      render: (_, record) => {
        const gscData = gscSummary?.data || [];
        const gscItem = gscData.find((item: any) => item.url === record.url);
        const score = gscItem ? (gscItem.impressions + (gscItem.clicks * 10)) : 0;
        
        return (
          <Text style={{ 
            fontSize: '11px', 
            fontWeight: 'bold',
            color: score > 1000 ? '#fa8c16' : score > 100 ? '#52c41a' : score > 0 ? '#1890ff' : '#d9d9d9'
          }}>
            {score > 0 ? score.toLocaleString() : '-'}
          </Text>
        );
      },
    },
  ];

  return (
    <div key={`simulation-${simulation.id}-${renderKey}`} style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <Breadcrumb style={{ marginBottom: 24 }}>
        <Breadcrumb.Item>
          <Link to="/"><HomeOutlined /></Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to={`/projects/${simulation.id}`}>
            <ProjectOutlined /> Project
          </Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <ExperimentOutlined /> {simulation.name}
        </Breadcrumb.Item>
      </Breadcrumb>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 32 
      }}>
        <div>
          <Title key={`title-${simulation.id}`} level={2} style={{ margin: 0, marginBottom: 8 }}>
            {simulation.name}
          </Title>
          <Space key={`status-space-${simulation.id}-${renderKey}`}>
            <Tag 
              key={`status-tag-${simulation.id}-${renderKey}`}
              color={
                simulation.status === 'completed' ? 'green' :
                simulation.status === 'running' ? 'blue' :
                simulation.status === 'failed' ? 'red' : 'default'
              }
            >
              {simulation.status}
            </Tag>
            <Text key={`created-text-${simulation.id}-${renderKey}`} type="secondary">
              Created: {new Date(simulation.created_at).toLocaleString()}
            </Text>
          </Space>
        </div>
        
        <Space>
          <Button 
            icon={<DownloadOutlined />}
            disabled={simulation.status !== 'completed'}
            onClick={() => handleExport('csv')}
          >
            Export CSV
          </Button>
          <Button 
            type="primary"
            icon={<DownloadOutlined />}
            disabled={simulation.status !== 'completed'}
            onClick={() => handleExport('plan')}
          >
            Implementation Plan
          </Button>
        </Space>
      </div>

      {simulation.status !== 'completed' && (
        <Alert
          message={`Simulation is ${simulation.status}`}
          type={simulation.status === 'failed' ? 'error' : 'info'}
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Main Dashboard */}
      <Row key={`main-dashboard-${simulation.id}-${renderKey}`} gutter={[24, 24]} style={{ marginBottom: 32 }}>
        <Col xs={24} lg={12}>
          <Card title="📈 Répartition des gains et pertes" style={{ height: '400px', borderRadius: '12px' }}>
            <div style={{ padding: '20px' }}>
              {/* Graphique en barres horizontales */}
              <div style={{ height: '320px' }}>
                {(() => {
                  const data = [
                    { label: 'Gains significatifs (+5%)', count: results.filter(r => r.percent_change > 5).length, color: '#52c41a' },
                    { label: 'Gains modérés (0% à +5%)', count: results.filter(r => r.percent_change > 0 && r.percent_change <= 5).length, color: '#1890ff' },
                    { label: 'Pertes modérées (0% à -5%)', count: results.filter(r => r.percent_change < 0 && r.percent_change >= -5).length, color: '#ff9800' },
                    { label: 'Pertes importantes (-5% et plus)', count: results.filter(r => r.percent_change < -5).length, color: '#ff4d4f' }
                  ];
                  const maxCount = Math.max(...data.map(d => d.count));
                  const total = data.reduce((sum, d) => sum + d.count, 0);
                  
                  return data.map((item, index) => {
                    const percentage = total > 0 ? (item.count / total * 100) : 0;
                    const barWidth = maxCount > 0 ? (item.count / maxCount * 100) : 0;
                    
                    return (
                      <div key={index} style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '13px', color: '#666', flex: 1 }}>{item.label}</span>
                          <span style={{ fontSize: '16px', fontWeight: 'bold', color: item.color, minWidth: '50px', textAlign: 'right' }}>
                            {item.count}
                          </span>
                        </div>
                        <div style={{ position: 'relative', height: '20px', backgroundColor: '#f5f5f5', borderRadius: '10px', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              width: `${barWidth}%`,
                              height: '100%',
                              backgroundColor: item.color,
                              transition: 'width 0.3s ease',
                              borderRadius: '10px'
                            }}
                          />
                          <div style={{ 
                            position: 'absolute', 
                            top: '50%', 
                            right: '8px', 
                            transform: 'translateY(-50%)',
                            fontSize: '11px',
                            color: barWidth > 30 ? 'white' : '#666',
                            fontWeight: 'bold'
                          }}>
                            {percentage.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          {typeImpactData.length > 0 && (
            <Card title="📋 Impact par type de page" style={{ height: '400px', borderRadius: '12px' }}>
              <div style={{ height: '340px', overflowY: 'auto', padding: '12px' }}>
                {typeImpactData.map(typeData => {
                  const avgChange = (typeData.average_delta / (results.find(r => r.type === typeData.type)?.current_pagerank || 1)) * 100;
                  return (
                    <div key={typeData.type} style={{ 
                      padding: '10px', 
                      border: '1px solid #f0f0f0', 
                      borderRadius: '6px',
                      textAlign: 'center',
                      backgroundColor: avgChange > 0 ? '#f6ffed' : avgChange < 0 ? '#fff2f0' : '#fafafa',
                      marginBottom: '8px'
                    }}>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                        <Tag color={typeData.type === 'produit' ? 'blue' : typeData.type === 'catégorie' ? 'green' : 'orange'}>
                          {typeData.type}
                        </Tag>
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: avgChange > 0 ? '#52c41a' : avgChange < 0 ? '#ff4d4f' : '#666' }}>
                        {avgChange > 0 ? '+' : ''}{avgChange.toFixed(1)}%
                      </div>
                      <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>Impact moyen</div>
                      <div style={{ fontSize: '9px', color: '#999', marginTop: '2px' }}>
                        {typeData.positive_count} gains • {typeData.negative_count} pertes
                      </div>
                      {avgChange > 5 && typeData.type === 'blog' && (
                        <div style={{ fontSize: '8px', color: '#52c41a', marginTop: '2px', fontWeight: 'bold' }}>
                          🎯 PRIORITÉ SEO
                        </div>
                      )}
                      {avgChange > 3 && (typeData.type === 'catégorie' || typeData.type === 'category') && (
                        <div style={{ fontSize: '8px', color: '#1890ff', marginTop: '2px', fontWeight: 'bold' }}>
                          📈 BON SIGNAL
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </Col>
      </Row>
      
      <Row key={`analysis-charts-${simulation.id}-${renderKey}`} gutter={[24, 24]} style={{ marginBottom: 32 }}>
        <Col xs={24} lg={12}>
          <Card title="📊 Analyse détaillée des changements" style={{ height: '600px', borderRadius: '12px' }}>
            <div style={{ height: '540px', padding: '20px', overflow: 'hidden' }}>
              {(() => {
                const ranges = [
                  { min: 20, max: Infinity, label: '+20% et plus', color: '#1f5582' },
                  { min: 10, max: 20, label: '+10% à +20%', color: '#389e0d' },
                  { min: 5, max: 10, label: '+5% à +10%', color: '#52c41a' },
                  { min: 1, max: 5, label: '+1% à +5%', color: '#95de64' },
                  { min: 0, max: 1, label: '0% à +1%', color: '#b7eb8f' },
                  { min: -1, max: 0, label: '0% à -1%', color: '#ffd591' },
                  { min: -5, max: -1, label: '-1% à -5%', color: '#ffb37d' },
                  { min: -10, max: -5, label: '-5% à -10%', color: '#ff7875' },
                  { min: -20, max: -10, label: '-10% à -20%', color: '#ff4d4f' },
                  { min: -Infinity, max: -20, label: '-20% et moins', color: '#a8071a' },
                ];
                
                const dataForChart = ranges.map(range => {
                  const count = results.filter(r => {
                    if (range.min === -Infinity) return r.percent_change < range.max;
                    if (range.max === Infinity) return r.percent_change >= range.min;
                    return r.percent_change >= range.min && r.percent_change < range.max;
                  }).length;
                  return { ...range, count };
                }).filter(item => item.count > 0);
                
                const maxCount = Math.max(...dataForChart.map(d => d.count));
                const totalPages = dataForChart.reduce((sum, d) => sum + d.count, 0);
                
                // Calculer la hauteur disponible et l'espacement
                const availableHeight = 500; // hauteur totale disponible
                const itemHeight = 32; // hauteur estimée par item (texte + barre + marge)
                const maxDisplayItems = Math.floor(availableHeight / itemHeight);
                const itemsToShow = Math.min(dataForChart.length, maxDisplayItems);
                const displayItems = dataForChart.slice(0, itemsToShow);
                
                return (
                  <div style={{ 
                    height: '100%', 
                    padding: '10px 0', 
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    overflow: 'hidden'
                  }}>
                    {displayItems.map((item, index) => {
                      const percentage = totalPages > 0 ? (item.count / totalPages * 100) : 0;
                      const barWidth = Math.min(maxCount > 0 ? (item.count / maxCount * 100) : 0, 100);
                      
                      return (
                        <div key={item.label} style={{ 
                          marginBottom: index < displayItems.length - 1 ? '16px' : '8px',
                          minHeight: '28px',
                          flex: '0 0 auto'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '500', color: '#333', flex: 1 }}>{item.label}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '14px', fontWeight: 'bold', color: item.color, minWidth: '35px', textAlign: 'right' }}>
                                {item.count}
                              </span>
                              <span style={{ fontSize: '10px', color: '#666', minWidth: '35px', textAlign: 'right' }}>
                                {percentage.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <div style={{ 
                            position: 'relative', 
                            height: '10px', 
                            backgroundColor: '#f5f5f5', 
                            borderRadius: '5px', 
                            overflow: 'hidden',
                            width: '100%'
                          }}>
                            <div 
                              style={{ 
                                width: `${barWidth}%`,
                                height: '100%',
                                background: `linear-gradient(90deg, ${item.color}, ${item.color}dd)`,
                                transition: 'width 0.6s ease',
                                borderRadius: '5px'
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {dataForChart.length > itemsToShow && (
                      <div style={{ 
                        fontSize: '10px', 
                        color: '#999', 
                        textAlign: 'center', 
                        marginTop: '8px',
                        fontStyle: 'italic'
                      }}>
                        +{dataForChart.length - itemsToShow} autres tranches masquées
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="📊 Répartition des pages par niveau de PageRank" style={{ height: '600px', borderRadius: '12px' }}>
            <div style={{ height: '540px', padding: '20px', overflowY: 'auto' }}>
              <div style={{ 
                backgroundColor: '#f0f8ff', 
                padding: '12px', 
                borderRadius: '8px', 
                marginBottom: '16px',
                fontSize: '12px',
                color: '#1890ff'
              }}>
                💡 <strong>Comment lire ce graphique :</strong> Les pages sont classées en 5 niveaux selon leur PageRank. 
                Comparez avant/après pour voir les changements dans chaque type de page.
              </div>
              
              {(() => {
                // Group results by type
                const typeGroups: Record<string, { current: number[], new: number[] }> = {};
                results.forEach(result => {
                  const type = result.type || 'autre';
                  if (!typeGroups[type]) {
                    typeGroups[type] = { current: [], new: [] };
                  }
                  typeGroups[type].current.push(result.current_pagerank);
                  typeGroups[type].new.push(result.new_pagerank);
                });

                // Calculer les percentiles GLOBAUX (seuils adaptatifs)
                const allPageRanks = results
                  .flatMap(r => [r.current_pagerank, r.new_pagerank])
                  .filter(pr => pr > 0)
                  .sort((a, b) => b - a);
                
                // Seuils adaptatifs basés sur percentiles
                const p95 = allPageRanks[Math.floor(0.05 * allPageRanks.length)] || 0;
                const p80 = allPageRanks[Math.floor(0.20 * allPageRanks.length)] || 0;
                const p50 = allPageRanks[Math.floor(0.50 * allPageRanks.length)] || 0;
                const p20 = allPageRanks[Math.floor(0.80 * allPageRanks.length)] || 0;

                // Créer 5 niveaux clairs
                const levels = [
                  { 
                    name: "🔥 Très Fort", 
                    min: p95, max: Infinity, 
                    color: '#722ed1',
                    description: "Top 5% - Pages les plus puissantes"
                  },
                  { 
                    name: "💪 Fort", 
                    min: p80, max: p95, 
                    color: '#1890ff',
                    description: "Top 20% - Pages influentes" 
                  },
                  { 
                    name: "👍 Moyen", 
                    min: p50, max: p80, 
                    color: '#52c41a',
                    description: "Top 50% - Pages standards"
                  },
                  { 
                    name: "📉 Faible", 
                    min: p20, max: p50, 
                    color: '#faad14',
                    description: "Pages à améliorer"
                  },
                  { 
                    name: "🔻 Très Faible", 
                    min: 0, max: p20, 
                    color: '#ff7875',
                    description: "Bottom 20% - Pages en difficulté"
                  }
                ].filter(level => level.min < level.max || level.max === Infinity);
                
                return Object.entries(typeGroups).map(([type, data]: [string, any]) => {
                  // Calculer la distribution avant/après
                  const beforeCounts = levels.map(level => ({
                    ...level,
                    count: data.current.filter((pr: number) => {
                      if (level.max === Infinity) return pr >= level.min;
                      return pr >= level.min && pr < level.max;
                    }).length
                  }));
                  
                  const afterCounts = levels.map(level => ({
                    ...level,
                    count: data.new.filter((pr: number) => {
                      if (level.max === Infinity) return pr >= level.min;
                      return pr >= level.min && pr < level.max;
                    }).length
                  }));
                  
                  const maxCount = Math.max(
                    Math.max(...beforeCounts.map(l => l.count)),
                    Math.max(...afterCounts.map(l => l.count))
                  );
                  
                  const totalPages = data.current.length;
                  
                  return (
                    <div key={type} style={{ marginBottom: '32px' }}>
                      <div style={{ 
                        fontSize: '16px', 
                        fontWeight: 'bold', 
                        marginBottom: '16px',
                        textAlign: 'center',
                        color: '#1f1f1f'
                      }}>
                        📋 {type.charAt(0).toUpperCase() + type.slice(1)} ({totalPages} pages)
                      </div>
                      
                      {levels.map((level, index) => {
                        const beforeCount = beforeCounts[index]?.count || 0;
                        const afterCount = afterCounts[index]?.count || 0;
                        
                        if (beforeCount === 0 && afterCount === 0) return null;
                        
                        const beforePct = totalPages > 0 ? (beforeCount / totalPages * 100) : 0;
                        const afterPct = totalPages > 0 ? (afterCount / totalPages * 100) : 0;
                        const change = afterCount - beforeCount;
                        
                        return (
                          <div key={level.name} style={{ marginBottom: '16px' }}>
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              marginBottom: '8px'
                            }}>
                              <div style={{ 
                                fontSize: '13px', 
                                fontWeight: '600', 
                                color: level.color 
                              }}>
                                {level.name}
                              </div>
                              <div style={{ fontSize: '11px', color: '#666' }}>
                                {level.description}
                              </div>
                            </div>
                            
                            <div style={{ 
                              display: 'grid', 
                              gridTemplateColumns: '1fr 1fr', 
                              gap: '12px',
                              alignItems: 'center'
                            }}>
                              {/* Avant */}
                              <div>
                                <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>
                                  Avant: {beforeCount} pages ({beforePct.toFixed(1)}%)
                                </div>
                                <div style={{ 
                                  height: '12px', 
                                  backgroundColor: '#f5f5f5', 
                                  borderRadius: '6px',
                                  overflow: 'hidden'
                                }}>
                                  <div style={{ 
                                    width: `${maxCount > 0 ? (beforeCount / maxCount * 100) : 0}%`,
                                    height: '100%',
                                    backgroundColor: '#d9d9d9',
                                    borderRadius: '6px'
                                  }} />
                                </div>
                              </div>
                              
                              {/* Après */}
                              <div>
                                <div style={{ 
                                  fontSize: '10px', 
                                  color: '#666', 
                                  marginBottom: '4px',
                                  display: 'flex',
                                  justifyContent: 'space-between'
                                }}>
                                  <span>Après: {afterCount} pages ({afterPct.toFixed(1)}%)</span>
                                  {change !== 0 && (
                                    <span style={{ 
                                      color: change > 0 ? '#52c41a' : '#ff4d4f',
                                      fontWeight: 'bold'
                                    }}>
                                      {change > 0 ? '+' : ''}{change}
                                    </span>
                                  )}
                                </div>
                                <div style={{ 
                                  height: '12px', 
                                  backgroundColor: '#f5f5f5', 
                                  borderRadius: '6px',
                                  overflow: 'hidden'
                                }}>
                                  <div style={{ 
                                    width: `${maxCount > 0 ? (afterCount / maxCount * 100) : 0}%`,
                                    height: '100%',
                                    backgroundColor: level.color,
                                    borderRadius: '6px'
                                  }} />
                                </div>
                              </div>
                            </div>
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

      {/* Action Plan */}
      <Card 
        key={`action-plan-${simulation.id}-${renderKey}`} 
        title={
          <Space>
            🚀 Plan d'action SEO
            {gscSummary && gscSummary.total_urls > 0 && (
              <Tag color="green">
                {results.filter(r => {
                  const gscData = gscSummary.data || [];
                  return gscData.some((item: any) => item.url === r.url);
                }).length} pages avec GSC
              </Tag>
            )}
          </Space>
        } 
        style={{ borderRadius: '12px' }}>
        <Table
          key={`actionable-table-${simulation.id}-${renderKey}`}
          columns={resultColumns}
          dataSource={results.filter(r => Math.abs(r.percent_change) > 0.1)} // Show more pages with minimal change
          rowKey="page_id"
          size="small"
          scroll={{ x: 1320 }} // Add horizontal scroll for GSC columns (removed GSC Status column)
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} sur ${total} pages avec changements détectables`,
            defaultPageSize: 100, // Show 100 pages by default
          }}
        />
      </Card>
    </div>
  );
};

export default SimulationDetail;