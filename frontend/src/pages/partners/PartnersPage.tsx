import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiClient, { extractErrorMessage } from '../../api/client';
import Modal from '../../components/Modal';
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

export default function PartnersPage() {
  const notify = useNotify();
  const [searchParams] = useSearchParams();
  const typeFilter = searchParams.get('type');

  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [personType, setPersonType] = useState<'INDIVIDUAL' | 'COMPANY'>('INDIVIDUAL');
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [document, setDocument] = useState('');
  const [type, setType] = useState<'CUSTOMER' | 'SUPPLIER' | 'BOTH'>('CUSTOMER');
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

  const filtered = typeFilter
    ? partners.filter((p) => p.type === typeFilter || p.type === 'BOTH')
    : partners;

  const resetForm = () => {
    setPersonType('INDIVIDUAL');
    setName('');
    setLegalName('');
    setTradeName('');
    setDocument('');
    setType('CUSTOMER');
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

  const handleToggleActive = async (partner: Partner) => {
    try {
      await apiClient.patch(`/partners/${partner.id}`, { active: !partner.active });
      load();
    } catch (err) {
      notify(extractErrorMessage(err));
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Clientes & Fornecedores</h1>
        <button className="btn" onClick={openCreateModal}>
          + Novo
        </button>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Tipo de Pessoa</th>
              <th>Tipo</th>
              <th>Documento</th>
              <th>Contato</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{PERSON_TYPE_LABELS[p.personType]}</td>
                <td>{TYPE_LABELS[p.type]}</td>
                <td>{p.document ?? '–'}</td>
                <td>{p.email ?? p.phone ?? '–'}</td>
                <td>{p.active ? 'Ativo' : 'Inativo'}</td>
                <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button className="btn btn--secondary btn--sm" onClick={() => openEditModal(p)}>
                    Editar
                  </button>
                  <button
                    className={`btn btn--sm ${p.active ? 'btn--danger' : ''}`}
                    onClick={() => handleToggleActive(p)}
                  >
                    {p.active ? 'Desativar' : 'Ativar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && <div className="empty-state">Nenhum registro encontrado.</div>}
      </div>

      {showModal && (
        <Modal
          title={editingId ? 'Editar Cliente/Fornecedor' : 'Novo Cliente/Fornecedor'}
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
