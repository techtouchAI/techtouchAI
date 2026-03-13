import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchFromGithub, GithubConfig } from '../lib/github';

describe('fetchFromGithub', () => {
  const mockConfig: GithubConfig = {
    username: 'testuser',
    repo: 'testrepo',
    token: 'testtoken',
  };
  const mockPath = 'data.json';

  // Helper to safely encode utf-8 to base64 for mocked github responses
  const encodeBase64 = (str: string) => {
    const bytes = new TextEncoder().encode(str);
    let binString = '';
    for (let i = 0; i < bytes.length; i++) {
      binString += String.fromCharCode(bytes[i]);
    }
    return btoa(binString);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should successfully fetch and decode file content (Happy path)', async () => {
    const originalContent = '{"hello":"world"}';
    const mockResponseData = {
      type: 'file',
      content: encodeBase64(originalContent),
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponseData,
    });

    const result = await fetchFromGithub(mockConfig, mockPath);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const fetchCallUrl = (global.fetch as any).mock.calls[0][0];
    expect(fetchCallUrl).toContain(`https://api.github.com/repos/${mockConfig.username}/${mockConfig.repo}/contents/${mockPath}`);

    expect(result).toBe(originalContent);
  });

  it('should return null if data is an array (fetching a directory)', async () => {
    const mockResponseData = [
      { type: 'file', name: 'file1.txt' },
      { type: 'file', name: 'file2.txt' },
    ];

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponseData,
    });

    const result = await fetchFromGithub(mockConfig, mockPath);

    expect(result).toBeNull();
  });

  it('should return null if data is missing content or not of type file', async () => {
    const mockResponseData = {
      type: 'symlink', // not a file
      target: 'somewhere',
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponseData,
    });

    const result = await fetchFromGithub(mockConfig, mockPath);

    expect(result).toBeNull();
  });

  it('should return null if response is not ok (e.g., 404)', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 404,
    });

    const result = await fetchFromGithub(mockConfig, mockPath);

    expect(result).toBeNull();
  });

  it('should catch exceptions and return null', async () => {
    const mockError = new Error('Network failure');
    (global.fetch as any).mockRejectedValue(mockError);

    const result = await fetchFromGithub(mockConfig, mockPath);

    expect(console.error).toHaveBeenCalledWith('GitHub API Error:', mockError);
    expect(result).toBeNull();
  });
});
