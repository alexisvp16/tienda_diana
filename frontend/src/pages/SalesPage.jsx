import React, { useState, useEffect } from 'react';
import { 
  ReceiptText, Search, Eye, Ban, CheckCircle, 
  AlertCircle, X, Printer, Filter, ShoppingBag 
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function SalesPage() {
  const { isAdmin } = useAuth();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modales
  const [selectedSale, setSelectedSale] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [saleToCancel, setSaleToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadSales();
  }, [search, channelFilter, statusFilter]);

  const loadSales = async () => {
    try {
      setLoading(true);
      let query = '?limit=50';
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (channelFilter) query += `&channel=${channelFilter}`;
      if (statusFilter) query += `&status=${statusFilter}`;

      const res = await api.getSales(query);
      if (res.success) setSales(res.data);
    } catch (err) {
      console.error('Error al cargar ventas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (saleId) => {
    try {
      const res = await api.getSaleById(saleId);
      if (res.success) {
        setSelectedSale(res.data);
      }
    } catch (err) {
      alert(err.message || 'Error al obtener detalle de la venta');
    }
  };

  const handleOpenCancel = (sale) => {
    setSaleToCancel(sale);
    setCancelReason('Solicitud de anulación por cambio / devolución');
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async (e) => {
    e.preventDefault();
    if (!saleToCancel) return;
    setCancelling(true);
    try {
      const res = await api.cancelSale(saleToCancel.id, cancelReason);
      if (res.success) {
        alert(res.message);
        setShowCancelModal(false);
        setSaleToCancel(null);
        loadSales();
      }
    } catch (err) {
      alert(err.message || 'Error al anular venta');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-serif text-stone-900">Historial de Ventas & Comprobantes</h1>
          <p className="text-xs text-stone-500">
            Registro correlativo multicanal (Tienda física y futuro E-commerce).
          </p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-6 relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por N° Ticket (ej. T001-00000001) o nombre de cliente..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="w-full px-3 py-2 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            <option value="">Todos los Canales</option>
            <option value="physical">Tienda Física (POS)</option>
            <option value="ecommerce">E-commerce Online</option>
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            <option value="">Todos los Estados</option>
            <option value="completed">Completadas</option>
            <option value="cancelled">Anuladas</option>
          </select>
        </div>
      </div>

      {/* Tabla de Ventas */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-400 text-sm">Cargando ventas...</div>
        ) : sales.length === 0 ? (
          <div className="p-12 text-center text-stone-500 text-sm">No se encontraron ventas registradas.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-stone-50 text-stone-500 border-b border-stone-200 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Canal</th>
                  <th className="py-3 px-4">Método</th>
                  <th className="py-3 px-4">Vendedor(a)</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {sales.map(s => (
                  <tr key={s.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-stone-900">{s.ticket_number}</td>
                    <td className="py-3 px-4 text-stone-500">
                      {new Date(s.created_at).toLocaleDateString()} {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 font-medium text-stone-900">{s.customer_name}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.channel === 'physical'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {s.channel === 'physical' ? 'FÍSICO' : 'E-COMMERCE'}
                      </span>
                    </td>
                    <td className="py-3 px-4 uppercase text-[11px] font-semibold text-stone-600">{s.payment_method}</td>
                    <td className="py-3 px-4 text-stone-600">{s.seller_name}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-stone-900 text-sm">
                      S/ {parseFloat(s.total).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        s.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {s.status === 'completed' ? 'COMPLETADA' : 'ANULADA'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => handleViewDetail(s.id)}
                          className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-600 hover:text-pink-600 transition-colors"
                          title="Ver detalle del ticket"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {isAdmin && s.status === 'completed' && (
                          <button
                            onClick={() => handleOpenCancel(s)}
                            className="p-1.5 hover:bg-rose-50 rounded-lg text-stone-400 hover:text-rose-600 transition-colors"
                            title="Anular venta y restituir stock"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DETALLE DE TICKET COMPLETO */}
      {selectedSale && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-bold text-stone-900 text-base">Comprobante de Venta</h3>
              <button onClick={() => setSelectedSale(null)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ticket Card */}
            <div className="border border-stone-200 p-4 rounded-xl space-y-3 bg-stone-50/50">
              <div className="text-center space-y-0.5 border-b border-dashed border-stone-300 pb-3">
                <h4 className="font-serif font-bold text-stone-900 text-lg">TIENDADIANA BOUTIQUE</h4>
                <p className="font-mono font-bold text-pink-600 text-sm">{selectedSale.ticket_number}</p>
                <p className="text-[10px] text-stone-400">{new Date(selectedSale.created_at).toLocaleString()}</p>
              </div>

              <div className="text-xs text-stone-600 space-y-0.5 border-b border-dashed border-stone-300 pb-2">
                <p><span className="font-semibold">Clienta:</span> {selectedSale.customer_name}</p>
                <p><span className="font-semibold">Atendido por:</span> {selectedSale.seller_name}</p>
                <p><span className="font-semibold">Método de Pago:</span> {selectedSale.payment_method.toUpperCase()}</p>
                <p><span className="font-semibold">Canal:</span> {selectedSale.channel === 'physical' ? 'Tienda Física' : 'E-commerce'}</p>
              </div>

              {/* Prendas */}
              <div className="space-y-2 border-b border-dashed border-stone-300 pb-3">
                {selectedSale.items?.map(item => (
                  <div key={item.id} className="flex justify-between items-start text-xs">
                    <div>
                      <p className="font-semibold text-stone-900">{item.product_name}</p>
                      <p className="text-[10px] text-stone-500">
                        Talla: <span className="font-bold">{item.size}</span> | Color: {item.color}
                      </p>
                      <p className="text-[10px] font-mono text-stone-400">SKU: {item.sku}</p>
                      <p className="text-[10px] text-stone-600 font-medium">
                        {item.quantity} x S/ {parseFloat(item.unit_price).toFixed(2)}
                      </p>
                    </div>
                    <span className="font-bold text-stone-900">S/ {parseFloat(item.subtotal).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Totales */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-stone-500">
                  <span>Subtotal:</span>
                  <span>S/ {parseFloat(selectedSale.subtotal).toFixed(2)}</span>
                </div>
                {parseFloat(selectedSale.discount) > 0 && (
                  <div className="flex justify-between text-pink-600 font-medium">
                    <span>Descuento:</span>
                    <span>-S/ {parseFloat(selectedSale.discount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-extrabold text-stone-900 pt-1">
                  <span>TOTAL PAGADO:</span>
                  <span className="text-pink-600">S/ {parseFloat(selectedSale.total).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => window.print()}
                className="w-1/2 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir</span>
              </button>
              <button
                onClick={() => setSelectedSale(null)}
                className="w-1/2 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR ANULACIÓN */}
      {showCancelModal && saleToCancel && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-bold text-stone-900 text-base flex items-center space-x-2 text-rose-600">
                <AlertCircle className="w-5 h-5" />
                <span>Confirmar Anulación de Venta</span>
              </h3>
              <button onClick={() => setShowCancelModal(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-xs text-rose-800 space-y-1">
              <p className="font-bold">Ticket: {saleToCancel.ticket_number} (S/ {parseFloat(saleToCancel.total).toFixed(2)})</p>
              <p>Al anular esta venta, el sistema automáticamente restituirá el stock a cada variante de prenda y registrará la reversión en el Kardex.</p>
            </div>

            <form onSubmit={handleConfirmCancel} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Motivo de Anulación (Auditoría)</label>
                <input
                  type="text"
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ej. Devolución de prenda por falla de talla..."
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="w-1/2 py-2.5 border border-stone-200 text-stone-600 rounded-xl font-semibold text-xs hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cancelling}
                  className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-xs shadow-sm transition-colors"
                >
                  {cancelling ? 'Anulando...' : 'Anular y Reponer Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

