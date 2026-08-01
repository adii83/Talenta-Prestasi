import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FaqCategory } from './faq-category.entity';

@Entity('faq_questions')
export class FaqQuestion {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'category_id', type: 'uuid' }) categoryId!: string;
  @Column({ type: 'text' }) question!: string;
  @Column({ type: 'text' }) answer!: string;
  @Column({ name: 'is_active', default: true }) isActive!: boolean;
  @Column({ name: 'sort_order', type: 'int', default: 0 }) sortOrder!: number;
  @ManyToOne(() => FaqCategory, (category) => category.questions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'category_id' })
  category!: FaqCategory;
}
