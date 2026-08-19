import { FormEvent, useEffect, useState } from 'react';
import apiClient, { extractErrorMessage } from '../../api/client';
import Modal from '../../components/Modal';
import ColumnVisibilityModal from '../../components/ColumnVisibilityModal';
import SortModal from '../../components/SortModal';
import Spinner from '../../components/Spinner';
import { ROLE_LABELS } from '../../layout/AppShell';
import { UserRole } from '../../auth/AuthContext';
import { useNotify } from '../../notifications/NotificationContext';
import { ColumnDef, useColumnVisibility } from '../../hooks/useColumnVisibility';
import { useSort } from '../../hooks/useSort';
import { FilterIcon, ListIcon, SortIcon } from '../../icons';

const COLUMNS: ColumnDef[] = [
  { key: 'username', label: 'Usuário' },
  { key: 'fullName', label: 'Nome' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
  { key: 'status', label: 'Status' },
];

interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  active: boolean;
}

export default function UsersPage() {
  const notify = useNotify();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<{ kind: 'activate' | 'deactivate'; ids: string[] } | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const columns = useColumnVisibility('users', COLUMNS);
  const sort = useSort('users', COLUMNS, 'username');

  const [draftFilterName, setDraftFilterName] = useState('');
  const [draftFilterRole, setDraftFilterRole] = useState('');
  const [draftFilterStatus, setDraftFilterStatus] = useState('');

  const [filterName, setFilterName] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<User['role']>('SX_SALES');

  const load = () => {
    setLoading(true);
    apiClient
      .get<User[]>('/users')
      .then((res) => setUsers(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filteredUsers = users.filter((u) => {
    if (filterName) {
      const haystack = `${u.username} ${u.fullName} ${u.email}`.toLowerCase();
      if (!haystack.includes(filterName.trim().toLowerCase())) return false;
    }
    if (filterRole && u.role !== filterRole) return false;
    if (filterStatus && String(u.active) !== filterStatus) return false;
    return true;
  });
  const hasActiveFilters = Boolean(filterName || filterRole || filterStatus);

  const compareUsers = (a: User, b: User) => {
    const dir = sort.direction === 'asc' ? 1 : -1;
    switch (sort.sortKey) {
      case 'fullName':
        return a.fullName.localeCompare(b.fullName) * dir;
      case 'email':
        return a.email.localeCompare(b.email) * dir;
      case 'role':
        return ROLE_LABELS[a.role].localeCompare(ROLE_LABELS[b.role]) * dir;
      case 'status':
        return (Number(a.active) - Number(b.active)) * dir;
      case 'username':
      default:
        return a.username.localeCompare(b.username) * dir;
    }
  };
  const sortedUsers = [...filteredUsers].sort(compareUsers);
  const visibleColumns = columns.orderedColumns.filter((c) => columns.isVisible(c.key));

  const renderCell = (key: string, u: User) => {
    switch (key) {
      case 'username':
        return u.username;
      case 'fullName':
        return u.fullName;
      case 'email':
        return u.email;
      case 'role':
        return ROLE_LABELS[u.role];
      case 'status':
        return <span className={`badge ${u.active ? 'badge--success' : 'badge--danger'}`}>{u.active ? 'Ativo' : 'Inativo'}</span>;
      default:
        return null;
    }
  };

  const applyFilters = (e: FormEvent) => {
    e.preventDefault();
    setFilterName(draftFilterName);
    setFilterRole(draftFilterRole);
    setFilterStatus(draftFilterStatus);
  };

  const clearFilters = () => {
    setDraftFilterName('');
    setDraftFilterRole('');
    setDraftFilterStatus('');
    setFilterName('');
    setFilterRole('');
    setFilterStatus('');
  };

  const selectedUsers = users.filter((u) => selectedIds.has(u.id));
  const allSelectedActive = selectedUsers.length > 0 && selectedUsers.every((u) => u.active);
  const allSelectedInactive = selectedUsers.length > 0 && selectedUsers.every((u) => !u.active);

  const selectOnly = (id: string) => setSelectedIds(new Set([id]));

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (filteredUsers.length > 0 && filteredUsers.every((u) => prev.has(u.id))) return new Set();
      return new Set(filteredUsers.map((u) => u.id));
    });
  };

  const resetForm = () => {
    setUsername('');
    setEmail('');
    setFullName('');
    setPassword('');
    setRole('SX_SALES');
    setError(null);
  };

  const openCreateModal = () => {
    resetForm();
    setEditingId(null);
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingId(user.id);
    setUsername(user.username);
    setEmail(user.email);
    setFullName(user.fullName);
    setPassword('');
    setRole(user.role);
    setError(null);
    setShowModal(true);
  };

  const handleEditClick = () => {
    if (selectedIds.size !== 1) {
      notify('Selecione exatamente um usuário para editar.');
      return;
    }
    const user = users.find((u) => u.id === [...selectedIds][0]);
    if (user) openEditModal(user);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingId) {
        await apiClient.patch(`/users/${editingId}`, { username, email, fullName, role });
      } else {
        await apiClient.post('/users', { username, email, fullName, password, role });
      }
      setShowModal(false);
      resetForm();
      setEditingId(null);
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const handleActivateClick = () => {
    if (selectedUsers.length === 0) {
      notify('Selecione ao menos um usuário inativo para ativar.');
      return;
    }
    if (!allSelectedInactive) {
      notify('Só é possível ativar em massa quando todos os selecionados estão inativos. Desmarque os que já estão ativos.');
      return;
    }
    setBulkAction({ kind: 'activate', ids: selectedUsers.map((u) => u.id) });
  };

  const handleDeactivateClick = () => {
    if (selectedUsers.length === 0) {
      notify('Selecione ao menos um usuário ativo para desativar.');
      return;
    }
    if (!allSelectedActive) {
      notify('Só é possível desativar em massa quando todos os selecionados estão ativos. Desmarque os que já estão inativos.');
      return;
    }
    setBulkAction({ kind: 'deactivate', ids: selectedUsers.map((u) => u.id) });
  };

  const runBulkAction = async () => {
    if (!bulkAction) return;
    setBulkRunning(true);
    const active = bulkAction.kind === 'activate';
    let failures = 0;
    for (const id of bulkAction.ids) {
      try {
        await apiClient.patch(`/users/${id}`, { active });
      } catch {
        failures += 1;
      }
    }
    setBulkRunning(false);
    setBulkAction(null);
    setSelectedIds(new Set());
    load();
    if (failures > 0) {
      const verb = active ? 'ativados' : 'desativados';
      notify(`${failures} de ${bulkAction.ids.length} usuário(s) não puderam ser ${verb}.`);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Usuários & Roles</h1>
      </div>

      <form className="filter-bar" onSubmit={applyFilters}>
        <div className="filter-field">
          <label>Usuário / Nome / Email</label>
          <input value={draftFilterName} onChange={(e) => setDraftFilterName(e.target.value)} placeholder="Buscar..." />
        </div>
        <div className="filter-field">
          <label>Role</label>
          <select value={draftFilterRole} onChange={(e) => setDraftFilterRole(e.target.value)}>
            <option value="">Todas</option>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label>Status</label>
          <select value={draftFilterStatus} onChange={(e) => setDraftFilterStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </select>
        </div>
        <button type="submit" className="btn btn--sm" title="Filtrar" aria-label="Filtrar">
          <FilterIcon size={14} />
        </button>
        {hasActiveFilters && (
          <button type="button" className="filter-bar__clear" onClick={clearFilters}>
            Limpar filtros
          </button>
        )}
      </form>

      <div className="toolbar">
        <button className="toolbar-btn" onClick={openCreateModal}>
          Criar
        </button>
        <button
          className={`toolbar-btn${selectedIds.size !== 1 ? ' toolbar-btn--disabled' : ''}`}
          onClick={handleEditClick}
        >
          Editar
        </button>
        <button
          className={`toolbar-btn${!allSelectedInactive ? ' toolbar-btn--disabled' : ''}`}
          onClick={handleActivateClick}
        >
          Ativar
        </button>
        <button
          className={`toolbar-btn${!allSelectedActive ? ' toolbar-btn--disabled' : ''}`}
          onClick={handleDeactivateClick}
        >
          Desativar
        </button>
        <button
          className="toolbar-btn"
          onClick={() => setShowColumnsModal(true)}
          title="Colunas"
          aria-label="Colunas visíveis"
        >
          <ListIcon size={16} />
        </button>
        <button
          className="toolbar-btn"
          onClick={() => setShowSortModal(true)}
          title="Ordenar por"
          aria-label="Ordenar por"
        >
          <SortIcon size={16} />
        </button>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 32 }}>
                <input
                  type="checkbox"
                  checked={filteredUsers.length > 0 && filteredUsers.every((u) => selectedIds.has(u.id))}
                  onChange={toggleSelectAll}
                  aria-label="Selecionar todos"
                />
              </th>
              {visibleColumns.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map((u) => (
              <tr
                key={u.id}
                data-selectable
                className={selectedIds.has(u.id) ? 'selected' : ''}
                onClick={() => selectOnly(u.id)}
              >
                <td onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(u.id)}
                    onChange={() => toggleOne(u.id)}
                    aria-label={`Selecionar ${u.username}`}
                  />
                </td>
                {visibleColumns.map((c) => (
                  <td key={c.key}>{renderCell(c.key, u)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {loading && (
          <div className="loading-state">
            <Spinner />
          </div>
        )}
        {!loading && filteredUsers.length === 0 && (
          <div className="empty-state">
            {hasActiveFilters ? 'Nenhum usuário encontrado para os filtros aplicados.' : 'Nenhum usuário cadastrado.'}
          </div>
        )}
      </div>

      {showColumnsModal && (
        <ColumnVisibilityModal
          orderedColumns={columns.orderedColumns}
          isVisible={columns.isVisible}
          onToggle={columns.toggle}
          onMoveUp={columns.moveUp}
          onMoveDown={columns.moveDown}
          onClose={() => setShowColumnsModal(false)}
        />
      )}

      {showSortModal && (
        <SortModal
          options={sort.options}
          sortKey={sort.sortKey}
          direction={sort.direction}
          onChange={sort.setSort}
          onClose={() => setShowSortModal(false)}
        />
      )}

      {bulkAction && (
        <Modal
          title={bulkAction.kind === 'activate' ? 'Ativar usuários' : 'Desativar usuários'}
          onClose={() => (bulkRunning ? undefined : setBulkAction(null))}
        >
          <p>
            {bulkAction.kind === 'activate'
              ? `Ativar ${bulkAction.ids.length} usuário(s) selecionado(s)?`
              : `Desativar ${bulkAction.ids.length} usuário(s) selecionado(s)? Eles deixarão de conseguir acessar o sistema.`}
          </p>
          <div className="form-actions">
            <button className="btn" onClick={runBulkAction} disabled={bulkRunning}>
              {bulkRunning ? 'Processando...' : 'Confirmar'}
            </button>
            <button className="btn btn--secondary" onClick={() => setBulkAction(null)} disabled={bulkRunning}>
              Voltar
            </button>
          </div>
        </Modal>
      )}

      {showModal && (
        <Modal title={editingId ? 'Editar Usuário' : 'Novo Usuário'} onClose={() => setShowModal(false)}>
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
              {!editingId && (
                <div className="form-field">
                  <label>Senha inicial *</label>
                  <input
                    type="password"
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              )}
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
