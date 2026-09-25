import { AffiliateDeal } from '../types/tools';

export const AFFILIATE_DEALS: AffiliateDeal[] = [
  // Hosting & Cloud
  {
    id: 'digitalocean',
    name: 'DigitalOcean Cloud',
    category: 'Hosting & Cloud',
    description: 'Reliable cloud infrastructure, Droplets, Managed Kubernetes, and App Platform with $200 free credit.',
    dealText: '$200 Free Cloud Credits (60 Days)',
    badge: 'Popular for VPS',
    rating: 4.8,
    referralUrl: 'https://m.do.co/c/codinghub200',
    code: 'DOCLOUD200'
  },
  {
    id: 'render',
    name: 'Render Cloud Application Hosting',
    category: 'Hosting & Cloud',
    description: 'Fastest way to build and run all your web apps and static sites with free SSL, global CDN, and auto-deploys.',
    dealText: 'Free Tier + $150 Startup Credits',
    badge: 'Zero DevOps',
    rating: 4.9,
    referralUrl: 'https://render.com/?ref=coding-super-hub'
  },
  {
    id: 'railway',
    name: 'Railway Deployment Platform',
    category: 'Hosting & Cloud',
    description: 'Develop locally, deploy instantly with instant PostgreSQL, Redis, Docker, and full-stack environments.',
    dealText: '$5 Free Starter Credit Every Month',
    badge: 'Instant DB & Apps',
    rating: 4.7,
    referralUrl: 'https://railway.app?referralCode=supersuite'
  },

  // AI & Copilots
  {
    id: 'cursor',
    name: 'Cursor AI Code Editor',
    category: 'AI & Copilots',
    description: 'The AI-first Code Editor built on VS Code. Multi-file edits, codebase chat, and instant terminal fix.',
    dealText: 'Free Pro Trial (14 Days) with Claude 3.5 Sonnet',
    badge: 'Developer Favorite',
    rating: 4.9,
    referralUrl: 'https://cursor.com/?ref=codingsuperhub'
  },
  {
    id: 'openai-api',
    name: 'OpenAI API Platform',
    category: 'AI & Copilots',
    description: 'State-of-the-art GPT-4o, Reasoning o1/o3 models, Vision, and Whisper audio models with flexible pay-per-token.',
    dealText: 'Instant API Access + Playground',
    badge: 'Frontier AI',
    rating: 4.8,
    referralUrl: 'https://platform.openai.com'
  },
  {
    id: 'google-gemini',
    name: 'Google Gemini 2.5 Flash / Pro',
    category: 'AI & Copilots',
    description: '1 Million+ token context window, multimodal reasoning, lightning-fast inference, and generous free tier.',
    dealText: 'Generous Free Tier on AI Studio',
    badge: 'Best Value & Speed',
    rating: 4.9,
    referralUrl: 'https://aistudio.google.com'
  },

  // Database & Backend
  {
    id: 'supabase',
    name: 'Supabase (Firebase Alternative)',
    category: 'Database & Backend',
    description: 'Open source Firebase alternative with dedicated PostgreSQL database, Authentication, Instant APIs, and Edge Functions.',
    dealText: 'Generous Free Plan (500MB DB, 50K MAU)',
    badge: 'Top Open Source DB',
    rating: 4.9,
    referralUrl: 'https://supabase.com/?ref=codingsuperhub'
  },
  {
    id: 'neon',
    name: 'Neon Serverless Postgres',
    category: 'Database & Backend',
    description: 'Serverless PostgreSQL with instant scale-to-zero, instant database branching for CI/CD, and bottomless storage.',
    dealText: 'Free Tier with Unlimited DB Branches',
    badge: 'Scale to Zero',
    rating: 4.8,
    referralUrl: 'https://neon.tech/?ref=codingsuperhub'
  },
  {
    id: 'upstash',
    name: 'Upstash Serverless Redis & Kafka',
    category: 'Database & Backend',
    description: 'Serverless Redis and Kafka with per-request pricing, global replication, and REST API support for Next.js / Edge.',
    dealText: '10,000 Free Commands / Day',
    badge: 'Edge-Ready Cache',
    rating: 4.8,
    referralUrl: 'https://upstash.com/?ref=codingsuperhub'
  },

  // Dev Tools & IDEs
  {
    id: 'jetbrains',
    name: 'JetBrains All Products Pack',
    category: 'Dev Tools & IDEs',
    description: 'IntelliJ IDEA, WebStorm, PyCharm, and CLion. The ultimate professional IDE toolset for serious engineers.',
    dealText: '30-Day Free Trial + Student Discounts',
    badge: 'Pro IDE Standard',
    rating: 4.9,
    referralUrl: 'https://www.jetbrains.com'
  },
  {
    id: 'warp',
    name: 'Warp Terminal for Mac & Linux',
    category: 'Dev Tools & IDEs',
    description: 'The intelligent terminal with AI command search, block-based history, and collaborative workflow sharing.',
    dealText: '100% Free for Individual Developers',
    badge: 'Modern Terminal',
    rating: 4.8,
    referralUrl: 'https://www.warp.dev/?ref=codingsuperhub'
  },

  // Security & Auth
  {
    id: 'clerk',
    name: 'Clerk User Authentication',
    category: 'Security & Auth',
    description: 'Complete user management and authentication suite for React, Next.js, and Mobile with ready-made UI components.',
    dealText: 'Free up to 10,000 Monthly Active Users',
    badge: 'Best Next.js Auth',
    rating: 4.9,
    referralUrl: 'https://clerk.com/?ref=codingsuperhub'
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare Edge & Security',
    category: 'Security & Auth',
    description: 'Global CDN, DDoS mitigation, DNS with 0-second propagation, SSL certificates, and Cloudflare Workers.',
    dealText: 'Free DDoS & Global CDN Plan',
    badge: 'Internet Backbone',
    rating: 4.9,
    referralUrl: 'https://www.cloudflare.com'
  }
];
