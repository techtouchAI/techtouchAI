import { getApps } from './db';
import * as github from './github';
import { TextDecoder } from 'util';

global.TextDecoder = TextDecoder as any;

// Mock the github module
jest.mock('./github', () => ({
  ...jest.requireActual('./github'),
  getGithubConfig: jest.fn(),
  fetchFromGithub: jest.fn(),
}));

describe('getApps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();

    // Polyfill atob if needed for JSDOM
    if (typeof atob === 'undefined') {
      global.atob = (str) => Buffer.from(str, 'base64').toString('binary');
    }
  });

  it('should fetch from public data when github_config is missing', async () => {
    // Arrange
    const mockGetGithubConfig = github.getGithubConfig as jest.Mock;
    mockGetGithubConfig.mockReturnValue(null); // No github config

    const mockApps = [
      { id: '2', name: 'App 2', createdAt: 2000 },
      { id: '1', name: 'App 1', createdAt: 1000 },
      { id: '3', name: 'App 3', createdAt: 3000 },
    ];

    const mockFetch = global.fetch as jest.Mock;

    // Only intercept the first fetch call to the GitHub API correctly
    mockFetch.mockImplementation(async (url) => {
      if (typeof url === 'string' && url.includes('api.github.com') && url.includes('public/data/apps.json')) {
         return {
           ok: true,
           json: async () => ({
             type: 'file',
             content: Buffer.from(JSON.stringify(mockApps)).toString('base64'),
           }),
         };
      }
      return { ok: false, status: 404 };
    });

    // Act
    const result = await getApps();

    // Assert
    expect(mockGetGithubConfig).toHaveBeenCalled();
    expect(github.fetchFromGithub).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalled();

    // Check sorting (descending by createdAt)
    expect(result).toEqual([
      { id: '3', name: 'App 3', createdAt: 3000 },
      { id: '2', name: 'App 2', createdAt: 2000 },
      { id: '1', name: 'App 1', createdAt: 1000 },
    ]);
  });

  it('should fallback to data/apps.json if public/data/apps.json fetch fails when github_config is missing', async () => {
    const mockGetGithubConfig = github.getGithubConfig as jest.Mock;
    mockGetGithubConfig.mockReturnValue(null);

    const mockAppsFallback = [
      { id: '5', name: 'App 5', createdAt: 5000 },
    ];

    const mockFetch = global.fetch as jest.Mock;

    mockFetch.mockImplementation(async (url) => {
      // Fail the first fetch (public/data/apps.json)
      if (typeof url === 'string' && url.includes('public/data/apps.json')) {
        return { ok: false, status: 404 };
      }
      // Succeed on the fallback fetch (data/apps.json)
      if (typeof url === 'string' && url.includes('api.github.com') && url.includes('data/apps.json')) {
        return {
           ok: true,
           json: async () => ({
             type: 'file',
             content: Buffer.from(JSON.stringify(mockAppsFallback)).toString('base64'),
           }),
         };
      }
      return { ok: false, status: 404 };
    });

    const result = await getApps();

    expect(result).toEqual([
      { id: '5', name: 'App 5', createdAt: 5000 },
    ]);
  });

  it('should return empty array if both fetches fail when github_config is missing', async () => {
    const mockGetGithubConfig = github.getGithubConfig as jest.Mock;
    mockGetGithubConfig.mockReturnValue(null);

    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockImplementation(async () => {
      return { ok: false, status: 404 };
    });

    const result = await getApps();

    expect(result).toEqual([]);
  });
});
