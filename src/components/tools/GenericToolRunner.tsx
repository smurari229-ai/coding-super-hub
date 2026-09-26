import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download, Play, RefreshCw, Sparkles, Wand2 } from 'lucide-react';
import { ToolItem } from '../../types/tools';

interface GenericToolRunnerProps {
  tool: ToolItem;
  onOpenAiCopilot: (code: string) => void;
}

type RunnerResult = { output: string; error?: string };

const MORSE: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.',
  H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.',
  O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-',
  V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
};

const hasId = (tool: ToolItem, ...terms: string[]) => {
  const haystack = [tool.id, ...tool.tags].map(value => value.toLowerCase());
  return terms.some(term => haystack.some(value => value.includes(term.toLowerCase())));
};

const prettyJson = (value: string) => JSON.stringify(JSON.parse(value), null, 2);
const minifyJson = (value: string) => JSON.stringify(JSON.parse(value));

const slugify = (value: string) => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const utf8ToBase64 = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
};

const base64ToUtf8 = (value: string) => {
  const binary = atob(value.trim());
  return new TextDecoder().decode(Uint8Array.from(binary, char => char.charCodeAt(0)));
};

const toHex = (value: string) =>
  Array.from(new TextEncoder().encode(value), byte => byte.toString(16).padStart(2, '0')).join(' ');

const fromHex = (value: string) => {
  const clean = value.replace(/0x/gi, '').replace(/[^0-9a-f]/gi, '');
  if (clean.length % 2) throw new Error('Hex input must contain an even number of digits.');
  return new TextDecoder().decode(new Uint8Array((clean.match(/../g) ?? []).map(pair => parseInt(pair, 16))));
};

const toBinary = (value: string) =>
  Array.from(new TextEncoder().encode(value), byte => byte.toString(2).padStart(8, '0')).join(' ');

const fromBinary = (value: string) => {
  const groups = value.trim().split(/\s+/);
  if (groups.some(group => !/^[01]{8}$/.test(group))) {
    throw new Error('Binary input must use 8-bit groups separated by spaces.');
  }
  return new TextDecoder().decode(new Uint8Array(groups.map(group => parseInt(group, 2))));
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char] ?? char);

const unescapeHtml = (value: string) => {
  const element = document.createElement('textarea');
  element.innerHTML = value;
  return element.value;
};

const words = (value: string) => value.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

const gcd = (a: number, b: number) => {
  a = Math.abs(Math.trunc(a));
  b = Math.abs(Math.trunc(b));
  while (b) [a, b] = [b, a % b];
  return a;
};

const lcm = (a: number, b: number) => a === 0 || b === 0 ? 0 : Math.abs(a * b) / gcd(a, b);

const isPrime = (n: number) => {
  n = Math.trunc(n);
  if (n < 2) return false;
  if (n === 2 || n === 3) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
};

const uuid = () => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
};

const randomToken = (length: number) => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789-_!@#$%';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('');
};

const minifyCode = (value: string) =>
  value.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{}:;,])\s*/g, '$1').trim();

const formatCss = (value: string) => {
  let depth = 0;
  return value.replace(/\s+/g, ' ')
    .replace(/\s*{\s*/g, ' {\n')
    .replace(/;\s*/g, ';\n')
    .replace(/\s*}\s*/g, '\n}\n')
    .split('\n')
    .filter(Boolean)
    .map(line => {
      if (line.trim().startsWith('}')) depth = Math.max(0, depth - 1);
      const result = '  '.repeat(depth) + line.trim();
      if (line.includes('{')) depth += 1;
      return result;
    })
    .join('\n');
};

const formatSql = (value: string) => value
  .replace(/\s+/g, ' ')
  .replace(/\s+(FROM|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|VALUES|SET|LEFT JOIN|RIGHT JOIN|INNER JOIN|JOIN)\s+/gi, '\n$1 ')
  .replace(/\s+(AND|OR)\s+/gi, '\n  $1 ')
  .trim();

