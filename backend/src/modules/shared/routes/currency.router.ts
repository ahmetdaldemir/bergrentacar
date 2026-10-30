import { Router } from 'express';
import { CurrencyController } from '../controllers/currency.controller';
import { publicApiResponseCache } from '../../../middleware/api-public-response-cache.middleware';

const router = Router();

router.get(
  '/',
  publicApiResponseCache({ routeKey: 'currencies:list', queryKeys: [] }),
  CurrencyController.list,
);
router.post('/', CurrencyController.create);
router.put('/:id', CurrencyController.update);
router.delete('/:id', CurrencyController.remove);
router.put('/:code/rate', CurrencyController.updateRate);
router.post('/update-rates', CurrencyController.updateRates);
router.post('/:code/update-rate', CurrencyController.updateSingleRate);

export default router;

