import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import apiClient, { extractErrorMessage } from '../../api/client';

interface Product {
  id: string;
  name: string;
  sku: string;
  type: 'RAW_MATERIAL' | 'FINISHED_GOOD';
  unit: string;
}

interface BomItem {
  id: string;
  quantity: number;
  rawMaterial: Product;
}

export default function BomPage() {
  const { productId } = useParams<{ productId: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [items, setItems] = useState<BomItem[]>([]);
  const [rawMaterials, setRawMaterials] = useState<Product[]>([]);
  const [rawMaterialId, setRawMaterialId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!productId) return;
    apiClient.get<Product>(`/products/${productId}`).then((res) => setProduct(res.data));
    apiClient.get<BomItem[]>(`/bom/product/${productId}`).then((res) => setItems(res.data));
    apiClient.get<Product[]>('/products').then((res) => setRawMaterials(res.data.filter((p) => p.type === 'RAW_MATERIAL')));
  };

  useEffect(load, [productId]);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post('/bom', {
        finishedProductId: productId,
        rawMaterialId,
        quantity: Number(quantity),
      });
      setRawMaterialId('');
      setQuantity('');
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const handleRemove = async (id: string) => {
    await apiClient.delete(`/bom/${id}`);
    load();
  };

  return (
    <div>
      <Link to="/products" className="page-header__back">
        ← Produtos & Insumos
      </Link>
      <div className="page-header">
        <h1>Ficha Técnica{product ? ` — ${product.name}` : ''}</h1>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Insumo</th>
                <th>Quantidade por unidade produzida</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.rawMaterial.name} ({item.rawMaterial.sku})
                  </td>
                  <td>
                    {item.quantity} {item.rawMaterial.unit}
                  </td>
                  <td>
                    <button className="btn btn--danger btn--sm" onClick={() => handleRemove(item.id)}>
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <div className="empty-state">Nenhum insumo cadastrado nesta ficha técnica.</div>}
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0, fontSize: 15 }}>Adicionar insumo</h2>
        {error && <div className="alert alert--error">{error}</div>}
        <form onSubmit={handleAdd}>
          <div className="form-grid">
            <div className="form-field">
              <label>Insumo *</label>
              <select value={rawMaterialId} onChange={(e) => setRawMaterialId(e.target.value)} required>
                <option value="">Selecione...</option>
                {rawMaterials.map((rm) => (
                  <option key={rm.id} value={rm.id}>
                    {rm.name} ({rm.sku})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Quantidade por unidade *</label>
              <input type="number" step="0.000001" min="0.000001" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn" type="submit">
              Adicionar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
