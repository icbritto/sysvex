import { FormEvent, useEffect, useState } from 'react';
import apiClient, { extractErrorMessage } from '../../api/client';
import { ROLE_LABELS } from '../../layout/AppShell';
import { UserRole } from '../../auth/AuthContext';
import { TileIcon } from '../../icons';

const ALL_ROLES = Object.keys(ROLE_LABELS) as UserRole[];

interface AppRow {
  id: string;
  key: string;
  title: string;
  icon: string;
  allowedRoles: UserRole[];
  active: boolean;
}

interface SoDConflict {
  role: UserRole;
  appATitle: string;
  appBTitle: string;
  description: string;
}

interface UserOption {
  id: string;
  username: string;
  fullName: string;
}

interface EmergencyGrant {
  id: string;
  targetUsername: string;
  grantedByUsername: string;
  grantedRole: UserRole;
  reason: string;
  expiresAt: string;
  revokedAt?: string;
  createdAt: string;
}

interface AuditLogEntry {
  id: string;
  actorUsername: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: string;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  APP_PERMISSION_UPDATED: 'Permissão de App alterada',
  USER_ROLE_CHANGED: 'Role de usuário alterada',
  EMERGENCY_ACCESS_GRANTED: 'Acesso emergencial concedido',
  EMERGENCY_ACCESS_REVOKED: 'Acesso emergencial revogado',
};

const DURATION_OPTIONS = [
  { minutes: 30, label: '30 minutos' },
  { minutes: 60, label: '1 hora' },
  { minutes: 120, label: '2 horas' },
  { minutes: 240, label: '4 horas' },
  { minutes: 480, label: '8 horas' },
];

type Tab = 'matrix' | 'emergency' | 'audit';

function grantStatus(grant: EmergencyGrant): { label: string; className: string } {
  if (grant.revokedAt) return { label: 'Revogado', className: 'badge' };
  if (new Date(grant.expiresAt) <= new Date()) return { label: 'Expirado', className: 'badge' };
  return { label: 'Ativo', className: 'badge badge--special' };
}

