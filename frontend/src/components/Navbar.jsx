import React from 'react';
import { ShoppingBag, Store, Layers, DollarSign, ReceiptText, LogOut, Settings, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar({ activeTab, setActiveTab, shiftData }) {
  const { user, logout, isAdmin } = useAuth();
  const { settings, currentTheme } = useTheme();

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo y Nombre */}
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${currentTheme.gradient} flex items-center justify-center text-white shadow-md`}>
              {settings.logo_url ? (
                <img src={settings.logo_url} alt={`Logo de ${settings.store_name}`} className="w-full h-full object-contain p-1.5" />
              ) : (
                <ShoppingBag className="w-5 h-5" />
              )}
            </div>
            <div>
              <span className="text-xl font-bold font-serif tracking-wide text-stone-900">{settings.store_name || 'TIENDADIANA'}</span>
              <span className={`hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${currentTheme.badge}`}>
                Boutique Dama
              </span>
            </div>
          </div>

          {/* Navegación por pestañas */}
          <nav className="flex space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('pos')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'pos'
                  ? `${currentTheme.buttonPrimary} shadow-sm`
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>POS / Venta</span>
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'inventory'
                  ? `${currentTheme.buttonPrimary} shadow-sm`
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Inventario & Kardex</span>
            </button>

            <button
              onClick={() => setActiveTab('cash')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'cash'
                  ? `${currentTheme.buttonPrimary} shadow-sm`
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Caja & Arqueo</span>
            </button>

            <button
              onClick={() => setActiveTab('sales')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'sales'
                  ? `${currentTheme.buttonPrimary} shadow-sm`
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <ReceiptText className="w-4 h-4" />
              <span>Historial Ventas</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'settings'
                    ? `${currentTheme.buttonPrimary} shadow-sm`
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Ajustes</span>
              </button>
            )}
          </nav>

          {/* Estado de caja, Usuario y Salir */}
          <div className="flex items-center space-x-3">
            {/* Indicador de caja */}
            <div className="hidden md:flex items-center">
              {shiftData?.hasActiveShift ? (
                <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Caja Abierta</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Caja Cerrada</span>
                </span>
              )}
            </div>

            {/* Perfil */}
            <div className="flex items-center space-x-2 border-l border-stone-200 pl-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-stone-900 leading-none">{user?.name || 'Usuario'}</p>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  isAdmin ? 'text-purple-600' : 'text-stone-500'
                }`}>
                  {user?.role || 'Cajera'}
                </span>
              </div>
              <button
                onClick={logout}
                title="Cerrar sesión"
                className="p-2 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
}
