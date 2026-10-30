import { AppDataSource } from '../../../config/data-source';
import { TenantWhatsAppIntegration } from '../entities/tenant-whatsapp-integration.entity';

export interface TenantWhatsAppIntegrationInput {
  twilioAccountSid?: string | null;
  twilioAuthToken?: string | null;
  twilioWhatsappFromE164?: string;
  isEnabled?: boolean;
  whatsappAiSystemPrompt?: string | null;
  whatsappOpenaiApiKey?: string | null;
  openaiModel?: string | null;
}

function normalizeE164(raw: string): string {
  const s = raw.trim().replace(/\s/g, '');
  if (!s) return '';
  if (s.startsWith('+')) return s;
  return `+${s.replace(/^\+/, '')}`;
}

export class TenantWhatsAppIntegrationService {
  private static repo() {
    return AppDataSource.getRepository(TenantWhatsAppIntegration);
  }

  static async getByTenantId(tenantId: string): Promise<TenantWhatsAppIntegration | null> {
    return this.repo().findOne({ where: { tenantId } });
  }

  static async upsert(tenantId: string, input: TenantWhatsAppIntegrationInput): Promise<TenantWhatsAppIntegration> {
    const repo = this.repo();
    let row = await repo.findOne({ where: { tenantId } });

    const fromE164 = input.twilioWhatsappFromE164 != null ? normalizeE164(input.twilioWhatsappFromE164) : undefined;
    if (fromE164 === '') {
      throw new Error('twilioWhatsappFromE164 cannot be empty when provided');
    }

    if (!row) {
      if (!fromE164) {
        throw new Error('twilioWhatsappFromE164 is required for initial setup');
      }
      row = repo.create({
        tenantId,
        twilioWhatsappFromE164: fromE164,
        twilioAccountSid: input.twilioAccountSid ?? null,
        twilioAuthToken: input.twilioAuthToken ?? null,
        isEnabled: input.isEnabled !== false,
        whatsappAiSystemPrompt: input.whatsappAiSystemPrompt ?? null,
        whatsappOpenaiApiKey: input.whatsappOpenaiApiKey ?? null,
        openaiModel: input.openaiModel?.trim() || null,
      });
      return repo.save(row);
    }

    if (fromE164) row.twilioWhatsappFromE164 = fromE164;
    if (input.twilioAccountSid !== undefined) row.twilioAccountSid = input.twilioAccountSid?.trim() || null;
    if (input.twilioAuthToken !== undefined) {
      const t = (input.twilioAuthToken ?? '').trim();
      row.twilioAuthToken = t ? t : null;
    }
    if (input.isEnabled !== undefined) row.isEnabled = input.isEnabled;
    if (input.whatsappAiSystemPrompt !== undefined) row.whatsappAiSystemPrompt = input.whatsappAiSystemPrompt?.trim() || null;
    if (input.whatsappOpenaiApiKey !== undefined) {
      const k = (input.whatsappOpenaiApiKey ?? '').trim();
      row.whatsappOpenaiApiKey = k ? k : null;
    }
    if (input.openaiModel !== undefined) row.openaiModel = input.openaiModel?.trim() || null;

    return repo.save(row);
  }
}
