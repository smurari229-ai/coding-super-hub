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
  it('generates a real HMAC-SHA256 signed URL spec', () => {
    const out = executeTool(
      tool('signed-url-builder-spec', 'Signed URL'),
      '{"url":"https://example.com/file.bin?download=1","secret":"test-secret","expiresAt":1893456000}'
    ).output;
    expect(out).toContain('signature=264b19c6aa836dea6596545a8fb713c6f6171847063f067e7096bd9fdd6ce513');
    expect(out).toContain('Canonical string: /file.bin?download=1&expires=1893456000');
  });

  it('covers the deterministic text and encoding batch', () => {
    expect(executeTool(tool('base64-text-encoder', 'Base64 Text Encoder'), 'Hello 🚀').output).toBe('SGVsbG8g8J+agA==');
    expect(executeTool(tool('url-encoder-decoder', 'URL Encoder'), 'hello world?q=1&x=2').output).toBe('hello%20world%3Fq%3D1%26x%3D2');
    expect(executeTool(tool('case-converter', 'Case Converter'), 'hello world').output).toContain('camelCase: helloWorld');
    expect(executeTool(tool('string-slugifier', 'Slugifier'), 'Déjà Vu — Production Tools!').output).toBe('deja-vu-production-tools');
    expect(executeTool(tool('html-entity-encoder', 'HTML Entities'), '<tag a="1">').output).toContain('&lt;tag');
    expect(executeTool(tool('hex-to-string', 'Hex to String'), '48 65 6c 6c 6f').output).toBe('Hello');
    expect(executeTool(tool('binary-to-text', 'Binary to Text'), '01001000 01101001').output).toBe('Hi');
    expect(executeTool(tool('morse-code-converter', 'Morse'), 'SOS').output).toBe('... --- ...');
    expect(executeTool(tool('morse-code-converter', 'Morse'), '... --- ...').output).toBe('SOS');
    expect(executeTool(tool('word-frequency-analyzer', 'Word Frequency'), 'Cat cat dog').output).toContain('cat : 2');
  });

  it('covers legacy hash semantic batch 22', () => {
    expect(executeTool(tool('sha1-hash', 'SHA-1 Hash'), 'abc').output).toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
    expect(executeTool(tool('md5-hash', 'MD5 Hash'), 'abc').output).toBe('900150983cd24fb0d6963f7d28e17f72');
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
    expect(executeTool(tool('modulo-arithmetic-calc', 'Modulo'), '17 5').output).toBe('2');
    expect(executeTool(tool('logarithm-calculator', 'Logarithm'), '100 10').output).toContain('2');
    expect(executeTool(tool('pythagorean-theorem-calc', 'Pythagorean'), '3 4').output).toContain('5');
    expect(executeTool(tool('circle-area-perimeter', 'Circle'), '2').output).toContain('Area:');
  });
  it('covers deterministic semantic batch 10 routes', () => {
    expect(executeTool(tool('rot13-cipher', 'ROT13 Cipher'), 'Hello').output).toBe('Uryyb');
    expect(executeTool(tool('shuffle-words', 'Shuffle Words'), 'one two three').output.split(/\s+/)).toHaveLength(3);
    expect(executeTool(tool('escape-json-string', 'Escape JSON String'), 'a"b').output).toBe('a\\\"b');
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

  it('covers additional text semantic routes', () => {
    expect(executeTool(tool('case-title', 'Title Case'), 'the lord of the rings').output).toBe('The Lord of the Rings');
    expect(executeTool(tool('quoted-printable-decoder', 'Quoted Printable'), 'Hello=20World=21').output).toBe('Hello World!');
    expect(executeTool(tool('repeat-string', 'String Repeater'), '3\nHi').output).toBe('HiHiHi');
    expect(executeTool(tool('text-compare-inline', 'Inline Diff'), 'hello world\nhello hub').output).toContain('[hub]');
    expect(executeTool(tool('json-to-ts-interface', 'JSON to TypeScript'), '{"name":"hub","active":true}').output).toContain('name: string;');
    expect(executeTool(tool('html-to-markdown', 'HTML to Markdown'), '<h1>Hello</h1><strong>World</strong>').output).toContain('# Hello');
  });
  it('covers additional high-ROI semantic routes', () => {
    expect(executeTool(tool('permission-octal-calculator', 'Chmod'), '755').output).toContain('Owner:');
    expect(executeTool(tool('cmyk-to-rgb-hex', 'CMYK'), '0 100 100 0').output).toContain('HEX: #FF0000');
    expect(executeTool(tool('viewport-percentage-calc', 'Viewport'), '50 25 400 800').output).toContain('Width: 200');
    expect(executeTool(tool('css-truncate-multiline', 'CSS Truncate'), '3\nHello world').output).toContain('-webkit-line-clamp: 3');
    expect(executeTool(tool('bson-objectid-generator', 'ObjectId'), '507f1f77bcf86cd799439011').output).toContain('ObjectId: 507f1f77bcf86cd799439011');
    expect(executeTool(tool('color-hex-to-decimal', 'HEX to Decimal'), '#FFFFFF').output).toBe('Decimal: 16777215');
    expect(executeTool(tool('color-decimal-to-hex', 'Decimal to HEX'), '16711680').output).toBe('HEX: #FF0000');
    expect(executeTool(tool('clamp-number-math', 'Clamp'), '150 0 100').output).toBe('Clamped: 100');
    expect(executeTool(tool('rgb-to-hex-code', 'RGB to HEX'), '255 0 128').output).toBe('#FF0080');
  });



  it('handles deterministic utility batch 15', () => {
    expect(executeTool(tool('regex-tester', 'Regex'), '^a\napple\nbanana').output).toBe('a');
    expect(executeTool(tool('text-diff-checker', 'Diff'), 'one\ntwo\n---\none\nthree').output).toContain('- two');
    expect(executeTool(tool('uuid-generator', 'UUID'), 'demo').output).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(executeTool(tool('nanoid-generator', 'NanoID'), 'demo').output).toHaveLength(21);
    expect(executeTool(tool('lorem-ipsum-generator', 'Lorem'), '5').output.split(' ').length).toBe(5);
    expect(executeTool(tool('random-string-generator', 'Random'), '12').output).toHaveLength(12);
    expect(executeTool(tool('cron-expression-builder', 'Cron'), '0 0 * * *').output).toBe('Every day at 00:00');
    expect(executeTool(tool('csv-column-extractor', 'CSV'), '1\na,b\nc,d').output).toBe('b\nd');
  });


  it('handles deterministic text batch 17', () => {
    expect(executeTool(tool('ascii-art-banner', 'ASCII'), 'ab').output).toContain('██');
    expect(executeTool(tool('unicode-character-inspector', 'Unicode'), 'A').output).toContain('U+0041');
    expect(executeTool(tool('remove-html-tags', 'Remove HTML'), '<p>Hello</p>').output).toBe('Hello');
    expect(executeTool(tool('text-prefix-suffix', 'Prefix'), '>\n<\nhello\nworld').output).toBe('>hello<\n>world<');
    expect(executeTool(tool('escape-json-string', 'Escape JSON'), 'a"b').output).toBe('a\\"b');
    expect(executeTool(tool('slug-to-text', 'Slug'), 'hello-world_test').output).toBe('hello world test');
  });

  it('handles deterministic text batch 16', () => {
    expect(executeTool(tool('leet-speak-generator', 'Leet'), 'Elite hackers').output).toBe('3l1t3 h4ck3r5');
    expect(executeTool(tool('upside-down-text', 'Upside Down'), 'abc').output).toBe('ɔqɐ');
    expect(executeTool(tool('zalgo-text-generator', 'Zalgo'), 'abc').output).toContain('a');
    expect(executeTool(tool('json-path-finder', 'JSONPath'), 'user.name\n{"user":{"name":"Murari"}}').output).toBe('"Murari"');
  });


  it('handles deterministic security batch 18', () => {
    expect(executeTool(tool('diff-checker-unified', 'Unified Diff'), 'one\ntwo\n---\none\nthree').output).toContain('- two');
    expect(executeTool(tool('hex-dump-generator', 'Hex Dump'), 'ABC').output).toContain('41 42 43');
    expect(executeTool(tool('cors-header-builder', 'CORS Builder'), 'https://example.com').output).toContain('Access-Control-Allow-Origin: https://example.com');
    expect(executeTool(tool('csp-generator', 'CSP'), 'https://api.example.com').output).toContain('connect-src');
    expect(executeTool(tool('security-headers-analyzer', 'Security Headers'), 'Content-Security-Policy: default-src \'self\'').output).toContain('Content-Security-Policy: present');
    expect(executeTool(tool('password-entropy-meter', 'Password Entropy'), 'Abc123!').output).toContain('Entropy:');
    expect(executeTool(tool('cors-preflight-inspector', 'CORS Preflight'), 'Origin: https://example.com\nAccess-Control-Request-Method: POST').output).toContain('Requested method: POST');
  });


  it('handles deterministic data batch 19', () => {
    expect(executeTool(tool('json-formatter', 'JSON Formatter'), '{"a":1}').output).toContain('\n  "a": 1');
    expect(executeTool(tool('json-minifier', 'JSON Minifier'), '{ "a": 1 }').output).toBe('{"a":1}');
    const token = 'eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMjMifQ.signature';
    expect(executeTool(tool('jwt-debugger', 'JWT Debugger'), token).output).toContain('"sub": "123"');
    expect(executeTool(tool('markdown-previewer', 'Markdown Previewer'), '# Hello').output).toContain('<h1>Hello</h1>');
    expect(executeTool(tool('punycode-converter', 'Punycode'), 'münich.com').output).toContain('xn--');
  });


  it('handles crypto batch 20', () => {
    expect(executeTool(tool('sha256-hash', 'SHA-256'), 'abc').output).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(executeTool(tool('hmac-sha256', 'HMAC-SHA256'), 'key\nThe quick brown fox').output).toBe('203d1e5cedd2d18f8c5a3beff0bd9c1ebcb97097dfcb288c46b00c9227fde2c0');
    expect(executeTool(tool('uuid-v7-generator', 'UUID v7'), 'demo').output).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });


  it('handles security utility batch 21', () => {
    expect(executeTool(tool('hash-identifier', 'Hash identifier'), 'a'.repeat(64)).output).toContain('SHA-256');
    expect(executeTool(tool('rsa-key-template', 'RSA template'), 'x').output).toContain('BEGIN PRIVATE KEY');
    const password = executeTool(tool('password-generator', 'Password'), '20').output;
    expect(password).toHaveLength(20);
    expect(executeTool(tool('random-pin-generator', 'PIN'), '6').output).toMatch(/^\d{6}$/);
    const url = executeTool(tool('oauth2-auth-url-builder', 'OAuth URL'), JSON.stringify({authorizationEndpoint:'https://auth.example.com/authorize',clientId:'abc',redirectUri:'https://app.example.com/cb',scope:'openid profile',state:'xyz'})).output;
    expect(url).toContain('client_id=abc');
    expect(url).toContain('response_type=code');
  });

});


