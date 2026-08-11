import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiClient, { extractErrorMessage } from '../../api/client';
import Modal from '../../components/Modal';

interface Partner {
  id: string;
  name: string;
  document: string | null;
  type: 'CUSTOMER' | 'SUPPLIER' | 'BOTH';
  email: string | null;
  phone: string | null;
  active: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  CUSTOMER: 'Cliente',
  SUPPLIER: 'Fornecedor',
  BOTH: 'Cliente/Fornecedor',
};

export default function PartnersPage() {
  const [searchParams] = useSearchParams();
  const typeFilter = searchParams.get('type');

  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [type, setType] = useState<'CUSTOMER' | 'SUPPLIER' | 'BOTH'>('CUSTOMER');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

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
    setName('');
    setDocument('');
    setType('CUSTOMER');
    setEmail('');
    setPhone('');
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post('/partners', {
        name,
        document: document || undefined,
        type,
        email: email || undefined,
        phone: phone || undefined,
      });
      setShowModal(false);
      resetForm();
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Clientes & Fornecedores</h1>
        <button className="btn" onClick={() => setShowModal(true)}>
          + Novo
        </button>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Tipo</th>
              <th>Documento</th>
              <th>Contato</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{TYPE_LABELS[p.type]}</td>
                <td>{p.document ?? '–'}</td>
                <td>{p.email ?? p.phone ?? '–'}</td>
                <td>{p.active ? 'Ativo' : 'Inativo'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && <div className="empty-state">Nenhum registro encontrado.</div>}
      </div>

      {showModal && (
        <Modal title="Novo Cliente/Fornecedor" onClose={() => setShowModal(false)}>
          {error && <div className="alert alert--error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-field">
                <label>Nome *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
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
                <input value={document} onChange={(e) => setDocument(e.target.value)} />
              </div>
              <div className="form-field">
                <label>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="form-field">
                <label>Telefone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} />
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
