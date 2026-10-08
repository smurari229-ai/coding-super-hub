import { describe, expect, it } from 'vitest';
import { TOOLS_CATALOG } from '../src/data/tools-catalog';
import { executeTool } from '../src/lib/tool-engine';

function run(id: string, input: string) {
  const tool = TOOLS_CATALOG.find(item => item.id === id);
  if (!tool) throw new Error('Missing catalog entry: ' + id);
  const result = executeTool(tool, input);
  expect(result.error, id + ' should execute without an error').toBeUndefined();
  expect(result.output.trim(), id + ' should return output').not.toBe('');
  return result.output;
}

describe('ROI batch 25 tool handlers', () => {
  it('decodes binary UTF-8 and calculates the standard CRC32 test vector', () => {
    expect(run('binary-to-text', '01001000 01100101 01101100 01101100 01101111')).toBe('Hello');
    expect(run('crc32-checksum', '123456789')).toBe('CRC32: CBF43926');
  });

  it('converts semicolon-delimited CSV while preserving quoted delimiters', () => {
    expect(run('csv-delimiter-changer', 'name;note\nAlice;"a;b"')).toBe('name,note\nAlice,"a;b"');
  });

  it('reports added, missing, and changed JSON keys', () => {
    const output = run('json-diff-keys', '{"a":1,"old":true}\n---\n{"a":"1","new":false}');
    expect(output).toContain('Added keys: new');
    expect(output).toContain('Missing keys: old');
    expect(output).toContain('Changed value types: a');
  });

  it('converts JSON arrays to Markdown tables and Markdown tables back to JSON', () => {
    const markdown = run('json-to-markdown-table', '[{"name":"Alice","age":20},{"name":"Bob","age":30}]');
    expect(markdown).toContain('| name | age |');
    expect(JSON.parse(run('markdown-table-to-json', markdown))).toEqual([
      { name: 'Alice', age: '20' },
      { name: 'Bob', age: '30' },
    ]);
  });

  it('converts flat/nested JSON and .env values without losing spaces', () => {
    expect(run('json-to-env', '{"apiKey":"abc def","nested":{"port":3000}')).toContain('API_KEY="abc def"');
    expect(run('json-to-env', '{"apiKey":"abc def","nested":{"port":3000}}')).toContain('NESTED_PORT=3000');
    expect(JSON.parse(run('env-to-json', 'API_KEY=test\nAPP_URL=https://example.com'))).toEqual({
      API_KEY: 'test',
      APP_URL: 'https://example.com',
    });
  });

  it('converts GPS DMS and decimal coordinates with hemisphere signs', () => {
    const dms = run('gps-dms-to-decimal', '40°26\'46"N 79°58\'55"W');
    expect(dms).toContain('N: 40.446111');
    expect(dms).toContain('W: -79.981944');
    const decimal = run('gps-decimal-to-dms', '40.446 -79.982');
    expect(decimal).toContain('Latitude: 40° 26\' 45.60" N');
    expect(decimal).toContain('Longitude: 79° 58\' 55.20" W');
  });

  it('formats times in IANA zones and generates usable config/code snippets', () => {
    const time = run('timezone-converter', '2026-10-09T12:00:00Z\nAsia/Kolkata\nAmerica/New_York');
    expect(time).toContain('Asia/Kolkata:');
    expect(time).toContain('America/New_York:');
    expect(JSON.parse(run('npm-scripts-generator', 'vite')).scripts).toMatchObject({
      dev: 'vite',
      build: 'tsc -b && vite build',
    });
    expect(run('pip-requirements-builder', 'requests==2.32.0\nhttpx>=0.27')).toContain('httpx>=0.27');
    expect(run('dark-mode-css-generator', '#ffffff #111827')).toContain('--color-background: #ffffff');
    expect(run('print-stylesheet-generator', 'nav\nfooter')).toContain('nav,\n  footer');
    expect(run('css-gradient-border', '#4f46e5 #ec4899 3px')).toContain('border: 3px solid transparent');
    expect(run('js-debounce-throttle', 'searchInput')).toContain('function debounce');
    expect(run('js-debounce-throttle', 'searchInput')).toContain('\n\nexport function throttle');
    expect(run('safe-json-parse', 'inputValue')).toContain('safeJsonParse(inputValue, {})');
  });
});
