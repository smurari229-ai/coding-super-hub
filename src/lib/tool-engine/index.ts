import type { ToolItem } from '../../types/tools';

export type ToolEngineResult = { output: string; error?: string };

const MORSE: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.',
  H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.',
  O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-',
  V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.'
};

const has = (tool: ToolItem, ...terms: string[]) => {
  const values = [tool.id, tool.name, tool.description, ...tool.tags].map(v => v.toLowerCase());
  return terms.some(term => values.some(v => v.includes(term.toLowerCase())));
};

const words = (value: string) => value.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

export const slugify = (value: string) => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

export const caseWords = (value: string) => value
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .replace(/[_\-.\/]+/g, ' ')
  .trim()
  .split(/\s+/)
  .filter(Boolean);

export const encodeBase64Utf8 = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

export const decodeBase64Utf8 = (value: string) => {
  const binary = atob(value.trim());
  return new TextDecoder().decode(Uint8Array.from(binary, char => char.charCodeAt(0)));
};

export const encodeHex = (value: string) =>
  Array.from(new TextEncoder().encode(value), byte => byte.toString(16).padStart(2, '0')).join(' ');

export const decodeHex = (value: string) => {
  const clean = value.replace(/0x/gi, '').replace(/\s+/g, '');
  if (!clean || !/^[0-9a-f]+$/i.test(clean) || clean.length % 2) {
    throw new Error('Enter valid hexadecimal bytes.');
  }
  return new TextDecoder().decode(Uint8Array.from(clean.match(/../g)!, pair => parseInt(pair, 16)));
};

export const encodeBinary = (value: string) =>
  Array.from(new TextEncoder().encode(value), byte => byte.toString(2).padStart(8, '0')).join(' ');

export const decodeBinary = (value: string) => {
  const groups = value.trim().split(/\s+/);
  if (!groups.length || groups.some(group => !/^[01]{8}$/.test(group))) {
    throw new Error('Binary input must use 8-bit groups separated by spaces.');
  }
  return new TextDecoder().decode(Uint8Array.from(groups, group => parseInt(group, 2)));
};

export const encodeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char] ?? char));

export const decodeHtml = (value: string) => value.replace(
  /&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|#39);/gi,
  (_, code: string) => {
    if (code === 'amp') return '&';
    if (code === 'lt') return '<';
    if (code === 'gt') return '>';
    if (code === 'quot') return '"';
    if (code === 'apos' || code === '#39') return "'";
    const number = code.toLowerCase().startsWith('#x')
      ? parseInt(code.slice(2), 16)
      : parseInt(code.slice(1), 10);
    return Number.isFinite(number) ? String.fromCodePoint(number) : _;
  }
);

const caesar = (value: string, shift: number) => value.replace(/[A-Za-z]/g, char => {
  const base = char <= 'Z' ? 65 : 97;
  return String.fromCharCode((char.charCodeAt(0) - base + shift + 260) % 26 + base);
});

const parseCsv = (value: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    const next = value[i + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
        continue;
      }
      if (char === '"') {
        quoted = false;
        continue;
      }
      cell += char;
      continue;
    }

    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ',') {
      row.push(cell);
      cell = '';
      continue;
    }
    if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    if (char !== '\r') cell += char;
  }

  if (quoted) throw new Error('Malformed CSV: unterminated quote.');
  if (cell || row.length || value.endsWith(',')) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter(item => item.some(Boolean));
};

const jsonToCsv = (value: string) => {
  const data = JSON.parse(value);
  if (!Array.isArray(data) || !data.length || data.some(item => !item || typeof item !== 'object' || Array.isArray(item))) {
    throw new Error('Input must be a non-empty JSON array of objects.');
  }
  const headers = Array.from(new Set(data.flatMap(item => Object.keys(item as object))));
  const quote = (item: unknown) => {
    const text = item == null ? '' : String(item);
    return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  };
  return [
    headers.join(','),
    ...data.map(item => headers.map(key => quote((item as Record<string, unknown>)[key])).join(','))
  ].join('\n');
};

