import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getGithubConfig } from './github';

describe('getGithubConfig', () => {
  const originalWindow = global.window;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Spy on console.error
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore window
    global.window = originalWindow;
    // Restore mocks
    vi.restoreAllMocks();
  });

  it('should return null if window is undefined', () => {
    // Temporarily remove window
    Object.defineProperty(global, 'window', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(getGithubConfig()).toBeNull();
  });

  it('should return null if localStorage does not have github_config', () => {
    expect(getGithubConfig()).toBeNull();
  });

  it('should return the parsed configuration if localStorage contains valid JSON', () => {
    const validConfig = {
      username: 'testUser',
      repo: 'testRepo',
      token: 'testToken',
    };
    localStorage.setItem('github_config', JSON.stringify(validConfig));

    expect(getGithubConfig()).toEqual(validConfig);
  });

  it('should return null and log an error if localStorage contains invalid JSON', () => {
    localStorage.setItem('github_config', 'invalid json string');

    expect(getGithubConfig()).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(consoleErrorSpy.mock.calls[0][0]).toContain('Error parsing github_config from localStorage:');
  });
});
