import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Minus, Trash2, ShoppingCart, CheckCircle2, 
  CreditCard, Banknote, Smartphone, Receipt, AlertCircle, X, Printer 
} from 'lucide-react';
import { api } from '../services/api';

export default function PosPage({ shiftData, onOpenCashTab }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Carrito de venta
  const [cart, setCart] = useState([]);
  const [globalDiscount, setGlobalDiscount] = useState(0);

  // Estados de variantes seleccionadas en tarjetas: { [productId]: variantId }
  const [selectedVariants, setSelectedVariants] = useState({});
  const [selectedColors, setSelectedColors] = useState({});

  // Modales
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutData, setCheckoutData] = useState({
    customer_name: 'Cliente General',
    customer_document: '',
    payment_method: 'cash',
    payment_details: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);

  useEffect(() => {
    loadData();
  }, [selectedCategory, search]);

  const loadData = async () => {
    try {
      setLoading(true);
      let query = `?is_active=true`;
      if (selectedCategory) query += `&category_id=${selectedCategory}`;
      if (search) query += `&search=${encodeURIComponent(search)}`;

      const [prodRes, catRes] = await Promise.all([
        api.getProducts(query),
        api.getCategories()
      ]);

      if (prodRes.success) {
        setProducts(prodRes.data);
        // Autoseleccionar primer color y variante de cada prenda
        const initialVariants = {};
        const initialColors = {};

        prodRes.data.forEach(p => {
          if (p.variants && p.variants.length > 0) {
            const firstInStock = p.variants.find(v => v.stock > 0) || p.variants[0];
            initialColors[p.id] = firstInStock.color;
            initialVariants[p.id] = firstInStock.id;
          }
        });
        setSelectedColors(prev => ({ ...initialColors, ...prev }));
        setSelectedVariants(prev => ({ ...initialVariants, ...prev }));
      }

      if (catRes.success) {
        setCategories(catRes.data);
      }
    } catch (err) {
      console.error('Error cargando catálogo POS:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectColor = (product, color) => {
    setSelectedColors(prev => ({
      ...prev,
      [product.id]: color
    }));

    // Al cambiar color, autoseleccionar la talla con stock de ese color
    const variantsOfColor = product.variants?.filter(v => v.color.toLowerCase() === color.toLowerCase()) || [];
    const bestVariant = variantsOfColor.find(v => v.stock > 0) || variantsOfColor[0];

    if (bestVariant) {
      setSelectedVariants(prev => ({
        ...prev,
        [product.id]: bestVariant.id
      }));
    }
  };

  const handleSelectVariant = (productId, variantId) => {
    setSelectedVariants(prev => ({
      ...prev,
      [productId]: variantId
    }));
  };

  const addToCart = (product) => {
    let variantId = selectedVariants[product.id];
    let variant = product.variants?.find(v => v.id === variantId);

    // Fallback inteligente si no está seleccionado explícitamente
    if (!variant) {
      const activeColor = selectedColors[product.id];
      const colorVariants = product.variants?.filter(v => v.color?.toLowerCase() === activeColor?.toLowerCase()) || [];
      variant = colorVariants.find(v => v.stock > 0) || colorVariants[0] || product.variants?.[0];
    }

    if (!variant) {
      alert('Por favor elija una talla y color.');
      return;
    }

    if (variant.stock <= 0) {
      alert(`La variante ${variant.size} - ${variant.color} no tiene stock disponible.`);
      return;
    }

    // Verificar si ya está en el carrito
    const existingIndex = cart.findIndex(item => item.variant_id === variant.id);

    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty + 1 > variant.stock) {
        alert(`Stock máximo alcanzado (${variant.stock} disponibles).`);
        return;
      }
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart(prev => [
        ...prev,
        {
          product_id: product.id,
          variant_id: variant.id,
          name: product.name,
          size: variant.size,
          color: variant.color,
          sku: variant.sku,
          unit_price: parseFloat(variant.sale_price),
          stock_available: variant.stock,
          quantity: 1,
          discount: 0
        }
      ]);
    }
  };

  const updateCartQuantity = (variantId, delta) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.variant_id === variantId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > item.stock_available) {
            alert(`Stock máximo alcanzado (${item.stock_available} unidades).`);
            return item;
          }
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(Boolean);
    });
  };

  const updateCartItemPrice = (variantId, newPrice) => {
    const val = parseFloat(newPrice);
    setCart(prev => prev.map(item => {
      if (item.variant_id === variantId) {
        return { ...item, unit_price: isNaN(val) ? 0 : val };
      }
      return item;
    }));
  };

  const removeFromCart = (variantId) => {
    setCart(prev => prev.filter(i => i.variant_id !== variantId));
  };

  // Cálculos
  const subtotal = cart.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0);
  const discountAmount = parseFloat(globalDiscount) || 0;
  const total = Math.max(0, subtotal - discountAmount);

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (!shiftData?.hasActiveShift) {
      alert('Debe tener un turno de caja abierto para registrar ventas.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        cash_shift_id: shiftData.data.shift.id,
        customer_name: checkoutData.customer_name || 'Cliente General',
        customer_document: checkoutData.customer_document || null,
        discount: discountAmount,
        payment_method: checkoutData.payment_method,
        payment_details: checkoutData.payment_details || null,
        channel: 'physical',
        items: cart.map(item => ({
          variant_id: item.variant_id,
          quantity: item.quantity,
          discount: item.discount || 0,
          unit_price: item.unit_price
        }))
      };

      const res = await api.createSale(payload);
      if (res.success) {
        // Cargar detalle completo para mostrar recibo
        const detailRes = await api.getSaleById(res.data.sale_id);
        setCompletedSale(detailRes.data);
        setShowCheckoutModal(false);
        setCart([]);
        setGlobalDiscount(0);
        // Recargar inventario para actualizar stocks en pantalla
        loadData();
      }
    } catch (err) {
      alert(err.message || 'Error al procesar la venta.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Aviso si la caja está cerrada */}
      {!shiftData?.hasActiveShift && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3 text-amber-800">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold">Caja actualmente cerrada</p>
              <p className="text-xs text-amber-700">Para procesar tickets físicos debe aperturar el turno con su monto inicial.</p>
            </div>
          </div>
          <button
            onClick={onOpenCashTab}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            Abrir Caja Ahora
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Catálogo de Prendas (7 columnas en desktop) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Barra de búsqueda y filtros */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar prenda por nombre, código o SKU..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              />
            </div>

            {/* Chips de Categorías */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setSelectedCategory('')}
                className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === ''
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Todas las Prendas
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-pink-600 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Cuadrícula de Productos */}
          {loading ? (
            <div className="p-12 text-center text-stone-400 text-sm">Cargando catálogo de boutique...</div>
          ) : products.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center text-stone-500 text-sm">
              No se encontraron prendas con los filtros indicados.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {products.map(product => {
                const currentVariantId = selectedVariants[product.id];
                
                // 1. Lista única de colores disponibles en la prenda
                const uniqueColors = Array.from(new Set(product.variants?.map(v => v.color) || []));
                const activeColor = selectedColors[product.id] || uniqueColors[0] || '';

                // 2. Lista de tallas registradas para el color seleccionado
                const availableVariantsForColor = product.variants?.filter(
                  v => v.color.toLowerCase() === activeColor.toLowerCase()
                ) || [];

                // 3. Variante activa seleccionada
                const activeVariant = product.variants?.find(v => v.id === currentVariantId) 
                  || availableVariantsForColor.find(v => v.stock > 0)
                  || availableVariantsForColor[0] 
                  || product.variants?.[0];

                const hasStock = activeVariant ? activeVariant.stock > 0 : false;

                return (
                  <div 
                    key={product.id}
                    className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-pink-600 bg-pink-50 px-2 py-0.5 rounded-md">
                          {product.category_name || 'Boutique'}
                        </span>
                        <span className="text-xs font-mono text-stone-400">
                          {product.code}
                        </span>
                      </div>

                      <h3 className="font-semibold text-stone-900 text-base mt-2 line-clamp-1">
                        {product.name}
                      </h3>
                      <p className="text-xs text-stone-500 mb-3">{product.brand}</p>

                      {/* Selector en 2 Pasos: 1. Color -> 2. Lista de Tallas Disponibles */}
                      <div className="space-y-2.5 mb-3 bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                        
                        {/* 1. Selección de Color */}
                        <div>
                          <div className="flex items-center justify-between text-[11px] font-semibold text-stone-600 mb-1">
                            <span className="flex items-center space-x-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-pink-600"></span>
                              <span>Paso 1: Elige el Color</span>
                            </span>
                            <span className="font-bold text-stone-900 capitalize">{activeColor || 'Sin color'}</span>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {uniqueColors.map(color => {
                              const isSelected = color.toLowerCase() === activeColor.toLowerCase();
                              const totalStockForColor = product.variants
                                ?.filter(v => v.color.toLowerCase() === color.toLowerCase())
                                .reduce((acc, v) => acc + v.stock, 0);

                              return (
                                <button
                                  key={color}
                                  type="button"
                                  onClick={() => handleSelectColor(product, color)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center space-x-1.5 ${
                                    isSelected
                                      ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                                      : totalStockForColor > 0
                                      ? 'bg-white text-stone-700 border-stone-200 hover:border-pink-400 hover:bg-pink-50/40'
                                      : 'bg-stone-100 text-stone-400 border-stone-200 opacity-60'
                                  }`}
                                >
                                  <span>{color}</span>
                                  <span className={`text-[10px] px-1 rounded-full ${
                                    isSelected ? 'bg-stone-700 text-stone-200' : 'bg-stone-100 text-stone-500'
                                  }`}>
                                    {totalStockForColor}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* 2. Lista de Tallas Disponibles para el Color Seleccionado */}
                        <div>
                          <div className="flex items-center justify-between text-[11px] font-semibold text-stone-600 mb-1">
                            <span className="flex items-center space-x-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                              <span>Paso 2: Tallas Disponibles:</span>
                            </span>
                            {activeVariant && (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                hasStock ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {hasStock ? `${activeVariant.stock} en stock` : 'Agotado'}
                              </span>
                            )}
                          </div>

                          {availableVariantsForColor.length === 0 ? (
                            <p className="text-[11px] text-stone-400 italic">No hay tallas registradas en este color.</p>
                          ) : (
                            <div className="grid grid-cols-3 gap-1.5">
                              {availableVariantsForColor.map(v => {
                                const isSelected = v.id === activeVariant?.id;
                                const isOutOfStock = v.stock <= 0;

                                return (
                                  <button
                                    key={v.id}
                                    type="button"
                                    disabled={isOutOfStock}
                                    onClick={() => handleSelectVariant(product.id, v.id)}
                                    className={`py-1.5 px-2 rounded-lg border text-center transition-all flex flex-col items-center justify-center ${
                                      isSelected
                                        ? 'bg-pink-600 text-white border-pink-600 shadow-sm ring-1 ring-pink-600'
                                        : !isOutOfStock
                                        ? 'bg-white text-stone-800 border-stone-200 hover:border-pink-400 hover:bg-pink-50/50'
                                        : 'bg-stone-100/70 text-stone-400 border-stone-200 cursor-not-allowed opacity-50'
                                    }`}
                                  >
                                    <span className="font-bold text-xs leading-none">{v.size}</span>
                                    <span className={`text-[9px] mt-0.5 font-semibold ${
                                      isSelected ? 'text-pink-100' : isOutOfStock ? 'text-rose-500' : 'text-stone-500'
                                    }`}>
                                      {isOutOfStock ? 'Agotado' : `${v.stock} disp.`}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {activeVariant && (
                            <div className="flex items-center justify-between pt-1 text-[10px] text-stone-400 font-mono">
                              <span>SKU: {activeVariant.sku}</span>
                              {parseFloat(activeVariant.sale_price) !== parseFloat(product.base_price) && (
                                <span className="text-pink-600 font-bold">
                                  Precio: S/ {parseFloat(activeVariant.sale_price).toFixed(2)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                      </div>
                    </div>

                    {/* Precio y Botón Agregar */}
                    <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                      <div>
                        <span className="text-xs text-stone-400 block">Precio Venta</span>
                        <span className="text-lg font-extrabold text-stone-900">
                          S/ {parseFloat(activeVariant ? activeVariant.sale_price : product.base_price).toFixed(2)}
                        </span>
                      </div>

                      <button
                        onClick={() => addToCart(product)}
                        disabled={!hasStock}
                        className="px-3.5 py-2 bg-stone-900 hover:bg-pink-600 disabled:bg-stone-200 disabled:text-stone-400 text-white rounded-xl text-xs font-semibold transition-colors flex items-center space-x-1.5 shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Agregar</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Panel Carrito y Cobro (5 columnas en desktop) */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 sticky top-24 space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="w-5 h-5 text-pink-600" />
                <h2 className="font-bold text-stone-900 text-base">Carrito de Venta</h2>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                {cart.reduce((sum, i) => sum + i.quantity, 0)} prendas
              </span>
            </div>

            {/* Lista de ítems en carrito */}
            <div className="max-h-[350px] overflow-y-auto divide-y divide-stone-100 pr-1">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-stone-400 text-sm">
                  El carrito está vacío.<br />Seleccione prendas y tallas para cobrar.
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.variant_id} className="py-3 flex items-center justify-between">
                    <div className="space-y-0.5 max-w-[55%]">
                      <p className="font-semibold text-stone-900 text-sm line-clamp-1">{item.name}</p>
                      <div className="flex items-center space-x-1.5 text-xs text-stone-500">
                        <span className="font-bold text-pink-600 bg-pink-50 px-1 rounded">{item.size}</span>
                        <span>•</span>
                        <span>{item.color}</span>
                      </div>
                      <p className="text-[10px] font-mono text-stone-400">{item.sku}</p>
                      <div className="flex items-center space-x-1 text-xs text-stone-600 pt-0.5">
                        <span className="text-[10px] text-stone-400">Precio S/:</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={item.unit_price}
                          onChange={(e) => updateCartItemPrice(item.variant_id, e.target.value)}
                          className="w-16 px-1.5 py-0.5 border border-stone-200 rounded text-xs font-bold text-stone-900 bg-stone-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-pink-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      {/* Control de cantidad */}
                      <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden bg-stone-50">
                        <button
                          onClick={() => updateCartQuantity(item.variant_id, -1)}
                          className="p-1 hover:bg-stone-200 text-stone-600"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-bold text-stone-900">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQuantity(item.variant_id, 1)}
                          className="p-1 hover:bg-stone-200 text-stone-600"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Subtotal por ítem */}
                      <span className="text-sm font-bold text-stone-900 w-20 text-right">
                        S/ {(item.unit_price * item.quantity).toFixed(2)}
                      </span>

                      {/* Eliminar */}
                      <button
                        onClick={() => removeFromCart(item.variant_id)}
                        className="text-stone-300 hover:text-rose-500 p-1 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desglose de Totales */}
            <div className="border-t border-stone-100 pt-3 space-y-2">
              <div className="flex justify-between text-xs text-stone-600">
                <span>Subtotal:</span>
                <span className="font-semibold">S/ {subtotal.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between text-xs text-stone-600">
                <span>Descuento global (S/):</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={globalDiscount}
                  onChange={(e) => setGlobalDiscount(e.target.value)}
                  className="w-24 text-right px-2 py-1 border border-stone-200 rounded-md text-xs focus:ring-1 focus:ring-pink-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-between text-base font-extrabold text-stone-900 border-t border-stone-200 pt-2">
                <span>TOTAL A COBRAR:</span>
                <span className="text-xl text-pink-600">S/ {total.toFixed(2)}</span>
              </div>
            </div>

            {/* Botón de Cobro */}
            <button
              onClick={() => setShowCheckoutModal(true)}
              disabled={cart.length === 0}
              className="w-full py-3 bg-pink-600 hover:bg-pink-700 disabled:bg-stone-200 disabled:text-stone-400 text-white rounded-xl font-bold text-sm shadow-md shadow-pink-200 transition-all flex items-center justify-center space-x-2"
            >
              <Receipt className="w-4 h-4" />
              <span>COBRAR Y EMITIR TICKET</span>
            </button>

          </div>
        </div>

      </div>

      {/* MODAL DE COBRO */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-bold text-stone-900 text-lg">Finalizar Venta (Cobro)</h3>
              <button onClick={() => setShowCheckoutModal(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-pink-50 p-4 rounded-xl text-center border border-pink-100">
              <span className="text-xs text-pink-700 font-semibold block uppercase tracking-wider">Monto Total a Recibir</span>
              <span className="text-3xl font-extrabold text-pink-700">S/ {total.toFixed(2)}</span>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Nombre de la Clienta</label>
                <input
                  type="text"
                  value={checkoutData.customer_name}
                  onChange={(e) => setCheckoutData({ ...checkoutData, customer_name: e.target.value })}
                  placeholder="Cliente General o Nombre"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">DNI / Documento (Opcional)</label>
                <input
                  type="text"
                  value={checkoutData.customer_document}
                  onChange={(e) => setCheckoutData({ ...checkoutData, customer_document: e.target.value })}
                  placeholder="Número de documento"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Método de Pago</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'cash', label: 'Efectivo', icon: Banknote },
                    { id: 'card', label: 'Tarjeta', icon: CreditCard },
                    { id: 'transfer', label: 'Transfer/Yape', icon: Smartphone },
                  ].map(m => {
                    const Icon = m.icon;
                    const isSelected = checkoutData.payment_method === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setCheckoutData({ ...checkoutData, payment_method: m.id })}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center space-y-1 transition-all ${
                          isSelected
                            ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                            : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(false)}
                  className="w-1/2 py-2.5 border border-stone-200 text-stone-600 rounded-xl font-semibold text-sm hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-1/2 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-bold text-sm shadow-sm transition-colors"
                >
                  {submitting ? 'Procesando...' : 'Confirmar Venta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE TICKET EMITIDO */}
      {completedSale && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            
            {/* Cabecera del Ticket */}
            <div className="text-center border-b border-dashed border-stone-300 pb-4 space-y-1">
              <span className="w-10 h-10 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </span>
              <h4 className="text-lg font-serif font-bold text-stone-900">TIENDADIANA BOUTIQUE</h4>
              <p className="text-xs text-stone-500">Comprobante de Venta</p>
              <p className="text-sm font-mono font-bold text-pink-600 mt-1">{completedSale.ticket_number}</p>
              <p className="text-[10px] text-stone-400">{new Date(completedSale.created_at).toLocaleString()}</p>
            </div>

            {/* Datos cliente */}
            <div className="text-xs text-stone-600 space-y-0.5 border-b border-dashed border-stone-300 pb-2">
              <p><span className="font-semibold">Clienta:</span> {completedSale.customer_name}</p>
              <p><span className="font-semibold">Atendido por:</span> {completedSale.seller_name}</p>
              <p><span className="font-semibold">Método de Pago:</span> {completedSale.payment_method.toUpperCase()}</p>
            </div>

            {/* Ítems */}
            <div className="space-y-1.5 text-xs max-h-48 overflow-y-auto border-b border-dashed border-stone-300 pb-3">
              {completedSale.items?.map(item => (
                <div key={item.id} className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-stone-800">{item.product_name}</p>
                    <p className="text-[10px] text-stone-400">Talla: {item.size} | Color: {item.color} (x{item.quantity})</p>
                  </div>
                  <span className="font-bold text-stone-900">S/ {parseFloat(item.subtotal).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Totales */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-stone-500">
                <span>Subtotal:</span>
                <span>S/ {parseFloat(completedSale.subtotal).toFixed(2)}</span>
              </div>
              {parseFloat(completedSale.discount) > 0 && (
                <div className="flex justify-between text-pink-600 font-medium">
                  <span>Descuento:</span>
                  <span>-S/ {parseFloat(completedSale.discount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-extrabold text-stone-900 pt-1">
                <span>TOTAL:</span>
                <span className="text-pink-600">S/ {parseFloat(completedSale.total).toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-3 space-y-2">
              <button
                onClick={() => window.print()}
                className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Ticket</span>
              </button>
              <button
                onClick={() => setCompletedSale(null)}
                className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Continuar con Nueva Venta
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

