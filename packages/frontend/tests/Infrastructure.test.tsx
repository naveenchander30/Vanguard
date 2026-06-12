import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import InfrastructurePage from '../src/pages/Infrastructure';
import * as client from '../src/api/client';

vi.mock('../src/api/client', () => ({
  fetchInfrastructure: vi.fn(),
  createInfrastructure: vi.fn(),
  updateInfrastructure: vi.fn(),
  deleteInfrastructure: vi.fn(),
}));

describe('InfrastructurePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the add AP form', () => {
    vi.mocked(client.fetchInfrastructure).mockResolvedValue([]);
    render(<InfrastructurePage />);
    expect(screen.getByPlaceholderText(/BSSID/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('SSID')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Label/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Band/)).toBeInTheDocument();
  });

  it('renders list of infrastructure items', async () => {
    vi.mocked(client.fetchInfrastructure).mockResolvedValue([
      { id: 1, bssid: 'AA:BB:CC:DD:EE:01', ssid: 'Office', label: 'Main AP', band: '5GHz', notes: '', createdAt: '', updatedAt: '' },
    ]);

    render(<InfrastructurePage />);

    await waitFor(() => {
      expect(screen.getByText('AA:BB:CC:DD:EE:01')).toBeInTheDocument();
    });
    expect(screen.getByText('Office')).toBeInTheDocument();
  });

  it('calls deleteInfrastructure when delete clicked', async () => {
    const mockDelete = vi.mocked(client.deleteInfrastructure).mockResolvedValue();
    vi.mocked(client.fetchInfrastructure).mockResolvedValue([
      { id: 1, bssid: 'AA:BB:CC:DD:EE:01', ssid: 'Office', label: '', band: '', notes: '', createdAt: '', updatedAt: '' },
    ]);

    render(<InfrastructurePage />);

    await waitFor(() => {
      expect(screen.getByText('AA:BB:CC:DD:EE:01')).toBeInTheDocument();
    });

    window.confirm = vi.fn(() => true);
    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith(1);
    });
  });

  it('shows loading state', () => {
    vi.mocked(client.fetchInfrastructure).mockReturnValue(new Promise(() => {}));
    render(<InfrastructurePage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
