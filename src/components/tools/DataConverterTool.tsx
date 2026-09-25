import React, { useState } from 'react';
import { Copy, Check, ArrowRightLeft, Download, Database, FileSpreadsheet } from 'lucide-react';

interface DataConverterToolProps {
  toolId?: string;
}

export const DataConverterTool: React.FC<DataConverterToolProps> = ({ toolId }) => {
  const [conversionType, setConversionType] = useState<'json-to-csv' | 'csv-to-json' | 'json-to-yaml' | 'json-to-sql'>(
    toolId === 'csv-to-json' ? 'csv-to-json' :
    toolId === 'json-to-yaml' ? 'json-to-yaml' :
    toolId === 'sql-insert-generator' ? 'json-to-sql' : 'json-to-csv'
  );

  const defaultJson = `[
  { "id": 1, "name": "Alice Smith", "role": "Frontend Lead", "active": true },
  { "id": 2, "name": "Bob Johnson", "role": "DevOps Engineer", "active": true },
  { "id": 3, "name": "Carol Williams", "role": "Security Architect", "active": false }
]`;

  const [input, setInput] = useState<string>(defaultJson);
  const [tableName, setTableName] = useState<string>('users');
  const [copied, setCopied] = useState<boolean>(false);

  // Conversion logic
  const convert = (): string => {
    try {
      if (!input.trim()) return '';

      if (conversionType === 'json-to-csv') {
        const parsed = JSON.parse(input);
        if (!Array.isArray(parsed) || parsed.length === 0) return 'Error: Input must be a non-empty JSON array of objects';
        const headers = Object.keys(parsed[0]);
        const rows = parsed.map(item =>
          headers.map(h => {
            const val = item[h];
            return typeof val === 'string' && val.includes(',') ? `"${val}"` : String(val);
          }).join(',')
        );
        return [headers.join(','), ...rows].join('\n');
      }

      if (conversionType === 'csv-to-json') {
        const lines = input.trim().split('\n').filter(Boolean);
        if (lines.length < 2) return 'Error: CSV requires at least a header row and 1 data row';
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const result = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const obj: any = {};
          headers.forEach((h, i) => {
            const v = values[i] ?? '';
            // auto parse booleans and numbers
            if (v.toLowerCase() === 'true') obj[h] = true;
            else if (v.toLowerCase() === 'false') obj[h] = false;
            else if (!isNaN(Number(v)) && v !== '') obj[h] = Number(v);
            else obj[h] = v;
          });
          return obj;
        });
        return JSON.stringify(result, null, 2);
      }

      if (conversionType === 'json-to-yaml') {
        const parsed = JSON.parse(input);
        const toYaml = (obj: any, indentLevel: number = 0): string => {
          const pad = '  '.repeat(indentLevel);
          if (Array.isArray(obj)) {
            return obj.map(item => {
              if (typeof item === 'object' && item !== null) {
                const sub = toYaml(item, indentLevel + 1).trimStart();
                return `${pad}- ${sub}`;
              }
              return `${pad}- ${item}`;
            }).join('\n');
          }
          if (typeof obj === 'object' && obj !== null) {
            return Object.entries(obj).map(([k, v]) => {
              if (typeof v === 'object' && v !== null) {
                return `${pad}${k}:\n${toYaml(v, indentLevel + 1)}`;
              }
              return `${pad}${k}: ${typeof v === 'string' ? `"${v}"` : v}`;
            }).join('\n');
          }
          return `${pad}${obj}`;
        };
        return toYaml(parsed);
      }

      if (conversionType === 'json-to-sql') {
        const parsed = JSON.parse(input);
        if (!Array.isArray(parsed) || parsed.length === 0) return 'Error: Input must be a JSON array of objects';
        const headers = Object.keys(parsed[0]);
        const columns = headers.join(', ');
        const statements = parsed.map(row => {
          const vals = headers.map(h => {
            const v = row[h];
            if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
            if (v === null || v === undefined) return 'NULL';
            return v;
          }).join(', ');
          return `INSERT INTO ${tableName} (${columns}) VALUES (${vals});`;
        });
        return statements.join('\n');
      }

      return '';
    } catch (e: any) {
      return `Error: ${e.message}`;
    }
  };

  const output = convert();

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/80 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'json-to-csv', label: 'JSON → CSV' },
            { id: 'csv-to-json', label: 'CSV → JSON' },
            { id: 'json-to-yaml', label: 'JSON → YAML' },
            { id: 'json-to-sql', label: 'JSON → SQL INSERT' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setConversionType(item.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                conversionType === item.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {conversionType === 'json-to-sql' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Table Name:</span>
            <input
              type="text"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}
      </div>

      {/* Editor Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Input ({conversionType.startsWith('csv') ? 'CSV' : 'JSON'})</span>
            <span>{input.length} chars</span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={12}
            className="w-full p-4 font-mono text-xs text-slate-100 bg-slate-950 rounded-2xl border border-slate-800 focus:outline-none focus:border-indigo-500 leading-relaxed shadow-inner"
            spellCheck={false}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Converted Output</span>
            <button
              onClick={handleCopy}
              className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <textarea
            readOnly
            value={output}
            rows={12}
            className="w-full p-4 font-mono text-xs text-emerald-300 bg-slate-950/90 rounded-2xl border border-slate-800 focus:outline-none leading-relaxed shadow-inner"
          />
        </div>
      </div>
    </div>
  );
};
