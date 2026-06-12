import { useState, useEffect, useCallback } from 'react';
import CongestionChart from '../components/CongestionChart';
import ExportButton from '../components/ExportButton';
import {
  fetchScores,
  subscribeScores,
  telemetryExportUrl,
} from '../api/client';
import type { CongestionScore } from '../api/client';

export default function Dashboard() {
  const [scores, setScores] = useState<CongestionScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScores()
      .then(setScores)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleScore = useCallback((data: CongestionScore[]) => {
    setScores(data);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeScores(handleScore);
    return unsubscribe;
  }, [handleScore]);

  if (loading) return <div className="loading">Loading dashboard...</div>;

  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length)
    : 0;

  const worst = scores.length > 0
    ? scores.reduce((a, b) => (a.score > b.score ? a : b))
    : null;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <ExportButton exportUrl={telemetryExportUrl()} filename="scores-export.csv" />
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-value">{scores.length}</span>
          <span className="stat-label">Channels Monitored</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{avgScore}</span>
          <span className="stat-label">Average Score</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{worst ? `${worst.band}-${worst.channel}` : '-'}</span>
          <span className="stat-label">Worst Channel</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{worst ? worst.score : '-'}</span>
          <span className="stat-label">Worst Score</span>
        </div>
      </div>
      <CongestionChart data={scores} />
      <div className="score-table">
        <h2>Score Details</h2>
        <table>
          <thead>
            <tr>
              <th>Channel</th>
              <th>Band</th>
              <th>Score</th>
              <th>Breakdown</th>
              <th>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((s) => (
              <tr key={`${s.band}-${s.channel}-${s.createdAt}`}>
                <td>{s.channel}</td>
                <td>{s.band}</td>
                <td><span className={`score score-${s.score >= 70 ? 'high' : s.score >= 40 ? 'mid' : 'low'}`}>{s.score}</span></td>
                <td className="breakdown-cell">{s.breakdown}</td>
                <td>{new Date(s.createdAt).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
