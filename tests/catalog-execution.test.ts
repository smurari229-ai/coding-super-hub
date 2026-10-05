import { describe, expect, it } from 'vitest';
import { TOOLS_CATALOG } from '../src/data/tools-catalog';
import { defaultInput, executeTool } from '../src/lib/tool-engine';

const SPECIAL_INPUTS: Record<string, string> = {
  'hex-to-string': '48 65 6c 6c 6f',
  'binary-to-text': '01001000 01100101 01101100 01101100 01101111',
  'url-parser-inspector': 'https://example.com/search?q=hello',
  'json-path-finder': '$.name\n{"name":"Coding Super Hub","active":true}',
  'csv-column-extractor': 'name\nname,age\nAlice,20\nBob,30',
  'json-to-csv': '[{"name":"Alice","age":20},{"name":"Bob","age":30}]',
  'csv-to-json': 'name,age\nAlice,20\nBob,30',
  'sql-insert-generator': '[{"name":"Alice","age":20}]',
  'curl-to-fetch': 'curl -X GET https://example.com',
  'ip-subnet-calculator': '192.168.1.0/24',
  'contrast-checker': '#000000 #ffffff',
  'css-clamp-calculator': '16 3 32',
  'number-base-converter': '42',
  'timestamp-converter': '2026-09-28T12:00:00.000Z',
  'speed-distance-time': '100 2',
  'percentage-calculator': '20 150',
  'gcd-calculator': '48 18',
  'lcm-calculator': '48 18',
  'factorial-calculator': '5',
  'prime-checker': '97',
  'chmod-calculator': '755',
  'password-strength-meter': 'StrongPassword123!',
  'csp-generator': 'https://example.com',
  'cors-header-builder': 'https://example.com',
  'json-to-ts-interface': '{"name":"Alice","active":true}',
  'json-schema-generator': '{"name":"Alice","active":true}',
  'escape-json-string': 'Hello "Coding Super Hub"\\n',
  'repeat-string': '3\\nHello',
  'string-wrapper': '20\\nThe quick brown fox jumps over the lazy dog.',
  'string-truncate': '20\\nThe quick brown fox jumps over the lazy dog.',
  'text-compare-inline': 'hello world\\nhello brave world',
  'case-title': 'the quick brown fox',
  'markdown-to-html': '# Hello\\n\\nThis is **bold**.',
  'html-to-markdown': '<h1>Hello</h1><p>This is <strong>bold</strong>.</p>',
  'xml-formatter': '<root><item>Hello</item></root>',
  'yaml-validator': 'name: Coding Super Hub\\nactive: true',
  'toml-validator': 'name = "Coding Super Hub"'
};

const auditInputFor = (tool: (typeof TOOLS_CATALOG)[number]) =>
  SPECIAL_INPUTS[tool.id] ?? defaultInput(tool);

describe('535-tool catalog execution smoke oracle', () => {
  it('runs every catalog entry with deterministic representative input and reports evidence without fake semantic PASS claims', () => {
    expect(TOOLS_CATALOG).toHaveLength(535);

    const ids = TOOLS_CATALOG.map(tool => tool.id);
    const names = TOOLS_CATALOG.map(tool => tool.name);
    expect(new Set(ids).size).toBe(535);
    expect(new Set(names).size).toBe(535);
    expect(ids.every(Boolean)).toBe(true);
    expect(names.every(Boolean)).toBe(true);

    const rows = TOOLS_CATALOG.map(tool => {
      const input = auditInputFor(tool);
      const result = executeTool(tool, input);
      const error = result.error ?? '';
      const comingSoon = /Coming soon/i.test(error);
      const validation = /Enter |Invalid |Malformed |Input must|needs a|must use|outside the safe|not found|does not exist/i.test(error);
      return {
        id: tool.id,
        actionType: tool.actionType,
        output: Boolean(result.output && result.output.trim()),
        comingSoon,
        validation,
        unexpectedError: Boolean(error && !comingSoon && !validation),
        error
      };
    });

    const output = rows.filter(row => row.output).length;
    const comingSoon = rows.filter(row => row.comingSoon).length;
    const validation = rows.filter(row => row.validation).length;
    const unexpectedErrors = rows.filter(row => row.unexpectedError).length;

    console.log(JSON.stringify({
      catalog: rows.length,
      deterministicInput: true,
      outputObserved: output,
      comingSoon,
      validationOrInputMismatch: validation,
      unexpectedErrors,
      semanticPassNotClaimed: true,
      unexpectedErrorIds: rows.filter(row => row.unexpectedError).map(row => row.id),
      validationIds: rows.filter(row => row.validation).map(row => row.id)
    }));

    expect(unexpectedErrors).toBe(0);
  });
});
