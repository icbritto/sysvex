import { FormEvent, useState } from 'react';
import apiClient, { extractErrorMessage } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';

export default function MyAccountPage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError('A confirmação não confere com a nova senha.');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.patch('/auth/change-password', { currentPassword, newPassword });
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Minha Conta</h1>
      </div>

      <div className="card" style={{ maxWidth: 420 }}>
        <p style={{ marginTop: 0, fontSize: 13, color: 'var(--sysvex-text-muted)' }}>
          Usuário: <strong>{user?.username}</strong> · {user?.fullName}
        </p>

        <h2 style={{ fontSize: 15 }}>Trocar senha</h2>
        {error && <div className="alert alert--error">{error}</div>}
        {success && <div className="alert alert--success">Senha alterada com sucesso.</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-field" style={{ marginBottom: 14 }}>
            <label>Senha atual</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-field" style={{ marginBottom: 14 }}>
            <label>Nova senha</label>
            <input
              type="password"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-field" style={{ marginBottom: 18 }}>
            <label>Confirmar nova senha</label>
            <input
              type="password"
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </form>
      </div>
    </div>
  );
}
