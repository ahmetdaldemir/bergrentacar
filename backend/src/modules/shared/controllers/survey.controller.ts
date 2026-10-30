import { Response } from 'express';
import { SurveyService } from '../services/survey.service';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { asyncHandler, sendSuccess, ValidationError, UnauthorizedError, NotFoundError } from '../../../utils/errors';

export class SurveyController {
  static list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const surveys = await SurveyService.list(tenantId);
    sendSuccess(res, surveys);
  });

  static getById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const survey = await SurveyService.getById(id);
    if (!survey) throw new NotFoundError('Survey', id);
    sendSuccess(res, survey);
  });

  static create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    const { title, description, status, isActive, autoSend, sendAfterDays, emailSubject, emailTemplate, questions } = req.body;
    if (!tenantId || !title) throw new ValidationError('Authentication required and title is required');
    const survey = await SurveyService.create({ tenantId, title, description, status, isActive, autoSend, sendAfterDays, emailSubject, emailTemplate, questions });
    sendSuccess(res, survey, 201);
  });

  static update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { title, description, status, isActive, autoSend, sendAfterDays, emailSubject, emailTemplate } = req.body as any;
    const survey = await SurveyService.update(id, { title, description, status, isActive, autoSend, sendAfterDays, emailSubject, emailTemplate });
    sendSuccess(res, survey);
  });

  static delete = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    await SurveyService.delete(id);
    res.status(204).send();
  });

  static addQuestion = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { surveyId } = req.params;
    const { type, question, description, options, isRequired, sortOrder } = req.body as any;
    if (!type || !question) throw new ValidationError('type and question are required');
    const questionResult = await SurveyService.addQuestion(surveyId, { type, question, description, options, isRequired, sortOrder });
    sendSuccess(res, questionResult, 201);
  });

  static updateQuestion = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { type, question, description, options, isRequired, sortOrder } = req.body as any;
    const questionResult = await SurveyService.updateQuestion(id, { type, question, description, options, isRequired, sortOrder });
    sendSuccess(res, questionResult);
  });

  static deleteQuestion = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    await SurveyService.deleteQuestion(id);
    res.status(204).send();
  });

  static submitResponse = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { surveyId, reservationId, questionId, answer, answerNumber, answerArray, customerEmail, customerName } = req.body as any;
    if (!surveyId || !questionId) throw new ValidationError('surveyId and questionId are required');
    const response = await SurveyService.submitResponse({ surveyId, reservationId, questionId, answer, answerNumber, answerArray, customerEmail, customerName });
    sendSuccess(res, response, 201);
  });

  static getResponses = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { surveyId } = req.params;
    const responses = await SurveyService.getResponses(surveyId);
    sendSuccess(res, responses);
  });

  static getResponsesByReservation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { reservationId } = req.params;
    const responses = await SurveyService.getResponsesByReservation(reservationId);
    sendSuccess(res, responses);
  });
}

