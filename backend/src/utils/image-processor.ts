import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

/**
 * Process image: resize and convert to 72 DPI
 * @param inputPath - Source image path
 * @param outputPath - Destination image path
 * @returns Processed image metadata
 */
export async function processImageTo72DPI(
  inputPath: string,
  outputPath: string
): Promise<{ width: number; height: number; size: number }> {
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Get original image metadata
  const metadata = await sharp(inputPath).metadata();

  // Process image: convert to JPEG and set DPI to 72
  // Note: DPI/PPI is metadata, actual pixel dimensions stay the same
  // We'll optimize the image quality and ensure it's web-ready
  await sharp(inputPath)
    .jpeg({ quality: 85, mozjpeg: true }) // Convert to JPEG with good quality
    .withMetadata({
      // Set DPI metadata to 72
      density: 72,
    })
    .toFile(outputPath);

  // Get processed image metadata
  const processedMetadata = await sharp(outputPath).metadata();
  const stats = fs.statSync(outputPath);

  return {
    width: processedMetadata.width || 0,
    height: processedMetadata.height || 0,
    size: stats.size,
  };
}

/**
 * Process image buffer: resize and convert to 72 DPI
 * @param inputBuffer - Source image buffer
 * @returns Processed image buffer and metadata
 */
export async function processImageBufferTo72DPI(
  inputBuffer: Buffer
): Promise<{ buffer: Buffer; width: number; height: number; size: number }> {
  const processedBuffer = await sharp(inputBuffer)
    .jpeg({ quality: 85, mozjpeg: true })
    .withMetadata({
      density: 72,
    })
    .toBuffer();

  const processedMetadata = await sharp(processedBuffer).metadata();

  return {
    buffer: processedBuffer,
    width: processedMetadata.width || 0,
    height: processedMetadata.height || 0,
    size: processedBuffer.length,
  };
}

