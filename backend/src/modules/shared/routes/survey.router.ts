import { Router } from 'express';
import { SurveyController } from '../controllers/survey.controller';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';

const router = Router();

// Survey CRUD
router.get('/', SurveyController.list);
router.get('/:id', SurveyController.getById);
router.post('/', authenticate, authorize(Permission.SURVEY_CREATE), SurveyController.create);
router.put('/:id', authenticate, authorize(Permission.SURVEY_UPDATE), SurveyController.update);
router.delete('/:id', authenticate, authorize(Permission.SURVEY_DELETE), SurveyController.delete);

// Question management
router.post('/:surveyId/questions', authenticate, authorize(Permission.SURVEY_UPDATE), SurveyController.addQuestion);
router.put('/questions/:id', authenticate, authorize(Permission.SURVEY_UPDATE), SurveyController.updateQuestion);
router.delete('/questions/:id', authenticate, authorize(Permission.SURVEY_UPDATE), SurveyController.deleteQuestion);

// Response management
router.post('/responses', SurveyController.submitResponse);
router.get('/:surveyId/responses', authenticate, authorize(Permission.SURVEY_VIEW), SurveyController.getResponses);
router.get('/reservations/:reservationId/responses', authenticate, authorize(Permission.SURVEY_VIEW), SurveyController.getResponsesByReservation);

export default router;

