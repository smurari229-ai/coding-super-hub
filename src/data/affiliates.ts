import { AffiliateDeal } from '../types/tools';

const env = (key: string): string | undefined => {
  const value = import.meta.env[key] as string | undefined;
  return value?.trim() || undefined;
};

const affiliateUrl = (key: string, officialUrl: string) =>
  env(key) ?? officialUrl;

const hasAffiliateUrl = (key: string) => Boolean(env(key));

export const AFFILIATE_DEALS: AffiliateDeal[] = [
  // Hosting & Cloud
  {
    id: 'digitalocean',
    name: 'DigitalOcean Cloud',
    category: 'Hosting & Cloud',
    description: 'Reliable cloud infrastructure, Droplets, Managed Kubernetes, and App Platform.',
    dealText: '$200 promotional credit may be available for eligible new users',
    badge: 'Popular for VPS',
    rating: 4.8,
    referralUrl: affiliateUrl('VITE_AFFILIATE_DIGITALOCEAN_URL', 'https://www.digitalocean.com/'),
    isAffiliate: hasAffiliateUrl('VITE_AFFILIATE_DIGITALOCEAN_URL')
  },
  {
    id: 'render',
    name: 'Render Cloud Application Hosting',
    category: 'Hosting & Cloud',
    description: 'Managed hosting for web services, static sites, databases, and scheduled jobs.',
    dealText: 'Check current free-tier and partner offers',
    badge: 'Zero DevOps',
    rating: 4.9,
    referralUrl: affiliateUrl('VITE_AFFILIATE_RENDER_URL', 'https://render.com/'),
    isAffiliate: hasAffiliateUrl('VITE_AFFILIATE_RENDER_URL')
  },
  {
    id: 'railway',
    name: 'Railway Deployment Platform',
    category: 'Hosting & Cloud',
    description: 'Deploy applications and databases with an integrated developer workflow.',
    dealText: 'Referral credits may be available',
    badge: 'Instant DB & Apps',
    rating: 4.7,
    referralUrl: affiliateUrl('VITE_AFFILIATE_RAILWAY_URL', 'https://railway.com/'),
    isAffiliate: hasAffiliateUrl('VITE_AFFILIATE_RAILWAY_URL')
  },

  // AI & Copilots
  {
    id: 'cursor',
    name: 'Cursor AI Code Editor',
    category: 'AI & Copilots',
    description: 'AI-first code editor with codebase-aware assistance and multi-file workflows.',
    dealText: 'Check current pricing and offers',
    badge: 'Developer Favorite',
    rating: 4.9,
    referralUrl: affiliateUrl('VITE_AFFILIATE_CURSOR_URL', 'https://cursor.com/'),
    isAffiliate: hasAffiliateUrl('VITE_AFFILIATE_CURSOR_URL')
  },
  {
    id: 'openai-api',
    name: 'OpenAI API Platform',
    category: 'AI & Copilots',
    description: 'API platform for text, reasoning, vision, audio, and developer applications.',
    dealText: 'API access + developer platform',
    badge: 'AI Platform',
    rating: 4.8,
    referralUrl: 'https://platform.openai.com/',
    isAffiliate: false
  },
  {
    id: 'google-gemini',
    name: 'Google AI Studio',
    category: 'AI & Copilots',
    description: 'Build and test applications with Google Gemini models.',
    dealText: 'Check current free-tier availability',
    badge: 'AI Platform',
    rating: 4.9,
    referralUrl: 'https://aistudio.google.com/',
    isAffiliate: false
  },

  // Database & Backend
  {
    id: 'supabase',
    name: 'Supabase',
    category: 'Database & Backend',
    description: 'Postgres database, authentication, storage, APIs, and edge functions.',
    dealText: 'Check current free plan',
    badge: 'Open Source DB',
    rating: 4.9,
    referralUrl: affiliateUrl('VITE_AFFILIATE_SUPABASE_URL', 'https://supabase.com/'),
    isAffiliate: hasAffiliateUrl('VITE_AFFILIATE_SUPABASE_URL')
  },
  {
    id: 'neon',
    name: 'Neon Serverless Postgres',
    category: 'Database & Backend',
    description: 'Serverless PostgreSQL with branching and scale-to-zero workflows.',
    dealText: 'Check current free plan and partner offers',
    badge: 'Scale to Zero',
    rating: 4.8,
    referralUrl: affiliateUrl('VITE_AFFILIATE_NEON_URL', 'https://neon.tech/'),
    isAffiliate: hasAffiliateUrl('VITE_AFFILIATE_NEON_URL')
  },
  {
    id: 'upstash',
    name: 'Upstash Serverless Redis & Kafka',
    category: 'Database & Backend',
    description: 'Serverless Redis and Kafka designed for request-based and edge workloads.',
    dealText: 'Check current free tier',
    badge: 'Edge-Ready Cache',
    rating: 4.8,
    referralUrl: affiliateUrl('VITE_AFFILIATE_UPSTASH_URL', 'https://upstash.com/'),
    isAffiliate: hasAffiliateUrl('VITE_AFFILIATE_UPSTASH_URL')
  },

  // Dev Tools & IDEs
  {
    id: 'jetbrains',
    name: 'JetBrains All Products Pack',
    category: 'Dev Tools & IDEs',
    description: 'Professional IDEs including IntelliJ IDEA, WebStorm, PyCharm, and CLion.',
    dealText: '30-day trial and current discounts',
    badge: 'Pro IDE Standard',
    rating: 4.9,
    referralUrl: 'https://www.jetbrains.com/',
    isAffiliate: false
  },
  {
    id: 'warp',
    name: 'Warp Terminal',
    category: 'Dev Tools & IDEs',
    description: 'Modern terminal with AI-assisted workflows and collaborative features.',
    dealText: 'Referral rewards may be available in-app',
    badge: 'Modern Terminal',
    rating: 4.8,
    referralUrl: affiliateUrl('VITE_AFFILIATE_WARP_URL', 'https://www.warp.dev/'),
    isAffiliate: hasAffiliateUrl('VITE_AFFILIATE_WARP_URL')
  },

  // Security & Auth
  {
    id: 'clerk',
    name: 'Clerk User Authentication',
    category: 'Security & Auth',
    description: 'Authentication and user-management infrastructure for modern applications.',
    dealText: 'Check current creator/partner opportunities',
    badge: 'Developer Auth',
    rating: 4.9,
    referralUrl: affiliateUrl('VITE_AFFILIATE_CLERK_URL', 'https://clerk.com/'),
    isAffiliate: hasAffiliateUrl('VITE_AFFILIATE_CLERK_URL')
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare Edge & Security',
    category: 'Security & Auth',
    description: 'CDN, DNS, application security, Workers, and edge infrastructure.',
    dealText: 'Check current partner programs',
    badge: 'Internet Infrastructure',
    rating: 4.9,
    referralUrl: affiliateUrl('VITE_AFFILIATE_CLOUDFLARE_URL', 'https://www.cloudflare.com/'),
    isAffiliate: hasAffiliateUrl('VITE_AFFILIATE_CLOUDFLARE_URL')
  }
];
