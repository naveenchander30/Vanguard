import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Infrastructure from './pages/Infrastructure';
import Telemetry from './pages/Telemetry';
import Clients from './pages/Clients';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/infrastructure" element={<Infrastructure />} />
        <Route path="/telemetry" element={<Telemetry />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
