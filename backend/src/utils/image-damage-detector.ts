import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

export interface DamageDetectionResult {
  damageProbability: number; // 0-100
  confidenceScore: number; // 0-100
  damagedAreas: Array<{
    x: number; // 0-1 normalized
    y: number; // 0-1 normalized
    width: number; // 0-1 normalized
    height: number; // 0-1 normalized
    confidence: number; // 0-100
    type?: string;
  }>;
  differenceImageBuffer?: Buffer;
  processingMetadata: {
    pixelDifference: number;
    edgeDifference: number;
    processingTime: number;
    imageDimensions: {
      width: number;
      height: number;
    };
  };
}

/**
 * Compare two images and detect potential damage
 * Uses image diff, edge detection, and pixel comparison
 */
export async function detectVehicleDamage(
  checkinImagePath: string,
  checkoutImagePath: string,
  outputDiffPath?: string
): Promise<DamageDetectionResult> {
  const startTime = Date.now();

  // Load and normalize images to same size
  const checkinImage = sharp(checkinImagePath);
  const checkoutImage = sharp(checkoutImagePath);

  const checkinMeta = await checkinImage.metadata();
  const checkoutMeta = await checkoutImage.metadata();

  // Use the smaller dimensions to ensure both images are same size
  const targetWidth = Math.min(checkinMeta.width || 800, checkoutMeta.width || 800);
  const targetHeight = Math.min(checkinMeta.height || 600, checkoutMeta.height || 600);

  // Resize both images to same dimensions
  const checkinBuffer = await checkinImage
    .resize(targetWidth, targetHeight, { fit: 'cover' })
    .greyscale()
    .raw()
    .toBuffer();

  const checkoutBuffer = await checkoutImage
    .resize(targetWidth, targetHeight, { fit: 'cover' })
    .greyscale()
    .raw()
    .toBuffer();

  // 1. Pixel-by-pixel comparison
  const pixelDifference = calculatePixelDifference(checkinBuffer, checkoutBuffer, targetWidth, targetHeight);

  // 2. Edge detection comparison
  const edgeDifference = await calculateEdgeDifference(checkinImagePath, checkoutImagePath, targetWidth, targetHeight);

  // 3. Generate difference overlay
  const differenceBuffer = await generateDifferenceOverlay(
    checkinImagePath,
    checkoutImagePath,
    targetWidth,
    targetHeight
  );

  // Save difference image if path provided
  if (outputDiffPath && differenceBuffer) {
    const outputDir = path.dirname(outputDiffPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    await sharp(differenceBuffer).jpeg({ quality: 90 }).toFile(outputDiffPath);
  }

  // 4. Detect damage regions (clusters of differences)
  const damagedAreas = detectDamageRegions(
    checkinBuffer,
    checkoutBuffer,
    targetWidth,
    targetHeight,
    pixelDifference
  );

  // 5. Calculate damage probability (weighted combination)
  // Higher pixel difference and edge difference = higher probability
  const damageProbability = Math.min(100, (pixelDifference * 0.6 + edgeDifference * 0.4));

  // 6. Calculate confidence score
  // Higher when both methods agree, lower when they disagree
  const methodAgreement = 1 - Math.abs(pixelDifference - edgeDifference) / 100;
  const confidenceScore = Math.min(100, (damageProbability * methodAgreement));

  const processingTime = Date.now() - startTime;

  return {
    damageProbability: Math.round(damageProbability * 100) / 100,
    confidenceScore: Math.round(confidenceScore * 100) / 100,
    damagedAreas,
    differenceImageBuffer: differenceBuffer,
    processingMetadata: {
      pixelDifference: Math.round(pixelDifference * 100) / 100,
      edgeDifference: Math.round(edgeDifference * 100) / 100,
      processingTime,
      imageDimensions: {
        width: targetWidth,
        height: targetHeight,
      },
    },
  };
}

/**
 * Calculate pixel difference percentage
 */
function calculatePixelDifference(
  buffer1: Buffer,
  buffer2: Buffer,
  width: number,
  height: number
): number {
  if (buffer1.length !== buffer2.length) {
    return 100; // Completely different if sizes don't match
  }

  const threshold = 20; // Pixel difference threshold (0-255)
  let differentPixels = 0;
  const totalPixels = width * height;

  for (let i = 0; i < buffer1.length; i++) {
    const diff = Math.abs(buffer1[i] - buffer2[i]);
    if (diff > threshold) {
      differentPixels++;
    }
  }

  return (differentPixels / totalPixels) * 100;
}

/**
 * Calculate edge difference using Sobel edge detection
 */
async function calculateEdgeDifference(
  image1Path: string,
  image2Path: string,
  width: number,
  height: number
): Promise<number> {
  try {
    // Apply Sobel edge detection to both images
    const edges1 = await sharp(image1Path)
      .resize(width, height, { fit: 'cover' })
      .greyscale()
      .convolve({
        width: 3,
        height: 3,
        kernel: [-1, -2, -1, 0, 0, 0, 1, 2, 1], // Sobel X
      })
      .raw()
      .toBuffer();

    const edges2 = await sharp(image2Path)
      .resize(width, height, { fit: 'cover' })
      .greyscale()
      .convolve({
        width: 3,
        height: 3,
        kernel: [-1, -2, -1, 0, 0, 0, 1, 2, 1], // Sobel X
      })
      .raw()
      .toBuffer();

    // Compare edge differences
    const threshold = 15;
    let differentEdges = 0;
    const totalPixels = width * height;

    for (let i = 0; i < edges1.length; i++) {
      const diff = Math.abs(edges1[i] - edges2[i]);
      if (diff > threshold) {
        differentEdges++;
      }
    }

    return (differentEdges / totalPixels) * 100;
  } catch (error) {
    console.error('Edge detection error:', error);
    return 0;
  }
}

/**
 * Generate difference overlay image (highlights differences in red)
 */
async function generateDifferenceOverlay(
  image1Path: string,
  image2Path: string,
  width: number,
  height: number
): Promise<Buffer | undefined> {
  try {
    // Create difference image
    const diffImage = await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: await sharp(image1Path).resize(width, height, { fit: 'cover' }).toBuffer(),
          blend: 'difference',
        },
        {
          input: await sharp(image2Path).resize(width, height, { fit: 'cover' }).toBuffer(),
          blend: 'difference',
        },
      ])
      .jpeg({ quality: 90 })
      .toBuffer();

    return diffImage;
  } catch (error) {
    console.error('Difference overlay generation error:', error);
    return undefined;
  }
}

