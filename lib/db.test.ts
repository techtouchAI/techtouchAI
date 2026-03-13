import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getRawGithubUrl } from './db';

describe('getRawGithubUrl', () => {
  const MOCK_TIME = 1680000000000; // Mock timestamp for testing

  beforeEach(() => {
    // Tell vitest we use fake timers
    vi.useFakeTimers();
    vi.setSystemTime(new Date(MOCK_TIME));

    // Clear localStorage to ensure getRepoInfo returns defaults
    localStorage.clear();
  });

  afterEach(() => {
    // Restore the real timers after each test
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('generates correct URL with default branch and mock timestamp', () => {
    const path = 'data/test.json';
    const result = getRawGithubUrl(path);

    expect(result).toBe(`https://raw.githubusercontent.com/techtouchAI/techtouchAI/main/${path}?t=${MOCK_TIME}`);
  });

  it('generates correct URL with a custom branch', () => {
    const path = 'data/test.json';
    const branch = 'development';
    const result = getRawGithubUrl(path, branch);

    expect(result).toBe(`https://raw.githubusercontent.com/techtouchAI/techtouchAI/${branch}/${path}?t=${MOCK_TIME}`);
  });

  it('uses configured github repo from localStorage', () => {
    localStorage.setItem('github_config', JSON.stringify({ username: 'customUser', repo: 'customRepo' }));

    const path = 'data/test.json';
    const result = getRawGithubUrl(path);

    expect(result).toBe(`https://raw.githubusercontent.com/customUser/customRepo/main/${path}?t=${MOCK_TIME}`);
  });
});
