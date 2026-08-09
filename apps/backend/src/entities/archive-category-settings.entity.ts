import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { EventDetailSettings } from './event-detail-settings.entity';
import { WinnerCategory } from './winner-category.entity';

@Entity('archive_category_settings')
export class ArchiveCategorySettings {
  @PrimaryColumn({ name: 'event_site_id', type: 'uuid' })
  eventSiteId!: string;

  @PrimaryColumn({ name: 'category_id', type: 'uuid' })
  categoryId!: string;

  @Column({ name: 'is_visible', default: true })
  isVisible!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @ManyToOne(() => EventDetailSettings, (s) => s.categorySettings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'event_site_id' })
  detailSettings!: EventDetailSettings;

  @ManyToOne(() => WinnerCategory, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'category_id', referencedColumnName: 'id' },
    { name: 'event_site_id', referencedColumnName: 'eventSiteId' },
  ])
  category!: WinnerCategory;
}
