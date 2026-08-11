import { FormEvent, useEffect, useState } from 'react';
import apiClient, { extractErrorMessage } from '../../api/client';
import Modal from '../../components/Modal';

interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'FINANCE' | 'PURCHASING' | 'SALES' | 'PRODUCTION';
  active: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  FINANCE: 'Financeiro',
  PURCHASING: 'Compras',
  SALES: 'Vendas',
  PRODUCTION: 'Produção',
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<User['role']>('SALES');

  const load = () => {
    apiClient.get<User[]>('/users').then((res) => setUsers(res.data));
  };

  useEffect(load, []);

  const resetForm = () => {
    setUsername('');
    setEmail('');
    setFullName('');
    setPassword('');
    setRole('SALES');
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post('/users', { username, email, fullName, password, role });
      setShowModal(false);
      resetForm();
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const toggleActive = async (user: User) => {
    await apiClient.patch(`/users/${user.id}`, { active: !user.active });
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h1>Usuários & Roles</h1>
        <button className="btn" onClick={() => setShowModal(true)}>
          + Novo Usuário
        </button>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Nome</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{u.fullName}</td>
                <td>{u.email}</td>
                <td>{ROLE_LABELS[u.role]}</td>
                <td>{u.active ? 'Ativo' : 'Inativo'}</td>
                <td>
                  <button className="btn btn--secondary btn--sm" onClick={() => toggleActive(u)}>
                    {u.active ? 'Desativar' : 'Ativar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <div className="empty-state">Nenhum usuário cadastrado.</div>}
      </div>

      {showModal && (
        <Modal title="Novo Usuário" onClose={() => setShowModal(false)}>
          {error && <div className="alert alert--error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-field">
                <label>Usuário (login) *</label>
                <input value={username} onChange={(e) => setUsername(e.target.value)} required />
              </div>
              <div className="form-field">
                <label>Nome completo *</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div className="form-field">
                <label>Email *</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="form-field">
                <label>Senha inicial *</label>
                <input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div className="form-field">
                <label>Role *</label>
                <select value={role} onChange={(e) => setRole(e.target.value as User['role'])}>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button className="btn" type="submit">
                Salvar
              </button>
              <button className="btn btn--secondary" type="button" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
