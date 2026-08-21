import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import apiClient, { extractErrorMessage } from '../../api/client';
import Spinner from '../../components/Spinner';
import { ArrowLeftIcon } from '../../icons';

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

interface BomRecipe {
  id: string;
  name: string;
  isDefault: boolean;
  outputQuantity: number;
  items: BomItem[];
}

export default function BomPage() {
  const { productId } = useParams<{ productId: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [recipes, setRecipes] = useState<BomRecipe[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [rawMaterials, setRawMaterials] = useState<Product[]>([]);

  const [newRecipeName, setNewRecipeName] = useState('');
  const [newRecipeOutputQty, setNewRecipeOutputQty] = useState('1');
  const [renameValue, setRenameValue] = useState('');
  const [outputQtyValue, setOutputQtyValue] = useState('1');
  const [rawMaterialId, setRawMaterialId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!productId) return;
    apiClient.get<Product>(`/products/${productId}`).then((res) => setProduct(res.data));
    apiClient.get<Product[]>('/products').then((res) => setRawMaterials(res.data.filter((p) => p.type === 'RAW_MATERIAL')));
    apiClient.get<BomRecipe[]>(`/bom/product/${productId}`).then((res) => {
      setRecipes(res.data);
      setSelectedRecipeId((prev) => {
        if (prev && res.data.some((r) => r.id === prev)) return prev;
        return res.data.find((r) => r.isDefault)?.id ?? res.data[0]?.id ?? null;
      });
    });
  };

  useEffect(load, [productId]);

  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId) ?? null;

  useEffect(() => {
    setRenameValue(selectedRecipe?.name ?? '');
    setOutputQtyValue(selectedRecipe ? String(selectedRecipe.outputQuantity) : '1');
  }, [selectedRecipe?.id, selectedRecipe?.name, selectedRecipe?.outputQuantity]);

  const handleCreateRecipe = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await apiClient.post<BomRecipe>('/bom/recipes', {
        finishedProductId: productId,
        name: newRecipeName,
        outputQuantity: Number(newRecipeOutputQty),
      });
      setNewRecipeName('');
      setNewRecipeOutputQty('1');
      setSelectedRecipeId(res.data.id);
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const handleRename = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedRecipe) return;
    setError(null);
    try {
      await apiClient.patch(`/bom/recipes/${selectedRecipe.id}`, {
        name: renameValue,
        outputQuantity: Number(outputQtyValue),
      });
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const handleSetDefault = async () => {
    if (!selectedRecipe) return;
    await apiClient.patch(`/bom/recipes/${selectedRecipe.id}/set-default`);
    load();
  };

  const handleDeleteRecipe = async () => {
    if (!selectedRecipe) return;
    try {
      await apiClient.delete(`/bom/recipes/${selectedRecipe.id}`);
      setSelectedRecipeId(null);
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const handleAddItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedRecipe) return;
    setError(null);
    try {
      await apiClient.post('/bom/items', {
        recipeId: selectedRecipe.id,
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

  const handleRemoveItem = async (id: string) => {
    await apiClient.delete(`/bom/items/${id}`);
    load();
  };

  return (
    <div>
      <Link to="/finished-goods" className="page-header__back">
        <ArrowLeftIcon size={12} style={{ verticalAlign: -1.5 }} /> Produtos Acabados
      </Link>
      <div className="page-header">
        <h1>Ficha Técnica{product ? ` — ${product.name}` : ''}</h1>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {!product && (
        <div className="loading-state">
          <Spinner />
        </div>
      )}

      {product && (
        <>
          <div className="card">
            <h2 style={{ marginTop: 0, fontSize: 15 }}>Receitas</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {recipes.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`btn btn--sm ${r.id === selectedRecipeId ? '' : 'btn--secondary'}`}
                  onClick={() => setSelectedRecipeId(r.id)}
                >
                  {r.name}
                  {r.isDefault ? ' (Padrão)' : ''} — rende {r.outputQuantity} {product.unit}
                </button>
              ))}
            </div>

            <form onSubmit={handleCreateRecipe} className="form-grid">
              <div className="form-field">
                <label>Nova receita</label>
                <input
                  type="text"
                  value={newRecipeName}
                  onChange={(e) => setNewRecipeName(e.target.value)}
                  placeholder="Ex.: Receita sem lactose"
                  required
                />
              </div>
              <div className="form-field">
                <label>Rendimento ({product.unit})</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  value={newRecipeOutputQty}
                  onChange={(e) => setNewRecipeOutputQty(e.target.value)}
                  required
                />
              </div>
              <div className="form-field" style={{ alignSelf: 'end' }}>
                <button className="btn btn--secondary" type="submit">
                  + Adicionar receita
                </button>
              </div>
            </form>
          </div>

          {selectedRecipe && (
            <>
              <div className="card">
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <form onSubmit={handleRename} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div className="form-field" style={{ flex: 1, minWidth: 220 }}>
                      <label>Nome da receita</label>
                      <input type="text" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} required />
                    </div>
                    <div className="form-field" style={{ minWidth: 140 }}>
                      <label>Rendimento ({product.unit})</label>
                      <input
                        type="number"
                        step="0.0001"
                        min="0.0001"
                        value={outputQtyValue}
                        onChange={(e) => setOutputQtyValue(e.target.value)}
                        required
                      />
                    </div>
                    <button className="btn btn--secondary btn--sm" type="submit">
                      Salvar
                    </button>
                  </form>
                  {!selectedRecipe.isDefault && (
                    <button className="btn btn--secondary btn--sm" onClick={handleSetDefault}>
                      Tornar padrão
                    </button>
                  )}
                  <button className="btn btn--danger btn--sm" onClick={handleDeleteRecipe}>
                    Excluir receita
                  </button>
                </div>
              </div>

              <div className="card">
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Insumo</th>
                        <th>Quantidade na receita</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRecipe.items.map((item) => (
                        <tr key={item.id}>
                          <td>
                            {item.rawMaterial.name} ({item.rawMaterial.sku})
                          </td>
                          <td>
                            {item.quantity} {item.rawMaterial.unit}
                          </td>
                          <td>
                            <button className="btn btn--danger btn--sm" onClick={() => handleRemoveItem(item.id)}>
                              Remover
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {selectedRecipe.items.length === 0 && <div className="empty-state">Nenhum insumo cadastrado nesta receita.</div>}
                </div>
              </div>

              <div className="card">
                <h2 style={{ marginTop: 0, fontSize: 15 }}>Adicionar insumo</h2>
                <form onSubmit={handleAddItem}>
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
                      <label>
                        Quantidade na receita *
                        {rawMaterialId && (
                          <span style={{ fontWeight: 400 }}>
                            {' '}
                            (em {rawMaterials.find((rm) => rm.id === rawMaterialId)?.unit})
                          </span>
                        )}
                      </label>
                      <input type="number" step="0.000001" min="0.000001" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--sysvex-text-muted)' }}>
                    Quantidade total do insumo usada para produzir toda a receita (que rende {selectedRecipe.outputQuantity}{' '}
                    {product.unit}), não por unidade individual.
                  </p>
                  <div className="form-actions">
                    <button className="btn" type="submit">
                      Adicionar
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}

          {recipes.length === 0 && (
            <div className="card">
              <div className="empty-state">Nenhuma receita cadastrada para este produto ainda.</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
