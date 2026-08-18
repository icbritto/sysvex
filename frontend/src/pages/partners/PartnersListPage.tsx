import { FormEvent, useEffect, useState } from 'react';
import apiClient, { extractErrorMessage } from '../../api/client';
import Modal from '../../components/Modal';
import ColumnVisibilityModal from '../../components/ColumnVisibilityModal';
import { ColumnDef, useColumnVisibility } from '../../hooks/useColumnVisibility';
import { FilterIcon, ListIcon } from '../../icons';
import { formatCpfCnpj, formatPhone } from '../../utils/masks';
import { useNotify } from '../../notifications/NotificationContext';

interface Partner {
  id: string;
  name: string;
  personType: 'INDIVIDUAL' | 'COMPANY';
  legalName: string | null;
  tradeName: string | null;
  document: string | null;
  type: 'CUSTOMER' | 'SUPPLIER' | 'BOTH';
  email: string | null;
  phone: string | null;
  address: string | null;
  active: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  CUSTOMER: 'Cliente',
  SUPPLIER: 'Fornecedor',
  BOTH: 'Cliente/Fornecedor',
};

const PERSON_TYPE_LABELS: Record<string, string> = {
  INDIVIDUAL: 'Pessoa Física',
  COMPANY: 'Pessoa Jurídica',
};

const COLUMNS: ColumnDef[] = [
  { key: 'name', label: 'Nome' },
  { key: 'personType', label: 'Tipo de Pessoa' },
  { key: 'type', label: 'Tipo' },
  { key: 'document', label: 'Documento' },
  { key: 'contact', label: 'Contato' },
  { key: 'status', label: 'Status' },
];

interface PartnersListPageProps {
  partnerType: 'CUSTOMER' | 'SUPPLIER';
  title: string;
  storageKey: string;
}

