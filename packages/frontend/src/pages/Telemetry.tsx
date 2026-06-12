import { useState, useEffect } from 'react';
import { fetchTelemetry, telemetryExportUrl } from '../api/client';
import ExportButton from '../components/ExportButton';
import type { TelemetryEntry } from '../api/client';

export default function Telemetry() {
  const [entries, setEntries] = useState<TelemetryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTelemetry()
      .then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Telemetry</h1>
        <ExportButton exportUrl={telemetryExportUrl()} filename="telemetry-export.csv" />
      </div>
      {loading ? (
        <div className="loading">Loading telemetry...</div>
      ) : (
        <div className="telemetry-table">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Source</th>
                <th>BSSID</th>
                <th>SSID</th>
                <th>Band</th>
                <th>Channel</th>
                <th>Signal (dBm)</th>
                <th>Clients</th>
                <th>Utilization %</th>
                <th>Noise Floor</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td>{new Date(e.createdAt).toLocaleString()}</td>
                  <td><span className={`source source-${e.source}`}>{e.source}</span></td>
                  <td className="mono">{e.bssid}</td>
                  <td>{e.ssid}</td>
                  <td>{e.band}</td>
                  <td>{e.channel}</td>
                  <td>{e.signalDb ?? '-'}</td>
                  <td>{e.clientCount ?? '-'}</td>
                  <td>{e.channelUtilization != null ? `${e.channelUtilization}%` : '-'}</td>
                  <td>{e.noiseFloor ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
