import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Infrastructure from './pages/Infrastructure';
import Telemetry from './pages/Telemetry';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/infrastructure" element={<Infrastructure />} />
        <Route path="/telemetry" element={<Telemetry />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
