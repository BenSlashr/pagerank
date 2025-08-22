import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../services/api';

export const useProjects = () => {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await projectsApi.list();
      return response.data;
    },
  });
};

export const useProject = (id: number) => {
  return useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const response = await projectsApi.get(id);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useProjectPages = (id: number) => {
  return useQuery({
    queryKey: ['project', id, 'pages'],
    queryFn: async () => {
      const response = await projectsApi.getPages(id);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useImportProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ file, projectName }: { file: File; projectName: string }) => {
      const response = await projectsApi.import(file, projectName);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};

export const useImportMultiProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ files, projectName }: { files: File[]; projectName: string }) => {
      const response = await projectsApi.importMulti(files, projectName);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name: string } }) => {
      const response = await projectsApi.update(id, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', id] });
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await projectsApi.delete(id);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};

export const useCalculatePagerank = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await projectsApi.calculatePagerank(id);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['project', id, 'pages'] });
      queryClient.invalidateQueries({ queryKey: ['analysis', 'project', id] });
      queryClient.invalidateQueries({ queryKey: ['gsc-data', id] });
      queryClient.invalidateQueries({ queryKey: ['combined-pages-gsc', id] });
    },
  });
};