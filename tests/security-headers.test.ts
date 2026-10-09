import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const vercelConfig = JSON.parse(readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8')) as {
  headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
};

function headerValue(name: string): string {
  const header = vercelConfig.headers
    .flatMap(rule => rule.headers)
    .find(item => item.key.toLowerCase() === name.toLowerCase());
  return header?.value ?? '';
}

describe('deployment security headers', () => {
  it('allows browser Supabase Auth calls to the configured project without a broad Supabase wildcard', () => {
    const csp = headerValue('Content-Security-Policy');
    expect(csp).toContain('connect-src');
    expect(csp).toContain('https://psujvwayiqnzkhbhatks.supabase.co');
    expect(csp).not.toContain('https://*.supabase.co');
  });

  it('allows the observed Lemon Squeezy checkout script without a broad script wildcard', () => {
    const csp = headerValue('Content-Security-Policy');
    expect(csp).toContain('https://app.lemonsqueezy.com');
    expect(csp).toContain('https://assets.lemonsqueezy.com');
    const scriptSrc = csp.split(';').find((directive) => directive.trim().startsWith('script-src')) ?? '';
    expect(scriptSrc).not.toContain('https://*.lemonsqueezy.com');
  });

  it('keeps key baseline browser security directives enabled', () => {
    const csp = headerValue('Content-Security-Policy');
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(headerValue('X-Content-Type-Options')).toBe('nosniff');
    expect(headerValue('X-Frame-Options')).toBe('DENY');
    expect(headerValue('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  });
});
