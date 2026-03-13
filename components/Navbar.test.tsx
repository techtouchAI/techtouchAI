import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Navbar from './Navbar';
import { getSiteSettings, getRawGithubUrl } from '@/lib/db';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock dependencies
jest.mock('@/lib/db', () => ({
  getSiteSettings: jest.fn(),
  getRawGithubUrl: jest.fn(),
}));

jest.mock('next/link', () => {
  const MockedLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  MockedLink.displayName = 'MockedLink';
  return MockedLink;
});

describe('Navbar Image Fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('updates logo image src from /main/ to /master/ on error, then hides on second error', async () => {
    // Arrange
    const mockSettings = { siteName: 'Test Site', siteLogoPath: 'repo/logo.png' };
    const mockMainUrl = 'https://raw.githubusercontent.com/user/repo/main/logo.png';
    const mockMasterUrl = 'https://raw.githubusercontent.com/user/repo/master/logo.png';

    (getSiteSettings as jest.Mock).mockResolvedValue(mockSettings);
    (getRawGithubUrl as jest.Mock).mockReturnValue(mockMainUrl);

    render(<Navbar />);

    // Wait for the settings to load and image to render
    await waitFor(() => {
      expect(screen.getByAltText('Logo')).toBeInTheDocument();
    });

    const logoImage = screen.getByAltText('Logo') as HTMLImageElement;
    expect(logoImage.src).toBe(mockMainUrl);

    // Act 1: Fire first error event
    fireEvent.error(logoImage);

    // Assert 1: src should change to /master/
    expect(logoImage.src).toBe(mockMasterUrl);

    // Act 2: Fire second error event
    fireEvent.error(logoImage);

    // Assert 2: The image should be hidden/removed (logoUrl becomes '')
    await waitFor(() => {
      expect(screen.queryByAltText('Logo')).not.toBeInTheDocument();
    });

    // Check if the fallback LayoutGrid icon is rendered instead
    // The fallback SVG is wrapped in the Link, let's verify it renders
    expect(document.querySelector('svg.lucide-layout-grid')).toBeInTheDocument();
  });
});