describe('semantic web batch 22', () => {
  it('covers deterministic web and CSS utilities', () => {
    expect(executeTool(tool('color-palette-generator', 'Color Palette Generator'), '#3366FF').output).toContain('Base: #3366FF');
    expect(executeTool(tool('contrast-checker', 'Contrast Checker'), '#000000 #ffffff').output).toContain('21.00:1');
    expect(executeTool(tool('css-box-shadow-generator', 'CSS Box Shadow'), '0 4 12 0 #00000033').output).toContain('box-shadow: 0px 4px 12px 0px #00000033;');
    expect(executeTool(tool('css-flexbox-playground', 'CSS Flexbox'), 'row\nspace-between\ncenter\n24').output).toContain('justify-content: space-between;');
    expect(executeTool(tool('css-grid-generator', 'CSS Grid'), '4\n3\n12').output).toContain('repeat(4, minmax(0, 1fr))');
  });
});


describe('semantic data batch 23', () => {
  it('covers JSON/YAML/query/timestamp utilities', () => {
    expect(executeTool(tool('json-to-yaml', 'JSON to YAML'), '{"name":"Murari","count":2}').output).toContain('name: Murari');
    expect(executeTool(tool('yaml-to-json', 'YAML to JSON'), 'name: Murari\ncount: 2').output).toContain('"count": 2');
    expect(executeTool(tool('query-string-to-json', 'Query String to JSON'), '?page=2&tag=a&tag=b').output).toContain('"tag": [');
    expect(executeTool(tool('json-to-query-string', 'JSON to Query String'), '{"page":2,"tag":["a","b"]}').output).toContain('page=2');
    expect(executeTool(tool('json-size-calculator', 'JSON Size Calculator'), '{"a":1}').output).toContain('UTF-8 bytes: 7');
    expect(executeTool(tool('timestamp-converter', 'Timestamp Converter'), '0').output).toContain('1970-01-01T00:00:00.000Z');
  });
});


