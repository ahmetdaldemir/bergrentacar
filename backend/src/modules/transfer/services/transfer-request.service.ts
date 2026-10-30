import { Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { TransferRequest, TransferRequestStatus, TransferRequestSource } from '../entities/transfer-request.entity';
import { TenantSettingsService } from '../../shared/services/tenant-settings.service';
import { EmailLayoutService } from '../../../services/email-layout.service';
import { sendMail } from '../../../services/mail.service';
import { logger } from '../../../utils/logger';

export interface CreateTransferRequestInput {
  tenantId: string;
  languageId?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  message?: string | null;
  pickup: {
    location: string;
    latitude: number | null;
    longitude: number | null;
  };
  dropoff: {
    location: string;
    latitude: number | null;
    longitude: number | null;
  };
  passengerCount: number;
  transferDate?: string | null;
  routeInfo?: {
    distance: number;
    distanceText: string;
    duration: number;
    durationText: string;
  } | null;
  requestedAt: string;
  source: 'web' | 'mobile' | 'api';
}

export interface ListTransferRequestsInput {
  tenantId: string;
  status?: TransferRequestStatus;
  page?: number;
  limit?: number;
}

export class TransferRequestService {
  private repo: Repository<TransferRequest>;

  constructor() {
    this.repo = AppDataSource.getRepository(TransferRequest);
  }

  async create(input: CreateTransferRequestInput): Promise<TransferRequest> {
    const request = this.repo.create({
      tenantId: input.tenantId,
      languageId: input.languageId ?? null,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      message: input.message ?? null,
      pickupLocation: input.pickup.location,
      pickupLat: input.pickup.latitude,
      pickupLng: input.pickup.longitude,
      dropoffLocation: input.dropoff.location,
      dropoffLat: input.dropoff.latitude,
      dropoffLng: input.dropoff.longitude,
      passengerCount: input.passengerCount,
      transferDate: input.transferDate ?? null,
      distanceM: input.routeInfo?.distance ?? null,
      distanceText: input.routeInfo?.distanceText ?? null,
      durationS: input.routeInfo?.duration ?? null,
      durationText: input.routeInfo?.durationText ?? null,
      source: (input.source as TransferRequestSource) ?? TransferRequestSource.WEB,
      requestedAt: new Date(input.requestedAt),
      status: TransferRequestStatus.NEW,
    });

    const saved = await this.repo.save(request);

    // Tenant'a bildirim maili gönder (hata olursa yoksay)
    this.sendTenantNotification(saved).catch((err) => {
      logger.error('Failed to send tenant notification for transfer request:', err);
    });

    return saved;
  }

  async list(input: ListTransferRequestsInput): Promise<{ data: TransferRequest[]; total: number }> {
    const page = input.page ?? 1;
    const limit = Math.min(input.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('r')
      .where('r.tenant_id = :tenantId', { tenantId: input.tenantId })
      .orderBy('r.requested_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (input.status) {
      qb.andWhere('r.status = :status', { status: input.status });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async getById(tenantId: string, id: string): Promise<TransferRequest | null> {
    return this.repo.findOne({ where: { tenantId, id } });
  }

  async updateStatus(
    tenantId: string,
    id: string,
    status: TransferRequestStatus,
    adminNote?: string
  ): Promise<TransferRequest | null> {
    const request = await this.repo.findOne({ where: { tenantId, id } });
    if (!request) return null;

    request.status = status;
    if (adminNote !== undefined) request.adminNote = adminNote;

    return this.repo.save(request);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete({ tenantId, id });
    return (result.affected ?? 0) > 0;
  }

  private async sendTenantNotification(request: TransferRequest): Promise<void> {
    const mailSettings = await TenantSettingsService.getMailSettings(request.tenantId);
    if (!mailSettings || !mailSettings.smtpHost || !mailSettings.fromEmail) {
      logger.warn(`Mail not configured for tenant ${request.tenantId}, skipping transfer request notification.`);
      return;
    }

    // Tenant'ın bildirim email adresini bul
    // Önce site settings'deki companyEmail, yoksa fromEmail
    const siteSettings = await TenantSettingsService.getSiteSettings(request.tenantId);
    const notifyEmail = (siteSettings as any)?.companyEmail || mailSettings.fromEmail;

    const transferDate = request.transferDate
      ? new Date(request.transferDate).toLocaleDateString('tr-TR')
      : '—';

    const routeRow = request.distanceText
      ? `<tr><td style="padding:6px 0;color:#6b7280;">Mesafe / Süre</td><td style="padding:6px 0;font-weight:600;">${request.distanceText} / ${request.durationText || '—'}</td></tr>`
      : '';

    const body = `
      <h2 style="color:#111827;margin:0 0 16px;">Yeni Transfer Talebi</h2>
      <p style="color:#374151;margin:0 0 20px;">Web sitenizden yeni bir transfer rezervasyon talebi alındı.</p>

      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;">
        <tr><td style="padding:6px 0;color:#6b7280;width:140px;">Müşteri Adı</td><td style="padding:6px 0;font-weight:600;">${request.customerName}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">E-Posta</td><td style="padding:6px 0;">${request.customerEmail}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Telefon</td><td style="padding:6px 0;">${request.customerPhone}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Yolcu Sayısı</td><td style="padding:6px 0;">${request.passengerCount}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Transfer Tarihi</td><td style="padding:6px 0;">${transferDate}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Alış Noktası</td><td style="padding:6px 0;">${request.pickupLocation}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Bırakış Noktası</td><td style="padding:6px 0;">${request.dropoffLocation}</td></tr>
        ${routeRow}
        ${request.message ? `<tr><td style="padding:6px 0;color:#6b7280;">Mesaj</td><td style="padding:6px 0;">${request.message}</td></tr>` : ''}
        <tr><td style="padding:6px 0;color:#6b7280;">Kaynak</td><td style="padding:6px 0;">${request.source}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Talep Zamanı</td><td style="padding:6px 0;">${new Date(request.requestedAt).toLocaleString('tr-TR')}</td></tr>
      </table>

      <p style="margin-top:24px;color:#6b7280;font-size:13px;">Bu talebi yönetim panelinizden inceleyebilirsiniz.</p>
    `;

    const htmlBody = EmailLayoutService.wrapContent(body, siteSettings);

    await sendMail({
      tenantId: request.tenantId,
      to: notifyEmail,
      subject: `Yeni Transfer Talebi — ${request.customerName}`,
      html: htmlBody,
    });

    logger.info(`Transfer request notification sent to ${notifyEmail} for tenant ${request.tenantId}`);
  }
}
