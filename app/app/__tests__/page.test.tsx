import { render, screen, waitFor } from '@testing-library/react';
import AppDetails from '../page';
import { useSearchParams } from 'next/navigation';
import { getApps } from '@/lib/db';

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  getApps: jest.fn(),
  getRawGithubUrl: jest.fn((path) => `https://raw.githubusercontent.com/${path}`),
}));

jest.mock('@/components/Navbar', () => {
  return function MockNavbar() {
    return <div data-testid="navbar">Navbar</div>;
  };
});

describe('AppDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles missing ID gracefully', async () => {
    const mockGet = jest.fn().mockReturnValue(null);
    (useSearchParams as jest.Mock).mockReturnValue({ get: mockGet });

    render(<AppDetails />);

    await waitFor(() => {
      expect(screen.getByText('التطبيق غير موجود')).toBeInTheDocument();
    });

    expect(getApps).not.toHaveBeenCalled();
  });
});
