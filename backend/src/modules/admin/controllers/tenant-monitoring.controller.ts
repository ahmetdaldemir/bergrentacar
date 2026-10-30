import { Request, Response } from 'express';
import { AppDataSource } from '../../../config/data-source';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Reservation } from '../../shared/entities/reservation.entity';
import { Customer } from '../../shared/entities/customer.entity';
import { TenantFeaturesService } from '../../shared/services/tenant-features.service';
import { TenantUserService } from '../../tenants/services/tenant-user.service';
import { TenantUserRole } from '../../tenants/entities/tenant-user.entity';
import { asyncHandler } from '../../../utils/errors';
import { SITE_TENANT_ID } from '../../../security/bergrentacar-site';

export class TenantMonitoringController {
  /**
   * Tüm tenant'ları listele (aktivitelerle birlikte)
   */
  static listTenants = asyncHandler(async (req: Request, res: Response) => {
    const tenantRepo = AppDataSource.getRepository(Tenant);
    const reservationRepo = AppDataSource.getRepository(Reservation);
    const customerRepo = AppDataSource.getRepository(Customer);

    const tenants = await tenantRepo.find({
      where: { id: SITE_TENANT_ID },
      order: { createdAt: 'DESC' },
    });

    // Her tenant için istatistikleri al
    const tenantsWithStats = await Promise.all(
      tenants.map(async (tenant) => {
        const [reservationCount, customerCount] = await Promise.all([
          reservationRepo.count({ where: { tenantId: tenant.id } }),
          customerRepo.count({ where: { tenantId: tenant.id } }),
        ]);

        // Son aktiviteler (son 5 rezervasyon)
        const recentReservations = await reservationRepo.find({
          where: { tenantId: tenant.id },
          order: { createdAt: 'DESC' },
          take: 5,
          relations: ['tour', 'tourSession'],
        });

        // Get tenant features
        const features = await TenantFeaturesService.getFeatures(tenant.id);

        return {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          category: tenant.category,
          isActive: tenant.isActive,
          defaultLanguage: tenant.defaultLanguage,
          supportEmail: tenant.supportEmail,
          createdAt: tenant.createdAt,
          updatedAt: tenant.updatedAt,
          features, // Include features in response
          stats: {
            reservations: reservationCount,
            customers: customerCount,
          },
          recentActivity: recentReservations.map(r => ({
            id: r.id,
            reference: r.reference,
            type: r.type,
            status: r.status,
            customerName: r.customerName,
            createdAt: r.createdAt,
          })),
        };
      })
    );

    res.json(tenantsWithStats);
  });

  /**
   * Tenant detaylarını getir
   */
  static getTenantDetails = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantRepo = AppDataSource.getRepository(Tenant);
    const reservationRepo = AppDataSource.getRepository(Reservation);
    const customerRepo = AppDataSource.getRepository(Customer);

    const tenant = await tenantRepo.findOne({ where: { id } });

    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    // İstatistikler
    const [reservationCount, customerCount, recentReservations] = await Promise.all([
      reservationRepo.count({ where: { tenantId: tenant.id } }),
      customerRepo.count({ where: { tenantId: tenant.id } }),
      reservationRepo.find({
        where: { tenantId: tenant.id },
        order: { createdAt: 'DESC' },
        take: 20,
        relations: ['tour', 'tourSession'],
      }),
    ]);

