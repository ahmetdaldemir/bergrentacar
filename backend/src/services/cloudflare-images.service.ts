import FormData from 'form-data';
import fs from 'fs';
import { loadEnv } from '../config/env';

export interface CloudflareImageUploadResult {
  success: boolean;
  id: string;
  filename: string;
  uploaded: string;
  requireSignedURLs: boolean;
  variants: string[];
  url?: string; // Full URL with variant
}

export interface CloudflareImageConfig {
  accountId: string;
  apiToken: string;
  variant?: string; // Default variant name (e.g., 'public')
}

export class CloudflareImagesService {
  private static config: CloudflareImageConfig | null = null;

  private static getConfig(): CloudflareImageConfig {
    if (this.config) {
      return this.config;
    }

    const {
      CLOUDFLARE_IMAGES_ACCOUNT_ID,
      CLOUDFLARE_IMAGES_API_TOKEN,
      CLOUDFLARE_IMAGES_VARIANT = 'public',
    } = process.env;

    if (!CLOUDFLARE_IMAGES_ACCOUNT_ID || !CLOUDFLARE_IMAGES_API_TOKEN) {
      throw new Error('Cloudflare Images configuration is missing. Please set CLOUDFLARE_IMAGES_ACCOUNT_ID and CLOUDFLARE_IMAGES_API_TOKEN');
    }

    this.config = {
      accountId: CLOUDFLARE_IMAGES_ACCOUNT_ID,
      apiToken: CLOUDFLARE_IMAGES_API_TOKEN,
      variant: CLOUDFLARE_IMAGES_VARIANT,
    };

    return this.config;
  }

  /**
   * Upload image from file path to Cloudflare Images
   * @param filePath - Local file path
   * @param metadata - Optional metadata (filename, alt text, etc.)
   * @returns Cloudflare image URL
   */
  static async uploadFromPath(
    filePath: string,
    metadata?: { filename?: string; alt?: string; requireSignedURLs?: boolean; customMetadata?: Record<string, any> }
  ): Promise<CloudflareImageUploadResult> {
    const config = this.getConfig();

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));

    if (metadata?.requireSignedURLs !== undefined) {
      formData.append('requireSignedURLs', metadata.requireSignedURLs.toString());
    }

    if (metadata?.customMetadata) {
      formData.append('metadata', JSON.stringify(metadata.customMetadata));
    }

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/images/v1`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiToken}`,
            ...formData.getHeaders(),
          },
          body: formData as any,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cloudflare Images API error: ${response.status} ${errorText}`);
      }

      const result = await response.json() as { result: CloudflareImageUploadResult; success: boolean; errors: any[] };

      if (!result.success || !result.result) {
        throw new Error(`Cloudflare Images upload failed: ${JSON.stringify(result.errors)}`);
      }

      // Construct full URL with variant
      // Cloudflare Images URL format: https://imagedelivery.net/<account-hash>/<image-id>/<variant>
      // The variants array contains full URLs, we can extract the account hash from there
      const imageId = result.result.id;
      const variant = config.variant || 'public';
      
      // Extract account hash from variant URL if available
      // Variant URL format: https://imagedelivery.net/<account-hash>/<image-id>/<variant-name>
      let fullUrl: string;
      if (result.result.variants && result.result.variants.length > 0) {
        // Use the first variant URL and replace the variant name if needed
        const variantUrl = result.result.variants[0];
        if (variant !== 'public' && !variantUrl.includes(`/${variant}`)) {
          // Replace variant in URL
          fullUrl = variantUrl.replace(/\/[^\/]+$/, `/${variant}`);
        } else {
          fullUrl = variantUrl;
        }
      } else {
        // Fallback: construct URL manually (may not work if account hash is different from account ID)
        fullUrl = `https://imagedelivery.net/${config.accountId}/${imageId}/${variant}`;
      }

      return {
        ...result.result,
        url: fullUrl,
      };
    } catch (error) {
      console.error('Cloudflare Images upload error:', error);
      throw error;
    }
  }

  /**
   * Upload image from buffer to Cloudflare Images
   * @param buffer - Image buffer
   * @param filename - Original filename
   * @param metadata - Optional metadata
   * @returns Cloudflare image URL
   */
  static async uploadFromBuffer(
    buffer: Buffer,
    filename: string,
    metadata?: { alt?: string; requireSignedURLs?: boolean; customMetadata?: Record<string, any> }
  ): Promise<CloudflareImageUploadResult> {
    const config = this.getConfig();

    const formData = new FormData();
    formData.append('file', buffer, filename);

    if (metadata?.requireSignedURLs !== undefined) {
      formData.append('requireSignedURLs', metadata.requireSignedURLs.toString());
    }

    if (metadata?.customMetadata) {
      formData.append('metadata', JSON.stringify(metadata.customMetadata));
    }

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/images/v1`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiToken}`,
            ...formData.getHeaders(),
          },
          body: formData as any,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cloudflare Images API error: ${response.status} ${errorText}`);
      }

      const result = await response.json() as { result: CloudflareImageUploadResult; success: boolean; errors: any[] };

      if (!result.success || !result.result) {
        throw new Error(`Cloudflare Images upload failed: ${JSON.stringify(result.errors)}`);
      }

      // Construct full URL with variant
      const imageId = result.result.id;
      const variant = config.variant || 'public';
      const accountHash = config.accountId;
      const fullUrl = `https://imagedelivery.net/${accountHash}/${imageId}/${variant}`;

      return {
        ...result.result,
        url: fullUrl,
      };
    } catch (error) {
      console.error('Cloudflare Images upload error:', error);
      throw error;
    }
  }

  /**
   * Delete image from Cloudflare Images
   * @param imageId - Cloudflare image ID
   */
  static async deleteImage(imageId: string): Promise<void> {
    const config = this.getConfig();

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/images/v1/${imageId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${config.apiToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cloudflare Images delete error: ${response.status} ${errorText}`);
      }

      const result = await response.json() as { success: boolean; errors: any[] };

      if (!result.success) {
        throw new Error(`Cloudflare Images delete failed: ${JSON.stringify(result.errors)}`);
      }
    } catch (error) {
      console.error('Cloudflare Images delete error:', error);
      throw error;
    }
  }

  /**
   * Get image URL with variant
   * @param imageId - Cloudflare image ID
   * @param variant - Variant name (default: 'public')
   * @returns Full image URL
   */
  static getImageUrl(imageId: string, variant?: string): string {
    const config = this.getConfig();
    const variantName = variant || config.variant || 'public';
    return `https://imagedelivery.net/${config.accountId}/${imageId}/${variantName}`;
  }
}

