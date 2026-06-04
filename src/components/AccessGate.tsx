import { ReactNode, useMemo, useState } from 'react';

interface AccessGateProps {
  children: ReactNode;
}

export default function AccessGate({ children }: AccessGateProps) {
  const requiredCode = import.meta.env.VITE_ACCESS_CODE as string | undefined;
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const isGateEnabled = Boolean(requiredCode);
  const isUnlocked = useMemo(() => {
    if (!isGateEnabled) return true;
    return sessionStorage.getItem('smart-recycle-access') === 'granted';
  }, [isGateEnabled]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requiredCode) return;

    if (code.trim() === requiredCode) {
      sessionStorage.setItem('smart-recycle-access', 'granted');
      setError('');
      setCode('');
      return;
    }

    setError('Invalid access code.');
  }

  if (!isGateEnabled || isUnlocked) {
    return <>{children}</>;
  }

  return (
    <div className="access-gate">
      <div className="access-card">
        <p className="section-label">Private preview</p>
        <h2>Enter access code</h2>
        <p className="access-copy">This demo is protected for project review only.</p>
        <form onSubmit={handleSubmit} className="access-form">
          <input
            type="password"
            value={code}
            placeholder="Access code"
            onChange={(event) => setCode(event.target.value)}
            className="access-input"
          />
          <button className="primary-button" type="submit">
            Unlock
          </button>
        </form>
        {error ? <p className="feedback error">{error}</p> : null}
      </div>
    </div>
  );
}