    res.json({
      tenant,
      stats: {
        reservations: reservationCount,
        customers: customerCount,
      },
      recentReservations,
    });
  });

  /**
   * Tenant aktivite loglarını getir
   */
  static getTenantActivity = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const reservationRepo = AppDataSource.getRepository(Reservation);
    const customerRepo = AppDataSource.getRepository(Customer);

    // Rezervasyon aktiviteleri
    const reservations = await reservationRepo.find({
      where: { tenantId: id },
      order: { updatedAt: 'DESC' },
      take: limit,
    });

    // Müşteri aktiviteleri (son eklenenler)
    const customers = await customerRepo.find({
      where: { tenantId: id },
      order: { createdAt: 'DESC' },
      take: Math.floor(limit / 2),
    });

    const activities = [
      ...reservations.map(r => ({
        type: 'reservation',
        action: r.status,
        entityId: r.id,
        entityName: r.reference,
        description: `Reservation ${r.reference} - ${r.customerName}`,
        timestamp: r.updatedAt,
      })),
      ...customers.map(c => ({
        type: 'customer',
        action: 'created',
        entityId: c.id,
        entityName: c.fullName,
        description: `New customer: ${c.fullName}`,
        timestamp: c.createdAt,
      })),
    ]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);

    res.json({
      tenantId: id,
      activities,
      total: activities.length,
    });
  });

  /**
   * Update tenant features (Admin only)
   */
  static updateTenantFeatures = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { features } = req.body;

    if (!features || typeof features !== 'object') {
      return res.status(400).json({ message: 'Features object is required' });
    }

    // Validate tenant exists
    const tenantRepo = AppDataSource.getRepository(Tenant);
    const tenant = await tenantRepo.findOne({ where: { id } });
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    // Update features
    await TenantFeaturesService.updateFeatures(id, features);

    // Get updated features
    const updatedFeatures = await TenantFeaturesService.getFeatures(id);

    res.json({
      success: true,
      message: 'Tenant features updated successfully',
      features: updatedFeatures,
    });
  });

  /**
   * Get tenant features (Admin only)
   */
  static getTenantFeatures = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Validate tenant exists
    const tenantRepo = AppDataSource.getRepository(Tenant);
    const tenant = await tenantRepo.findOne({ where: { id } });
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    const features = await TenantFeaturesService.getFeatures(id);
    res.json(features);
  });

  /**
   * List tenant users (Admin only)
   */
  static listTenantUsers = asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.query;

    if (!tenantId || typeof tenantId !== 'string') {
      return res.status(400).json({ message: 'tenantId query param is required' });
    }

    const users = await TenantUserService.list(tenantId);
    
    // Password hash'i response'dan çıkar
    const usersWithoutPassword = users.map(user => ({
      id: user.id,
      tenantId: user.tenantId,
      name: user.name,
      email: user.email,
      role: user.role,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    res.json(usersWithoutPassword);
  });

  /**
   * Create tenant user (Admin only)
   */
  static createTenantUser = asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, name, email, password, role } = req.body;

    if (!tenantId || !name || !email || !password) {
      return res.status(400).json({ message: 'tenantId, name, email ve password gereklidir' });
    }

    // Role validation
    if (role && !Object.values(TenantUserRole).includes(role)) {
      return res.status(400).json({ message: 'Geçersiz rol' });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({ message: 'Şifre en az 6 karakter olmalıdır' });
    }

    const user = await TenantUserService.create({
      tenantId,
      name,
      email,
      password,
      role,
    });

    // Password hash'i response'dan çıkar
    const { passwordHash, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  });

  /**
   * Update tenant user (Admin only)
   */
  static updateTenantUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { tenantId } = req.query;
    const { name, email, password, role } = req.body;

    if (!tenantId || typeof tenantId !== 'string') {
      return res.status(400).json({ message: 'tenantId query param is required' });
    }

    // Role validation
    if (role && !Object.values(TenantUserRole).includes(role)) {
      return res.status(400).json({ message: 'Geçersiz rol' });
    }

    // Password validation
    if (password && password.length < 6) {
      return res.status(400).json({ message: 'Şifre en az 6 karakter olmalıdır' });
    }

    const user = await TenantUserService.update(id, tenantId, {
      name,
      email,
      password,
      role,
    });

    // Password hash'i response'dan çıkar
    const { passwordHash, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  /**
   * Delete tenant user (Admin only)
   */
  static deleteTenantUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { tenantId } = req.query;

    if (!tenantId || typeof tenantId !== 'string') {
      return res.status(400).json({ message: 'tenantId query param is required' });
    }

    await TenantUserService.delete(id, tenantId);
    res.status(204).send();
  });
}

