import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { EventSite } from './event-site.entity';

@Entity('page_settings')
@Unique('uq_page_settings_per_site', ['eventSiteId', 'pageType'])
export class PageSettings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'event_site_id', type: 'uuid' })
  eventSiteId!: string;

  @Column({ name: 'page_type' })
  pageType!: string; // home | download | winners | archive | faq

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ default: '' })
  eyebrow!: string;

  @Column({ default: '' })
  title!: string;

  @Column({ type: 'text', default: '' })
  description!: string;

  @Column({ default: 'center' })
  alignment!: string; // left | center

  @ManyToOne(() => EventSite, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_site_id' })
  eventSite!: EventSite;
}
