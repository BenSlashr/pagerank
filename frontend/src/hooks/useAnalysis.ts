import { useQuery } from '@tanstack/react-query';
import { analysisApi } from '../services/api';

export const useProjectAnalysis = (projectId: number) => {
  return useQuery({
    queryKey: ['analysis', 'project', projectId],
    queryFn: async () => {
      const response = await analysisApi.getProjectAnalysis(projectId);
      return response.data;
    },
    enabled: !!projectId,
  });
};

export const useSimulationAnalysis = (simulationId: number) => {
  return useQuery({
    queryKey: ['analysis', 'simulation', simulationId],
    queryFn: async () => {
      console.log('useSimulationAnalysis API call for ID:', simulationId);
      const response = await analysisApi.getSimulationAnalysis(simulationId);
      return response.data;
    },
    enabled: !!simulationId,
    staleTime: 0, // Force refresh
    refetchOnMount: true,
  });
};