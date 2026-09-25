import React, { useState } from 'react';
import { Search, Globe, AlertTriangle, CheckCircle, Info, ExternalLink } from 'lucide-react';

export const HttpStatusExplorerTool: React.FC = () => {
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [search, setSearch] = useState<string>('');

  const statusCodes = [
    { code: 200, name: 'OK', cat: '2xx', desc: 'Standard response for successful HTTP requests.', rfc: 'RFC 9110' },
    { code: 201, name: 'Created', cat: '2xx', desc: 'Request fulfilled, resulting in the creation of a new resource (e.g. POST).', rfc: 'RFC 9110' },
    { code: 204, name: 'No Content', cat: '2xx', desc: 'Server successfully processed request, but is not returning any content (e.g. DELETE).', rfc: 'RFC 9110' },
    { code: 301, name: 'Moved Permanently', cat: '3xx', desc: 'This and all future requests should be directed to the given URI.', rfc: 'RFC 9110' },
    { code: 302, name: 'Found (Temporary Redirect)', cat: '3xx', desc: 'Resource temporarily resides under a different URI.', rfc: 'RFC 9110' },
    { code: 304, name: 'Not Modified', cat: '3xx', desc: 'Resource has not been modified since the version specified by the request headers (ETag / If-Modified-Since).', rfc: 'RFC 9110' },
    { code: 400, name: 'Bad Request', cat: '4xx', desc: 'The server cannot or will not process the request due to perceived client error (malformed syntax, invalid framing).', rfc: 'RFC 9110' },
    { code: 401, name: 'Unauthorized', cat: '4xx', desc: 'Authentication is required and has failed or has not yet been provided.', rfc: 'RFC 9110' },
    { code: 403, name: 'Forbidden', cat: '4xx', desc: 'The request was valid, but the server is refusing action. The user might not have the necessary permissions.', rfc: 'RFC 9110' },
    { code: 404, name: 'Not Found', cat: '4xx', desc: 'The requested resource could not be found but may be available in the future.', rfc: 'RFC 9110' },
    { code: 405, name: 'Method Not Allowed', cat: '4xx', desc: 'Request method not supported for requested resource (e.g. GET on a POST-only route).', rfc: 'RFC 9110' },
    { code: 409, name: 'Conflict', cat: '4xx', desc: 'Request could not be processed because of conflict in request (e.g. duplicate unique key).', rfc: 'RFC 9110' },
    { code: 422, name: 'Unprocessable Content', cat: '4xx', desc: 'Request was well-formed but was unable to be followed due to semantic errors (validation failed).', rfc: 'RFC 9110' },
    { code: 429, name: 'Too Many Requests', cat: '4xx', desc: 'The user has sent too many requests in a given amount of time (Rate Limiting).', rfc: 'RFC 6585' },
    { code: 500, name: 'Internal Server Error', cat: '5xx', desc: 'A generic error message, given when an unexpected condition was encountered and no more specific message is suitable.', rfc: 'RFC 9110' },
    { code: 502, name: 'Bad Gateway', cat: '5xx', desc: 'The server, while acting as a gateway or proxy, received an invalid response from the upstream server.', rfc: 'RFC 9110' },
    { code: 503, name: 'Service Unavailable', cat: '5xx', desc: 'The server cannot handle the request (because it is overloaded or down for maintenance).', rfc: 'RFC 9110' },
    { code: 504, name: 'Gateway Timeout', cat: '5xx', desc: 'The server was acting as a gateway or proxy and did not receive a timely response from the upstream server.', rfc: 'RFC 9110' },
  ];

  const filtered = statusCodes.filter(s => {
    const matchesCat = filterCategory === 'All' || s.cat === filterCategory;
    const matchesQuery = s.code.toString().includes(search) || 
                         s.name.toLowerCase().includes(search.toLowerCase()) ||
                         s.desc.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-900/80 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['All', '2xx', '3xx', '4xx', '5xx'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                filterCategory === cat
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search status 404, OK..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Status Code Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((item) => (
          <div
            key={item.code}
            className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                  item.code < 300 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                  item.code < 400 ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                  item.code < 500 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                  'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {item.code}
                </span>
                <span className="font-semibold text-sm text-white group-hover:text-indigo-300 transition-colors">
                  {item.name}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">{item.rfc}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
