import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, App as AntdApp } from 'antd';
import { Layout } from './components/common/Layout';
import Dashboard from './pages/Dashboard';
import ProjectList from './pages/ProjectList';
import ProjectDetail from './pages/ProjectDetail';
import SimulationDetail from './pages/SimulationDetail';
import SimulationsList from './pages/SimulationsList';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App: React.FC = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <AntdApp>
          <Router>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/projects" element={<ProjectList />} />
                <Route path="/projects/:projectId" element={<ProjectDetail />} />
                <Route path="/simulations" element={<SimulationsList />} />
                <Route path="/simulations/:simulationId" element={<SimulationDetail key={window.location.pathname} />} />
              </Routes>
            </Layout>
          </Router>
        </AntdApp>
      </QueryClientProvider>
    </ConfigProvider>
  );
};

export default App;