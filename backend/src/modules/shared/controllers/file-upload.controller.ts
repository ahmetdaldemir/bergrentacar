import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { asyncHandler, sendSuccess, ValidationError } from '../../../utils/errors';
import { getUploadsDir } from '../../../config/uploads-path';

export { getUploadsDir };

const uploadsDir = getUploadsDir();
console.log(`Uploads directory: ${uploadsDir}`);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log(`Created uploads directory in destination callback: ${uploadsDir}`);
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    const filename = `${name}-${uniqueSuffix}${ext}`;
    console.log(`Saving file: ${filename} to ${uploadsDir}`);
    cb(null, filename);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'image/x-icon', 'image/vnd.microsoft.icon',
    'video/mp4', 'video/quicktime', 'video/x-msvideo',
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Sadece resim ve video dosyaları yüklenebilir (JPEG, PNG, GIF, WebP, SVG, ICO, MP4, MOV, AVI)'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
});

export class FileUploadController {
  static uploadFile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw new ValidationError('Dosya yüklenmedi');

    const filePath = path.join(uploadsDir, req.file.filename);
    if (!fs.existsSync(filePath)) {
      throw new ValidationError('Dosya kaydedilemedi');
    }

    console.log(`File uploaded successfully: ${filePath}`);
    const fileUrl = `/uploads/${req.file.filename}`;
    const fullUrl = `${req.protocol}://${req.get('host')}${fileUrl}`;

    sendSuccess(res, {
      url: fileUrl,
      fullUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  });
}
