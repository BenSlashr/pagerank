import React, { useState } from 'react';
import { 
  Modal, 
  Tabs,
  Typography
} from 'antd';
import { 
  ExperimentOutlined,
  ThunderboltOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { MultiRuleSimulationModal } from './MultiRuleSimulationModal';
import { SimulationTemplates } from './SimulationTemplates';

const { Text } = Typography;

interface NewSimulationModalProps {
  visible: boolean;
  projectId: number;
  projectTypes?: string[];
  onCancel: () => void;
}

export const NewSimulationModal: React.FC<NewSimulationModalProps> = ({
  visible,
  projectId,
  projectTypes = [],
  onCancel
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [preFilledRules, setPreFilledRules] = useState<any[]>([]);

  const handleTemplateSelect = (template: any) => {
    setPreFilledRules(template.rules);
    setShowAdvanced(true);
  };

  const handleAdvancedCancel = () => {
    setShowAdvanced(false);
    setPreFilledRules([]);
  };

  const items = [
    {
      key: 'templates',
      label: (
        <span>
          <ThunderboltOutlined />
          Templates rapides
        </span>
      ),
      children: (
        <SimulationTemplates 
          onSelectTemplate={handleTemplateSelect}
          projectTypes={projectTypes}
        />
      ),
    },
    {
      key: 'advanced',
      label: (
        <span>
          <SettingOutlined />
          Configuration avancée
        </span>
      ),
      children: (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Text type="secondary">
            Cliquez sur un template pour commencer, ou créez vos règles from scratch
          </Text>
        </div>
      ),
    },
  ];

  return (
    <>
      <Modal
        title={
          <span>
            <ExperimentOutlined />
            {' '}Nouvelle simulation
          </span>
        }
        open={visible && !showAdvanced}
        onCancel={onCancel}
        footer={null}
        width={800}
      >
        <div style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: '14px', color: '#666' }}>
            Choisissez un template pour commencer rapidement, ou configurez vos propres règles
          </Text>
        </div>
        
        <Tabs 
          defaultActiveKey="templates" 
          items={items}
          onChange={(key) => {
            if (key === 'advanced') {
              setShowAdvanced(true);
            }
          }}
        />
      </Modal>

      {showAdvanced && (
        <MultiRuleSimulationModal
          visible={true}
          projectId={projectId}
          projectTypes={projectTypes}
          onCancel={handleAdvancedCancel}
          preFilledRules={preFilledRules}
        />
      )}
    </>
  );
};