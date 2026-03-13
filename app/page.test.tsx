import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from './page';

jest.mock('@/lib/db', () => ({
  getApps: jest.fn(),
  getSiteSettings: jest.fn(),
}));

jest.mock('@/components/Navbar', () => {
  return function MockNavbar() {
    return <div data-testid="navbar">Navbar</div>;
  };
});

jest.mock('@/components/AppCard', () => {
  return function MockAppCard({ app }: { app: any }) {
    return <div data-testid="app-card">{app.name}</div>;
  };
});

const mockApps = [
  { id: '1', name: 'Alpha App', description: 'This is alpha', imagePath: '', createdAt: 0 },
  { id: '2', name: 'Beta Program', description: 'This is beta', imagePath: '', createdAt: 0 },
  { id: '3', name: 'Gamma Tool', description: 'Also known as alpha', imagePath: '', createdAt: 0 },
];

describe('Home Page Search Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all apps initially', async () => {
    const { getApps, getSiteSettings } = require('@/lib/db');
    getApps.mockResolvedValue(mockApps);
    getSiteSettings.mockResolvedValue({});

    render(<Home />);

    // Wait for the apps to be loaded
    await waitFor(() => {
      expect(screen.queryByTestId('navbar')).toBeInTheDocument();
      expect(screen.queryAllByTestId('app-card')).toHaveLength(3);
    });

    expect(screen.getByText('Alpha App')).toBeInTheDocument();
    expect(screen.getByText('Beta Program')).toBeInTheDocument();
    expect(screen.getByText('Gamma Tool')).toBeInTheDocument();
  });

  it('filters apps based on search query by name', async () => {
    const { getApps, getSiteSettings } = require('@/lib/db');
    getApps.mockResolvedValue(mockApps);
    getSiteSettings.mockResolvedValue({});

    render(<Home />);

    await waitFor(() => {
      expect(screen.queryAllByTestId('app-card')).toHaveLength(3);
    });

    const searchInput = screen.getByPlaceholderText('ابحث عن تطبيق...');
    await userEvent.type(searchInput, 'alpha');

    await waitFor(() => {
      const cards = screen.getAllByTestId('app-card');
      expect(cards).toHaveLength(2); // Alpha App (name) and Gamma Tool (description)
    });

    expect(screen.getByText('Alpha App')).toBeInTheDocument();
    expect(screen.getByText('Gamma Tool')).toBeInTheDocument();
    expect(screen.queryByText('Beta Program')).not.toBeInTheDocument();
  });

  it('filters apps based on search query by description', async () => {
      const { getApps, getSiteSettings } = require('@/lib/db');
      getApps.mockResolvedValue(mockApps);
      getSiteSettings.mockResolvedValue({});

      render(<Home />);

      await waitFor(() => {
        expect(screen.queryAllByTestId('app-card')).toHaveLength(3);
      });

      const searchInput = screen.getByPlaceholderText('ابحث عن تطبيق...');
      await userEvent.type(searchInput, 'beta');

      await waitFor(() => {
        const cards = screen.getAllByTestId('app-card');
        expect(cards).toHaveLength(1);
      });

      expect(screen.getByText('Beta Program')).toBeInTheDocument();
      expect(screen.queryByText('Alpha App')).not.toBeInTheDocument();
      expect(screen.queryByText('Gamma Tool')).not.toBeInTheDocument();
  });

  it('shows no results message when no apps match', async () => {
    const { getApps, getSiteSettings } = require('@/lib/db');
    getApps.mockResolvedValue(mockApps);
    getSiteSettings.mockResolvedValue({});

    render(<Home />);

    await waitFor(() => {
      expect(screen.queryAllByTestId('app-card')).toHaveLength(3);
    });

    const searchInput = screen.getByPlaceholderText('ابحث عن تطبيق...');
    await userEvent.type(searchInput, 'xyz');

    await waitFor(() => {
      expect(screen.queryAllByTestId('app-card')).toHaveLength(0);
      expect(screen.getByText('لا توجد نتائج')).toBeInTheDocument();
      expect(screen.getByText('لم يتم العثور على تطبيقات تطابق بحثك')).toBeInTheDocument();
    });
  });

  it('shows no apps message when apps list is empty', async () => {
    const { getApps, getSiteSettings } = require('@/lib/db');
    getApps.mockResolvedValue([]);
    getSiteSettings.mockResolvedValue({});

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('لا توجد تطبيقات')).toBeInTheDocument();
      expect(screen.getByText('لم يتم إضافة تطبيقات بعد')).toBeInTheDocument();
    });
  });
});
