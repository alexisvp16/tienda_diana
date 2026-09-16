import React, { useState, useEffect } from 'react';
import { 
  DollarSign, ArrowUpRight, ArrowDownLeft, Lock, Unlock, 
  CheckCircle, AlertCircle, Clock, FileText, User, Plus, X 
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function CashPage({ shiftData, onRefreshShift }) {
  const { user, isAdmin } = useAuth();
  
  // Estados para Apertura
  const [initialAmount, setInitialAmount] = useState('50.00');
  const [opening, setOpening] = useState(false);

  // Estados para Movimiento Manual
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveData, setMoveData] = useState({
    type: 'cash_out',
    amount: '',
    reason: ''
  });
  const [moving, setMoving] = useState(false);

  // Estados para Cierre / Arqueo
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [countedAmount, setCountedAmount] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [closing, setClosing] = useState(false);

  // Cajas Registradoras Físicas
  const [availableRegisters, setAvailableRegisters] = useState([]);
  const [selectedRegisterId, setSelectedRegisterId] = useState('');

  // Historial de turnos
  const [shiftHistory, setShiftHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    loadRegisters();
    if (isAdmin) {
      loadHistory();
    }
  }, [isAdmin]);

  const loadRegisters = async () => {
    try {
      const res = await api.getCashRegisters();
      if (res.success && res.data) {
        const active = res.data.filter(r => r.is_active);
        setAvailableRegisters(active);
        if (active.length > 0) {
          setSelectedRegisterId(active[0].id);
        }
      }
    } catch (err) {
      console.error('Error al cargar cajas físicas:', err);
    }
  };

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await api.getCashHistory();
      if (res.success) setShiftHistory(res.data);
    } catch (err) {
      console.error('Error al cargar historial de cajas:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenShift = async (e) => {
    e.preventDefault();
    setOpening(true);
    try {
      const res = await api.openShift({
        cash_register_id: selectedRegisterId || (availableRegisters[0]?.id || 1),
        initial_amount: parseFloat(initialAmount) || 0
      });
      if (res.success) {
        alert('Caja aperturada exitosamente.');
        onRefreshShift();
      }
    } catch (err) {
      alert(err.message || 'Error al abrir caja');
    } finally {
      setOpening(false);
    }
  };

  const handleAddMovement = async (e) => {
    e.preventDefault();
    if (!shiftData?.data?.shift?.id) return;
    setMoving(true);
    try {
      const res = await api.addCashMovement({
        cash_shift_id: shiftData.data.shift.id,
        type: moveData.type,
        amount: parseFloat(moveData.amount),
        reason: moveData.reason
      });
      if (res.success) {
        alert('Movimiento registrado en caja.');
        setShowMoveModal(false);
        setMoveData({ type: 'cash_out', amount: '', reason: '' });
        onRefreshShift();
      }
    } catch (err) {
      alert(err.message || 'Error al registrar movimiento');
    } finally {
      setMoving(false);
    }
  };

  const handleCloseShift = async (e) => {
    e.preventDefault();
    if (!shiftData?.data?.shift?.id) return;
    setClosing(true);
    try {
      const res = await api.closeShift({
        cash_shift_id: shiftData.data.shift.id,
        counted_amount: parseFloat(countedAmount) || 0,
        notes: closeNotes
      });
      if (res.success) {
        alert(`Caja cerrada exitosamente. Estado de arqueo: ${res.data.difference_status} (${res.data.difference >= 0 ? '+' : ''}S/ ${res.data.difference.toFixed(2)})`);
        setShowCloseModal(false);
        setCountedAmount('');
        setCloseNotes('');
        onRefreshShift();
        if (isAdmin) loadHistory();
      }
    } catch (err) {
      alert(err.message || 'Error al cerrar caja');
    } finally {
      setClosing(false);
    }
  };

  const current = shiftData?.data?.summary;
  const shift = shiftData?.data?.shift;

  // Cálculo en vivo de arqueo en el modal de cierre
  const expectedAmount = current?.expected_cash || 0;
  const counted = parseFloat(countedAmount) || 0;
  const difference = counted - expectedAmount;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-serif text-stone-900">Control de Caja & Arqueo de Turno</h1>
          <p className="text-xs text-stone-500">
            Apertura de turno, ingresos/egresos manuales, cálculo de efectivo esperado y cuadre físico.
          </p>
        </div>

        {shiftData?.hasActiveShift && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowMoveModal(true)}
              className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors border border-stone-200"
            >
              <Plus className="w-4 h-4 text-stone-600" />
              <span>Ingreso / Retiro Manual</span>
            </button>

            <button
              onClick={() => {
                setCountedAmount(expectedAmount.toFixed(2));
                setShowCloseModal(true);
              }}
              className="px-4 py-2 bg-stone-900 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
            >
              <Lock className="w-4 h-4" />
              <span>Realizar Arqueo y Cierre</span>
            </button>
          </div>
        )}
      </div>

      {/* VISTA 1: CAJA CERRADA (FORMULARIO DE APERTURA) */}
      {!shiftData?.hasActiveShift ? (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-8 max-w-lg mx-auto text-center space-y-6 my-8">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 mx-auto flex items-center justify-center">
            <Unlock className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-stone-900 font-serif">Apertura de Turno de Caja</h2>
            <p className="text-xs text-stone-500 mt-1">
              Ingrese el monto en efectivo con el que se inicia la gaveta (fondo de caja para dar cambio).
            </p>
          </div>

          <form onSubmit={handleOpenShift} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Caja Registradora / Estación</label>
              <select
                value={selectedRegisterId}
                onChange={(e) => setSelectedRegisterId(e.target.value)}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm font-bold text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                {availableRegisters.map(reg => (
                  <option key={reg.id} value={reg.id}>
                    {reg.name} ({reg.location || 'Boutique'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Monto Inicial en Efectivo (S/)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-stone-400 font-bold text-xs">S/</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  required
                  value={initialAmount}
                  onChange={(e) => setInitialAmount(e.target.value)}
                  placeholder="50.00"
                  className="w-full pl-9 pr-4 py-2.5 border border-stone-200 rounded-xl text-lg font-extrabold text-stone-900 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
            </div>

            <div className="bg-stone-50 p-3 rounded-xl text-xs text-stone-600 space-y-1">
              <p><span className="font-semibold">Cajero(a) Responsable:</span> {user?.name}</p>
              <p><span className="font-semibold">Estado:</span> Listo para aperturar turno</p>
            </div>

            <button
              type="submit"
              disabled={opening || availableRegisters.length === 0}
              className="w-full py-3 bg-pink-600 hover:bg-pink-700 disabled:bg-stone-300 text-white rounded-xl font-bold text-sm shadow-md shadow-pink-200 transition-colors"
            >
              {opening ? 'Aperturando...' : 'Abrir Turno de Caja'}
            </button>
          </form>
        </div>
      ) : (
        /* VISTA 2: CAJA ABIERTA (DASHBOARD EN VIVO Y ARQUEO) */
        <div className="space-y-6">
          
          {/* Barra de estado de turno */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                #{shift?.id}
              </div>
              <div>
                <p className="text-sm font-bold text-stone-900">{shift?.register_name}</p>
                <p className="text-xs text-stone-500">
                  Responsable: <span className="font-semibold text-stone-700">{shift?.user_name}</span> • Abierta desde: {new Date(shift?.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>TURNO ACTIVO</span>
              </span>
            </div>
          </div>

          {/* Tarjetas de Arqueo en Vivo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Monto Inicial */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider block">Fondo Inicial</span>
              <p className="text-2xl font-extrabold text-stone-900 mt-1">
                S/ {current?.initial_amount?.toFixed(2)}
              </p>
              <span className="text-[10px] text-stone-400">Efectivo al abrir</span>
            </div>

            {/* Ventas en Efectivo */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider block">+ Ventas Efectivo</span>
                <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-extrabold text-emerald-700 mt-1">
                S/ {current?.sales_cash?.toFixed(2)}
              </p>
              <span className="text-[10px] text-stone-400">Cobrado en tickets</span>
            </div>

            {/* Movimientos Manuales Netos */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">± Manuales</span>
              <div className="flex items-baseline space-x-2 mt-1">
                <p className="text-2xl font-extrabold text-stone-900">
                  S/ {(current?.manual_cash_in - current?.manual_cash_out)?.toFixed(2)}
                </p>
              </div>
              <span className="text-[10px] text-stone-400">
                +S/ {current?.manual_cash_in?.toFixed(2)} in / -S/ {current?.manual_cash_out?.toFixed(2)} out
              </span>
            </div>

            {/* Efectivo Esperado en Gaveta */}
            <div className="bg-pink-600 text-white p-4 rounded-2xl shadow-md shadow-pink-200">
              <span className="text-xs font-bold uppercase tracking-wider block text-pink-100">Dinero Esperado</span>
              <p className="text-3xl font-extrabold mt-1">
                S/ {current?.expected_cash?.toFixed(2)}
              </p>
              <span className="text-[10px] text-pink-200">Debe estar en la gaveta</span>
            </div>

          </div>

          {/* Desglose de Otros Métodos (No afectan gaveta de efectivo) */}
          <div className="bg-stone-50 rounded-2xl border border-stone-200 p-4">
            <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
              Ventas en otros métodos de pago (Bancos / Tarjetas):
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                <span className="text-stone-400 block">Tarjeta Débito/Crédito:</span>
                <span className="font-extrabold text-stone-800 text-sm">S/ {current?.sales_card?.toFixed(2)}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                <span className="text-stone-400 block">Transferencia / Yape:</span>
                <span className="font-extrabold text-stone-800 text-sm">S/ {current?.sales_transfer?.toFixed(2)}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                <span className="text-stone-400 block">Total Facturado en Turno:</span>
                <span className="font-extrabold text-pink-600 text-sm">S/ {current?.total_sales?.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Tabla de Movimientos Manuales de Caja */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 space-y-3">
            <h3 className="font-bold text-stone-900 text-sm">Historial de Ingresos y Retiros Manuales del Turno</h3>
            
            {shiftData?.data?.movements?.length === 0 ? (
              <p className="text-xs text-stone-400 py-4 text-center">No se han registrado movimientos manuales en este turno.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-stone-400 border-b border-stone-100 font-semibold uppercase tracking-wider">
                      <th className="py-2">Hora</th>
                      <th className="py-2">Tipo</th>
                      <th className="py-2">Concepto / Motivo</th>
                      <th className="py-2 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-700">
                    {shiftData?.data?.movements?.map(m => (
                      <tr key={m.id}>
                        <td className="py-2 text-stone-400">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.type === 'cash_in' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {m.type === 'cash_in' ? 'INGRESO' : 'RETIRO'}
                          </span>
                        </td>
                        <td className="py-2 font-medium text-stone-900">{m.reason}</td>
                        <td className={`py-2 text-right font-extrabold ${
                          m.type === 'cash_in' ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {m.type === 'cash_in' ? '+' : '-'}S/ {parseFloat(m.amount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* MODAL INGRESO / RETIRO MANUAL */}
      {showMoveModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-bold text-stone-900 text-base">Registrar Movimiento Manual</h3>
              <button onClick={() => setShowMoveModal(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMovement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Tipo de Operación</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMoveData({ ...moveData, type: 'cash_in' })}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      moveData.type === 'cash_in'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-stone-50 text-stone-700 border-stone-200'
                    }`}
                  >
                    + Ingreso de Efectivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setMoveData({ ...moveData, type: 'cash_out' })}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      moveData.type === 'cash_out'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-stone-50 text-stone-700 border-stone-200'
                    }`}
                  >
                    - Retiro / Egreso
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Monto (S/)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  required
                  value={moveData.amount}
                  onChange={(e) => setMoveData({ ...moveData, amount: e.target.value })}
                  placeholder="20.00"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Motivo o Concepto</label>
                <input
                  type="text"
                  required
                  value={moveData.reason}
                  onChange={(e) => setMoveData({ ...moveData, reason: e.target.value })}
                  placeholder="Ej. Cambio de billetes, Pago flete mercadería..."
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMoveModal(false)}
                  className="w-1/2 py-2.5 border border-stone-200 text-stone-600 rounded-xl font-semibold text-xs hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={moving}
                  className="w-1/2 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-xs shadow-sm transition-colors"
                >
                  {moving ? 'Registrando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ARQUEO Y CIERRE DE CAJA */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-bold text-stone-900 text-lg">Arqueo y Cierre de Turno</h3>
              <button onClick={() => setShowCloseModal(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comparativa Esperado vs Contado */}
            <div className="bg-stone-50 p-4 rounded-xl space-y-3 border border-stone-200">
              <div className="flex justify-between items-center text-xs text-stone-600">
                <span>Efectivo Esperado en Sistema:</span>
                <span className="font-bold text-stone-900 text-sm">S/ {expectedAmount.toFixed(2)}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  Efectivo Físico Contado por Cajera (S/)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={countedAmount}
                  onChange={(e) => setCountedAmount(e.target.value)}
                  placeholder="Monto contado"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-lg font-extrabold text-stone-900 focus:ring-2 focus:ring-pink-500"
                />
              </div>

              {/* Resultado del Cuadre */}
              <div className={`p-3 rounded-xl text-center border font-bold text-sm ${
                difference === 0
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : difference > 0
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                {difference === 0 ? (
                  <span>✓ Cuadre Exacto (S/ 0.00)</span>
                ) : difference > 0 ? (
                  <span>Sobrante de Caja: +S/ {difference.toFixed(2)}</span>
                ) : (
                  <span>Faltante en Caja: -S/ {Math.abs(difference).toFixed(2)}</span>
                )}
              </div>
            </div>

            <form onSubmit={handleCloseShift} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Notas u Observaciones del Cierre</label>
                <textarea
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  rows="2"
                  placeholder="Detalles sobre el arqueo, entregas o billetes grandes..."
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs focus:ring-2 focus:ring-pink-500"
                ></textarea>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="w-1/2 py-2.5 border border-stone-200 text-stone-600 rounded-xl font-semibold text-xs hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={closing}
                  className="w-1/2 py-2.5 bg-stone-900 hover:bg-rose-600 text-white rounded-xl font-semibold text-xs shadow-sm transition-colors"
                >
                  {closing ? 'Cerrando Turno...' : 'Confirmar Cierre de Caja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AUDITORÍA: HISTORIAL DE TURNOS CERRADOS (ADMIN) */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 space-y-4 mt-8">
          <h3 className="font-bold text-stone-900 text-base">Historial de Turnos de Caja (Auditoría)</h3>
          
          {loadingHistory ? (
            <p className="text-xs text-stone-400 py-4 text-center">Cargando historial...</p>
          ) : shiftHistory.length === 0 ? (
            <p className="text-xs text-stone-400 py-4 text-center">No hay turnos registrados en el historial.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-stone-400 border-b border-stone-100 font-semibold uppercase tracking-wider">
                    <th className="py-2">Turno #</th>
                    <th className="py-2">Cajero</th>
                    <th className="py-2">Apertura</th>
                    <th className="py-2">Cierre</th>
                    <th className="py-2">Esperado</th>
                    <th className="py-2">Contado</th>
                    <th className="py-2">Diferencia</th>
                    <th className="py-2">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {shiftHistory.map(h => (
                    <tr key={h.id}>
                      <td className="py-2.5 font-bold text-stone-900">#{h.id}</td>
                      <td className="py-2.5">{h.user_name}</td>
                      <td className="py-2.5 text-stone-500">{new Date(h.opened_at).toLocaleDateString()} {new Date(h.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="py-2.5 text-stone-500">{h.closed_at ? `${new Date(h.closed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '-'}</td>
                      <td className="py-2.5 font-bold">{h.expected_amount !== null ? `S/ ${parseFloat(h.expected_amount).toFixed(2)}` : '-'}</td>
                      <td className="py-2.5 font-bold">{h.counted_amount !== null ? `S/ ${parseFloat(h.counted_amount).toFixed(2)}` : '-'}</td>
                      <td className="py-2.5">
                        {h.difference !== null ? (
                          <span className={`font-bold ${
                            h.difference === 0 ? 'text-emerald-600' : h.difference > 0 ? 'text-blue-600' : 'text-rose-600'
                          }`}>
                            {h.difference >= 0 ? '+' : ''}S/ {parseFloat(h.difference).toFixed(2)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          h.status === 'open' ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-600'
                        }`}>
                          {h.status === 'open' ? 'ABIERTO' : 'CERRADO'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