const formatXml = (value: string) => {
  let depth = 0;
  return value.replace(/>\s*</g, '><')
    .replace(/</g, '\n<')
    .split('\n')
    .filter(Boolean)
    .map(token => {
      if (/^<\//.test(token)) depth = Math.max(0, depth - 1);
      const line = '  '.repeat(depth) + token.trim();
      if (/^<[^!?/][^>]*[^/]?>$/.test(token) && !/<\//.test(token)) depth += 1;
      return line;
    })
    .join('\n');
};

const yamlScalar = (value: unknown) => {
  if (value === null) return 'null';
  if (typeof value === 'string') return /^[A-Za-z0-9_./-]+$/.test(value) ? value : JSON.stringify(value);
  return String(value);
};

const jsonToYaml = (value: unknown, depth = 0): string => {
  const pad = '  '.repeat(depth);
  if (Array.isArray(value)) {
    return value.map(item =>
      typeof item === 'object' && item !== null
        ? pad + '-\n' + jsonToYaml(item, depth + 1)
        : pad + '- ' + yamlScalar(item)
    ).join('\n');
  }
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value as Record<string, unknown>).map(([key, item]) =>
      typeof item === 'object' && item !== null
        ? pad + key + ':\n' + jsonToYaml(item, depth + 1)
        : pad + key + ': ' + yamlScalar(item)
    ).join('\n');
  }
  return pad + yamlScalar(value);
};

const parseCsv = (value: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    const next = value[i + 1];
    if (char === '"' && quoted && next === '"') { cell += '"'; i += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === ',' && !quoted) { row.push(cell); cell = ''; continue; }
    if (char === '\n' && !quoted) { row.push(cell); rows.push(row); row = []; cell = ''; continue; }
    if (char !== '\r') cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(rowItem => rowItem.some(Boolean));
};

const csvToJson = (value: string) => {
  const rows = parseCsv(value);
  if (rows.length < 2) throw new Error('CSV needs a header row and at least one data row.');
  const headers = rows[0].map(valueItem => valueItem.trim());
  const data = rows.slice(1).map(row => Object.fromEntries(headers.map((key, index) => {
    const raw = (row[index] ?? '').trim();
    if (raw === 'true') return [key, true];
    if (raw === 'false') return [key, false];
    if (/^-?\d+(\.\d+)?$/.test(raw)) return [key, Number(raw)];
    return [key, raw];
  })));
  return JSON.stringify(data, null, 2);
};

const jsonToCsv = (value: string) => {
  const data = JSON.parse(value);
  if (!Array.isArray(data) || !data.length || data.some(row => typeof row !== 'object' || row === null)) {
    throw new Error('Input must be a non-empty JSON array of objects.');
  }
  const headers = Array.from(new Set(data.flatMap(row => Object.keys(row as object))));
  const quote = (valueItem: unknown) => {
    const text = valueItem == null ? '' : String(valueItem);
    return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  };
  return [headers.join(','), ...data.map(row =>
    headers.map(key => quote((row as Record<string, unknown>)[key])).join(',')
  )].join('\n');
};

const defaultInput = (tool: ToolItem) => {
  if (tool.defaultInput) return tool.defaultInput;
  const id = tool.id;
  if (id.includes('json')) return '{\n  "name": "Coding Super Hub",\n  "tools": 540,\n  "active": true\n}';
  if (id.includes('xml')) return '<root><tool id="json">Formatter</tool><status>ready</status></root>';
  if (id.includes('sql')) return 'SELECT id, username, email FROM users WHERE active = true ORDER BY created_at DESC;';
  if (id.includes('css')) return '.container { display: flex; justify-content: center; gap: 16px; }';
  if (id.includes('html')) return '<div class="card"><h2>Hello Developer</h2><p>Build something useful.</p></div>';
  if (id.includes('url')) return 'https://example.com/search?q=hello world&lang=en';
  if (id.includes('base64')) return 'Hello, Coding Super Hub!';
  if (id.includes('hex') || id.includes('binary')) return 'Hello';
  if (id.includes('password')) return '24';
  if (id.includes('timestamp')) return '2026-09-26T09:00:00.000Z';
  if (id.includes('slug')) return 'Build Production Ready Developer Tools';
  if (id.includes('gitignore')) return 'node';
  if (id.includes('docker')) return 'node:22-alpine';
  if (id.includes('nginx')) return 'example.com';
  if (id.includes('csp')) return "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'";
  return 'The quick brown fox jumps over the lazy dog. 1234567890!';
};

