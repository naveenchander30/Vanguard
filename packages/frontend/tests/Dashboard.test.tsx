import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '../src/pages/Dashboard';
import * as client from '../src/api/client';

vi.mock('../src/api/client', () => ({
  fetchScores: vi.fn(),
  subscribeScores: vi.fn(() => vi.fn()),
  telemetryExportUrl: vi.fn(() => '/api/telemetry/export'),
}));

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(client.fetchScores).mockReturnValue(new Promise(() => {}));
    render(<Dashboard />);
    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
  });

  it('renders scores after loading', async () => {
    vi.mocked(client.fetchScores).mockResolvedValue([
      { id: 1, channel: 1, band: '2.4GHz', score: 50, breakdown: '{}', createdAt: new Date().toISOString() },
    ]);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Channels Monitored')).toBeInTheDocument();
    });

    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('50').length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state when no scores', async () => {
    vi.mocked(client.fetchScores).mockResolvedValue([]);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Average Score')).toBeInTheDocument();
    });
  });

  it('renders export button', async () => {
    vi.mocked(client.fetchScores).mockResolvedValue([]);
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Export CSV')).toBeInTheDocument();
    });
  });
});
