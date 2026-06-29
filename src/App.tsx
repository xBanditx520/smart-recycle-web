import { useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useSwipeable } from 'react-swipeable';
import AboutModal from './components/AboutModal';
import AccessGate from './components/AccessGate';
import HistoryPage from './pages/HistoryPage';
import ModelPage from './pages/ModelPage';
import RecognitionPage from './pages/RecognitionPage';

type NavItem = { to: string; label: string; end?: boolean };

const NAV_ROUTES = ['/', '/history', '/model'];

const bottomNavItems: NavItem[] = [
  { to: '/', label: 'Scan', end: true },
  { to: '/history', label: 'History' },
  { to: '/model', label: 'Model' }
];

export default function App() {
  const [showAbout, setShowAbout] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      const idx = NAV_ROUTES.indexOf(location.pathname);
      if (idx >= 0 && idx < NAV_ROUTES.length - 1) navigate(NAV_ROUTES[idx + 1]);
    },
    onSwipedRight: () => {
      const idx = NAV_ROUTES.indexOf(location.pathname);
      if (idx > 0) navigate(NAV_ROUTES[idx - 1]);
    },
    swipeDuration: 500,
    preventScrollOnSwipe: false,
    trackMouse: false,
    delta: 60
  });

  return (
    <div className="app-shell" {...swipeHandlers}>
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">SR</div>
          <div>
            <p className="eyebrow">Smart Recycle Web</p>
            <h1>Recycle smarter with real browser inference.</h1>
          </div>
        </div>
        <button
          className="icon-button"
          type="button"
          onClick={() => setShowAbout(true)}
          aria-label="About this app"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="8.01" />
            <line x1="12" y1="12" x2="12" y2="16" />
          </svg>
        </button>
      </header>

      <main className="page-shell" key={location.pathname}>
        <AccessGate>
          <Routes>
            <Route path="/" element={<RecognitionPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/model" element={<ModelPage />} />
            <Route path="/recognize" element={<Navigate to="/" replace />} />
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

      {showAbout ? <AboutModal onClose={() => setShowAbout(false)} /> : null}
    </div>
  );
}
