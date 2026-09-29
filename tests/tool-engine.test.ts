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

  it('returns honest unsupported status', () => {
    const result = executeTool(tool('future-tool', 'Future Tool'), 'abc');
    expect(result.output).toBe('');
    expect(result.error).toMatch(/Coming soon/);
  });
});
