import { Router } from 'express';
import { HotelController } from '../controllers/hotel.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';

const router = Router();

router.use(authenticate);
router.get('/', authorize(Permission.HOTEL_VIEW), HotelController.list);
router.post('/', authorize(Permission.HOTEL_CREATE), HotelController.create);
router.patch('/:id', authorize(Permission.HOTEL_UPDATE), HotelController.update);
router.delete('/:id', authorize(Permission.HOTEL_DELETE), HotelController.remove);

export default router;
