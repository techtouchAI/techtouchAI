import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AppDetails from '@/app/app/page';
import * as dbModule from '@/lib/db';

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: jest.fn().mockReturnValue('app-123')
  })
}));

jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }: any) {
    return <a href={href} {...props}>{children}</a>;
  };
});

jest.mock('@/lib/db', () => ({
  getApps: jest.fn(),
  getSiteSettings: jest.fn().mockResolvedValue(null),
  getRawGithubUrl: jest.fn((path, branch) => `https://raw.githubusercontent.com/owner/repo/${branch || 'main'}/${path}`)
}));

describe('AppDetails Download Handler', () => {
  let appendChildSpy: jest.SpyInstance;
  let removeChildSpy: jest.SpyInstance;
  let createElementSpy: jest.SpyInstance;
  let mockClick: jest.Mock;

  beforeEach(() => {
    (dbModule.getApps as jest.Mock).mockResolvedValue([
      {
        id: 'app-123',
        name: 'Test App',
        description: 'Test description',
        imagePath: 'test-image.png',
        files: [
          { path: 'http://example.com/file1.zip', name: 'file1.zip' },
          { path: 'public/data/file2.zip', name: 'file2.zip' }
        ]
      }
    ]);

    mockClick = jest.fn();
    const originalCreateElement = document.createElement.bind(document);
    createElementSpy = jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'a') {
        const a = originalCreateElement('a');
        a.click = mockClick;
        return a;
      }
      return originalCreateElement(tagName);
    });

    // Don't mock appendChild completely as it breaks React rendering
    const originalAppendChild = document.body.appendChild.bind(document.body);
    appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      if (node.nodeName === 'A') {
        return originalAppendChild(node);
      }
      return originalAppendChild(node);
    });

    const originalRemoveChild = document.body.removeChild.bind(document.body);
    removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation((node) => {
      if (node.nodeName === 'A') {
        return originalRemoveChild(node);
      }
      return originalRemoveChild(node);
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('handles absolute URLs directly', async () => {
    render(<AppDetails />);

    await waitFor(() => {
      expect(screen.getByText('Test App')).toBeInTheDocument();
    });

    const file1Button = screen.getByText('file1.zip').closest('button');
    expect(file1Button).not.toBeNull();

    fireEvent.click(file1Button!);

    await waitFor(() => {
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(mockClick).toHaveBeenCalled();

      const calls = createElementSpy.mock.results.filter(r => r.value.nodeName === 'A');
      const a = calls[calls.length - 1].value;
      expect(a.href).toBe('http://example.com/file1.zip');
      expect(a.download).toBe('file1.zip');
      expect(a.target).toBe('_blank');
    });
  });

  it('fetches main branch for relative path and click link', async () => {
    render(<AppDetails />);

    await waitFor(() => {
      expect(screen.getByText('Test App')).toBeInTheDocument();
    });

    const file2Button = screen.getByText('file2.zip').closest('button');
    expect(file2Button).not.toBeNull();

    fireEvent.click(file2Button!);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('https://raw.githubusercontent.com/owner/repo/main/public/data/file2.zip', { method: 'HEAD' });
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(mockClick).toHaveBeenCalled();

      const calls = createElementSpy.mock.results.filter(r => r.value.nodeName === 'A');
      const a = calls[calls.length - 1].value;
      expect(a.href).toBe('https://raw.githubusercontent.com/owner/repo/main/public/data/file2.zip');
      expect(a.download).toBe('file2.zip');
      expect(a.target).toBe('_blank');
    });
  });

  it('falls back to master branch if main branch fetch returns 404', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    render(<AppDetails />);

    await waitFor(() => {
      expect(screen.getByText('Test App')).toBeInTheDocument();
    });

    const file2Button = screen.getByText('file2.zip').closest('button');
    expect(file2Button).not.toBeNull();

    fireEvent.click(file2Button!);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('https://raw.githubusercontent.com/owner/repo/main/public/data/file2.zip', { method: 'HEAD' });
      expect(dbModule.getRawGithubUrl).toHaveBeenCalledWith('public/data/file2.zip', 'master');
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(mockClick).toHaveBeenCalled();

      const calls = createElementSpy.mock.results.filter(r => r.value.nodeName === 'A');
      const a = calls[calls.length - 1].value;
      expect(a.href).toBe('https://raw.githubusercontent.com/owner/repo/master/public/data/file2.zip');
      expect(a.download).toBe('file2.zip');
      expect(a.target).toBe('_blank');
    });
  });

  it('ignores fetch error and continues with main URL', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network Error'));

    render(<AppDetails />);

    await waitFor(() => {
      expect(screen.getByText('Test App')).toBeInTheDocument();
    });

    const file2Button = screen.getByText('file2.zip').closest('button');
    expect(file2Button).not.toBeNull();

    fireEvent.click(file2Button!);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('https://raw.githubusercontent.com/owner/repo/main/public/data/file2.zip', { method: 'HEAD' });
      // Should still create element and click even if fetch errors out
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(mockClick).toHaveBeenCalled();

      const calls = createElementSpy.mock.results.filter(r => r.value.nodeName === 'A');
      const a = calls[calls.length - 1].value;
      expect(a.href).toBe('https://raw.githubusercontent.com/owner/repo/main/public/data/file2.zip');
      expect(a.download).toBe('file2.zip');
      expect(a.target).toBe('_blank');
    });
  });
});