export default function SecurityCompliancePage() {
  const [tab, setTab] = useState<Tab>('matrix');

  const [apps, setApps] = useState<AppRow[]>([]);
  const [conflicts, setConflicts] = useState<SoDConflict[]>([]);

  const [users, setUsers] = useState<UserOption[]>([]);
  const [grants, setGrants] = useState<EmergencyGrant[]>([]);
  const [targetUserId, setTargetUserId] = useState('');
  const [grantedRole, setGrantedRole] = useState<UserRole>('SX_SALES');
  const [reason, setReason] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [grantError, setGrantError] = useState<string | null>(null);

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);

  const loadMatrix = () => {
    apiClient.get<AppRow[]>('/apps/admin').then((res) => setApps(res.data));
    apiClient.get<SoDConflict[]>('/security/sod-analysis').then((res) => setConflicts(res.data));
  };

  const loadEmergency = () => {
    apiClient.get<UserOption[]>('/users').then((res) => setUsers(res.data));
    apiClient.get<EmergencyGrant[]>('/security/emergency-access').then((res) => setGrants(res.data));
  };

  const loadAudit = () => {
    apiClient.get<AuditLogEntry[]>('/security/audit-logs').then((res) => setLogs(res.data));
  };

  useEffect(() => {
    loadMatrix();
    loadEmergency();
    loadAudit();
  }, []);

  const toggleRole = (app: AppRow, role: UserRole) => {
    const nextRoles = app.allowedRoles.includes(role)
      ? app.allowedRoles.filter((r) => r !== role)
      : [...app.allowedRoles, role];
    if (nextRoles.length === 0) return;
    apiClient.patch(`/apps/${app.id}`, { allowedRoles: nextRoles }).then(loadMatrix);
  };

  const toggleActive = (app: AppRow) => {
    apiClient.patch(`/apps/${app.id}`, { active: !app.active }).then(loadMatrix);
  };

  const handleGrantSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGrantError(null);
    try {
      await apiClient.post('/security/emergency-access', { targetUserId, grantedRole, reason, durationMinutes });
      setTargetUserId('');
      setReason('');
      loadEmergency();
      loadAudit();
    } catch (err) {
      setGrantError(extractErrorMessage(err));
    }
  };

  const revokeGrant = async (grant: EmergencyGrant) => {
    await apiClient.patch(`/security/emergency-access/${grant.id}/revoke`);
    loadEmergency();
    loadAudit();
  };

  return (
    <div>
      <div className="page-header">
        <h1>Segurança & Compliance</h1>
      </div>

      <div className="apps-tabs">
        <button
          type="button"
          className={`apps-tabs__tab ${tab === 'matrix' ? 'apps-tabs__tab--active' : ''}`}
          onClick={() => setTab('matrix')}
        >
          Matriz de Acesso
        </button>
        <button
          type="button"
          className={`apps-tabs__tab ${tab === 'emergency' ? 'apps-tabs__tab--active' : ''}`}
          onClick={() => setTab('emergency')}
        >
          Acesso Emergencial
        </button>
        <button
          type="button"
          className={`apps-tabs__tab ${tab === 'audit' ? 'apps-tabs__tab--active' : ''}`}
          onClick={() => setTab('audit')}
        >
          Log de Auditoria
        </button>
      </div>

      {tab === 'matrix' && (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>App</th>
                  {ALL_ROLES.map((role) => (
                    <th key={role}>{ROLE_LABELS[role]}</th>
                  ))}
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((app) => (
                  <tr key={app.id}>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <TileIcon name={app.icon} size={15} /> {app.title}
                      </span>
                    </td>
                    {ALL_ROLES.map((role) => (
                      <td key={role}>
                        <input
                          type="checkbox"
                          checked={app.allowedRoles.includes(role)}
                          onChange={() => toggleRole(app, role)}
                        />
                      </td>
                    ))}
                    <td>
                      <button className="btn btn--secondary btn--sm" onClick={() => toggleActive(app)}>
                        {app.active ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card" style={{ marginTop: 18 }}>
            <h2 style={{ marginTop: 0, fontSize: 15 }}>Conflitos de Segregação de Funções (SoD)</h2>
            {conflicts.length === 0 ? (
              <div className="empty-state">Nenhum conflito encontrado na matriz atual.</div>
            ) : (
              conflicts.map((conflict, idx) => (
                <div key={idx} className="alert alert--error" style={{ marginBottom: 8 }}>
                  <span className="badge badge--warning" style={{ marginRight: 8 }}>
                    {ROLE_LABELS[conflict.role]}
                  </span>
                  tem acesso simultâneo a <strong>{conflict.appATitle}</strong> e{' '}
                  <strong>{conflict.appBTitle}</strong>. {conflict.description}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {tab === 'emergency' && (
        <>
          <div className="card">
            <h2 style={{ marginTop: 0, fontSize: 15 }}>Conceder acesso emergencial (firefighter)</h2>
            {grantError && <div className="alert alert--error">{grantError}</div>}
            <form onSubmit={handleGrantSubmit}>
              <div className="form-grid">
                <div className="form-field">
                  <label>Usuário alvo *</label>
                  <select value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} required>
                    <option value="">Selecione…</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.username})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label>Role concedida *</label>
                  <select value={grantedRole} onChange={(e) => setGrantedRole(e.target.value as UserRole)}>
                    {ALL_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label>Duração *</label>
                  <select value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))}>
                    {DURATION_OPTIONS.map((opt) => (
                      <option key={opt.minutes} value={opt.minutes}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label>Motivo *</label>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} minLength={10} required />
                </div>
              </div>
              <div className="form-actions">
                <button className="btn" type="submit">
                  Conceder acesso
                </button>
              </div>
            </form>
          </div>

          <div className="table-wrap" style={{ marginTop: 18 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Role concedida</th>
                  <th>Concedido por</th>
                  <th>Expira em</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {grants.map((grant) => {
                  const status = grantStatus(grant);
                  return (
                    <tr key={grant.id}>
                      <td>{grant.targetUsername}</td>
                      <td>{ROLE_LABELS[grant.grantedRole]}</td>
                      <td>{grant.grantedByUsername}</td>
                      <td>{new Date(grant.expiresAt).toLocaleString('pt-BR')}</td>
                      <td>
                        <span className={status.className}>{status.label}</span>
                      </td>
                      <td>
                        {!grant.revokedAt && new Date(grant.expiresAt) > new Date() && (
                          <button className="btn btn--danger btn--sm" onClick={() => revokeGrant(grant)}>
                            Revogar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {grants.length === 0 && <div className="empty-state">Nenhum acesso emergencial concedido.</div>}
          </div>
        </>
      )}

      {tab === 'audit' && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Ator</th>
                <th>Ação</th>
                <th>Alvo</th>
                <th>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.createdAt).toLocaleString('pt-BR')}</td>
                  <td>{log.actorUsername}</td>
                  <td>{ACTION_LABELS[log.action] ?? log.action}</td>
                  <td>{log.targetType}</td>
                  <td>{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && <div className="empty-state">Nenhum evento registrado ainda.</div>}
        </div>
      )}
    </div>
  );
}
