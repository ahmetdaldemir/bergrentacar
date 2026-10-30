import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Survey } from './survey.entity';

export enum QuestionType {
  TEXT = 'text', // Kısa metin
  TEXTAREA = 'textarea', // Uzun metin
  RADIO = 'radio', // Tek seçim
  CHECKBOX = 'checkbox', // Çoklu seçim
  RATING = 'rating', // 1-5 yıldız
  YESNO = 'yesno', // Evet/Hayır
}

@Entity({ name: 'survey_questions' })
export class SurveyQuestion extends BaseEntity {
  @ManyToOne(() => Survey, (survey) => survey.questions, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'survey_id' })
  survey!: Survey;

  @Column({ name: 'survey_id' })
  surveyId!: string;

  @Column({ type: 'enum', enum: QuestionType })
  type!: QuestionType;

  @Column({ length: 500 })
  question!: string; // Soru metni

  @Column({ type: 'text', nullable: true })
  description?: string; // Soru açıklaması

  @Column({ type: 'jsonb', nullable: true })
  options?: string[]; // Radio veya Checkbox için seçenekler

  @Column({ name: 'is_required', default: false })
  isRequired!: boolean; // Zorunlu mu?

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number; // Sıralama
}

