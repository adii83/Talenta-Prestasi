import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  Index,
  Unique,
  VersionColumn,
} from 'typeorm';
import { EventSite } from './event-site.entity';
import { MediaAsset } from './media-asset.entity';
import { CompetitionDocument } from './competition-document.entity';
import { WinnerCategory } from './winner-category.entity';
import { CompetitionDetailSettings } from './competition-detail-settings.entity';

@Entity('competitions')
@Index('uq_competition_slug_per_site', ['eventSiteId', 'slug'], {
  unique: true,
})
@Index('uq_current_competition_per_site', ['eventSiteId'], {
  unique: true,
  where: `"lifecycle" = 'current' AND "deleted_at" IS NULL`,
})
@Unique('uq_competition_owner', ['id', 'eventSiteId'])
export class Competition {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'event_site_id', type: 'uuid' })
  eventSiteId!: string;

  @Column({ name: 'legacy_key', type: 'varchar', nullable: true })
  legacyKey!: string | null;

  @Column()
  name!: string;

  @Column({ name: 'short_name', default: '' })
  shortName!: string;

  @Column()
  slug!: string;

  @Column({ default: 'current' })
  lifecycle!: string; // current | archived

  @Column({ name: 'publication_status', default: 'draft' })
  publicationStatus!: string; // draft | published | disabled

  @Column({ name: 'mascot_asset_id', type: 'uuid', nullable: true })
  mascotAssetId!: string | null;

  @Column({ name: 'fallback_icon', default: 'graduation-cap' })
  fallbackIcon!: string;

  @Column({ type: 'text', default: '' })
  description!: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @VersionColumn({ default: 1 })
  version!: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  @ManyToOne(() => EventSite, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_site_id' })
  eventSite!: EventSite;

  @ManyToOne(() => MediaAsset, { nullable: true })
  @JoinColumn({ name: 'mascot_asset_id' })
  mascotAsset!: MediaAsset | null;

  @OneToMany(() => CompetitionDocument, (d) => d.competition)
  documents!: CompetitionDocument[];

  @OneToMany(() => WinnerCategory, (c) => c.competition)
  winnerCategories!: WinnerCategory[];

  @OneToOne(() => CompetitionDetailSettings, (s) => s.competition, {
    cascade: true,
  })
  detailSettings!: CompetitionDetailSettings;
}
