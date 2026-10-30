import { Router } from 'express';
import { InvoiceController } from '../controllers/invoice.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Issue invoice (admin only)
router.post(
  '/issue',
  authorize(Permission.RESERVATION_UPDATE),
  InvoiceController.issueInvoice
);

// Get invoice by reservation (tur / araç kiralama)
router.get(
  '/reservation/:reservationId',
  authorize(Permission.RESERVATION_VIEW),
  InvoiceController.getInvoiceByReservation
);

// Get invoice by transfer reservation
router.get(
  '/transfer-reservation/:transferReservationId',
  authorize(Permission.RESERVATION_VIEW),
  InvoiceController.getInvoiceByTransferReservation
);

// Get all invoices for tenant
router.get(
  '/',
  authorize(Permission.RESERVATION_VIEW),
  InvoiceController.getInvoices
);

// Integrator config management (admin only)
router.get(
  '/integrators/:integratorKey/config',
  authorize(Permission.SETTINGS_VIEW),
  InvoiceController.getIntegratorConfig
);

router.put(
  '/integrators/:integratorKey/config',
  authorize(Permission.SETTINGS_UPDATE),
  InvoiceController.saveIntegratorConfig
);

// Get available integrators (public info)
router.get(
  '/integrators',
  InvoiceController.getAvailableIntegrators
);

export default router;

