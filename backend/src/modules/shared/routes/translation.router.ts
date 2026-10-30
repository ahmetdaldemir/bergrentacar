import { Router } from 'express';
import { TranslationController } from '../controllers/translation.controller';

const router = Router();

// Translation endpoints are public (DeepL API key is secured on backend)
router.post('/translate', TranslationController.translate);
router.post('/translate-multiple', TranslationController.translateMultiple);

export default router;

