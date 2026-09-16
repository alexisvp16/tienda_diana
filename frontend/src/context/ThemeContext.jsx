import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const ThemeContext = createContext(null);

export const THEMES = {
  rose: {
    id: 'rose',
    name: 'Rosa Boutique (Original)',
    description: 'Tono rosa empolvado y magenta femenino, clásico de boutique de dama.',
    primary: 'pink-600',
    hover: 'pink-700',
    accentBg: 'bg-pink-50',
    accentText: 'text-pink-700',
    accentBorder: 'border-pink-200',
    buttonPrimary: 'bg-pink-600 hover:bg-pink-700 text-white',
    badge: 'bg-pink-50 text-pink-700 border border-pink-200',
    gradient: 'from-pink-600 to-rose-400',
    shadow: 'shadow-pink-200',
    ring: 'focus:ring-pink-500',
    highlight: '#db2777'
  },
  emerald: {
    id: 'emerald',
    name: 'Esmeralda Velvet (Lujo)',
    description: 'Verde esmeralda y menta suave, estilo sofisticado y exclusivo.',
    primary: 'emerald-600',
    hover: 'emerald-700',
    accentBg: 'bg-emerald-50',
    accentText: 'text-emerald-800',
    accentBorder: 'border-emerald-200',
    buttonPrimary: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    badge: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    gradient: 'from-emerald-700 to-teal-500',
    shadow: 'shadow-emerald-200',
    ring: 'focus:ring-emerald-500',
    highlight: '#059669'
  },
  noir: {
    id: 'noir',
    name: 'Noir & Bronze (Alta Costura)',
    description: 'Negro obsidiana con acentos dorados/bronce, minimalismo de pasarela.',
    primary: 'amber-600',
    hover: 'amber-700',
    accentBg: 'bg-amber-50',
    accentText: 'text-amber-900',
    accentBorder: 'border-amber-200',
    buttonPrimary: 'bg-stone-900 hover:bg-amber-600 text-white',
    badge: 'bg-amber-50 text-amber-900 border border-amber-200',
    gradient: 'from-stone-900 to-amber-700',
    shadow: 'shadow-amber-100',
    ring: 'focus:ring-amber-500',
    highlight: '#d97706'
  }
};

export function ThemeProvider({ children }) {
  const [settings, setSettings] = useState({
    store_name: 'TIENDADIANA BOUTIQUE',
    document_number: 'RUC 20601234567',
    address: 'Av. Principal 456, Miraflores',
    phone: '+51 987 654 321',
    ticket_message: '¡Gracias por su compra! Cambios dentro de 7 días con ticket.',
    logo_url: '',
    theme: 'rose',
    currency: 'S/'
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme || 'rose';
  }, [settings.theme]);

  const loadSettings = async () => {
    try {
      const res = await api.getSettings();
      if (res.success && res.data) {
        setSettings(res.data);
      }
    } catch (err) {
      console.error('Error cargando ajustes de tienda:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStoreSettings = async (newData) => {
    const res = await api.updateSettings(newData);
    if (res.success) {
      setSettings(prev => ({ ...prev, ...newData }));
      return res;
    }
    throw new Error(res.message || 'Error al guardar ajustes');
  };

  const currentTheme = THEMES[settings.theme] || THEMES.rose;

  return (
    <ThemeContext.Provider
      value={{
        settings,
        currentTheme,
        themeKey: settings.theme || 'rose',
        updateStoreSettings,
        reloadSettings: loadSettings,
        loading
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de un ThemeProvider');
  }
  return context;
}
