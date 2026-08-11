import { FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import apiClient, { extractErrorMessage } from '../../api/client';
import Modal from '../../components/Modal';

interface Product {
  id: string;
  sku: string;
  name: string;
  type: 'RAW_MATERIAL' | 'FINISHED_GOOD';
  unit: string;
  costPrice: number;
  salePrice: number | null;
  stockQty: number;
  minStock: number;
  active: boolean;
}

export default function ProductsPage() {
  const [searchParams] = useSearchParams();
  const onlyLowStock = searchParams.get('lowStock') === '1';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<'RAW_MATERIAL' | 'FINISHED_GOOD'>('RAW_MATERIAL');
  const [unit, setUnit] = useState('un');
  const [costPrice, setCostPrice] = useState('0');
  const [salePrice, setSalePrice] = useState('');
  const [stockQty, setStockQty] = useState('0');
  const [minStock, setMinStock] = useState('0');

  const load = () => {
    setLoading(true);
    const endpoint = onlyLowStock ? '/products/low-stock' : '/products';
    apiClient
      .get<Product[]>(endpoint)
      .then((res) => setProducts(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(load, [onlyLowStock]);

  const resetForm = () => {
    setSku('');
    setName('');
    setType('RAW_MATERIAL');
    setUnit('un');
    setCostPrice('0');
    setSalePrice('');
    setStockQty('0');
    setMinStock('0');
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post('/products', {
        sku,
        name,
        type,
        unit,
        costPrice: Number(costPrice),
        salePrice: salePrice ? Number(salePrice) : undefined,
        stockQty: Number(stockQty),
        minStock: Number(minStock),
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
        <h1>{onlyLowStock ? 'Produtos com Estoque Baixo' : 'Produtos & Insumos'}</h1>
        <button className="btn" onClick={() => setShowModal(true)}>
          + Novo
        </button>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Nome</th>
              <th>Tipo</th>
              <th>Estoque</th>
              <th>Custo</th>
              <th>Venda</th>
              <th>Ficha Técnica</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.sku}</td>
                <td>{p.name}</td>
                <td>{p.type === 'RAW_MATERIAL' ? 'Insumo' : 'Produto acabado'}</td>
                <td>
                  {p.stockQty} {p.unit}
                  {p.stockQty <= p.minStock && (
                    <span className="badge badge--warning" style={{ marginLeft: 6 }}>
                      baixo
                    </span>
                  )}
                </td>
                <td>R$ {p.costPrice.toFixed(2)}</td>
                <td>{p.salePrice != null ? `R$ ${p.salePrice.toFixed(2)}` : '–'}</td>
                <td>
                  {p.type === 'FINISHED_GOOD' && (
                    <Link to={`/products/${p.id}/bom`} className="btn btn--secondary btn--sm">
                      Editar
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && products.length === 0 && <div className="empty-state">Nenhum produto encontrado.</div>}
      </div>

      {showModal && (
        <Modal title="Novo Produto/Insumo" onClose={() => setShowModal(false)}>
          {error && <div className="alert alert--error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-field">
                <label>SKU *</label>
                <input value={sku} onChange={(e) => setSku(e.target.value)} required />
              </div>
              <div className="form-field">
                <label>Nome *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="form-field">
                <label>Tipo *</label>
                <select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
                  <option value="RAW_MATERIAL">Insumo (matéria-prima)</option>
                  <option value="FINISHED_GOOD">Produto acabado</option>
                </select>
              </div>
              <div className="form-field">
                <label>Unidade</label>
                <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="un, kg, L..." />
              </div>
              <div className="form-field">
                <label>Preço de custo *</label>
                <input type="number" step="0.01" min="0" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} required />
              </div>
              <div className="form-field">
                <label>Preço de venda</label>
                <input type="number" step="0.01" min="0" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
              </div>
              <div className="form-field">
                <label>Estoque inicial</label>
                <input type="number" step="0.0001" min="0" value={stockQty} onChange={(e) => setStockQty(e.target.value)} />
              </div>
              <div className="form-field">
                <label>Estoque mínimo</label>
                <input type="number" step="0.0001" min="0" value={minStock} onChange={(e) => setMinStock(e.target.value)} />
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
