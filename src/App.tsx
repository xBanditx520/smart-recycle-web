import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import AboutPage from './pages/AboutPage';
import HomePage from './pages/HomePage';
import RecognitionPage from './pages/RecognitionPage';

const navItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/recognize', label: 'Recognize' },
  { to: '/about', label: 'About' }
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

        <nav className="topnav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="page-shell">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/recognize" element={<RecognitionPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
