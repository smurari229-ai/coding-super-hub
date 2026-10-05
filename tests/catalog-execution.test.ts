import { describe, expect, it } from 'vitest';
import { TOOLS_CATALOG } from '../src/data/tools-catalog';
import { executeTool } from '../src/lib/tool-engine';

const inputFor = (tool: (typeof TOOLS_CATALOG)[number]) => {
  if (tool.defaultInput) return tool.defaultInput;
  const text = (tool.id + ' ' + tool.name + ' ' + tool.description + ' ' + tool.tags.join(' ')).toLowerCase();
  if (text.includes('json')) return '{"name":"hub","active":true}';
  if (text.includes('csv')) return 'name,age\nA,20';
  if (text.includes('url') || text.includes('domain')) return 'https://example.com';
  if (text.includes('hex')) return '48656c6c6f';
  if (text.includes('binary')) return '01001000 01101001';
  if (text.includes('base64')) return 'SGVsbG8=';
  if (text.includes('regex')) return '^hello$';
  if (text.includes('number') || text.includes('calculator') || text.includes('math') || text.includes('ratio') || text.includes('percent')) return '10 20 30';
  if (text.includes('color')) return '#112233';
  if (text.includes('html') || text.includes('css') || text.includes('xml')) return '<p>Hello</p>';
  if (text.includes('git') || text.includes('docker') || text.includes('ssh') || text.includes('yaml')) return 'example';
  return 'The quick brown fox jumps over the lazy dog.';
};

describe('535-tool catalog execution smoke oracle', () => {
  it('measures route coverage without converting smoke into semantic PASS claims', () => {
    expect(TOOLS_CATALOG).toHaveLength(535);
    const ids = TOOLS_CATALOG.map(tool => tool.id);
    const names = TOOLS_CATALOG.map(tool => tool.name);
    expect(new Set(ids).size).toBe(535);
    expect(new Set(names).size).toBe(535);
    expect(ids.every(Boolean)).toBe(true);
    expect(names.every(Boolean)).toBe(true);

    const rows = TOOLS_CATALOG.map(tool => {
      const result = executeTool(tool, inputFor(tool));
      return { id: tool.id, routed: Boolean(result.output), error: result.error ?? '' };
    });
    const routed = rows.filter(row => row.routed).length;
    const unsupported = rows.filter(row => /Coming soon/.test(row.error)).length;
    const runtimeErrors = rows.filter(row => !row.routed && !/Coming soon/.test(row.error)).length;
    console.log(JSON.stringify({
      catalog: rows.length,
      routedWithSmokeInput: routed,
      comingSoon: unsupported,
      runtimeOrValidationErrors: runtimeErrors
    }));
    expect(runtimeErrors).toBe(0);
  });
});
