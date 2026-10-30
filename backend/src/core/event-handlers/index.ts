/**
 * Event Handlers Registration
 * 
 * Tüm event handler'ları burada kayıt edilir.
 * Server başlatılırken çağrılır.
 */

import { registerTransferEventHandlers } from './transfer.handlers';
import { registerBackupEventHandlers } from './backup.handlers';
import { logger } from '../../utils/logger';

/**
 * Tüm event handler'ları kaydet
 */
export function registerAllEventHandlers(): void {
  logger.info('[EventHandlers] Registering all event handlers...');
  
  registerTransferEventHandlers();
  registerBackupEventHandlers();
  
  logger.info('[EventHandlers] All event handlers registered');
}

export { registerTransferEventHandlers } from './transfer.handlers';
export { registerBackupEventHandlers } from './backup.handlers';
