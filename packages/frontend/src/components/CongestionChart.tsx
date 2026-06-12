import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { CongestionScore } from '../api/client';

interface Props {
  data: CongestionScore[];
}

const scoreColor = (score: number): string => {
  if (score >= 70) return '#ef4444';
  if (score >= 40) return '#f59e0b';
  return '#22c55e';
};

export default function CongestionChart({ data }: Props) {
  const chartData = data
    .slice()
    .sort((a, b) => a.channel - b.channel)
    .map((d) => ({
      name: `${d.band === '2.4GHz' ? '2.4' : d.band === '5GHz' ? '5' : '6'}-${d.channel}`,
      score: d.score,
      band: d.band,
    }));

  return (
    <div className="chart">
      <h2>Channel Congestion Scores</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis domain={[0, 100]} label={{ value: 'Score (0-100)', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Bar dataKey="score" name="Congestion">
            {chartData.map((entry, index) => (
              <Cell key={index} fill={scoreColor(entry.score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
