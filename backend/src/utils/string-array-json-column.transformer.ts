import type { ValueTransformer } from 'typeorm';

/**
 * `simple-json` ile saklanmış dizi alanlarında bazen tek e-posta düz metin veya bozuk JSON
 * yazılmış olabiliyor; TypeORM'un JSON.parse'ı login sırasında patlıyor.
 * Ham metni güvenle string[] yapar; yazarken her zaman geçerli JSON dizi stringi üretir.
 */
export const stringArrayJsonColumnTransformer: ValueTransformer = {
  to(value: string[] | null | undefined): string | null {
    if (value == null || !Array.isArray(value)) return null;
    const arr = value.map((s) => String(s).trim()).filter(Boolean);
    return arr.length ? JSON.stringify(arr) : null;
  },
  from(value: unknown): string[] | null {
    if (value == null || value === '') return null;
    if (Array.isArray(value)) return value.map(String);
    const raw = typeof value === 'string' ? value.trim() : String(value ?? '');
    if (!raw) return null;
    if (raw.startsWith('[')) {
      try {
        const parsed = JSON.parse(raw) as unknown;
        return Array.isArray(parsed) ? parsed.map(String) : null;
      } catch {
        return null;
      }
    }
    if (raw.includes('@')) return [raw];
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? parsed.map(String) : null;
    } catch {
      return null;
    }
  },
};
