import React, { useState, useEffect } from 'react';
import { 
  Store, Palette, Users, Landmark, Save, Plus, 
  Upload, Trash2, Edit3, Check, Shield, AlertCircle, X, Image as ImageIcon 
} from 'lucide-react';
import { useTheme, THEMES } from '../context/ThemeContext';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function SettingsPage() {
  const { isAdmin } = useAuth();
  const { settings, currentTheme, updateStoreSettings } = useTheme();
  
  // Pestañas internas de ajustes
  const [activeSubTab, setActiveSubTab] = useState('store');

  // Estado formulario de tienda
  const [storeForm, setStoreForm] = useState({
    store_name: '',
    document_number: '',
    address: '',
    phone: '',
    ticket_message: '',
    logo_url: '',
    theme: 'rose',
    currency: 'S/'
  });
  const [savingStore, setSavingStore] = useState(false);

  // Estado de Cajas Registradoras
  const [registers, setRegisters] = useState([]);
  const [newRegName, setNewRegName] = useState('');
  const [newRegLocation, setNewRegLocation] = useState('');
  const [editingReg, setEditingReg] = useState(null);

  // Estado de Usuarios y Roles
  const [usersList, setUsersList] = useState([]);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'cashier'
  });
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    if (settings) {
      setStoreForm({
        store_name: settings.store_name || '',
        document_number: settings.document_number || '',
        address: settings.address || '',
        phone: settings.phone || '',
        ticket_message: settings.ticket_message || '',
        logo_url: settings.logo_url || '',
        theme: settings.theme || 'rose',
        currency: settings.currency || 'S/'
      });
    }
    loadRegistersAndUsers();
  }, [settings]);

  const loadRegistersAndUsers = async () => {
    try {
      const [regsRes, usersRes] = await Promise.all([
        api.getCashRegisters(),
        api.getUsers()
      ]);
      if (regsRes.success) setRegisters(regsRes.data);
      if (usersRes.success) setUsersList(usersRes.data);
    } catch (err) {
      console.error('Error cargando cajas y usuarios:', err);
    }
  };

  // Manejador de Logo
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('El archivo de imagen no debe superar los 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setStoreForm(prev => ({ ...prev, logo_url: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveStore = async (e) => {
    e.preventDefault();
    setSavingStore(true);
    try {
      await updateStoreSettings(storeForm);
      alert('Datos de la tienda guardados correctamente.');
    } catch (err) {
      alert(err.message || 'Error al guardar configuración');
    } finally {
      setSavingStore(false);
    }
  };

  const handleSelectTheme = async (themeKey) => {
    setStoreForm(prev => ({ ...prev, theme: themeKey }));
    try {
      await updateStoreSettings({ ...storeForm, theme: themeKey });
    } catch (err) {
      alert(err.message || 'Error al cambiar tema');
    }
  };

  // Handlers para Cajas Registradoras
  const handleCreateRegister = async (e) => {
    e.preventDefault();
    if (!newRegName.trim()) return;
    try {
      const res = await api.createCashRegister({
        name: newRegName.trim(),
        location: newRegLocation.trim() || 'Tienda Principal'
      });
      if (res.success) {
        setNewRegName('');
        setNewRegLocation('');
        loadRegistersAndUsers();
      }
    } catch (err) {
      alert(err.message || 'Error al crear caja');
    }
  };

  const handleUpdateRegister = async (regId) => {
    if (!editingReg?.name?.trim()) return;
    try {
      const res = await api.updateCashRegister(regId, {
        name: editingReg.name.trim(),
        location: editingReg.location?.trim()
      });
      if (res.success) {
        setEditingReg(null);
        loadRegistersAndUsers();
      }
    } catch (err) {
      alert(err.message || 'Error al actualizar caja');
    }
  };

  const handleDeleteRegister = async (regId) => {
    if (!window.confirm('¿Desactivar esta caja registradora?')) return;
    try {
      const res = await api.deleteCashRegister(regId);
      if (res.success) loadRegistersAndUsers();
    } catch (err) {
      alert(err.message || 'Error al desactivar caja');
    }
  };

  // Handlers para Usuarios y Roles
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createUser(newUser);
      if (res.success) {
        alert(res.message);
        setNewUser({ name: '', email: '', password: '', role: 'cashier' });
        loadRegistersAndUsers();
      }
    } catch (err) {
      alert(err.message || 'Error al crear usuario');
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const res = await api.updateUser(editingUser.id, editingUser);
      if (res.success) {
        alert('Usuario actualizado.');
        setEditingUser(null);
        loadRegistersAndUsers();
      }
    } catch (err) {
      alert(err.message || 'Error al actualizar usuario');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('¿Desactivar acceso a este usuario?')) return;
    try {
      const res = await api.deleteUser(userId);
      if (res.success) loadRegistersAndUsers();
    } catch (err) {
      alert(err.message || 'Error al desactivar usuario');
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-stone-500">
        <AlertCircle className="w-12 h-12 text-stone-400 mx-auto mb-3" />
        <p className="text-base font-bold text-stone-800">Acceso Exclusivo de Administración</p>
        <p className="text-xs text-stone-500">Solo el usuario administrador puede modificar ajustes y roles de la tienda.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Cabecera */}
      <div>
        <h1 className="text-2xl font-bold font-serif text-stone-900">Ajustes & Personalización de la Tienda</h1>
        <p className="text-xs text-stone-500">
          Modifica los datos comerciales, logotipo, temas de colores, cajas físicas y personal con roles.
        </p>
      </div>

      {/* Sub-navegación de Configuración */}
      <div className="flex border-b border-stone-200 space-x-4 text-xs font-semibold">
        <button
          onClick={() => setActiveSubTab('store')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition-colors ${
            activeSubTab === 'store'
              ? 'border-pink-600 text-pink-600'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Datos & Logo de la Tienda</span>
        </button>

        <button
          onClick={() => setActiveSubTab('themes')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition-colors ${
            activeSubTab === 'themes'
              ? 'border-pink-600 text-pink-600'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Temas de Colores</span>
        </button>

        <button
          onClick={() => setActiveSubTab('registers')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition-colors ${
            activeSubTab === 'registers'
              ? 'border-pink-600 text-pink-600'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>Cajas Físicas ({registers.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('users')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition-colors ${
            activeSubTab === 'users'
              ? 'border-pink-600 text-pink-600'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Usuarios & Roles ({usersList.length})</span>
        </button>
      </div>

      {/* 1. DATOS DE LA TIENDA Y LOGOTIPO */}
      {activeSubTab === 'store' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 max-w-4xl space-y-6">
          <form onSubmit={handleSaveStore} className="space-y-5">
            
            {/* Sección Logotipo */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                Logotipo de la Boutique
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl border border-dashed border-stone-300 bg-stone-50/50">
                <div className="w-24 h-24 rounded-2xl bg-white border border-stone-200 flex items-center justify-center overflow-hidden shadow-sm flex-shrink-0">
                  {storeForm.logo_url ? (
                    <img src={storeForm.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-stone-300" />
                  )}
                </div>

                <div className="space-y-2 text-center sm:text-left">
                  <p className="text-xs text-stone-600 font-medium">
                    Sube el logo de la tienda en formato PNG, JPG o SVG (máx. 2MB).
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    <label className="px-3 py-1.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-lg text-xs font-semibold cursor-pointer shadow-sm flex items-center space-x-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Subir Imagen</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>

                    {storeForm.logo_url && (
                      <button
                        type="button"
                        onClick={() => setStoreForm(prev => ({ ...prev, logo_url: '' }))}
                        className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-semibold flex items-center space-x-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Quitar Logo</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Datos Comerciales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Nombre Comercial de la Tienda</label>
                <input
                  type="text"
                  required
                  value={storeForm.store_name}
                  onChange={(e) => setStoreForm({ ...storeForm, store_name: e.target.value })}
                  placeholder="TIENDADIANA BOUTIQUE"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">RUC o Documento Fiscal</label>
                <input
                  type="text"
                  value={storeForm.document_number}
                  onChange={(e) => setStoreForm({ ...storeForm, document_number: e.target.value })}
                  placeholder="RUC 20601234567"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Dirección del Local</label>
                <input
                  type="text"
                  value={storeForm.address}
                  onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                  placeholder="Av. Las Flores 123, Miraflores"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Teléfono / WhatsApp</label>
                <input
                  type="text"
                  value={storeForm.phone}
                  onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                  placeholder="+51 987 654 321"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-pink-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Mensaje al Pie del Ticket de Venta
              </label>
              <input
                type="text"
                value={storeForm.ticket_message}
                onChange={(e) => setStoreForm({ ...storeForm, ticket_message: e.target.value })}
                placeholder="¡Gracias por su compra! Cambios dentro de 7 días con ticket de venta."
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-pink-500"
              />
            </div>

            <div className="pt-3 border-t border-stone-100 flex justify-end">
              <button
                type="submit"
                disabled={savingStore}
                className="px-6 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-bold text-xs shadow-md shadow-pink-200 transition-colors flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{savingStore ? 'Guardando...' : 'Guardar Datos de la Tienda'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. SELECTOR DE TEMAS DE COLORES (3 TEMAS) */}
      {activeSubTab === 'themes' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
            <h2 className="font-bold text-stone-900 text-sm">Escoge la Identidad Visual de la Boutique</h2>
            <p className="text-xs text-stone-500">
              Selecciona uno de los 3 estilos de colores para personalizar los botones, encabezados, acentos y recibos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {Object.values(THEMES).map(theme => {
              const isSelected = storeForm.theme === theme.id;
              return (
                <div
                  key={theme.id}
                  onClick={() => handleSelectTheme(theme.id)}
                  className={`cursor-pointer rounded-2xl border-2 p-5 bg-white shadow-sm hover:shadow-md transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? 'border-stone-900 ring-2 ring-stone-900/10'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div>
                    {isSelected && (
                      <span className="absolute top-3 right-3 w-6 h-6 rounded-full bg-stone-900 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}

                    {/* Muestra de Color / Gradiente */}
                    <div className={`h-20 rounded-xl bg-gradient-to-r ${theme.gradient} mb-4 shadow-sm flex items-center justify-center text-white font-bold text-sm tracking-wide shadow-inner`}>
                      {theme.name.split(' ')[0]}
                    </div>

                    <h3 className="font-bold text-stone-900 text-base">{theme.name}</h3>
                    <p className="text-xs text-stone-500 mt-1 mb-4 leading-relaxed">{theme.description}</p>
                  </div>

                  {/* Vista Previa de Componentes */}
                  <div className="space-y-2 border-t border-stone-100 pt-3">
                    <span className="text-[10px] uppercase font-bold text-stone-400 block">Vista Previa:</span>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${theme.badge}`}>
                        Talla M
                      </span>
                      <button className={`px-3 py-1 rounded-lg text-xs font-bold ${theme.buttonPrimary} shadow-sm`}>
                        Cobrar S/ 120
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. CAJAS FÍSICAS HECHAS POR EL ADMIN */}
      {activeSubTab === 'registers' && (
        <div className="space-y-6">
          
          {/* Formulario Crear Caja */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 space-y-4 max-w-2xl">
            <h3 className="font-bold text-stone-900 text-base flex items-center space-x-2">
              <Landmark className="w-4 h-4 text-pink-600" />
              <span>Registrar Nueva Caja Físicamente</span>
            </h3>

            <form onSubmit={handleCreateRegister} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-6">
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">Nombre de la Estación</label>
                <input
                  type="text"
                  required
                  value={newRegName}
                  onChange={(e) => setNewRegName(e.target.value)}
                  placeholder="Ej. Caja 02 - Segundo Piso, Caja Express"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">Ubicación</label>
                <input
                  type="text"
                  value={newRegLocation}
                  onChange={(e) => setNewRegLocation(e.target.value)}
                  placeholder="Ej. Boutique Central, Pasarela"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div className="sm:col-span-2 flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                >
                  + Crear
                </button>
              </div>
            </form>
          </div>

          {/* Listado de Cajas Registradoras */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-stone-50 text-stone-500 font-semibold uppercase tracking-wider border-b border-stone-200">
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Nombre de Caja</th>
                  <th className="py-3 px-4">Ubicación</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700 font-medium">
                {registers.map(reg => (
                  <tr key={reg.id} className="hover:bg-stone-50/70">
                    <td className="py-3 px-4 font-mono font-bold text-stone-900">#{reg.id}</td>
                    
                    <td className="py-3 px-4">
                      {editingReg?.id === reg.id ? (
                        <input
                          type="text"
                          value={editingReg.name}
                          onChange={(e) => setEditingReg({ ...editingReg, name: e.target.value })}
                          className="px-2 py-1 border border-pink-300 rounded text-xs font-bold"
                        />
                      ) : (
                        <span className="font-bold text-stone-900">{reg.name}</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {editingReg?.id === reg.id ? (
                        <input
                          type="text"
                          value={editingReg.location}
                          onChange={(e) => setEditingReg({ ...editingReg, location: e.target.value })}
                          className="px-2 py-1 border border-pink-300 rounded text-xs"
                        />
                      ) : (
                        reg.location
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        reg.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-400'
                      }`}>
                        {reg.is_active ? 'OPERATIVA' : 'INACTIVA'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right space-x-1">
                      {editingReg?.id === reg.id ? (
                        <>
                          <button
                            onClick={() => handleUpdateRegister(reg.id)}
                            className="px-2 py-1 bg-emerald-600 text-white rounded text-[11px] font-bold"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => setEditingReg(null)}
                            className="px-2 py-1 bg-stone-200 text-stone-700 rounded text-[11px]"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingReg({ id: reg.id, name: reg.name, location: reg.location })}
                            className="p-1.5 text-stone-500 hover:text-pink-600 rounded"
                            title="Editar caja"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {reg.is_active && (
                            <button
                              onClick={() => handleDeleteRegister(reg.id)}
                              className="p-1.5 text-stone-400 hover:text-rose-600 rounded"
                              title="Desactivar caja"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* 4. GESTIÓN DE USUARIOS Y MÁS ROLES */}
      {activeSubTab === 'users' && (
        <div className="space-y-6">
          
          {/* Formulario Crear Usuario */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 space-y-4 max-w-3xl">
            <h3 className="font-bold text-stone-900 text-base flex items-center space-x-2">
              <Users className="w-4 h-4 text-pink-600" />
              <span>Registrar Nuevo Personal con Rol Asignado</span>
            </h3>

            <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">Nombre y Apellido</label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Ej. Sofía Cajera"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="correo@tiendadiana.com"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">Contraseña Inicial</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">Rol</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-2 py-2 border border-stone-200 rounded-lg text-xs font-bold capitalize focus:ring-2 focus:ring-pink-500"
                >
                  <option value="cashier">Cajero(a) / POS</option>
                  <option value="admin">Administrador(a)</option>
                  <option value="supervisor">Supervisor(a)</option>
                </select>
              </div>

              <div className="sm:col-span-1 flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                >
                  Crear
                </button>
              </div>
            </form>
          </div>

          {/* Listado de Usuarios */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-stone-50 text-stone-500 font-semibold uppercase tracking-wider border-b border-stone-200">
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4">Correo</th>
                  <th className="py-3 px-4">Rol Asignado</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700 font-medium">
                {usersList.map(u => (
                  <tr key={u.id} className="hover:bg-stone-50/70">
                    <td className="py-3 px-4 font-bold text-stone-900">{u.name}</td>
                    <td className="py-3 px-4 text-stone-500">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        u.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : u.role === 'supervisor'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-pink-50 text-pink-700 border border-pink-200'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {u.is_active ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {u.is_active && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 rounded"
                          title="Desactivar usuario"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

    </div>
  );
}
