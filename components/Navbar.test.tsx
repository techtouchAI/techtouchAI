import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Navbar from './Navbar';
import { getSiteSettings } from '@/lib/db';

// Mock dependencies
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
  MockLink.displayName = 'MockLink';
  return MockLink;
});

jest.mock('@/lib/db', () => ({
  getSiteSettings: jest.fn(),
  getRawGithubUrl: jest.fn((path) => `https://raw.githubusercontent.com/mock/${path}`),
}));

describe('Navbar Theme Toggling', () => {
  let localStorageMock: { [key: string]: string };

  beforeEach(() => {
    // Mock local storage
    localStorageMock = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key) => localStorageMock[key] || null),
        setItem: jest.fn((key, value) => {
          localStorageMock[key] = value.toString();
        }),
        removeItem: jest.fn((key) => {
          delete localStorageMock[key];
        }),
        get theme() {
          return localStorageMock['theme'];
        },
        set theme(val: string) {
          localStorageMock['theme'] = val;
        }
      },
      writable: true,
      configurable: true
    });

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // deprecated
        removeListener: jest.fn(), // deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    // Reset document element class
    document.documentElement.className = '';

    // Reset mocks
    jest.clearAllMocks();
    (getSiteSettings as jest.Mock).mockResolvedValue({ siteName: 'Test Site', siteLogoPath: 'test-logo.png' });
  });

  afterEach(() => {
    // Clean up
    document.documentElement.className = '';
  });

  it('should initialize with dark theme if localStorage theme is dark', async () => {
    window.localStorage.theme = 'dark';

    await act(async () => {
      render(<Navbar />);
    });

    // Since Navbar sets isDark based on localStorage, it should add dark class to document
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // Wait for the mounted state to show the toggle button
    const toggleBtn = screen.getByLabelText('تبديل الوضع الليلي');
    expect(toggleBtn).toBeInTheDocument();
  });

  it('should toggle from light to dark theme correctly', async () => {
    // Start with empty localStorage (default light theme in our mock)
    await act(async () => {
      render(<Navbar />);
    });

    expect(document.documentElement.classList.contains('dark')).toBe(false);

    // Wait for button to render
    const toggleBtn = screen.getByLabelText('تبديل الوضع الليلي');

    // Click toggle
    await act(async () => {
      fireEvent.click(toggleBtn);
    });

    // Check mutations
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(window.localStorage.theme).toBe('dark');
  });

  it('should toggle from dark to light theme correctly', async () => {
    // Start with dark theme
    window.localStorage.theme = 'dark';
    await act(async () => {
      render(<Navbar />);
    });

    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // Wait for button to render
    const toggleBtn = screen.getByLabelText('تبديل الوضع الليلي');

    // Click toggle
    await act(async () => {
      fireEvent.click(toggleBtn);
    });

    // Check mutations
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(window.localStorage.theme).toBe('light');
  });

  it('should respect OS preference for dark mode when no theme is in localStorage', async () => {
    // Mock matchMedia to prefer dark mode
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
      })),
    });

    // Ensure 'theme' is not in localStorage by deleting the getter/setter
    const originalLocalStorage = window.localStorage;
    const mockStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    };
    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true
    });

    await act(async () => {
      render(<Navbar />);
    });

    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // Restore
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true
    });
  });

  it('should handle setting load errors without crashing', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (getSiteSettings as jest.Mock).mockRejectedValueOnce(new Error('Test error'));

    await act(async () => {
      render(<Navbar />);
    });

    expect(consoleSpy).toHaveBeenCalledWith('Failed to load site settings:', expect.any(Error));
    consoleSpy.mockRestore();
  });
});
