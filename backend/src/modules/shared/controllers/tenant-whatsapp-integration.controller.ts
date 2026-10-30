import { Response } from 'express';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { asyncHandler, sendSuccess, UnauthorizedError, ValidationError } from '../../../utils/errors';
import { TenantWhatsAppIntegrationService } from '../services/tenant-whatsapp-integration.service';
import { TenantSettingsService } from '../services/tenant-settings.service';

function maskSecret(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  return '***';
}

export class TenantWhatsAppIntegrationController {
  static get = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.auth?.tenantId) throw new UnauthorizedError('Unauthorized');
    const tenantId = req.auth.tenantId;

    const row = await TenantWhatsAppIntegrationService.getByTenantId(tenantId);
    if (!row) {
      sendSuccess(res, {
        configured: false,
        twilioWhatsappFromE164: '',
        isEnabled: false,
        twilioAccountSid: null,
        hasTwilioAuthToken: false,
        whatsappAiSystemPrompt: null,
        hasWhatsappOpenaiApiKey: false,
        openaiModel: null,
      });
      return;
    }

    sendSuccess(res, {
      configured: true,
      id: row.id,
      twilioWhatsappFromE164: row.twilioWhatsappFromE164,
      isEnabled: row.isEnabled,
      twilioAccountSid: row.twilioAccountSid || null,
      hasTwilioAuthToken: !!(row.twilioAuthToken && row.twilioAuthToken.length > 0),
      twilioAuthToken: maskSecret(row.twilioAuthToken),
      whatsappAiSystemPrompt: row.whatsappAiSystemPrompt || null,
      hasWhatsappOpenaiApiKey: !!(row.whatsappOpenaiApiKey && row.whatsappOpenaiApiKey.length > 0),
      whatsappOpenaiApiKey: maskSecret(row.whatsappOpenaiApiKey),
      openaiModel: row.openaiModel || null,
    });
  });

  static update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.auth?.tenantId) throw new UnauthorizedError('Unauthorized');
    const tenantId = req.auth.tenantId;

    const {
      twilioWhatsappFromE164,
      twilioAccountSid,
      twilioAuthToken,
      isEnabled,
      whatsappAiSystemPrompt,
      whatsappOpenaiApiKey,
      openaiModel,
    } = req.body || {};

    if (twilioWhatsappFromE164 !== undefined && typeof twilioWhatsappFromE164 !== 'string') {
      throw new ValidationError('twilioWhatsappFromE164 must be a string');
    }

    const existing = await TenantWhatsAppIntegrationService.getByTenantId(tenantId);
    if (!existing && (!twilioWhatsappFromE164 || !String(twilioWhatsappFromE164).trim())) {
      throw new ValidationError('twilioWhatsappFromE164 is required when creating integration');
    }

    const row = await TenantWhatsAppIntegrationService.upsert(tenantId, {
      twilioWhatsappFromE164: twilioWhatsappFromE164 !== undefined ? String(twilioWhatsappFromE164) : undefined,
      twilioAccountSid: twilioAccountSid !== undefined ? (twilioAccountSid ? String(twilioAccountSid) : null) : undefined,
      twilioAuthToken: twilioAuthToken !== undefined ? String(twilioAuthToken) : undefined,
      isEnabled,
      whatsappAiSystemPrompt: whatsappAiSystemPrompt !== undefined ? whatsappAiSystemPrompt : undefined,
      whatsappOpenaiApiKey: whatsappOpenaiApiKey !== undefined ? String(whatsappOpenaiApiKey) : undefined,
      openaiModel: openaiModel !== undefined ? openaiModel : undefined,
    });

    // Resolve effective OpenAI key hint for client (no secret)
    const aiSettings = await TenantSettingsService.getAiSettings(tenantId);
    const topOpenAi = (aiSettings as { openaiApiKey?: string } | null)?.openaiApiKey;

    sendSuccess(res, {
      id: row.id,
      twilioWhatsappFromE164: row.twilioWhatsappFromE164,
      isEnabled: row.isEnabled,
      twilioAccountSid: row.twilioAccountSid || null,
      hasTwilioAuthToken: !!(row.twilioAuthToken && row.twilioAuthToken.length > 0),
      whatsappAiSystemPrompt: row.whatsappAiSystemPrompt || null,
      hasWhatsappOpenaiApiKey: !!(row.whatsappOpenaiApiKey && row.whatsappOpenaiApiKey.length > 0),
      openaiModel: row.openaiModel || null,
      usesTenantPanelOpenAiFallback: !row.whatsappOpenaiApiKey && !!topOpenAi,
    });
  });
}
