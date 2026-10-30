import { Router } from 'express';
import { TransferVehicleFeatureController } from '../controllers/transfer-vehicle-feature.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { upload } from '../../shared/controllers/file-upload.controller';

export const transferVehicleFeatureRouter = Router();

// All routes require authentication
transferVehicleFeatureRouter.use(authenticate);

// CRUD routes
transferVehicleFeatureRouter.get('/', TransferVehicleFeatureController.list);
transferVehicleFeatureRouter.get('/:id', TransferVehicleFeatureController.getById);
transferVehicleFeatureRouter.post('/', TransferVehicleFeatureController.create);
transferVehicleFeatureRouter.put('/:id', TransferVehicleFeatureController.update);
transferVehicleFeatureRouter.delete('/:id', TransferVehicleFeatureController.delete);
transferVehicleFeatureRouter.put('/reorder', TransferVehicleFeatureController.reorder);

// Icon upload route
transferVehicleFeatureRouter.post('/:id/upload-icon', upload.single('icon'), TransferVehicleFeatureController.uploadIcon);

