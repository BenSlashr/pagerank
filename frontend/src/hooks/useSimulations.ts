import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { simulationsApi } from '../services/api';
import { LinkingRule, PageBoost, PageProtect } from '../types';

export const useRules = () => {
  return useQuery({
    queryKey: ['rules'],
    queryFn: async () => {
      const response = await simulationsApi.getRules();
      return response.data;
    },
  });
};

export const useSimulations = (projectId: number) => {
  return useQuery({
    queryKey: ['simulations', projectId],
    queryFn: async () => {
      const response = await simulationsApi.list(projectId);
      return response.data;
    },
    enabled: !!projectId,
  });
};

export const useSimulation = (simulationId: number) => {
  return useQuery({
    queryKey: ['simulation', simulationId],
    queryFn: async () => {
      console.log('useSimulation API call for ID:', simulationId);
      const response = await simulationsApi.get(simulationId);
      console.log('useSimulation API response ID:', response.data?.simulation?.id);
      console.log('useSimulation API response name:', response.data?.simulation?.name);
      console.log('useSimulation API response rules:', response.data?.simulation?.rules);
      return response.data;
    },
    enabled: !!simulationId,
    staleTime: 0, // Force refresh
    refetchOnMount: true,
  });
};

export const useCreateSimulation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      projectId: number;
      name: string;
      rules: LinkingRule[];
      page_boosts?: PageBoost[];
      protected_pages?: PageProtect[];
    }) => {
      const { projectId, ...simulationData } = data;
      const response = await simulationsApi.create(projectId, simulationData);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['simulations', variables.projectId] });
    },
  });
};

export const usePreviewRules = () => {
  return useMutation({
    mutationFn: async (data: {
      projectId: number;
      rules: LinkingRule[];
      preview_count?: number;
    }) => {
      const { projectId, ...previewData } = data;
      const response = await simulationsApi.preview(projectId, previewData);
      return response.data;
    },
  });
};