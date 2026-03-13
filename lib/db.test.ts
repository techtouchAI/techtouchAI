import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as githubModule from './github';

// Import all to mock it easily. Wait, we are testing deleteApp which is inside db.
// Instead of mocking db, we can just mock githubModule's functions.
vi.mock('./github', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./github')>();
  return {
    ...actual,
    getGithubConfig: vi.fn(),
    deleteFromGithub: vi.fn(),
    deleteReleaseByTag: vi.fn(),
    uploadToGithub: vi.fn(),
    fetchFromGithub: vi.fn(), // We mock this to return mock apps
  };
});

import { deleteApp } from './db';

describe('deleteApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not delete anything and return sorted apps when app ID does not exist', async () => {
    const mockConfig = { token: 'fake-token', username: 'test', repo: 'test' };
    const mockApps = [
      { id: '1', createdAt: 100, name: 'App 1' },
      { id: '2', createdAt: 200, name: 'App 2' },
    ];

    // Setup mocks
    vi.mocked(githubModule.getGithubConfig).mockReturnValue(mockConfig as any);
    // getApps calls fetchFromGithub when config exists, returning a JSON string
    vi.mocked(githubModule.fetchFromGithub).mockResolvedValue(JSON.stringify(mockApps));

    const result = await deleteApp('3');

    // Expected result is the mockApps sorted by createdAt descending
    const expectedApps = [
      { id: '2', createdAt: 200, name: 'App 2' },
      { id: '1', createdAt: 100, name: 'App 1' },
    ];

    expect(result).toEqual(expectedApps);

    // Verify github functions are NOT called
    expect(githubModule.deleteFromGithub).not.toHaveBeenCalled();
    expect(githubModule.deleteReleaseByTag).not.toHaveBeenCalled();
    expect(githubModule.uploadToGithub).not.toHaveBeenCalled();
  });
});
