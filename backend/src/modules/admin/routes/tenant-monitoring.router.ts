import { Router } from 'express';
import { TenantMonitoringController } from '../controllers/tenant-monitoring.controller';
import { authenticateAdmin } from '../middleware/admin-auth.middleware';

const router = Router();

// Tüm route'lar admin authentication gerektirir
router.get('/tenants', authenticateAdmin, TenantMonitoringController.listTenants);
router.get('/tenants/:id', authenticateAdmin, TenantMonitoringController.getTenantDetails);
router.get('/tenants/:id/activity', authenticateAdmin, TenantMonitoringController.getTenantActivity);
router.get('/tenants/:id/features', authenticateAdmin, TenantMonitoringController.getTenantFeatures);
router.put('/tenants/:id/features', authenticateAdmin, TenantMonitoringController.updateTenantFeatures);

// Tenant user management routes
router.get('/tenant-users', authenticateAdmin, TenantMonitoringController.listTenantUsers);
router.post('/tenant-users', authenticateAdmin, TenantMonitoringController.createTenantUser);
router.put('/tenant-users/:id', authenticateAdmin, TenantMonitoringController.updateTenantUser);
router.delete('/tenant-users/:id', authenticateAdmin, TenantMonitoringController.deleteTenantUser);

export default router;

