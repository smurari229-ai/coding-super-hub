import { describe, expect, it } from 'vitest';
import { TOOLS_CATALOG } from '../src/data/tools-catalog';
import { defaultInput, executeTool } from '../src/lib/tool-engine';

const SPECIAL_INPUTS: Record<string, string> = {
  'hex-to-string': '48 65 6c 6c 6f',
  'binary-to-text': '01001000 01100101 01101100 01101100 01101111',
  'url-parser-inspector': 'https://example.com/search?q=hello',
  'xml-to-json-basic': '<root><name>hub</name></root>',
  'bencode-decoder': 'd3:foo3:bare',
  'json-path-finder': `$.name\n{"name":"Coding Super Hub","active":true}`,
  'csv-column-extractor': `name\nname,age\nAlice,20\nBob,30`,
  'json-to-csv': '[{"name":"Alice","age":20},{"name":"Bob","age":30}]',
  'csv-to-json': `name,age\nAlice,20\nBob,30`,
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
  'escape-json-string': `Hello "Coding Super Hub"\n`,
  'repeat-string': `3\nHello`,
  'string-wrapper': `20\nThe quick brown fox jumps over the lazy dog.`,
  'string-truncate': `20\nThe quick brown fox jumps over the lazy dog.`,
  'text-compare-inline': `hello world\nhello brave world`,
  'case-title': 'the quick brown fox',
  'markdown-to-html': `# Hello\n\nThis is **bold**.`,
  'html-to-markdown': '<h1>Hello</h1><p>This is <strong>bold</strong>.</p>',
  'xml-formatter': '<root><item>Hello</item></root>',
  'yaml-validator': `name: Coding Super Hub\nactive: true`,
  'toml-validator': 'name = "Coding Super Hub"',
  'string-interpolator': `{"name":"Coding Super Hub"}\nHello {{name}}`,
  'text-prefix-suffix': `<<\n>>\nHello`,
  'newline-converter': `LF\nHello\nWorld`,
  'string-find-replace': `cat\ndog\ncat and cat`,
  'basic-auth-header': `alice\nsecret`,
  'yaml-to-json': `name: Coding Super Hub\nactive: true`,
  'human-time-to-ms': '2d 3h 4m 5s',
  'uptime-sla-calculator': '99.9',
  'number-to-words': "42",
  'bearer-token-generator': "32",
  'random-hex-salt': "16",
  'dmarc-record-builder': "example.com",
  'security-txt-generator': "https://example.com/security",
  'rate-limit-header-builder': "100 60",
  'nonce-generator': "32",
  'aspect-ratio-calculator': "1920 1080 1280",
  'screen-viewport-tester': "390 844",
  'iso-8601-builder': "2026-10-05T12:00:00Z",
  'excel-date-converter': "45292",
  'data-size-converter': "1024",
  'roman-numerals-converter': "42",
  'scientific-notation-converter': "42",
  'relative-time-calculator': "2026-10-10T12:00:00Z",
  'calendar-week-number': "2026-10-05",
  'api-request-builder': "{\"method\":\"POST\",\"url\":\"https://example.com\",\"headers\":{\"Content-Type\":\"application/json\"},\"body\":\"{}\"}",
  'curl-command-builder': "{\"url\":\"https://example.com\",\"method\":\"GET\"}",
  'mac-address-formatter': "00:11:22:33:44:55",
  'semver-calculator': "1.2.3",
  'bandwidth-calculator': "1000000 100",
  'env-example-generator': `API_KEY=test\nAPP_URL=https://example.com`,
  'ssl-expiration-calc': "2030-01-01T00:00:00Z",
  'ip-range-expander': "192.168.1.0/30",
  'docker-run-to-compose': "docker run -p 8080:80 nginx:latest",
  'discount-calculator': "100 20",
  'gcd-lcm-calculator': "48 18",
  'fibonacci-sequence': "10",
  'bitwise-operations-calc': "12 5",
  'emi-loan-calculator': "10000 10 12",
  'compound-interest-calc': "1000 5 2",
  'bmi-calculator': "70 1.75",
  'tip-calculator': "100 10",
  'matrix-multiplication-calc': `1 2\n3 4\n5 6\n7 8`,
  'quadratic-equation-solver': "1 0 -4",
  'pythagorean-theorem-calc': "3 4",
  'cylinder-volume-surface': "2 5",
  'fuel-consumption-calc': "100 5 100",
  'hamming-distance-calc': `karolin\nkathrin`,
  'euclidean-distance-2d': "0 0 3 4",
  'manhattan-distance-calc': "0 0 3 4",
  'logarithm-calculator': "100 10",
  'permutation-combination': "5 2",
  'modulo-arithmetic-calc': "17 5",
  'fraction-simplifier-calc': "8 12",
  'mixed-number-calculator': "2 1 3",
  'ratio-proportion-calculator': "2 4 8",
  'aspect-ratio-scale-calc': "1920 1080 1280",
  'dpi-ppi-calculator': "1920 24",
  'bitwise-not-inverter': "5",
  'hourly-rate-calculator': "100000 2000",
  'saas-mrr-arr-calculator': "100 50",
  'cac-ltv-ratio-calc': "100 1000 70",
  'burn-rate-runway-calc': "10000 1000 500",
  'sprint-velocity-calculator': "30 3",
  'simple-interest-calculator': "1000 5 2",
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
