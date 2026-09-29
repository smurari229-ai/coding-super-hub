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

const handlers: Handler[] = [
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
  (tool, input) => has(tool, 'json yaml', 'json to yaml', 'yaml json') ? (has(tool, 'yaml to json') ? yamlToJson(input) : jsonToYaml(input)) : null,
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
    case 'speed-distance-time': {if(n.length<2)throw new Error('Enter two numeric values.');return 'Ratio: '+n[0]/n[1]+'\nProduct: '+n[0]*n[1];}
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
    case 'average-mean-median-mode': return null;
    case 'big-o-notation-cheatsheet': return 'O(1): constant\nO(log n): binary search\nO(n): single pass\nO(n log n): efficient comparison sort\nO(n²): nested pairwise loops\nO(2^n): subset-style recursion';
    case 'modulo-arithmetic-calc': return null;
    case 'logarithm-calculator': return null;
    case 'pythagorean-theorem-calc': return null;
    case 'circle-area-perimeter': return null;
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
