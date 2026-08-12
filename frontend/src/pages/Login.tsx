import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

function EyeIcon({ off }: { off: boolean }) {
  if (off) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3l18 18" strokeLinecap="round" />
        <path
          d="M10.6 5.1A10.9 10.9 0 0 1 12 5c5.5 0 9.5 4.5 10.5 7-.4.9-1 2-1.9 3.1M6.2 6.6C4 8.1 2.5 10.2 1.5 12c1.4 3 5.3 7 10.5 7 1.6 0 3.1-.4 4.4-1"
          strokeLinecap="round"
        />
        <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7-10.5-7-10.5-7z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<'username' | 'password'>('username');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [showForgotHint, setShowForgotHint] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleContinue = (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setError(null);
    setStep('password');
  };

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password, keepSignedIn);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no login.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {step === 'username' ? (
          <form onSubmit={handleContinue}>
            <div className="login-card__body">
              <div className="login-card__brand">
                <span className="login-card__brand-label">SYSVEX ID</span>
                <img src="/logo.png" alt="SYSVEX" className="login-card__logo" />
              </div>

              <h1>Entrar</h1>
              <p>SYSVEX ERP</p>

              {error && <div className="alert alert--error">{error}</div>}

              <div className="login-field">
                <label htmlFor="username">Usuário</label>
                <input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                  required
                />
              </div>
            </div>
            <div className="login-card__footer">
              <button className="btn" type="submit">
                Continuar
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSignIn}>
            <div className="login-card__body">
              <div className="login-card__brand">
                <span className="login-card__brand-label">SYSVEX ID</span>
                <img src="/logo.png" alt="SYSVEX" className="login-card__logo" />
              </div>

              <h1>Entrar</h1>
              <p>SYSVEX ERP</p>

              {error && <div className="alert alert--error">{error}</div>}

              <div className="login-field login-field--disabled">
                <div style={{ flex: 1 }}>
                  <label>Usuário</label>
                  <input value={username} disabled />
                </div>
                <button
                  type="button"
                  className="login-link-btn"
                  onClick={() => {
                    setStep('username');
                    setPassword('');
                    setError(null);
                  }}
                >
                  Alterar
                </button>
              </div>

              <div className="login-field login-password-field">
                <label htmlFor="password">Senha</label>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  required
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  <EyeIcon off={showPassword} />
                </button>
              </div>

              <div className="login-row">
                <label className="login-checkbox">
                  <input
                    type="checkbox"
                    checked={keepSignedIn}
                    onChange={(e) => setKeepSignedIn(e.target.checked)}
                  />
                  Manter conectado
                </label>
                <button type="button" className="login-link-btn" onClick={() => setShowForgotHint(true)}>
                  Esqueceu a senha?
                </button>
              </div>

              {showForgotHint && (
                <div className="login-hint" style={{ marginTop: 12, marginBottom: 0 }}>
                  Fale com o administrador do sistema para redefinir sua senha.
                </div>
              )}
            </div>
            <div className="login-card__footer">
              <button className="btn" type="submit" disabled={submitting}>
                {submitting ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
