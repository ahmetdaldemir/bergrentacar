/**
 * Karşılaştırma için telefon son N hanesi (örn. +90 / 0 farkını yok saymak)
 */
export function normalizePhoneLastDigits(
  phone: string | null | undefined,
  len = 10
): string | null {
  if (!phone) return null;
  const d = String(phone).replace(/\D/g, '');
  return d.length >= len ? d.slice(-len) : null;
}
