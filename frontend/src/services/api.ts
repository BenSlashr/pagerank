import axios from 'axios';
import { 
  Project, 
  Page, 
  Simulation, 
  SimulationDetails, 
  RuleInfo, 
  PreviewResponse,
  ImportResponse,
  ProjectAnalysis,
  LinkingRule
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || (
  import.meta.env.PROD ? '/pagerank' : 'http://localhost:8000'
);

const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Projects
export const projectsApi = {
  list: () => api.get<Project[]>('/projects/'),
  get: (id: number) => api.get<Project>(`/projects/${id}`),
  getPages: (id: number) => api.get<Page[]>(`/projects/${id}/pages`),
  update: (id: number, data: { name: string }) => api.put(`/projects/${id}`, data),
  delete: (id: number) => api.delete(`/projects/${id}`),
  calculatePagerank: (id: number) => api.post(`/projects/${id}/calculate-pagerank`),
  import: async (file: File, projectName: string): Promise<{ data: ImportResponse }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('project_name', projectName);
    
    const response = await fetch(`${API_BASE}/api/v1/projects/import`, {
      method: 'POST',
      body: formData,
      // Pas de headers Content-Type - fetch gère automatiquement multipart/form-data
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw { response: { data: errorData } };
    }

    const data = await response.json();
    return { data };
  },
  
  importMulti: async (files: File[], projectName: string): Promise<{ data: ImportResponse }> => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('project_name', projectName);
    
    const response = await fetch(`${API_BASE}/api/v1/projects/import-multi`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Multi-import failed' }));
      throw { response: { data: errorData } };
    }

    const data = await response.json();
    return { data };
  },
};

// Simulations
export const simulationsApi = {
  getRules: () => api.get<RuleInfo[]>('/rules'),
  create: (projectId: number, data: {
    name: string;
    rules: LinkingRule[];
  }) => api.post(`/projects/${projectId}/simulations`, data),
  list: (projectId: number) => api.get<Simulation[]>(`/projects/${projectId}/simulations`),
  get: (simulationId: number) => api.get<SimulationDetails>(`/simulations/${simulationId}`),
  preview: (projectId: number, data: {
    rules: LinkingRule[];
    preview_count?: number;
  }) => api.post<PreviewResponse>(`/projects/${projectId}/preview`, data),
};

// Analysis
export const analysisApi = {
  getProjectAnalysis: (projectId: number) => 
    api.get<ProjectAnalysis>(`/analysis/projects/${projectId}/analysis`),
  getSimulationAnalysis: (simulationId: number) => 
    api.get(`/analysis/simulations/${simulationId}/analysis`),
};

// Export
export const exportApi = {
  exportSimulationCSV: (simulationId: number) => {
    return api.get(`/export/simulations/${simulationId}/export/csv`, {
      responseType: 'blob',
    });
  },
  exportImplementationPlan: (simulationId: number) => {
    return api.get(`/export/simulations/${simulationId}/export/implementation-plan`, {
      responseType: 'blob',
    });
  },
};

export default api;