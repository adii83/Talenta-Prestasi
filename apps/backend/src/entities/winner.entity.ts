import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EventSite } from './event-site.entity';
import { WinnerCategory } from './winner-category.entity';
import { MediaAsset } from './media-asset.entity';

@Entity('winners')
export class Winner {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'event_site_id', type: 'uuid' })
  eventSiteId!: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId!: string;

  @Column({ name: 'photo_asset_id', type: 'uuid', nullable: true })
  photoAssetId!: string | null;

  @Column({ name: 'legacy_key', type: 'varchar', nullable: true })
  legacyKey!: string | null;

  @Column({ name: 'rank_label', default: '' })
  rankLabel!: string;

  @Column({ name: 'full_name' })
  fullName!: string;

  @Column({ default: '' })
  school!: string;

  @Column({ name: 'exam_number', default: '' })
  examNumber!: string;

  @Column({ default: '' })
  district!: string;

  @Column({ default: '' })
  regency!: string;

  @Column({ default: '' })
  province!: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @ManyToOne(() => EventSite, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_site_id' })
  eventSite!: EventSite;

  @ManyToOne(() => WinnerCategory, (c) => c.winners, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'category_id', referencedColumnName: 'id' },
    { name: 'event_site_id', referencedColumnName: 'eventSiteId' },
  ])
  category!: WinnerCategory;

  @ManyToOne(() => MediaAsset, { nullable: true })
  @JoinColumn({ name: 'photo_asset_id' })
  photoAsset!: MediaAsset | null;
}