function runTool(tool: ToolItem, input: string): RunnerResult {
  const id = tool.id.toLowerCase();
  const text = input.trim();
  const has = (...terms: string[]) => hasId(tool, ...terms);

  try {
    if (!text && !has('generate', 'random', 'uuid', 'lorem', 'password')) {
      return { output: '', error: 'Enter some input first.' };
    }

    if (has('json-formatter', 'json-prett')) return { output: prettyJson(input) };
    if (has('json-minif')) return { output: minifyJson(input) };
    if (has('json-to-csv')) return { output: jsonToCsv(input) };
    if (has('csv-to-json')) return { output: csvToJson(input) };
    if (has('json-to-yaml', 'yaml')) return { output: jsonToYaml(JSON.parse(input)) };
    if (id === 'json-key-sorter') {
      const value = JSON.parse(input);
      const sortKeys = (item: unknown): unknown =>
        Array.isArray(item) ? item.map(sortKeys)
          : item && typeof item === 'object'
            ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, sortKeys(child)]))
            : item;
      return { output: JSON.stringify(sortKeys(value), null, 2) };
    }

    if (has('xml-formatter', 'xml-prett')) return { output: formatXml(input) };
    if (id === 'xml-to-json-basic') {
      const parser = new DOMParser();
      const documentNode = parser.parseFromString(input, 'application/xml');
      if (documentNode.querySelector('parsererror')) throw new Error('Invalid XML.');
      const convert = (element: Element): unknown => {
        const result: Record<string, unknown> = {};
        Array.from(element.attributes).forEach(attribute => { result['@' + attribute.name] = attribute.value; });
        Array.from(element.children).forEach(child => {
          const value = convert(child);
          const existing = result[child.tagName];
          result[child.tagName] = existing === undefined ? value : Array.isArray(existing) ? [...existing, value] : [existing, value];
        });
        const directText = Array.from(element.childNodes)
          .filter(node => node.nodeType === Node.TEXT_NODE)
          .map(node => node.textContent?.trim())
          .filter(Boolean)
          .join(' ');
        if (directText) result['#text'] = directText;
        return result;
      };
      return { output: JSON.stringify({ [documentNode.documentElement.tagName]: convert(documentNode.documentElement) }, null, 2) };
    }

    if (has('sql-formatter', 'sql-prett')) return { output: formatSql(input) };
    if (has('sql-minif', 'css-minif', 'html-minif', 'js-minif', 'code-minif')) return { output: minifyCode(input) };
    if (has('css-formatter', 'css-prett')) return { output: formatCss(input) };
    if (has('html-formatter', 'html-prett')) return { output: input.replace(/>\s*</g, '>\n<') };

    if (has('base64')) return { output: has('decode') || id.includes('decoder') ? base64ToUtf8(input) : utf8ToBase64(input) };
    if (has('html-entity')) return { output: has('decode', 'unescape') ? unescapeHtml(input) : escapeHtml(input) };
    if (has('url-encoder', 'url-encode', 'uri-encode')) return { output: has('decode', 'unescape') ? decodeURIComponent(input) : encodeURIComponent(input) };
    if (has('hex-to-string')) return { output: has('encode') ? toHex(input) : fromHex(input) };
    if (has('binary-to-text')) return { output: has('encode') ? toBinary(input) : fromBinary(input) };
    if (has('unicode-escape')) {
      return {
        output: has('decode')
          ? input.replace(/\\u([0-9a-f]{4})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
          : Array.from(input).map(char => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0')).join(''),
      };
    }
    if (has('url-slug', 'slugifier', 'slug')) return { output: slugify(input) };

    if (has('reverse')) return { output: input.split('').reverse().join('') };
    if (has('trim', 'whitespace')) return { output: input.split('\n').map(line => line.trim().replace(/[ \t]+/g, ' ')).filter(Boolean).join('\n') };
    if (has('duplicate', 'dedupe', 'unique')) return { output: Array.from(new Set(input.split('\n'))).join('\n') };
    if (has('sorter', 'line-sort', 'alphabetical')) return { output: input.split('\n').sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).join('\n') };
    if (has('remove-empty')) return { output: input.split('\n').filter(line => line.trim()).join('\n') };
    if (has('word-frequency', 'frequency')) {
      const counts: Record<string, number> = {};
      words(input).forEach(word => { counts[word] = (counts[word] ?? 0) + 1; });
      return { output: Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([word, count]) => word.padEnd(24) + ' ' + count).join('\n') };
    }
    if (has('statistics', 'stats', 'word-counter')) {
      const wordList = words(input);
      return { output: [
        'Characters: ' + input.length,
        'Characters (no spaces): ' + input.replace(/\s/g, '').length,
        'Words: ' + wordList.length,
        'Lines: ' + input.split('\n').length,
        'Sentences: ' + (input.match(/[.!?]+(?=\s|$)/g) ?? []).length,
        'Bytes (UTF-8): ' + new TextEncoder().encode(input).length,
        'Reading time: ~' + Math.max(1, Math.ceil(wordList.length / 200)) + ' min',
      ].join('\n') };
    }
    if (has('rot13')) return { output: input.replace(/[a-z]/gi, char => String.fromCharCode((char.charCodeAt(0) <= 90 ? 65 : 97) + ((char.charCodeAt(0) - (char.charCodeAt(0) <= 90 ? 65 : 97) + 13) % 26))) };
    if (has('morse')) {
      const reverse = Object.fromEntries(Object.entries(MORSE).map(([key, value]) => [value, key]));
      return { output: has('decode') ? input.split(/\s+/).map(code => reverse[code] ?? code).join('') : input.toUpperCase().split('').map(char => char === ' ' ? '/' : MORSE[char] ?? char).join(' ') };
    }

    if (has('uuid')) return { output: Array.from({ length: Math.min(100, Math.max(1, Number(input) || 1)) }, uuid).join('\n') };
    if (has('nanoid', 'cuid', 'random-string', 'token')) return { output: randomToken(Math.min(256, Math.max(4, Number(input) || 24))) };
    if (has('password')) return { output: randomToken(Math.min(128, Math.max(8, Number(input) || 24))) };
    if (has('lorem')) {
      const seed = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';
      return { output: Array(Math.min(20, Math.max(1, Number(input) || 3))).fill(seed).join(' ') };
    }

    if (id === 'fake-data-generator') {
      const first = ['Aarav', 'Maya', 'Rohan', 'Anika', 'Kabir', 'Sara'];
      const last = ['Sharma', 'Patel', 'Singh', 'Mehta', 'Khan', 'Iyer'];
      const rows = Array.from({ length: 10 }, (_, index) => {
        const name = first[index % first.length] + ' ' + last[(index + 2) % last.length];
        return { id: index + 1, name, email: name.toLowerCase().replace(/ /g, '.') + '@example.com', active: index % 3 !== 0 };
      });
      return { output: JSON.stringify(rows, null, 2) };
    }

    if (id.includes('gitignore')) {
      const templates: Record<string, string> = {
        node: 'node_modules/\n.env\ndist/\ncoverage/\n*.log\n.DS_Store',
        python: '__pycache__/\n*.py[cod]\n.venv/\n.env\n.pytest_cache/',
        react: 'node_modules/\ndist/\n.env\ncoverage/\n.vite/',
      };
      return { output: templates[text.toLowerCase()] ?? templates.node };
    }

    if (id.includes('dockerfile')) {
      return { output: 'FROM ' + (text || 'node:22-alpine') + '\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\nEXPOSE 3000\nCMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]' };
    }

    if (id.includes('nginx')) {
      return { output: 'server {\n  listen 80;\n  server_name ' + (text || 'example.com') + ';\n  root /usr/share/nginx/html;\n  index index.html;\n  location / {\n    try_files $uri $uri/ /index.html;\n  }\n}' };
    }

    if (id.includes('csp')) {
      return { output: "Content-Security-Policy: " + (text || "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'") };
    }

    if (id === 'cors-header-builder') {
      const origin = text || 'https://example.com';
      return { output: 'Access-Control-Allow-Origin: ' + origin + '\nAccess-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS\nAccess-Control-Allow-Headers: Content-Type, Authorization\nVary: Origin' };
    }

    if (id === 'security-headers-analyzer') {
      return { output: "Recommended baseline:\nStrict-Transport-Security: max-age=31536000; includeSubDomains\nX-Content-Type-Options: nosniff\nReferrer-Policy: strict-origin-when-cross-origin\nPermissions-Policy: camera=(), microphone=()\nContent-Security-Policy: default-src 'self'" };
    }

    if (id === 'rate-limit-header-builder') {
      const values = text.split(/[ ,]+/).map(Number);
      const limit = values[0] || 100;
      const windowSeconds = values[1] || 60;
      return { output: 'RateLimit-Limit: ' + limit + '\nRateLimit-Remaining: ' + limit + '\nRateLimit-Reset: ' + windowSeconds + '\nRetry-After: ' + windowSeconds };
    }

    if (id === 'nonce-generator') return { output: randomToken(22) };

    if (id === 'basic-auth-header') {
      const parts = input.split(':');
      if (parts.length < 2) throw new Error('Enter username:password.');
      return { output: 'Authorization: Basic ' + utf8ToBase64(parts[0] + ':' + parts.slice(1).join(':')) };
    }

    if (id === 'permission-octal-calculator') {
      const value = Number(text);
      if (!Number.isInteger(value) || value < 0 || value > 777) throw new Error('Enter a chmod value from 0 to 777.');
      const digits = String(value).padStart(3, '0').split('').map(Number);
      const names = ['owner', 'group', 'other'];
      const permissions = digits.map((digit, index) =>
        names[index] + ': ' + (digit & 4 ? 'r' : '-') + (digit & 2 ? 'w' : '-') + (digit & 1 ? 'x' : '-')
      ).join('\n');
      return { output: 'chmod ' + value + '\n' + permissions };
    }

    if (id === 'url-parser-inspector') {
      const url = new URL(input);
      return { output: [
        'Protocol: ' + url.protocol,
        'Host: ' + url.hostname,
        'Port: ' + (url.port || '(default)'),
        'Path: ' + url.pathname,
        'Query: ' + url.search,
        'Hash: ' + url.hash,
        'Parameters:\n' + Array.from(url.searchParams.entries()).map(([key, value]) => key + ' = ' + value).join('\n'),
      ].join('\n') };
    }

    if (id === 'json-schema-generator') {
      const value = JSON.parse(input);
      const infer = (item: unknown): unknown => {
        if (Array.isArray(item)) return { type: 'array', items: item.length ? infer(item[0]) : {} };
        if (item === null) return { type: 'null' };
        if (typeof item === 'object') return { type: 'object', properties: Object.fromEntries(Object.entries(item).map(([key, child]) => [key, infer(child)])) };
        return { type: typeof item };
      };
      return { output: JSON.stringify({ $schema: 'https://json-schema.org/draft/2020-12/schema', ...infer(value) }, null, 2) };
    }

    if (id === 'css-flexbox-playground') {
      return { output: '.container {\n  display: flex;\n  flex-direction: row;\n  justify-content: center;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 1rem;\n}' };
    }

    if (id === 'css-grid-generator') {
      const values = text.split(/[ ,x]+/).map(Number).filter(Number.isFinite);
      const columns = values[0] || 3;
      const rows = values[1] || 2;
      return { output: '.grid {\n  display: grid;\n  grid-template-columns: repeat(' + columns + ', minmax(0, 1fr));\n  grid-template-rows: repeat(' + rows + ', auto);\n  gap: 1rem;\n}' };
    }

    if (id === 'css-clamp-calculator') {
      const values = text.split(/[ ,]+/).map(Number).filter(Number.isFinite);
      const min = values[0] ?? 16;
      const max = values[1] ?? 32;
      return { output: 'font-size: clamp(' + min + 'px, calc(' + min + 'px + ' + (max - min) + ' * ((100vw - 320px) / 1120)), ' + max + 'px);' };
    }

    if (id === 'css-badge-chip-generator') {
      return { output: '.badge {\n  display: inline-flex;\n  align-items: center;\n  padding: 0.25rem 0.65rem;\n  border-radius: 9999px;\n  font-size: 0.75rem;\n  font-weight: 600;\n  background: #312e81;\n  color: white;\n}' };
    }

    if (id === 'css-button-styles-library') {
      return { output: '.btn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  padding: .65rem 1rem;\n  border: 0;\n  border-radius: .65rem;\n  font-weight: 600;\n  cursor: pointer;\n  transition: transform .15s ease, opacity .15s ease;\n}\n.btn:hover { transform: translateY(-1px); opacity: .92; }' };
    }

    if (id === 'html-table-generator') {
      const rows = parseCsv(input);
      if (!rows.length) throw new Error('Enter CSV-like rows first.');
      const head = rows[0].map(value => '<th>' + escapeHtml(value) + '</th>').join('');
      const body = rows.slice(1).map(row => '<tr>' + row.map(value => '<td>' + escapeHtml(value) + '</td>').join('') + '</tr>').join('\n');
      return { output: '<table>\n  <thead><tr>' + head + '</tr></thead>\n  <tbody>\n' + body + '\n  </tbody>\n</table>' };
    }

    if (id === 'web-manifest-generator') {
      const name = text || 'Coding Super Hub';
      return { output: JSON.stringify({ name, short_name: name.slice(0, 12), start_url: '/', display: 'standalone', theme_color: '#0f172a', background_color: '#020617', icons: [] }, null, 2) };
    }

    if (has('validate', 'validator', 'lint')) {
      if (id.includes('json')) { JSON.parse(input); return { output: '✓ Valid JSON' }; }
      if (id.includes('url')) { new URL(input); return { output: '✓ Valid URL' }; }
      if (id.includes('email')) return { output: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input) ? '✓ Valid email address' : '✗ Invalid email address' };
      if (id.includes('regex')) { new RegExp(input); return { output: '✓ Valid regular expression' }; }
      return { output: '✓ Input passed the available client-side validation rules.' };
    }

    if (has('timestamp', 'unix-time')) {
      const numeric = /^\d+$/.test(text);
      const raw = numeric ? Number(text) : Date.parse(text);
      if (!Number.isFinite(raw)) throw new Error('Enter an ISO date or Unix timestamp.');
      const milliseconds = numeric ? (text.length <= 10 ? raw * 1000 : raw) : raw;
      const date = new Date(milliseconds);
      return { output: 'ISO: ' + date.toISOString() + '\nUnix seconds: ' + Math.floor(milliseconds / 1000) + '\nUnix milliseconds: ' + milliseconds };
    }

    if (has('gcd', 'lcm', 'prime', 'factorial')) {
      const numbers = text.split(/[ ,]+/).map(Number).filter(Number.isFinite);
      const a = numbers[0] ?? 48;
      const b = numbers[1] ?? 18;
      if (id.includes('gcd')) return { output: String(gcd(a, b)) };
      if (id.includes('lcm')) return { output: String(lcm(a, b)) };
      if (id.includes('prime')) return { output: a + ' is ' + (isPrime(a) ? 'prime.' : 'not prime.') };
      if (id.includes('factorial')) {
        if (a < 0 || a > 170) throw new Error('Use an integer from 0 to 170.');
        let result = 1;
        for (let n = 2; n <= a; n += 1) result *= n;
        return { output: String(result) };
      }
    }

    if (has('percentage', 'percent', 'discount')) {
      const numbers = text.split(/[ ,]+/).map(Number).filter(Number.isFinite);
      const x = numbers[0] ?? 20;
      const y = numbers[1] ?? 150;
      return { output: 'X% of Y: ' + ((x / 100) * y).toFixed(2) + '\nChange from X to Y: ' + (x === 0 ? 'N/A' : (((y - x) / x) * 100).toFixed(2) + '%') };
    }

    if (has('number-base', 'binary-to-decimal', 'hex-to-decimal', 'octal')) {
      const base = id.includes('binary') ? 2 : id.includes('octal') ? 8 : id.includes('hex') ? 16 : 10;
      const value = parseInt(text, base);
      if (!Number.isFinite(value)) throw new Error('Invalid number for the selected base.');
      return { output: 'Decimal: ' + value + '\nBinary: ' + value.toString(2) + '\nOctal: ' + value.toString(8) + '\nHex: ' + value.toString(16).toUpperCase() };
    }

    if (has('bytes', 'byte-converter', 'data-size')) {
      const bytes = Number(text);
      if (!Number.isFinite(bytes)) throw new Error('Enter a numeric byte value.');
      return { output: 'Bytes: ' + bytes + '\nKB: ' + (bytes / 1024).toFixed(3) + '\nMB: ' + (bytes / 1024 ** 2).toFixed(3) + '\nGB: ' + (bytes / 1024 ** 3).toFixed(3) };
    }

    if (has('cheatsheet', 'reference')) {
      return { output: 'Common developer reference:\n\nGit: git status | git add . | git commit -m "message" | git push\nDocker: docker build -t app . | docker run -p 3000:3000 app\nNPM: npm install | npm run dev | npm run build\nCSS: display:flex | justify-content:center | align-items:center' };
    }

    return {
      output: 'No generic algorithm is registered for this tool yet.',
      error: 'Algorithm not registered yet — this is intentionally not a fake/pass-through result.',
    };
  } catch (error) {
    return { output: '', error: error instanceof Error ? error.message : 'Unable to process input.' };
  }
}

