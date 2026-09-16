import React, { useState, useEffect } from 'react';
import { 
  Layers, Plus, History, Search, Edit3, Trash2, 
  CheckCircle, AlertTriangle, X, Tag, FolderPlus, Save 
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function InventoryPage() {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modales
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [showKardexModal, setShowKardexModal] = useState(false);
  const [kardexList, setKardexList] = useState([]);
  const [selectedProductKardex, setSelectedProductKardex] = useState(null);
  const [kardexLoading, setKardexLoading] = useState(false);

  // Modal Ajuste de Stock
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustData, setAdjustData] = useState({
    variant_id: '',
    variant_name: '',
    movement_type: 'purchase',
    quantity: 1,
    reason: ''
  });

  // Estado para Nueva Prenda
  const [newProd, setNewProd] = useState({
    category_id: '',
    code: '',
    name: '',
    brand: 'Colección Diana',
    base_price: '',
    description: '',
    variants: [
      { size: 'S', color: 'Negro', cost_price: '50', sale_price: '120', stock: '5' }
    ]
  });

  // Estado para Edición de Prenda y Variantes
  const [editProd, setEditProd] = useState(null);

  // Estado para Gestión de Categorías
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);

  useEffect(() => {
    loadData();
  }, [search]);

  const loadData = async () => {
    try {
      setLoading(true);
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const [prodRes, catRes] = await Promise.all([
        api.getProducts(query),
        api.getCategories()
      ]);

      if (prodRes.success) setProducts(prodRes.data);
      if (catRes.success) {
        setCategories(catRes.data);
        if (catRes.data.length > 0 && !newProd.category_id) {
          setNewProd(prev => ({ ...prev, category_id: catRes.data[0].id }));
        }
      }
    } catch (err) {
      console.error('Error cargando inventario:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenKardex = async (product = null) => {
    setSelectedProductKardex(product);
    setShowKardexModal(true);
    setKardexLoading(true);
    try {
      const query = product ? `?product_id=${product.id}` : '';
      const res = await api.getKardex(query);
      if (res.success) setKardexList(res.data);
    } catch (err) {
      console.error('Error al cargar Kardex:', err);
    } finally {
      setKardexLoading(false);
    }
  };

  // Handlers para Crear Prenda
  const handleAddVariantRow = () => {
    setNewProd(prev => ({
      ...prev,
      variants: [
        ...prev.variants,
        { size: 'M', color: 'Negro', cost_price: '50', sale_price: prev.base_price || '120', stock: '5' }
      ]
    }));
  };

  const handleRemoveVariantRow = (idx) => {
    if (newProd.variants.length === 1) return;
    setNewProd(prev => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== idx)
    }));
  };

  const handleVariantChange = (idx, field, val) => {
    setNewProd(prev => {
      const updated = [...prev.variants];
      updated[idx][field] = val;
      return { ...prev, variants: updated };
    });
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Solo el perfil Administrador puede crear prendas.');
      return;
    }

    try {
      const res = await api.createProduct({
        ...newProd,
        base_price: parseFloat(newProd.base_price),
        variants: newProd.variants.map(v => ({
          ...v,
          cost_price: parseFloat(v.cost_price || 0),
          sale_price: parseFloat(v.sale_price || newProd.base_price),
          stock: parseInt(v.stock || 0, 10)
        }))
      });

      if (res.success) {
        alert('Prenda y variantes creadas con éxito. Stock registrado en Kardex.');
        setShowNewProductModal(false);
        loadData();
      }
    } catch (err) {
      alert(err.message || 'Error al crear producto');
    }
  };

  // Handlers para Editar Prenda y Variantes
  const handleOpenEdit = (product) => {
    setEditProd({
      id: product.id,
      category_id: product.category_id,
      code: product.code,
      name: product.name,
      brand: product.brand || 'Colección Diana',
      base_price: product.base_price,
      description: product.description || '',
      is_active: product.is_active,
      is_visible_online: product.is_visible_online,
      variants: product.variants.map(v => ({
        id: v.id,
        size: v.size,
        color: v.color,
        sku: v.sku,
        cost_price: v.cost_price,
        sale_price: v.sale_price,
        stock: v.stock
      }))
    });
    setShowEditProductModal(true);
  };

  const handleAddEditVariantRow = () => {
    setEditProd(prev => ({
      ...prev,
      variants: [
        ...prev.variants,
        { size: 'L', color: 'Negro', cost_price: '50', sale_price: prev.base_price || '120', stock: '0' }
      ]
    }));
  };

  const handleRemoveEditVariantRow = (idx) => {
    if (editProd.variants.length === 1) {
      alert('La prenda debe tener al menos una variante (Talla + Color).');
      return;
    }
    setEditProd(prev => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== idx)
    }));
  };

  const handleEditVariantChange = (idx, field, val) => {
    setEditProd(prev => {
      const updated = [...prev.variants];
      updated[idx][field] = val;
      return { ...prev, variants: updated };
    });
  };

  const handleUpdateProductSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;

    try {
      const res = await api.updateProduct(editProd.id, {
        ...editProd,
        base_price: parseFloat(editProd.base_price),
        variants: editProd.variants.map(v => ({
          ...v,
          cost_price: parseFloat(v.cost_price || 0),
          sale_price: parseFloat(v.sale_price || editProd.base_price),
          stock: parseInt(v.stock || 0, 10)
        }))
      });

      if (res.success) {
        alert('Prenda y variantes actualizadas correctamente.');
        setShowEditProductModal(false);
        loadData();
      }
    } catch (err) {
      alert(err.message || 'Error al actualizar prenda');
    }
  };

  const handleDeleteProduct = async (productId, productName) => {
    if (!isAdmin) return;
    if (!window.confirm(`¿Está segura de desactivar la prenda "${productName}" del catálogo?`)) return;

    try {
      const res = await api.deleteProduct(productId);
      if (res.success) {
        alert('Prenda desactivada.');
        loadData();
      }
    } catch (err) {
      alert(err.message || 'Error al desactivar prenda');
    }
  };

  // Handlers para Categorías
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      const res = await api.createCategory({
        name: newCategoryName.trim(),
        description: newCategoryDesc.trim()
      });
      if (res.success) {
        setNewCategoryName('');
        setNewCategoryDesc('');
        loadData();
      }
    } catch (err) {
      alert(err.message || 'Error al crear categoría');
    }
  };

  const handleUpdateCategory = async (catId) => {
    if (!editingCategory?.name?.trim()) return;
    try {
      const res = await api.updateCategory(catId, {
        name: editingCategory.name.trim(),
        description: editingCategory.description?.trim() || ''
      });
      if (res.success) {
        setEditingCategory(null);
        loadData();
      }
    } catch (err) {
      alert(err.message || 'Error al actualizar categoría');
    }
  };

  const handleDeleteCategory = async (catId) => {
    if (!window.confirm('¿Desactivar esta categoría?')) return;
    try {
      const res = await api.deleteCategory(catId);
      if (res.success) loadData();
    } catch (err) {
      alert(err.message || 'Error al eliminar categoría');
    }
  };

  // Handlers para Ajuste Rápido
  const handleOpenAdjust = (variant, productName) => {
    setAdjustData({
      variant_id: variant.id,
      variant_name: `${productName} (${variant.size} - ${variant.color})`,
      movement_type: 'purchase',
      quantity: 1,
      reason: 'Reposición de mercadería / Compra'
    });
    setShowAdjustModal(true);
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.adjustStock({
        variant_id: adjustData.variant_id,
        movement_type: adjustData.movement_type,
        quantity: parseInt(adjustData.quantity, 10),
        reason: adjustData.reason
      });

      if (res.success) {
        alert('Stock actualizado y movimiento asentado en Kardex.');
        setShowAdjustModal(false);
        loadData();
      }
    } catch (err) {
      alert(err.message || 'Error en ajuste de inventario');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Cabecera y Botones de Acción */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-stone-900">Control de Inventario & Kardex</h1>
          <p className="text-xs text-stone-500">
            Edición completa de prendas, tallas, colores, precios, stock y categorías.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setShowCategoriesModal(true)}
              className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors border border-stone-200"
            >
              <Tag className="w-4 h-4 text-stone-600" />
              <span>Gestionar Categorías</span>
            </button>
          )}

          <button
            onClick={() => handleOpenKardex(null)}
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors border border-stone-200"
          >
            <History className="w-4 h-4 text-pink-600" />
            <span>Auditoría Kardex General</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setShowNewProductModal(true)}
              className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-sm shadow-pink-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Prenda</span>
            </button>
          )}
        </div>
      </div>

      {/* Buscador */}
      <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre de prenda, código base o SKU de variante..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>
      </div>

      {/* Listado de Prendas y sus Variantes */}
      {loading ? (
        <div className="p-12 text-center text-stone-400 text-sm">Cargando catálogo...</div>
      ) : products.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center text-stone-500">
          No hay prendas registradas.
        </div>
      ) : (
        <div className="space-y-4">
          {products.map(product => (
            <div key={product.id} className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 space-y-4">
              
              {/* Info de la Prenda Base */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 pb-3 gap-2">
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-mono font-bold px-2 py-1 bg-stone-100 text-stone-800 rounded-lg">
                    {product.code}
                  </span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-stone-900 text-base">{product.name}</h3>
                      {!product.is_active && (
                        <span className="text-[10px] font-bold bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500">
                      Categoría: <span className="font-semibold text-pink-600">{product.category_name}</span> | Marca: {product.brand} | Precio Base: S/ {parseFloat(product.base_price).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <span className="text-[11px] text-stone-400 block">Stock Total Prenda</span>
                    <span className={`text-base font-extrabold ${
                      product.total_stock > 0 ? 'text-stone-900' : 'text-rose-600'
                    }`}>
                      {product.total_stock} unidades
                    </span>
                  </div>

                  {/* Botones de acción rápida: Editar y Kardex */}
                  <div className="flex items-center space-x-1 border-l border-stone-100 pl-3">
                    {isAdmin && (
                      <button
                        onClick={() => handleOpenEdit(product)}
                        className="p-2 text-stone-600 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
                        title="Editar Prenda y Variantes"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenKardex(product)}
                      className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                      title="Ver Kardex de esta prenda"
                    >
                      <History className="w-4 h-4" />
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteProduct(product.id, product.name)}
                        className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Desactivar del catálogo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Variantes (Talla + Color + SKU + Stock Real) */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-stone-400 border-b border-stone-100 font-semibold uppercase tracking-wider">
                      <th className="py-2">Talla</th>
                      <th className="py-2">Color</th>
                      <th className="py-2">SKU Único</th>
                      <th className="py-2">P. Costo</th>
                      <th className="py-2">P. Venta</th>
                      <th className="py-2">Stock Real</th>
                      {isAdmin && <th className="py-2 text-right">Acción</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50 font-medium text-stone-700">
                    {product.variants?.map(v => (
                      <tr key={v.id} className="hover:bg-stone-50/70 transition-colors">
                        <td className="py-2.5 font-bold text-pink-600">{v.size}</td>
                        <td className="py-2.5">{v.color}</td>
                        <td className="py-2.5 font-mono text-stone-500">{v.sku}</td>
                        <td className="py-2.5 text-stone-500">S/ {parseFloat(v.cost_price).toFixed(2)}</td>
                        <td className="py-2.5 font-bold text-stone-900">S/ {parseFloat(v.sale_price).toFixed(2)}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            v.stock > 3 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : v.stock > 0
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {v.stock} disp.
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="py-2.5 text-right space-x-1">
                            <button
                              onClick={() => handleOpenAdjust(v, product.name)}
                              className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[11px] font-semibold transition-colors"
                            >
                              + Ajustar Stock
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* MODAL EDITAR PRENDA Y VARIANTES COMPLETO */}
      {showEditProductModal && editProd && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-bold text-stone-900 text-lg flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-pink-600" />
                <span>Editar Prenda y Variantes</span>
              </h3>
              <button onClick={() => setShowEditProductModal(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProductSubmit} className="space-y-4">
              {/* Datos Base de la Prenda */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    value={editProd.name}
                    onChange={(e) => setEditProd({ ...editProd, name: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Código Base</label>
                  <input
                    type="text"
                    required
                    value={editProd.code}
                    onChange={(e) => setEditProd({ ...editProd, code: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm uppercase focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Categoría</label>
                  <select
                    value={editProd.category_id}
                    onChange={(e) => setEditProd({ ...editProd, category_id: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-pink-500"
                    required
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Marca / Colección</label>
                  <input
                    type="text"
                    value={editProd.brand}
                    onChange={(e) => setEditProd({ ...editProd, brand: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Precio Base (S/)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={editProd.base_price}
                    onChange={(e) => setEditProd({ ...editProd, base_price: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div className="flex items-center space-x-3 pt-6">
                  <label className="flex items-center space-x-2 text-xs font-semibold text-stone-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editProd.is_visible_online}
                      onChange={(e) => setEditProd({ ...editProd, is_visible_online: e.target.checked })}
                      className="rounded text-pink-600 focus:ring-pink-500"
                    />
                    <span>Visible en E-commerce</span>
                  </label>
                </div>
              </div>

              {/* Editor de Variantes (Talla + Color + Precios + Stock Real) */}
              <div className="border-t border-stone-100 pt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                      Variantes de la Prenda
                    </h4>
                    <p className="text-[11px] text-stone-500">
                      Puedes modificar tallas, colores, precios y stock directamente.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddEditVariantRow}
                    className="text-xs font-semibold text-pink-600 hover:text-pink-700 flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Agregar Talla/Color</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {editProd.variants.map((v, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 bg-stone-50 p-2.5 rounded-xl items-center text-xs border border-stone-200/60">
                      <div className="col-span-2">
                        <label className="block text-[10px] text-stone-500 font-semibold mb-0.5">Talla</label>
                        <input
                          type="text"
                          required
                          value={v.size}
                          onChange={(e) => handleEditVariantChange(idx, 'size', e.target.value)}
                          className="w-full p-1.5 border border-stone-200 rounded-md font-bold uppercase text-center"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] text-stone-500 font-semibold mb-0.5">Color</label>
                        <input
                          type="text"
                          required
                          value={v.color}
                          onChange={(e) => handleEditVariantChange(idx, 'color', e.target.value)}
                          className="w-full p-1.5 border border-stone-200 rounded-md font-medium"
                        />
                      </div>

                      <div className="col-span-3">
                        <label className="block text-[10px] text-stone-500 font-semibold mb-0.5">SKU</label>
                        <input
                          type="text"
                          value={v.sku}
                          onChange={(e) => handleEditVariantChange(idx, 'sku', e.target.value)}
                          className="w-full p-1.5 border border-stone-200 rounded-md font-mono text-[11px]"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] text-stone-500 font-semibold mb-0.5">P. Venta (S/)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={v.sale_price}
                          onChange={(e) => handleEditVariantChange(idx, 'sale_price', e.target.value)}
                          className="w-full p-1.5 border border-stone-200 rounded-md font-bold"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] text-stone-500 font-semibold mb-0.5">Stock Real</label>
                        <input
                          type="number"
                          min="0"
                          value={v.stock}
                          onChange={(e) => handleEditVariantChange(idx, 'stock', e.target.value)}
                          className="w-full p-1.5 border border-stone-200 rounded-md font-extrabold text-center text-pink-600 bg-white"
                        />
                      </div>

                      <div className="col-span-1 text-center pt-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveEditVariantRow(idx)}
                          className="text-stone-300 hover:text-rose-500"
                          title="Eliminar variante"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowEditProductModal(false)}
                  className="w-1/2 py-2.5 border border-stone-200 text-stone-600 rounded-xl font-semibold text-xs hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-xs shadow-sm transition-colors flex items-center justify-center space-x-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GESTOR DE CATEGORÍAS */}
      {showCategoriesModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-bold text-stone-900 text-base flex items-center space-x-2">
                <Tag className="w-5 h-5 text-pink-600" />
                <span>Gestión de Categorías</span>
              </h3>
              <button onClick={() => setShowCategoriesModal(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario Crear Nueva Categoría */}
            <form onSubmit={handleCreateCategory} className="bg-stone-50 p-3 rounded-xl space-y-2 border border-stone-200">
              <span className="text-xs font-bold text-stone-700 block">+ Crear Nueva Categoría</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nombre (ej. Casacas, Lencería)"
                  className="flex-1 px-3 py-1.5 border border-stone-200 rounded-lg text-xs"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-xs font-semibold"
                >
                  Crear
                </button>
              </div>
            </form>

            {/* Lista de Categorías Existentes (Editables) */}
            <div className="flex-1 overflow-y-auto divide-y divide-stone-100 pr-1 space-y-1">
              {categories.map(cat => (
                <div key={cat.id} className="py-2 flex items-center justify-between gap-2">
                  {editingCategory?.id === cat.id ? (
                    <div className="flex-1 flex items-center space-x-2">
                      <input
                        type="text"
                        value={editingCategory.name}
                        onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                        className="flex-1 px-2 py-1 border border-pink-300 rounded text-xs font-bold"
                      />
                      <button
                        onClick={() => handleUpdateCategory(cat.id)}
                        className="px-2 py-1 bg-emerald-600 text-white rounded text-[11px] font-bold"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditingCategory(null)}
                        className="px-2 py-1 bg-stone-200 text-stone-700 rounded text-[11px]"
                      >
                        X
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="font-semibold text-stone-900 text-xs">{cat.name}</p>
                        {cat.description && <p className="text-[10px] text-stone-400">{cat.description}</p>}
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => setEditingCategory(cat)}
                          className="p-1 text-stone-400 hover:text-pink-600 rounded"
                          title="Editar nombre"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-1 text-stone-400 hover:text-rose-600 rounded"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR PRENDA */}
      {showNewProductModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-bold text-stone-900 text-lg">Nueva Prenda de Ropa</h3>
              <button onClick={() => setShowNewProductModal(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Categoría</label>
                  <select
                    value={newProd.category_id}
                    onChange={(e) => setNewProd({ ...newProd, category_id: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-pink-500"
                    required
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Código Base (Modelo)</label>
                  <input
                    type="text"
                    required
                    value={newProd.code}
                    onChange={(e) => setNewProd({ ...newProd, code: e.target.value })}
                    placeholder="Ej. VEST-FIESTA-01"
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm uppercase focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Nombre de la Prenda</label>
                  <input
                    type="text"
                    required
                    value={newProd.name}
                    onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                    placeholder="Ej. Vestido Largo de Seda"
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Precio Base (S/)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newProd.base_price}
                    onChange={(e) => setNewProd({ ...newProd, base_price: e.target.value })}
                    placeholder="120.00"
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>

              {/* Generador de Variantes */}
              <div className="border-t border-stone-100 pt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                    Variantes (Talla + Color + Stock Inicial)
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddVariantRow}
                    className="text-xs font-semibold text-pink-600 hover:text-pink-700 flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Otra Variante</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {newProd.variants.map((v, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 bg-stone-50 p-2.5 rounded-xl items-center text-xs">
                      <div className="col-span-2">
                        <label className="block text-[10px] text-stone-500 font-semibold mb-0.5">Talla</label>
                        <input
                          type="text"
                          required
                          value={v.size}
                          onChange={(e) => handleVariantChange(idx, 'size', e.target.value)}
                          placeholder="S / M / L"
                          className="w-full p-1.5 border border-stone-200 rounded-md font-bold uppercase text-center"
                        />
                      </div>

                      <div className="col-span-3">
                        <label className="block text-[10px] text-stone-500 font-semibold mb-0.5">Color</label>
                        <input
                          type="text"
                          required
                          value={v.color}
                          onChange={(e) => handleVariantChange(idx, 'color', e.target.value)}
                          placeholder="Negro, Rojo..."
                          className="w-full p-1.5 border border-stone-200 rounded-md"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] text-stone-500 font-semibold mb-0.5">P. Costo (S/)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={v.cost_price}
                          onChange={(e) => handleVariantChange(idx, 'cost_price', e.target.value)}
                          className="w-full p-1.5 border border-stone-200 rounded-md"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] text-stone-500 font-semibold mb-0.5">P. Venta (S/)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={v.sale_price}
                          onChange={(e) => handleVariantChange(idx, 'sale_price', e.target.value)}
                          className="w-full p-1.5 border border-stone-200 rounded-md font-bold"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] text-stone-500 font-semibold mb-0.5">Stock Ini.</label>
                        <input
                          type="number"
                          min="0"
                          value={v.stock}
                          onChange={(e) => handleVariantChange(idx, 'stock', e.target.value)}
                          className="w-full p-1.5 border border-stone-200 rounded-md font-bold text-center"
                        />
                      </div>

                      <div className="col-span-1 text-center pt-3">
                        {newProd.variants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveVariantRow(idx)}
                            className="text-stone-300 hover:text-rose-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowNewProductModal(false)}
                  className="w-1/2 py-2.5 border border-stone-200 text-stone-600 rounded-xl font-semibold text-xs hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-xs shadow-sm transition-colors"
                >
                  Guardar Prenda y Variantes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KARDEX AUDITOR INMUTABLE */}
      {showKardexModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-bold text-stone-900 text-lg flex items-center space-x-2">
                  <History className="w-5 h-5 text-pink-600" />
                  <span>Kardex de Auditoría de Inventario</span>
                </h3>
                <p className="text-xs text-stone-500">
                  {selectedProductKardex ? `Prenda: ${selectedProductKardex.name}` : 'Historial de movimientos global'}
                </p>
              </div>
              <button onClick={() => setShowKardexModal(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {kardexLoading ? (
                <div className="p-8 text-center text-xs text-stone-400">Consultando movimientos...</div>
              ) : kardexList.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-400">No hay movimientos registrados.</div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-stone-400 border-b border-stone-100 font-semibold uppercase tracking-wider">
                      <th className="py-2">Fecha / Hora</th>
                      <th className="py-2">Prenda</th>
                      <th className="py-2">Variante</th>
                      <th className="py-2">Tipo Mov.</th>
                      <th className="py-2 text-center">Cant.</th>
                      <th className="py-2 text-center">Previo</th>
                      <th className="py-2 text-center">Nuevo</th>
                      <th className="py-2">Motivo / Ref</th>
                      <th className="py-2">Responsable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-700">
                    {kardexList.map(km => {
                      const isPositive = km.quantity > 0;
                      return (
                        <tr key={km.id} className="hover:bg-stone-50/70">
                          <td className="py-2 text-stone-400 text-[11px] whitespace-nowrap">
                            {new Date(km.created_at).toLocaleString()}
                          </td>
                          <td className="py-2 font-semibold text-stone-900">{km.product_name}</td>
                          <td className="py-2">
                            <span className="font-bold text-pink-600">{km.size}</span> - {km.color}
                          </td>
                          <td className="py-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              km.movement_type === 'sale'
                                ? 'bg-blue-50 text-blue-700'
                                : km.movement_type === 'cancellation'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              {km.movement_type}
                            </span>
                          </td>
                          <td className={`py-2 text-center font-bold ${
                            isPositive ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {isPositive ? `+${km.quantity}` : km.quantity}
                          </td>
                          <td className="py-2 text-center text-stone-400">{km.previous_stock}</td>
                          <td className="py-2 text-center font-bold text-stone-900">{km.new_stock}</td>
                          <td className="py-2 text-stone-500 max-w-xs truncate" title={km.reason}>
                            {km.reason}
                          </td>
                          <td className="py-2 text-stone-600 text-[11px]">{km.user_name}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL AJUSTE DE STOCK MANUAL */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-bold text-stone-900 text-base">Ajuste de Stock en Variante</h3>
              <button onClick={() => setShowAdjustModal(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-xl font-medium">
              {adjustData.variant_name}
            </p>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Tipo de Movimiento</label>
                <select
                  value={adjustData.movement_type}
                  onChange={(e) => setAdjustData({ ...adjustData, movement_type: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-pink-500"
                >
                  <option value="purchase">Entrada por Compra a Proveedor (+)</option>
                  <option value="adjustment_in">Ajuste Positivo por Conteo (+)</option>
                  <option value="adjustment_out">Ajuste Negativo (Merma / Dañado) (-)</option>
                  <option value="return">Devolución de Clienta (+)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Cantidad de Prendas</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustData.quantity}
                  onChange={(e) => setAdjustData({ ...adjustData, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Motivo Obligatorio (Auditoría Kardex)</label>
                <input
                  type="text"
                  required
                  value={adjustData.reason}
                  onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                  placeholder="Ej. Ingreso de factura proveedor F001-23"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="w-1/2 py-2.5 border border-stone-200 text-stone-600 rounded-xl font-semibold text-xs hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-xs shadow-sm transition-colors"
                >
                  Confirmar y Asentar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
