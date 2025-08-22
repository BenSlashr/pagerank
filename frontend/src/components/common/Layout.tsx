import React from 'react';
import { Layout as AntLayout, Menu, Typography } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import { 
  DashboardOutlined, 
  ProjectOutlined, 
  ExperimentOutlined
} from '@ant-design/icons';

const { Header, Sider, Content } = AntLayout;
const { Title } = Typography;

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  
  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: <Link to="/">Dashboard</Link>,
    },
    {
      key: '/projects',
      icon: <ProjectOutlined />,
      label: <Link to="/projects">Projects</Link>,
    },
    {
      key: '/simulations',
      icon: <ExperimentOutlined />,
      label: <Link to="/simulations">Simulations</Link>,
    },
  ];

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        background: '#fff', 
        padding: '0 24px',
        borderBottom: '1px solid #f0f0f0'
      }}>
        <Title level={3} style={{ margin: '16px 0' }}>
          PageRank Simulator
        </Title>
      </Header>
      
      <AntLayout>
        <Sider 
          width={250} 
          theme="light"
          style={{ 
            borderRight: '1px solid #f0f0f0',
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            style={{ borderRight: 0 }}
          />
        </Sider>
        
        <Content 
          style={{ 
            padding: '24px',
            background: '#fff',
            minHeight: 280 
          }}
        >
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
};