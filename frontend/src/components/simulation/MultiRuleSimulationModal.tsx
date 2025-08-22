import React, { useState } from 'react';
import { 
  Modal, 
  Form, 
  Input, 
  Select, 
  InputNumber, 
  Switch,
  Card,
  Space,
  Button,
  message,
  Typography,
  Divider,
  Tag,
  Checkbox,
  Row,
  Col,
  Tooltip
} from 'antd';
import { 
  ExperimentOutlined,
  EyeOutlined,
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined
} from '@ant-design/icons';
import { useCreateSimulation, usePreviewRules } from '../../hooks/useSimulations';
import { LinkingRule, PageBoost, PageProtect } from '../../types';

const { Option } = Select;
const { Text } = Typography;

interface MultiRuleSimulationModalProps {
  visible: boolean;
  projectId: number;
  projectTypes?: string[];
  onCancel: () => void;
  preFilledRules?: LinkingRule[];
}

const defaultRule: LinkingRule = {
  source_types: [],
  source_categories: [],
  target_types: [],
  target_categories: [],
  selection_method: 'category',
  links_per_page: 3,
  bidirectional: false,
  avoid_self_links: true
};

export const MultiRuleSimulationModal: React.FC<MultiRuleSimulationModalProps> = ({
  visible,
  projectId,
  projectTypes = [],
  onCancel,
  preFilledRules = []
}) => {
  const [form] = Form.useForm();
  const [previewData, setPreviewData] = useState<any>(null);
  const [showPageBoosts, setShowPageBoosts] = useState(false);
  const [showPageProtects, setShowPageProtects] = useState(false);
  
  const createMutation = useCreateSimulation();
  const previewMutation = usePreviewRules();

  const parseBulkData = (bulkText: string, type: 'boost' | 'protect') => {
    if (!bulkText?.trim()) return [];
    
    const lines = bulkText.trim().split('\n');
    const results: any[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      if (type === 'boost') {
        // Format pour boost: URL,multiplicateur
        const parts = line.split(',');
        if (parts.length !== 2) {
          message.error(`Ligne ${i + 1} invalide: format attendu "URL,multiplicateur"`);
          return null;
        }
        
        const url = parts[0].trim();
        const value = parseFloat(parts[1].trim());
        
        if (!url.startsWith('http')) {
          message.error(`Ligne ${i + 1}: URL invalide "${url}"`);
          return null;
        }
        
        if (isNaN(value) || value <= 0) {
          message.error(`Ligne ${i + 1}: multiplicateur invalide "${parts[1]}"`);
          return null;
        }
        
        if (value > 10) {
          message.error(`Ligne ${i + 1}: multiplicateur trop élevé (max 10.0)`);
          return null;
        }
        
        results.push({ url, boost_factor: value });
      } else {
        // Format pour protection: URL seulement (protection automatique -2%)
        const url = line.trim();
        
        if (!url.startsWith('http')) {
          message.error(`Ligne ${i + 1}: URL invalide "${url}"`);
          return null;
        }
        
        // Protection automatique: la page ne peut pas perdre plus de 2% de son PageRank actuel
        // La valeur sera calculée dynamiquement côté backend basée sur le PageRank actuel * 0.98
        results.push({ url, protection_factor: -0.02 }); // -2% = protection automatique
      }
    }
    
    return results;
  };

  const handleSubmit = async (values: any) => {
    try {
      // Parse bulk boost data
      let page_boosts: any[] = [];
      if (values.page_boosts_bulk) {
        const parsed = parseBulkData(values.page_boosts_bulk, 'boost');
        if (parsed === null) return; // Error already shown
        page_boosts = parsed;
      }
      
      // Parse bulk protection data
      let protected_pages: any[] = [];
      if (values.protected_pages_bulk) {
        const parsed = parseBulkData(values.protected_pages_bulk, 'protect');
        if (parsed === null) return; // Error already shown
        protected_pages = parsed;
      }
      
      await createMutation.mutateAsync({
        projectId,
        name: values.name,
        rules: values.rules || [defaultRule],
        page_boosts,
        protected_pages
      });
      
      message.success('Simulation created successfully!');
      onCancel();
      form.resetFields();
      setPreviewData(null);
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to create simulation');
    }
  };

  const handlePreview = async () => {
    const values = form.getFieldsValue();
    
    if (!values.rules || values.rules.length === 0) {
      message.error('Please add at least one rule');
      return;
    }

    try {
      const result = await previewMutation.mutateAsync({
        projectId,
        rules: values.rules,
        preview_count: 10
      });
      
      setPreviewData(result);
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Preview failed');
    }
  };

  const handleAddRule = () => {
    const rules = form.getFieldValue('rules') || [];
    form.setFieldsValue({
      rules: [...rules, { ...defaultRule }]
    });
  };

  const handleRemoveRule = (index: number) => {
    const rules = form.getFieldValue('rules') || [];
    form.setFieldsValue({
      rules: rules.filter((_: any, i: number) => i !== index)
    });
  };

  const handleDuplicateRule = (index: number) => {
    const rules = form.getFieldValue('rules') || [];
    const ruleToDuplicate = { ...rules[index] };
    form.setFieldsValue({
      rules: [...rules, ruleToDuplicate]
    });
  };

  const getSelectionMethodLabel = (method: string) => {
    const labels = {
      'category': '🔗 Même catégorie',
      'semantic': '🧠 Proximité sémantique', 
      'random': '🎲 Aléatoire',
      'pagerank_high': '⭐ PageRank élevé',
      'pagerank_low': '📉 PageRank faible'
    };
    return labels[method as keyof typeof labels] || method;
  };

  return (
    <Modal
      title={
        <Space>
          <ExperimentOutlined />
          Nouvelle simulation - Règles multiples
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={900}
      style={{ top: 20 }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          name: '',
          rules: preFilledRules.length > 0 ? preFilledRules : [{ ...defaultRule }]
        }}
      >
        <Form.Item
          name="name"
          label="Nom de la simulation"
          rules={[{ required: true, message: 'Veuillez saisir un nom' }]}
        >
          <Input placeholder="ex: Optimisation e-commerce complète" />
        </Form.Item>

        <Divider>
          <Space>
            📋 Règles de maillage
            <Tag color="blue">Cumulatives</Tag>
          </Space>
        </Divider>

        <Form.List name="rules">
          {(fields, { add, remove }) => (
            <div>
              {fields.map(({ key, name, ...restField }, index) => (
                <Card 
                  key={key}
                  size="small"
                  style={{ marginBottom: 16 }}
                  title={
                    <Space>
                      <Text strong>Règle {index + 1}</Text>
                      <Tag color="geekblue" style={{ fontSize: '11px' }}>
                        {form.getFieldValue(['rules', name, 'selection_method']) || 'category'}
                      </Tag>
                    </Space>
                  }
                  extra={
                    <Space>
                      <Tooltip title="Dupliquer cette règle">
                        <Button 
                          type="text" 
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={() => handleDuplicateRule(index)}
                        />
                      </Tooltip>
                      {fields.length > 1 && (
                        <Tooltip title="Supprimer cette règle">
                          <Button 
                            type="text" 
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => remove(name)}
                          />
                        </Tooltip>
                      )}
                    </Space>
                  }
                >
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        {...restField}
                        name={[name, 'source_types']}
                        label="Pages source"
                        tooltip="Types de pages qui vont recevoir les nouveaux liens"
                      >
                        <Select
                          mode="multiple"
                          placeholder="Tous les types"
                          allowClear
                        >
                          {projectTypes.map(type => (
                            <Option key={type} value={type.toLowerCase()}>
                              {type}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        {...restField}
                        name={[name, 'target_types']}
                        label="Pages cibles"
                        tooltip="Types de pages vers lesquelles pointer"
                      >
                        <Select
                          mode="multiple"
                          placeholder="Tous les types"
                          allowClear
                        >
                          {projectTypes.map(type => (
                            <Option key={type} value={type.toLowerCase()}>
                              {type}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={8}>
                      <Form.Item
                        {...restField}
                        name={[name, 'selection_method']}
                        label="Méthode de sélection"
                        tooltip="Comment choisir les pages cibles"
                      >
                        <Select placeholder="Sélectionnez une méthode">
                          <Option value="category">
                            <div>
                              <div>🔗 <strong>Même catégorie</strong></div>
                              <div style={{ fontSize: '11px', color: '#666' }}>
                                Pages de la même category
                              </div>
                            </div>
                          </Option>
                          <Option value="semantic">
                            <div>
                              <div>🧠 <strong>Proximité sémantique</strong></div>
                              <div style={{ fontSize: '11px', color: '#666' }}>
                                Analyse du contenu par IA
                              </div>
                            </div>
                          </Option>
                          <Option value="random">
                            <div>
                              <div>🎲 <strong>Aléatoire</strong></div>
                              <div style={{ fontSize: '11px', color: '#666' }}>
                                Sélection complètement random
                              </div>
                            </div>
                          </Option>
                          <Option value="pagerank_high">
                            <div>
                              <div>⭐ <strong>PageRank élevé</strong></div>
                              <div style={{ fontSize: '11px', color: '#666' }}>
                                Vers les pages les plus populaires
                              </div>
                            </div>
                          </Option>
                          <Option value="pagerank_low">
                            <div>
                              <div>📉 <strong>PageRank faible</strong></div>
                              <div style={{ fontSize: '11px', color: '#666' }}>
                                Vers les pages moins populaires
                              </div>
                            </div>
                          </Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item
                        {...restField}
                        name={[name, 'links_per_page']}
                        label="Liens/page"
                        tooltip="Nombre de liens à créer par page source"
                      >
                        <InputNumber min={1} max={20} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item
                        {...restField}
                        name={[name, 'bidirectional']}
                        label="Bidirectionnel"
                        tooltip="Créer des liens dans les deux sens"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item
                        {...restField}
                        name={[name, 'avoid_self_links']}
                        label="Éviter auto-liens"
                        tooltip="Empêcher qu'une page se lie à elle-même"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>
              ))}
              
              <Button 
                type="dashed" 
                onClick={handleAddRule}
                block
                icon={<PlusOutlined />}
                style={{ marginBottom: 16 }}
              >
                Ajouter une règle
              </Button>
            </div>
          )}
        </Form.List>

        <Divider>
          <Space>
            <Switch 
              checked={showPageBoosts}
              onChange={setShowPageBoosts}
              size="small"
            />
            ⚡ Boost URLs spécifiques
            <Tag color="orange">Optionnel</Tag>
          </Space>
        </Divider>

        {showPageBoosts && (
          <Card size="small" style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                <Tooltip title="Multiplie directement le PageRank des pages spécifiées. Ex: facteur 2.0 = double le PageRank, facteur 1.5 = augmente de 50%. Utilise le budget boost configuré (8% par défaut).">
                  ⚡ Boost URLs spécifiques - Saisissez les données en bloc 
                  <span style={{ marginLeft: 4, color: '#1890ff', cursor: 'help' }}>ⓘ</span>
                </Tooltip>
              </Text>
              <Form.Item
                name="page_boosts_bulk"
                label={
                  <Space>
                    <Text strong>Format: URL,Multiplicateur (une ligne par page)</Text>
                    <Tooltip title="Exemple:&#10;https://site.com/page1,2.0&#10;https://site.com/page2,1.5&#10;https://site.com/page3,3.0">
                      <span style={{ color: '#1890ff', cursor: 'help' }}>ⓘ</span>
                    </Tooltip>
                  </Space>
                }
              >
                <Input.TextArea
                  placeholder={`https://example.com/page-importante,2.0
https://example.com/landing-page,1.5
https://example.com/produit-phare,2.5`}
                  rows={5}
                  style={{ fontFamily: 'monospace', fontSize: '12px' }}
                />
              </Form.Item>
            </Space>
          </Card>
        )}

        <Divider>
          <Space>
            <Switch 
              checked={showPageProtects}
              onChange={setShowPageProtects}
              size="small"
            />
            🛡️ Protéger des pages
            <Tag color="cyan">Optionnel</Tag>
          </Space>
        </Divider>

        {showPageProtects && (
          <Card size="small" style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space align="start">
                <Text type="secondary" style={{ fontSize: '13px' }}>
                  <Tooltip title="Les pages listées ne pourront pas perdre plus de 2% de leur PageRank actuel. Protection automatique basée sur le PageRank existant de chaque page.">
                    🛡️ Pages protégées - Saisissez une URL par ligne 
                    <span style={{ marginLeft: 4, color: '#1890ff', cursor: 'help' }}>ⓘ</span>
                  </Tooltip>
                </Text>
                <Tag color="green" style={{ fontSize: '11px' }}>
                  📊 Estimé: ~50 pages max protégeables
                  <Tooltip title="Avec un budget protection de 5% et une perte max de 2% par page, environ 50 pages peuvent être protégées simultanément. Le nombre exact dépend de la distribution du PageRank dans votre site.">
                    <span style={{ marginLeft: 4, color: '#52c41a', cursor: 'help' }}>ⓘ</span>
                  </Tooltip>
                </Tag>
              </Space>
              <Form.Item
                name="protected_pages_bulk"
                label={
                  <Space>
                    <Text strong>Format: Une URL par ligne (protection automatique -2% max)</Text>
                    <Tooltip title="Exemple:&#10;https://site.com/homepage&#10;https://site.com/contact&#10;https://site.com/pricing&#10;&#10;Chaque page sera automatiquement protégée pour ne pas perdre plus de 2% de son PageRank actuel.">
                      <span style={{ color: '#1890ff', cursor: 'help' }}>ⓘ</span>
                    </Tooltip>
                  </Space>
                }
              >
                <Input.TextArea
                  placeholder={`https://example.com/homepage
https://example.com/contact
https://example.com/pricing
https://example.com/about`}
                  rows={5}
                  style={{ fontFamily: 'monospace', fontSize: '12px' }}
                />
              </Form.Item>
            </Space>
          </Card>
        )}

        <Divider />
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button 
            icon={<EyeOutlined />}
            onClick={handlePreview}
            loading={previewMutation.isPending}
          >
            Prévisualiser
          </Button>
          
          <Space>
            <Button onClick={onCancel}>
              Annuler
            </Button>
            <Button 
              type="primary"
              htmlType="submit"
              loading={createMutation.isPending}
              icon={<ExperimentOutlined />}
            >
              Lancer la simulation
            </Button>
          </Space>
        </Space>
      </Form>

      {previewData && (
        <>
          <Divider />
          <Card 
            title={
              <Space>
                👀 Aperçu : {previewData.total_new_links} nouveaux liens
                <Tag color="green">{previewData.rules_applied} règles appliquées</Tag>
              </Space>
            }
            size="small"
          >
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {previewData.preview_links.map((link: any, index: number) => (
                <div key={index} style={{ 
                  padding: '8px 0',
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '12px'
                }}>
                  <div>
                    <strong>De:</strong> {link.from_url.length > 60 ? 
                      `${link.from_url.substring(0, 60)}...` : link.from_url}
                    <Tag color="blue" size="small" style={{ marginLeft: 8 }}>
                      {link.from_type}
                    </Tag>
                  </div>
                  <div style={{ color: '#666' }}>
                    <strong>Vers:</strong> {link.to_url.length > 60 ? 
                      `${link.to_url.substring(0, 60)}...` : link.to_url}
                    <Tag color="green" size="small" style={{ marginLeft: 8 }}>
                      {link.to_type}
                    </Tag>
                  </div>
                </div>
              ))}
            </div>
            
            {previewData.truncated && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                ... et {previewData.total_new_links - previewData.preview_links.length} liens supplémentaires
              </Text>
            )}
          </Card>
        </>
      )}
    </Modal>
  );
};