import { FormEvent, useEffect, useState } from 'react';
import apiClient, { extractErrorMessage } from '../../api/client';
import Spinner from '../../components/Spinner';
import { PIX_KEY_TYPES, PIX_KEY_TYPE_LABELS, PIX_KEY_TYPE_PLACEHOLDERS, PixKeyType } from '../../constants/pixKeyTypes';

interface CompanySettings {
  companyName: string;
  logoUrl: string;
  city: string;
  state: string;
  address: string | null;
  pixKeyType: PixKeyType;
  pixKey: string;
  bankName: string;
  bankAccountHolder: string;
  bankAccountInfo: string;
}

export default function CompanySettingsPage() {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiClient
      .get<CompanySettings>('/settings/company')
      .then((res) => setSettings(res.data))
      .finally(() => setLoading(false));
  }, []);

  const update = (patch: Partial<CompanySettings>) => {
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const { companyName, logoUrl, city, state, address, pixKeyType, pixKey, bankName, bankAccountHolder, bankAccountInfo } =
        settings;
      const res = await apiClient.patch<CompanySettings>('/settings/company', {
        companyName,
        logoUrl,
        city,
        state,
        address: address || null,
        pixKeyType,
        pixKey,
        bankName,
        bankAccountHolder,
        bankAccountInfo,
      });
      setSettings(res.data);
      setSaved(true);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="loading-state">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Dados da Empresa</h1>
      </div>
      <p style={{ color: 'var(--sysvex-text-muted)', marginTop: -8, marginBottom: 20 }}>
        Estas informações aparecem nos recibos de compra e venda gerados pelo sistema.
      </p>

      <div className="card" style={{ maxWidth: 640 }}>
        {error && <div className="alert alert--error">{error}</div>}
        {saved && <div className="alert alert--success">Dados salvos com sucesso.</div>}
        <form onSubmit={handleSubmit}>
          <h3 style={{ fontSize: 13, marginBottom: 8 }}>Empresa</h3>
          <div className="form-grid">
            <div className="form-field">
              <label>Razão social *</label>
              <input value={settings.companyName} onChange={(e) => update({ companyName: e.target.value })} required />
            </div>
            <div className="form-field">
              <label>URL do logo</label>
              <input value={settings.logoUrl} onChange={(e) => update({ logoUrl: e.target.value })} />
            </div>
            <div className="form-field">
              <label>Cidade *</label>
              <input value={settings.city} onChange={(e) => update({ city: e.target.value })} required />
            </div>
            <div className="form-field">
              <label>UF *</label>
              <input value={settings.state} maxLength={2} onChange={(e) => update({ state: e.target.value.toUpperCase() })} required />
            </div>
            <div className="form-field">
              <label>Endereço</label>
              <input value={settings.address ?? ''} onChange={(e) => update({ address: e.target.value })} />
            </div>
          </div>

          <h3 style={{ fontSize: 13, margin: '20px 0 8px' }}>Recebimento via Pix</h3>
          <div className="form-grid">
            <div className="form-field">
              <label>Tipo de chave *</label>
              <select value={settings.pixKeyType} onChange={(e) => update({ pixKeyType: e.target.value as PixKeyType })}>
                {PIX_KEY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {PIX_KEY_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Chave Pix *</label>
              <input
                value={settings.pixKey}
                onChange={(e) => update({ pixKey: e.target.value })}
                placeholder={PIX_KEY_TYPE_PLACEHOLDERS[settings.pixKeyType]}
                required
              />
            </div>
            <div className="form-field">
              <label>Banco *</label>
              <input value={settings.bankName} onChange={(e) => update({ bankName: e.target.value })} required />
            </div>
            <div className="form-field">
              <label>Titular da conta *</label>
              <input value={settings.bankAccountHolder} onChange={(e) => update({ bankAccountHolder: e.target.value })} required />
            </div>
            <div className="form-field">
              <label>Agência / Conta</label>
              <input value={settings.bankAccountInfo} onChange={(e) => update({ bankAccountInfo: e.target.value })} />
            </div>
          </div>

          <div className="form-actions">
            <button className="btn" type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