const csvToJson = (value: string) => {
  const rows = parseCsv(value);
  if (rows.length < 2) throw new Error('CSV needs a header row and at least one data row.');
  const headers = rows[0].map(item => item.trim());
  if (headers.some(header => !header) || new Set(headers).size !== headers.length) {
    throw new Error('CSV headers must be non-empty and unique.');
  }
  return JSON.stringify(
    rows.slice(1).map(row => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? '']))),
    null,
    2
  );
};

const numberBase = (value: string, base: number) => {
  if (!/^[+-]?[0-9a-z]+$/i.test(value.trim())) {
    throw new Error('Enter a valid integer for the selected base.');
  }
  const number = parseInt(value.trim(), base);
  if (!Number.isSafeInteger(number)) throw new Error('Number is outside the safe integer range.');
  return [
    'Decimal: ' + number,
    'Binary: ' + number.toString(2),
    'Octal: ' + number.toString(8),
    'Hex: ' + number.toString(16).toUpperCase()
  ].join('\n');
};

const uuid = () => crypto.randomUUID();

const randomToken = (length: number) => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('');
};

const defaultInput = (tool: ToolItem) => {
  if (tool.defaultInput) return tool.defaultInput;
  if (has(tool, 'json')) return '{\n  "name": "Coding Super Hub",\n  "active": true\n}';
  if (has(tool, 'url')) return 'https://example.com/search?q=hello world';
  if (has(tool, 'base64', 'hex', 'binary')) return 'Hello, Coding Super Hub!';
  if (has(tool, 'timestamp', 'unix')) return '2026-09-28T12:00:00.000Z';
  if (has(tool, 'slug', 'case')) return 'Build Production Ready Developer Tools';
  if (has(tool, 'password', 'random', 'uuid')) return '24';
  return 'The quick brown fox jumps over the lazy dog. 1234567890!';
};

type Handler = (tool: ToolItem, input: string) => string | null;

