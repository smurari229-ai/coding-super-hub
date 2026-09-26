import React, { useMemo, useState } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import { ToolItem } from '../../types/tools';

type Props = { tool: ToolItem };

const copyText = async (value: string, setCopied: (v: boolean) => void) => {
  await navigator.clipboard.writeText(value);
  setCopied(true);
  window.setTimeout(() => setCopied(false), 1500);
};

const inputClass = "w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200";

export const Phase1SecurityTools: React.FC<Props> = ({ tool }) => {
  const [copied, setCopied] = useState(false);
  const [password, setPassword] = useState('');
  const [cookieName, setCookieName] = useState('session');
  const [cookieValue, setCookieValue] = useState('example');
  const [secure, setSecure] = useState(true);
  const [httpOnly, setHttpOnly] = useState(true);
  const [sameSite, setSameSite] = useState('Strict');
  const [domain, setDomain] = useState('');
  const [path, setPath] = useState('/');
  const [maxAge, setMaxAge] = useState('');
  const [expires, setExpires] = useState('');
  const [partitioned, setPartitioned] = useState(false);
  const [limit, setLimit] = useState(100);
  const [remaining, setRemaining] = useState(90);
  const [reset, setReset] = useState(60);
  const [retryAfter, setRetryAfter] = useState(60);
  const [url, setUrl] = useState('https://user:secret@example.com:8443/search?q=hello&lang=en#docs');
  const [json, setJson] = useState('{"name":"Ada","age":36,"active":true,"skills":["TypeScript","CSS"],"profile":{"city":"Mumbai"}}');
  const [headerInput, setHeaderInput] = useState('Strict-Transport-Security: max-age=31536000; includeSubDomains\nX-Content-Type-Options: nosniff\nReferrer-Policy: strict-origin-when-cross-origin');
  const [csp, setCsp] = useState<Record<string,string>>({
    'default-src': "'self'", 'script-src': "'self'", 'style-src': "'self' 'unsafe-inline'",
    'img-src': "'self' data:", 'font-src': "'self'", 'connect-src': "'self'",
    'media-src': "'self'", 'object-src': "'none'", 'frame-src': "'none'",
    'frame-ancestors': "'none'", 'base-uri': "'self'", 'form-action': "'self'",
  });

  const id = tool.id;

  const entropy = useMemo(() => {
    const classes = [
      { name: 'lowercase', ok: /[a-z]/.test(password) },
      { name: 'uppercase', ok: /[A-Z]/.test(password) },
      { name: 'numbers', ok: /[0-9]/.test(password) },
      { name: 'symbols', ok: /[^A-Za-z0-9]/.test(password) },
    ];
    const pool = classes.filter(x => x.ok).reduce((sum, x) => sum + (x.name === 'lowercase' || x.name === 'uppercase' ? 26 : x.name === 'numbers' ? 10 : 33), 0);
    const bits = password ? password.length * Math.log2(Math.max(pool, 1)) : 0;
    const combinations = password ? Math.pow(Math.max(pool, 1), password.length) : 0;
    return { classes, pool, bits, combinations };
  }, [password]);

  const hashMatches = useMemo(() => {
    const value = password.trim();
    if (!value) return [];
    const matches: Array<{name:string; reason:string}> = [];
    if (/^[a-f0-9]{32}$/i.test(value)) matches.push({name:'MD5',reason:'32 hexadecimal characters'});
    if (/^[a-f0-9]{40}$/i.test(value)) matches.push({name:'SHA-1',reason:'40 hexadecimal characters'});
    if (/^[a-f0-9]{64}$/i.test(value)) matches.push({name:'SHA-256',reason:'64 hexadecimal characters'});
    if (/^[a-f0-9]{128}$/i.test(value)) matches.push({name:'SHA-512',reason:'128 hexadecimal characters'});
    if (/^\$2[aby]?\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value)) matches.push({name:'bcrypt',reason:'bcrypt prefix and cost structure'});
    if (/^\$argon2(id|i|d)\$/.test(value)) matches.push({name:'Argon2',reason:'Argon2 encoded prefix'});
    if (/^\$scrypt\$/.test(value)) matches.push({name:'scrypt',reason:'scrypt encoded prefix'});
    if (/^\$pbkdf2-/.test(value)) matches.push({name:'PBKDF2',reason:'PBKDF2 encoded prefix'});
    return matches;
  }, [password]);

  const schema = useMemo(() => {
    const infer = (value: unknown): Record<string, unknown> => {
      if (value === null) return { type: 'null' };
      if (Array.isArray(value)) {
        if (!value.length) return { type: 'array', items: {} };
        return { type: 'array', items: infer(value[0]) };
      }
      if (typeof value === 'string') return { type: 'string' };
      if (typeof value === 'number') return { type: Number.isInteger(value) ? 'integer' : 'number' };
      if (typeof value === 'boolean') return { type: 'boolean' };
      if (typeof value === 'object') {
        const properties: Record<string, unknown> = {};
        const required: string[] = [];
        Object.entries(value as Record<string, unknown>).forEach(([key, child]) => { properties[key] = infer(child); required.push(key); });
        return { type: 'object', properties, required, additionalProperties: false };
      }
      return {};
    };
    try {
      const value = JSON.parse(json);
      return JSON.stringify({ $schema:'https://json-schema.org/draft/2020-12/schema', ...infer(value) }, null, 2);
    } catch { return ''; }
  }, [json]);

  const parsedUrl = useMemo(() => {
    try {
      const value = new URL(url);
      return { ok: true, value };
    } catch { return { ok: false, value: null }; }
  }, [url]);

  const cspValue = useMemo(() => Object.entries(csp).filter(([, value]) => value.trim()).map(([key, value]) => key + ' ' + value.trim()).join('; '), [csp]);
  const headerAnalysis = useMemo(() => {
    const expected = ['strict-transport-security','x-content-type-options','referrer-policy','permissions-policy','content-security-policy','cross-origin-opener-policy','cross-origin-resource-policy','cross-origin-embedder-policy'];
    const present = new Set<string>();
    headerInput.split(/\r?\n/).forEach(line => {
      const index = line.indexOf(':');
      if (index > 0) present.add(line.slice(0, index).trim().toLowerCase());
    });
    return expected.map(name => ({ name, present: present.has(name) }));
  }, [headerInput]);

  const securityHeaders = useMemo(() => [
    "Strict-Transport-Security: max-age=31536000; includeSubDomains",
    "X-Content-Type-Options: nosniff",
    "Referrer-Policy: strict-origin-when-cross-origin",
    "Permissions-Policy: camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy: " + cspValue,
    "Cross-Origin-Opener-Policy: same-origin",
    "Cross-Origin-Resource-Policy: same-origin",
    "Cross-Origin-Embedder-Policy: require-corp",
  ].join('\n'), [cspValue]);

  const cookie = useMemo(() => {
    let out = `${cookieName}=${cookieValue}`;
    if (secure) out += '; Secure';
    if (httpOnly) out += '; HttpOnly';
    if (sameSite !== 'None') out += '; SameSite=' + sameSite; else out += '; SameSite=None';
    if (domain.trim()) out += '; Domain=' + domain.trim();
    if (path.trim()) out += '; Path=' + path.trim();
    if (maxAge.trim()) out += '; Max-Age=' + maxAge.trim();
    if (expires.trim()) out += '; Expires=' + expires.trim();
    if (partitioned) out += '; Partitioned';
    return out;
  }, [cookieName,cookieValue,secure,httpOnly,sameSite,domain,path,maxAge,expires,partitioned]);

  const rateHeaders = `RateLimit-Limit: ${limit}\nRateLimit-Remaining: ${remaining}\nRateLimit-Reset: ${reset}\nRetry-After: ${retryAfter}`;

  const label = (text: string, child: React.ReactNode) => <label className="space-y-1 text-xs text-slate-400"><span>{text}</span>{child}</label>;
  const box = (value: string) => <pre className="overflow-auto whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs leading-relaxed text-emerald-300">{value || 'No result yet.'}</pre>;

  if (id === 'password-entropy-meter') return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        {label('Password (processed locally; never stored by this component)', <input type="password" autoComplete="off" value={password} onChange={e=>setPassword(e.target.value)} className={inputClass} placeholder="Type a password to estimate entropy" />)}
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">{entropy.classes.map(c=><div key={c.name} className="rounded-xl border border-slate-800 p-3 text-xs"><div className="text-slate-400">{c.name}</div><div className="font-semibold text-white">{c.ok ? 'Detected' : 'Not detected'}</div></div>)}</div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-900 p-3"><div className="text-xs text-slate-500">Length</div><div className="text-lg font-bold">{password.length}</div></div><div className="rounded-xl bg-slate-900 p-3"><div className="text-xs text-slate-500">Estimated pool</div><div className="text-lg font-bold">{entropy.pool || 0}</div></div><div className="rounded-xl bg-slate-900 p-3"><div className="text-xs text-slate-500">Entropy</div><div className="text-lg font-bold">{entropy.bits.toFixed(1)} bits</div></div></div>
        <div className="mt-3 text-xs text-slate-400">Estimated combinations: {entropy.combinations ? entropy.combinations.toLocaleString() : '0'}. Strength: {entropy.bits >= 80 ? 'high' : entropy.bits >= 60 ? 'moderate' : entropy.bits >= 40 ? 'low' : 'very low'}.</div>
        <p className="mt-2 text-[11px] leading-relaxed text-amber-300">Entropy is an approximation based on detected character classes. It does not model dictionary attacks, reuse, leaked passwords, user behavior, or guarantee security.</p>
      </div>
    </div>
  );

  if (id === 'hash-identifier') return (
    <div className="space-y-4"><div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      {label('Hash string (kept client-side)', <input type="text" value={password} onChange={e=>setPassword(e.target.value)} className={inputClass} placeholder="Paste a hash value" />)}
      <div className="mt-4">{hashMatches.length ? hashMatches.map(m=><div key={m.name} className="mb-2 rounded-xl border border-slate-800 p-3"><strong className="text-white">{m.name}</strong><div className="text-xs text-slate-400">{m.reason}</div></div>) : <div className="rounded-xl border border-slate-800 p-4 text-xs text-slate-500">No structurally recognized format. Some algorithms share identical lengths; matches are possibilities, not proof.</div>}</div>
    </div></div>
  );

  if (id === 'json-schema-generator') return (
    <div className="space-y-3">{label('JSON sample', <textarea value={json} onChange={e=>setJson(e.target.value)} rows={12} className={inputClass + ' font-mono'} />)}{box(schema)}<p className="text-[11px] text-slate-500">Nested objects and arrays are recursively represented. Arrays infer their item shape from the first item; heterogeneous arrays may need manual schema refinement.</p></div>
  );

  if (id === 'url-parser-inspector') return (
    <div className="space-y-4">{label('URL', <input value={url} onChange={e=>setUrl(e.target.value)} className={inputClass} />)}
      {parsedUrl.ok && parsedUrl.value ? <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{[
        ['Protocol', parsedUrl.value.protocol], ['Username', parsedUrl.value.username || '(none)'], ['Password', parsedUrl.value.password ? '(present; hidden)' : '(none)'],
        ['Hostname', parsedUrl.value.hostname], ['Port', parsedUrl.value.port || '(default)'], ['Pathname', parsedUrl.value.pathname], ['Origin', parsedUrl.value.origin], ['Hash', parsedUrl.value.hash || '(none)']
      ].map(([k,v])=><div key={k} className="rounded-xl border border-slate-800 p-3"><div className="text-[11px] text-slate-500">{k}</div><div className="break-all font-mono text-xs text-slate-200">{v}</div></div>)}
      <div className="sm:col-span-2">{box(Array.from(parsedUrl.value.searchParams.entries()).map(([k,v])=>k+' = '+v).join('\n') || '(no query parameters)')}</div></div> : <div className="rounded-xl border border-rose-500/30 p-4 text-xs text-rose-300">Invalid URL. Use an absolute URL such as https://example.com/path?x=1.</div>}</div>
  );

  if (id === 'cookie-flags-generator') return (
    <div className="space-y-4">{label('Cookie name', <input value={cookieName} onChange={e=>setCookieName(e.target.value)} className={inputClass} />)}
      {label('Cookie value', <input value={cookieValue} onChange={e=>setCookieValue(e.target.value)} className={inputClass} />)}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{[['Secure',secure,setSecure],['HttpOnly',httpOnly,setHttpOnly],['Partitioned',partitioned,setPartitioned]].map(([name,value,setter])=><label key={String(name)} className="flex items-center gap-2 rounded-xl border border-slate-800 p-3 text-xs text-slate-300"><input type="checkbox" checked={Boolean(value)} onChange={e=>(setter as (v:boolean)=>void)(e.target.checked)} />{String(name)}</label>)}</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{label('SameSite', <select value={sameSite} onChange={e=>setSameSite(e.target.value)} className={inputClass}><option>Strict</option><option>Lax</option><option>None</option></select>)}{label('Domain', <input value={domain} onChange={e=>setDomain(e.target.value)} className={inputClass} />)}{label('Path', <input value={path} onChange={e=>setPath(e.target.value)} className={inputClass} />)}{label('Max-Age', <input value={maxAge} onChange={e=>setMaxAge(e.target.value)} className={inputClass} />)}{label('Expires', <input value={expires} onChange={e=>setExpires(e.target.value)} className={inputClass} />)}</div>{box(cookie)}<button onClick={()=>copyText(cookie,setCopied)} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white">{copied?<Check className="h-3.5 w-3.5"/>:<Copy className="h-3.5 w-3.5"/>}{copied?'Copied':'Copy Set-Cookie'}</button></div>
  );

  if (id === 'rate-limit-header-builder') return (
    <div className="space-y-4"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{label('Limit', <input type="number" min="0" value={limit} onChange={e=>setLimit(Math.max(0,Number(e.target.value)))} className={inputClass}/>)}{label('Remaining', <input type="number" min="0" value={remaining} onChange={e=>setRemaining(Math.max(0,Number(e.target.value)))} className={inputClass}/>)}{label('Reset (seconds)', <input type="number" min="0" value={reset} onChange={e=>setReset(Math.max(0,Number(e.target.value)))} className={inputClass}/>)}{label('Retry-After (seconds)', <input type="number" min="0" value={retryAfter} onChange={e=>setRetryAfter(Math.max(0,Number(e.target.value)))} className={inputClass}/>)}</div>{box(rateHeaders)}<p className="text-[11px] text-slate-500">These headers describe server-side rate-limit state; this browser tool does not enforce a rate limit.</p><button onClick={()=>copyText(rateHeaders,setCopied)} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white">{copied?<Check/>:<Copy/>}{copied?'Copied':'Copy'}</button></div>
  );

  if (id === 'csp-generator') return (
    <div className="space-y-4"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{Object.keys(csp).map(key=>label(key, <input value={csp[key]} onChange={e=>setCsp(prev=>({...prev,[key]:e.target.value}))} className={inputClass}/>))}</div>{box('Content-Security-Policy: '+cspValue)}{box('<meta http-equiv="Content-Security-Policy" content="'+cspValue.replace(/"/g,'&quot;')+'">')}<div className="rounded-xl border border-slate-800 p-4 text-xs text-slate-400"><strong className="text-slate-200">What it does:</strong> each directive limits a resource category or embedding/navigation behavior. Review every source against your actual application before deployment; this generator cannot establish universal safety.</div><button onClick={()=>copyText(cspValue,setCopied)} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white">{copied?<Check/>:<Copy/>}{copied?'Copied':'Copy header value'}</button></div>
  );

  if (id === 'security-headers-analyzer') return (
    <div className="space-y-4">
      {label('Response headers to analyze', <textarea value={headerInput} onChange={e=>setHeaderInput(e.target.value)} rows={8} className={inputClass + ' font-mono'} placeholder="Header-Name: value" />)}
      {box(headerAnalysis.map(item => (item.present ? '✓ Present: ' : '✗ Missing: ') + item.name).join('\n'))}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{[
      ['HSTS','Requests HTTPS persistence in supporting browsers; preload/subdomain choices need deployment review.'],
      ['X-Content-Type-Options','Prevents MIME sniffing when set to nosniff.'],
      ['Referrer-Policy','Controls how much referrer information browsers send.'],
      ['Permissions-Policy','Restricts selected browser capabilities; directives depend on application needs.'],
      ['CSP','Restricts resource sources and embedding/navigation according to directives.'],
      ['COOP/CORP/COEP','Cross-origin isolation controls with compatibility and resource-loading implications.'],
    ].map(([name,desc])=><div key={name} className="rounded-xl border border-slate-800 p-3"><strong className="text-sm text-white">{name}</strong><p className="mt-1 text-[11px] leading-relaxed text-slate-400">{desc}</p></div>)}</div>
      <p className="text-[11px] text-amber-300">This analyzer checks header presence only; it does not validate directive semantics or guarantee security. Test against the actual application and browser compatibility requirements.</p>
    </div>
  );

  return <div className="rounded-2xl border border-slate-800 p-4 text-xs text-slate-500">This Phase 1 security tool has no renderer registered yet.</div>;
};
