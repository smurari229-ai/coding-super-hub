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
    const rows = parseCsv(input);
    if (rows.length < 2) throw new Error('CSV needs a header row and data.');
    const column = rows[0].findIndex(header => header.trim().toLowerCase() === (input.split(/\r?\n/).pop() ?? '').trim().toLowerCase());
    if (column < 0) throw new Error('For column extraction, append the exact column name as the final line.');
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