describe('semantic utility batch 24', () => {
  it('covers number base, random range, color and Intl formatting', () => {
    expect(executeTool(tool('number-base-converter', 'Number Base Converter'), 'FF 16 10').output).toContain('Decimal: 255');
    const random = Number(executeTool(tool('random-number-range', 'Random Number Range'), '1 3').output);
    expect(random).toBeGreaterThanOrEqual(1); expect(random).toBeLessThanOrEqual(3);
    expect(executeTool(tool('hex-to-rgb-code', 'Hex to RGB'), '#3366FF').output).toBe('RGB: 51, 102, 255');
    expect(executeTool(tool('format-currency-intl', 'Currency Formatter'), '1234.5 INR en-IN').output).toContain('₹');
    expect(executeTool(tool('format-number-compact', 'Compact Number Formatter'), '1250000 en-US').output).toContain('1.25M');
  });
});

describe('HTML entity decoder edge cases', () => {
  it('decodes named entities case-insensitively and preserves invalid numeric code points', () => {
    const result = executeTool(
      tool('html-entity-decoder', 'HTML Entity Decoder'),
      '&AMP; &Lt; &#65; &#x1F680; &#99999999; &#xD800;'
    );
    expect(result.error).toBeUndefined();
    expect(result.output).toBe('& < A 🚀 &#99999999; &#xD800;');
  });
});

