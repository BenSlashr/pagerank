import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

// GSC Data interface
export interface GSCData {
  url: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  page_id: number | null;
  import_date: string;
}

// GSC Summary interface  
export interface GSCSummary {
  project_id: number;
  total_urls: number;
  total_impressions: number;
  total_clicks: number;
  average_ctr: number;
  average_position: number;
  data: GSCData[];
}

// GSC + PageRank Analysis interface
export interface GSCPageRankAnalysis {
  project_id: number;
  project_name: string;
  total_urls: number;
  total_impressions: number;
  total_clicks: number;
  insights: {
    high_traffic_low_pagerank: {
      count: number;
      top_10: Array<{
        url: string;
        pagerank: number;
        impressions: number;
        clicks: number;
        position: number;
        traffic_score: number;
      }>;
    };
    high_pagerank_no_traffic: {
      count: number;
      top_10: Array<{
        url: string;
        pagerank: number;
        impressions: number;
        clicks: number;
        position: number;
        traffic_score: number;
      }>;
    };
    balanced_pages: {
      count: number;
      top_10: Array<{
        url: string;
        pagerank: number;
        impressions: number;
        clicks: number;
        position: number;
        traffic_score: number;
      }>;
    };
    orphan_gsc: {
      count: number;
      top_10: Array<{
        url: string;
        impressions: number;
        clicks: number;
        position: number;
      }>;
    };
  };
}

// Hook to get GSC data for a project
export const useGSCData = (projectId: number) => {
  return useQuery({
    queryKey: ['gsc-data', projectId],
    queryFn: async (): Promise<GSCSummary> => {
      const response = await api.get(`/projects/${projectId}/gsc-data`);
      return response.data;
    },
    enabled: !!projectId,
  });
};

// Hook to get GSC + PageRank cross analysis
export const useGSCPageRankAnalysis = (projectId: number) => {
  return useQuery({
    queryKey: ['gsc-pagerank-analysis', projectId],
    queryFn: async (): Promise<GSCPageRankAnalysis> => {
      const response = await api.get(`/projects/${projectId}/gsc-pagerank-analysis`);
      return response.data;
    },
    enabled: !!projectId,
  });
};

// Hook to check if project has GSC data
export const useHasGSCData = (projectId: number) => {
  const { data } = useGSCData(projectId);
  return {
    hasGSCData: (data?.total_urls || 0) > 0,
    totalUrls: data?.total_urls || 0,
    totalImpressions: data?.total_impressions || 0,
    totalClicks: data?.total_clicks || 0
  };
};

// Hook to get combined pages + GSC data for overview table
export const useCombinedPagesGSCData = (projectId: number) => {
  return useQuery({
    queryKey: ['combined-pages-gsc', projectId],
    queryFn: async (): Promise<Array<{
      id: number;
      url: string;
      type: string;
      current_pagerank: number;
      gsc_impressions?: number;
      gsc_clicks?: number;
      gsc_ctr?: number;
      gsc_position?: number;
      gsc_traffic_score?: number;
      has_gsc_data: boolean;
    }>> => {
      // Get both pages and GSC data
      const [pagesResponse, gscResponse] = await Promise.all([
        api.get(`/projects/${projectId}/pages`),
        api.get(`/projects/${projectId}/gsc-data`).catch(() => ({ data: { data: [] } }))
      ]);
      
      const pages = pagesResponse.data;
      const gscData = gscResponse.data?.data || [];
      
      // Create a map of GSC data by URL
      const gscMap = new Map<string, GSCData>(gscData.map((item: GSCData) => [item.url, item]));
      
      // Combine pages with GSC data
      return pages.map((page: any) => {
        const gscItem: GSCData | undefined = gscMap.get(page.url);
        
        return {
          id: page.id,
          url: page.url,
          type: page.type || 'other',
          current_pagerank: page.current_pagerank,
          gsc_impressions: gscItem?.impressions || 0,
          gsc_clicks: gscItem?.clicks || 0,
          gsc_ctr: gscItem?.ctr || 0,
          gsc_position: gscItem?.position || 0,
          gsc_traffic_score: gscItem ? ((gscItem.impressions || 0) + ((gscItem.clicks || 0) * 10)) : 0,
          has_gsc_data: !!gscItem
        };
      });
    },
    enabled: !!projectId,
  });
};