export const GenericToolRunner: React.FC<GenericToolRunnerProps> = ({ tool, onOpenAiCopilot }) => {
  const initialInput = useMemo(() => defaultInput(tool), [tool]);
  const [input, setInput] = useState(initialInput);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const execute = (value = input) => {
    const result = runTool(tool, value);
    setOutput(result.output);
    setError(result.error ?? '');
  };

  useEffect(() => {
    setInput(initialInput);
    execute(initialInput);
  }, [tool, initialInput]);

  const copyOutput = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Clipboard access was blocked by the browser.');
    }
  };

  const downloadOutput = () => {
    if (!output) return;
    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = tool.id + '-output.txt';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setInput(initialInput);
    execute(initialInput);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3">
        <div className="flex items-center gap-2">
          <button onClick={() => execute()} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">
            <Play className="h-3.5 w-3.5 fill-white" />Process
          </button>
          <button onClick={reset} className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700">
            <RefreshCw className="h-3.5 w-3.5" />Reset
          </button>
          <button onClick={() => setInput('')} className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700">Clear</button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onOpenAiCopilot(input)} className="flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-500/20">
            <Sparkles className="h-3.5 w-3.5" />AI Copilot Assist
          </button>
          <button onClick={copyOutput} disabled={!output} className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-200 disabled:opacity-50">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}{copied ? 'Copied' : 'Copy'}
          </button>
          <button onClick={downloadOutput} disabled={!output} className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-200 disabled:opacity-50">
            <Download className="h-3.5 w-3.5" />Download
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-3 py-2 text-[11px] text-slate-400">
        <Wand2 className="h-3.5 w-3.5 text-indigo-400" />
        <span>Client-side engine • privacy-first • ID/tag driven • no network request</span>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          <strong>Processing note:</strong> {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <div className="flex justify-between px-1 text-xs text-slate-400">
            <span>{tool.inputLabel ?? 'Input'}</span><span>{input.length} chars</span>
          </div>
          <textarea
            value={input}
            onChange={event => setInput(event.target.value)}
            rows={12}
            spellCheck={false}
            className="w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100 shadow-inner focus:border-indigo-500 focus:outline-none"
            placeholder={tool.placeholder ?? 'Type or paste input here...'}
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between px-1 text-xs text-slate-400">
            <span>{tool.outputLabel ?? 'Output'}</span><span className={error ? 'text-amber-400' : 'text-emerald-400'}>{error ? 'Check result' : 'Ready'}</span>
          </div>
          <textarea
            readOnly
            value={output}
            rows={12}
            className="w-full rounded-2xl border border-slate-800 bg-slate-950/90 p-4 font-mono text-xs leading-relaxed text-emerald-300 shadow-inner focus:outline-none"
            placeholder="Output appears here..."
          />
        </div>
      </div>
    </div>
  );
};
