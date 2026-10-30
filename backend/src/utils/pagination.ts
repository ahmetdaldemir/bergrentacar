/**
 * Ortak sayfalama helper'ı.
 * Controller'larda page, limit, sort tek yerde parse edilir.
 */

import { Query } from 'express-serve-static-core';

export interface PaginationOptions {
  /** Varsayılan sayfa (varsayılan: 1) */
  defaultPage?: number;
  /** Varsayılan limit (varsayılan: 20) */
  defaultLimit?: number;
  /** Maksimum limit (varsayılan: 100) */
  maxLimit?: number;
  /** Sort alanı query key (varsayılan: 'sortBy') */
  sortByKey?: string;
  /** Sort yönü query key (varsayılan: 'sortOrder') */
  sortOrderKey?: string;
  /** İzin verilen sort alanları (opsiyonel; verilmezse her string kabul) */
  allowedSortFields?: string[];
  /** Varsayılan sort alanı */
  defaultSortBy?: string;
  /** Varsayılan sort yönü */
  defaultSortOrder?: 'asc' | 'desc';
}

export interface PaginationResult {
  page: number;
  limit: number;
  offset: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const DEFAULT_OPTIONS: Required<Omit<PaginationOptions, 'allowedSortFields' | 'defaultSortBy' | 'defaultSortOrder'>> & {
  allowedSortFields?: string[];
  defaultSortBy?: string;
  defaultSortOrder?: 'asc' | 'desc';
} = {
  defaultPage: 1,
  defaultLimit: 20,
  maxLimit: 100,
  sortByKey: 'sortBy',
  sortOrderKey: 'sortOrder',
};

/**
 * Query'den sayfalama ve sıralama parametrelerini parse eder.
 * Kullanım: const { page, limit, offset, sortBy, sortOrder } = getPaginationFromQuery(req.query);
 */
export function getPaginationFromQuery(
  query: Query,
  options: PaginationOptions = {}
): PaginationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const page = Math.max(1, parseInt(String(query.page), 10) || opts.defaultPage);
  let limit = parseInt(String(query.limit), 10) || opts.defaultLimit;
  if (opts.maxLimit && limit > opts.maxLimit) limit = opts.maxLimit;
  const offset = (page - 1) * limit;

  const sortByRaw = query[opts.sortByKey] as string | undefined;
  const sortOrderRaw = (query[opts.sortOrderKey] as string)?.toLowerCase();

  let sortBy: string | undefined = opts.defaultSortBy;
  if (sortByRaw && typeof sortByRaw === 'string' && sortByRaw.trim()) {
    const field = sortByRaw.trim();
    if (!opts.allowedSortFields || opts.allowedSortFields.includes(field)) {
      sortBy = field;
    }
  }

  let sortOrder: 'asc' | 'desc' = opts.defaultSortOrder ?? 'desc';
  if (sortOrderRaw === 'asc' || sortOrderRaw === 'desc') {
    sortOrder = sortOrderRaw;
  }

  const result: PaginationResult = { page, limit, offset };
  if (sortBy !== undefined) result.sortBy = sortBy;
  if (sortOrder !== undefined) result.sortOrder = sortOrder;
  return result;
}
