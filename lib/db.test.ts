/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as githubModule from './github';

vi.mock('./github', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./github')>();
  return {
    ...actual,
    getGithubConfig: vi.fn(),
    deleteFromGithub: vi.fn(),
    deleteReleaseByTag: vi.fn(),
    uploadToGithub: vi.fn(),
    fetchFromGithub: vi.fn(),
  };
});

import { deleteApp, getRepoInfo } from './db';

describe('DB Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getRepoInfo uses fallback when no config', () => {
    const info = getRepoInfo();
    expect(info).toEqual({ owner: 'techtouchAI', repo: 'techtouchAI' });
  });

  it('deleteApp filters out the deleted app ID', async () => {
    const mockConfig = { token: 'fake', username: 'test', repo: 'test' };
    const mockApps = [
      { id: '1', createdAt: 100, name: 'App 1', imagePath: '' },
      { id: '2', createdAt: 200, name: 'App 2', imagePath: '' },
    ];

    vi.mocked(githubModule.getGithubConfig).mockReturnValue(mockConfig);
    vi.mocked(githubModule.fetchFromGithub).mockResolvedValue(JSON.stringify(mockApps));

    const result = await deleteApp('1');
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('2');
  });
});
