import React from 'react';
import { Typography, Card, Table, Tag, Empty, Space, Button } from 'antd';
import { Link } from 'react-router-dom';
import { 
  ExperimentOutlined, 
  EyeOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useProjects } from '../hooks/useProjects';
import { useSimulations } from '../hooks/useSimulations';
import type { Simulation } from '../types';

const { Title, Text } = Typography;

const SimulationsList: React.FC = () => {
  const { data: projects } = useProjects();
  
  // Pour l'instant, on va juste afficher un message si pas de projets
  // Dans une version plus avancée, on pourrait faire un appel API pour toutes les simulations
  const allSimulations: any[] = [];
  
  // TODO: Implémenter une vraie collecte de simulations depuis l'API

  const columns: ColumnsType<Simulation & { project: any }> = [
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record) => (
        <Link to={`/simulations/${record.id}`}>
          <strong>{text}</strong>
        </Link>
      ),
    },
    {
      title: 'Projet',
      dataIndex: 'project',
      key: 'project',
      render: (project: any) => (
        <Link to={`/projects/${project.id}`}>
          {project.name}
        </Link>
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
        }>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Règles',
      dataIndex: 'rules',
      key: 'rules',
      render: (rules: any[]) => {
        if (!rules || rules.length === 0) {
          return <Text type="secondary">Aucune règle</Text>;
        }
        return (
          <Space direction="vertical" size="small">
            {rules.slice(0, 2).map((rule, index) => (
              <Tag key={index} size="small">
                {rule.source_types?.length > 0 ? rule.source_types.join(',') : 'toutes'} 
                → {rule.target_types?.length > 0 ? rule.target_types.join(',') : 'toutes'}
                ({rule.selection_method})
              </Tag>
            ))}
            {rules.length > 2 && (
              <Text type="secondary" style={{ fontSize: '11px' }}>
                ... et {rules.length - 2} autres
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Créé',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => (
        <Space>
          <CalendarOutlined />
          {new Date(date).toLocaleDateString()}
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Link to={`/simulations/${record.id}`}>
          <Button 
            type="primary" 
            size="small" 
            icon={<EyeOutlined />}
            disabled={record.status !== 'completed'}
          >
            Voir Résultats
          </Button>
        </Link>
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
        <Title level={2}>
          <ExperimentOutlined /> Toutes les Simulations
        </Title>
      </div>

      <Card>
        {allSimulations.length === 0 ? (
          <div>
            <Empty
              description={
                <span>
                  Page des simulations en développement.
                  <br />
                  <Text type="secondary">
                    Pour l'instant, accédez aux simulations via les projets individuels.
                  </Text>
                </span>
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Space>
                <Link to="/projects">
                  <Button type="primary">
                    Voir les Projets
                  </Button>
                </Link>
              </Space>
            </Empty>
            
            {projects && projects.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <Title level={4}>Projets disponibles :</Title>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 16 }}>
                  {projects.map(project => (
                    <Card key={project.id} size="small" style={{ width: 300 }}>
                      <Card.Meta
                        title={<Link to={`/projects/${project.id}`}>{project.name}</Link>}
                        description={
                          <div>
                            <Text type="secondary">{project.domain}</Text>
                            <br />
                            <Text style={{ fontSize: '12px' }}>{project.total_pages} pages</Text>
                          </div>
                        }
                      />
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={allSimulations}
            rowKey="id"
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} de ${total} simulations`,
            }}
          />
        )}
      </Card>
    </div>
  );
};

export default SimulationsList;