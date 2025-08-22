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
  Popconfirm,
  App,
  Tooltip,
  Alert
} from 'antd';
import { Link } from 'react-router-dom';
import { 
  PlusOutlined, 
  UploadOutlined, 
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  PlayCircleOutlined,
  ExclamationCircleOutlined,
  ProjectOutlined,
  LinkOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadProps } from 'antd';
import { 
  useProjects, 
  useImportProject, 
  useImportMultiProject,
  useUpdateProject, 
  useDeleteProject,
  useCalculatePagerank 
} from '../hooks/useProjects';
import type { Project } from '../types';

const { Title, Text } = Typography;
const { Dragger } = Upload;

const Dashboard: React.FC = () => {
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [pagesFile, setPagesFile] = useState<File | null>(null);
  const [linksFile, setLinksFile] = useState<File | null>(null);
  const { message: messageApi } = App.useApp();
  
  const { data: projects, isLoading } = useProjects();
  const importMutation = useImportProject();
  const importMultiMutation = useImportMultiProject();
  const updateMutation = useUpdateProject();
  const deleteMutation = useDeleteProject();
  const calculatePagerank = useCalculatePagerank();

  const handleImport = async (values: { projectName: string }) => {
    if (!pagesFile) {
      messageApi.error('Please select a pages CSV file (required)');
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
        `Project imported successfully! ${filesToImport.length} file(s) processed: ` +
        `${pagesFile ? 'Pages ✓' : ''} ${linksFile ? 'Links ✓' : ''}`
      );
      
      setImportModalVisible(false);
      form.resetFields();
      setPagesFile(null);
      setLinksFile(null);
    } catch (error: any) {
      let errorMessage = 'Import failed';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map((err: any) => err.msg || err).join(', ');
        }
      }
      
      messageApi.error(errorMessage);
    }
  };

  const handleEdit = async (values: { name: string }) => {
    if (!editingProject) return;

    try {
      await updateMutation.mutateAsync({
        id: editingProject.id,
        data: { name: values.name }
      });
      
      messageApi.success('Project updated successfully!');
      setEditModalVisible(false);
      setEditingProject(null);
      editForm.resetFields();
    } catch (error: any) {
      messageApi.error('Failed to update project');
    }
  };

  const handleDelete = async (project: Project) => {
    try {
      await deleteMutation.mutateAsync(project.id);
      messageApi.success(`Project "${project.name}" deleted successfully!`);
    } catch (error: any) {
      messageApi.error('Failed to delete project');
    }
  };

  const handleCalculatePagerank = async (project: Project) => {
    try {
      messageApi.info(`Starting PageRank calculation for "${project.name}"... This process runs in the background and may take several minutes for large sites (${project.total_pages.toLocaleString()} pages). The server may appear slow during this time.`);
      await calculatePagerank.mutateAsync(project.id);
      messageApi.success(`PageRank calculated successfully for "${project.name}"! You can now run simulations and view updated scores.`);
    } catch (error: any) {
      messageApi.error('Failed to calculate PageRank. The server may be overloaded - try again in a few minutes.');
    }
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    editForm.setFieldsValue({ name: project.name });
    setEditModalVisible(true);
  };


  const columns: ColumnsType<Project> = [
    {
      title: 'Project Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Project) => (
        <Link to={`/projects/${record.id}`}>
          <strong style={{ color: '#1890ff' }}>{text}</strong>
        </Link>
      ),
    },
    {
      title: 'Domain',
      dataIndex: 'domain',
      key: 'domain',
      render: (domain: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
          {domain}
        </span>
      ),
    },
    {
      title: 'Pages',
      dataIndex: 'total_pages',
      key: 'total_pages',
      render: (value: number) => (
        <Tag color={value > 10000 ? 'red' : value > 1000 ? 'orange' : 'blue'}>
          {value.toLocaleString()}
        </Tag>
      ),
      sorter: (a, b) => a.total_pages - b.total_pages,
    },
    {
      title: 'Types de pages',
      dataIndex: 'page_types',
      key: 'page_types',
      render: (pageTypes: string[] | null) => (
        <div style={{ maxWidth: '200px' }}>
          {pageTypes && pageTypes.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {pageTypes.map((type, index) => (
                <Tag key={index} color="geekblue" style={{ margin: '2px 0' }}>
                  {type}
                </Tag>
              ))}
            </div>
          ) : (
            <Tag color="gray">Aucun type défini</Tag>
          )}
        </div>
      ),
    },
    {
      title: 'PageRank Status',
      key: 'pagerank_status',
      render: (_, record: Project) => {
        // Determine PageRank status based on project data
        const getPageRankStatus = (project: Project) => {
          // If no pages, show empty project status
          if (!project.total_pages || project.total_pages === 0) {
            return {
              status: 'Empty Project',
              color: 'default',
              icon: <ExclamationCircleOutlined />
            };
          }
          
          // Check if we have any indication that PageRank has been calculated
          // This is a simplified check - in a real implementation you'd want to 
          // fetch this information from the backend
          const hasCalculatedPageRank = false; // We'll need to get this from API
          
          if (hasCalculatedPageRank) {
            return {
              status: 'PageRank Calculated',
              color: 'success',
              icon: <PlayCircleOutlined />
            };
          } else {
            return {
              status: 'Manual Calculation Required',
              color: 'warning',
              icon: <PlayCircleOutlined />
            };
          }
        };
        
        const statusInfo = getPageRankStatus(record);
        
        return (
          <Tag color={statusInfo.color} icon={statusInfo.icon}>
            {statusInfo.status}
          </Tag>
        );
      },
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => (
        <Space>
          <CalendarOutlined />
          {new Date(date).toLocaleDateString()}
        </Space>
      ),
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (_, record: Project) => (
        <Space>
          <Link to={`/projects/${record.id}`}>
            <Tooltip title="View Details">
              <Button 
                type="primary" 
                size="small" 
                icon={<EyeOutlined />}
              />
            </Tooltip>
          </Link>
          
          <Tooltip title="Edit Project">
            <Button 
              size="small" 
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
            />
          </Tooltip>
          
          <Tooltip title="Calculate PageRank (Manual - may take several minutes for large sites)">
            <Button 
              size="small" 
              icon={<PlayCircleOutlined />}
              loading={calculatePagerank.isPending}
              onClick={() => handleCalculatePagerank(record)}
            />
          </Tooltip>
          
          <Tooltip title="Delete Project">
            <Popconfirm
              title="Delete Project"
              description={`Are you sure you want to delete "${record.name}"? This action cannot be undone.`}
              icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
              onConfirm={() => handleDelete(record)}
              okText="Delete"
              cancelText="Cancel"
              okType="danger"
            >
              <Button 
                size="small" 
                danger
                icon={<DeleteOutlined />}
                loading={deleteMutation.isPending}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 24 
      }}>
        <Title level={2}>Projects Dashboard</Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          size="large"
          onClick={() => setImportModalVisible(true)}
        >
          Importer un projet
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={projects}
          loading={isLoading}
          rowKey="id"
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} projects`,
          }}
          locale={{
            emptyText: 'No projects yet. Import your first Screaming Frog CSV to get started.'
          }}
        />
      </Card>

      {/* Import Modal */}
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
                <div style={{ color: '#fa8c16', fontSize: '12px', marginTop: '2px' }}>
                  ⚠️ La colonne "Segments" doit être renseignée (Catégorie, Produit, Blog, etc.)
                </div>
              </div>
            }
            required
            style={{ marginBottom: 24 }}
          >
            <Dragger 
              name="pagesFile"
              multiple={false}
              accept=".csv"
              beforeUpload={(file) => {
                setPagesFile(file);
                return false;
              }}
              onRemove={() => setPagesFile(null)}
              fileList={pagesFile ? [pagesFile as any] : []}
              style={{ backgroundColor: '#fafafa' }}
            >
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
            <Dragger 
              name="linksFile"
              multiple={false}
              accept=".csv"
              beforeUpload={(file) => {
                setLinksFile(file);
                return false;
              }}
              onRemove={() => setLinksFile(null)}
              fileList={linksFile ? [linksFile as any] : []}
              style={{ backgroundColor: '#fafafa' }}
            >
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

      {/* Edit Modal */}
      <Modal
        title="Edit Project"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingProject(null);
          editForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEdit}
        >
          <Form.Item
            name="name"
            label="Project Name"
            rules={[
              { required: true, message: 'Please enter a project name' },
              { min: 2, message: 'Project name must be at least 2 characters' }
            ]}
          >
            <Input size="large" />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button 
                onClick={() => {
                  setEditModalVisible(false);
                  setEditingProject(null);
                  editForm.resetFields();
                }}
              >
                Cancel
              </Button>
              <Button 
                type="primary"
                htmlType="submit"
                loading={updateMutation.isPending}
              >
                Update Project
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Dashboard;