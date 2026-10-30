import { Router } from 'express';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';
import { requireFeature } from '../../shared/middleware/feature-check.middleware';
import { TenantHotelController } from '../controllers/tenant-hotel.controller';

const router = Router();

router.use(authenticate);
router.use(requireFeature('hotel'));

router.get('/', authorize(Permission.HOTEL_SALES_VIEW), TenantHotelController.list);
router.post('/', authorize(Permission.HOTEL_SALES_CREATE), TenantHotelController.create);
router.get('/:id', authorize(Permission.HOTEL_SALES_VIEW), TenantHotelController.getById);
router.put('/:id', authorize(Permission.HOTEL_SALES_UPDATE), TenantHotelController.update);
router.patch('/:id', authorize(Permission.HOTEL_SALES_UPDATE), TenantHotelController.update);
router.delete('/:id', authorize(Permission.HOTEL_SALES_DELETE), TenantHotelController.remove);

// Room types nested under hotel
router.get('/:hotelId/room-types', authorize(Permission.HOTEL_SALES_VIEW), TenantHotelController.listRoomTypes);
router.post('/:hotelId/room-types', authorize(Permission.HOTEL_SALES_CREATE), TenantHotelController.createRoomType);
router.put('/:hotelId/room-types/:roomTypeId', authorize(Permission.HOTEL_SALES_UPDATE), TenantHotelController.updateRoomType);
router.patch('/:hotelId/room-types/:roomTypeId', authorize(Permission.HOTEL_SALES_UPDATE), TenantHotelController.updateRoomType);
router.delete('/:hotelId/room-types/:roomTypeId', authorize(Permission.HOTEL_SALES_DELETE), TenantHotelController.removeRoomType);

export { router as tenantHotelRouter };