describe('additional practical catalog utilities', () => {
  it('handles array transformations with deterministic semantics', () => {
    expect(executeTool(tool('flatten-deep-array', 'Flatten Array'), '[[1,[2]],3]').output).toBe('[\n  1,\n  2,\n  3\n]');
    expect(JSON.parse(executeTool(tool('chunk-array-utility', 'Chunk Array'), '{"items":[1,2,3,4,5],"size":2}').output)).toEqual([[1,2],[3,4],[5]]);
    expect(JSON.parse(executeTool(tool('difference-intersection-arrays', 'Array Difference'), '{"a":[1,2,3],"b":[2,3,4]}').output)).toEqual({ difference:[1], intersection:[2,3], bOnly:[4] });
    expect(JSON.parse(executeTool(tool('group-by-array-object', 'Group Objects'), '{"key":"team","items":[{"team":"A","n":1},{"team":"B","n":2},{"team":"A","n":3}]}').output).A).toHaveLength(2);
    expect(['a','b']).toContain(executeTool(tool('random-array-item', 'Random Array Item'), '["a","b"]').output);
  });

  it('generates locale names, code snippets, and algorithm traces', () => {
    expect(executeTool(tool('currency-code-lookup', 'Currency Code'), 'INR').output).toContain('Indian Rupee');
    expect(executeTool(tool('country-code-lookup', 'Country Code'), 'IN').output).toContain('India');
    const go = executeTool(tool('json-to-go-struct', 'JSON to Go'), '{"first_name":"A","active":true}').output;
    expect(go).toContain('FirstName string');
    expect(go).toContain('json:"first_name"');
    expect(executeTool(tool('crontab-syntax-generator', 'Crontab'), '0 9 * * 1-5').output).toContain('0 9 * * 1-5 /path/to/command');
    expect(executeTool(tool('mock-api-response-maker', 'Mock API Response'), '{"status":201,"body":{"ok":true}}').output).toContain('HTTP/1.1 201');
    expect(executeTool(tool('sorting-algorithm-visualizer', 'Sort Trace'), '3,1,2').output).toContain('Sorted: 1, 2, 3');
    expect(executeTool(tool('binary-search-visualizer', 'Binary Search'), '{"array":[1,3,5,7],"target":5}').output).toContain('Found at index 2');
  });
});

