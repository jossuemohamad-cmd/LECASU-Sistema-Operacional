/**
 * Utility formatters for LECASU ERP
 * Standardized Currency: MZN (Meticais) with Mozambican standard grouping
 * e.g., 10 MZN, 100 MZN, 100.000 MZN, 1.000.000 MZN
 */

export const formatMZN = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(Number(val))) {
    return '0,00 MZN';
  }
  const num = Number(val);
  const formatted = new Intl.NumberFormat('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
  return `${formatted} MZN`;
};

export const formatMZNCompact = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(Number(val))) {
    return '0 MZN';
  }
  const num = Number(val);
  const formatted = new Intl.NumberFormat('pt-MZ', {
    maximumFractionDigits: 0,
  }).format(num);
  return `${formatted} MZN`;
};

export const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('pt-MZ', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return String(dateStr);
  }
};

export const formatDateTime = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('pt-MZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return String(dateStr);
  }
};
