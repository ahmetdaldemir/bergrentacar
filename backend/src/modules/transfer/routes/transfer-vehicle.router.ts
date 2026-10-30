import { Router } from 'express';
import { TransferVehicleController } from '../controllers/transfer-vehicle.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { upload } from '../../shared/controllers/file-upload.controller';

const router = Router();

router.use(authenticate);

router.get('/', TransferVehicleController.list);
router.get('/:id', TransferVehicleController.getById);
router.post('/', TransferVehicleController.create);
router.put('/:id', TransferVehicleController.update);

// Image management routes
router.post('/:id/upload-images', upload.array('images', 5), TransferVehicleController.uploadImages); // Max 5 images
router.delete('/:id/images/:imageId', TransferVehicleController.deleteImage);
router.put('/:id/images/:imageId/primary', TransferVehicleController.setPrimaryImage);
router.put('/:id/images/reorder', TransferVehicleController.reorderImages);

router.delete('/:id', TransferVehicleController.delete);

export { router as transferVehicleRouter };

