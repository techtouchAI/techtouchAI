/** @vitest-environment node */
import { describe, it, expect } from 'vitest';
import { getGithubConfig, saveGithubConfig } from './github';

describe('Github Config Storage', () => {
  it('should save and parse config properly', () => {
    const config = { username: 'test', repo: 'test', token: 'test' };

    // Setup mock localStorage
    let store: Record<string, string> = {};
    const mockLocalStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value.toString(); },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; }
    };
    Object.defineProperty(global, 'window', {
      value: { localStorage: mockLocalStorage },
      writable: true,
      configurable: true
    });
    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true
    });

    saveGithubConfig(config);
    const savedStr = store['github_config'];

    // Test base64 behavior if it happens
    expect(savedStr).toBeDefined();

    const retrievedConfig = getGithubConfig();
    expect(retrievedConfig).toEqual(config);
  });
});
