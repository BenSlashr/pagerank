import React from 'react';
import { Card, Row, Col, Tag, Space, Typography } from 'antd';
import { 
  ShoppingOutlined, 
  ReadOutlined, 
  StarOutlined,
  LinkOutlined,
  ThunderboltOutlined,
  TrophyOutlined
} from '@ant-design/icons';
import { LinkingRule } from '../../types';

const { Text } = Typography;

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  rules: LinkingRule[];
  useCase: string;
}

const templates: Template[] = [
  {
    id: 'ecommerce_classic',
    name: 'E-commerce classique',
    description: 'Maillage produit-à-produit + catégorie-vers-produits',
    icon: <ShoppingOutlined />,
    color: 'blue',
    useCase: 'Parfait pour les sites e-commerce traditionnels',
    rules: [
      {
        source_types: ['product'],
        source_categories: [],
        target_types: ['product'],
        target_categories: [],
        selection_method: 'category',
        links_per_page: 3,
        bidirectional: false,
        avoid_self_links: true
      },
      {
        source_types: ['category'],
        source_categories: [],
        target_types: ['product'],
        target_categories: [],
        selection_method: 'category',
        links_per_page: 5,
        bidirectional: false,
        avoid_self_links: true
      }
    ]
  },
  {
    id: 'blog_to_products',
    name: 'Blog vers produits',
    description: 'Connexion sémantique du contenu éditorial vers les produits',
    icon: <ReadOutlined />,
    color: 'green',
    useCase: 'Idéal pour monetiser le trafic blog',
    rules: [
      {
        source_types: ['blog'],
        source_categories: [],
        target_types: ['product'],
        target_categories: [],
        selection_method: 'semantic',
        links_per_page: 2,
        bidirectional: false,
        avoid_self_links: true
      }
    ]
  },
  {
    id: 'cross_selling',
    name: 'Cross-selling avancé',
    description: 'Liens entre catégories différentes + boost produits populaires',
    icon: <ThunderboltOutlined />,
    color: 'orange',
    useCase: 'Augmente le panier moyen et la découvrabilité',
    rules: [
      {
        source_types: ['product'],
        source_categories: [],
        target_types: ['product'],
        target_categories: [],
        selection_method: 'random',
        links_per_page: 2,
        bidirectional: false,
        avoid_self_links: true
      },
      {
        source_types: ['category'],
        source_categories: [],
        target_types: ['product'],
        target_categories: [],
        selection_method: 'pagerank_high',
        links_per_page: 3,
        bidirectional: false,
        avoid_self_links: true
      }
    ]
  },
  {
    id: 'seo_boost',
    name: 'Boost SEO pages faibles',
    description: 'Liens depuis pages fortes vers pages faibles PageRank',
    icon: <TrophyOutlined />,
    color: 'purple',
    useCase: 'Redistribue le jus SEO vers les pages négligées',
    rules: [
      {
        source_types: [],
        source_categories: [],
        target_types: [],
        target_categories: [],
        selection_method: 'pagerank_low',
        links_per_page: 4,
        bidirectional: false,
        avoid_self_links: true
      }
    ]
  },
  {
    id: 'full_semantic',
    name: 'Maillage sémantique complet',
    description: 'Tous les types de pages liés par proximité sémantique',
    icon: <LinkOutlined />,
    color: 'cyan',
    useCase: 'Crée un réseau intelligent basé sur le contenu',
    rules: [
      {
        source_types: ['product'],
        source_categories: [],
        target_types: ['product', 'category', 'blog'],
        target_categories: [],
        selection_method: 'semantic',
        links_per_page: 3,
        bidirectional: true,
        avoid_self_links: true
      },
      {
        source_types: ['blog'],
        source_categories: [],
        target_types: ['product', 'category'],
        target_categories: [],
        selection_method: 'semantic',
        links_per_page: 2,
        bidirectional: false,
        avoid_self_links: true
      }
    ]
  },
  {
    id: 'popular_discovery',
    name: 'Découvrabilité produits stars',
    description: 'Tous les types de pages pointent vers les best-sellers',
    icon: <StarOutlined />,
    color: 'gold',
    useCase: 'Met en avant les produits à forte conversion',
    rules: [
      {
        source_types: ['category', 'blog'],
        source_categories: [],
        target_types: ['product'],
        target_categories: [],
        selection_method: 'pagerank_high',
        links_per_page: 4,
        bidirectional: false,
        avoid_self_links: true
      },
      {
        source_types: ['product'],
        source_categories: [],
        target_types: ['product'],
        target_categories: [],
        selection_method: 'pagerank_high',
        links_per_page: 2,
        bidirectional: false,
        avoid_self_links: true
      }
    ]
  }
];

interface SimulationTemplatesProps {
  onSelectTemplate: (template: Template) => void;
  projectTypes?: string[];
}

export const SimulationTemplates: React.FC<SimulationTemplatesProps> = ({
  onSelectTemplate,
  projectTypes = []
}) => {
  
  const isTemplateCompatible = (template: Template) => {
    // Check if template rules are compatible with available project types
    const requiredTypes = new Set<string>();
    template.rules.forEach(rule => {
      rule.source_types.forEach(type => requiredTypes.add(type));
      rule.target_types.forEach(type => requiredTypes.add(type));
    });
    
    if (requiredTypes.size === 0) return true; // No specific types required
    
    const projectTypesLower = projectTypes.map(t => t.toLowerCase());
    return Array.from(requiredTypes).some(type => projectTypesLower.includes(type));
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Text strong style={{ fontSize: '16px' }}>
          🚀 Templates prêts à l'emploi
        </Text>
        <br />
        <Text type="secondary" style={{ fontSize: '13px' }}>
          Sélectionnez un template pour pré-remplir les règles, puis personnalisez selon vos besoins
        </Text>
      </div>
      
      <Row gutter={[16, 16]}>
        {templates.map(template => {
          const compatible = isTemplateCompatible(template);
          
          return (
            <Col key={template.id} xs={24} sm={12} lg={8}>
              <Card
                size="small"
                hoverable={compatible}
                style={{ 
                  height: '100%',
                  opacity: compatible ? 1 : 0.6,
                  cursor: compatible ? 'pointer' : 'not-allowed'
                }}
                onClick={() => compatible && onSelectTemplate(template)}
                title={
                  <Space>
                    <span style={{ color: template.color }}>
                      {template.icon}
                    </span>
                    <span style={{ fontSize: '14px' }}>
                      {template.name}
                    </span>
                  </Space>
                }
                extra={
                  <Tag color={template.color}>
                    {template.rules.length} règle{template.rules.length > 1 ? 's' : ''}
                  </Tag>
                }
              >
                <div style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: '13px', lineHeight: 1.4 }}>
                    {template.description}
                  </Text>
                </div>
                
                <div style={{ 
                  fontSize: '12px', 
                  color: '#52c41a',
                  fontStyle: 'italic',
                  marginBottom: 12
                }}>
                  💡 {template.useCase}
                </div>

                <div style={{ marginBottom: 8 }}>
                  {template.rules.map((rule, index) => (
                    <Tag 
                      key={index} 
                      style={{ 
                        marginBottom: 4, 
                        fontSize: '10px',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {rule.source_types.length > 0 ? rule.source_types.join(',') : 'toutes'} 
                      → {rule.target_types.length > 0 ? rule.target_types.join(',') : 'toutes'}
                      ({rule.selection_method})
                    </Tag>
                  ))}
                </div>

                {!compatible && (
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    ⚠️ Template non compatible avec vos types de pages
                  </Text>
                )}
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
};