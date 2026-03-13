import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchPublicData } from './db';

describe('fetchPublicData', () => {
  const originalFetch = global.fetch;
  const originalWindow = global.window;

  beforeEach(() => {
    // Reset mocks
    global.fetch = vi.fn();

    // Mock window to avoid "window is not defined" and ensure getRepoInfo() behaves
    // We'll set a basic default location
    global.window = {
      location: {
        hostname: 'example.com',
        pathname: '/',
      }
    } as any;

    // Default mock implementation to fail everything, tests will override what they need
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
      text: async () => '',
    });
  });

  afterEach(() => {
    // Restore global fetch and window
    global.fetch = originalFetch;
    global.window = originalWindow;
    vi.clearAllMocks();
  });

  const encodeBase64Content = (data: any) => {
    const jsonStr = JSON.stringify(data);
    return btoa(jsonStr);
  };

  it('Tier 1: should return data successfully from GitHub API', async () => {
    const mockData = { apps: [{ id: '1', name: 'Test App' }] };
    const base64Content = encodeBase64Content(mockData);

    // Setup fetch mock for Tier 1 to succeed
    (global.fetch as any).mockImplementationOnce(async (url: string) => {
      if (url.includes('api.github.com/repos/')) {
        return {
          ok: true,
          json: async () => ({
            type: 'file',
            content: base64Content,
          }),
        };
      }
      return { ok: false };
    });

    const result = await fetchPublicData('data/apps.json');
    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('api.github.com/repos/techtouchAI/techtouchAI/contents/data/apps.json'),
      expect.anything()
    );
  });

  it('Tier 2: should fallback to Relative Path when GitHub API fails', async () => {
    const mockData = { apps: [{ id: '2', name: 'Fallback App' }] };

    (global.fetch as any).mockImplementation(async (url: string) => {
      // Tier 1 fails
      if (url.includes('api.github.com/repos/')) {
        return { ok: false };
      }
      // Tier 2 succeeds
      if (url.includes('/data/apps.json') && !url.includes('api.github.com') && !url.includes('raw.githubusercontent.com')) {
        return {
          ok: true,
          text: async () => JSON.stringify(mockData),
        };
      }
      return { ok: false };
    });

    const result = await fetchPublicData('data/apps.json');
    expect(result).toEqual(mockData);
    // Should have called API, then Relative Path
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect((global.fetch as any).mock.calls[0][0]).toContain('api.github.com/repos/');
    // Since basePath is '' and relativePath is '/data/apps.json', the url will be something like '/data/apps.json?t=...'
    expect((global.fetch as any).mock.calls[1][0]).toMatch(/^\/data\/apps\.json\?t=\d+$/);
  });

  it('Tier 3: should fallback to Raw GitHub Content (main) when Tier 1 & 2 fail', async () => {
    const mockData = { apps: [{ id: '3', name: 'Raw App' }] };

    (global.fetch as any).mockImplementation(async (url: string) => {
      // Tier 1 fails
      if (url.includes('api.github.com/repos/')) {
        return { ok: false };
      }
      // Tier 2 fails
      if (url.match(/^\/data\/apps\.json\?t=\d+$/)) {
        return { ok: false };
      }
      // Tier 3 (main) succeeds
      if (url.includes('raw.githubusercontent.com') && url.includes('/main/')) {
        return {
          ok: true,
          text: async () => JSON.stringify(mockData),
        };
      }
      return { ok: false, status: 404 };
    });

    const result = await fetchPublicData('data/apps.json');
    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect((global.fetch as any).mock.calls[2][0]).toContain('raw.githubusercontent.com/techtouchAI/techtouchAI/main/data/apps.json');
  });

  it('Tier 3: should fallback to Raw GitHub Content (master) when main returns 404', async () => {
    const mockData = { apps: [{ id: '4', name: 'Raw Master App' }] };

    (global.fetch as any).mockImplementation(async (url: string) => {
      // Tier 1 fails
      if (url.includes('api.github.com/repos/')) {
        return { ok: false };
      }
      // Tier 2 fails
      if (url.match(/^\/data\/apps\.json\?t=\d+$/)) {
        return { ok: false };
      }
      // Tier 3 (main) fails with 404
      if (url.includes('raw.githubusercontent.com') && url.includes('/main/')) {
        return { ok: false, status: 404 };
      }
      // Tier 3 (master) succeeds
      if (url.includes('raw.githubusercontent.com') && url.includes('/master/')) {
        return {
          ok: true,
          text: async () => JSON.stringify(mockData),
        };
      }
      return { ok: false };
    });

    const result = await fetchPublicData('data/apps.json');
    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledTimes(4); // API, Relative, Main, Master
    expect((global.fetch as any).mock.calls[3][0]).toContain('raw.githubusercontent.com/techtouchAI/techtouchAI/master/data/apps.json');
  });

  it('should return null when all tiers fail', async () => {
    (global.fetch as any).mockImplementation(async (url: string) => {
      return { ok: false, status: 404 }; // Fail everything
    });

    const result = await fetchPublicData('data/apps.json');
    expect(result).toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(4); // Tries all 4 potential endpoints
  });

  it('should fallback if JSON parse fails in Tier 1', async () => {
     // Tier 1 returns ok, but JSON.parse on its decoded content will throw because we feed it invalid json base64
     const invalidJsonBase64 = btoa('invalid json {[');
     const mockData = { apps: [{ id: 'fallback', name: 'Fallback App' }] };

     (global.fetch as any).mockImplementation(async (url: string) => {
      if (url.includes('api.github.com/repos/')) {
        return {
          ok: true,
          json: async () => ({
            type: 'file',
            content: invalidJsonBase64,
          }),
        };
      }
      if (url.match(/^\/data\/apps\.json\?t=\d+$/)) {
        return {
          ok: true,
          text: async () => JSON.stringify(mockData),
        };
      }
      return { ok: false, status: 404 };
    });

    const result = await fetchPublicData('data/apps.json');
    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
