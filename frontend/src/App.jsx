import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import Navbar from './components/Navbar';
import PosPage from './pages/PosPage';
import InventoryPage from './pages/InventoryPage';
import CashPage from './pages/CashPage';
import SalesPage from './pages/SalesPage';
import SettingsPage from './pages/SettingsPage';
import { api } from './services/api';

export default function App() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('pos');
  const [shiftData, setShiftData] = useState(null);

  const fetchShift = async () => {
    if (!user) return;
    try {
      const res = await api.getCurrentShift();
      if (res.success) {
        setShiftData(res);
      }
    } catch (err) {
      console.error('Error al verificar turno de caja:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchShift();
      // Refresco periódico del estado de la caja cada 30 segundos
      const interval = setInterval(fetchShift, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  if (loading) {
    return (
        <div className="app-shell min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-pink-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-stone-600 uppercase tracking-widest">
            Iniciando TIENDADIANA...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="app-shell min-h-screen flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        shiftData={shiftData}
      />

      <main className="flex-1 pb-12">
        {activeTab === 'pos' && (
          <PosPage
            shiftData={shiftData}
            onOpenCashTab={() => setActiveTab('cash')}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryPage />
        )}

        {activeTab === 'cash' && (
          <CashPage
            shiftData={shiftData}
            onRefreshShift={fetchShift}
          />
        )}

        {activeTab === 'sales' && (
          <SalesPage />
        )}

        {activeTab === 'settings' && <SettingsPage />}
      </main>
    </div>
  );
}
