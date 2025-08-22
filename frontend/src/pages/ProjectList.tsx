import React, { useState } from 'react';
import { 
  Typography, 
  Button, 
  Table, 
  Card, 
  Space, 
  Modal,
  Upload,
  Form,
  Input,
  message,
  Tag,
  App,
  Row,
  Col,
  Statistic,
  Progress,
  Alert,
  Tooltip,
  Breadcrumb
} from 'antd';
import { Link } from 'react-router-dom';
import { 
  PlusOutlined, 
  UploadOutlined, 
  EyeOutlined,
  CalendarOutlined,
  ProjectOutlined,
  LinkOutlined,
  ExperimentOutlined,
  BarChartOutlined,
  HomeOutlined,
  FireOutlined,
  StarOutlined,
  TrophyOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadProps } from 'antd';
import { useProjects, useImportProject, useImportMultiProject } from '../hooks/useProjects';
import type { Project } from '../types';

const { Title, Text } = Typography;
const { Dragger } = Upload;

const ProjectList: React.FC = () => {
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [pagesFile, setPagesFile] = useState<File | null>(null);
  const [linksFile, setLinksFile] = useState<File | null>(null);
  const { message: messageApi } = App.useApp();
  
  const { data: projects, isLoading } = useProjects();
  const importMutation = useImportProject();
  const importMultiMutation = useImportMultiProject();

  // Calculate summary stats
  const summaryStats = React.useMemo(() => {
    if (!projects) return { totalPages: 0, totalProjects: 0, averagePages: 0 };
    
    const totalPages = projects.reduce((sum, project) => sum + (project.total_pages || 0), 0);
    const totalProjects = projects.length;
    const averagePages = totalProjects > 0 ? Math.round(totalPages / totalProjects) : 0;
    
    return { totalPages, totalProjects, averagePages };
  }, [projects]);

  const handleImport = async (values: { projectName: string }) => {
    if (!pagesFile) {
      messageApi.error('Veuillez sélectionner un fichier CSV');
      return;
    }

    try {
      const filesToImport = [pagesFile];
      if (linksFile) {
        filesToImport.push(linksFile);
      }

      await importMultiMutation.mutateAsync({
        files: filesToImport,
        projectName: values.projectName
      });
      
      messageApi.success(
        `Projet importé avec succès ! ${filesToImport.length} fichier(s) traité(s) : ` +
        `${pagesFile ? 'Pages ✓' : ''} ${linksFile ? 'Liens ✓' : ''}`
      );
      
      setImportModalVisible(false);
      form.resetFields();
      setPagesFile(null);
      setLinksFile(null);
    } catch (error: any) {
      let errorMessage = 'Import échoué';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          // Erreurs de validation Pydantic
          errorMessage = errorData.detail.map((err: any) => err.msg || err).join(', ');
        } else if (errorData.detail) {
          errorMessage = 'Erreur de validation';
        }
      }
      
      messageApi.error(errorMessage);
    }
  };

  const pagesUploadProps: UploadProps = {
    name: 'pagesFile',
    multiple: false,
    accept: '.csv',
    beforeUpload: (uploadFile) => {
      setPagesFile(uploadFile);
      return false; // Prevent auto upload
    },
    onRemove: () => {
      setPagesFile(null);
    },
    fileList: pagesFile ? [pagesFile as any] : [],
  };

  const linksUploadProps: UploadProps = {
    name: 'linksFile',
    multiple: false,
    accept: '.csv',
    beforeUpload: (uploadFile) => {
      setLinksFile(uploadFile);
      return false; // Prevent auto upload
    },
    onRemove: () => {
      setLinksFile(null);
    },
    fileList: linksFile ? [linksFile as any] : [],
  };

  const columns: ColumnsType<Project> = [
    {
      title: 'Projet',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Project) => (
        <Space direction="vertical" size={2}>
          <Link to={`/projects/${record.id}`}>
            <Text strong style={{ fontSize: '14px', color: '#1890ff' }}>
              <ProjectOutlined style={{ marginRight: 8 }} />
              {text}
            </Text>
          </Link>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            <LinkOutlined style={{ marginRight: 4 }} />
            {record.domain}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Taille',
      dataIndex: 'total_pages',
      key: 'total_pages',
      sorter: (a, b) => (a.total_pages || 0) - (b.total_pages || 0),
      render: (value: number) => (
        <Space direction="vertical" size={2}>
          <Tag color={
            value > 10000 ? 'red' :
            value > 5000 ? 'orange' :
            value > 1000 ? 'blue' : 'green'
          } icon={
            value > 10000 ? <FireOutlined /> :
            value > 5000 ? <StarOutlined /> :
            value > 1000 ? <ThunderboltOutlined /> : undefined
          }>
            {value?.toLocaleString() || 0} pages
          </Tag>
          <Progress 
            percent={Math.min((value / (summaryStats.totalPages || 1)) * 100, 100)}
            showInfo={false}
            size="small"
            strokeColor={
              value > 10000 ? '#f5222d' :
              value > 5000 ? '#fa8c16' :
              value > 1000 ? '#1890ff' : '#52c41a'
            }
          />
        </Space>
      ),
    },
    {
      title: 'Catégorie',
      key: 'category',
      render: (_, record: Project) => {
        const pageCount = record.total_pages || 0;
        if (pageCount > 10000) return <Tag color="red" icon={<FireOutlined />}>GROS SITE</Tag>;
        if (pageCount > 5000) return <Tag color="orange" icon={<StarOutlined />}>GRAND SITE</Tag>;
        if (pageCount > 1000) return <Tag color="blue" icon={<ThunderboltOutlined />}>SITE MOYEN</Tag>;
        return <Tag color="green">PETIT SITE</Tag>;
      },
      filters: [
        { text: '🔥 Gros sites (10k+ pages)', value: 'large' },
        { text: '⭐ Grands sites (5k-10k pages)', value: 'medium-large' },
        { text: '⚡ Sites moyens (1k-5k pages)', value: 'medium' },
        { text: '🌱 Petits sites (<1k pages)', value: 'small' },
      ],
      onFilter: (value, record) => {
        const pageCount = record.total_pages || 0;
        if (value === 'large') return pageCount > 10000;
        if (value === 'medium-large') return pageCount > 5000 && pageCount <= 10000;
        if (value === 'medium') return pageCount > 1000 && pageCount <= 5000;
        if (value === 'small') return pageCount <= 1000;
        return false;
      },
    },
    {
      title: 'Date de création',
      dataIndex: 'created_at',
      key: 'created_at',
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      render: (date: string) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: '12px' }}>
            {new Date(date).toLocaleDateString('fr-FR')}
          </Text>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record: Project) => (
        <Space direction="vertical" size={2}>
          <Link to={`/projects/${record.id}`}>
            <Button 
              type="primary" 
              size="small" 
              icon={<BarChartOutlined />}
              block
            >
              Analyser
            </Button>
          </Link>
          <Link to={`/projects/${record.id}?tab=3`}>
            <Button 
              size="small" 
              icon={<ExperimentOutlined />}
              block
            >
              Simuler
            </Button>
          </Link>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Breadcrumb */}
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item href="/">
          <HomeOutlined />
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <ProjectOutlined />
          <span>Projets</span>
        </Breadcrumb.Item>
      </Breadcrumb>

      {/* En-tête avec métriques */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 16 
        }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>
              <Space>
                <TrophyOutlined />
                Mes projets PageRank
              </Space>
            </Title>
            <Text type="secondary">
              Analysez et optimisez le PageRank de vos sites web
            </Text>
          </div>
          
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setImportModalVisible(true)}
            size="large"
          >
            Importer un projet
          </Button>
        </div>

        {/* Métriques de résumé */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8} lg={6}>
            <Card>
              <Statistic
                title="Projets totaux"
                value={summaryStats.totalProjects}
                prefix={<ProjectOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8} lg={6}>
            <Card>
              <Statistic
                title="Pages analysées"
                value={summaryStats.totalPages}
                formatter={(value) => value?.toLocaleString() || '0'}
                prefix={<LinkOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8} lg={6}>
            <Card>
              <Statistic
                title="Moyenne par projet"
                value={summaryStats.averagePages}
                formatter={(value) => value?.toLocaleString() || '0'}
                suffix="pages"
                prefix={<BarChartOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8} lg={6}>
            <Card>
              <Statistic
                title="Prêt à optimiser"
                value={summaryStats.totalProjects}
                suffix="sites"
                prefix={<ThunderboltOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* Alert d'information */}
      <Alert
        message="🎯 Analysez l'impact de vos stratégies de maillage interne"
        description="Importez vos crawls Screaming Frog pour calculer le PageRank actuel et simuler l'impact de nouvelles règles de maillage avant de les implémenter."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Card 
        title={
          <Space>
            <ProjectOutlined />
            Tous les projets ({summaryStats.totalProjects})
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={projects}
          loading={isLoading}
          rowKey="id"
          size="middle"
          scroll={{ x: 1000 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} sur ${total} projets`,
            defaultPageSize: 20,
            pageSizeOptions: ['10', '20', '50', '100']
          }}
          locale={{
            emptyText: (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <ProjectOutlined style={{ fontSize: '64px', color: '#d9d9d9', marginBottom: 16 }} />
                <Title level={4} type="secondary">Aucun projet créé</Title>
                <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
                  Commencez par importer votre premier crawl Screaming Frog
                </Text>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={() => setImportModalVisible(true)}
                  size="large"
                >
                  Importer votre premier projet
                </Button>
              </div>
            )
          }}
        />
      </Card>

      <Modal
        title={
          <Space>
            <UploadOutlined />
            Importer un nouveau projet
          </Space>
        }
        open={importModalVisible}
        onCancel={() => {
          setImportModalVisible(false);
          form.resetFields();
          setPagesFile(null);
          setLinksFile(null);
        }}
        footer={null}
        width={700}
      >
        <Alert
          message="📊 Format CSV requis"
          description={
            <div>
              <div>
                <Text>Colonnes obligatoires :</Text>
                <div style={{ 
                  fontFamily: 'monospace', 
                  backgroundColor: '#fff2f0', 
                  padding: '8px', 
                  marginTop: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ffccc7'
                }}>
                  Address | Status Code | Segments
                </div>
                <Text style={{ marginTop: '8px', display: 'block' }}>Colonnes optionnelles (recommandées) :</Text>
                <div style={{ 
                  fontFamily: 'monospace', 
                  backgroundColor: '#f6ffed', 
                  padding: '8px', 
                  marginTop: '4px',
                  borderRadius: '4px',
                  border: '1px solid #b7eb8f'
                }}>
                  Content | Content 1 | Content 2 | Title 1 | H1-1 | Meta Description 1
                </div>
              </div>
              <Text type="secondary" style={{ fontSize: '12px', marginTop: '4px', display: 'block' }}>
                💡 Export depuis Screaming Frog: Bulk Export → All → Internal All<br/>
                📝 Multi-contenu : Content, Content 1, Content 2... seront fusionnés automatiquement
              </Text>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 20 }}
        />
        <Form
          form={form}
          layout="vertical"
          onFinish={handleImport}
        >
          <Form.Item
            name="projectName"
            label={
              <Space>
                <ProjectOutlined />
                <Text strong>Nom du projet</Text>
              </Space>
            }
            rules={[
              { required: true, message: 'Veuillez saisir un nom de projet' },
              { min: 2, message: 'Le nom doit contenir au moins 2 caractères' }
            ]}
          >
            <Input 
              placeholder="ex: Mon Site E-commerce, Blog Corporate, etc."
              size="large"
              prefix={<ProjectOutlined />}
            />
          </Form.Item>

          <Form.Item
            label={
              <Space>
                <UploadOutlined />
                <Text strong>Fichier CSV Screaming Frog</Text>
              </Space>
            }
            extra={
              <div>
                <div>Formats supportés: 'Internal All' et 'All Outlinks' exports</div>
                <div style={{ color: '#52c41a', fontSize: '12px', marginTop: '4px' }}>
                  ✓ Contenu : Colonnes "Content", "Content 1", "Content 2"... seront fusionnées automatiquement
                </div>
              </div>
            }
            required
          >
            <Dragger {...pagesUploadProps} style={{ backgroundColor: '#fafafa' }}>
              <p className="ant-upload-drag-icon">
                <UploadOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
              </p>
              <p className="ant-upload-text" style={{ fontSize: '16px', fontWeight: 'bold' }}>
                Cliquez ou glissez votre fichier CSV ici
              </p>
              <p className="ant-upload-hint" style={{ fontSize: '14px', marginTop: 8 }}>
                <Text type="secondary">
                  🔍 Export depuis Screaming Frog: Bulk Export → All → Internal All<br/>
                  📊 Le fichier sera analysé pour calculer le PageRank initial
                </Text>
              </p>
            </Dragger>
          </Form.Item>

          <Form.Item
            label={
              <Space>
                <LinkOutlined />
                <Text strong>Fichier liens (optionnel)</Text>
              </Space>
            }
            extra="Export 'All Outlinks' pour un calcul PageRank plus précis avec les vrais liens du site"
            style={{ marginBottom: 24 }}
          >
            <Dragger {...linksUploadProps} style={{ backgroundColor: '#fafafa' }}>
              <p className="ant-upload-drag-icon">
                <LinkOutlined style={{ fontSize: '48px', color: '#52c41a' }} />
              </p>
              <p className="ant-upload-text" style={{ fontSize: '16px', fontWeight: 'bold' }}>
                Fichier liens (optionnel)
              </p>
              <p className="ant-upload-hint" style={{ fontSize: '14px', marginTop: 8 }}>
                <Text type="secondary">
                  🔗 Export depuis Screaming Frog: Bulk Export → All → All Outlinks<br/>
                  📈 Améliore la précision du calcul PageRank
                </Text>
              </p>
            </Dragger>
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0, marginTop: 20 }}>
            <Space size="large">
              <Button 
                onClick={() => {
                  setImportModalVisible(false);
                  form.resetFields();
                  setPagesFile(null);
                  setLinksFile(null);
                }}
                size="large"
              >
                Annuler
              </Button>
              <Button 
                type="primary"
                htmlType="submit"
                loading={importMultiMutation.isPending}
                disabled={!pagesFile}
                size="large"
                icon={<ThunderboltOutlined />}
              >
                {importMultiMutation.isPending ? 'Analyse en cours...' : 'Analyser le PageRank'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectList;