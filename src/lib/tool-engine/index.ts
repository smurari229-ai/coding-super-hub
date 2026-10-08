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
  if (tool.id === 'speed-distance-time') return '100 2';
  if (has(tool, 'json')) return '{\n  "name": "Coding Super Hub",\n  "active": true\n}';
  if (has(tool, 'url')) return 'https://example.com/search?q=hello world';
  if (has(tool, 'base64', 'hex', 'binary')) return 'Hello, Coding Super Hub!';
  if (has(tool, 'timestamp', 'unix')) return '2026-09-28T12:00:00.000Z';
  if (has(tool, 'slug', 'case')) return 'Build Production Ready Developer Tools';
  if (has(tool, 'password', 'random', 'uuid')) return '24';
  return 'The quick brown fox jumps over the lazy dog. 1234567890!';
};



const yamlScalar = (value: string): unknown => {
  const v = value.trim();
  if (!v) return null;
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null' || v === '~') return null;
  if (/^-?\d+(?:\.\d+)?$/.test(v)) return Number(v);
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
  if (v.startsWith('[') || v.startsWith('{')) {
    try { return JSON.parse(v); } catch { return v; }
  }
  return v;
};

const jsonToYaml = (value: string) => {
  const data: unknown = JSON.parse(value);
  const render = (item: unknown, depth: number): string => {
    const pad = '  '.repeat(depth);
    if (Array.isArray(item)) {
      return item.length ? item.map(entry => {
        if (entry && typeof entry === 'object') {
          return pad + '-\n' + render(entry, depth + 1);
        }
        return pad + '- ' + yamlText(entry);
      }).join('\n') : pad + '[]';
    }
    if (item && typeof item === 'object') {
      const entries = Object.entries(item as Record<string, unknown>);
      if (!entries.length) return pad + '{}';
      return entries.map(([key, entry]) => {
        if (entry && typeof entry === 'object') return pad + key + ':\n' + render(entry, depth + 1);
        return pad + key + ': ' + yamlText(entry);
      }).join('\n');
    }
    return pad + yamlText(item);
  };
  const yamlText = (item: unknown) => {
    if (item === null) return 'null';
    if (typeof item === 'string') return /^[A-Za-z0-9._/-]+$/.test(item) ? item : JSON.stringify(item);
    return String(item);
  };
  return render(data, 0);
};

const yamlToJson = (value: string) => {
  const lines = value.split(/\r?\n/).filter(line => line.trim() && !line.trim().startsWith('#'));
  if (!lines.length) throw new Error('Enter a basic YAML document.');
  const root: Record<string, unknown> = {};
  const stack: Array<{ indent: number; value: Record<string, unknown> }> = [{ indent: -1, value: root }];
  for (const line of lines) {
    const match = line.match(/^(\s*)([-\w.]+):(?:\s*(.*))?$/);
    if (!match) throw new Error('Basic YAML parser supports key: value mappings only.');
    const indent = match[1].length;
    const key = match[2];
    const raw = match[3] ?? '';
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const target = stack[stack.length - 1].value;
    if (raw) target[key] = yamlScalar(raw);
    else {
      const child: Record<string, unknown> = {};
      target[key] = child;
      stack.push({ indent, value: child });
    }
  }
  return JSON.stringify(root, null, 2);
};

const jsonPathExtract = (value: string) => {
  const lines = value.split(/\r?\n/);
  const path = lines.shift()?.trim() ?? '';
  const data: unknown = JSON.parse(lines.join('\n'));
  const tokens = path.replace(/^\$\.?/, '').split(/[.[\]]+/).filter(Boolean);
  let current: unknown = data;
  for (const token of tokens) {
    if (current === null || current === undefined || (typeof current !== 'object' && !Array.isArray(current))) {
      throw new Error('JSON path does not exist.');
    }
    current = (current as Record<string, unknown>)[token];
  }
  return typeof current === 'string' ? current : JSON.stringify(current, null, 2);
};

const sqlInsertFromJson = (value: string) => {
  const data: unknown = JSON.parse(value);
  if (!Array.isArray(data) || !data.length || data.some(item => !item || typeof item !== 'object' || Array.isArray(item))) {
    throw new Error('Input must be a non-empty JSON array of objects.');
  }
  const rows = data as Array<Record<string, unknown>>;
  const columns = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  const sqlValue = (item: unknown) => {
    if (item === null || item === undefined) return 'NULL';
    if (typeof item === 'boolean') return item ? 'TRUE' : 'FALSE';
    if (typeof item === 'number') return Number.isFinite(item) ? String(item) : 'NULL';
    return "'" + String(item).replace(/'/g, "''") + "'";
  };
  return 'INSERT INTO table_name (' + columns.join(', ') + ') VALUES\n' +
    rows.map(row => '  (' + columns.map(column => sqlValue(row[column])).join(', ') + ')').join(',\n') + ';';
};

const passwordStrength = (value: string) => {
  const score = [value.length >= 12, /[a-z]/.test(value), /[A-Z]/.test(value), /\d/.test(value), /[^A-Za-z0-9]/.test(value)].filter(Boolean).length;
  const label = score <= 1 ? 'Very weak' : score === 2 ? 'Weak' : score === 3 ? 'Fair' : score === 4 ? 'Strong' : 'Very strong';
  return ['Length: ' + value.length, 'Score: ' + score + '/5', 'Rating: ' + label,
    'Entropy estimate: ~' + Math.round(value.length * Math.log2(Math.max(1, new Set(value).size))) + ' bits'].join('\n');
};

const chmodCalculator = (value: string) => {
  const raw = value.trim().replace(/^chmod\s+/, '');
  const numeric = /^([0-7]{3,4})$/.test(raw) ? raw.slice(-3) : '';
  const symbolic = numeric ? numeric : raw;
  if (!/^[0-7]{3}$/.test(symbolic)) throw new Error('Enter a three-digit chmod value such as 755.');
  const labels = ['---','--x','-w-','-wx','r--','r-x','rw-','rwx'];
  const parts = symbolic.split('').map((digit, index) => {
    const mode = labels[Number(digit)];
    return ['Owner','Group','Others'][index] + ': ' + mode + ' (' + digit + ')';
  });
  return parts.join('\n') + '\nCommand: chmod ' + symbolic + ' path';
};

const contrastRatio = (foreground: string, background: string) => {
  const hex = (input: string) => {
    const clean = input.trim().replace(/^#/, '');
    const expanded = clean.length === 3 ? clean.split('').map(ch => ch + ch).join('') : clean;
    if (!/^[0-9a-f]{6}$/i.test(expanded)) throw new Error('Use two six-digit hex colors, e.g. #111111 #ffffff.');
    return [0,2,4].map(i => parseInt(expanded.slice(i, i+2),16)/255);
  };
  const lum = (rgb: number[]) => rgb.map(v => v <= 0.03928 ? v/12.92 : ((v+0.055)/1.055)**2.4)
    .reduce((a,v,i)=>a+v*[0.2126,0.7152,0.0722][i],0);
  const ratio = (Math.max(lum(hex(foreground)),lum(hex(background))) + 0.05) /
    (Math.min(lum(hex(foreground)),lum(hex(background))) + 0.05);
  return 'Contrast ratio: ' + ratio.toFixed(2) + ':1\nWCAG AA normal text: ' + (ratio >= 4.5 ? 'PASS' : 'FAIL') +
    '\nWCAG AA large text: ' + (ratio >= 3 ? 'PASS' : 'FAIL');
};

const minifyCss = (value: string) => value
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s+/g, ' ')
  .replace(/\s*([{}:;,>])\s*/g, '$1')
  .replace(/;}/g, '}').trim();

const clampCalculator = (value: string) => {
  const nums = value.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (nums.length < 3) throw new Error('Enter min, preferred, and max font sizes in px, e.g. 16 3 32.');
  const [min, preferred, max] = nums;
  const slope = preferred / 100;
  const intercept = min - slope * 16;
  return 'CSS: clamp(' + min + 'px, ' + slope.toFixed(4) + 'vw + ' + intercept.toFixed(2) + 'px, ' + max + 'px)';
};

const curlToFetch = (value: string) => {
  const match = value.match(/curl\s+(?:(?:-X|--request)\s+([A-Z]+)\s+)?["']?([^"'\s]+)["']?/i);
  if (!match) throw new Error('Enter a basic cURL command with a URL.');
  const method = match[1] ?? 'GET';
  const url = match[2];
  const headers = Array.from(value.matchAll(/(?:-H|--header)\s+["']([^"']+)["']/gi))
    .map(item => item[1].split(/:\s*/,2)).filter(item => item.length === 2);
  const bodyMatch = value.match(/(?:-d|--data|--data-raw)\s+["']([^"']*)["']/i);
  const lines = ["fetch('" + url + "', {", "  method: '" + method + "',"];
  if (headers.length) lines.push("  headers: " + JSON.stringify(Object.fromEntries(headers)) + ',');
  if (bodyMatch) lines.push("  body: " + JSON.stringify(bodyMatch[1]) + ',');
  lines.push('});');
  return lines.join('\n');
};

const cidrInfo = (value: string) => {
  const match = value.trim().match(/^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/);
  if (!match) throw new Error('Enter an IPv4 CIDR such as 192.168.1.0/24.');
  const ip = match[1].split('.').map(Number);
  const prefix = Number(match[2]);
  if (ip.some(n => n > 255) || prefix > 32) throw new Error('Invalid IPv4 CIDR.');
  const mask = prefix === 0 ? 0 : (0xffffffff << (32-prefix)) >>> 0;
  const ipNum = (((ip[0]<<24)>>>0) + (ip[1]<<16) + (ip[2]<<8) + ip[3]) >>> 0;
  const network = (ipNum & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const toIp = (n:number) => [n>>>24,(n>>>16)&255,(n>>>8)&255,n&255].join('.');
  const total = 2 ** (32-prefix);
  return ['Network: '+toIp(network),'Broadcast: '+toIp(broadcast),'Mask: '+toIp(mask),'Addresses: '+total,
    'Usable hosts: '+(prefix >= 31 ? total : Math.max(0,total-2))].join('\n');
};

const convertUnits = (value: string, kind: 'bytes'|'length'|'temp') => {
  const nums = value.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (!nums.length) throw new Error('Enter a numeric value.');
  const n = nums[0];
  if (kind === 'bytes') return ['Bytes: '+n,'KB: '+(n/1024).toFixed(4),'MB: '+(n/1024**2).toFixed(4),'GB: '+(n/1024**3).toFixed(6)].join('\n');
  if (kind === 'length') return ['Meters: '+n,'Centimeters: '+(n*100).toFixed(4),'Feet: '+(n*3.280839895).toFixed(4),'Inches: '+(n*39.37007874).toFixed(4)].join('\n');
  return ['Celsius: '+n,'Fahrenheit: '+(n*9/5+32).toFixed(2),'Kelvin: '+(n+273.15).toFixed(2)].join('\n');
};

const percentageVariants = (value: string) => {
  const n = value.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (n.length < 2) throw new Error('Enter two numbers, e.g. 20 150.');
  const [a,b]=n;
  return ['X% of Y: '+(a*b/100).toFixed(2),'X is '+(b === 0 ? 'N/A' : (a/b*100).toFixed(2)+'% of Y'),
    'Percentage change X→Y: '+(a === 0 ? 'N/A' : ((b-a)/Math.abs(a)*100).toFixed(2)+'%'),
    'Y minus X: '+(b-a).toFixed(2)].join('\n');
};

const bitwiseOps = (value: string) => {
  const n = value.match(/-?\d+/g)?.map(Number) ?? [];
  if (n.length < 2) throw new Error('Enter two integers, e.g. 12 5.');
  const [a,b]=n.map(Math.trunc);
  return ['AND (&): '+(a&b),'OR (|): '+(a|b),'XOR (^): '+(a^b),'NOT (~a): '+(~a),
    'Left shift (a<<b): '+(a<<b),'Right shift (a>>b): '+(a>>b)].join('\n');
};

type Handler = (tool: ToolItem, input: string) => string | null;


const roiBatch8: Handler = (tool, input) => {
  const nums = input.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const requireNums = (count: number, message: string) => {
    if (nums.length < count || nums.slice(0, count).some(value => !Number.isFinite(value))) throw new Error(message);
  };
  switch (tool.id) {
    case 'duplicate-line-remover': {
      const lines = input.split(/\r?\n/).filter(Boolean);
      if (!lines.length) throw new Error('Enter at least one line.');
      return Array.from(new Set(lines)).join('\n');
    }
    case 'text-line-sorter': {
      const lines = input.split(/\r?\n/).filter(Boolean);
      if (!lines.length) throw new Error('Enter at least one line.');
      return lines.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).join('\n');
    }
    case 'text-reverser':
      if (!input) throw new Error('Enter text to reverse.');
      return input.split(/\r?\n/).reverse().map(line => Array.from(line).reverse().join('')).join('\n');
    case 'string-trimmer':
      return input.split(/\r?\n/).map(line => line.trim().replace(/\s+/g, ' ')).filter(Boolean).join('\n');
    case 'string-pad-align': {
      const width = Math.max(1, Math.min(200, Math.trunc(nums[0] ?? 20)));
      const lines = input.split(/\r?\n/).slice(0, 500);
      if (!lines.length) throw new Error('Enter lines to align.');
      return lines.map(line => line.padEnd(width)).join('\n');
    }
    case 'text-prefix-suffix': {
      const lines = input.split(/\r?\n/);
      if (lines.length < 3) throw new Error('Use three lines: prefix, suffix, then text.');
      const [prefix, suffix, ...body] = lines;
      return body.join('\n').split(/\r?\n/).map(line => prefix + line + suffix).join('\n');
    }
    case 'remove-empty-lines':
      return input.split(/\r?\n/).filter(line => line.trim()).join('\n');
    case 'newline-converter': {
      const mode = input.split(/\r?\n/, 1)[0].trim().toLowerCase();
      const body = input.slice(input.indexOf('\n') + 1);
      if (!['lf', 'crlf'].includes(mode)) throw new Error('First line must be LF or CRLF; remaining lines are the text.');
      return body.replace(/\r?\n/g, mode === 'crlf' ? '\r\n' : '\n');
    }
    case 'camel-to-title':
      return caseWords(input).map(word => word[0]?.toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    case 'snake-to-camel': {
      const parts = input.trim().split(/[_\s-]+/).filter(Boolean).map(part => part.toLowerCase());
      if (!parts.length) throw new Error('Enter a snake_case identifier.');
      return parts[0] + parts.slice(1).map(part => part[0].toUpperCase() + part.slice(1)).join('');
    }
    case 'string-find-replace': {
      const lines = input.split(/\r?\n/);
      if (lines.length < 3) throw new Error('Use three lines: search, replacement, then text.');
      const search = lines[0];
      if (!search) throw new Error('Search text cannot be empty.');
      return lines.slice(2).join('\n').split(search).join(lines[1]);
    }
    case 'text-statistics': {
      const ws = words(input);
      const chars = Array.from(input).length;
      const sentences = input.split(/[.!?]+/).filter(Boolean).length;
      const paragraphs = input.split(/\n\s*\n/).filter(p => p.trim()).length;
      return ['Characters: ' + chars, 'Words: ' + ws.length, 'Sentences: ' + sentences, 'Paragraphs: ' + paragraphs,
        'Reading time (~200 wpm): ' + Math.max(1, Math.ceil(ws.length / 200)) + ' min'].join('\n');
    }
    case 'slug-to-text':
      return input.trim().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
    case 'strip-diacritics':
      return input.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
    case 'pluralize-singularize': {
      const word = input.trim();
      if (!word) throw new Error('Enter an English noun.');
      const lower = word.toLowerCase();
      const plural = /[^aeiou]y$/i.test(lower) ? lower.slice(0, -1) + 'ies'
        : /(s|x|z|ch|sh)$/i.test(lower) ? lower + 'es' : lower + 's';
      const singular = /ies$/i.test(lower) ? lower.slice(0, -3) + 'y'
        : /(?:ches|shes|xes|zes|ses)$/i.test(lower) ? lower.slice(0, -2) : lower.replace(/s$/i, '');
      return 'Plural: ' + plural + '\nSingular: ' + singular;
    }
    case 'json-key-sorter': {
      const data = JSON.parse(input);
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Input must be a JSON object.');
      const sortObject = (value: unknown): unknown => Array.isArray(value) ? value.map(sortObject)
        : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, sortObject(v)]))
        : value;
      return JSON.stringify(sortObject(data), null, 2);
    }
    case 'percentage-calculator': {
      requireNums(2, 'Enter two numbers, e.g. 20 150.');
      const [a, b] = nums;
      if (b === 0) throw new Error('Second value cannot be zero for percentage-of calculation.');
      return ['X% of Y: ' + (a * b / 100), 'X is ' + (a / b * 100) + '% of Y', 'Change X→Y: ' + (a === 0 ? 'undefined' : ((b - a) / Math.abs(a) * 100) + '%')].join('\n');
    }
    case 'discount-calculator': {
      requireNums(2, 'Enter original price and discount percentage.');
      const [price, discount] = nums;
      if (price < 0 || discount < 0 || discount > 100) throw new Error('Use a non-negative price and a discount from 0 to 100%.');
      const saved = price * discount / 100;
      return 'Savings: ' + saved.toFixed(2) + '\nSale price: ' + (price - saved).toFixed(2);
    }
    case 'gcd-lcm-calculator': {
      requireNums(2, 'Enter two integers.');
      const a = Math.trunc(nums[0]), b = Math.trunc(nums[1]);
      const gcd = (x: number, y: number): number => { x = Math.abs(x); y = Math.abs(y); while (y) [x, y] = [y, x % y]; return x; };
      const g = gcd(a, b);
      return 'GCD: ' + g + '\nLCM: ' + (g ? Math.abs(a * b) / g : 0);
    }
    case 'prime-number-checker': {
      requireNums(1, 'Enter an integer.');
      const n = Math.trunc(nums[0]);
      if (n < 2) return n + ' is not prime.';
      for (let i = 2; i * i <= n; i++) if (n % i === 0) return n + ' is not prime. Factor: ' + i;
      return n + ' is prime.';
    }
    case 'factorial-calculator': {
      requireNums(1, 'Enter a non-negative integer.');
      const n = Math.trunc(nums[0]);
      if (n < 0 || n > 170) throw new Error('Enter an integer from 0 to 170.');
      let value = 1; for (let i = 2; i <= n; i++) value *= i;
      return n + '! = ' + value;
    }
    case 'fibonacci-sequence': {
      requireNums(1, 'Enter a sequence length.');
      const count = Math.trunc(nums[0]);
      if (count < 1 || count > 100) throw new Error('Enter a sequence length from 1 to 100.');
      const seq: number[] = []; let a = 0, b = 1;
      for (let i = 0; i < count; i++) { seq.push(a); [a, b] = [b, a + b]; }
      return seq.join(', ');
    }
    case 'unit-converter-temperature': {
      requireNums(1, 'Enter a temperature.');
      const c = nums[0];
      return ['Celsius: ' + c, 'Fahrenheit: ' + (c * 9 / 5 + 32), 'Kelvin: ' + (c + 273.15)].join('\n');
    }
    case 'bitwise-operations-calc': {
      requireNums(2, 'Enter two integers.');
      const a = Math.trunc(nums[0]), b = Math.trunc(nums[1]);
      return ['AND: ' + (a & b), 'OR: ' + (a | b), 'XOR: ' + (a ^ b), 'NOT A: ' + (~a), 'A<<B: ' + (a << b), 'A>>B: ' + (a >> b)].join('\n');
    }
    case 'emi-loan-calculator': {
      requireNums(3, 'Enter principal, annual interest %, and months.');
      const [p, rate, months] = nums;
      if (p <= 0 || rate < 0 || months <= 0) throw new Error('Principal and months must be positive; interest cannot be negative.');
      const r = rate / 1200;
      const payment = r === 0 ? p / months : p * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
      return 'Monthly EMI: ' + payment.toFixed(2) + '\nTotal payment: ' + (payment * months).toFixed(2);
    }
    case 'mixed-number-calculator': {
      requireNums(3, 'Enter whole number, numerator, denominator.');
      const whole = Math.trunc(nums[0]), numerator = Math.trunc(nums[1]), denominator = Math.trunc(nums[2]);
      if (denominator === 0 || numerator < 0) throw new Error('Denominator must be non-zero and numerator non-negative.');
      return 'Improper fraction: ' + (whole * denominator + numerator) + '/' + denominator;
    }
    case 'bitwise-not-inverter': {
      requireNums(1, 'Enter an integer.');
      const n = Math.trunc(nums[0]);
      return 'NOT: ' + (~n) + '\nUnsigned 32-bit: ' + (~n >>> 0);
    }
    case 'cookie-flags-generator': {
      const name = input.trim() || 'session';
      return name + '=VALUE; Path=/; Secure; HttpOnly; SameSite=Lax';
    }
    case 'basic-auth-header': {
      const lines = input.split(/\r?\n/);
      if (lines.length < 2 || !lines[0] || !lines[1]) throw new Error('Use username on line 1 and password on line 2.');
      return 'Authorization: Basic ' + encodeBase64Utf8(lines[0] + ':' + lines[1]);
    }
    case 'bearer-token-generator': {
      requireNums(1, 'Enter token length.');
      const length = Math.trunc(nums[0]);
      if (length < 16 || length > 256) throw new Error('Token length must be between 16 and 256.');
      return 'Bearer ' + randomToken(length);
    }
    case 'random-hex-salt': {
      requireNums(1, 'Enter byte length.');
      const length = Math.trunc(nums[0]);
      if (length < 8 || length > 128) throw new Error('Byte length must be between 8 and 128.');
      const bytes = new Uint8Array(length); crypto.getRandomValues(bytes);
      return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    case 'dmarc-record-builder': {
      const domain = input.trim();
      if (!domain || !/^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(domain)) throw new Error('Enter a valid domain such as example.com.');
      return 'Host: _dmarc.' + domain + '\nTXT: v=DMARC1; p=none; rua=mailto:dmarc@' + domain;
    }
    case 'security-txt-generator': {
      const contact = input.trim();
      if (!/^https?:\/\//i.test(contact)) throw new Error('Enter a security contact URL, e.g. https://example.com/security.');
      return 'Contact: ' + contact + '\nExpires: ' + new Date(Date.now() + 31536000000).toISOString() + '\nPreferred-Languages: en';
    }
    case 'rate-limit-header-builder': {
      requireNums(2, 'Enter limit and window seconds.');
      const limit = Math.trunc(nums[0]), windowSeconds = Math.trunc(nums[1]);
      if (limit <= 0 || windowSeconds <= 0) throw new Error('Limit and window must be positive.');
      return 'RateLimit-Limit: ' + limit + '\nRateLimit-Window: ' + windowSeconds;
    }
    case 'nonce-generator': {
      requireNums(1, 'Enter nonce length.');
      const length = Math.trunc(nums[0]);
      if (length < 16 || length > 128) throw new Error('Nonce length must be between 16 and 128.');
      return 'nonce-' + randomToken(length);
    }
    case 'html-boilerplate-generator':
      return '<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>' + (input.trim() || 'Document') + '</title>\n</head>\n<body>\n  <main></main>\n</body>\n</html>';
    case 'html-table-generator': {
      const rows = parseCsv(input);
      if (!rows.length) throw new Error('Enter CSV rows.');
      const esc = (v: string) => encodeHtml(v);
      return '<table>\n<thead><tr>' + rows[0].map(v => '<th>' + esc(v) + '</th>').join('') + '</tr></thead>\n<tbody>\n' +
        rows.slice(1).map(row => '<tr>' + row.map(v => '<td>' + esc(v) + '</td>').join('') + '</tr>').join('\n') + '\n</tbody>\n</table>';
    }
    case 'html-form-builder':
      return '<form method="post" action="/submit">\n  <label for="email">Email</label>\n  <input id="email" name="email" type="email" required>\n  <button type="submit">Submit</button>\n</form>';
    case 'robots-txt-generator': {
      const path = input.trim() || '/private/';
      return 'User-agent: *\nDisallow: ' + path + '\nAllow: /';
    }
    case 'xml-sitemap-generator': {
      const urls = input.split(/\r?\n/).map(v => v.trim()).filter(Boolean);
      if (!urls.length) throw new Error('Enter at least one absolute URL.');
      if (urls.some(url => !/^https?:\/\//i.test(url))) throw new Error('Every sitemap URL must start with http:// or https://.');
      return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        urls.map(url => '  <url><loc>' + encodeHtml(url) + '</loc></url>').join('\n') + '\n</urlset>';
    }
    case 'web-manifest-generator': {
      const name = input.trim() || 'Coding Super Hub';
      return JSON.stringify({ name, short_name: name.slice(0, 12), start_url: '/', display: 'standalone', theme_color: '#111827', background_color: '#ffffff' }, null, 2);
    }
    case 'css-triangle-generator': {
      const size = Math.max(1, Math.min(500, Math.trunc(nums[0] ?? 40)));
      const color = /^#?[0-9a-f]{3,8}$/i.test((input.split(/\s+/)[1] ?? '')) ? input.split(/\s+/)[1] : '#333';
      return '.triangle {\n  width: 0; height: 0;\n  border-left: ' + size / 2 + 'px solid transparent;\n  border-right: ' + size / 2 + 'px solid transparent;\n  border-bottom: ' + size + 'px solid ' + color + ';\n}';
    }
    case 'css-ribbon-banner':
      return '.ribbon { position: relative; display: inline-block; padding: 0.4rem 1rem; background: #111827; color: #fff; transform: rotate(-3deg); }';
    case 'css-scrollbar-customizer':
      return '::-webkit-scrollbar { width: 10px; }\n::-webkit-scrollbar-thumb { background: #888; border-radius: 5px; }\n* { scrollbar-width: thin; }';
    case 'user-agent-parser': {
      const ua = input.trim();
      if (!ua) throw new Error('Enter a User-Agent string.');
      return ['Mobile: ' + (/mobile|android|iphone|ipad/i.test(ua) ? 'yes' : 'no'), 'Browser: ' + (/edg/i.test(ua) ? 'Edge' : /chrome/i.test(ua) ? 'Chrome' : /firefox/i.test(ua) ? 'Firefox' : /safari/i.test(ua) ? 'Safari' : 'Unknown'), 'OS: ' + (/windows/i.test(ua) ? 'Windows' : /android/i.test(ua) ? 'Android' : /iphone|ipad/i.test(ua) ? 'iOS' : /mac os/i.test(ua) ? 'macOS' : /linux/i.test(ua) ? 'Linux' : 'Unknown')].join('\n');
    }
    case 'screen-viewport-tester': {
      requireNums(2, 'Enter viewport width and height.');
      return 'Viewport: ' + Math.trunc(nums[0]) + ' × ' + Math.trunc(nums[1]) + '\nAspect ratio: ' + (nums[0] / nums[1]).toFixed(3);
    }
    case 'git-bisect-guide':
      return 'git bisect start\ngit bisect bad\ngit bisect good <known-good-commit>\n# test the midpoint\ngit bisect good|bad\ngit bisect reset';
    case 'docker-ignore-generator':
      return 'node_modules\n.git\n.gitignore\n.env\ncoverage\ndist\n*.log\n.DS_Store';
    case 'cloudflare-page-rules-guide':
      return 'Cache-Control: public, max-age=3600\nBrowser Cache TTL: respect existing headers\nBypass cache for: /api/*\nUse explicit cache keys for dynamic variants.';
    case 'system-info-commands':
      return 'uname -a\nlscpu\nfree -h\ndf -h\nlsblk\nip addr\nuptime';
    case 'rest-naming-conventions':
      return 'Use nouns for resources: /users, /orders/123\nUse HTTP verbs for intent: GET, POST, PATCH, DELETE\nPrefer plural resource names and consistent nesting.\nAvoid verbs such as /getUsers in resource URLs.';
    case 'netstat-ss-commands':
      return 'ss -tulpn\nss -lntp\nss -s\nnetstat -tulpn';
    case 'sftp-vs-ftps-guide':
      return 'SFTP: SSH-based file transfer, usually one encrypted connection.\nFTPS: FTP secured with TLS, separate control/data channels.\nSCP: SSH-based secure copy for simple transfers.';
    case 'git-hook-pre-commit':
      return '#!/bin/sh\nset -e\nnpm run lint\nnpm test\nnpm run build';
    case 'env-example-generator': {
      const keys = Array.from(new Set(input.split(/\r?\n/).map(line => line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=/)?.[1]).filter(Boolean)));
      if (!keys.length) throw new Error('Enter KEY=value lines to generate a sanitized .env.example.');
      return keys.map(key => key + '=').join('\n');
    }
    case 'redis-command-cheatsheet':
      return 'SET key value\nGET key\nDEL key\nEXPIRE key 3600\nTTL key\nHSET user:1 name Murari\nHGETALL user:1\nSCAN 0';
    case 'memcached-vs-redis':
      return 'Redis: rich data structures, persistence, streams, scripting.\nMemcached: simple volatile key/value cache, low overhead.\nChoose based on persistence, data types, and operational requirements.';
    case 'kafka-topic-config':
      return 'Topic: events\npartitions=3\nreplication.factor=3\nretention.ms=604800000\ncleanup.policy=delete';
    case 'rabbitmq-queue-config':
      return 'Exchange: app.events\nType: topic\nQueue: app.worker\nBinding key: events.#\nDurable: true';
    case 'whois-lookup-reference':
      return 'WHOIS/RDAP checks domain registration metadata. Prefer RDAP for structured JSON and modern registry access.\nExample: query the authoritative RDAP endpoint for the TLD.';
    case 'traceroute-visual-guide':
      return 'Linux/macOS: traceroute example.com\nWindows: tracert example.com\nMTR: mtr example.com\nInterpret hops, latency, packet loss, and where loss begins.';
    case 'ip-range-expander': {
      const match = input.trim().match(/^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/);
      if (!match) throw new Error('Enter an IPv4 CIDR such as 192.168.1.0/30.');
      const ip = match[1].split('.').map(Number), prefix = Number(match[2]);
      if (ip.some(v => v > 255) || prefix > 32) throw new Error('Invalid IPv4 CIDR.');
      const base = ((((ip[0] << 24) >>> 0) | (ip[1] << 16) | (ip[2] << 8) | ip[3]) >>> 0);
      const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
      const network = (base & mask) >>> 0, count = 2 ** (32 - prefix);
      if (count > 256) throw new Error('Refusing to expand more than 256 addresses.');
      const toIp = (n: number) => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
      return Array.from({ length: count }, (_, i) => toIp((network + i) >>> 0)).join('\n');
    }
    case 'docker-run-to-compose': {
      const match = input.match(/docker\s+run\s+(.*)/i);
      if (!match) throw new Error('Enter a docker run command.');
      const image = match[1].match(/(?:^|\s)([A-Za-z0-9._/-]+)(?=\s|$)/)?.[1];
      if (!image) throw new Error('Could not detect a Docker image.');
      const port = match[1].match(/-p\s+([0-9]+:[0-9]+)/)?.[1];
      return 'services:\n  app:\n    image: ' + image + (port ? '\n    ports:\n      - "' + port + '"' : '') + '\n    restart: unless-stopped';
    }
    case 'readme-badge-generator': {
      const name = input.trim() || 'build';
      return '[![' + name + '](https://img.shields.io/badge/' + encodeURIComponent(name) + '-passing-brightgreen)](.)';
    }
    case 'contributing-md-generator':
      return '# Contributing\n\n1. Fork the repository.\n2. Create a focused branch.\n3. Add tests for behavior changes.\n4. Run lint, tests, and build.\n5. Open a pull request with a clear summary.';
    case 'code-of-conduct-generator':
      return '# Code of Conduct\n\nBe respectful, constructive, and inclusive. Harassment, discrimination, and personal attacks are not acceptable. Maintainers may moderate contributions to keep collaboration safe.';
    case 'security-policy-md-generator':
      return '# Security Policy\n\nPlease report vulnerabilities privately to the project maintainers. Do not publish exploit details before a fix is available. Include affected versions, reproduction steps, and impact.';
    case 'privacy-policy-template':
      return '# Developer Privacy Notice\n\nDescribe what data the application collects, why it is processed, retention, third-party services, security controls, and user rights. Replace this template with project-specific legal text before publication.';
    case 'terms-of-service-template':
      return '# Terms of Service\n\nDefine acceptable use, service availability, intellectual property, payment terms, disclaimers, termination, and governing law. Replace this template with project-specific legal text before publication.';
    case 'invoice-generator-html': {
      const customer = input.trim() || 'Customer';
      return '<!doctype html><html><body><h1>Invoice</h1><p>Bill to: ' + encodeHtml(customer) + '</p><table><tr><th>Description</th><th>Amount</th></tr><tr><td>Development service</td><td>________</td></tr></table></body></html>';
    }
    case 'hourly-rate-calculator': {
      requireNums(2, 'Enter target annual income and annual billable hours.');
      if (nums[1] <= 0) throw new Error('Billable hours must be positive.');
      return 'Suggested hourly rate: ' + (nums[0] / nums[1]).toFixed(2);
    }
    case 'saas-mrr-arr-calculator': {
      requireNums(2, 'Enter active customers and average monthly revenue per customer.');
      if (nums[0] < 0 || nums[1] < 0) throw new Error('Values cannot be negative.');
      const mrr = nums[0] * nums[1];
      return 'MRR: ' + mrr.toFixed(2) + '\nARR: ' + (mrr * 12).toFixed(2);
    }
    case 'cac-ltv-ratio-calc': {
      requireNums(3, 'Enter CAC, average revenue per customer, and gross margin %.');
      if (nums[2] <= 0 || nums[2] > 100) throw new Error('Gross margin must be between 0 and 100%.');
      const ltv = nums[1] / (1 - nums[2] / 100);
      return 'Estimated LTV: ' + ltv.toFixed(2) + '\nLTV:CAC: ' + (ltv / nums[0]).toFixed(2);
    }
    case 'burn-rate-runway-calc': {
      requireNums(3, 'Enter cash balance, monthly expenses, and monthly revenue.');
      const burn = nums[1] - nums[2];
      if (burn <= 0) return 'Net burn: 0\nRunway: not finite while cash flow is non-negative.';
      return 'Net burn: ' + burn.toFixed(2) + '\nRunway: ' + (nums[0] / burn).toFixed(2) + ' months';
    }
    case 'api-pricing-tier-builder': {
      const name = input.trim() || 'Pro';
      return '<table><thead><tr><th>Tier</th><th>Price</th><th>Requests</th></tr></thead><tbody><tr><td>Free</td><td>$0</td><td>1,000/mo</td></tr><tr><td>' + encodeHtml(name) + '</td><td>$9/mo</td><td>50,000/mo</td></tr></tbody></table>';
    }
    case 'sprint-velocity-calculator': {
      requireNums(2, 'Enter completed story points and sprint count.');
      if (nums[1] <= 0) throw new Error('Sprint count must be positive.');
      return 'Average velocity: ' + (nums[0] / nums[1]).toFixed(2) + ' story points/sprint';
    }
    case 'git-alias-collection':
      return '[alias]\nco = checkout\nci = commit\nst = status\nbr = branch\nlg = log --oneline --decorate --graph --all';
    case 'bash-profile-helpers':
      return 'alias ll="ls -la"\nalias gs="git status"\nmkcd() { mkdir -p "$1" && cd "$1"; }\nextract() { tar -xf "$1"; }';
    case 'system-font-stack-picker':
      return 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif\nui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace\nGeorgia, Cambria, "Times New Roman", serif';
    default:
      return null;
  }
};

const baseHandlers: Handler[] = [roiBatch8,
  (tool, input) => {
    if (!has(tool, 'case converter', 'camel case', 'snake case', 'pascal case', 'kebab case')) return null;
    const wordsList = caseWords(input).map(word => word.toLowerCase());
    if (has(tool, 'camel')) return wordsList.map((word, i) => i === 0 ? word : word[0].toUpperCase() + word.slice(1)).join('');
    if (has(tool, 'pascal')) return wordsList.map(word => word[0].toUpperCase() + word.slice(1)).join('');
    if (has(tool, 'snake')) return wordsList.join('_');
    return wordsList.join('-');
  },
  (tool, input) => has(tool, 'csv column', 'column extractor') ? (() => {
    const lines = input.split(/\r?\n/);
    const columnName = lines.shift()?.trim();
    if (!columnName) throw new Error('First line must contain the CSV column name.');
    const rows = parseCsv(lines.join('\n'));
    if (rows.length < 2) throw new Error('CSV needs a header row and data.');
    const column = rows[0].findIndex(header => header.trim().toLowerCase() === columnName.toLowerCase());
    if (column < 0) throw new Error('CSV column not found.');
    return rows.slice(1).map(row => row[column] ?? '').join('\n');
  })() : null,
  (tool, input) => has(tool, 'line number', 'line numbering') ? input.split(/\r?\n/).map((line, i) => String(i + 1).padStart(String(input.split(/\r?\n/).length).length, ' ') + ': ' + line).join('\n') : null,
  (tool, input) => has(tool, 'find and replace', 'find & replace', 'text replace') ? (() => {
    const [findValue, replaceValue, ...rest] = input.split(/\r?\n/);
    if (!findValue) throw new Error('First line must contain the text to find.');
    return rest.join('\n').split(findValue).join(replaceValue ?? '');
  })() : null,
  (tool, input) => has(tool, 'extract email') ? (input.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []).join('\n') : null,
  (tool, input) => has(tool, 'extract url', 'url extractor') ? (input.match(/https?:\/\/[^\s<>"']+/gi) ?? []).join('\n') : null,
  (tool, input) => has(tool, 'json yaml', 'json to yaml', 'yaml json', 'yaml to json') ? (has(tool, 'yaml to json') ? yamlToJson(input) : jsonToYaml(input)) : null,
  (tool, input) => has(tool, 'json path') ? jsonPathExtract(input) : null,
  (tool, input) => has(tool, 'sql insert') ? sqlInsertFromJson(input) : null,
  (tool, input) => has(tool, 'password strength', 'password meter') ? passwordStrength(input) : null,
  (tool, input) => has(tool, 'chmod') ? chmodCalculator(input) : null,
  (tool, input) => has(tool, 'csp header', 'content security policy') ? "Content-Security-Policy: default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'" : null,
  (tool, input) => has(tool, 'cors header', 'cors') ? 'Access-Control-Allow-Origin: ' + (input.trim() || '*') + '\nAccess-Control-Allow-Methods: GET,POST,OPTIONS\nAccess-Control-Allow-Headers: Content-Type, Authorization' : null,
  (tool, input) => has(tool, 'css minif') ? minifyCss(input) : null,
  (tool, input) => has(tool, 'clamp', 'fluid type') ? clampCalculator(input) : null,
  (tool, input) => has(tool, 'contrast', 'wcag') ? (() => {
    const colors = input.match(/#[0-9a-f]{3,8}/gi) ?? [];
    return contrastRatio(colors[0] ?? '#000000', colors[1] ?? '#ffffff');
  })() : null,
  (tool, input) => has(tool, 'curl', 'fetch converter') ? curlToFetch(input) : null,
  (tool, input) => has(tool, 'subnet', 'cidr') ? cidrInfo(input) : null,
  (tool, input) => has(tool, 'byte converter', 'bytes converter') ? convertUnits(input, 'bytes') : null,
  (tool, input) => has(tool, 'length converter') ? convertUnits(input, 'length') : null,
  (tool, input) => has(tool, 'temperature converter', 'temp converter') ? convertUnits(input, 'temp') : null,
  (tool, input) => has(tool, 'percentage') ? percentageVariants(input) : null,
  (tool, input) => has(tool, 'bitwise') ? bitwiseOps(input) : null,
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
    const explicit = input.trim().match(/^(2|8|10|16)\s*[:=,\s]\s*(.+)$/);
    const base = explicit ? Number(explicit[1]) : tool.id.includes('binary') ? 2 : tool.id.includes('octal') ? 8 : tool.id.includes('hex') ? 16 : 10;
    return numberBase(explicit ? explicit[2] : input, base);
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


const roiTextBatch1: Handler = (tool, input) => {
  const lines = input.split(/\r?\n/);
  switch (tool.id) {
    case 'string-wrapper': {
      const width = Math.max(10, Math.min(200, Number(lines[0]) || 80));
      const source = lines.slice(1).join('\n') || input;
      return source.split(/\r?\n/).flatMap(line => {
        const out: string[] = [];
        let rest = line;
        while (rest.length > width) {
          let cut = rest.lastIndexOf(' ', width);
          if (cut < 1) cut = width;
          out.push(rest.slice(0, cut).trim());
          rest = rest.slice(cut).trimStart();
        }
        out.push(rest);
        return out;
      }).join('\n');
    }
    case 'string-truncate': {
      const max = Math.max(1, Math.min(10000, Number(lines[0]) || 80));
      const source = lines.slice(1).join('\n') || input;
      return source.length <= max ? source : source.slice(0, Math.max(0, max - 1)).trimEnd() + '…';
    }
    case 'phonetic-alphabet': {
      const map: Record<string,string> = {A:'Alpha',B:'Bravo',C:'Charlie',D:'Delta',E:'Echo',F:'Foxtrot',G:'Golf',H:'Hotel',I:'India',J:'Juliett',K:'Kilo',L:'Lima',M:'Mike',N:'November',O:'Oscar',P:'Papa',Q:'Quebec',R:'Romeo',S:'Sierra',T:'Tango',U:'Uniform',V:'Victor',W:'Whiskey',X:'X-ray',Y:'Yankee',Z:'Zulu'};
      return input.toUpperCase().split('').map(char => map[char] ?? char).join(' ');
    }
    case 'unicode-character-inspector':
      return Array.from(input).map(char => {
        const code = char.codePointAt(0) ?? 0;
        const bytes = Array.from(new TextEncoder().encode(char), byte => byte.toString(16).padStart(2,'0')).join(' ');
        return char + ' U+' + code.toString(16).toUpperCase().padStart(4,'0') + ' UTF-8=' + bytes;
      }).join('\n');
    case 'count-lines': {
      const all = input.split(/\r?\n/);
      return 'Total lines: ' + all.length + '\nNon-empty lines: ' + all.filter(line => line.trim()).length +
        '\nCharacters: ' + input.length + '\nUTF-8 bytes: ' + new TextEncoder().encode(input).length;
    }
    case 'string-splitter': {
      const separator = lines[0] || ',';
      return JSON.stringify((lines.slice(1).join('\n') || input).split(separator));
    }
    case 'string-joiner': {
      const separator = lines[0] || ', ';
      return lines.slice(1).join('\n').split(/\r?\n/).filter(Boolean).join(separator);
    }
    case 'remove-html-tags':
      return input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    case 'space-to-tab':
      return input.replace(/^( +)/gm, match => '\t'.repeat(Math.floor(match.length / 4)) + ' '.repeat(match.length % 4));
    case 'tab-to-space':
      return input.replace(/\t/g, '    ');
    default:
      return null;
  }
};


const roiBatch2: Handler = (tool, input) => {
  const n = input.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  switch (tool.id) {
    case 'strip-diacritics': return input.normalize('NFKD').replace(/[\u0300-\u036f]/g,'');
    case 'repeat-string': {
      const lines=input.split(/\r?\n/); const count=Math.max(1,Math.min(1000,Number(lines[0])||2));
      return Array(count).fill(lines.slice(1).join('\n')||input).join('\n');
    }
    case 'case-sentence': return input.toLowerCase().replace(/(^|[.!?]\s+)[a-z]/g,m=>m.toUpperCase());
    case 'slug-to-text': return input.replace(/[-_]+/g,' ').replace(/\s+/g,' ').trim().replace(/\b\w/g,c=>c.toUpperCase());
    case 'data-size-converter': {
      const v=n[0]; if(!Number.isFinite(v)) throw new Error('Enter a numeric byte value.');
      return 'Bytes: '+v+'\nKiB: '+v/1024+'\nMiB: '+v/1024**2+'\nGiB: '+v/1024**3;
    }
    case 'roman-numerals-converter': {
      const value=input.trim(); const num=Number(value);
      if(Number.isInteger(num)&&num>=1&&num<=3999){const table:[[number,string]]|any=[[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];let x=num,out='';for(const [v,s] of table){while(x>=v){out+=s;x-=v;}}return out;}
      const map:Record<string,number>={I:1,V:5,X:10,L:50,C:100,D:500,M:1000};let total=0,prev=0;for(const ch of value.toUpperCase().split('').reverse()){const v=map[ch];if(!v)throw new Error('Invalid Roman numeral.');total+=v<prev?-v:v;prev=Math.max(prev,v);}return String(total);
    }
    case 'scientific-notation-converter': {const value=Number(input.trim());if(!Number.isFinite(value))throw new Error('Enter a valid number.');return 'Scientific: '+value.toExponential()+'\nStandard: '+value;}
    case 'duration-humanizer': {const ms=n[0];if(!Number.isFinite(ms)||ms<0)throw new Error('Enter non-negative milliseconds.');let s=Math.floor(ms/1000),d=Math.floor(s/86400);s%=86400;const h=Math.floor(s/3600);s%=3600;const m=Math.floor(s/60);s%=60;return d+'d '+h+'h '+m+'m '+s+'s';}
    case 'human-time-to-ms': {const m=input.match(/(?:(\d+(?:\.\d+)?)d)?\s*(?:(\d+(?:\.\d+)?)h)?\s*(?:(\d+(?:\.\d+)?)m)?\s*(?:(\d+(?:\.\d+)?)s)?/i);if(!m||!m[0].trim())throw new Error('Use values like 2d 3h 4m 5s.');return String((Number(m[1]||0)*86400+Number(m[2]||0)*3600+Number(m[3]||0)*60+Number(m[4]||0))*1000);}
    case 'calendar-week-number': {const d=new Date(input.trim());if(Number.isNaN(d.getTime()))throw new Error('Invalid date.');const x=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()));const day=x.getUTCDay()||7;x.setUTCDate(x.getUTCDate()+4-day);const start=new Date(Date.UTC(x.getUTCFullYear(),0,1));return 'ISO week: '+Math.ceil((((x.getTime()-start.getTime())/86400000)+1)/7);}
    case 'unit-converter-length': return convertUnits(input,'length');
    case 'unit-converter-weight': {const v=n[0];if(!Number.isFinite(v))throw new Error('Enter kilograms.');return 'Kilograms: '+v+'\nGrams: '+v*1000+'\nPounds: '+v*2.2046226218+'\nOunces: '+v*35.27396195;}
    case 'simple-interest-calculator': {if(n.length<3)throw new Error('Enter principal, annual rate %, and years.');const interest=n[0]*n[1]*n[2]/100;return 'Interest: '+interest+'\nTotal: '+(n[0]+interest);}
    case 'average-mean-median-mode': {if(!n.length)throw new Error('Enter numbers.');const s=[...n].sort((a,b)=>a-b),mean=n.reduce((a,b)=>a+b,0)/n.length,mid=Math.floor(s.length/2);const freq=new Map<number,number>();n.forEach(v=>freq.set(v,(freq.get(v)||0)+1));const max=Math.max(...freq.values());return 'Mean: '+mean+'\nMedian: '+(s.length%2?s[mid]:(s[mid-1]+s[mid])/2)+'\nMode: '+[...freq].filter(x=>x[1]===max).map(x=>x[0]).join(', ')+'\nRange: '+(s[s.length-1]-s[0]);}
    case 'standard-deviation-calc': {if(!n.length)throw new Error('Enter numbers.');const mean=n.reduce((a,b)=>a+b,0)/n.length;const variance=n.reduce((a,b)=>a+(b-mean)**2,0)/n.length;return 'Variance: '+variance+'\nStandard deviation: '+Math.sqrt(variance);}
    case 'pythagorean-theorem-calc': {if(n.length<2)throw new Error('Enter two side lengths.');return 'Hypotenuse: '+Math.hypot(n[0],n[1]);}
    case 'circle-area-perimeter': {const r=n[0];if(!(r>=0))throw new Error('Enter radius.');return 'Area: '+Math.PI*r*r+'\nCircumference: '+2*Math.PI*r+'\nDiameter: '+2*r;}
    case 'sphere-volume-surface': {const r=n[0];if(!(r>=0))throw new Error('Enter radius.');return 'Volume: '+4*Math.PI*r**3/3+'\nSurface area: '+4*Math.PI*r*r;}
    case 'cylinder-volume-surface': {if(n.length<2)throw new Error('Enter radius and height.');const [r,h]=n;return 'Volume: '+Math.PI*r*r*h+'\nSurface area: '+2*Math.PI*r*(r+h);}
    case 'radian-degree-converter': {const v=n[0];if(!Number.isFinite(v))throw new Error('Enter an angle.');return 'Degrees: '+v*180/Math.PI+'\nRadians: '+v*Math.PI/180;}
    default:return null;
  }
};


const roiBatch3: Handler = (tool, input) => {
  const nums=input.match(/-?\d+(?:\.\d+)?/g)?.map(Number)??[];
  const lines=input.split(/\r?\n/);
  switch(tool.id){
    case 'ipv6-expander-compressor': {
      const v=input.trim(), p=v.split('::'); if(p.length>2) throw new Error('Invalid IPv6.');
      const left=p[0]?p[0].split(':'):[], right=p[1]?p[1].split(':'):[], fill=8-left.length-right.length;
      if(fill<0) throw new Error('Invalid IPv6.');
      return [...left,...Array(fill).fill('0'),...right].map(x=>x.padStart(4,'0')).join(':');
    }
    case 'mac-address-formatter': { const c=input.replace(/[^0-9a-f]/gi,''); if(c.length!==12) throw new Error('Enter a 12-hex-digit MAC address.'); return c.match(/../g)!.join(':').toUpperCase(); }
    case 'git-commit-msg-helper': return 'feat: '+input.trim()+'\n\nUse fix/docs/refactor/test/chore when that better matches the change.';
    case 'semver-calculator': { const m=input.trim().match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/); if(!m) throw new Error('Enter a valid SemVer such as 1.2.3.'); return 'major='+m[1]+'\nminor='+m[2]+'\npatch='+m[3]+'\nprerelease='+(m[4]||'none')+'\nbuild='+(m[5]||'none'); }
    case 'bandwidth-calculator': { if(nums.length<2) throw new Error('Enter size in bytes and bandwidth in Mbps.'); const seconds=nums[0]*8/(nums[1]*1e6); return 'Seconds: '+seconds+'\nMinutes: '+seconds/60; }
    case 'uptime-sla-calculator': { const p=nums[0]??99.9; if(p<0||p>100) throw new Error('SLA must be between 0 and 100.'); return 'Allowed downtime/year: '+((100-p)/100*525600).toFixed(2)+' minutes'; }
    case 'ssl-expiration-calc': { const d=new Date(input.trim()); if(Number.isNaN(d.getTime())) throw new Error('Enter an expiry date.'); return 'Days remaining: '+Math.ceil((d.getTime()-Date.now())/86400000); }
    case 'kill-process-port-helper': { const port=Math.trunc(nums[0]??3000); return 'Linux/macOS: lsof -i :'+port+' then kill <PID>\nWindows: netstat -ano | findstr :'+port+' then taskkill /PID <PID> /F'; }
    case 'favicon-html-tags': return '<link rel="icon" href="/favicon.ico" sizes="any">\n<link rel="icon" type="image/svg+xml" href="/icon.svg">\n<link rel="apple-touch-icon" href="/apple-touch-icon.png">';
    case 'px-to-rem-converter': { const px=nums[0]; const base=nums[1]??16; if(!Number.isFinite(px)) throw new Error('Enter pixels.'); return 'rem: '+px/base+'\nem: '+px/base; }
    case 'rem-to-px-converter': { const rem=nums[0],base=nums[1]??16; if(!Number.isFinite(rem)) throw new Error('Enter rem.'); return 'px: '+rem*base; }
    case 'pt-to-px-converter': { if(!Number.isFinite(nums[0])) throw new Error('Enter points.'); return 'px: '+nums[0]*96/72; }
    case 'css-gradient-builder': { const a=lines[0]||'#000000',b=lines[1]||'#ffffff',angle=lines[2]||'90deg'; return 'background: linear-gradient('+angle+', '+a+', '+b+');'; }
    case 'svg-to-data-uri': return 'data:image/svg+xml,'+encodeURIComponent(input.trim());
    case 'js-minifier-basic': return input.replace(/\/\/.*$/gm,'').replace(/\/\*[\s\S]*?\*\//g,'').replace(/\s+/g,' ').replace(/\s*([{}();,:])\s*/g,'$1').trim();
    case 'css-specificity-calculator': { const s=input.trim(); const ids=(s.match(/#[A-Za-z0-9_-]+/g)||[]).length; const cls=(s.match(/\.[A-Za-z0-9_-]+|\[[^\]]+\]|:[A-Za-z-]+/g)||[]).length; const els=(s.match(/(^|[\s>+~])([A-Za-z][\w-]*)/g)||[]).length; return 'Specificity: '+ids+'-'+cls+'-'+els; }
    case 'html-picture-srcset-maker': { const src=lines[0]||'image.jpg',srcset=lines[1]||src; return '<picture>\n  <img src="'+src+'" srcset="'+srcset+'" alt="">\n</picture>'; }
    case 'tailwind-to-css': return '/* Review generated utility mapping manually */\n'+input.split(/\s+/).map(x=>'.'+x.replace(/[^a-zA-Z0-9_-]/g,'')+' { /* '+x+' */ }').join('\n');
    case 'css-aspect-ratio-boxes': { const ratio=lines[0]||'16 / 9'; return '.aspect-box { aspect-ratio: '+ratio+'; overflow: hidden; }'; }
    case 'css-scroll-snap-builder': return '.scroll-container { display:flex; overflow-x:auto; scroll-snap-type:x mandatory; gap:1rem; }\n.scroll-item { scroll-snap-align:start; flex:0 0 80%; }';
    case 'css-toggle-switch': return '<label class="switch"><input type="checkbox"><span class="slider"></span></label>\n.switch{display:inline-block}.slider{display:block;width:3rem;height:1.5rem;border-radius:999px;background:#888}.switch input{display:none}';
    case 'css-progress-bar': return '<div class="progress" role="progressbar" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100"><span></span></div>\n.progress{height:.5rem;background:#ddd}.progress span{display:block;width:50%;height:100%;background:#2563eb}';
    default:return null;
  }
};


const roiBatch4: Handler = (tool, input) => {
  const n=input.match(/-?\d+(?:\.\d+)?/g)?.map(Number)??[];
  const lines=input.split(/\r?\n/);
  switch(tool.id){
    case 'levenshtein-distance-calc': {const a=lines[0]??'',b=lines[1]??'',dp=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let prev=dp[0];dp[0]=i;for(let j=1;j<=b.length;j++){const old=dp[j];dp[j]=Math.min(dp[j]+1,dp[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=old;}}return String(dp[b.length]);}
    case 'hamming-distance-calc': {if(lines.length<2||lines[0].length!==lines[1].length)throw new Error('Enter two strings of equal length.');return String([...lines[0]].reduce((x,c,i)=>x+(c!==lines[1][i]?1:0),0));}
    case 'jaccard-similarity-calc': {const a=new Set((lines[0]??'').toLowerCase().split(/\W+/).filter(Boolean)),b=new Set((lines[1]??'').toLowerCase().split(/\W+/).filter(Boolean));const inter=[...a].filter(x=>b.has(x)).length,uni=new Set([...a,...b]).size;return 'Jaccard: '+(uni?inter/uni:1);}
    case 'euclidean-distance-2d': {if(n.length<4)throw new Error('Enter x1 y1 x2 y2.');return String(Math.hypot(n[2]-n[0],n[3]-n[1]));}
    case 'manhattan-distance-calc': {if(n.length<4)throw new Error('Enter x1 y1 x2 y2.');return String(Math.abs(n[2]-n[0])+Math.abs(n[3]-n[1]));}
    case 'logarithm-calculator': {if(n.length<2||n[0]<=0||n[1]<=0||n[1]===1)throw new Error('Enter positive number and valid base.');return String(Math.log(n[0])/Math.log(n[1]));}
    case 'modulo-arithmetic-calc': {if(n.length<2||n[1]===0)throw new Error('Enter a number and non-zero modulus.');return String(((n[0]%n[1])+n[1])%n[1]);}
    case 'fraction-simplifier-calc': {if(n.length<2||n[1]===0)throw new Error('Enter numerator and non-zero denominator.');let a=Math.trunc(n[0]),b=Math.trunc(n[1]);const g=(x:number,y:number)=>{x=Math.abs(x);y=Math.abs(y);while(y)[x,y]=[y,x%y];return x};const d=g(a,b);return (a/d)+'/'+(b/d)+' = '+a/b;}
    case 'ratio-proportion-calculator': {if(n.length<3||n[1]===0)throw new Error('Enter A B C for A:B=C:X.');return 'X: '+n[2]*n[0]/n[1];}
    case 'trigonometry-sin-cos-tan': {if(!Number.isFinite(n[0]))throw new Error('Enter an angle in degrees.');const r=n[0]*Math.PI/180;return 'sin: '+Math.sin(r)+'\ncos: '+Math.cos(r)+'\ntan: '+Math.tan(r);}
    case 'hyperbolic-functions-calc': {const x=n[0];if(!Number.isFinite(x))throw new Error('Enter a number.');return 'sinh: '+Math.sinh(x)+'\ncosh: '+Math.cosh(x)+'\ntanh: '+Math.tanh(x);}
    case 'aspect-ratio-scale-calc': {if(n.length<3||n[1]===0)throw new Error('Enter width height targetWidth.');return 'Scaled height: '+n[2]*n[0]/n[1];}
    case 'speed-distance-time': {
      const labeled: Record<string, number> = {};
      for (const line of input.split(/\r?\n/)) {
        const match = line.match(/^\s*(distance|speed|time)\s*[:=]\s*(-?\d+(?:\.\d+)?)\s*$/i);
        if (match) labeled[match[1].toLowerCase()] = Number(match[2]);
      }
      if (Object.keys(labeled).length >= 2) {
        const distance = labeled.distance;
        const speed = labeled.speed;
        const time = labeled.time;
        if (distance !== undefined && speed !== undefined) {
          if (speed === 0) throw new Error('Speed must be non-zero to calculate time.');
          return 'Distance: '+distance+'\nSpeed: '+speed+'\nTime: '+distance/speed;
        }
        if (distance !== undefined && time !== undefined) {
          if (time === 0) throw new Error('Time must be non-zero to calculate speed.');
          return 'Distance: '+distance+'\nTime: '+time+'\nSpeed: '+distance/time;
        }
        if (speed !== undefined && time !== undefined) {
          return 'Speed: '+speed+'\nTime: '+time+'\nDistance: '+speed*time;
        }
      }
      if (n.length === 2) {
        if (n[1] === 0) throw new Error('Time must be non-zero. Input is interpreted as distance then time.');
        return 'Distance: '+n[0]+'\nTime: '+n[1]+'\nSpeed: '+n[0]/n[1];
      }
      throw new Error('Enter two values as distance then time, or label two values as distance=, speed=, or time=.');
    }
    case 'http-status-explorer': return '200 OK\n201 Created\n204 No Content\n301/302 Redirect\n400 Bad Request\n401 Unauthorized\n403 Forbidden\n404 Not Found\n409 Conflict\n422 Unprocessable Content\n429 Too Many Requests\n500 Internal Server Error\n502 Bad Gateway\n503 Service Unavailable';
    case 'port-numbers-database': return '20/21 FTP\n22 SSH\n25 SMTP\n53 DNS\n80 HTTP\n110 POP3\n143 IMAP\n443 HTTPS\n3306 MySQL\n5432 PostgreSQL\n6379 Redis\n27017 MongoDB';
    case 'git-command-cheatsheet': return 'git status\ngit add .\ngit commit -m "message"\ngit switch -c feature/name\ngit pull --rebase\ngit log --oneline --decorate --graph\ngit diff\ngit stash';
    case 'linux-command-cheatsheet': return 'pwd\nls -la\ncd path\nfind . -name "*.ts"\ngrep -R "text" .\ncat file\nhead -n 20 file\ntail -f file\nchmod 755 file\nps aux';
    case 'ssh-config-builder': {const host=lines[0]||'my-server',hostname=lines[1]||'example.com',user=lines[2]||'ubuntu';return 'Host '+host+'\n  HostName '+hostname+'\n  User '+user+'\n  IdentityFile ~/.ssh/id_ed25519';}
    case 'dockerfile': return 'FROM '+(input.trim()||'node:22-alpine')+'\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\nCMD ["npm","run","preview","--","--host","0.0.0.0"]';
    case 'docker-compose-builder': return 'services:\n  app:\n    build: .\n    ports:\n      - "3000:3000"\n    restart: unless-stopped';
    case 'github-actions-workflow': return 'name: CI\non: [push, pull_request]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 22\n      - run: npm ci\n      - run: npm test\n      - run: npm run build';
    case 'open-api-spec-starter': return 'openapi: 3.0.3\ninfo:\n  title: API\n  version: 1.0.0\npaths:\n  /health:\n    get:\n      responses:\n        "200":\n          description: OK';
    case 'graphql-schema-starter': return 'type Query {\n  health: String!\n}\n\ntype Mutation {\n  noop: Boolean!\n}';
    case 'protobuf-proto3-starter': return 'syntax = "proto3";\n\npackage app;\n\nmessage HealthResponse { string status = 1; }\nservice Health { rpc Check(HealthResponse) returns (HealthResponse); }';
    case 'grpc-service-cheatsheet': return 'gRPC: HTTP/2 + protobuf + strongly typed contracts.\nREST: HTTP semantics + JSON + broad browser/tooling compatibility.\nChoose based on clients, streaming, tooling, and contract needs.';
    case 'git-pre-commit': return '#!/bin/sh\nnpm run lint\nnpm test\n';
    case 's3-bucket-policy-builder': return JSON.stringify({Version:'2012-10-17',Statement:[{Effect:'Allow',Action:['s3:GetObject'],Resource:'arn:aws:s3:::BUCKET/*'}]},null,2);
    case 'clear-site-data-header': return 'Clear-Site-Data: "cache", "cookies", "storage"';
    case 'spf-record-builder': return 'v=spf1 '+(input.trim()||'~all');
    case 'dkim-selector-lookup': return 'selector1._domainkey.example.com\nType: TXT\nValue: v=DKIM1; k=rsa; p=PUBLIC_KEY';
    case 'data-redactor': return input.replace(/(?:api[_-]?key|secret|token|password)\s*[:=]\s*[^\s,;]+/gi,'$1=[REDACTED]').replace(/\b\d{12,19}\b/g,m=>'[REDACTED-'+m.slice(-4)+']');
    case 'hash-collision-explainer': {const bits=Math.max(1,Math.trunc(n[0]??128));return 'Approximate birthday-bound samples: 2^('+bits+'/2) = '+Math.pow(2,bits/2).toExponential(3);}
    default:return null;
  }
};


const roiBatch5: Handler = (tool, input) => {
  const lines=input.split(/\r?\n/);
  const nums=input.match(/-?\d+(?:\.\d+)?/g)?.map(Number)??[];
  switch(tool.id){
    case 'string-masker': return input.replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g,m=>m[0]+'***@'+m.slice(m.indexOf('@')+1)).replace(/\b\d{12,19}\b/g,m=>'************'+m.slice(-4));
    case 'emoji-cleaner': {const emoji=/[\p{Extended_Pictographic}\uFE0F]/gu;return 'Extracted: '+(input.match(emoji)?.join('')??'')+'\nCleaned: '+input.replace(emoji,'');}
    case 'string-interpolator': {let vars:Record<string,unknown>;try{vars=JSON.parse(lines[0]||'{}')}catch{throw new Error('First line must be a JSON object of variables.')}return lines.slice(1).join('\n').replace(/\{\{\s*([^}]+?)\s*\}\}/g,(_,key)=>String(vars[key]??''));}
    case 'number-to-words': {
      const value=Math.trunc(nums[0]??NaN); if(!Number.isFinite(value)||value<0||value>999999999)throw new Error('Enter an integer from 0 to 999,999,999.');
      const ones=['','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'],tens=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
      const small=(x:number):string=>{const a:string[]=[];if(x>=100){a.push(ones[Math.floor(x/100)]+' hundred');x%=100}if(x>=20){a.push(tens[Math.floor(x/10)]);x%=10}if(x)a.push(ones[x]);return a.join(' ')};if(value===0)return 'zero';let x=value,out:string[]=[];if(x>=1000000){out.push(small(Math.floor(x/1000000))+' million');x%=1000000}if(x>=1000){out.push(small(Math.floor(x/1000))+' thousand');x%=1000}if(x)out.push(small(x));return out.join(' ');
    }
    case 'csv-to-markdown': {const rows=parseCsv(input);if(!rows.length)throw new Error('Enter CSV data.');return ['| '+rows[0].join(' | ')+' |','| '+rows[0].map(()=> '---').join(' | ')+' |',...rows.slice(1).map(row=>'| '+row.join(' | ')+' |')].join('\n');}
    case 'iso-8601-builder': {const d=new Date(input.trim());if(Number.isNaN(d.getTime()))throw new Error('Invalid date/time.');return d.toISOString();}
    case 'tsv-to-csv': return parseCsv(input.replace(/\t/g,',')).map(row=>row.map(value=>/[",\n]/.test(value)?'"'+value.replace(/"/g,'""')+'"':value).join(',')).join('\n');
    case 'csv-to-tsv': return parseCsv(input).map(row=>row.join('\t')).join('\n');
    case 'relative-time-calculator': {const d=new Date(input.trim());if(Number.isNaN(d.getTime()))throw new Error('Invalid date.');const diff=d.getTime()-Date.now(),minutes=Math.round(Math.abs(diff)/60000);return diff>=0?'in '+minutes+' minute(s)':' '+minutes+' minute(s) ago';}
    case 'csv-duplicate-remover': {const seen=new Set<string>();return parseCsv(input).filter(row=>{const k=JSON.stringify(row);if(seen.has(k))return false;seen.add(k);return true}).map(row=>row.join(',')).join('\n');}
    case 'excel-date-converter': {const serial=nums[0];if(!Number.isFinite(serial))throw new Error('Enter an Excel serial date.');const d=new Date(Date.UTC(1899,11,30)+serial*86400000);return d.toISOString();}
    case 'regex-cheat-sheet': return 'Anchors: ^ start, $ end\nClasses: \\d digit, \\w word, \\s whitespace\nQuantifiers: * zero+, + one+, ? optional, {n,m} range\nGroups: (...) capture, (?:...) non-capture\nLookaround: (?=...) lookahead, (?!...) negative lookahead';
    case 'escape-sql-string': return input.replace(/\\/g,'\\\\').replace(/'/g,"''");
    case 'text-obfuscator': return Array.from(input).map(ch=>'&#'+ch.codePointAt(0)+';').join('');
    case 'html-to-markdown': return input.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi,(_,level,text)=>'#'.repeat(Number(level))+' '+text+'\n').replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi,'**$1**').replace(/<em[^>]*>([\s\S]*?)<\/em>/gi,'*$1*').replace(/<br\s*\/?>(?=.)/gi,'\n').replace(/<[^>]+>/g,'').trim();
    default:return null;
  }
};


const roiBatch6: Handler = (tool, input) => {
  const n=input.match(/-?\d+(?:\.\d+)?/g)?.map(Number)??[];
  switch(tool.id){
    case 'compound-interest-calc': {if(n.length<3)throw new Error('Enter principal, annual rate %, years.');const [p,r,t]=n;const a=p*Math.pow(1+r/100,t);return 'Final amount: '+a+'\nInterest earned: '+(a-p);}
    case 'bmi-calculator': {if(n.length<2||n[1]<=0)throw new Error('Enter weight kg and height meters.');const bmi=n[0]/(n[1]**2);return 'BMI: '+bmi.toFixed(2)+'\nCategory: '+(bmi<18.5?'Underweight':bmi<25?'Normal':bmi<30?'Overweight':'Obesity');}
    case 'tip-calculator': {if(n.length<2)throw new Error('Enter bill and tip percentage.');const tip=n[0]*n[1]/100;const people=n[2]||1;return 'Tip: '+tip.toFixed(2)+'\nTotal: '+(n[0]+tip).toFixed(2)+'\nPer person: '+((n[0]+tip)/people).toFixed(2);}
    case 'quadratic-equation-solver': {if(n.length<3||n[0]===0)throw new Error('Enter a, b, c.');const [a,b,c]=n,d=b*b-4*a*c;if(d<0)return 'No real roots. Discriminant: '+d;return 'x1: '+((-b+Math.sqrt(d))/(2*a))+'\nx2: '+((-b-Math.sqrt(d))/(2*a));}
    case 'matrix-multiplication-calc': {const rows=input.trim().split(/\r?\n/).map(x=>x.trim()).filter(Boolean);if(rows.length<4)throw new Error('Enter four rows: A row1, A row2, B row1, B row2.');const m=rows.map(r=>r.split(/[ ,]+/).map(Number));if(m.some(r=>r.length!==2||r.some(v=>!Number.isFinite(v))))throw new Error('Use 2x2 numeric rows.');return String(m[0][0]*m[2][0]+m[0][1]*m[2][1])+' '+String(m[0][0]*m[2][1]+m[0][1]*m[3][1])+'\n'+String(m[1][0]*m[2][0]+m[1][1]*m[2][1])+' '+String(m[1][0]*m[2][1]+m[1][1]*m[3][1]);}
    case 'fuel-consumption-calc': {if(n.length<3)throw new Error('Enter distance km, fuel litres, and fuel price per litre.');return 'Efficiency: '+(n[0]/n[1]).toFixed(2)+' km/L\nTrip cost: '+(n[1]*n[2]).toFixed(2);}
    case 'permutation-combination': {if(n.length<2)throw new Error('Enter n and r.');const a=Math.trunc(n[0]),b=Math.trunc(n[1]);if(a<0||b<0||b>a||a>170)throw new Error('Require 0<=r<=n<=170.');let f=(x:number)=>{let v=1;for(let i=2;i<=x;i++)v*=i;return v};return 'nPr: '+f(a)/f(a-b)+'\nnCr: '+f(a)/(f(b)*f(a-b));}
    case 'probability-dice-coin': {const sides=Math.trunc(n[0]??6),rolls=Math.trunc(n[1]??1);if(sides<2||rolls<1)throw new Error('Enter positive dice sides and roll count.');return 'One-roll outcome probability: '+(1/sides)+'\nExpected sum: '+rolls*(sides+1)/2;}
    case 'endianness-converter': {const value=Math.trunc(n[0]??0);if(!Number.isSafeInteger(value)||value<0)throw new Error('Enter a non-negative safe integer.');const hex=value.toString(16).padStart(8,'0').match(/../g)!;return 'Big endian: '+hex.join(' ')+'\nLittle endian: '+hex.reverse().join(' ');}
    case 'standard-normal-z-score': {const x=n[0],mean=n[1]??0,sd=n[2]??1;if(!Number.isFinite(x)||sd<=0)throw new Error('Enter value, mean, and positive standard deviation.');return 'Z-score: '+((x-mean)/sd);}
    case 'dpi-ppi-calculator': {if(n.length<2||n[1]<=0)throw new Error('Enter pixels and physical size.');return 'Density: '+n[0]/n[1]+' px/unit';}
    case 'aspect-ratio-calculator': {if(n.length<3||n[1]===0)throw new Error('Enter width height targetWidth.');return 'Target height: '+n[2]*n[1]/n[0];}
    case 'average-mean-median-mode': {
      const values = n.filter(Number.isFinite);
      if (!values.length) throw new Error('Enter one or more numbers.');
      const sorted = [...values].sort((a,b)=>a-b);
      const mean = values.reduce((sum,v)=>sum+v,0)/values.length;
      const mid = Math.floor(sorted.length/2);
      const median = sorted.length % 2 ? sorted[mid] : (sorted[mid-1]+sorted[mid])/2;
      const counts = new Map<number,number>();
      for (const v of values) counts.set(v,(counts.get(v)??0)+1);
      const maxCount = Math.max(...counts.values());
      const modes = maxCount > 1 ? [...counts.entries()].filter(([,count])=>count===maxCount).map(([v])=>v) : [];
      return ['Count: '+values.length,'Mean: '+mean,'Median: '+median,'Mode: '+(modes.length ? modes.join(', ') : 'No mode')].join('\\n');
    }
    case 'big-o-notation-cheatsheet': return 'O(1): constant\\nO(log n): binary search\\nO(n): single pass\\nO(n log n): efficient comparison sort\\nO(n²): nested pairwise loops\\nO(2^n): subset-style recursion';
    case 'modulo-arithmetic-calc': {
      if (n.length < 2 || !Number.isInteger(n[1]) || n[1] === 0) throw new Error('Enter integer a and a non-zero integer modulus.');
      const [a,m] = n.map(Math.trunc);
      return 'a mod m: '+((a % m)+Math.abs(m))%Math.abs(m)+'\\nJavaScript remainder: '+(a % m);
    }
    case 'logarithm-calculator': {
      if (!Number.isFinite(n[0]) || n[0] <= 0) throw new Error('Enter a positive value.');
      const value=n[0], base=n[1] ?? 10;
      if (!Number.isFinite(base) || base <= 0 || base === 1) throw new Error('Base must be positive and not equal to 1.');
      return 'log_'+base+'('+value+') = '+(Math.log(value)/Math.log(base));
    }
    case 'pythagorean-theorem-calc': {
      if (n.length < 2) throw new Error('Enter two sides.');
      const [a,b]=n;
      if (a < 0 || b < 0) throw new Error('Sides must be non-negative.');
      return 'Hypotenuse: '+Math.hypot(a,b);
    }
    case 'circle-area-perimeter': {
      if (!Number.isFinite(n[0]) || n[0] < 0) throw new Error('Enter a non-negative radius.');
      const radius=n[0];
      return 'Area: '+(Math.PI*radius*radius)+'\\nCircumference: '+(2*Math.PI*radius);
    }
    default:return null;
  }
};


const roiBatch7: Handler = (tool, input) => {
  switch(tool.id){
    case 'architecture-decision-record': return '# ADR: '+(input.trim()||'Decision')+'\n\n## Context\n\n## Decision\n\n## Consequences\n\n## Alternatives considered';
    case 'code-review-checklist': return '- Correctness\n- Error handling\n- Security\n- Input validation\n- Performance\n- Tests\n- Accessibility\n- Documentation';
    case 'website-launch-checklist': return '- Build passes\n- Tests pass\n- Security headers verified\n- Secrets excluded\n- Mobile smoke tested\n- Accessibility smoke tested\n- Rollback path verified';
    case 'license-selector-guide': return 'MIT: permissive. Apache-2.0: permissive with patent grant. GPL-3.0: strong copyleft. BSD-2-Clause/BSD-3-Clause: permissive. MPL-2.0: file-level copyleft.';
    case 'pull-request-template-md': return '## Summary\n- \n\n## Changes\n- \n\n## Testing\n- [ ] Unit tests\n- [ ] Build\n\n## Checklist\n- [ ] No secrets\n- [ ] Documentation updated';
    default:return null;
  }
};

const roiBatch9: Handler = (tool, input) => {
  const lines = input.split(/\r?\n/).filter(Boolean);
  switch (tool.id) {
    case 'bencode-decoder': {
      const source = input.trim();
      let i = 0;
      const parse = (): unknown => {
        if (i >= source.length) throw new Error('Invalid bencode: unexpected end.');
        const ch = source[i];
        if (ch === 'i') {
          i++;
          const end = source.indexOf('e', i);
          if (end < 0) throw new Error('Invalid bencode integer.');
          const raw = source.slice(i, end);
          if (!/^-?(0|[1-9]\d*)$/.test(raw)) throw new Error('Invalid bencode integer.');
          i = end + 1;
          return Number(raw);
        }
        if (ch === 'l' || ch === 'd') {
          const dict = ch === 'd'; i++;
          const out: unknown[] = [];
          const obj: Record<string, unknown> = {};
          while (source[i] !== 'e') {
            if (i >= source.length) throw new Error('Invalid bencode container.');
            const keyOrValue = parse();
            if (dict) {
              if (typeof keyOrValue !== 'string') throw new Error('Dictionary keys must be strings.');
              const value = parse(); obj[keyOrValue] = value;
            } else out.push(keyOrValue);
          }
          i++;
          return dict ? obj : out;
        }
        const colon = source.indexOf(':', i);
        if (colon < 0) throw new Error('Invalid bencode string.');
        const len = Number(source.slice(i, colon));
        if (!Number.isInteger(len) || len < 0) throw new Error('Invalid bencode string length.');
        i = colon + 1;
        const value = source.slice(i, i + len);
        if (value.length !== len) throw new Error('Invalid bencode string length.');
        i += len; return value;
      };
      const value = parse();
      if (i !== source.length) throw new Error('Invalid bencode: trailing data.');
      return JSON.stringify(value, null, 2);
    }
    case 'csv-to-sqlite-ddl': {
      const rows = parseCsv(input);
      if (!rows.length || !rows[0].length) throw new Error('Enter CSV data with a header row.');
      const headers = rows[0].map((h, i) => (h.trim() || 'column_'+(i+1)).replace(/[^A-Za-z0-9_]/g, '_'));
      const quote = (h: string) => '"' + h.replace(/"/g, '""') + '"';
      const typeFor = (index: number) => {
        const vals = rows.slice(1).map(r => (r[index] ?? '').trim()).filter(Boolean);
        if (vals.length && vals.every(v => /^-?\d+$/.test(v))) return 'INTEGER';
        if (vals.length && vals.every(v => /^-?(?:\d+\.\d+|\d+)$/.test(v))) return 'REAL';
        if (vals.length && vals.every(v => /^(true|false)$/i.test(v))) return 'INTEGER';
        return 'TEXT';
      };
      return 'CREATE TABLE data (\n  ' + headers.map((h,i)=>quote(h)+' '+typeFor(i)).join(',\n  ') + '\n);';
    }
    case 'mime-types-lookup': {
      const map: Record<string,string> = { html:'text/html',htm:'text/html',css:'text/css',js:'text/javascript',mjs:'text/javascript',json:'application/json',xml:'application/xml',csv:'text/csv',txt:'text/plain',md:'text/markdown',pdf:'application/pdf',zip:'application/zip',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',svg:'image/svg+xml',webp:'image/webp',ico:'image/x-icon',mp3:'audio/mpeg',mp4:'video/mp4',webm:'video/webm',wasm:'application/wasm',yaml:'application/yaml',yml:'application/yaml'};
      const key = input.trim().toLowerCase().replace(/^\./,'').split('/').pop()!.split('.').pop()!;
      const mime = map[key];
      return mime ? key+' → '+mime : 'Unknown MIME type for: '+key;
    }
    case 'api-request-builder': {
      let cfg: any;
      try { cfg = JSON.parse(input); } catch { throw new Error('Enter JSON like {"method":"POST","url":"https://example.com","headers":{"Content-Type":"application/json"},"body":"{}"}'); }
      const method = String(cfg.method || 'GET').toUpperCase(), url = String(cfg.url || '').trim();
      if (!/^https?:\/\//i.test(url)) throw new Error('URL must use http:// or https://.');
      let out = method+' '+url+'\n';
      if (cfg.headers && typeof cfg.headers === 'object') for (const [k,v] of Object.entries(cfg.headers)) out += String(k)+': '+String(v)+'\n';
      if (cfg.body !== undefined) out += '\n'+(typeof cfg.body === 'string' ? cfg.body : JSON.stringify(cfg.body));
      return out.trim();
    }
    case 'kubernetes-pod-yaml': {
      const name = (lines[0] || 'app').trim().replace(/[^a-z0-9-]/g,'-').slice(0,63) || 'app';
      const image = (lines[1] || 'nginx:latest').trim();
      return 'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: '+name+'\nspec:\n  replicas: 1\n  selector:\n    matchLabels:\n      app: '+name+'\n  template:\n    metadata:\n      labels:\n        app: '+name+'\n    spec:\n      containers:\n        - name: '+name+'\n          image: '+image+'\n          ports:\n            - containerPort: 80';
    }
    case 'curl-command-builder': {
      let cfg: any;
      try { cfg = JSON.parse(input); } catch { throw new Error('Enter JSON config with url, method, headers, and optional body.'); }
      const url = String(cfg.url || '').trim();
      if (!/^https?:\/\//i.test(url)) throw new Error('URL must use http:// or https://.');
      let cmd = 'curl -X '+String(cfg.method || 'GET').toUpperCase()+' '+JSON.stringify(url);
      if (cfg.headers && typeof cfg.headers === 'object') for (const [k,v] of Object.entries(cfg.headers)) cmd += ' -H '+JSON.stringify(String(k)+': '+String(v));
      if (cfg.body !== undefined) cmd += ' --data '+JSON.stringify(typeof cfg.body === 'string' ? cfg.body : JSON.stringify(cfg.body));
      return cmd;
    }
    case 's3-bucket-policy-builder': {
      const bucket = (input.trim() || 'BUCKET').replace(/[^A-Za-z0-9._-]/g,'');
      if (!bucket) throw new Error('Enter a bucket name.');
      return JSON.stringify({Version:'2012-10-17',Statement:[{Effect:'Allow',Principal:'*',Action:['s3:GetObject'],Resource:'arn:aws:s3:::'+bucket+'/*'}]},null,2);
    }
    case 'webhook-tester-format': {
      try { const data = JSON.parse(input); return JSON.stringify(data,null,2); }
      catch { throw new Error('Enter a valid JSON webhook payload.'); }
    }
    case 'github-profile-generator': {
      const name = (lines[0] || 'Your Name').trim(), bio = (lines[1] || 'Developer').trim(), links = lines.slice(2);
      return '# '+name+'\n\n'+bio+'\n\n## Links\n'+(links.length ? links.map(x=>'- '+x).join('\n') : '- GitHub: https://github.com/USERNAME')+'\n\n## About\n- Building useful developer tools\n- Open to collaboration';
    }
    default: return null;
  }
};


const roiBatch10: Handler = (tool, input) => {
  switch (tool.id) {
    case 'rot13-cipher':
      return caesar(input, 13);
    case 'ascii-art-banner':
      return input.trim().split(/\s+/).map(word => word.toUpperCase().split('').join(' ')).join('\n');
    case 'shuffle-words': {
      const wordsList = input.trim().split(/\s+/).filter(Boolean);
      for (let i = wordsList.length - 1; i > 0; i -= 1) {
        const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
        [wordsList[i], wordsList[j]] = [wordsList[j], wordsList[i]];
      }
      return wordsList.join(' ');
    }
    case 'escape-json-string':
      return JSON.stringify(input).slice(1, -1);
    case 'json-flatten': {
      const data = JSON.parse(input);
      const out: Record<string, unknown> = {};
      const visit = (value: unknown, path: string) => {
        if (Array.isArray(value)) value.forEach((item, index) => visit(item, path ? path + '.' + index : String(index)));
        else if (value && typeof value === 'object') Object.entries(value as Record<string, unknown>)
          .forEach(([key, item]) => visit(item, path ? path + '.' + key : key));
        else out[path] = value;
      };
      visit(data, '');
      return JSON.stringify(out, null, 2);
    }
    case 'markdown-table-builder': {
      const rows = parseCsv(input);
      if (!rows.length) throw new Error('Enter CSV-style rows.');
      return ['| ' + rows[0].map(encodeHtml).join(' | ') + ' |',
        '| ' + rows[0].map(() => '---').join(' | ') + ' |',
        ...rows.slice(1).map(row => '| ' + row.map(encodeHtml).join(' | ') + ' |')].join('\n');
    }
    case 'json-schema-generator': {
      const data = JSON.parse(input);
      const schemaType = (value: unknown): Record<string, unknown> => {
        if (value === null) return { type: 'null' };
        if (Array.isArray(value)) return { type: 'array', items: value.length ? schemaType(value[0]) : {} };
        if (typeof value === 'object') {
          const properties: Record<string, unknown> = {};
          for (const [key, item] of Object.entries(value as Record<string, unknown>)) properties[key] = schemaType(item);
          return { type: 'object', properties };
        }
        return { type: typeof value };
      };
      return JSON.stringify({ $schema: 'https://json-schema.org/draft/2020-12/schema', ...schemaType(data) }, null, 2);
    }
    case 'xml-formatter': {
      const source = input.trim().replace(/>\s*</g, '><');
      if (!/^<[\s\S]+>$/.test(source)) throw new Error('Enter valid XML-like markup.');
      let depth = 0;
      return source.replace(/(<[^>]+>)/g, '\n$1').split('\n').filter(Boolean).map(token => {
        if (/^<\//.test(token)) depth = Math.max(0, depth - 1);
        const line = '  '.repeat(depth) + token;
        if (/^<[^!?/][^>]*[^/]?>$/.test(token) && !/<[^>]+>[^<]*<\/[^>]+>$/.test(token)) depth += 1;
        return line;
      }).join('\n');
    }
    case 'yaml-validator':
      yamlToJson(input);
      return 'Valid basic YAML mapping.';
    case 'toml-validator': {
      const lines = input.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || /^\[[^\]]+\]$/.test(trimmed)) continue;
        if (!/^[A-Za-z0-9_.-]+\s*=\s*.+$/.test(trimmed)) throw new Error('Invalid basic TOML key/value line: ' + trimmed);
      }
      return 'Valid basic TOML key/value document.';
    }
    default:
      return null;
  }
};

const roiBatch11: Handler = (tool, input) => {
  switch (tool.id) {
    case 'base32-encoder': {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
      const bytes = new TextEncoder().encode(input);
      let bits = 0, value = 0, out = '';
      for (const byte of bytes) {
        value = (value << 8) | byte; bits += 8;
        while (bits >= 5) { out += alphabet[(value >>> (bits - 5)) & 31]; bits -= 5; }
      }
      if (bits) out += alphabet[(value << (5 - bits)) & 31];
      return out + '='.repeat((8 - (out.length % 8)) % 8);
    }
    case 'markdown-to-html':
      return input
        .replace(/^###### (.*)$/gm, '<h6>$1</h6>')
        .replace(/^##### (.*)$/gm, '<h5>$1</h5>')
        .replace(/^#### (.*)$/gm, '<h4>$1</h4>')
        .replace(/^### (.*)$/gm, '<h3>$1</h3>')
        .replace(/^## (.*)$/gm, '<h2>$1</h2>')
        .replace(/^# (.*)$/gm, '<h1>$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>\n');
    case 'xml-to-json-basic': {
      const source = input.trim();
      const match = source.match(/^<([A-Za-z][\w.-]*)>([\s\S]*)<\/\1>$/);
      if (!match) throw new Error('Enter simple XML with a single root element.');
      const parse = (value: string): unknown => {
        const child = value.match(/^<([A-Za-z][\w.-]*)>([\s\S]*)<\/\1>$/);
        if (!child) return value.replace(/<[^>]+>/g, '').trim();
        const children = [...child[2].matchAll(/<([A-Za-z][\w.-]*)>([\s\S]*?)<\/\1>/g)];
        if (!children.length) return child[2].trim();
        const obj: Record<string, unknown> = {};
        for (const item of children) {
          const key = item[1], parsed = parse(item[0]);
          obj[key] = obj[key] === undefined ? parsed : Array.isArray(obj[key]) ? [...obj[key], parsed] : [obj[key], parsed];
        }
        return obj;
      };
      return JSON.stringify({ [match[1]]: parse(source) }, null, 2);
    }
    case 'url-parser-inspector': {
      const url = new URL(input.trim());
      return ['Protocol: ' + url.protocol.replace(':', ''), 'Host: ' + url.host,
        'Path: ' + (url.pathname || '/'), 'Query: ' + url.search, 'Hash: ' + url.hash].join('\n');
    }
    case 'css-minifier-basic':
      return minifyCss(input);
    case 'html-minifier-basic':
      return input.replace(/<!--[\s\S]*?-->/g, '').replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ').trim();
    default:
      return null;
  }
};

const roiBatch12: Handler = (tool, input) => {
  switch (tool.id) {
    case 'case-title': {
      const small = new Set(['a','an','the','and','or','but','for','nor','on','at','to','from','by','of','in']);
      const parts = input.trim().toLowerCase().split(/\s+/);
      return parts.map((word, i) => i > 0 && i < parts.length - 1 && small.has(word) ? word : word[0]?.toUpperCase() + word.slice(1)).join(' ');
    }
    case 'quoted-printable-decoder':
      return input.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
    case 'repeat-string': {
      const lines = input.split(/\r?\n/);
      const count = Math.trunc(Number(lines[0]));
      if (!Number.isInteger(count) || count < 1 || count > 1000) throw new Error('First line must be a repeat count from 1 to 1000.');
      return Array(count).fill(lines.slice(1).join('\n')).join('');
    }
    case 'text-compare-inline': {
      const lines = input.split(/\r?\n/);
      if (lines.length < 2) throw new Error('Use two lines: original text and changed text.');
      const a = lines[0].split(/\s+/), b = lines[1].split(/\s+/);
      return b.map((word, i) => word === a[i] ? word : '[' + word + ']').join(' ');
    }
    case 'json-to-ts-interface': {
      const data = JSON.parse(input);
      const typeOf = (value: unknown): string => {
        if (value === null) return 'null';
        if (Array.isArray(value)) return value.length ? typeOf(value[0]) + '[]' : 'unknown[]';
        if (typeof value === 'object') return 'object';
        return typeof value === 'number' && Number.isInteger(value) ? 'number' : typeof value;
      };
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Input must be a JSON object.');
      const lines = Object.entries(data as Record<string, unknown>).map(([key, value]) => '  ' + key.replace(/[^A-Za-z0-9_$]/g, '_') + ': ' + typeOf(value) + ';');
      return 'interface Generated {\n' + lines.join('\n') + '\n}';
    }
    case 'html-to-markdown':
      return input
        .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_, text: string) => '# ' + text.trim() + '\n')
        .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
        .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .trim();
    default:
      return null;
  }
};



const sha1Hex = (message: string): string => {
  const bytes = new TextEncoder().encode(message);
  const bitLength = bytes.length * 8;
  const padded = new Uint8Array(((bytes.length + 9 + 63) >> 6) * 64);
  padded.set(bytes); padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(padded.length - 4, bitLength >>> 0);
  let h0=0x67452301,h1=0xefcdab89,h2=0x98badcfe,h3=0x10325476,h4=0xc3d2e1f0;
  const rol=(x:number,n:number)=>(x<<n)|(x>>>(32-n));
  for(let off=0;off<padded.length;off+=64){
    const w=new Uint32Array(80);
    for(let i=0;i<16;i++) w[i]=view.getUint32(off+i*4);
    for(let i=16;i<80;i++) w[i]=rol(w[i-3]^w[i-8]^w[i-14]^w[i-16],1)>>>0;
    let a=h0,b=h1,c=h2,d=h3,e=h4;
    for(let i=0;i<80;i++){
      const f=i<20?(b&c)|((~b)&d):i<40?b^c^d:i<60?(b&c)|(b&d)|(c&d):b^c^d;
      const k=i<20?0x5a827999:i<40?0x6ed9eba1:i<60?0x8f1bbcdc:0xca62c1d6;
      const t=(rol(a,5)+f+e+k+w[i])>>>0;e=d;d=c;c=rol(b,30)>>>0;b=a;a=t;
    }
    h0=(h0+a)>>>0;h1=(h1+b)>>>0;h2=(h2+c)>>>0;h3=(h3+d)>>>0;h4=(h4+e)>>>0;
  }
  return [h0,h1,h2,h3,h4].map(v=>v.toString(16).padStart(8,'0')).join('');
};

const md5Hex = (message: string): string => {
  const bytes = new TextEncoder().encode(message);
  const bitLength = bytes.length * 8;
  const padded = new Uint8Array(((bytes.length + 9 + 63) >> 6) * 64);
  padded.set(bytes); padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, bitLength >>> 0, true);
  view.setUint32(padded.length - 4, Math.floor(bitLength / 0x100000000), true);
  const s=[7,12,17,22,5,9,14,20,4,11,16,23,6,10,15,21];
  const k=Array.from({length:64},(_,i)=>Math.floor(Math.abs(Math.sin(i+1))*0x100000000)>>>0);
  let a0=0x67452301,b0=0xefcdab89,c0=0x98badcfe,d0=0x10325476;
  const rol=(x:number,n:number)=>(x<<n)|(x>>>(32-n));
  for(let off=0;off<padded.length;off+=64){
    const m=new Uint32Array(16); for(let i=0;i<16;i++) m[i]=view.getUint32(off+i*4,true);
    let a=a0,b=b0,c=c0,d=d0;
    for(let i=0;i<64;i++){
      let f=0,g=0;
      if(i<16){f=(b&c)|((~b)&d);g=i;} else if(i<32){f=(d&b)|((~d)&c);g=(5*i+1)%16;}
      else if(i<48){f=b^c^d;g=(3*i+5)%16;} else {f=c^(b|(~d));g=(7*i)%16;}
      const shift=s[(i>>4)*4+(i%4)];
      const t=(a+f+k[i]+m[g])>>>0;a=d;d=c;c=b;b=(b+rol(t,shift))>>>0;
    }
    a0=(a0+a)>>>0;b0=(b0+b)>>>0;c0=(c0+c)>>>0;d0=(d0+d)>>>0;
  }
  const out=new Uint8Array(16), v=new DataView(out.buffer);
  [a0,b0,c0,d0].forEach((x,i)=>v.setUint32(i*4,x,true));
  return Array.from(out,b=>b.toString(16).padStart(2,'0')).join('');
};

const sha256Hex = (message: string | Uint8Array): string => {
  const bytes = typeof message === 'string' ? new TextEncoder().encode(message) : message;
  const K = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
  ];
  const bitLength = bytes.length * 8;
  const padded = new Uint8Array(((bytes.length + 9 + 63) >> 6) * 64);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(padded.length - 4, bitLength >>> 0);
  let h0=0x6a09e667,h1=0xbb67ae85,h2=0x3c6ef372,h3=0xa54ff53a,h4=0x510e527f,h5=0x9b05688c,h6=0x1f83d9ab,h7=0x5be0cd19;
  const rotr=(x:number,n:number)=>(x>>>n)|(x<<(32-n));
  for(let offset=0;offset<padded.length;offset+=64){
    const w=new Uint32Array(64);
    for(let i=0;i<16;i++) w[i]=view.getUint32(offset+i*4);
    for(let i=16;i<64;i++){const s0=rotr(w[i-15],7)^rotr(w[i-15],18)^(w[i-15]>>>3);const s1=rotr(w[i-2],17)^rotr(w[i-2],19)^(w[i-2]>>>10);w[i]=(w[i-16]+s0+w[i-7]+s1)>>>0;}
    let a=h0,b=h1,cc=h2,d=h3,e=h4,f=h5,g=h6,hh=h7;
    for(let i=0;i<64;i++){const S1=rotr(e,6)^rotr(e,11)^rotr(e,25);const ch=(e&f)^(~e&g);const temp1=(hh+S1+ch+K[i]+w[i])>>>0;const S0=rotr(a,2)^rotr(a,13)^rotr(a,22);const maj=(a&b)^(a&cc)^(b&cc);const temp2=(S0+maj)>>>0;hh=g;g=f;f=e;e=(d+temp1)>>>0;d=cc;cc=b;b=a;a=(temp1+temp2)>>>0;}
    h0=(h0+a)>>>0;h1=(h1+b)>>>0;h2=(h2+cc)>>>0;h3=(h3+d)>>>0;h4=(h4+e)>>>0;h5=(h5+f)>>>0;h6=(h6+g)>>>0;h7=(h7+hh)>>>0;
  }
  return [h0,h1,h2,h3,h4,h5,h6,h7].map(v=>v.toString(16).padStart(8,'0')).join('');
};

const hmacSha256Hex = (secret: string, message: string): string => {
  const blockSize = 64;
  const toBytes = (value: string) => Array.from(new TextEncoder().encode(value));
  let key = toBytes(secret);
  if (key.length > blockSize) {
    const hex = sha256Hex(secret);
    key = hex.match(/../g)!.map(pair => parseInt(pair,16));
  }
  key = key.concat(Array(blockSize-key.length).fill(0));
  const inner = key.map(byte => byte ^ 0x36);
  const outer = key.map(byte => byte ^ 0x5c);
  const messageBytes = new TextEncoder().encode(message);
  const concat = (a: number[], b: Uint8Array) => new Uint8Array([...a, ...Array.from(b)]);
  const innerHex = sha256Hex(concat(inner, messageBytes));
  const innerBytes = new Uint8Array(innerHex.match(/../g)!.map(pair => parseInt(pair,16)));
  return sha256Hex(concat(outer, innerBytes));
};


const roiBatch14: Handler = (tool, input) => {
  switch (tool.id) {
    case 'base64-text-encoder':
      return encodeBase64Utf8(input);
    case 'url-encoder-decoder': {
      const lines = input.split(/\r?\n/);
      const mode = (lines[0] || '').trim().toLowerCase();
      const value = lines.slice(1).join('\n');
      if (mode === 'decode' || mode === 'decodeuri' || mode === 'decodeuricomponent') {
        try { return decodeURIComponent(value); } catch { throw new Error('Enter valid percent-encoded URL text.'); }
      }
      return encodeURIComponent(mode === 'encode' || mode === 'encodeuri' || mode === 'encodeuricomponent' ? value : input);
    }
    case 'case-converter': {
      const parts = caseWords(input);
      const lower = parts.map(part => part.toLowerCase());
      const pascal = lower.map(part => part ? part[0].toUpperCase() + part.slice(1) : '').join('');
      const camel = lower.map((part, i) => i === 0 ? part : part ? part[0].toUpperCase() + part.slice(1) : '').join('');
      return [
        'camelCase: ' + camel,
        'snake_case: ' + lower.join('_'),
        'kebab-case: ' + lower.join('-'),
        'PascalCase: ' + pascal,
        'CONSTANT_CASE: ' + lower.join('_').toUpperCase(),
        'Title Case: ' + lower.map(part => part ? part[0].toUpperCase() + part.slice(1) : '').join(' ')
      ].join('\n');
    }
    case 'string-slugifier':
      return slugify(input);
    case 'html-entity-encoder': {
      const trimmed = input.trim();
      if (/^&(amp|lt|gt|quot|apos|#39|#x[0-9a-f]+|#\d+);/i.test(trimmed) || /&(?:amp|lt|gt|quot|apos|#39|#x[0-9a-f]+|#\d+);/i.test(trimmed)) {
        return decodeHtml(input);
      }
      return encodeHtml(input);
    }
    case 'hex-to-string':
      return decodeHex(input);
    case 'binary-to-text':
      return decodeBinary(input);
    case 'morse-code-converter': {
      const tokens = input.trim().split(/\s+/);
      const looksLikeMorse = tokens.length > 0 && tokens.every(token => /^[.\-\/]+$/.test(token));
      if (looksLikeMorse) {
        const reverse: Record<string, string> = Object.fromEntries(Object.entries(MORSE).map(([letter, code]) => [code, letter]));
        return tokens.map(token => token === '/' ? ' ' : reverse[token] ?? '?').join('');
      }
      return input.toUpperCase().split('').map(char => char === ' ' ? '/' : MORSE[char] ?? char).join(' ');
    }
    case 'word-frequency-analyzer': {
      const counts = new Map<string, number>();
      for (const word of words(input)) counts.set(word, (counts.get(word) ?? 0) + 1);
      const rows = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
      if (!rows.length) throw new Error('Enter text containing words.');
      return rows.map(([word, count]) => word + ': ' + count).join('\n');
    }
    default:
      return null;
  }
};


const roiBatch13: Handler = (tool, input) => {
  switch (tool.id) {
    case 'permission-octal-calculator':
      return chmodCalculator(input);
    case 'cmyk-to-rgb-hex': {
      const values = input.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
      if (values.length < 4 || values.some(v => v < 0 || v > 100)) {
        throw new Error('Enter C, M, Y, K percentages from 0 to 100.');
      }
      const [c, m, y, k] = values;
      const r = Math.round(255 * (1 - c / 100) * (1 - k / 100));
      const g = Math.round(255 * (1 - m / 100) * (1 - k / 100));
      const b = Math.round(255 * (1 - y / 100) * (1 - k / 100));
      const hex = [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
      return 'RGB: ' + r + ', ' + g + ', ' + b + '\\nHEX: #' + hex;
    }
    case 'viewport-percentage-calc': {
      const values = input.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
      if (values.length < 4) throw new Error('Enter vw, vh, viewport width, and viewport height.');
      const [vw, vh, width, height] = values;
      return 'Width: ' + (width * vw / 100) + ' px\\nHeight: ' + (height * vh / 100) + ' px';
    }
    case 'css-truncate-multiline': {
      const lines = input.split(/\r?\n/);
      const count = Math.trunc(Number(lines[0]));
      if (!Number.isInteger(count) || count < 1 || count > 20) throw new Error('First line must be a line count from 1 to 20.');
      const text = lines.slice(1).join(' ').trim() || 'Your text here';
      return '.truncate {\n  display: -webkit-box;\n  -webkit-box-orient: vertical;\n  -webkit-line-clamp: ' + count + ';\n  overflow: hidden;\n}\n\nText: ' + text;
    }
    case 'bson-objectid-generator': {
      const requested = input.trim();
      if (requested && !/^[0-9a-f]{24}$/i.test(requested)) throw new Error('Enter a 24-hex ObjectId to inspect, or leave blank to generate one.');
      const id = requested || Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join('');
      const seconds = parseInt(id.slice(0, 8), 16);
      const date = new Date(seconds * 1000);
      return 'ObjectId: ' + id + '\\nTimestamp: ' + (Number.isFinite(date.getTime()) ? date.toISOString() : 'Unknown');
    }
    case 'color-hex-to-decimal': {
      const clean = input.trim().replace(/^#/, '');
      if (!/^[0-9a-f]{6}$/i.test(clean)) throw new Error('Enter a six-digit HEX color such as #FFFFFF.');
      return 'Decimal: ' + parseInt(clean, 16);
    }
    case 'color-decimal-to-hex': {
      const value = Number(input.trim());
      if (!Number.isInteger(value) || value < 0 || value > 0xffffff) throw new Error('Enter an integer from 0 to 16777215.');
      return 'HEX: #' + value.toString(16).padStart(6, '0').toUpperCase();
    }
    case 'clamp-number-math': {
      const values = input.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
      if (values.length < 3) throw new Error('Enter value, min, and max.');
      const [value, min, max] = values;
      if (min > max) throw new Error('Minimum cannot be greater than maximum.');
      return 'Clamped: ' + Math.min(max, Math.max(min, value));
    }
    case 'signed-url-builder-spec': {
      let data: { url?: string; secret?: string; expiresAt?: number };
      try { data = JSON.parse(input) as { url?: string; secret?: string; expiresAt?: number }; } catch { throw new Error('Input must be JSON: {"url":"https://example.com/file","secret":"...","expiresAt":2030}.'); }
      if (!data.url || !data.secret || !Number.isInteger(data.expiresAt) || (data.expiresAt as number) <= 0) {
        throw new Error('Provide url, non-empty secret, and positive integer expiresAt.');
      }
      let parsed: URL;
      try { parsed = new URL(data.url); } catch { throw new Error('URL must be absolute and valid.'); }
      parsed.searchParams.delete('signature');
      parsed.searchParams.set('expires', String(data.expiresAt));
      const canonical = parsed.pathname + '?' + Array.from(parsed.searchParams.entries()).sort(([a],[b]) => a.localeCompare(b)).map(([key,value]) => encodeURIComponent(key) + '=' + encodeURIComponent(value)).join('&');
      const signature = hmacSha256Hex(data.secret, canonical);
      parsed.searchParams.set('signature', signature);
      return 'Signed URL: ' + parsed.toString() + '\nExpires (Unix): ' + data.expiresAt + '\nCanonical string: ' + canonical;
    }
        case 'rgb-to-hex-code': {
      const values = input.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
      if (values.length < 3 || values.slice(0, 3).some(v => v < 0 || v > 255)) {
        throw new Error('Enter RGB values from 0 to 255, e.g. 255 0 128.');
      }
      const hex = values.slice(0, 3).map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
      return '#' + hex;
    }
    case 'base64-to-image': {
      const value = input.trim();
      const match = value.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,([A-Za-z0-9+/=]+)$/i);
      if (!match) throw new Error('Enter a valid image data URL such as data:image/png;base64,...');
      const bytes = atob(match[2]).length;
      return 'Image type: ' + match[1].toUpperCase() + '\\nDecoded bytes: ' + bytes;
    }
    default:
      return null;
  }
};


const roiBatch18: Handler = (tool, input) => {
  switch (tool.id) {
    case 'diff-checker-unified': {
      const [left = '', right = ''] = input.split(/\r?\n---\r?\n/);
      const a = left.split(/\r?\n/);
      const b = right.split(/\r?\n/);
      const max = Math.max(a.length, b.length);
      const out: string[] = [];
      for (let i = 0; i < max; i++) {
        if (a[i] === b[i]) out.push('  ' + (a[i] ?? ''));
        else {
          if (a[i] !== undefined) out.push('- ' + a[i]);
          if (b[i] !== undefined) out.push('+ ' + b[i]);
        }
      }
      return out.join('\n');
    }
    case 'hex-dump-generator': {
      const bytes = new TextEncoder().encode(input);
      const rows: string[] = [];
      for (let offset = 0; offset < bytes.length; offset += 16) {
        const chunk = Array.from(bytes.slice(offset, offset + 16));
        const hex = chunk.map(b => b.toString(16).padStart(2, '0')).join(' ').padEnd(47, ' ');
        const ascii = chunk.map(b => b >= 32 && b <= 126 ? String.fromCharCode(b) : '.').join('');
        rows.push(offset.toString(16).padStart(8, '0') + '  ' + hex + '  |' + ascii + '|');
      }
      return rows.join('\n');
    }
    case 'cors-header-builder':
      return [
        'Access-Control-Allow-Origin: ' + (input.trim() || '*'),
        'Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers: Content-Type, Authorization'
      ].join('\n');
    case 'csp-generator': {
      const origin = input.trim() || "'self'";
      return [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "connect-src 'self' " + origin,
        "font-src 'self' data:",
        "object-src 'none'",
        "base-uri 'self'",
        "frame-ancestors 'none'"
      ].join('; ') + ';';
    }
    case 'security-headers-analyzer': {
      const lower = input.toLowerCase();
      const checks = [
        ['Content-Security-Policy', lower.includes('content-security-policy')],
        ['Strict-Transport-Security', lower.includes('strict-transport-security')],
        ['X-Content-Type-Options', lower.includes('x-content-type-options')],
        ['Referrer-Policy', lower.includes('referrer-policy')],
        ['Permissions-Policy', lower.includes('permissions-policy')]
      ];
      return checks.map(([name, present]) => name + ': ' + (present ? 'present' : 'missing')).join('\n');
    }
    case 'password-entropy-meter': {
      const value = input;
      let pool = 0;
      if (/[a-z]/.test(value)) pool += 26;
      if (/[A-Z]/.test(value)) pool += 26;
      if (/\d/.test(value)) pool += 10;
      if (/[^A-Za-z0-9]/.test(value)) pool += 32;
      const entropy = pool > 0 ? value.length * Math.log2(pool) : 0;
      const strength = entropy < 40 ? 'Weak' : entropy < 60 ? 'Moderate' : entropy < 80 ? 'Strong' : 'Very strong';
      return 'Entropy: ' + entropy.toFixed(1) + ' bits\nStrength: ' + strength;
    }
    case 'cors-preflight-inspector': {
      const lower = input.toLowerCase();
      const method = input.match(/access-control-request-method:\s*([^\r\n]+)/i)?.[1]?.trim() || 'GET';
      const origin = input.match(/origin:\s*([^\r\n]+)/i)?.[1]?.trim() || 'unknown';
      const allowed = lower.includes('access-control-allow-origin');
      return 'Origin: ' + origin + '\nRequested method: ' + method + '\nCORS response header: ' + (allowed ? 'present' : 'missing');
    }
    default:
      return null;
  }
};


const roiBatch19: Handler = (tool, input) => {
  switch (tool.id) {
    case 'json-formatter': return JSON.stringify(JSON.parse(input), null, 2);
    case 'json-minifier': return JSON.stringify(JSON.parse(input));
    case 'jwt-debugger': {
      const parts = input.trim().split('.');
      if (parts.length !== 3) throw new Error('JWT must contain header, payload, and signature parts.');
      const decode = (part: string) => decodeBase64Utf8(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '='));
      return 'Header:\n' + JSON.stringify(JSON.parse(decode(parts[0])), null, 2) +
        '\nPayload:\n' + JSON.stringify(JSON.parse(decode(parts[1])), null, 2) +
        '\nSignature: ' + parts[2];
    }
    case 'markdown-previewer': {
      let out = encodeHtml(input);
      out = out.replace(/^###### (.+)$/gm, '<h6>$1</h6>').replace(/^##### (.+)$/gm, '<h5>$1</h5>')
        .replace(/^#### (.+)$/gm, '<h4>$1</h4>').replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>').replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/\x60([^\x60]+)\x60/g, '<code>$1</code>')
        .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
      return out.split(/\r?\n/).map(line => /^<h\d|^<strong|^<em|^<code|^<a/.test(line) ? line : line ? '<p>' + line + '</p>' : '').filter(Boolean).join('\n');
    }
    case 'punycode-converter': {
      const value = input.trim();
      if (!value) return '';
      return new URL(/^https?:\/\//i.test(value) ? value : 'http://' + value).hostname;
    }
    default: return null;
  }
};


const roiBatch20: Handler = (tool, input) => {
  switch (tool.id) {
    case 'sha256-hash':
      return sha256Hex(input);
    case 'hmac-sha256': {
      const lines = input.split(/\r?\n/);
      if (lines.length < 2 || !lines[0]) throw new Error('Use secret on line 1 and message on line 2.');
      return hmacSha256Hex(lines[0], lines.slice(1).join('\n'));
    }
    case 'uuid-v7-generator': {
      const now = Date.now();
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      bytes[0] = (now / 0x10000000000) & 0xff;
      bytes[1] = (now / 0x100000000) & 0xff;
      bytes[2] = (now / 0x1000000) & 0xff;
      bytes[3] = (now / 0x10000) & 0xff;
      bytes[4] = (now / 0x100) & 0xff;
      bytes[5] = now & 0xff;
      bytes[6] = (bytes[6] & 0x0f) | 0x70;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
      return hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20);
    }
    default: return null;
  }
};


const roiBatch21: Handler = (tool, input) => {
  switch (tool.id) {
    case 'hash-identifier': {
      const value = input.trim();
      if (!value) throw new Error('Enter a hash string.');
      const compact = value.replace(/\s+/g, '');
      const candidates = compact.length === 32 && /^[0-9a-f]+$/i.test(compact) ? ['MD5', 'NTLM'] :
        compact.length === 40 && /^[0-9a-f]+$/i.test(compact) ? ['SHA-1', 'RIPEMD-160'] :
        compact.length === 64 && /^[0-9a-f]+$/i.test(compact) ? ['SHA-256', 'SHA3-256', 'BLAKE2s-256'] :
        compact.length === 128 && /^[0-9a-f]+$/i.test(compact) ? ['SHA-512', 'SHA3-512', 'BLAKE2b-512'] : [];
      return candidates.length ? 'Possible algorithms: ' + candidates.join(', ') : 'No common fixed-length hexadecimal hash pattern detected.';
    }
    case 'rsa-key-template':
      return '-----BEGIN PRIVATE KEY-----\nREPLACE_WITH_SECURELY_GENERATED_KEY_MATERIAL\n-----END PRIVATE KEY-----\n\nNote: This is a template only; never use placeholder material as a real private key.';
    case 'password-generator': {
      const length = Math.trunc(Number(input.trim() || 16));
      if (length < 8 || length > 128) throw new Error('Password length must be between 8 and 128.');
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
      const bytes = crypto.getRandomValues(new Uint8Array(length));
      return Array.from(bytes, b => chars[b % chars.length]).join('');
    }
    case 'random-pin-generator': {
      const length = Math.trunc(Number(input.trim() || 6));
      if (length < 4 || length > 12) throw new Error('PIN length must be between 4 and 12.');
      const bytes = crypto.getRandomValues(new Uint8Array(length));
      return Array.from(bytes, b => String(b % 10)).join('');
    }
    case 'oauth2-auth-url-builder': {
      let data: { authorizationEndpoint?: string; clientId?: string; redirectUri?: string; scope?: string; state?: string };
      try { data = JSON.parse(input) as typeof data; } catch { throw new Error('Input must be JSON with authorizationEndpoint, clientId, and redirectUri.'); }
      const authorizationEndpoint = typeof data.authorizationEndpoint === 'string' ? data.authorizationEndpoint.trim() : '';
      const clientId = typeof data.clientId === 'string' ? data.clientId.trim() : '';
      const redirectUri = typeof data.redirectUri === 'string' ? data.redirectUri.trim() : '';
      if (!authorizationEndpoint || !clientId || !redirectUri) {
        throw new Error('authorizationEndpoint, clientId, and redirectUri are required.');
      }
      let url: URL;
      try { url = new URL(authorizationEndpoint); } catch { throw new Error('authorizationEndpoint must be an absolute URL.'); }
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('client_id', clientId);
      url.searchParams.set('redirect_uri', redirectUri);
      url.searchParams.set('scope', data.scope || 'openid');
      if (data.state) url.searchParams.set('state', data.state);
      return url.toString();
    }
    default: return null;
  }
};

const roiBatch22: Handler = (tool, input) => {
  switch (tool.id) {
    case 'color-palette-generator': {
      const clean = input.trim().replace(/^#/, '');
      if (!/^[0-9a-f]{6}$/i.test(clean)) throw new Error('Enter a six-digit HEX color such as #3366FF.');
      const base = parseInt(clean, 16);
      const channel = (shift: number) => (base >> shift) & 255;
      const mix = (target: number, amount: number, value: number) => Math.round(value * (1 - amount) + target * amount);
      const toHex = (r: number, g: number, b: number) => '#' + [r,g,b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('').toUpperCase();
      const r = channel(16), g = channel(8), b = channel(0);
      return ['Base: #' + clean.toUpperCase(),
        'Light 20%: ' + toHex(mix(255, .2, r), mix(255, .2, g), mix(255, .2, b)),
        'Light 40%: ' + toHex(mix(255, .4, r), mix(255, .4, g), mix(255, .4, b)),
        'Dark 20%: ' + toHex(mix(0, .2, r), mix(0, .2, g), mix(0, .2, b)),
        'Dark 40%: ' + toHex(mix(0, .4, r), mix(0, .4, g), mix(0, .4, b)),
        'RGB: ' + r + ', ' + g + ', ' + b].join('\n');
    }
    case 'contrast-checker': {
      const colors = input.match(/#[0-9a-f]{3,6}/gi) ?? [];
      if (colors.length < 2) throw new Error('Enter two HEX colors, e.g. #000000 #ffffff.');
      return contrastRatio(colors[0], colors[1]);
    }
    case 'css-box-shadow-generator': {
      const values = input.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
      if (values.length < 2) throw new Error('Enter X and Y offsets, e.g. 0 4 12 0 #00000033.');
      const [x, y, blur = 12, spread = 0] = values;
      const color = input.match(/#[0-9a-f]{3,8}/i)?.[0] ?? '#00000033';
      return 'box-shadow: ' + x + 'px ' + y + 'px ' + blur + 'px ' + spread + 'px ' + color + ';';
    }
    case 'css-flexbox-playground': {
      const lines = input.split(/\r?\n/).map(v => v.trim()).filter(Boolean);
      const direction = /^(row|column|row-reverse|column-reverse)$/.test(lines[0] ?? '') ? lines[0] : 'row';
      const justify = /^(flex-start|center|flex-end|space-between|space-around|space-evenly)$/.test(lines[1] ?? '') ? lines[1] : 'center';
      const align = /^(stretch|flex-start|center|flex-end|baseline)$/.test(lines[2] ?? '') ? lines[2] : 'center';
      const gap = Number(lines[3]) || 16;
      return '.flex-container {\n  display: flex;\n  flex-direction: ' + direction + ';\n  justify-content: ' + justify + ';\n  align-items: ' + align + ';\n  gap: ' + gap + 'px;\n}';
    }
    case 'css-grid-generator': {
      const lines = input.split(/\r?\n/).map(v => v.trim());
      const columns = Math.max(1, Math.min(12, Math.trunc(Number(lines[0]) || 3)));
      const rows = Math.max(1, Math.min(12, Math.trunc(Number(lines[1]) || 2)));
      const gap = Math.max(0, Math.min(200, Number(lines[2]) || 16));
      return '.grid-container {\n  display: grid;\n  grid-template-columns: repeat(' + columns + ', minmax(0, 1fr));\n  grid-template-rows: repeat(' + rows + ', auto);\n  gap: ' + gap + 'px;\n}';
    }
    default:
      return null;
  }
};

const roiBatch23: Handler = (tool, input) => {
  switch (tool.id) {
    case 'json-to-yaml':
      return jsonToYaml(input);
    case 'yaml-to-json':
      return yamlToJson(input);
    case 'query-string-to-json': {
      const raw = input.trim().replace(/^\?/, '');
      if (!raw) throw new Error('Enter a query string such as ?page=2&sort=name.');
      const params = new URLSearchParams(raw);
      const out: Record<string, string | string[]> = {};
      params.forEach((value, key) => {
        const previous = out[key];
        out[key] = previous === undefined ? value : Array.isArray(previous) ? [...previous, value] : [previous, value];
      });
      return JSON.stringify(out, null, 2);
    }
    case 'json-to-query-string': {
      const data = JSON.parse(input);
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Input must be a JSON object.');
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        if (Array.isArray(value)) value.forEach(item => params.append(key, String(item)));
        else if (value !== null && value !== undefined) params.set(key, String(value));
      }
      return '?' + params.toString();
    }
    case 'json-size-calculator': {
      const data = JSON.parse(input);
      const compact = JSON.stringify(data);
      const pretty = JSON.stringify(data, null, 2);
      const bytes = new TextEncoder().encode(compact).length;
      return 'Compact characters: ' + compact.length + '\nUTF-8 bytes: ' + bytes + '\nPretty characters: ' + pretty.length;
    }
    case 'timestamp-converter': {
      const value = input.trim();
      const date = /^\d+$/.test(value) ? new Date(Number(value) < 1e12 ? Number(value) * 1000 : Number(value)) : new Date(value);
      if (!Number.isFinite(date.getTime())) throw new Error('Enter a valid ISO date or Unix timestamp.');
      return 'ISO 8601: ' + date.toISOString() + '\nUnix seconds: ' + Math.floor(date.getTime() / 1000) + '\nUnix milliseconds: ' + date.getTime();
    }
    default:
      return null;
  }
};

const roiBatch24: Handler = (tool, input) => {
  switch (tool.id) {
    case 'number-base-converter': {
      const parts = input.trim().split(/\s+/);
      if (parts.length < 3) throw new Error('Enter number, source base, target base, e.g. FF 16 10.');
      const [value, sourceRaw, targetRaw] = parts;
      const source = Number(sourceRaw), target = Number(targetRaw);
      if (!Number.isInteger(source) || !Number.isInteger(target) || source < 2 || source > 36 || target < 2 || target > 36) throw new Error('Bases must be integers from 2 to 36.');
      const decimal = parseInt(value, source);
      if (!Number.isFinite(decimal)) throw new Error('Invalid number for the selected source base.');
      return 'Decimal: ' + decimal + '\nBase ' + target + ': ' + decimal.toString(target).toUpperCase();
    }
    case 'random-number-range': {
      const parts = input.trim().split(/\s+/).map(Number);
      if (parts.length < 2 || !parts.every(Number.isFinite)) throw new Error('Enter min and max, e.g. 1 100.');
      const [min, max] = parts;
      if (min > max) throw new Error('Minimum cannot exceed maximum.');
      const random = Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min) + 1)) + Math.ceil(min);
      return String(random);
    }
    case 'hex-to-rgb-code': {
      const clean = input.trim().replace(/^#/, '');
      const expanded = clean.length === 3 ? clean.split('').map(x => x+x).join('') : clean;
      if (!/^[0-9a-f]{6}$/i.test(expanded)) throw new Error('Enter a 3- or 6-digit HEX color.');
      return 'RGB: ' + [0,2,4].map(i => parseInt(expanded.slice(i,i+2),16)).join(', ');
    }
    case 'format-currency-intl': {
      const [amountRaw, currency='USD', locale='en-US'] = input.trim().split(/\s+/);
      const amount = Number(amountRaw);
      if (!Number.isFinite(amount)) throw new Error('Enter amount, currency, and optional locale, e.g. 1234.5 INR en-IN.');
      try { return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount); }
      catch { throw new Error('Invalid currency or locale.'); }
    }
    case 'format-number-compact': {
      const [valueRaw, locale='en-US'] = input.trim().split(/\s+/);
      const value = Number(valueRaw);
      if (!Number.isFinite(value)) throw new Error('Enter a valid number, e.g. 1250000 en-US.');
      return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 2 }).format(value);
    }
    default:
      return null;
  }
};

const releaseHardeningBatch: Handler = (tool, input) => {
  switch (tool.id) {
    case 'url-encoder-decoder': {
      const lines = input.split(/\r?\n/);
      const mode = (lines[0] || '').trim().toLowerCase();
      const explicitMode = ['encode', 'encodeuri', 'encodeuricomponent', 'decode', 'decodeuri', 'decodeuricomponent'].includes(mode);
      const value = explicitMode ? lines.slice(1).join('\n') : input;
      if (mode.startsWith('decode')) {
        try { return decodeURIComponent(value); } catch { throw new Error('Enter valid percent-encoded URL text.'); }
      }
      return encodeURIComponent(value);
    }
    case 'sha1-hash':
      return sha1Hex(input);
    case 'md5-hash':
      return md5Hex(input);
    case 'regex-tester': {
      const [patternLine, ...textLines] = input.split(/\r?\n/);
      if (!patternLine) throw new Error('Enter a regex pattern on the first line, followed by text to test.');
      try {
        const pattern = new RegExp(patternLine, 'g');
        const matches = [...textLines.join('\n').matchAll(pattern)].map(match => match[0]);
        return matches.length ? matches.join('\n') : 'No matches.';
      } catch {
        throw new Error('Invalid regular expression.');
      }
    }
    case 'ascii-art-banner': {
      const glyphs: Record<string, string[]> = {
        A:['010','101','111','101','101'], B:['110','101','110','101','110'],
        C:['011','100','100','100','011'], D:['110','101','101','101','110'],
        E:['111','100','110','100','111'], F:['111','100','110','100','100'],
        G:['011','100','101','101','011'], H:['101','101','111','101','101'],
        I:['111','010','010','010','111'], J:['001','001','001','101','010'],
        K:['101','101','110','101','101'], L:['100','100','100','100','111'],
        M:['101','111','111','101','101'], N:['101','111','111','111','101'],
        O:['111','101','101','101','111'], P:['110','101','110','100','100'],
        Q:['111','101','101','111','001'], R:['110','101','110','101','101'],
        S:['011','100','010','001','110'], T:['111','010','010','010','010'],
        U:['101','101','101','101','111'], V:['101','101','101','101','010'],
        W:['101','101','111','111','101'], X:['101','101','010','101','101'],
        Y:['101','101','010','010','010'], Z:['111','001','010','100','111'],
        '0':['111','101','101','101','111'], '1':['010','110','010','010','111'],
        '2':['110','001','111','100','111'], '3':['110','001','111','001','110'],
        '4':['101','101','111','001','001'], '5':['111','100','110','001','110'],
        '6':['011','100','110','101','010'], '7':['111','001','010','010','010'],
        '8':['010','101','010','101','010'], '9':['010','101','011','001','110'],
        ' ':['000','000','000','000','000'], '?':['110','001','010','000','010'],
        '!':['010','010','010','000','010'], '.':['000','000','000','000','010'],
        '-':['000','000','111','000','000'], '_':['000','000','000','000','111'],
      };
      const chars = [...input.trim().toUpperCase()];
      if (!chars.length) throw new Error('Enter text to turn into an ASCII banner.');
      const rows = Array.from({ length: 5 }, (_, row) => chars.map(char =>
        (glyphs[char] ?? glyphs['?'])[row].replace(/1/g, '█').replace(/0/g, ' ')
      ).join(' '));
      return rows.join('\n');
    }
    default:
      return null;
  }
};

const handlers: Handler[] = [
  releaseHardeningBatch,
  roiBatch24,
  roiBatch23,
  roiBatch22,
  roiBatch21,
  roiBatch20,
  roiBatch19,
  roiBatch18,
  roiBatch13,
  roiBatch12,
  roiBatch11,
  roiBatch10,
  roiBatch9,
  roiBatch8,
  roiTextBatch1,
  roiBatch2,
  roiBatch3,
  roiBatch4,
  roiBatch5,
  roiBatch6,
  roiBatch7,
  ...baseHandlers.slice(1),
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

    if (tool.id === 'regex-tester') {
      const [patternLine, ...textLines] = input.split(/\r?\n/);
      if (!patternLine) return { output: '', error: 'Enter a regex pattern.' };
      try {
        const match = new RegExp(patternLine, 'g');
        const textValue = textLines.join('\n');
        const matches = [...textValue.matchAll(match)].map((m) => m[0]);
        return { output: matches.length ? matches.join('\n') : 'No matches.' };
      } catch { return { output: '', error: 'Invalid regular expression.' }; }
    }

    if (tool.id === 'text-diff-checker') {
      const [left = '', right = ''] = input.split(/\r?\n---\r?\n/);
      const a = left.split(/\r?\n/), b = right.split(/\r?\n/);
      const max = Math.max(a.length, b.length);
      const lines = Array.from({ length: max }, (_, i) => a[i] === b[i] ? `  ${a[i] ?? ''}` : `- ${a[i] ?? ''}\n+ ${b[i] ?? ''}`);
      return { output: lines.join('\n') };
    }

    if (tool.id === 'uuid-generator' || tool.id === 'nanoid-generator') {
      const source = input.trim() || 'coding-super-hub';
      let hash = 2166136261;
      for (const ch of source) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
      const hex = (hash >>> 0).toString(16).padStart(8, '0');
      if (tool.id === 'uuid-generator') return { output: `00000000-0000-4000-8000-${hex.padStart(12, '0')}` };
      const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
      let n = hash >>> 0, out = '';
      for (let i = 0; i < 21; i++) { out += alphabet[n % alphabet.length]; n = Math.floor(n / alphabet.length) || ((n ^ (i + 1) * 2654435761) >>> 0); }
      return { output: out };
    }

    if (tool.id === 'lorem-ipsum-generator') {
      const count = Math.min(20, Math.max(1, Number.parseInt(input.trim(), 10) || 3));
      const words = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua'.split(' ');
      const out = Array.from({ length: count }, (_, i) => words[i % words.length]).join(' ');
      return { output: out.charAt(0).toUpperCase() + out.slice(1) + '.' };
    }

    if (tool.id === 'random-string-generator') {
      const length = Math.min(128, Math.max(1, Number.parseInt(input.trim(), 10) || 16));
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let seed = 0;
      for (const ch of input) seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619);
      let out = '';
      for (let i = 0; i < length; i++) { seed = Math.imul(seed ^ (i + 1), 16777619); out += alphabet[(seed >>> 0) % alphabet.length]; }
      return { output: out };
    }

    if (tool.id === 'cron-expression-builder') {
      const value = input.trim() || '* * * * *';
      const known: Record<string, string> = { '* * * * *': 'Every minute', '0 * * * *': 'At minute 0 of every hour', '0 0 * * *': 'Every day at 00:00', '0 0 * * 0': 'Every Sunday at 00:00' };
      return { output: known[value] ?? `Cron: ${value}\nFormat: minute hour day-of-month month day-of-week` };
    }

    if (tool.id === 'csv-column-extractor') {
      const lines = input.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) return { output: '', error: 'Provide a CSV header and at least one data row.' };
      const index = Math.max(0, Number.parseInt(lines[0].trim(), 10) || 0);
      return { output: lines.slice(1).map((line) => line.split(',')[index] ?? '').join('\n') };
    }

    if (tool.id === 'ascii-art-banner') {
      const lines = input.split(/\r?\n/).filter(Boolean).slice(0, 12);
      const text = lines.join(' ');
      return { output: text.split('').map(ch => ch === ' ' ? ' ' : '█').join('') };
    }

    if (tool.id === 'unicode-character-inspector') {
      const chars = [...input].slice(0, 200);
      return { output: chars.map(ch => {
        const code = ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0');
        const bytes = Array.from(new TextEncoder().encode(ch), byte => byte.toString(16).padStart(2, '0')).join(' ');
        return ch + ' — U+' + code + ' — UTF-8: ' + bytes;
      }).join('\n') };
    }

    if (tool.id === 'remove-html-tags') {
      return { output: input.replace(/<[^>]*>/g, '') };
    }

    if (tool.id === 'text-prefix-suffix') {
      const [prefix = '', suffix = '', ...textLines] = input.split(/\r?\n/);
      const text = textLines.join('\n');
      return { output: text.split(/\r?\n/).map(line => prefix + line + suffix).join('\n') };
    }

    if (tool.id === 'escape-json-string') {
      return { output: JSON.stringify(input).slice(1, -1) };
    }

    if (tool.id === 'slug-to-text') {
      return { output: input.trim().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim() };
    }

    if (tool.id === 'leet-speak-generator') {
      const map: Record<string, string> = { a: '4', e: '3', i: '1', o: '0', s: '5', g: '6', b: '8' };
      return { output: input.replace(/[aeiosgb]/gi, (ch) => map[ch.toLowerCase()] ?? ch) };
    }

    if (tool.id === 'upside-down-text') {
      const map: Record<string, string> = { a: 'ɐ', b: 'q', c: 'ɔ', d: 'p', e: 'ǝ', f: 'ɟ', g: 'ƃ', h: 'ɥ', i: 'ᴉ', j: 'ɾ', k: 'ʞ', l: 'ʃ', m: 'ɯ', n: 'u', o: 'o', p: 'd', q: 'b', r: 'ɹ', s: 's', t: 'ʇ', u: 'n', v: 'ʌ', w: 'ʍ', x: 'x', y: 'ʎ', z: 'z', '0': '0', '1': 'Ɩ', '2': '2', '3': 'Ɛ', '4': 'ㄣ', '5': '5', '6': '9', '7': 'ㄥ', '8': '8', '9': '6' };
      return { output: [...input].reverse().map((ch) => map[ch.toLowerCase()] ?? ch).join('') };
    }

    if (tool.id === 'zalgo-text-generator') {
      const marks = ['\u0301', '\u0308', '\u0336'];
      return { output: [...input].map((ch, i) => ch + (/[A-Za-z]/.test(ch) ? marks[i % marks.length] : '')).join('') };
    }

    if (tool.id === 'json-path-finder') {
      try {
        const [pathLine, ...jsonLines] = input.split(/\r?\n/);
        const data = JSON.parse(jsonLines.join('\n') || '{}');
        const path = pathLine.trim().replace(/^\$\.?/, '').split('.').filter(Boolean);
        let current: unknown = data;
        for (const key of path) current = (current as Record<string, unknown>)?.[key];
        return { output: JSON.stringify(current, null, 2) };
      } catch { return { output: '', error: 'Invalid JSON or JSONPath.' }; }
    }

    return { output: '', error: 'Coming soon — this catalog entry does not have a verified execution algorithm yet.' };
  } catch (error) {
    return { output: '', error: error instanceof Error ? error.message : 'Unable to process input.' };
  }
}

export { defaultInput };
