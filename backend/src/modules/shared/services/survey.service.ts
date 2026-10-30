import { Repository, In } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { Survey, SurveyStatus } from '../entities/survey.entity';
import { SurveyQuestion, QuestionType } from '../entities/survey-question.entity';
import { SurveyResponse } from '../entities/survey-response.entity';

export type CreateSurveyInput = {
  tenantId: string;
  languageId?: string;
  title: string;
  description?: string;
  status?: SurveyStatus;
  isActive?: boolean;
  autoSend?: boolean;
  sendAfterDays?: number;
  emailSubject?: string;
  emailTemplate?: string;
  questions?: CreateQuestionInput[];
};

export type CreateQuestionInput = {
  type: QuestionType;
  question: string;
  description?: string;
  options?: string[];
  isRequired?: boolean;
  sortOrder?: number;
};

export type UpdateSurveyInput = Partial<CreateSurveyInput>;

export class SurveyService {
  private static surveyRepo(): Repository<Survey> {
    return AppDataSource.getRepository(Survey);
  }

  private static questionRepo(): Repository<SurveyQuestion> {
    return AppDataSource.getRepository(SurveyQuestion);
  }

  private static responseRepo(): Repository<SurveyResponse> {
    return AppDataSource.getRepository(SurveyResponse);
  }

  static async list(tenantId: string): Promise<Survey[]> {
    return this.surveyRepo().find({
      where: { tenantId },
      relations: ['questions', 'language'],
      order: { createdAt: 'DESC' },
    });
  }

  static async getById(id: string): Promise<Survey | null> {
    return this.surveyRepo().findOne({
      where: { id },
      relations: ['questions', 'language'],
    });
  }

  static async create(input: CreateSurveyInput): Promise<Survey> {
    const surveyRepo = this.surveyRepo();
    const questionRepo = this.questionRepo();

    // Create survey
    const survey = surveyRepo.create({
      tenantId: input.tenantId,
      languageId: input.languageId,
      title: input.title,
      description: input.description,
      status: input.status || SurveyStatus.DRAFT,
      isActive: input.isActive ?? true,
      autoSend: input.autoSend ?? false,
      sendAfterDays: input.sendAfterDays ?? 1,
      emailSubject: input.emailSubject,
      emailTemplate: input.emailTemplate,
    });

    const savedSurvey = await surveyRepo.save(survey);

    // Create questions if provided
    if (input.questions && input.questions.length > 0) {
      const questions = input.questions.map((q, index) =>
        questionRepo.create({
          surveyId: savedSurvey.id,
          type: q.type,
          question: q.question,
          description: q.description,
          options: q.options,
          isRequired: q.isRequired ?? false,
          sortOrder: q.sortOrder ?? index,
        })
      );

      await questionRepo.save(questions);
    }

    // Reload with relations
    const reloaded = await this.getById(savedSurvey.id);
    if (!reloaded) {
      throw new Error('Failed to reload survey after creation');
    }
    return reloaded;
  }

  static async update(id: string, input: UpdateSurveyInput): Promise<Survey> {
    const surveyRepo = this.surveyRepo();
    const survey = await surveyRepo.findOne({ where: { id } });

    if (!survey) {
      throw new Error('Survey not found');
    }

    Object.assign(survey, {
      title: input.title,
      description: input.description,
      status: input.status,
      isActive: input.isActive,
      autoSend: input.autoSend,
      sendAfterDays: input.sendAfterDays,
      emailSubject: input.emailSubject,
      emailTemplate: input.emailTemplate,
    });

    await surveyRepo.save(survey);

    const reloaded = await this.getById(id);
    if (!reloaded) {
      throw new Error('Failed to reload survey after update');
    }
    return reloaded;
  }

  static async delete(id: string): Promise<void> {
    const survey = await this.surveyRepo().findOne({ where: { id } });
    if (!survey) {
      throw new Error('Survey not found');
    }

    await this.surveyRepo().remove(survey);
  }

  // Question management
  static async addQuestion(surveyId: string, input: CreateQuestionInput): Promise<SurveyQuestion> {
    const questionRepo = this.questionRepo();
    const survey = await this.surveyRepo().findOne({ where: { id: surveyId } });

    if (!survey) {
      throw new Error('Survey not found');
    }

    // Get max sortOrder
    const existingQuestions = await questionRepo.find({
      where: { surveyId },
      order: { sortOrder: 'DESC' },
    });

    const maxSortOrder = existingQuestions.length > 0 ? existingQuestions[0].sortOrder : -1;

    const question = questionRepo.create({
      surveyId,
      type: input.type,
      question: input.question,
      description: input.description,
      options: input.options,
      isRequired: input.isRequired ?? false,
      sortOrder: maxSortOrder + 1,
    });

    return questionRepo.save(question);
  }

  static async updateQuestion(id: string, input: Partial<CreateQuestionInput>): Promise<SurveyQuestion> {
    const questionRepo = this.questionRepo();
    const question = await questionRepo.findOne({ where: { id } });

    if (!question) {
      throw new Error('Question not found');
    }

    Object.assign(question, input);
    return questionRepo.save(question);
  }

  static async deleteQuestion(id: string): Promise<void> {
    const question = await this.questionRepo().findOne({ where: { id } });
    if (!question) {
      throw new Error('Question not found');
    }

    await this.questionRepo().remove(question);
  }

  // Response management
  static async submitResponse(input: {
    surveyId: string;
    reservationId?: string;
    questionId: string;
    answer?: string;
    answerNumber?: number;
    answerArray?: string[];
    customerEmail?: string;
    customerName?: string;
  }): Promise<SurveyResponse> {
    const responseRepo = this.responseRepo();

    const response = responseRepo.create({
      surveyId: input.surveyId,
      reservationId: input.reservationId,
      questionId: input.questionId,
      answer: input.answer,
      answerNumber: input.answerNumber,
      answerArray: input.answerArray,
      customerEmail: input.customerEmail,
      customerName: input.customerName,
      submittedAt: new Date(),
    });

    return responseRepo.save(response);
  }

  static async getResponses(surveyId: string): Promise<SurveyResponse[]> {
    return this.responseRepo().find({
      where: { surveyId },
      relations: ['question', 'reservation'],
      order: { submittedAt: 'DESC' },
    });
  }

  static async getResponsesByReservation(reservationId: string): Promise<SurveyResponse[]> {
    return this.responseRepo().find({
      where: { reservationId },
      relations: ['question', 'survey'],
      order: { question: { sortOrder: 'ASC' } },
    });
  }

  // Get active surveys for auto-send
  static async getActiveAutoSendSurveys(tenantId: string, languageId?: string): Promise<Survey[]> {
    const where: any = {
      tenantId,
      isActive: true,
      autoSend: true,
      status: SurveyStatus.ACTIVE,
    };
    
    // Dil filtresi ekle
    if (languageId) {
      where.languageId = languageId;
    }

    return this.surveyRepo().find({
      where,
      relations: ['questions', 'language'],
      order: { createdAt: 'DESC' },
    });
  }
}

