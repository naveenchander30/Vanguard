import { useState, useEffect, useCallback } from 'react';
import { fetchClients, subscribeClients } from '../api/client';
import type { ClientLoad } from '../api/client';

export default function Clients() {
  const [clients, setClients] = useState<ClientLoad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClients()
      .then(setClients)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleClients = useCallback((data: ClientLoad[]) => {
    setClients(data);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeClients(handleClients);
    return unsubscribe;
  }, [handleClients]);

  if (loading) return <div className="loading">Loading clients...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Clients</h1>
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-value">{clients.length}</span>
          <span className="stat-label">Access Points</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{clients.reduce((a, c) => a + c.activeClientCount, 0)}</span>
          <span className="stat-label">Total Clients</span>
        </div>
      </div>
      {clients.length > 0 ? (
        <div className="clients-grid">
          {clients.map((c) => (
            <div key={c.bssid} className="client-card">
              <div className="client-header">
                <span className="client-name">{c.ssid}</span>
                <span className={`source source-${c.source}`}>{c.source}</span>
              </div>
              <div className="client-bssid mono">{c.bssid}</div>
              <div className="client-count">{c.activeClientCount} client{c.activeClientCount !== 1 ? 's' : ''}</div>
              <div className="client-time">Last seen: {new Date(c.lastSeen).toLocaleTimeString()}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">No client data available yet. The hybrid poller will collect data every 15 seconds.</div>
      )}
    </div>
  );
}
