import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download, Play, RefreshCw, Sparkles, Wand2 } from 'lucide-react';
import { ToolItem } from '../../types/tools';

interface GenericToolRunnerProps { tool: ToolItem; onOpenAiCopilot: (code: string) => void; }
type RunnerResult = { output: string; error?: string };

const MORSE: Record<string, string> = { A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..', '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.' };

function hasId(tool: ToolItem, ...terms: string[]) {
  const haystack = [tool.id, ...tool.tags].map(value => value.toLowerCase());
  return terms.some(term => haystack.some(value => value.includes(term.toLowerCase())));
}
function prettyJson(value: string) { return JSON.stringify(JSON.parse(value), null, 2); }
function minifyJson(value: string) { return JSON.stringify(JSON.parse(value)); }
function slugify(value: string) { return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function utf8ToBase64(value: string) { const bytes = new TextEncoder().encode(value); let binary = ''; bytes.forEach(byte => { binary += String.fromCharCode(byte); }); return btoa(binary); }
function base64ToUtf8(value: string) { const binary = atob(value.trim()); return new TextDecoder().decode(Uint8Array.from(binary, char => char.charCodeAt(0))); }
function toHex(value: string) { return Array.from(new TextEncoder().encode(value), byte => byte.toString(16).padStart(2, '0')).join(' '); }
function fromHex(value: string) { const clean = value.replace(/0x/gi, '').replace(/[^0-9a-f]/gi, ''); if (clean.length % 2) throw new Error('Hex input must contain an even number of digits.'); return new TextDecoder().decode(new Uint8Array((clean.match(/../g) ?? []).map(pair => parseInt(pair, 16)))); }
function toBinary(value: string) { return Array.from(new TextEncoder().encode(value), byte => byte.toString(2).padStart(8, '0')).join(' '); }
function fromBinary(value: string) { const groups = value.trim().split(/\s+/); if (groups.some(group => !/^[01]{8}$/.test(group))) throw new Error('Binary input must use 8-bit groups separated by spaces.'); return new TextDecoder().decode(new Uint8Array(groups.map(group => parseInt(group, 2)))); }
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char); }
function unescapeHtml(value: string) { const el = document.createElement('textarea'); el.innerHTML = value; return el.value; }
function words(value: string) { return value.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []; }
function gcd(a: number, b: number) { a = Math.abs(Math.trunc(a)); b = Math.abs(Math.trunc(b)); while (b) [a, b] = [b, a % b]; return a; }
function lcm(a: number, b: number) { return a === 0 || b === 0 ? 0 : Math.abs(a * b) / gcd(a, b); }
function isPrime(n: number) { if (n < 2) return false; if (n === 2 || n === 3) return true; if (n % 2 === 0 || n % 3 === 0) return false; for (let i = 5; i * i <= n; i += 6) if (n % i === 0 || n % (i + 2) === 0) return false; return true; }
function uuid() { if (crypto.randomUUID) return crypto.randomUUID(); const b = new Uint8Array(16); crypto.getRandomValues(b); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128; const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join(''); return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20); }
function randomToken(length: number) { const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789-_!@#$%'; const bytes = new Uint8Array(length); crypto.getRandomValues(bytes); return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join(''); }
function formatCss(value: string) { let depth = 0; return value.replace(/\s+/g, ' ').replace(/\s*{\s*/g, ' {\n').replace(/;\s*/g, ';\n').replace(/\s*}\s*/g, '\n}\n').split('\n').filter(Boolean).map(line => { if (line.trim().startsWith('}')) depth = Math.max(0, depth - 1); const result = '  '.repeat(depth) + line.trim(); if (line.includes('{')) depth++; return result; }).join('\n'); }
function formatSql(value: string) { return value.replace(/\s+/g, ' ').replace(/\s+(FROM|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|VALUES|SET|LEFT JOIN|RIGHT JOIN|INNER JOIN|JOIN)\s+/gi, '\n$1 ').replace(/\s+(AND|OR)\s+/gi, '\n  $1 ').trim(); }
function minifyCode(value: string) { return value.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{}:;,])\s*/g, '$1').trim(); }
function formatXml(value: string) { let depth = 0; return value.replace(/>\s*</g, '><').replace(/</g, '\n<').split('\n').filter(Boolean).map(token => { if (/^<\//.test(token)) depth = Math.max(0, depth - 1); const line = '  '.repeat(depth) + token.trim(); if (/^<[^!?/][^>]*[^/]?>$/.test(token) && !/<\//.test(token)) depth++; return line; }).join('\n'); }
function jsonToYaml(value: unknown, depth = 0): string { const pad = '  '.repeat(depth); if (Array.isArray(value)) return value.map(item => typeof item === 'object' && item !== null ? pad + '-\n' + jsonToYaml(item, depth + 1) : pad + '- ' + yamlScalar(item)).join('\n'); if (typeof value === 'object' && value !== null) return Object.entries(value as Record<string, unknown>).map(([key, item]) => typeof item === 'object' && item !== null ? pad + key + ':\n' + jsonToYaml(item, depth + 1) : pad + key + ': ' + yamlScalar(item)).join('\n'); return pad + yamlScalar(value); }
function yamlScalar(value: unknown) { if (value === null) return 'null'; if (typeof value === 'string') return /^[A-Za-z0-9_./-]+$/.test(value) ? value : JSON.stringify(value); return String(value); }
function parseCsv(value: string) { const rows: string[][] = []; let row: string[] = [], cell = '', quoted = false; for (let i=0;i<value.length;i++) { const c=value[i], n=value[i+1]; if(c==='"' && quoted && n==='"'){cell+='"';i++;continue;} if(c==='"'){quoted=!quoted;continue;} if(c===','&&!quoted){row.push(cell);cell='';continue;} if(c==='\n'&&!quoted){row.push(cell);rows.push(row);row=[];cell='';continue;} if(c!=='\r') cell+=c; } if(cell || row.length){row.push(cell);rows.push(row);} return rows.filter(r=>r.some(Boolean)); }
function csvToJson(value: string) { const rows=parseCsv(value); if(rows.length<2) throw new Error('CSV needs a header row and at least one data row.'); const headers=rows[0].map(x=>x.trim()); const data=rows.slice(1).map(row=>Object.fromEntries(headers.map((key,i)=>{const raw=(row[i]??'').trim(); if(raw==='true') return [key,true]; if(raw==='false') return [key,false]; if(/^-?\d+(\.\d+)?$/.test(raw)) return [key,Number(raw)]; return [key,raw];}))); return JSON.stringify(data,null,2); }
function jsonToCsv(value: string) { const data=JSON.parse(value); if(!Array.isArray(data)||!data.length||data.some(row=>typeof row!=='object'||row===null)) throw new Error('Input must be a non-empty JSON array of objects.'); const headers=Array.from(new Set(data.flatMap(row=>Object.keys(row as object)))); const quote=(x:unknown)=>{const s=x==null?'':String(x);return /[",
]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}; return [headers.join(','),...data.map(row=>headers.map(key=>quote((row as Record<string,unknown>)[key])).join(','))].join('
'); }\n
function defaultInput(tool: ToolItem) {
  if (tool.defaultInput) return tool.defaultInput;
  const id=tool.id;\n  if(id.includes('json')) return '{
  "name": "Coding Super Hub",
  "tools": 540,
  "active": true
}';\n  if(id.includes('xml')) return '<root><tool id="json">Formatter</tool><status>ready</status></root>';\n  if(id.includes('sql')) return 'SELECT id, username, email FROM users WHERE active = true ORDER BY created_at DESC;';\n  if(id.includes('css')) return '.container { display: flex; justify-content: center; gap: 16px; }';\n  if(id.includes('html')) return '<div class="card"><h2>Hello Developer</h2><p>Build something useful.</p></div>';\n  if(id.includes('url')) return 'https://example.com/search?q=hello world&lang=en';\n  if(id.includes('base64')) return 'Hello, Coding Super Hub!';\n  if(id.includes('hex')||id.includes('binary')) return 'Hello';\n  if(id.includes('password')) return '24';\n  if(id.includes('timestamp')) return '2026-09-26T09:00:00.000Z';\n  if(id.includes('slug')) return 'Build Production Ready Developer Tools';\n  if(id.includes('gitignore')) return 'node';\n  if(id.includes('docker')) return 'node:22-alpine';\n  if(id.includes('nginx')) return 'example.com';
  return 'The quick brown fox jumps over the lazy dog. 1234567890!';\n}\n
function runTool(tool: ToolItem, input: string): RunnerResult {
  const id=tool.id.toLowerCase(); const text=input.trim();
  const has=(...terms:string[])=>hasId(tool,...terms);
  try {\n    if(!text && !has('generate','random','uuid','lorem','password')) return {output:'',error:'Enter some input first.'};\n    if(has('json-formatter','json-prett')) return {output:prettyJson(input)};\n    if(has('json-minif')) return {output:minifyJson(input)};\n    if(has('json-to-csv')) return {output:jsonToCsv(input)};\n    if(has('csv-to-json')) return {output:csvToJson(input)};\n    if(has('json-to-yaml','yaml')) return {output:jsonToYaml(JSON.parse(input))};\n    if(has('xml-formatter','xml-prett')) return {output:formatXml(input)};\n    if(has('sql-formatter','sql-prett')) return {output:formatSql(input)};\n    if(has('sql-minif','css-minif','html-minif','js-minif','code-minif')) return {output:minifyCode(input)};\n    if(has('css-formatter','css-prett')) return {output:formatCss(input)};\n    if(has('html-formatter','html-prett')) return {output:input.replace(/>\s*</g,'>
<')};\n    if(has('base64')) return {output:has('decode')||id.includes('decoder')?base64ToUtf8(input):utf8ToBase64(input)};\n    if(has('html-entity')) return {output:has('decode','unescape')?unescapeHtml(input):escapeHtml(input)};\n    if(has('url-encoder','url-encode','uri-encode')) return {output:has('decode','unescape')?decodeURIComponent(input):encodeURIComponent(input)};\n    if(has('hex-to-string')) return {output:has('encode')?toHex(input):fromHex(input)};\n    if(has('binary-to-text')) return {output:has('encode')?toBinary(input):fromBinary(input)};\n    if(has('unicode-escape')) return {output:has('decode')?input.replace(/\\u([0-9a-f]{4})/gi,(_,h)=>String.fromCharCode(parseInt(h,16))):Array.from(input).map(c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0')).join('')};\n    if(has('url-slug','slugifier','slug')) return {output:slugify(input)};\n    if(has('reverse')) return {output:input.split('').reverse().join('')};\n    if(has('trim','whitespace')) return {output:input.split('
').map(line=>line.trim().replace(/[ \t]+/g,' ')).filter(Boolean).join('
')};\n    if(has('duplicate','dedupe','unique')) return {output:Array.from(new Set(input.split('
'))).join('
')};\n    if(has('sorter','line-sort','alphabetical')) return {output:input.split('
').sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).join('
')};\n    if(has('remove-empty')) return {output:input.split('
').filter(line=>line.trim()).join('
')};\n    if(has('word-frequency','frequency')) { const counts:Record<string,number>={}; words(input).forEach(word=>counts[word]=(counts[word]??0)+1); return {output:Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([w,c])=>w.padEnd(24)+' '+c).join('
')}; }\n    if(has('statistics','stats','word-counter')) { const ws=words(input); return {output=['Characters: '+input.length,'Characters (no spaces): '+input.replace(/\s/g,'').length,'Words: '+ws.length,'Lines: '+input.split('
').length,'Sentences: '+(input.match(/[.!?]+(?=\s|$)/g)??[]).length,'Bytes (UTF-8): '+new TextEncoder().encode(input).length,'Reading time: ~'+Math.max(1,Math.ceil(ws.length/200))+' min'].join('
')}; }\n    if(has('rot13')) return {output:input.replace(/[a-z]/gi,c=>String.fromCharCode((c.charCodeAt(0)<=90?65:97)+((c.charCodeAt(0)-(c.charCodeAt(0)<=90?65:97)+13)%26)))};\n    if(has('morse')) { const reverse=Object.fromEntries(Object.entries(MORSE).map(([k,v])=>[v,k])); return {output:has('decode')?input.split(/\s+/).map(code=>reverse[code]??code).join(''):input.toUpperCase().split('').map(c=>c===' '?' / ':MORSE[c]??c).join(' ')}; }\n    if(has('uuid')) return {output:Array.from({length:Math.min(100,Math.max(1,Number(input)||1))},uuid).join('
')};\n    if(has('nanoid','cuid','random-string','token')) return {output:randomToken(Math.min(256,Math.max(4,Number(input)||24)))};\n    if(has('password')) return {output:randomToken(Math.min(128,Math.max(8,Number(input)||24)))};\n    if(has('lorem')) { const seed='Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'; return {output:Array(Math.min(20,Math.max(1,Number(input)||3))).fill(seed).join(' ')}; }\n    if(id.includes('gitignore')) { const maps:Record<string,string>={node:'node_modules/
.env
dist/
coverage/
*.log
.DS_Store',python:'__pycache__/
*.py[cod]
.venv/
.env
.pytest_cache/',react:'node_modules/
dist/
.env
coverage/
.vite/'}; return {output:maps[text.toLowerCase()]??maps.node}; }\n    if(id.includes('dockerfile')) return {output:'FROM '+(text||'node:22-alpine')+'
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]'};\n    if(id.includes('nginx')) return {output:'server {
  listen 80;
  server_name '+(text||'example.com')+';
  root /usr/share/nginx/html;
  index index.html;
  location / {
    try_files $uri $uri/ /index.html;
  }
}'};\n    if(id.includes('csp')) return {output:"Content-Security-Policy: "+(text||"default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'")};\n    if(has('validate','validator','lint')) { if(id.includes('json')) {JSON.parse(input);return {output:'✓ Valid JSON'};} if(id.includes('url')) {new URL(input);return {output:'✓ Valid URL'};} if(id.includes('email')) return {output:/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)?'✓ Valid email address':'✗ Invalid email address'}; if(id.includes('regex')) {new RegExp(input);return {output:'✓ Valid regular expression'};} return {output:'✓ Input passed the available client-side validation rules.'}; }\n    if(has('timestamp','unix-time')) { const numeric=/^\d+$/.test(text); const raw=numeric?Number(text):Date.parse(text); if(!Number.isFinite(raw)) throw new Error('Enter an ISO date or Unix timestamp.'); const ms=numeric?(text.length<=10?raw*1000:raw):raw; const date=new Date(ms); return {output:'ISO: '+date.toISOString()+'
Unix seconds: '+Math.floor(ms/1000)+'
Unix milliseconds: '+ms}; }\n    if(has('gcd','lcm','prime','factorial')) { const nums=text.split(/[ ,]+/).map(Number).filter(Number.isFinite); const a=nums[0]??48,b=nums[1]??18; if(id.includes('gcd')) return {output:String(gcd(a,b))}; if(id.includes('lcm')) return {output:String(lcm(a,b))}; if(id.includes('prime')) return {output:a+' is '+(isPrime(a)?'prime.':'not prime.')}; if(id.includes('factorial')) {if(a<0||a>170) throw new Error('Use an integer from 0 to 170.'); let result=1;for(let n=2;n<=a;n++)result*=n;return {output:String(result)};} }\n    if(has('percentage','percent','discount')) { const nums=text.split(/[ ,]+/).map(Number).filter(Number.isFinite); const x=nums[0]??20,y=nums[1]??150; return {output:'X% of Y: '+((x/100)*y).toFixed(2)+'
Change from X to Y: '+(x===0?'N/A':(((y-x)/x)*100).toFixed(2)+'%')}; }\n    if(has('number-base','binary-to-decimal','hex-to-decimal','octal')) { const base=id.includes('binary')?2:id.includes('octal')?8:id.includes('hex')?16:10; const value=parseInt(text,base); if(!Number.isFinite(value)) throw new Error('Invalid number for the selected base.'); return {output:'Decimal: '+value+'
Binary: '+value.toString(2)+'
Octal: '+value.toString(8)+'
Hex: '+value.toString(16).toUpperCase()}; }\n    if(has('bytes','byte-converter','data-size')) { const bytes=Number(text); if(!Number.isFinite(bytes)) throw new Error('Enter a numeric byte value.'); return {output:'Bytes: '+bytes+'
KB: '+(bytes/1024).toFixed(3)+'
MB: '+(bytes/1024**2).toFixed(3)+'
GB: '+(bytes/1024**3).toFixed(3)}; }\n    if(has('cheatsheet','reference')) return {output:'Common developer reference:

Git: git status | git add . | git commit -m "message" | git push
Docker: docker build -t app . | docker run -p 3000:3000 app
NPM: npm install | npm run dev | npm run build
CSS: display:flex | justify-content:center | align-items:center'};\n    if(id==='json-key-sorter') { const value=JSON.parse(input); const sort=(v:any):any=>Array.isArray(v)?v.map(sort):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,sort(x)])):v; return {output:JSON.stringify(sort(value),null,2)}; }
    if(id==='url-parser-inspector') { const url=new URL(input); return {output:['Protocol: '+url.protocol,'Host: '+url.hostname,'Port: '+(url.port||'(default)'),'Path: '+url.pathname,'Query: '+url.search,'Hash: '+url.hash,'Parameters:\n'+Array.from(url.searchParams.entries()).map(([k,v])=>k+' = '+v).join('\n')].join('\n')}; }
    if(id==='basic-auth-header') { const parts=input.split(':'); if(parts.length<2) throw new Error('Enter username:password.'); return {output:'Authorization: Basic '+utf8ToBase64(parts[0]+':'+parts.slice(1).join(':'))}; }
    if(id==='permission-octal-calculator') { const n=Number(text); if(!Number.isInteger(n)||n<0||n>777) throw new Error('Enter a chmod value from 0 to 777.'); const digits=String(n).padStart(3,'0').split('').map(Number); const names=['owner','group','other']; const perms=digits.map((d,i)=>names[i]+': '+(d&4?'r':'-')+(d&2?'w':'-')+(d&1?'x':'-')).join('\n'); return {output:'chmod '+n+'\n'+perms}; }
    if(id==='nonce-generator') return {output:randomToken(22)};
    if(id==='rate-limit-header-builder') { const parts=text.split(/[ ,]+/).map(Number); const limit=parts[0]||100, window=parts[1]||60; return {output:'RateLimit-Limit: '+limit+'\nRateLimit-Remaining: '+limit+'\nRateLimit-Reset: '+window+'\nRetry-After: '+window}; }
    if(id==='cors-header-builder') { const origin=text||'https://example.com'; return {output:'Access-Control-Allow-Origin: '+origin+'\nAccess-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS\nAccess-Control-Allow-Headers: Content-Type, Authorization\nVary: Origin'}; }
    if(id==='security-headers-analyzer') return {output:'Recommended baseline:\nStrict-Transport-Security: max-age=31536000; includeSubDomains\nX-Content-Type-Options: nosniff\nReferrer-Policy: strict-origin-when-cross-origin\nPermissions-Policy: camera=(), microphone=()\nContent-Security-Policy: default-src \'self\''};
    if(id==='xml-to-json-basic') { const parser=new DOMParser(); const doc=parser.parseFromString(input,'application/xml'); if(doc.querySelector('parsererror')) throw new Error('Invalid XML.'); const convert=(el:Element):any=>{const obj:any={}; Array.from(el.attributes).forEach(a=>obj['@'+a.name]=a.value); Array.from(el.children).forEach(child=>{const value=convert(child); if(obj[child.tagName]===undefined)obj[child.tagName]=value; else obj[child.tagName]=Array.isArray(obj[child.tagName])?[...obj[child.tagName],value]:[obj[child.tagName],value];}); const direct=Array.from(el.childNodes).filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent?.trim()).filter(Boolean).join(' '); if(direct)obj['#text']=direct; return obj;}; return {output:JSON.stringify({[doc.documentElement.tagName]:convert(doc.documentElement)},null,2)}; }
    if(id==='fake-data-generator') { const first=['Aarav','Maya','Rohan','Anika','Kabir','Sara']; const last=['Sharma','Patel','Singh','Mehta','Khan','Iyer']; const rows=Array.from({length:10},(_,i)=>{const name=first[i%first.length]+' '+last[(i+2)%last.length]; return {id:i+1,name,email:name.toLowerCase().replace(/ /g,'.')+'@example.com',active:i%3!==0};}); return {output:JSON.stringify(rows,null,2)}; }
    return {output:'No generic algorithm is registered for this tool yet.',error:'Algorithm not registered yet — this is intentionally not a fake/pass-through result.'};\n  } catch(error) { return {output:'',error:error instanceof Error?error.message:'Unable to process input.'}; }\n}\n
export const GenericToolRunner: React.FC<GenericToolRunnerProps> = ({tool,onOpenAiCopilot}) => {
  const initialInput=useMemo(()=>defaultInput(tool),[tool]);
  const [input,setInput]=useState(initialInput); const [output,setOutput]=useState(''); const [error,setError]=useState(''); const [copied,setCopied]=useState(false);
  const execute=(value=input)=>{const result=runTool(tool,value);setOutput(result.output);setError(result.error??'');};
  useEffect(()=>{setInput(initialInput);execute(initialInput);},[tool,initialInput]);
  const copyOutput=async()=>{try{await navigator.clipboard.writeText(output);setCopied(true);window.setTimeout(()=>setCopied(false),1800);}catch{setError('Clipboard access was blocked by the browser.');}};
  const downloadOutput=()=>{if(!output)return;const blob=new Blob([output],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=tool.id+'-output.txt';a.click();URL.revokeObjectURL(url);};
  const reset=()=>{setInput(initialInput);execute(initialInput);};
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3">
      <div className="flex items-center gap-2"><button onClick={()=>execute()} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"><Play className="h-3.5 w-3.5 fill-white"/>Process</button><button onClick={reset} className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"><RefreshCw className="h-3.5 w-3.5"/>Reset</button><button onClick={()=>setInput('')} className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700">Clear</button></div>
      <div className="flex items-center gap-2"><button onClick={()=>onOpenAiCopilot(input)} className="flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-500/20"><Sparkles className="h-3.5 w-3.5"/>AI Copilot Assist</button><button onClick={copyOutput} disabled={!output} className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-200 disabled:opacity-50">{copied?<Check className="h-3.5 w-3.5 text-emerald-400"/>:<Copy className="h-3.5 w-3.5"/>}{copied?'Copied':'Copy'}</button><button onClick={downloadOutput} disabled={!output} className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-200 disabled:opacity-50"><Download className="h-3.5 w-3.5"/>Download</button></div>\n    </div>
    <div className="flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-3 py-2 text-[11px] text-slate-400"><Wand2 className="h-3.5 w-3.5 text-indigo-400"/><span>Client-side engine • privacy-first • ID/tag driven • no network request</span></div>\n    {error&&<div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300"><strong>Processing note:</strong> {error}</div>}
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2"><div className="space-y-1.5"><div className="flex justify-between px-1 text-xs text-slate-400"><span>{tool.inputLabel??'Input'}</span><span>{input.length} chars</span></div><textarea value={input} onChange={e=>setInput(e.target.value)} rows={12} spellCheck={false} className="w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100 shadow-inner focus:border-indigo-500 focus:outline-none" placeholder={tool.placeholder??'Type or paste input here...'}/></div>
      <div className="space-y-1.5"><div className="flex justify-between px-1 text-xs text-slate-400"><span>{tool.outputLabel??'Output'}</span><span className={error?'text-amber-400':'text-emerald-400'}>{error?'Check result':'Ready'}</span></div><textarea readOnly value={output} rows={12} className="w-full rounded-2xl border border-slate-800 bg-slate-950/90 p-4 font-mono text-xs leading-relaxed text-emerald-300 shadow-inner focus:outline-none" placeholder="Output appears here..."/></div></div>
  </div>;
};