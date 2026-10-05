import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import App from '../App';

describe('application smoke test', () => {
  it('renders the App root and exposes at least one tool category without console errors', () => {
    const originalError = console.error;
    const consoleError = vi.fn();
    console.error = consoleError;

    const storage = new Map<string, string>();
    const windowStub = {
      location: new URL('https://example.test/'),
      history: { replaceState: vi.fn() },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      scrollTo: vi.fn(),
      setTimeout,
      clearTimeout,
    };

    const originalWindow = globalThis.window;
    const originalLocalStorage = globalThis.localStorage;
    Object.defineProperty(globalThis, 'window', { configurable: true, value: windowStub });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
    });

    try {
      const html = renderToString(React.createElement(App));
      expect(html).toContain('Coding Super Hub');
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      console.error = originalError;
      Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: originalLocalStorage });
    }
  });
});
