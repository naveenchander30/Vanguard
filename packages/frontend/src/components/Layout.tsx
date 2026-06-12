import { NavLink } from 'react-router-dom';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="layout">
      <nav className="nav">
        <div className="nav-brand">Spectrum Audit</div>
        <ul className="nav-links">
          <li><NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>Dashboard</NavLink></li>
          <li><NavLink to="/infrastructure" className={({ isActive }) => isActive ? 'active' : ''}>Infrastructure</NavLink></li>
          <li><NavLink to="/telemetry" className={({ isActive }) => isActive ? 'active' : ''}>Telemetry</NavLink></li>
        </ul>
      </nav>
      <main className="main">{children}</main>
    </div>
  );
}
