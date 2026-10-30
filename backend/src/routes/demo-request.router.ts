import { Router, Request, Response } from 'express';
import nodemailer from 'nodemailer';
import { asyncHandler, sendSuccess, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Demo talep maili gönderme.
 * Gmail üzerinden sabit hesap → info@saastour360.com
 */
const GMAIL_USER = 'ahmetdaldemirdeveloper@gmail.com';
const GMAIL_PASS = 'sjcnuoeudfzgyatg';
const DEMO_INBOX = 'info@saastour360.com';

function buildEmailHtml(data: {
  name: string;
  company: string;
  email: string;
  phone?: string;
  module?: string;
  message?: string;
}) {
  const moduleLabel: Record<string, string> = {
    tour: 'Tur Yönetimi',
    transfer: 'Transfer Yönetimi',
    rentacar: 'Rent A Car',
    all: 'Tüm Modüller',
  };

  return `
<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#2563eb,#4f46e5);padding:32px 36px;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;letter-spacing:-.3px;">🚀 Yeni Demo Talebi</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,.75);font-size:14px;">SaasTour360 platformuna demo talebi geldi</p>
    </div>
    <!-- Body -->
    <div style="padding:32px 36px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;width:140px;color:#6b7280;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;">Ad Soyad</td>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#111827;font-size:15px;font-weight:600;">${data.name}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;">Şirket</td>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#111827;font-size:15px;font-weight:600;">${data.company}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;">E-posta</td>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;"><a href="mailto:${data.email}" style="color:#2563eb;font-size:15px;font-weight:600;">${data.email}</a></td>
        </tr>
        ${data.phone ? `<tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;">Telefon</td>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;"><a href="tel:${data.phone}" style="color:#2563eb;font-size:15px;font-weight:600;">${data.phone}</a></td>
        </tr>` : ''}
        ${data.module ? `<tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;">İlgili Modül</td>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#111827;font-size:15px;">${moduleLabel[data.module] || data.module}</td>
        </tr>` : ''}
      </table>
      ${data.message ? `
      <div style="margin-top:24px;">
        <div style="color:#6b7280;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:10px;">Mesaj</div>
        <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:16px;color:#374151;font-size:14px;line-height:1.7;">${data.message}</div>
      </div>` : ''}
    </div>
    <!-- Footer -->
    <div style="background:#f8fafc;padding:20px 36px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">Bu mail SaasTour360 demo talep formu üzerinden gönderilmiştir. • <a href="https://saastour360.com" style="color:#2563eb;">saastour360.com</a></p>
    </div>
  </div>
</body>
</html>`;
}

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { name, company, email, phone, module: mod, message } = req.body;

    if (!name?.trim()) throw new ValidationError('Ad Soyad zorunludur');
    if (!company?.trim()) throw new ValidationError('Şirket adı zorunludur');
    if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ValidationError('Geçerli bir e-posta adresi giriniz');
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    });

    const htmlBody = buildEmailHtml({
      name: name.trim(),
      company: company.trim(),
      email: email.trim(),
      phone: phone?.trim() || undefined,
      module: mod?.trim() || undefined,
      message: message?.trim() || undefined,
    });

    await transporter.sendMail({
      from: `"SaasTour360 Demo" <${GMAIL_USER}>`,
      to: DEMO_INBOX,
      replyTo: email.trim(),
      subject: `🚀 Demo Talebi — ${company.trim()} (${name.trim()})`,
      html: htmlBody,
    });

    logger.info('Demo talebi maili gönderildi', { name, company, email });
    sendSuccess(res, { message: 'Demo talebiniz alındı. En kısa sürede sizinle iletişime geçeceğiz.' });
  }),
);

export default router;
