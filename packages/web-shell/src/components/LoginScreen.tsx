import React, { FormEvent, useState } from 'react';
import { login } from '../api/auth';

interface LoginScreenProps {
  onLogin: () => void;
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    padding: '40px 32px',
    backgroundColor: '#252525',
    borderRadius: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 32,
  },
  logoText: {
    fontSize: 22,
    fontWeight: 700,
    color: '#f0f0f0',
    letterSpacing: '-0.3px',
  },
  title: {
    fontSize: 15,
    color: '#a0a0a0',
    marginBottom: 24,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: '#c0c0c0',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '9px 12px',
    backgroundColor: '#1a1a1a',
    border: '1px solid #3a3a3a',
    borderRadius: 7,
    fontSize: 14,
    color: '#f0f0f0',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  },
  inputFocus: {
    borderColor: '#6b6bd6',
  },
  error: {
    fontSize: 13,
    color: '#e06060',
    marginBottom: 16,
    padding: '8px 12px',
    backgroundColor: 'rgba(224,96,96,0.1)',
    borderRadius: 6,
    border: '1px solid rgba(224,96,96,0.2)',
  },
  button: {
    width: '100%',
    padding: '10px 0',
    backgroundColor: '#6b6bd6',
    color: '#fff',
    border: 'none',
    borderRadius: 7,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  buttonDisabled: {
    opacity: 0.55,
    cursor: 'not-allowed',
  },
};

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      await login(password);
      onLogin();
    } catch (err) {
      setError((err as Error).message ?? 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <rect width="28" height="28" rx="7" fill="#6b6bd6" />
            <path d="M8 8h12M8 14h8M8 20h10" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          <span style={styles.logoText}>Volt</span>
        </div>
        <div style={styles.title}>Sign in to your Volt instance</div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={styles.field}>
            <label htmlFor="volt-password" style={styles.label}>
              Password
            </label>
            <input
              id="volt-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoFocus
              autoComplete="current-password"
              style={{
                ...styles.input,
                ...(inputFocused ? styles.inputFocus : {}),
              }}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button
            type="submit"
            disabled={loading || !password.trim()}
            style={{
              ...styles.button,
              ...(loading || !password.trim() ? styles.buttonDisabled : {}),
            }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
