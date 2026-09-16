// Utilidades de formato para la moneda local (Soles Peruanos S/)
export const CURRENCY = 'S/';

export const formatPrice = (val) => {
  const num = parseFloat(val) || 0;
  return `S/ ${num.toFixed(2)}`;
};

