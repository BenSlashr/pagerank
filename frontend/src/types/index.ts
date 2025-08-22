export interface Project {
  id: number;
  name: string;
  domain: string;
  total_pages: number;
  page_types?: string[] | null;
  created_at: string;
}

export interface Page {
  id: number;
  project_id: number;
  url: string;
  type: string | null;
  category: string | null;
  current_pagerank: number;
}

export interface LinkingRule {
  source_types: string[];
  source_categories: string[];
  target_types: string[];
  target_categories: string[];
  selection_method: 'category' | 'semantic' | 'random' | 'pagerank_high' | 'pagerank_low';
  links_per_page: number;
  bidirectional: boolean;
  avoid_self_links: boolean;
}

export interface PageBoost {
  url: string;
  boost_factor: number;
}

export interface PageProtect {
  url: string;
  protection_factor: number;
}

export interface Simulation {
  id: number;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  rules: LinkingRule[]; // Multiple rules instead of single rule_config
  page_boosts: PageBoost[]; // URL-specific PageRank boosts
  protected_pages: PageProtect[]; // Page protection configurations
  created_at: string;
}

export interface SimulationResult {
  page_id: number;
  url: string;
  type: string | null;
  category: string | null;
  current_pagerank: number;
  new_pagerank: number;
  pagerank_delta: number;
  percent_change: number;
}

export interface SimulationDetails {
  simulation: Simulation;
  results: SimulationResult[];
}

export interface RuleInfo {
  name: string;
  class_name: string;
  description: string;
  module: string;
}

export interface PreviewLink {
  from_url: string;
  to_url: string;
  from_type: string | null;
  to_type: string | null;
  from_category: string | null;
  to_category: string | null;
}

export interface PreviewResponse {
  rules_applied: number; // Number of rules processed
  total_new_links: number;
  preview_links: PreviewLink[];
  truncated: boolean;
}

export interface ImportResponse {
  project_id: number;
  project_name: string;
  domain: string;
  pages_imported: number;
  links_imported: number;
}

export interface ProjectAnalysis {
  total_pages: number;
  total_pagerank: number;
  average_pagerank: number;
  max_pagerank: number;
  min_pagerank: number;
  type_distribution: Record<string, {
    count: number;
    total_pagerank: number;
    average_pagerank: number;
  }>;
  top_pages: Array<{
    url: string;
    pagerank: number;
    type: string | null;
  }>;
  bottom_pages: Array<{
    url: string;
    pagerank: number;
    type: string | null;
  }>;
}