export default function PartnersListPage({ partnerType, title, storageKey }: PartnersListPageProps) {
  const notify = useNotify();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<{ kind: 'activate' | 'deactivate'; ids: string[] } | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const columns = useColumnVisibility(storageKey, COLUMNS);

  const [draftFilterName, setDraftFilterName] = useState('');
  const [draftFilterDocument, setDraftFilterDocument] = useState('');
  const [draftFilterStatus, setDraftFilterStatus] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterDocument, setFilterDocument] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [personType, setPersonType] = useState<'INDIVIDUAL' | 'COMPANY'>('INDIVIDUAL');
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [document, setDocument] = useState('');
  const [type, setType] = useState<'CUSTOMER' | 'SUPPLIER' | 'BOTH'>(partnerType);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const load = () => {
    setLoading(true);
    apiClient
      .get<Partner[]>('/partners')
      .then((res) => setPartners(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const byType = partners.filter((p) => p.type === partnerType || p.type === 'BOTH');

  const filteredPartners = byType.filter((p) => {
    if (filterName) {
      const haystack = `${p.name} ${p.legalName ?? ''} ${p.tradeName ?? ''}`.toLowerCase();
      if (!haystack.includes(filterName.trim().toLowerCase())) return false;
    }
    if (filterDocument && !(p.document ?? '').includes(filterDocument.trim())) return false;
    if (filterStatus && String(p.active) !== filterStatus) return false;
    return true;
  });
  const hasActiveFilters = Boolean(filterName || filterDocument || filterStatus);

  const applyFilters = (e: FormEvent) => {
    e.preventDefault();
    setFilterName(draftFilterName);
    setFilterDocument(draftFilterDocument);
    setFilterStatus(draftFilterStatus);
  };

  const clearFilters = () => {
    setDraftFilterName('');
    setDraftFilterDocument('');
    setDraftFilterStatus('');
    setFilterName('');
    setFilterDocument('');
    setFilterStatus('');
  };

  const selectedPartners = partners.filter((p) => selectedIds.has(p.id));
  const allSelectedActive = selectedPartners.length > 0 && selectedPartners.every((p) => p.active);
  const allSelectedInactive = selectedPartners.length > 0 && selectedPartners.every((p) => !p.active);

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
      if (filteredPartners.length > 0 && filteredPartners.every((p) => prev.has(p.id))) return new Set();
      return new Set(filteredPartners.map((p) => p.id));
    });
  };

  const resetForm = () => {
    setPersonType('INDIVIDUAL');
    setName('');
    setLegalName('');
    setTradeName('');
    setDocument('');
    setType(partnerType);
    setEmail('');
    setPhone('');
    setAddress('');
    setError(null);
  };

  const openCreateModal = () => {
    resetForm();
    setEditingId(null);
    setShowModal(true);
  };

  const openEditModal = (partner: Partner) => {
    setEditingId(partner.id);
    setPersonType(partner.personType);
    setName(partner.name);
    setLegalName(partner.legalName ?? '');
    setTradeName(partner.tradeName ?? '');
    setDocument(partner.document ?? '');
    setType(partner.type);
    setEmail(partner.email ?? '');
    setPhone(partner.phone ?? '');
    setAddress(partner.address ?? '');
    setError(null);
    setShowModal(true);
  };

  const handleEditClick = () => {
    if (selectedIds.size !== 1) {
      notify('Selecione exatamente um registro para editar.');
      return;
    }
    const partner = partners.find((p) => p.id === [...selectedIds][0]);
    if (partner) openEditModal(partner);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload = {
      personType,
      document: document || null,
      type,
      email: email || null,
      phone: phone || null,
      address: address || null,
      ...(personType === 'INDIVIDUAL' ? { name } : { legalName, tradeName }),
    };
    try {
      if (editingId) {
        await apiClient.patch(`/partners/${editingId}`, payload);
      } else {
        await apiClient.post('/partners', payload);
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
    if (selectedPartners.length === 0) {
      notify('Selecione ao menos um registro inativo para ativar.');
      return;
    }
    if (!allSelectedInactive) {
      notify('Só é possível ativar em massa quando todos os selecionados estão inativos. Desmarque os que já estão ativos.');
      return;
    }
    setBulkAction({ kind: 'activate', ids: selectedPartners.map((p) => p.id) });
  };

  const handleDeactivateClick = () => {
    if (selectedPartners.length === 0) {
      notify('Selecione ao menos um registro ativo para desativar.');
      return;
    }
    if (!allSelectedActive) {
      notify('Só é possível desativar em massa quando todos os selecionados estão ativos. Desmarque os que já estão inativos.');
      return;
    }
    setBulkAction({ kind: 'deactivate', ids: selectedPartners.map((p) => p.id) });
  };

  const runBulkAction = async () => {
    if (!bulkAction) return;
    setBulkRunning(true);
    const active = bulkAction.kind === 'activate';
    let failures = 0;
    for (const id of bulkAction.ids) {
      try {
        await apiClient.patch(`/partners/${id}`, { active });
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
      notify(`${failures} de ${bulkAction.ids.length} registro(s) não puderam ser ${verb}.`);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>{title}</h1>
      </div>

      <form className="filter-bar" onSubmit={applyFilters}>
        <div className="filter-field">
          <label>Nome</label>
          <input value={draftFilterName} onChange={(e) => setDraftFilterName(e.target.value)} placeholder="Buscar por nome..." />
        </div>
        <div className="filter-field">
          <label>Documento</label>
          <input value={draftFilterDocument} onChange={(e) => setDraftFilterDocument(e.target.value)} placeholder="CPF/CNPJ" />
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
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 32 }}>
                <input
                  type="checkbox"
                  checked={filteredPartners.length > 0 && filteredPartners.every((p) => selectedIds.has(p.id))}
                  onChange={toggleSelectAll}
                  aria-label="Selecionar todos"
                />
              </th>
              {columns.isVisible('name') && <th>Nome</th>}
              {columns.isVisible('personType') && <th>Tipo de Pessoa</th>}
              {columns.isVisible('type') && <th>Tipo</th>}
              {columns.isVisible('document') && <th>Documento</th>}
              {columns.isVisible('contact') && <th>Contato</th>}
              {columns.isVisible('status') && <th>Status</th>}
            </tr>
          </thead>
          <tbody>
            {filteredPartners.map((p) => (
              <tr
                key={p.id}
                data-selectable
                className={selectedIds.has(p.id) ? 'selected' : ''}
                onClick={() => selectOnly(p.id)}
              >
                <td onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(p.id)}
                    onChange={() => toggleOne(p.id)}
                    aria-label={`Selecionar ${p.name}`}
                  />
                </td>
                {columns.isVisible('name') && <td>{p.name}</td>}
                {columns.isVisible('personType') && <td>{PERSON_TYPE_LABELS[p.personType]}</td>}
                {columns.isVisible('type') && <td>{TYPE_LABELS[p.type]}</td>}
                {columns.isVisible('document') && <td>{p.document ?? '–'}</td>}
                {columns.isVisible('contact') && <td>{p.email ?? p.phone ?? '–'}</td>}
                {columns.isVisible('status') && (
                  <td>
                    <span className={`badge ${p.active ? 'badge--success' : 'badge--danger'}`}>
                      {p.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filteredPartners.length === 0 && (
          <div className="empty-state">
            {hasActiveFilters ? 'Nenhum registro encontrado para os filtros aplicados.' : 'Nenhum registro cadastrado.'}
          </div>
        )}
      </div>

      {showColumnsModal && (
        <ColumnVisibilityModal
          columns={COLUMNS}
          isVisible={columns.isVisible}
          onToggle={columns.toggle}
          onClose={() => setShowColumnsModal(false)}
        />
      )}

      {bulkAction && (
        <Modal
          title={bulkAction.kind === 'activate' ? 'Ativar registros' : 'Desativar registros'}
          onClose={() => (bulkRunning ? undefined : setBulkAction(null))}
        >
          <p>
            {bulkAction.kind === 'activate'
              ? `Ativar ${bulkAction.ids.length} registro(s) selecionado(s)?`
              : `Desativar ${bulkAction.ids.length} registro(s) selecionado(s)? Eles deixarão de aparecer nas listas de seleção de novos pedidos.`}
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
        <Modal
          title={editingId ? `Editar ${title === 'Clientes' ? 'Cliente' : 'Fornecedor'}` : `Novo ${title === 'Clientes' ? 'Cliente' : 'Fornecedor'}`}
          onClose={() => setShowModal(false)}
        >
          {error && <div className="alert alert--error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-field">
                <label>Tipo de Pessoa *</label>
                <select value={personType} onChange={(e) => setPersonType(e.target.value as typeof personType)}>
                  <option value="INDIVIDUAL">Pessoa Física</option>
                  <option value="COMPANY">Pessoa Jurídica</option>
                </select>
              </div>
              {personType === 'INDIVIDUAL' ? (
                <div className="form-field">
                  <label>Nome *</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
              ) : (
                <>
                  <div className="form-field">
                    <label>Razão Social *</label>
                    <input
                      value={legalName}
                      onChange={(e) => setLegalName(e.target.value.toUpperCase())}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Nome Fantasia *</label>
                    <input
                      value={tradeName}
                      onChange={(e) => setTradeName(e.target.value.toUpperCase())}
                      required
                    />
                  </div>
                </>
              )}
              <div className="form-field">
                <label>Tipo *</label>
                <select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
                  <option value="CUSTOMER">Cliente</option>
                  <option value="SUPPLIER">Fornecedor</option>
                  <option value="BOTH">Cliente e Fornecedor</option>
                </select>
              </div>
              <div className="form-field">
                <label>CPF/CNPJ</label>
                <input value={document} onChange={(e) => setDocument(formatCpfCnpj(e.target.value))} inputMode="numeric" />
              </div>
              <div className="form-field">
                <label>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="form-field">
                <label>Telefone</label>
                <input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} inputMode="tel" />
              </div>
              <div className="form-field">
                <label>Endereço</label>
                <input value={address} onChange={(e) => setAddress(e.target.value)} />
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
