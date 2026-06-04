import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import AccessGate from './components/AccessGate';
import HistoryPage from './pages/HistoryPage';
import HomePage from './pages/HomePage';
import RecognitionPage from './pages/RecognitionPage';

const bottomNavItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/recognize', label: 'Scan' },
  { to: '/history', label: 'History' }
] as const;

export default function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">SR</div>
          <div>
            <p className="eyebrow">Smart Recycle Web</p>
            <h1>Recycle smarter with real browser inference.</h1>
          </div>
        </div>

      </header>

      <main className="page-shell">
        <AccessGate>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/recognize" element={<RecognitionPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AccessGate>
      </main>

      <nav className="bottom-nav" aria-label="Bottom navigation">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => (isActive ? 'bottom-link active' : 'bottom-link')}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
