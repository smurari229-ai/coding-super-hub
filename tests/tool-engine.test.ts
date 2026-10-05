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
    expect(executeTool(tool('find-replace', 'Find and Replace', ['find & replace']), 'cat\nDOG\ncat\ncat').output).toBe('DOG\nDOG');
  });
  it('covers case transforms, CSV columns, and explicit number bases', () => {
    expect(executeTool(tool('case', 'Camel Case Converter', ['camel case']), 'hello world').output).toBe('helloWorld');
    expect(executeTool(tool('csv-column', 'CSV Column Extractor', ['csv column']), 'a\na,b\nA,1\nB,2').output).toBe('A\nB');
    expect(executeTool(tool('number-base', 'Number Base Converter', ['number base']), '16 ff').output).toContain('Decimal: 255');
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
    expect(executeTool(tool('contrast', 'WCAG Contrast', ['contrast']), '#000 #fff').output).toContain('21.00:1');
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
  it('covers high-ROI text utilities', () => {
    expect(executeTool(tool('string-truncate', 'String Truncate'), '5\nHello World').output).toBe('Hell…');
    expect(executeTool(tool('count-lines', 'Count Lines'), 'a\n\nb').output).toContain('Total lines: 3');
    expect(executeTool(tool('unicode-character-inspector', 'Unicode Inspector'), 'A').output).toContain('U+0041');
    expect(executeTool(tool('remove-html-tags', 'HTML Tags Stripper'), '<p>Hello</p>').output).toBe('Hello');
  });

  it('covers data and calculator utilities', () => {
    expect(executeTool(tool('csv-to-markdown', 'CSV to Markdown'), 'name,age\nA,20').output).toContain('| name | age |');
    expect(executeTool(tool('roman-numerals-converter', 'Roman Numerals'), '2026').output).toBe('MMXXVI');
    expect(executeTool(tool('simple-interest-calculator', 'Simple Interest'), '1000 10 2').output).toContain('Interest: 200');
    expect(executeTool(tool('bmi-calculator', 'BMI'), '70 1.75').output).toContain('BMI:');
  });

  it('covers developer workflow utilities', () => {
    expect(executeTool(tool('mac-address-formatter', 'MAC Formatter'), 'aabbccddeeff').output).toBe('AA:BB:CC:DD:EE:FF');
    expect(executeTool(tool('px-to-rem-converter', 'PX to REM'), '32 16').output).toContain('rem: 2');
    expect(executeTool(tool('architecture-decision-record', 'ADR'), 'Use registry engine').output).toContain('# ADR: Use registry engine');
  });

  it('covers second high-ROI text batch', () => {
    expect(executeTool(tool('duplicate-line-remover', 'Duplicate Lines'), 'a\na\nb').output).toBe('a\nb');
    expect(executeTool(tool('text-line-sorter', 'Line Sorter'), 'b\na\n10\n2').output).toBe('2\n10\na\nb');
    expect(executeTool(tool('text-reverser', 'Text Reverser'), 'abc').output).toBe('cba');
    expect(executeTool(tool('snake-to-camel', 'Snake to Camel'), 'user_first_name').output).toBe('userFirstName');
    expect(executeTool(tool('strip-diacritics', 'Strip Diacritics'), 'Crème brûlée').output).toBe('Creme brulee');
    expect(executeTool(tool('json-key-sorter', 'JSON Key Sorter'), '{"z":1,"a":2}').output).toContain('"a": 2');
  });

  it('calculates speed, distance, and time from clear inputs', () => {
    expect(executeTool(tool('speed-distance-time', 'Speed Distance Time'), '100 2').output).toContain('Speed: 50');
    expect(executeTool(tool('speed-distance-time', 'Speed Distance Time'), 'distance=100\ntime=2').output).toContain('Speed: 50');
    expect(executeTool(tool('speed-distance-time', 'Speed Distance Time'), 'speed=50\ntime=2').output).toContain('Distance: 100');
  });

  it('covers deterministic calculators', () => {
    expect(executeTool(tool('percentage-calculator', 'Percentage'), '20 200').output).toContain('X% of Y: 40');
    expect(executeTool(tool('gcd-lcm-calculator', 'GCD LCM'), '12 18').output).toContain('GCD: 6');
    expect(executeTool(tool('prime-number-checker', 'Prime'), '17').output).toContain('prime');
    expect(executeTool(tool('factorial-calculator', 'Factorial'), '5').output).toContain('5! = 120');
    expect(executeTool(tool('fibonacci-sequence', 'Fibonacci'), '6').output).toBe('0, 1, 1, 2, 3, 5');
    expect(executeTool(tool('emi-loan-calculator', 'EMI'), '100000 12 12').output).toContain('Monthly EMI:');
  });

  it('covers security and web helpers', () => {
    expect(executeTool(tool('basic-auth-header', 'Basic Auth'), 'user\npass').output).toContain('Authorization: Basic');
    expect(executeTool(tool('cookie-flags-generator', 'Cookie Flags'), 'session').output).toContain('HttpOnly');
    expect(executeTool(tool('html-boilerplate-generator', 'HTML Boilerplate'), 'Demo').output).toContain('<!doctype html>');
    expect(executeTool(tool('xml-sitemap-generator', 'Sitemap'), 'https://example.com').output).toContain('<urlset');
    expect(executeTool(tool('user-agent-parser', 'User Agent'), 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120').output).toContain('Windows');
  });

  it('covers DevOps and productivity templates', () => {
    expect(executeTool(tool('docker-ignore-generator', 'Docker Ignore'), 'x').output).toContain('.env');
    expect(executeTool(tool('git-bisect-guide', 'Git Bisect'), 'x').output).toContain('git bisect start');
    expect(executeTool(tool('readme-badge-generator', 'README Badge'), 'build').output).toContain('img.shields.io');
    expect(executeTool(tool('saas-mrr-arr-calculator', 'MRR ARR'), '10 9').output).toContain('MRR: 90.00');
    expect(executeTool(tool('sprint-velocity-calculator', 'Sprint Velocity'), '40 4').output).toContain('10.00');
  });
  it('closes the previously failing audit routes with deterministic outputs', () => {
    expect(executeTool(tool('bencode-decoder', 'Bencode'), 'd3:foo3:bare').output).toContain('"foo": "bar"');
    expect(executeTool(tool('csv-to-sqlite-ddl', 'CSV DDL'), 'name,age\nA,20').output).toContain('"age" INTEGER');
    expect(executeTool(tool('mime-types-lookup', 'MIME Lookup'), 'application.json').output).toContain('application/json');
    expect(executeTool(tool('api-request-builder', 'API Builder'), '{"method":"POST","url":"https://example.com","headers":{"X-Test":"1"},"body":"ok"}').output).toContain('POST https://example.com');
    expect(executeTool(tool('kubernetes-pod-yaml', 'Kubernetes'), 'web\nnginx:alpine').output).toContain('kind: Deployment');
    expect(executeTool(tool('curl-command-builder', 'cURL Builder'), '{"method":"GET","url":"https://example.com"}').output).toContain('curl -X GET');
    expect(executeTool(tool('s3-bucket-policy-builder', 'S3 Policy'), 'demo-bucket').output).toContain('demo-bucket/*');
    expect(executeTool(tool('webhook-tester-format', 'Webhook Formatter'), '{"event":"ping"}').output).toContain('"event": "ping"');
    expect(executeTool(tool('github-profile-generator', 'GitHub Profile'), 'Murari\nDeveloper').output).toContain('# Murari');
  });


  it('covers previously unhandled deterministic math routes', () => {
    expect(executeTool(tool('average-mean-median-mode', 'Mean Median Mode'), '1 2 2 4').output).toContain('Median: 2');
    expect(executeTool(tool('modulo-arithmetic-calc', 'Modulo'), '17 5').output).toContain('a mod m: 2');
    expect(executeTool(tool('logarithm-calculator', 'Logarithm'), '100 10').output).toContain('2');
    expect(executeTool(tool('pythagorean-theorem-calc', 'Pythagorean'), '3 4').output).toContain('5');
    expect(executeTool(tool('circle-area-perimeter', 'Circle'), '2').output).toContain('Area:');
  });
  it('covers deterministic semantic batch 10 routes', () => {
    expect(executeTool(tool('rot13-cipher', 'ROT13 Cipher'), 'Hello').output).toBe('Uryyb');
    expect(executeTool(tool('shuffle-words', 'Shuffle Words'), 'one two three').output.split(/\s+/)).toHaveLength(3);
    expect(executeTool(tool('escape-json-string', 'Escape JSON String'), 'a"b').output).toBe('a\"b');
    expect(executeTool(tool('json-flatten', 'JSON Flatten'), '{"user":{"name":"Murari"}}').output).toContain('"user.name": "Murari"');
    expect(executeTool(tool('markdown-table-builder', 'Markdown Table Builder'), 'Name,Age\nA,20').output).toContain('| Name | Age |');
    expect(executeTool(tool('json-schema-generator', 'JSON Schema Generator'), '{"name":"hub","active":true}').output).toContain('"type": "object"');
    expect(executeTool(tool('xml-formatter', 'XML Formatter'), '<root><item>1</item></root>').output).toContain('<root>');
    expect(executeTool(tool('yaml-validator', 'YAML Validator'), 'name: hub\nactive: true').output).toContain('Valid');
    expect(executeTool(tool('toml-validator', 'TOML Validator'), 'name = "hub"').output).toContain('Valid');
  });
  it('covers additional deterministic semantic routes', () => {
    expect(executeTool(tool('base32-encoder', 'Base32'), 'foo').output).toBe('MZXW6===');
    expect(executeTool(tool('markdown-to-html', 'Markdown to HTML'), '# Hello').output).toContain('<h1>Hello</h1>');
    expect(executeTool(tool('xml-to-json-basic', 'XML to JSON'), '<root><name>hub</name></root>').output).toContain('"name": "hub"');
    expect(executeTool(tool('url-parser-inspector', 'URL Parser'), 'https://example.com/a?q=1').output).toContain('Host: example.com');
    expect(executeTool(tool('css-minifier-basic', 'CSS Minifier Basic'), 'a { color: red; }').output).toBe('a{color:red}');
    expect(executeTool(tool('html-minifier-basic', 'HTML Minifier Basic'), '<div>  hi </div>').output).toBe('<div> hi </div>');
  });

});
