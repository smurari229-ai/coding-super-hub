export type ToolCategory = 
  | 'text-string'
  | 'crypto-security'
  | 'web-frontend'
  | 'data-formats'
  | 'devops-network'
  | 'math-algorithms'
  | 'code-snippets'
  | 'misc-productivity';

export interface ToolItem {
  id: string;
  name: string;
  category: ToolCategory;
  description: string;
  tags: string[];
  isPopular?: boolean;
  isNew?: boolean;
  isPro?: boolean;
  dedicatedComponent?: string; // If it has a custom dedicated component
  defaultInput?: string;
  placeholder?: string;
  inputLabel?: string;
  outputLabel?: string;
  actionType?: 'transform' | 'generate' | 'validate' | 'inspect' | 'calculate';
}

export interface CategoryMeta {
  id: ToolCategory;
  name: string;
  description: string;
  icon: string;
  accentColor: string;
  count: number;
}

export interface AffiliateDeal {
  id: string;
  name: string;
  category: 'Hosting & Cloud' | 'AI & Copilots' | 'Database & Backend' | 'Dev Tools & IDEs' | 'Security & Auth';
  description: string;
  dealText: string;
  badge?: string;
  rating: number;
  referralUrl: string;
  code?: string;
}

export interface AiModelConfig {
  provider: 'gemini' | 'openai' | 'claude' | 'grok';
  modelName: string;
  apiKey?: string;
}
