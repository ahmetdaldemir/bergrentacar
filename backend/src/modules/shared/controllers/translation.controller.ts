import { Request, Response } from 'express';
import { TranslationService, TranslateRequest, TranslateMultipleRequest } from '../services/translation.service';
import { asyncHandler, sendSuccess, ValidationError } from '../../../utils/errors';

export class TranslationController {
  static translate = asyncHandler(async (req: Request, res: Response) => {
    const { text, targetLanguageCode, sourceLanguageCode }: TranslateRequest = req.body;
    if (!text || !targetLanguageCode) throw new ValidationError('text and targetLanguageCode are required');
    const translated = await TranslationService.translateText({ text, targetLanguageCode, sourceLanguageCode });
    sendSuccess(res, { translated });
  });

  static translateMultiple = asyncHandler(async (req: Request, res: Response) => {
    const { texts, targetLanguageCode, sourceLanguageCode }: TranslateMultipleRequest = req.body;
    if (!texts || !Array.isArray(texts) || texts.length === 0 || !targetLanguageCode) {
      throw new ValidationError('texts (array) and targetLanguageCode are required');
    }
    const translated = await TranslationService.translateMultiple({ texts, targetLanguageCode, sourceLanguageCode });
    sendSuccess(res, { translated });
  });
}

