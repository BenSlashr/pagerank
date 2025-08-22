import React, { useState, useEffect } from 'react';
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
  Collapse,
  Typography,
  Divider,
  Radio,
  Tag,
  Checkbox,
  Slider
} from 'antd';
import { 
  ExperimentOutlined,
  EyeOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useRules, useCreateSimulation, usePreviewRules } from '../../hooks/useSimulations';

const { Option } = Select;
const { Panel } = Collapse;
const { Text, Paragraph } = Typography;

interface SimulationModalProps {
  visible: boolean;
  projectId: number;
  projectTypes?: string[];
  onCancel: () => void;
}

export const SimulationModal: React.FC<SimulationModalProps> = ({
  visible,
  projectId,
  projectTypes = [],
  onCancel
}) => {
  const [form] = Form.useForm();
  const [selectedRule, setSelectedRule] = useState<string>('');
  const [previewData, setPreviewData] = useState<any>(null);
  
  const { data: rules } = useRules();
  const createMutation = useCreateSimulation();
  const previewMutation = usePreviewRule();

  const handleSubmit = async (values: any) => {
    try {
      let processedSourceFilter = values.source_filter || {};
      
      // Process target_urls for menu and footer modifications
      if ((selectedRule === 'menu_modification' || selectedRule === 'footer_modification') && 
          processedSourceFilter.target_urls) {
        // Convert textarea string to array
        processedSourceFilter.target_urls = processedSourceFilter.target_urls
          .split('\n')
          .map((url: string) => url.trim())
          .filter((url: string) => url.length > 0);
      }
      
      const ruleConfig = {
        source_filter: processedSourceFilter,
        target_selector: values.target_selector || selectedRule,
        links_count: values.links_count || 8,
        bidirectional: values.bidirectional || false,
        exclude_existing: values.exclude_existing !== false,
        link_position: values.link_position || 'content',
        legacy_uniform_weights: values.legacy_uniform_weights || false,
        semantic_threshold: values.semantic_threshold || 0.4
      };

      await createMutation.mutateAsync({
        projectId,
        name: values.name,
        rule_name: selectedRule,
        rule_config: ruleConfig
      });
      
      message.success('Simulation started successfully!');
      onCancel();
      form.resetFields();
      setPreviewData(null);
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to create simulation');
    }
  };

  const handlePreview = async () => {
    const values = form.getFieldsValue();
    
    if (!selectedRule) {
      message.error('Please select a linking rule first');
      return;
    }

    try {
      let processedSourceFilter = values.source_filter || {};
      
      // Process target_urls for menu and footer modifications
      if ((selectedRule === 'menu_modification' || selectedRule === 'footer_modification') && 
          processedSourceFilter.target_urls) {
        // Convert textarea string to array
        processedSourceFilter.target_urls = processedSourceFilter.target_urls
          .split('\n')
          .map((url: string) => url.trim())
          .filter((url: string) => url.length > 0);
      }
      
      const ruleConfig = {
        source_filter: processedSourceFilter,
        target_selector: values.target_selector || selectedRule,
        links_count: values.links_count || 8,
        bidirectional: values.bidirectional || false,
        exclude_existing: values.exclude_existing !== false,
        link_position: values.link_position || 'content',
        legacy_uniform_weights: values.legacy_uniform_weights || false,
        semantic_threshold: values.semantic_threshold || 0.4
      };

      const result = await previewMutation.mutateAsync({
        projectId,
        rule_name: selectedRule,
        rule_config: ruleConfig,
        preview_count: 5
      });
      
      setPreviewData(result);
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Preview failed');
    }
  };

  const selectedRuleInfo = rules?.find(rule => rule.name === selectedRule);

  const getRuleExplanation = (ruleName: string) => {
    const explanations = {
      'same_category': {
        title: '🔗 Liens internes par catégorie',
        description: 'Crée des liens entre pages de la même catégorie',
        example: 'Exemple: Les produits "Catégorie" lient vers d\'autres produits "Catégorie"',
        visual: '📁 Catégorie A → 📄 Page 1 ↔ 📄 Page 2 ↔ 📄 Page 3',
        useCase: 'Idéal pour renforcer la cohésion thématique et garder les visiteurs dans la même section'
      },
      'cross_sell': {
        title: '🎯 Cross-selling entre catégories',
        description: 'Lie les produits de différentes catégories pour générer des ventes croisées',
        example: 'Exemple: Produit "Cuve" → Produit "Pompe" (produits complémentaires)',
        visual: '📁 Catégorie A → 📄 Produit ↔ 📄 Produit ← 📁 Catégorie B',
        useCase: 'Parfait pour augmenter le panier moyen avec des produits complémentaires'
      },
      'popular_products': {
        title: '⭐ Boost des produits populaires',
        description: 'Lie vers les produits avec le meilleur PageRank (plus populaires)',
        example: 'Exemple: Pages "Catégorie" → Top 3 des produits les mieux classés',
        visual: '📄 Page source → ⭐ Produit populaire 1, ⭐ Produit populaire 2',
        useCase: 'Excellent pour mettre en avant les best-sellers depuis toutes les pages'
      },
      'menu_modification': {
        title: '🧭 Modification du menu principal',
        description: 'Ajoute ou retire des pages du menu de navigation principal',
        example: 'Exemple: Ajouter "Nouvelle collection" au menu = tous les liens vers cette page',
        visual: '🧭 Menu → 📄 Toutes les pages ↔ 📄 Pages du menu',
        useCase: 'Parfait pour tester l\'impact d\'ajouter/retirer des sections du menu'
      },
      'footer_modification': {
        title: '🦶 Modification des liens footer',
        description: 'Ajoute ou retire des liens dans le footer du site',
        example: 'Exemple: Ajouter "CGV" au footer depuis les pages produits',
        visual: '🦶 Footer → 📄 Pages sélectionnées ↔ 📄 Pages footer',
        useCase: 'Idéal pour tester l\'impact des liens footer sur le référencement'
      }
    };
    
    return explanations[ruleName as keyof typeof explanations];
  };

  const getSourceFilterOptions = () => {
    const typeOptions = projectTypes.map(type => (
      <Option key={type} value={type.toLowerCase()}>
        {type}
      </Option>
    ));

    switch (selectedRule) {
      case 'same_category':
        return (
          <Form.Item 
            label="Type de pages source" 
            tooltip="Quel type de pages doit recevoir les nouveaux liens"
            style={{ marginBottom: 16 }}
          >
            <Form.Item name={['source_filter', 'type']} noStyle>
              <Select placeholder="Sélectionnez le type de pages">
                {typeOptions}
              </Select>
            </Form.Item>
          </Form.Item>
        );
      case 'cross_sell':
        return (
          <Form.Item 
            label="Type de pages source" 
            tooltip="Généralement les pages produits pour le cross-selling"
            style={{ marginBottom: 16 }}
          >
            <Form.Item name={['source_filter', 'type']} noStyle>
              <Select placeholder="Sélectionnez le type de pages">
                {typeOptions}
              </Select>
            </Form.Item>
          </Form.Item>
        );
      case 'popular_products':
        return (
          <Form.Item 
            label="Type de pages source" 
            tooltip="Quelles pages vont pointer vers les produits populaires"
            style={{ marginBottom: 16 }}
          >
            <Form.Item name={['source_filter', 'type']} noStyle>
              <Select placeholder="Sélectionnez le type de pages">
                {typeOptions}
              </Select>
            </Form.Item>
          </Form.Item>
        );
      case 'menu_modification':
        return (
          <div>
            <Form.Item 
              label="Action" 
              tooltip="Ajouter ou retirer des pages du menu"
              style={{ marginBottom: 16 }}
            >
              <Form.Item name={['source_filter', 'action']} noStyle>
                <Radio.Group>
                  <Radio value="add">➕ Ajouter au menu</Radio>
                  <Radio value="remove">➖ Retirer du menu</Radio>
                </Radio.Group>
              </Form.Item>
            </Form.Item>
            
            <Form.Item 
              label="URLs des pages à modifier" 
              tooltip="Entrez les URLs des pages à ajouter ou retirer du menu (une par ligne)"
              style={{ marginBottom: 16 }}
            >
              <Form.Item name={['source_filter', 'target_urls']} noStyle>
                <Input.TextArea 
                  placeholder={`Exemple:\n/collection-nouvelle\n/promotions\n/contact`}
                  rows={4}
                />
              </Form.Item>
            </Form.Item>
          </div>
        );
      case 'footer_modification':
        return (
          <div>
            <Form.Item 
              label="Action" 
              tooltip="Ajouter ou retirer des liens du footer"
              style={{ marginBottom: 16 }}
            >
              <Form.Item name={['source_filter', 'action']} noStyle>
                <Radio.Group>
                  <Radio value="add">➕ Ajouter au footer</Radio>
                  <Radio value="remove">➖ Retirer du footer</Radio>
                </Radio.Group>
              </Form.Item>
            </Form.Item>
            
            <Form.Item 
              label="Types de pages source" 
              tooltip="Quelles pages auront les nouveaux liens footer"
              style={{ marginBottom: 16 }}
            >
              <Form.Item name={['source_filter', 'source_types']} noStyle>
                <Select mode="multiple" placeholder="Sélectionnez les types de pages">
                  {typeOptions}
                </Select>
              </Form.Item>
            </Form.Item>
            
            <Form.Item 
              label="URLs des pages footer" 
              tooltip="Entrez les URLs des pages à ajouter ou retirer du footer (une par ligne)"
              style={{ marginBottom: 16 }}
            >
              <Form.Item name={['source_filter', 'target_urls']} noStyle>
                <Input.TextArea 
                  placeholder={`Exemple:\n/mentions-legales\n/cgv\n/politique-confidentialite\n/contact`}
                  rows={4}
                />
              </Form.Item>
            </Form.Item>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      title={
        <Space>
          <ExperimentOutlined />
          Create New Simulation
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={700}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          links_count: 8,
          bidirectional: false,
          exclude_existing: true,
          link_position: 'content',
          legacy_uniform_weights: false,
          semantic_threshold: 0.4
        }}
      >
        <Form.Item
          name="name"
          label="Simulation Name"
          rules={[{ required: true, message: 'Please enter a simulation name' }]}
        >
          <Input placeholder="e.g., Add similar products links" />
        </Form.Item>

        <Form.Item
          label="Choisissez votre stratégie de linking"
          required
          style={{ marginBottom: 24 }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            {rules?.map(rule => {
              const explanation = getRuleExplanation(rule.name);
              const isSelected = selectedRule === rule.name;
              
              return (
                <Card 
                  key={rule.name}
                  size="small"
                  hoverable
                  onClick={() => setSelectedRule(rule.name)}
                  style={{ 
                    border: isSelected ? '2px solid #1890ff' : '1px solid #d9d9d9',
                    backgroundColor: isSelected ? '#f6ffed' : 'white',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ padding: '8px' }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      marginBottom: 8,
                      fontWeight: 'bold'
                    }}>
                      {explanation?.title || rule.name}
                    </div>
                    <div style={{ 
                      fontSize: '13px', 
                      color: '#666',
                      marginBottom: 8,
                      lineHeight: 1.4
                    }}>
                      {explanation?.description}
                    </div>
                    <div style={{ 
                      fontSize: '12px',
                      color: '#1890ff',
                      fontFamily: 'monospace',
                      backgroundColor: '#f0f8ff',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      marginBottom: 4
                    }}>
                      {explanation?.visual}
                    </div>
                    <div style={{ 
                      fontSize: '12px',
                      color: '#52c41a',
                      fontStyle: 'italic'
                    }}>
                      💡 {explanation?.useCase}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </Form.Item>

        {selectedRule && (
          <Card 
            title="⚙️ Configuration de la simulation"
            size="small" 
            style={{ marginBottom: 24 }}
          >
            {getSourceFilterOptions()}
            
            {/* Show standard options only for non-menu/footer rules */}
            {!['menu_modification', 'footer_modification'].includes(selectedRule) && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <Form.Item
                    name="links_count"
                    label="Liens par page"
                    tooltip="Combien de nouveaux liens ajouter à chaque page source"
                  >
                    <InputNumber min={1} max={20} style={{ width: '100%' }} />
                  </Form.Item>

                  <Form.Item
                    name="bidirectional"
                    label="Liens bidirectionnels"
                    tooltip="Ajouter des liens dans les deux sens (A→B et B→A)"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </div>

                <Form.Item
                  name="link_position"
                  label="Position des liens sur la page"
                  tooltip="La position des liens affecte leur valeur SEO"
                  style={{ marginBottom: 16 }}
                >
                  <Select placeholder="Sélectionnez la zone d'insertion">
                    <Option value="header">
                      <div>
                        <div style={{ fontWeight: 'bold' }}>🔝 En-tête / Navigation</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          Valeur SEO: ⭐⭐⭐⭐⭐ (Maximum) - Visible dès l'arrivée
                        </div>
                      </div>
                    </Option>
                    <Option value="content_top">
                      <div>
                        <div style={{ fontWeight: 'bold' }}>📄 Début du contenu principal</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          Valeur SEO: ⭐⭐⭐⭐⭐ (Très élevée) - Premier paragraphe
                        </div>
                      </div>
                    </Option>
                    <Option value="content">
                      <div>
                        <div style={{ fontWeight: 'bold' }}>📝 Milieu du contenu</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          Valeur SEO: ⭐⭐⭐⭐ (Élevée) - Contextuels et naturels
                        </div>
                      </div>
                    </Option>
                    <Option value="content_bottom">
                      <div>
                        <div style={{ fontWeight: 'bold' }}>📋 Fin du contenu principal</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          Valeur SEO: ⭐⭐⭐ (Moyenne) - Après lecture
                        </div>
                      </div>
                    </Option>
                    <Option value="sidebar">
                      <div>
                        <div style={{ fontWeight: 'bold' }}>📐 Barre latérale</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          Valeur SEO: ⭐⭐ (Modérée) - Zone secondaire
                        </div>
                      </div>
                    </Option>
                    <Option value="footer">
                      <div>
                        <div style={{ fontWeight: 'bold' }}>🔻 Pied de page</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          Valeur SEO: ⭐ (Faible) - Moins de poids SEO
                        </div>
                      </div>
                    </Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  name="exclude_existing"
                  label="Exclure les liens existants"
                  tooltip="Ne pas créer de liens qui existent déjà"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>

                {/* Semantic analysis controls */}
                <Divider style={{ margin: '16px 0' }} orientation="left">
                  🎯 PageRank réaliste (IA)
                </Divider>
                
                <div style={{ 
                  backgroundColor: '#e6f7ff', 
                  padding: '12px', 
                  borderRadius: '6px',
                  border: '1px solid #91d5ff',
                  marginBottom: 16
                }}>
                  <div style={{ fontSize: '13px', color: '#1890ff', marginBottom: 8 }}>
                    🎆 <strong>Par défaut</strong> : Simulation réaliste avec analyse sémantique
                  </div>
                  <ul style={{ fontSize: '12px', color: '#666', margin: 0, paddingLeft: 20 }}>
                    <li>Liens pertinents (rosier → sécateur) = Poids normal</li>
                    <li>Liens non-pertinents (rosier → CGV) = Poids réduit</li>
                    <li>Reproduit le comportement réel de Google</li>
                  </ul>
                </div>

                <Form.Item
                  name="legacy_uniform_weights"
                  label="Mode académique"
                  tooltip="Ignorer la pertinence sémantique (tous les liens ont le même poids selon leur position)"
                  valuePropName="checked"
                  style={{ marginBottom: 16 }}
                >
                  <Checkbox>
                    📚 Utiliser les poids uniformes (comme PageRank classique)
                  </Checkbox>
                </Form.Item>

                <Form.Item noStyle shouldUpdate={(prev, curr) => prev.legacy_uniform_weights !== curr.legacy_uniform_weights}>
                  {({ getFieldValue }) => {
                    const legacyMode = getFieldValue('legacy_uniform_weights');
                    return !legacyMode ? (
                      <div style={{ 
                        backgroundColor: '#f6ffed', 
                        padding: '12px', 
                        borderRadius: '6px',
                        border: '1px solid #b7eb8f',
                        marginBottom: 16
                      }}>
                        <Form.Item
                          name="semantic_threshold"
                          label="Seuil de pertinence sémantique"
                          tooltip="Similarité minimum pour considérer un lien comme pertinent (0.4 = 40%)"
                          style={{ marginBottom: 8 }}
                        >
                          <Slider
                            min={0.1}
                            max={0.8}
                            step={0.1}
                            marks={{
                              0.2: '20%',
                              0.4: '40%',
                              0.6: '60%',
                              0.8: '80%'
                            }}
                            tooltip={{ formatter: (value) => `${(value * 100).toFixed(0)}%` }}
                          />
                        </Form.Item>
                        
                        <div style={{ fontSize: '12px', color: '#52c41a' }}>
                          ℹ️ Poids final = (poids_position + pertinence_sémantique) ÷ 2<br/>
                          🔍 Contenu analysé: Titre + colonne "Extracteur 1" du CSV<br/>
                          ⏱️ Calcul plus long la première fois (chargement modèle IA)
                        </div>
                      </div>
                    ) : (
                      <div style={{ 
                        backgroundColor: '#fff7e6', 
                        padding: '12px', 
                        borderRadius: '6px',
                        border: '1px solid #ffd591',
                        marginBottom: 16
                      }}>
                        <div style={{ fontSize: '12px', color: '#d46b08' }}>
                          ⚠️ <strong>Mode académique activé</strong><br/>
                          Cette simulation ignore la pertinence sémantique des liens.<br/>
                          Résultats moins réalistes que Google mais utiles pour comprendre l'impact théorique.
                        </div>
                      </div>
                    );
                  }}
                </Form.Item>
              </div>
            )}

            {/* Show simplified info for menu/footer rules */}
            {['menu_modification', 'footer_modification'].includes(selectedRule) && (
              <div style={{ 
                backgroundColor: '#f0f8ff', 
                padding: '12px', 
                borderRadius: '6px',
                border: '1px solid #d6e4ff'
              }}>
                <div style={{ fontSize: '14px', color: '#1890ff', marginBottom: 8 }}>
                  ℹ️ Configuration automatique pour cette simulation :
                </div>
                <ul style={{ fontSize: '13px', color: '#666', margin: 0, paddingLeft: 20 }}>
                  <li>Position des liens : {selectedRule === 'menu_modification' ? 'Navigation (poids maximum)' : 'Footer (poids faible)'}</li>
                  <li>Nombre de liens : Automatique selon les URLs saisies</li>
                  <li>Bidirectionnel : Non applicable</li>
                  <li>Exclusion existants : Géré automatiquement</li>
                  <li style={{ color: '#52c41a' }}>Analyse sémantique : Active par défaut (réaliste)</li>
                </ul>
              </div>
            )}
          </Card>
        )}

        {selectedRule && (
          <>
            <Divider />
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Button 
                icon={<EyeOutlined />}
                onClick={handlePreview}
                loading={previewMutation.isPending}
              >
                Preview Links
              </Button>
              
              <Space>
                <Button onClick={onCancel}>
                  Cancel
                </Button>
                <Button 
                  type="primary"
                  htmlType="submit"
                  loading={createMutation.isPending}
                  icon={<ExperimentOutlined />}
                >
                  Run Simulation
                </Button>
              </Space>
            </Space>
          </>
        )}
      </Form>

      {previewData && (
        <>
          <Divider />
          <Card 
            title={`Preview: ${previewData.total_new_links} new links`}
            size="small"
          >
            <Paragraph type="secondary" style={{ fontSize: '12px' }}>
              {previewData.rule_description}
            </Paragraph>
            
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {previewData.preview_links.map((link: any, index: number) => (
                <div key={index} style={{ 
                  padding: '8px 0',
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '12px'
                }}>
                  <div>
                    <strong>From:</strong> {link.from_url.length > 50 ? 
                      `${link.from_url.substring(0, 50)}...` : link.from_url}
                  </div>
                  <div style={{ color: '#666' }}>
                    <strong>To:</strong> {link.to_url.length > 50 ? 
                      `${link.to_url.substring(0, 50)}...` : link.to_url}
                  </div>
                </div>
              ))}
            </div>
            
            {previewData.truncated && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                ... and {previewData.total_new_links - previewData.preview_links.length} more links
              </Text>
            )}
          </Card>
        </>
      )}
    </Modal>
  );
};