/**
 * Detect damage regions by clustering different pixels
 */
function detectDamageRegions(
  buffer1: Buffer,
  buffer2: Buffer,
  width: number,
  height: number,
  overallDifference: number
): Array<{
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  type?: string;
}> {
  const regions: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
    type?: string;
  }> = [];

  if (overallDifference < 1) {
    // No significant difference
    return regions;
  }

  const threshold = 20;
  const clusterSize = 10; // Minimum pixels to form a region
  const visited = new Set<number>();

  // Find clusters of different pixels
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      if (visited.has(index)) continue;

      const diff = Math.abs(buffer1[index] - buffer2[index]);
      if (diff > threshold) {
        // Found a different pixel, try to form a cluster
        const cluster = floodFill(buffer1, buffer2, width, height, x, y, threshold, visited);
        
        if (cluster.pixels.length >= clusterSize) {
          // Calculate bounding box
          const minX = Math.min(...cluster.pixels.map(p => p.x));
          const maxX = Math.max(...cluster.pixels.map(p => p.x));
          const minY = Math.min(...cluster.pixels.map(p => p.y));
          const maxY = Math.max(...cluster.pixels.map(p => p.y));

          // Normalize coordinates (0-1)
          const region = {
            x: minX / width,
            y: minY / height,
            width: (maxX - minX) / width,
            height: (maxY - minY) / height,
            confidence: Math.min(100, (cluster.avgDiff / 255) * 100),
            type: cluster.avgDiff > 100 ? 'dent' : cluster.avgDiff > 50 ? 'scratch' : 'other',
          };

          regions.push(region);
        }
      }
    }
  }

  return regions;
}

/**
 * Flood fill algorithm to find connected regions
 */
function floodFill(
  buffer1: Buffer,
  buffer2: Buffer,
  width: number,
  height: number,
  startX: number,
  startY: number,
  threshold: number,
  visited: Set<number>
): { pixels: Array<{ x: number; y: number }>; avgDiff: number } {
  const pixels: Array<{ x: number; y: number }> = [];
  let totalDiff = 0;
  const stack: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];

  while (stack.length > 0) {
    const { x, y } = stack.pop()!;
    const index = y * width + x;

    if (x < 0 || x >= width || y < 0 || y >= height || visited.has(index)) {
      continue;
    }

    const diff = Math.abs(buffer1[index] - buffer2[index]);
    if (diff <= threshold) {
      continue;
    }

    visited.add(index);
    pixels.push({ x, y });
    totalDiff += diff;

    // Check neighbors
    stack.push({ x: x + 1, y });
    stack.push({ x: x - 1, y });
    stack.push({ x, y: y + 1 });
    stack.push({ x, y: y - 1 });
  }

  return {
    pixels,
    avgDiff: pixels.length > 0 ? totalDiff / pixels.length : 0,
  };
}

