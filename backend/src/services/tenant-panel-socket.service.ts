import type { Server } from 'socket.io';
import { logger } from '../utils/logger';

let ioRef: Server | null = null;

/** ChatSocketServer ile aynı Socket.io instance (server.ts başlangıcında bağlanır). */
export function initTenantPanelSocket(io: Server): void {
  ioRef = io;
  logger.info('[TenantPanelSocket] bound to Socket.io');
}

/**
 * Panel kullanıcıları `tenant:${tenantId}` odasına (ChatSocketServer admin bağlantısı) otomatik girer.
 * Dashboard takvim / operasyon özeti vb. sayfa yenilenmeden güncellensin diye yayınlanır.
 */
export function notifyTenantPanelRefresh(tenantId: string, payload?: { reason?: string }): void {
  if (!ioRef) return;
  try {
    ioRef.to(`tenant:${tenantId}`).emit('tenant_panel_refresh', {
      at: new Date().toISOString(),
      ...payload,
    });
  } catch (e) {
    logger.warn('[TenantPanelSocket] emit failed', { error: e instanceof Error ? e.message : String(e) });
  }
}
