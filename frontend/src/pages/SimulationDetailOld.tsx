import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Typography, 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Table, 
  Tag,
  Button,
  Space,
  Breadcrumb,
  Alert
} from 'antd';
import { 
  ArrowUpOutlined, 
  ArrowDownOutlined,
  HomeOutlined,
  ProjectOutlined,
  ExperimentOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useSimulation } from '../hooks/useSimulations';
import { useSimulationAnalysis } from '../hooks/useAnalysis';
import { exportApi } from '../services/api';
import { PageRankDistribution } from '../components/charts/PageRankDistribution';
import { DeltaChart } from '../components/charts/DeltaChart';
import { TypeImpactChart } from '../components/charts/TypeImpactChart';
import type { SimulationResult } from '../types';

const { Title, Text, Paragraph } = Typography;

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
  
  // Debug logging
  console.log('SimulationDetail render:', { 
    simulationId, 
    id, 
    simulationDataId: simulationData?.simulation?.id,
    simulationName: simulationData?.simulation?.name,
    ruleName: simulationData?.simulation?.rule_config?.rule_name,
    resultsCount: simulationData?.results?.length 
  });

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

  const resultColumns: ColumnsType<SimulationResult> = [
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
      title: 'Current PR',
      dataIndex: 'current_pagerank',
      key: 'current_pagerank',
      sorter: (a, b) => a.current_pagerank - b.current_pagerank,
      render: (value: number) => value.toFixed(6),
    },
    {
      title: 'New PR',
      dataIndex: 'new_pagerank',
      key: 'new_pagerank',
      sorter: (a, b) => a.new_pagerank - b.new_pagerank,
      render: (value: number) => value.toFixed(6),
    },
    {
      title: 'Delta',
      dataIndex: 'pagerank_delta',
      key: 'pagerank_delta',
      sorter: (a, b) => a.pagerank_delta - b.pagerank_delta,
      render: (value: number) => (
        <span style={{ 
          color: value > 0 ? '#52c41a' : value < 0 ? '#ff4d4f' : '#666',
          fontWeight: 'bold'
        }}>
          {value > 0 && '+'}
          {value.toFixed(6)}
        </span>
      ),
    },
    {
      title: 'Change %',
      dataIndex: 'percent_change',
      key: 'percent_change',
      sorter: (a, b) => a.percent_change - b.percent_change,
      render: (value: number) => (
        <span style={{ 
          color: value > 0 ? '#52c41a' : value < 0 ? '#ff4d4f' : '#666',
          fontWeight: 'bold'
        }}>
          {value > 0 && '+'}
          {value.toFixed(2)}%
        </span>
      ),
    },
  ];

  // Process data for charts
  const chartData = simulationData?.results || [];
  
  // Prepare distribution data
  const distributionData = React.useMemo(() => {
    if (!chartData.length) return [];
    
    const ranges = [
      { min: 0, max: 0.001, label: '0-0.001' },
      { min: 0.001, max: 0.005, label: '0.001-0.005' },
      { min: 0.005, max: 0.01, label: '0.005-0.01' },
      { min: 0.01, max: 0.05, label: '0.01-0.05' },
      { min: 0.05, max: Infinity, label: '0.05+' },
    ];
    
    return ranges.map(range => {
      const currentCount = chartData.filter(
        item => item.current_pagerank > range.min && item.current_pagerank <= range.max
      ).length;
      
      const newCount = chartData.filter(
        item => item.new_pagerank > range.min && item.new_pagerank <= range.max
      ).length;
      
      return {
        range: range.label,
        current: currentCount,
        new: newCount,
      };
    });
  }, [chartData]);

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

  return (
    <div key={`simulation-${simulation.id}-${renderKey}`}>
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item>
          <Link to="/"><HomeOutlined /></Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to={`/projects/${simulation.project_id}`}>
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
        marginBottom: 24 
      }}>
        <div>
          <Title key={`title-${simulation.id}`} level={2}>{simulation.name}</Title>
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


      {/* Simple Overview */}
      <Row key={`overview-${simulation.id}-${renderKey}`} gutter={[24, 24]} style={{ marginBottom: 32 }}>
        <div style={{ padding: '8px 0' }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: 8 }}>
              {simulation.rule_config?.rule_name === 'same_category' && '🔗 Liens internes par catégorie'}
              {simulation.rule_config?.rule_name === 'cross_sell' && '🎯 Cross-selling entre catégories'}
              {simulation.rule_config?.rule_name === 'popular_products' && '⭐ Boost des produits populaires'}
              {simulation.rule_config?.rule_name === 'menu_modification' && '🧭 Modification du menu principal'}
              {simulation.rule_config?.rule_name === 'footer_modification' && '🦶 Modification des liens footer'}
              {!simulation.rule_config?.rule_name && '❓ Règle non définie'}
            </div>
          </div>
          
          {simulation.rule_config?.rule_name && (
            <div style={{ 
              backgroundColor: '#f6ffed', 
              padding: '12px', 
              borderRadius: '6px',
              border: '1px solid #b7eb8f',
              marginBottom: 16 
            }}>
              {simulation.rule_config.rule_name === 'same_category' && (
                <div style={{ fontSize: '14px' }}>
                  <strong>Objectif SEO:</strong> Renforcer les silos thématiques en créant des liens entre pages similaires.
                  <br /><strong>Impact attendu:</strong> Amélioration du PageRank des pages de niche et meilleure crawlabilité.
                </div>
              )}
              
              {simulation.rule_config.rule_name === 'cross_sell' && (
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: 8 }}>🎯 Cross-selling entre catégories</div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    Cette simulation a créé des liens entre produits de différentes catégories pour générer des ventes croisées.
                    {simulation.rule_config.source_filter?.type && (
                      <> Pages source: <Tag size="small">{simulation.rule_config.source_filter.type}</Tag></>
                    )}
                  </div>
                </div>
              )}
              
              {simulation.rule_config.rule_name === 'popular_products' && (
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: 8 }}>⭐ Boost des produits populaires</div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    Cette simulation a créé des liens vers les produits avec le meilleur PageRank pour mettre en avant les best-sellers.
                    {simulation.rule_config.source_filter?.type && (
                      <> Pages source: <Tag size="small">{simulation.rule_config.source_filter.type}</Tag></>
                    )}
                  </div>
                </div>
              )}
              
              {simulation.rule_config.rule_name === 'menu_modification' && (
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
                    🧭 Modification du menu principal
                    {simulation.rule_config.source_filter?.action === 'add' ? ' (Ajout)' : ' (Suppression)'}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    Cette simulation a {simulation.rule_config.source_filter?.action === 'add' ? 'ajouté' : 'retiré'} {' '}
                    {simulation.rule_config.source_filter?.target_urls?.length || 0} page(s) {simulation.rule_config.source_filter?.action === 'add' ? 'au' : 'du'} menu principal.
                    {simulation.rule_config.source_filter?.target_urls && (
                      <div style={{ marginTop: 8 }}>
                        Pages concernées: {simulation.rule_config.source_filter.target_urls.slice(0, 3).map((url: string, index: number) => (
                          <Tag key={index} size="small" style={{ marginBottom: 4 }}>{url}</Tag>
                        ))}
                        {simulation.rule_config.source_filter.target_urls.length > 3 && (
                          <Tag size="small">+{simulation.rule_config.source_filter.target_urls.length - 3} autres</Tag>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {simulation.rule_config.rule_name === 'footer_modification' && (
                <div style={{ fontSize: '14px' }}>
                  <strong>Objectif SEO:</strong> {simulation.rule_config.source_filter?.action === 'add' ? 'Ajouter des liens footer pour booster certaines pages' : 'Supprimer des liens footer peu utiles (ex: mentions légales)'}.
                  <br /><strong>Impact attendu:</strong> {simulation.rule_config.source_filter?.action === 'add' ? 'Légère amélioration du PageRank (position footer = faible valeur SEO)' : 'Redistribution du PageRank vers des pages plus importantes'}.
                  <br /><strong>Pages concernées:</strong> {simulation.rule_config.source_filter?.target_urls?.length || 0} URL(s) {simulation.rule_config.source_filter?.action === 'add' ? 'ajoutées au' : 'retirées du'} footer
                  {analysis && (
                    <><br /><strong>Résultat:</strong> <span style={{ color: '#52c41a' }}>{analysis.pages_improved} pages +</span> / <span style={{ color: '#ff4d4f' }}>{analysis.pages_degraded} pages -</span></>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Configuration technique simplifiée */}
          <div style={{ 
            fontSize: '12px', 
            color: '#999',
            backgroundColor: '#fafafa',
            padding: '12px',
            borderRadius: '6px',
            border: '1px solid #e8e8e8',
            marginTop: 8
          }}>
            <strong>Paramètres:</strong> {simulation.rule_config?.links_count || 8} liens/page • 
            {simulation.rule_config?.bidirectional ? 'Bidirectionnel' : 'Unidirectionnel'} • 
            Position: {simulation.rule_config?.link_position === 'header' && 'En-tête'}
            {simulation.rule_config?.link_position === 'content_top' && 'Début contenu'}
            {simulation.rule_config?.link_position === 'content' && 'Milieu contenu'}
            {simulation.rule_config?.link_position === 'content_bottom' && 'Fin contenu'}
            {simulation.rule_config?.link_position === 'sidebar' && 'Sidebar'}
            {simulation.rule_config?.link_position === 'footer' && 'Footer'}
            {!simulation.rule_config?.link_position && 'Milieu contenu'}
          </div>
        </div>
      </Card>

      {analysis && (
        <Row key={`seo-metrics-${simulation.id}-${renderKey}`} gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={8}>
            <Card key={`card-strategy-${simulation.id}-${renderKey}`} style={{ height: '100%' }}>
              <div style={{ textAlign: 'center' }}>
                {(() => {
                  // Analyze strategy by looking at high-impact gains vs losses
                  const majorGains = results.filter(r => r.percent_change > 5).length;
                  const majorLosses = results.filter(r => r.percent_change < -5).length;
                  const avgGainImpact = typeImpactData.length > 0 ? 
                    Math.max(...typeImpactData.map(t => {
                      const avgChange = results.filter(r => r.type === t.type).length > 0 ? 
                        (t.average_delta / (results.find(r => r.type === t.type)?.current_pagerank || 1)) * 100 : 0;
                      return avgChange;
                    })) : 0;
                  
                  const isStrategicWin = majorGains > majorLosses || avgGainImpact > 5;
                  const isGlobalWin = analysis.pages_improved > analysis.pages_degraded;
                  
                  return (
                    <>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: 8 }}>
                        {isStrategicWin ? '🎯' : isGlobalWin ? '✅' : '⚠️'}
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: isStrategicWin ? '#1890ff' : isGlobalWin ? '#52c41a' : '#ff4d4f', marginBottom: 4 }}>
                        {isStrategicWin ? 'STRATÉGIE CIBLÉE' : isGlobalWin ? 'RECOMMANDÉ' : 'À ÉVITER'}
                      </div>
                      {isStrategicWin && !isGlobalWin && (
                        <div style={{ fontSize: '12px', color: '#1890ff', marginBottom: 8 }}>
                          Gains ciblés sur pages prioritaires
                        </div>
                      )}
                      <div style={{ fontSize: '14px', color: '#666', marginTop: 8 }}>
                        {analysis.pages_improved} pages gagnantes vs {analysis.pages_degraded} perdantes
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: 8, color: majorGains > 0 ? '#52c41a' : '#666' }}>
                        {majorGains} pages avec gains &gt;5%
                      </div>
                    </>
                  );
                })()}
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card key={`card-impact-${simulation.id}-${renderKey}`} style={{ height: '100%' }}>
              <Statistic
                key={`stat-impact-${simulation.id}-${renderKey}`}
                title="📈 Pages à fort impact positif"
                value={results.filter(r => r.percent_change > 10).length}
                suffix={`/ ${results.length}`}
                valueStyle={{ color: '#1890ff' }}
              />
              <div style={{ fontSize: '12px', color: '#666', marginTop: 8 }}>
                Pages avec +10% ou plus de PageRank
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card key={`card-risk-${simulation.id}-${renderKey}`} style={{ height: '100%' }}>
              <Statistic
                key={`stat-risk-${simulation.id}-${renderKey}`}
                title="⚠️ Pages à risque"
                value={results.filter(r => r.percent_change < -10).length}
                suffix={`/ ${results.length}`}
                valueStyle={{ color: '#ff4d4f' }}
              />
              <div style={{ fontSize: '12px', color: '#666', marginTop: 8 }}>
                Pages perdant -10% ou plus de PageRank
              </div>
            </Card>
          </Col>
        </Row>
      )}

      <Row key={`seo-charts-${simulation.id}-${renderKey}`} gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={8}>
          <Card title="📈 Répartition des gains et pertes" style={{ height: '400px' }}>
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
        <Col xs={24} lg={8}>
          {typeImpactData.length > 0 && (
            <Card title="📋 Impact par type de page" style={{ height: '400px' }}>
              <div style={{ padding: '20px' }}>
                {typeImpactData.map(typeData => {
                  const avgChange = (typeData.average_delta / (results.find(r => r.type === typeData.type)?.current_pagerank || 1)) * 100;
                  return (
                    <div key={typeData.type} style={{ 
                      padding: '12px', 
                      border: '1px solid #f0f0f0', 
                      borderRadius: '6px',
                      textAlign: 'center',
                      backgroundColor: avgChange > 0 ? '#f6ffed' : avgChange < 0 ? '#fff2f0' : '#fafafa',
                      marginBottom: '12px'
                    }}>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '6px' }}>
                        <Tag size="small" color={typeData.type === 'produit' ? 'blue' : typeData.type === 'catégorie' ? 'green' : 'orange'}>
                          {typeData.type}
                        </Tag>
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: avgChange > 0 ? '#52c41a' : avgChange < 0 ? '#ff4d4f' : '#666' }}>
                        {avgChange > 0 ? '+' : ''}{avgChange.toFixed(1)}%
                      </div>
                      <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>Impact moyen</div>
                      <div style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>
                        {typeData.positive_count} gains • {typeData.negative_count} pertes
                      </div>
                      {avgChange > 5 && typeData.type === 'blog' && (
                        <div style={{ fontSize: '9px', color: '#52c41a', marginTop: '2px', fontWeight: 'bold' }}>
                          🎯 PRIORITÉ SEO
                        </div>
                      )}
                      {avgChange > 3 && (typeData.type === 'catégorie' || typeData.type === 'category') && (
                        <div style={{ fontSize: '9px', color: '#1890ff', marginTop: '2px', fontWeight: 'bold' }}>
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

      {/* Détail des changements par pourcentage */}
      <Card key={`percentage-breakdown-${simulation.id}-${renderKey}`} title="📊 Analyse détaillée des changements" style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
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
            
            return ranges.map(range => {
              const count = results.filter(r => {
                if (range.min === -Infinity) return r.percent_change < range.max;
                if (range.max === Infinity) return r.percent_change >= range.min;
                return r.percent_change >= range.min && r.percent_change < range.max;
              }).length;
              
              const percentage = results.length > 0 ? (count / results.length * 100) : 0;
              
              return (
                <Col key={range.label} xs={24} sm={12} lg={6} xl={4}>
                  <div style={{
                    padding: '12px',
                    border: '1px solid #f0f0f0',
                    borderRadius: '6px',
                    textAlign: 'center',
                    backgroundColor: count > 0 ? range.color + '15' : '#fafafa'
                  }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: range.color, marginBottom: '4px' }}>
                      {count}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>
                      {range.label}
                    </div>
                    <div style={{ fontSize: '10px', color: '#999' }}>
                      {percentage.toFixed(1)}% du total
                    </div>
                  </div>
                </Col>
              );
            });
          })()}
        </Row>
      </Card>


      <Card key={`actionable-results-${simulation.id}-${renderKey}`} title="🚀 Plan d'action SEO">
        <Table
          key={`actionable-table-${simulation.id}-${renderKey}`}
          columns={[
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
          ]}
          dataSource={results.filter(r => Math.abs(r.percent_change) > 0.1)} // Show more pages with minimal change
          rowKey="page_id"
          size="small"
          defaultSorter={{ field: 'percent_change', order: 'descend' }}
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