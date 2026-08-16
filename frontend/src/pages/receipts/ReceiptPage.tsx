import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toDataURL } from 'qrcode';
import apiClient from '../../api/client';
import { buildPixPayload } from '../../utils/pixPayload';
import { PAYMENT_METHOD_LABELS, PaymentMethod } from '../../constants/paymentMethods';
import '../../styles/receipt.css';

interface ReceiptProduct {
  name: string;
  sku: string;
  unit: string;
}

interface ReceiptItem {
  id: string;
  product: ReceiptProduct;
  quantity: number;
  unitPrice: number;
}

interface ReceiptPartner {
  name: string;
  address: string | null;
  document: string | null;
}

interface OrderData {
  id: string;
  orderNumber: string;
  orderDate: string;
  status: string;
  paymentMethod: PaymentMethod;
  totalAmount: number;
  items: ReceiptItem[];
  customer?: ReceiptPartner;
  supplier?: ReceiptPartner;
}

interface CompanySettings {
  companyName: string;
  logoUrl: string;
  city: string;
  state: string;
  address: string | null;
  pixKey: string;
  bankName: string;
  bankAccountHolder: string;
  bankAccountInfo: string;
}

export default function ReceiptPage({ kind }: { kind: 'sales' | 'purchase' }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const endpoint = kind === 'sales' ? `/sales-orders/${id}` : `/purchase-orders/${id}`;

  useEffect(() => {
    setOrder(null);
    setSettings(null);
    setQrCode(null);
    Promise.all([apiClient.get<OrderData>(endpoint), apiClient.get<CompanySettings>('/settings/company')])
      .then(([orderRes, settingsRes]) => {
        setOrder(orderRes.data);
        setSettings(settingsRes.data);
      })
      .catch(() => setError('Não foi possível carregar o recibo.'));
  }, [endpoint]);

  useEffect(() => {
    if (!order || !settings) return;
    const payload = buildPixPayload({
      pixKey: settings.pixKey,
      merchantName: settings.companyName,
      merchantCity: settings.city,
      amount: order.totalAmount,
      txid: order.orderNumber,
    });
    toDataURL(payload, { margin: 1, width: 200 })
      .then(setQrCode)
      .catch(() => setQrCode(null));
  }, [order, settings]);

  if (error) {
    return <div className="empty-state">{error}</div>;
  }
  if (!order || !settings) {
    return <div className="empty-state">Carregando recibo...</div>;
  }

  const partner = kind === 'sales' ? order.customer : order.supplier;
  const title = kind === 'sales' ? 'Recibo de Venda' : 'Recibo de Compra';
  const partnerLabel = kind === 'sales' ? 'Cliente' : 'Fornecedor';
  const generatedAt = new Date().toLocaleString('pt-BR');

  return (
    <div className="receipt-screen">
      <div className="receipt-toolbar">
        <button className="btn btn--secondary" onClick={() => navigate(-1)}>
          ← Voltar
        </button>
        <button className="btn" onClick={() => window.print()}>
          Imprimir / Salvar PDF
        </button>
      </div>

      <div className="receipt-paper">
        <div className="receipt-header">
          <img src={settings.logoUrl} alt={settings.companyName} className="receipt-logo" />
          <div className="receipt-company">
            <h1>{settings.companyName}</h1>
            <p>
              {settings.city} - {settings.state}
            </p>
            {settings.address && <p>{settings.address}</p>}
          </div>
        </div>

        <h2 className="receipt-title">{title}</h2>

        <div className="receipt-meta">
          <div>
            <strong>Pedido:</strong> {order.orderNumber}
          </div>
          <div>
            <strong>Data do pedido:</strong> {order.orderDate}
          </div>
          <div>
            <strong>Recibo gerado em:</strong> {generatedAt}
          </div>
          <div>
            <strong>Status:</strong> {order.status}
          </div>
          <div>
            <strong>Forma de pagamento:</strong> {PAYMENT_METHOD_LABELS[order.paymentMethod]}
          </div>
        </div>

        <div className="receipt-partner">
          <strong>{partnerLabel}:</strong> {partner?.name}
          {partner?.document && <span> — {partner.document}</span>}
          {partner?.address && <div>{partner.address}</div>}
        </div>

        <table className="receipt-items">
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Qtd.</th>
              <th>Vl. Unit.</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.product.name} ({item.product.sku})
                </td>
                <td>
                  {item.quantity} {item.product.unit}
                </td>
                <td>R$ {item.unitPrice.toFixed(2)}</td>
                <td>R$ {(item.quantity * item.unitPrice).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="receipt-total">Total: R$ {order.totalAmount.toFixed(2)}</div>

        <div className="receipt-payment">
          <h3>Pagamento via Pix</h3>
          <div className="receipt-payment-grid">
            {qrCode && <img src={qrCode} alt="QR Code Pix" className="receipt-qrcode" />}
            <div className="receipt-payment-info">
              <p>
                <strong>Chave Pix:</strong> {settings.pixKey}
              </p>
              <p>
                <strong>Beneficiário:</strong> {settings.bankAccountHolder}
              </p>
              <p>
                <strong>Banco:</strong> {settings.bankName}
              </p>
              <p>
                <strong>Conta:</strong> {settings.bankAccountInfo}
              </p>
            </div>
          </div>
          <p className="receipt-payment-hint">
            Escaneie o QR Code com o app do seu banco ou copie a chave Pix acima caso tenha dificuldades com a leitura.
          </p>
        </div>

        <p className="receipt-footer-note">Este documento é um recibo interno e não substitui a nota fiscal eletrônica (NF-e).</p>
      </div>
    </div>
  );
}