describe('practical text, date and HTTP utilities', () => {
  it('escapes regex metacharacters and creates a secure passphrase', () => {
    expect(executeTool(tool('escape-regex-string', 'Escape Regex'), 'a+b[c]\\d').output).toBe('a\\+b\\[c\\]\\\\d');
    const phrase = executeTool(tool('passphrase-generator', 'Passphrase Generator'), '5').output;
    expect(phrase.split('-')).toHaveLength(5);
    expect(phrase).toMatch(/^[a-z]+(?:-[a-z]+){4}$/);
  });

  it('classifies user-agent text and calculates exact age using calendar dates', () => {
    expect(JSON.parse(executeTool(tool('is-mobile-browser-check', 'Mobile Browser Check'), 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile').output).classification).toBe('mobile');
    expect(executeTool(tool('age-calculator-exact', 'Exact Age Calculator'), '2000-01-15\n2026-10-09').output).toContain('26 years, 8 months, 24 days');
    expect(executeTool(tool('age-calculator-exact', 'Exact Age Calculator'), '2026-02-30\n2026-10-09').error).toContain('real calendar date');
  });

  it('counts weekdays and holidays inclusively', () => {
    const result = executeTool(tool('workday-business-days', 'Business Days'), '2026-10-05\n2026-10-09\n2026-10-07');
    expect(result.output).toContain('Weekdays in range (inclusive): 5');
    expect(result.output).toContain('Business days excluding listed holidays: 4');
    expect(executeTool(tool('workday-business-days', 'Business Days'), '1900-01-01\n2101-01-01').error).toContain('100 years or less');
  });

  it('inspects raw HTTP headers and reports missing security headers', () => {
    const result = JSON.parse(executeTool(tool('http-headers-inspector', 'HTTP Headers Inspector'), 'HTTP/1.1 200 OK\nContent-Type: text/html\nX-Content-Type-Options: nosniff').output);
    expect(result.statusCode).toBe(200);
    expect(result.securityHeaders['x-content-type-options'].present).toBe(true);
    expect(result.securityHeaders['content-security-policy'].present).toBe(false);
  });

  it('counts SMS segments and safely emits SVG favicon markup', () => {
    const sms = JSON.parse(executeTool(tool('character-counter-sms', 'SMS Character Counter'), 'Hello^').output);
    expect(sms.encoding).toBe('GSM-7');
    expect(sms.messageUnits).toBe(7);
    const svg = executeTool(tool('svg-favicon-generator', 'SVG Favicon Generator'), '<\n#112233\n#ffffff').output;
    expect(svg).toContain('&lt;');
    expect(svg).toContain('fill="#112233"');
    expect(svg).not.toContain('<text x="32" y="44" text-anchor="middle" font-family="Arial,sans-serif" font-size="42" font-weight="700" fill="#112233"><</text>');
  });
});
describe('additional catalog converters and generators', () => {
  it('converts HEX colors and validates RGB channels', () => {
    const color = JSON.parse(executeTool(tool('hex-to-hsl-rgb', 'Color Converter'), '#ff0000').output);
    expect(color.hex).toBe('#FF0000');
    expect(color.rgb).toBe('rgb(255, 0, 0)');
    expect(color.hsl).toBe('hsl(0, 100%, 50%)');
    expect(executeTool(tool('hex-to-hsl-rgb', 'Color Converter'), 'rgb(300,0,0)').error).toContain('between 0 and 255');
  });

  it('calculates signed two-complement binary within width limits', () => {
    const result = JSON.parse(executeTool(tool('twos-complement-calc', 'Two Complement'), '-5\n8').output);
    expect(result.binary).toBe('11111011');
    expect(result.hex).toBe('0xFB');
    expect(executeTool(tool('twos-complement-calc', 'Two Complement'), '200\n8').error).toContain('must be between');
  });

  it('generates responsive fluid spacing CSS', () => {
    const result = executeTool(tool('fluid-space-calculator', 'Fluid Spacing'), '16\n32\n320\n1440\npadding').output;
    expect(result).toContain('clamp(16px,');
    expect(result).toContain('padding:');
    expect(executeTool(tool('fluid-space-calculator', 'Fluid Spacing'), '32\n16\n1440\n320').error).toContain('non-negative');
  });

  it('builds FAQ JSON-LD from validated question/answer pairs', () => {
    const result = executeTool(tool('schema-org-json-ld-faq', 'FAQ Schema'), '[{"question":"What is this?","answer":"A tool."}]').output;
    expect(result).toContain('"@type": "FAQPage"');
    expect(result).toContain('"name": "What is this?"');
    expect(executeTool(tool('schema-org-json-ld-faq', 'FAQ Schema'), '[{"question":"","answer":"A"}]').error).toContain('non-empty');
  });

  it('converts CSV rows to escaped XML and handles quoted commas', () => {
    const result = executeTool(tool('csv-to-xml', 'CSV to XML'), 'name,notes\nAda,"hello, <world>"').output;
    expect(result).toContain('<name>Ada</name>');
    expect(result).toContain('<notes>hello, &lt;world&gt;</notes>');
    expect(executeTool(tool('csv-to-xml', 'CSV to XML'), 'name,notes\nAda,"unfinished').error).toContain('unclosed quoted');
  });
});
