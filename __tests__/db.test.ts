/**
 * @jest-environment node
 */
import { getRepoInfo } from '../lib/db';

describe('getRepoInfo', () => {
  const originalWindow = global.window;

  afterEach(() => {
    if (originalWindow === undefined) {
      delete (global as any).window;
    } else {
      (global as any).window = originalWindow;
    }
  });

  const setWindow = (windowMock: any) => {
    if (windowMock === undefined) {
      delete (global as any).window;
    } else {
      (global as any).window = windowMock;
    }

    // Mock localStorage since we're in node environment
    if (!(global as any).localStorage) {
      (global as any).localStorage = { getItem: jest.fn(() => null) };
    } else {
      (global as any).localStorage.getItem = jest.fn(() => null);
    }
  };

  it('should return default owner and repo when window is undefined', () => {
    setWindow(undefined);

    const result = getRepoInfo();
    expect(result).toEqual({ owner: 'techtouchAI', repo: 'techtouchAI' });
  });

  it('should return default owner and repo when not on github.io', () => {
    setWindow({
      location: {
        hostname: 'localhost',
        pathname: '/',
      },
    });

    const result = getRepoInfo();
    expect(result).toEqual({ owner: 'techtouchAI', repo: 'techtouchAI' });
  });

  it('should parse owner from github.io hostname and default repo when pathname is empty', () => {
    setWindow({
      location: {
        hostname: 'myuser.github.io',
        pathname: '/',
      },
    });

    const result = getRepoInfo();
    expect(result).toEqual({ owner: 'myuser', repo: 'myuser.github.io' });
  });

  it('should parse owner from github.io hostname and repo from pathname', () => {
    setWindow({
      location: {
        hostname: 'myuser.github.io',
        pathname: '/myrepo/',
      },
    });

    const result = getRepoInfo();
    expect(result).toEqual({ owner: 'myuser', repo: 'myrepo' });
  });

  it('should parse owner and repo when pathname has multiple parts', () => {
    setWindow({
      location: {
        hostname: 'myuser.github.io',
        pathname: '/myrepo/some/other/path',
      },
    });

    const result = getRepoInfo();
    expect(result).toEqual({ owner: 'myuser', repo: 'myrepo' });
  });

  it('should handle complex github.io subdomains correctly', () => {
    setWindow({
      location: {
        hostname: 'my-org-123.github.io',
        pathname: '/test-repo',
      },
    });

    const result = getRepoInfo();
    expect(result).toEqual({ owner: 'my-org-123', repo: 'test-repo' });
  });
});
