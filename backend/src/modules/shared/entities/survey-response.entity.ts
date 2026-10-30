import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Survey } from './survey.entity';
import { Reservation } from './reservation.entity';
import { SurveyQuestion } from './survey-question.entity';

@Entity({ name: 'survey_responses' })
export class SurveyResponse extends BaseEntity {
  @ManyToOne(() => Survey, { nullable: false })
  @JoinColumn({ name: 'survey_id' })
  survey!: Survey;

  @Column({ name: 'survey_id' })
  surveyId!: string;

  @ManyToOne(() => Reservation, { nullable: true })
  @JoinColumn({ name: 'reservation_id' })
  reservation?: Reservation | null;

  @Column({ name: 'reservation_id', nullable: true })
  reservationId?: string | null;

  @ManyToOne(() => SurveyQuestion, { nullable: false })
  @JoinColumn({ name: 'question_id' })
  question!: SurveyQuestion;

  @Column({ name: 'question_id' })
  questionId!: string;

  @Column({ type: 'text', nullable: true })
  answer?: string; // Cevap (text, textarea, radio, checkbox, yesno için)

  @Column({ name: 'answer_number', type: 'int', nullable: true })
  answerNumber?: number; // Rating için sayısal değer (1-5)

  @Column({ type: 'jsonb', nullable: true })
  answerArray?: string[]; // Checkbox için çoklu cevap

  @Column({ name: 'customer_email', length: 200, nullable: true })
  customerEmail?: string; // Müşteri e-postası

  @Column({ name: 'customer_name', length: 200, nullable: true })
  customerName?: string; // Müşteri adı

  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submittedAt?: Date; // Gönderim tarihi
}

