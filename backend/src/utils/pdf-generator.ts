import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { getUploadsDir } from '../modules/shared/controllers/file-upload.controller';

export interface GeneratePDFOptions {
  html: string;
  outputPath?: string;
  format?: 'A4' | 'Letter' | 'thermal';
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
}

/**
 * Generate PDF from HTML using Puppeteer
 */
export async function generatePDF(options: GeneratePDFOptions): Promise<{ buffer: Buffer; path: string }> {
  const {
    html,
    outputPath,
    format = 'A4',
    margin = { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
  } = options;

  let browser;
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // Set content
    await page.setContent(html, {
      waitUntil: 'networkidle0',
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: format === 'thermal' ? undefined : format,
      width: format === 'thermal' ? '80mm' : undefined,
      height: format === 'thermal' ? undefined : undefined,
      printBackground: true,
      margin: {
        top: margin.top || '20mm',
        right: margin.right || '15mm',
        bottom: margin.bottom || '20mm',
        left: margin.left || '15mm',
      },
    });

    // Save to file if path provided
    let savedPath = '';
    if (outputPath) {
      const uploadsDir = getUploadsDir();
      const fullPath = path.join(uploadsDir, outputPath);
      const dir = path.dirname(fullPath);
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(fullPath, pdfBuffer);
      savedPath = fullPath;
    }

    return {
      buffer: Buffer.from(pdfBuffer),
      path: savedPath,
    };
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error(`Failed to generate PDF: ${(error as Error).message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Generate PDF for thermal printer (80mm width)
 */
export async function generateThermalPDF(html: string, outputPath?: string): Promise<{ buffer: Buffer; path: string }> {
  return generatePDF({
    html,
    outputPath,
    format: 'thermal',
    margin: { top: '5mm', right: '5mm', bottom: '5mm', left: '5mm' },
  });
}

