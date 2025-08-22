import React, { useState } from 'react';
import { Modal, Upload, Form, DatePicker, Alert, Progress, Typography, Space, Button } from 'antd';
import { InboxOutlined, GoogleOutlined, UploadOutlined } from '@ant-design/icons';
import type { RcFile, UploadProps } from 'antd/es/upload';
import type { UploadFile } from 'antd/es/upload/interface';
import api from '../../services/api';

const { Dragger } = Upload;
const { RangePicker } = DatePicker;
const { Text, Title } = Typography;

interface GSCImportModalProps {
  visible: boolean;
  projectId: number;
  onCancel: () => void;
  onSuccess: () => void;
}

interface ImportResult {
  imported_rows: number;
  matched_pages: number;
  unmatched_urls: string[];
  total_unmatched: number;
  message: string;
}

export const GSCImportModal: React.FC<GSCImportModalProps> = ({
  visible,
  projectId,
  onCancel,
  onSuccess
}) => {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleUpload = async () => {
    if (fileList.length === 0) {
      return;
    }

    // Get file from fileList - try different ways to access it
    const originalFile = fileList[0].originFileObj || fileList[0];
    if (!originalFile) {
      console.error('No file found in fileList[0]');
      console.log('FileList item:', fileList[0]);
      return;
    }

    console.log('Uploading file:', originalFile.name, 'Size:', originalFile.size);

    // Create a clean File object without extra properties
    const cleanFile = new File([originalFile], originalFile.name, {
      type: originalFile.type || 'text/csv'
    });

    const formData = new FormData();
    formData.append('file', cleanFile);

    // Add date range if selected
    const dateRange = form.getFieldValue('dateRange');
    if (dateRange && dateRange[0] && dateRange[1]) {
      formData.append('period_start', dateRange[0].toISOString());
      formData.append('period_end', dateRange[1].toISOString());
    }

    // Debug: Log FormData contents
    console.log('FormData contents:');
    for (let [key, value] of formData.entries()) {
      console.log(key, value);
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      setUploadProgress(50);
      
      // Use fetch instead of axios for better multipart/form-data handling
      const response = await fetch(`http://localhost:8000/api/v1/projects/${projectId}/import-gsc`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - fetch will set it automatically with boundary
      });

      setUploadProgress(90);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Upload failed' }));
        throw { response: { data: errorData } };
      }

      const data = await response.json();
      setUploadProgress(100);
      setImportResult(data);
      
      // Auto-close after success and short delay
      setTimeout(() => {
        onSuccess();
        handleModalClose();
      }, 3000);

    } catch (error: any) {
      console.error('GSC import failed:', error);
      
      // Extract error message safely
      let errorMessage = 'Import failed';
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          // Handle validation errors array
          errorMessage = error.response.data.detail.map((err: any) => 
            typeof err === 'string' ? err : err.msg || 'Validation error'
          ).join(', ');
        } else {
          errorMessage = 'Import failed - Invalid data format';
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setImportResult({
        imported_rows: 0,
        matched_pages: 0,
        unmatched_urls: [],
        total_unmatched: 0,
        message: errorMessage
      });
    } finally {
      setUploading(false);
    }
  };

  const handleModalClose = () => {
    setFileList([]);
    setImportResult(null);
    setUploadProgress(0);
    form.resetFields();
    onCancel();
  };

  const uploadProps: UploadProps = {
    onRemove: () => {
      setFileList([]);
    },
    beforeUpload: (file) => {
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.csv')) {
        Modal.error({
          title: 'Format de fichier incorrect',
          content: 'Veuillez sélectionner un fichier CSV exporté depuis Google Search Console.',
        });
        return false;
      }

      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        Modal.error({
          title: 'Fichier trop volumineux',
          content: 'Le fichier ne doit pas dépasser 50MB.',
        });
        return false;
      }

      // Create proper UploadFile object with originFileObj
      const uploadFile = {
        uid: `upload-${Date.now()}`,
        name: file.name,
        status: 'done' as const,
        url: '',
        originFileObj: file
      };

      console.log('File added to list:', file.name, file.size);
      setFileList([uploadFile]);
      return false; // Prevent automatic upload
    },
    fileList,
  };

  return (
    <Modal
      title={
        <Space>
          <GoogleOutlined style={{ color: '#4285F4' }} />
          Importer les données Google Search Console
        </Space>
      }
      open={visible}
      onCancel={handleModalClose}
      footer={null}
      width={600}
      destroyOnHidden
    >
      {!importResult ? (
        <div>
          <Alert
            message="Format CSV requis"
            description={
              <div>
                <Text>Exportez vos données depuis Google Search Console avec ces colonnes :</Text>
                <div style={{ 
                  fontFamily: 'monospace', 
                  backgroundColor: '#f5f5f5', 
                  padding: '8px', 
                  marginTop: '8px',
                  borderRadius: '4px'
                }}>
                  Page | Impressions | Clicks | CTR | Position
                </div>
              </div>
            }
            type="info"
            style={{ marginBottom: 16 }}
          />

          <Form form={form} layout="vertical">
            <Form.Item 
              label="Période des données (optionnel)"
              name="dateRange"
              tooltip="Indiquez la période couverte par vos données GSC pour un meilleur suivi"
            >
              <RangePicker 
                style={{ width: '100%' }}
                placeholder={['Date de début', 'Date de fin']}
              />
            </Form.Item>

            <Form.Item label="Fichier CSV Google Search Console">
              <Dragger {...uploadProps} disabled={uploading}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined style={{ color: uploading ? '#d9d9d9' : '#1890ff' }} />
                </p>
                <p className="ant-upload-text">
                  {uploading ? 'Import en cours...' : 'Cliquez ou glissez le fichier CSV ici'}
                </p>
                <p className="ant-upload-hint">
                  Fichier CSV exporté depuis Google Search Console (max 50MB)
                </p>
              </Dragger>
            </Form.Item>

            {uploading && (
              <div style={{ marginTop: 16 }}>
                <Progress 
                  percent={uploadProgress} 
                  status={uploadProgress === 100 ? 'success' : 'active'}
                  strokeColor={{
                    '0%': '#4285F4',
                    '100%': '#52c41a',
                  }}
                />
                <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: '8px' }}>
                  {uploadProgress < 50 ? 'Téléchargement...' : 
                   uploadProgress < 90 ? 'Traitement des données...' : 
                   uploadProgress < 100 ? 'Finalisation...' : 'Terminé !'}
                </Text>
              </div>
            )}

            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              marginTop: 24 
            }}>
              <Button onClick={handleModalClose} disabled={uploading}>
                Annuler
              </Button>
              <Button
                type="primary"
                icon={<UploadOutlined />}
                onClick={handleUpload}
                disabled={fileList.length === 0 || uploading}
                loading={uploading}
              >
                {uploading ? 'Import en cours...' : 'Importer les données GSC'}
              </Button>
            </div>
          </Form>
        </div>
      ) : (
        <div>
          <Alert
            message={importResult.imported_rows > 0 ? "Import réussi !" : "Échec de l'import"}
            description={importResult.message}
            type={importResult.imported_rows > 0 ? "success" : "error"}
            style={{ marginBottom: 16 }}
          />

          {importResult.imported_rows > 0 && (
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#f6ffed', 
              borderRadius: '6px',
              border: '1px solid #b7eb8f'
            }}>
              <Title level={5}>📊 Résumé de l'import</Title>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                <div>
                  <Text strong>URLs importées:</Text><br />
                  <Text style={{ fontSize: '18px', color: '#52c41a' }}>{importResult.imported_rows}</Text>
                </div>
                <div>
                  <Text strong>Pages correspondantes:</Text><br />
                  <Text style={{ fontSize: '18px', color: '#1890ff' }}>{importResult.matched_pages}</Text>
                </div>
              </div>
              
              {importResult.total_unmatched > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <Alert
                    message={`${importResult.total_unmatched} URLs GSC non correspondantes`}
                    description="Ces URLs existent dans GSC mais pas dans votre projet PageRank. Vérifiez que toutes vos pages importantes ont été importées."
                    type="warning"
                    showIcon
                    style={{ fontSize: '12px' }}
                  />
                  {importResult.unmatched_urls && importResult.unmatched_urls.length > 0 && (
                    <div style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>
                      <strong>Exemples d'URLs non correspondantes:</strong>
                      <ul style={{ marginTop: '4px', paddingLeft: '16px' }}>
                        {importResult.unmatched_urls.slice(0, 3).map((url, index) => (
                          <li key={index} style={{ marginBottom: '2px', wordBreak: 'break-all' }}>
                            {typeof url === 'string' ? url : String(url)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            marginTop: 24 
          }}>
            <Button type="primary" onClick={() => {
              onSuccess();
              handleModalClose();
            }}>
              Voir l'analyse GSC
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};