import { describe, expect, it } from 'vitest';
import { executeTool, encodeBase64Utf8, decodeBase64Utf8, slugify, encodeHex, decodeHex } from '../src/lib/tool-engine';
import type { ToolItem } from '../src/types/tools';

const tool = (id: string, name = id, tags: string[] = []): ToolItem => ({
  id, name, category: 'text-string', description: name, tags
});

describe('tool engine pure transforms', () => {
  it('round-trips UTF-8 Base64', () => {
    const source = 'Hello 🚀';
    expect(decodeBase64Utf8(encodeBase64Utf8(source))).toBe(source);
  });
  it('round-trips UTF-8 hex', () => {
    const source = 'Hello 世界';
    expect(decodeHex(encodeHex(source))).toBe(source);
  });
  it('creates stable URL slugs', () => {
    expect(slugify('Déjà Vu — Production Tools!')).toBe('deja-vu-production-tools');
  });
  it('executes text reverse without echo fallback', () => {
    expect(executeTool(tool('text-reverser', 'Text Reverser', ['reverse']), 'abc').output).toBe('cba');
  });
  it('returns honest unsupported status', () => {
    const result = executeTool(tool('future-tool', 'Future Tool'), 'abc');
    expect(result.output).toBe('');
    expect(result.error).toMatch(/Coming soon/);
  });
  it('numbers lines', () => {
    expect(executeTool(tool('line-numbering', 'Line Numbering', ['line number']), 'a\nb').output).toContain('1: a');
  });
  it('finds and replaces text', () => {
    expect(executeTool(tool('find-replace', 'Find and Replace', ['find & replace']), 'cat\nDOG\ncat').output).toBe('DOG\nDOG');
  });
  it('extracts emails and URLs', () => {
    expect(executeTool(tool('email-extractor', 'Email Extractor', ['extract email']), 'a@test.com x@y.dev').output).toBe('a@test.com\nx@y.dev');
    expect(executeTool(tool('url-extractor', 'URL Extractor', ['extract url']), 'go https://example.com now').output).toBe('https://example.com');
  });
  it('converts basic JSON to YAML and YAML to JSON', () => {
    const yaml = executeTool(tool('json-yaml', 'JSON to YAML', ['json yaml']), '{"name":"hub","active":true}').output;
    expect(yaml).toContain('name: hub');
    const json = executeTool(tool('yaml-json', 'YAML to JSON', ['yaml to json']), 'name: hub\nactive: true').output;
    expect(JSON.parse(json)).toEqual({ name: 'hub', active: true });
  });
  it('extracts a simple JSON path', () => {
    expect(executeTool(tool('json-path', 'JSON Path Extractor', ['json path']), '$.user.name\n{"user":{"name":"Murari"}}').output).toBe('Murari');
  });
  it('generates SQL INSERT from JSON rows', () => {
    const out = executeTool(tool('sql-insert', 'SQL INSERT Generator', ['sql insert']), '[{"name":"A","age":20}]').output;
    expect(out).toContain('INSERT INTO table_name (name, age)');
    expect(out).toContain("'A', 20");
  });
  it('calculates password strength and chmod', () => {
    expect(executeTool(tool('password-strength', 'Password Strength Meter', ['password strength']), 'StrongPass!123').output).toContain('Rating:');
    expect(executeTool(tool('chmod-calculator', 'Chmod Calculator', ['chmod']), '755').output).toContain('Owner: rwx');
  });
  it('generates CSP and CORS snippets', () => {
    expect(executeTool(tool('csp-header', 'CSP Header', ['csp header']), 'example').output).toContain('Content-Security-Policy');
    expect(executeTool(tool('cors-header', 'CORS Header', ['cors header']), 'https://example.com').output).toContain('Access-Control-Allow-Origin');
  });
  it('minifies CSS and calculates clamp/contrast', () => {
    expect(executeTool(tool('css-minifier', 'CSS Minifier', ['css minif']), 'a { color: red; }').output).toBe('a{color:red}');
    expect(executeTool(tool('clamp-calculator', 'Fluid Type Clamp', ['clamp']), '16 2 32').output).toContain('clamp(');
    expect(executeTool(tool('contrast', 'WCAG Contrast', ['contrast']), '#000 #fff').output).toContain('4.5');
  });
  it('converts cURL and CIDR', () => {
    expect(executeTool(tool('curl-fetch', 'cURL to Fetch', ['curl']), 'curl -X POST https://example.com').output).toContain("method: 'POST'");
    expect(executeTool(tool('cidr', 'Subnet CIDR Calculator', ['cidr']), '192.168.1.0/24').output).toContain('Addresses: 256');
  });
  it('converts units, percentage variants, and bitwise operations', () => {
    expect(executeTool(tool('bytes', 'Byte Converter', ['byte converter']), '1024').output).toContain('KB: 1.0000');
    expect(executeTool(tool('length', 'Length Converter', ['length converter']), '1').output).toContain('Centimeters: 100.0000');
    expect(executeTool(tool('temp', 'Temperature Converter', ['temperature converter']), '0').output).toContain('Fahrenheit: 32.00');
    expect(executeTool(tool('percentage', 'Percentage Calculator', ['percentage']), '20 200').output).toContain('X% of Y: 40.00');
    expect(executeTool(tool('bitwise', 'Bitwise Visualizer', ['bitwise']), '12 5').output).toContain('AND (&): 4');
  });
});
