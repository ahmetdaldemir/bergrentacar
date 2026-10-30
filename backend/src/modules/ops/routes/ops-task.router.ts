import { Router } from 'express';
import { OpsTaskController } from '../controllers/ops-task.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';

const router = Router();
router.use(authenticate);

router.get('/', authorize(Permission.RESERVATION_VIEW), OpsTaskController.list);
router.get('/:id', authorize(Permission.RESERVATION_VIEW), OpsTaskController.getById);
router.post('/', authorize(Permission.RESERVATION_UPDATE), OpsTaskController.createOrGet);
router.post('/:id/media', authorize(Permission.RESERVATION_UPDATE), OpsTaskController.updateMedia);
router.post('/:id/verify-docs', authorize(Permission.RESERVATION_UPDATE), OpsTaskController.verifyDocs);
router.post('/:id/finalize', authorize(Permission.RESERVATION_UPDATE), OpsTaskController.finalizeCheckout);
router.post('/:id/return/finalize', authorize(Permission.RESERVATION_UPDATE), OpsTaskController.finalizeReturn);
router.get('/:id/print', authorize(Permission.RESERVATION_VIEW), OpsTaskController.getPrintPayload);
router.post('/:id/start', authorize(Permission.RESERVATION_UPDATE), OpsTaskController.startTask);
router.post('/:id/checklist', authorize(Permission.RESERVATION_UPDATE), OpsTaskController.updateChecklist);
router.post('/:id/media-counts', authorize(Permission.RESERVATION_UPDATE), OpsTaskController.updateMediaCounts);
router.post('/:id/error', authorize(Permission.RESERVATION_UPDATE), OpsTaskController.recordError);

export default router;

