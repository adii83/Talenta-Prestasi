import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EventSite } from './event-site.entity';
import { FaqQuestion } from './faq-question.entity';

@Entity('faq_categories')
export class FaqCategory {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'event_site_id', type: 'uuid' }) eventSiteId!: string;
  @Column() title!: string;
  @Column({ name: 'is_active', default: true }) isActive!: boolean;
  @Column({ name: 'sort_order', type: 'int', default: 0 }) sortOrder!: number;
  @ManyToOne(() => EventSite, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_site_id' })
  eventSite!: EventSite;
  @OneToMany(() => FaqQuestion, (question) => question.category)
  questions!: FaqQuestion[];
}
