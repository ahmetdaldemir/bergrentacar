import { TenantSettings } from '../modules/shared/entities/tenant-settings.entity';
import { absoluteLogoUrl } from './voucher.service';

export class EmailLayoutService {
  static wrapContent(content: string, siteSettings: TenantSettings | null, langCode = 'en'): string {
    const baseUrl = process.env.FRONTEND_URL || process.env.PUBLIC_URL || 'https://saastour360.com';
    const logoUrl: string = absoluteLogoUrl(siteSettings?.logoUrl, baseUrl);
    const siteName: string = siteSettings?.siteName || '';
    const companyName: string = (siteSettings as any)?.companyName || siteName;
    const companyAddress: string = (siteSettings as any)?.companyAddress || '';
    const companyPhone: string = (siteSettings as any)?.companyPhone || '';
    const companyEmail: string = (siteSettings as any)?.companyEmail || siteSettings?.fromEmail || '';
    const companyWebsite: string = (siteSettings as any)?.companyWebsite || '';

    const year = new Date().getFullYear();

    const footerLinks = [
      companyPhone && `<a href="tel:${companyPhone}" style="color:rgba(255,255,255,.65);text-decoration:none;">${companyPhone}</a>`,
      companyEmail && `<a href="mailto:${companyEmail}" style="color:rgba(255,255,255,.65);text-decoration:none;">${companyEmail}</a>`,
      companyWebsite && `<a href="${companyWebsite}" style="color:rgba(255,255,255,.65);text-decoration:none;">${companyWebsite}</a>`,
    ]
      .filter(Boolean)
      .join('<span style="color:rgba(255,255,255,.2);margin:0 10px;">·</span>');

    return `<!DOCTYPE html>
<html lang="${langCode}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>${siteName || companyName}</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">

<!-- ═══════════════════════════════════════════════════════
     OUTER WRAPPER
════════════════════════════════════════════════════════════ -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;min-height:100vh;">
  <tr>
    <td align="center" style="padding:32px 16px;">

      <!-- Inner card -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="max-width:620px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">

        <!-- ═══ HEADER ════════════════════════════════════════════ -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);padding:28px 36px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td>
                  ${logoUrl
                    ? `<img src="${logoUrl}" alt="${companyName}" height="52" style="display:block;max-width:180px;height:auto;max-height:52px;object-fit:contain;" />`
                    : `<span style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-.3px;">${companyName}</span>`}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ═══ CONTENT ══════════════════════════════════════════ -->
        <tr>
          <td style="padding:36px 36px 28px;">
            <div style="font-family:'Segoe UI',Arial,sans-serif;font-size:15px;line-height:1.7;color:#374151;">
              ${content}
            </div>
          </td>
        </tr>

        <!-- ═══ DIVIDER ══════════════════════════════════════════ -->
        <tr>
          <td style="padding:0 36px;">
            <div style="height:1px;background:#e5e7eb;"></div>
          </td>
        </tr>

        <!-- ═══ FOOTER ═══════════════════════════════════════════ -->
        <tr>
          <td style="background:#1e3a5f;padding:22px 36px;border-radius:0 0 12px 12px;">
            ${footerLinks
              ? `<p style="margin:0 0 8px;text-align:center;font-size:13px;">${footerLinks}</p>`
              : ''}
            ${companyAddress
              ? `<p style="margin:0 0 8px;text-align:center;font-size:12px;color:rgba(255,255,255,.5);">${companyAddress}</p>`
              : ''}
            <p style="margin:0;text-align:center;font-size:11px;color:rgba(255,255,255,.35);">
              &copy; ${year} ${companyName}. All rights reserved.
            </p>
          </td>
        </tr>

      </table>
      <!-- /inner card -->

    </td>
  </tr>
</table>
<!-- /outer wrapper -->

</body>
</html>`;
  }
}