const handlers: Handler[] = [
  (tool, input) => {
    if (!(tool.id === 'text-statistics' || has(tool, 'text statistics', 'word counter'))) return null;
    const list = words(input);
    return [
      'Characters: ' + input.length,
      'Characters (no spaces): ' + input.replace(/\s/g, '').length,
      'Words: ' + list.length,
      'Lines: ' + input.split(/\r?\n/).length,
      'Sentences: ' + (input.match(/[.!?]+(?=\s|$)/g)?.length ?? 0),
      'UTF-8 bytes: ' + new TextEncoder().encode(input).length,
      'Reading time: ~' + Math.max(1, Math.ceil(list.length / 200)) + ' min'
    ].join('\n');
  },
  (tool, input) => {
    if (!(tool.id === 'word-frequency-analyzer' || has(tool, 'word frequency'))) return null;
    const counts: Record<string, number> = {};
    words(input).forEach(word => { counts[word] = (counts[word] ?? 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([word, count]) => word + ' : ' + count).join('\n');
  },
  (tool, input) => has(tool, 'duplicate line', 'dedupe', 'unique')
    ? Array.from(new Set(input.split(/\r?\n/))).join('\n') : null,
  (tool, input) => has(tool, 'sorter', 'line sort', 'alphabetical')
    ? input.split(/\r?\n/).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).join('\n') : null,
  (tool, input) => has(tool, 'reverse')
    ? input.split('').reverse().join('') : null,
  (tool, input) => has(tool, 'trim', 'whitespace')
    ? input.split(/\r?\n/).map(item => item.trim().replace(/[ \t]+/g, ' ')).filter(Boolean).join('\n') : null,
  (tool, input) => has(tool, 'remove empty')
    ? input.split(/\r?\n/).filter(item => item.trim()).join('\n') : null,
  (tool, input) => has(tool, 'slugifier', 'url slug')
    ? slugify(input) : null,
  (tool, input) => {
    if (!has(tool, 'rot13', 'caesar')) return null;
    const match = input.match(/(?:shift|shift=)\s*(-?\d+)/i);
    return caesar(input, match ? Number(match[1]) : 13);
  },
  (tool, input) => {
    if (!has(tool, 'morse')) return null;
    const reverse = Object.fromEntries(Object.entries(MORSE).map(([key, code]) => [code, key]));
    const decode = has(tool, 'decode') || /(?:^|\s)[.-]{1,5}(?:\s|$)/.test(input);
    return decode
      ? input.trim().split(/\s+|\/+/).map(code => reverse[code] ?? code).join('')
      : input.toUpperCase().split('').map(char => char === ' ' ? '/' : MORSE[char] ?? char).join(' ');
  },
  (tool, input) => {
    if (!has(tool, 'pad align', 'padder')) return null;
    const width = Math.max(...input.split(/\r?\n/).map(item => item.length));
    return input.split(/\r?\n/).map(item => item.padEnd(width)).join('\n');
  },
  (tool, input) => {
    if (!has(tool, 'prefix suffix')) return null;
    const parts = input.split(/\r?\n/);
    const prefix = parts[0] ?? '';
    const suffix = parts[1] ?? '';
    const source = parts.slice(2).join('\n');
    return source.split(/\r?\n/).map(line => prefix + line + suffix).join('\n');
  },
  (tool, input) => has(tool, 'newline')
    ? input.replace(/\r\n/g, '\n').replace(/\n/g, /crlf/i.test(input) ? '\r\n' : '\n') : null,
  (tool, input) => has(tool, 'base64')
    ? (has(tool, 'decode') ? decodeBase64Utf8(input) : encodeBase64Utf8(input)) : null,
  (tool, input) => has(tool, 'url encoder', 'url component')
    ? (has(tool, 'decode') ? decodeURIComponent(input) : encodeURIComponent(input)) : null,
  (tool, input) => has(tool, 'html entit')
    ? (has(tool, 'decode', 'unescape') ? decodeHtml(input) : encodeHtml(input)) : null,
  (tool, input) => has(tool, 'hex to string', 'hexadecimal')
    ? (has(tool, 'encode') ? encodeHex(input) : decodeHex(input)) : null,
  (tool, input) => has(tool, 'binary to text')
    ? (has(tool, 'encode') ? encodeBinary(input) : decodeBinary(input)) : null,
  (tool, input) => has(tool, 'json minif')
    ? JSON.stringify(JSON.parse(input)) : null,
  (tool, input) => has(tool, 'json format', 'json validator')
    ? JSON.stringify(JSON.parse(input), null, 2) : null,
  (tool, input) => tool.id === 'json-to-csv' ? jsonToCsv(input) : null,
  (tool, input) => tool.id === 'csv-to-json' ? csvToJson(input) : null,
  (tool, input) => {
    if (!has(tool, 'json to typescript', 'json to ts')) return null;
    const data = JSON.parse(input);
    if (!data || Array.isArray(data) || typeof data !== 'object') {
      throw new Error('Root JSON value must be an object.');
    }
    const fields = Object.entries(data as Record<string, unknown>).map(([key, item]) => {
      const safeKey = /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
      const type = item === null ? 'null' : Array.isArray(item) ? 'unknown[]' : typeof item;
      return '  ' + safeKey + ': ' + type + ';';
    });
    return 'export interface Root {\n' + fields.join('\n') + '\n}';
  },
  (tool, input) => {
    if (!has(tool, 'number base', 'binary to decimal', 'hex to decimal', 'octal')) return null;
    const base = tool.id.includes('binary') ? 2 : tool.id.includes('octal') ? 8 : tool.id.includes('hex') ? 16 : 10;
    return numberBase(input, base);
  },
  (tool, input) => {
    if (!has(tool, 'timestamp', 'unix time')) return null;
    const numeric = /^\d+$/.test(input);
    const raw = numeric ? Number(input) : Date.parse(input);
    if (!Number.isFinite(raw)) throw new Error('Enter an ISO date or Unix timestamp.');
    const milliseconds = numeric && input.length <= 10 ? raw * 1000 : raw;
    const date = new Date(milliseconds);
    if (Number.isNaN(date.getTime())) throw new Error('Invalid timestamp.');
    return [
      'ISO: ' + date.toISOString(),
      'Unix seconds: ' + Math.floor(milliseconds / 1000),
      'Unix milliseconds: ' + milliseconds
    ].join('\n');
  },
  (tool, input) => has(tool, 'uuid')
    ? Array.from({ length: Math.min(100, Math.max(1, Number(input) || 1)) }, uuid).join('\n') : null,
  (tool, input) => has(tool, 'random string', 'nanoid', 'cuid', 'token')
    ? randomToken(Math.min(256, Math.max(4, Number(input) || 24))) : null,
  (tool, input) => {
    if (!has(tool, 'lorem')) return null;
    const seed = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';
    return Array(Math.min(20, Math.max(1, Number(input) || 3))).fill(seed).join(' ');
  },
  (tool) => tool.id === 'fake-data-generator' ? JSON.stringify(
    Array.from({ length: 10 }, (_, index) => {
      const first = ['Aarav', 'Maya', 'Rohan', 'Anika', 'Kabir', 'Sara'];
      const last = ['Sharma', 'Patel', 'Singh', 'Mehta', 'Khan', 'Iyer'];
      const name = first[index % first.length] + ' ' + last[(index + 2) % last.length];
      return { id: index + 1, name, email: name.toLowerCase().replace(/ /g, '.') + '@example.com' };
    }), null, 2) : null,
  (tool, input) => {
    if (!has(tool, 'percentage', 'discount')) return null;
    const numbers = input.split(/[ ,]+/).map(Number);
    const a = numbers[0] ?? 20;
    const b = numbers[1] ?? 150;
    return 'X% of Y: ' + ((a / 100) * b).toFixed(2) + '\nChange from X to Y: ' +
      (a === 0 ? 'N/A' : (((b - a) / a) * 100).toFixed(2) + '%');
  },
  (tool, input) => {
    if (!has(tool, 'gcd', 'lcm', 'prime', 'factorial')) return null;
    const numbers = input.split(/[ ,]+/).map(Number);
    const a = Math.trunc(numbers[0] ?? 48);
    const b = Math.trunc(numbers[1] ?? 18);
    const gcd = (x: number, y: number) => {
      x = Math.abs(x); y = Math.abs(y);
      while (y) [x, y] = [y, x % y];
      return x;
    };
    if (tool.id.includes('gcd')) return String(gcd(a, b));
    if (tool.id.includes('lcm')) return String(a === 0 || b === 0 ? 0 : Math.abs(a * b) / gcd(a, b));
    if (tool.id.includes('prime')) {
      if (a < 2) return a + ' is not prime.';
      for (let i = 2; i * i <= a; i += 1) if (a % i === 0) return a + ' is not prime.';
      return a + ' is prime.';
    }
    if (tool.id.includes('factorial')) {
      if (a < 0 || a > 170) throw new Error('Enter an integer from 0 to 170.');
      let result = 1;
      for (let i = 2; i <= a; i += 1) result *= i;
      return String(result);
    }
    return null;
  },
  (tool, input) => {
    if (!has(tool, 'gitignore')) return null;
    const templates: Record<string, string> = {
      node: 'node_modules/\n.env\ndist/\ncoverage/\n*.log',
      python: '__pycache__/\n*.py[cod]\n.venv/\n.env',
      react: 'node_modules/\ndist/\n.env\ncoverage/'
    };
    return templates[input.toLowerCase()] ?? templates.node;
  },
  (tool, input) => has(tool, 'dockerfile')
    ? 'FROM ' + (input || 'node:22-alpine') + '\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\nEXPOSE 3000\nCMD ["npm","run","preview","--","--host","0.0.0.0"]' : null,
  (tool, input) => has(tool, 'nginx')
    ? 'server {\n  listen 80;\n  server_name ' + (input || 'example.com') + ';\n  root /usr/share/nginx/html;\n  index index.html;\n  location / { try_files $uri $uri/ /index.html; }\n}' : null
];

export function executeTool(tool: ToolItem, input: string): ToolEngineResult {
  try {
    if (input.length > 20_000) return { output: '', error: 'Input exceeds the 20,000 character safety limit.' };
    if (!input.trim() && !has(tool, 'generator', 'generate', 'random', 'uuid', 'lorem', 'password')) {
      return { output: '', error: 'Enter some input first.' };
    }

    for (const handler of handlers) {
      const output = handler(tool, input);
      if (output !== null) return { output };
    }

    return { output: '', error: 'Coming soon — this catalog entry does not have a verified execution algorithm yet.' };
  } catch (error) {
    return { output: '', error: error instanceof Error ? error.message : 'Unable to process input.' };
  }
}

export { defaultInput };
