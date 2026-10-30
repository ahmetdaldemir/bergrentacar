/**
 * Shared utility types used across modules.
 *
 * NOTE: The large module-level interfaces (IModule, ITransferModule,
 * IRentacarModule, IFinanceModule, ICustomerModule, INotificationModule,
 * IBackupModule) were removed because no service implements them and they
 * were creating maintenance overhead without providing value.
 *
 * If a cross-module abstraction is needed in the future, define a minimal
 * interface next to the service that needs it rather than in a global file.
 */

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
