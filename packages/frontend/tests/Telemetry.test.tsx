import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Telemetry from '../src/pages/Telemetry';
import * as client from '../src/api/client';

vi.mock('../src/api/client', () => ({
  fetchTelemetry: vi.fn(),
  telemetryExportUrl: vi.fn(() => '/api/telemetry/export'),
}));

describe('Telemetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(client.fetchTelemetry).mockReturnValue(new Promise(() => {}));
    render(<Telemetry />);
    expect(screen.getByText('Loading telemetry...')).toBeInTheDocument();
  });

  it('renders telemetry entries', async () => {
    vi.mocked(client.fetchTelemetry).mockResolvedValue([
      { id: 1, bssid: 'AA:BB:CC:DD:EE:01', ssid: 'Test', band: '5GHz', channel: '36', signalDb: -60, clientCount: 5, channelUtilization: 30, noiseFloor: -95, source: 'kismet', createdAt: new Date().toISOString() },
    ]);

    render(<Telemetry />);

    await waitFor(() => {
      expect(screen.getByText('AA:BB:CC:DD:EE:01')).toBeInTheDocument();
    });
    expect(screen.getByText('kismet')).toBeInTheDocument();
  });

  it('renders export button', async () => {
    vi.mocked(client.fetchTelemetry).mockResolvedValue([]);
    render(<Telemetry />);

    await waitFor(() => {
      expect(screen.getByText('Export CSV')).toBeInTheDocument();
    });
  });
});
