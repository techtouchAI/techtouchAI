import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Home from './page';
import { getApps, getSiteSettings } from '@/lib/db';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    };
  },
  usePathname() {
    return '';
  },
}));

// Mock the db module
jest.mock('@/lib/db', () => ({
  getApps: jest.fn(),
  getSiteSettings: jest.fn(),
}));

describe('Home Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('renders the empty state when there are no apps', async () => {
    // Mock getApps to return an empty array
    (getApps as jest.Mock).mockResolvedValue([]);

    // Mock getSiteSettings to return some basic settings
    (getSiteSettings as jest.Mock).mockResolvedValue({
      title: 'AI Studio',
      description: 'App Store CMS',
    });

    render(<Home />);

    // Wait for the loading state to finish and the empty state to appear
    await waitFor(() => {
      expect(screen.getByText('لا توجد تطبيقات')).toBeInTheDocument();
      expect(screen.getByText('لم يتم إضافة تطبيقات بعد')).toBeInTheDocument();
    });
  });
});
