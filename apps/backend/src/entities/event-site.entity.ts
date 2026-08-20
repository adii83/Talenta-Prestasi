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
  VersionColumn,
} from 'typeorm';
import { Organization } from './organization.entity';
import { CompetitionCategory } from './competition-category.entity';
import { MediaAsset } from './media-asset.entity';
import { SiteSettings } from './site-settings.entity';
import { AuditLog } from './audit-log.entity';
import { EventDocument } from './event-document.entity';
import { WinnerCategory } from './winner-category.entity';
import { EventDetailSettings } from './event-detail-settings.entity';
import { EventPublication } from './event-publication.entity';

@Entity('event_sites')
@Index('uq_event_slug_per_category', ['categoryId', 'slug'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
@Index('uq_active_event_per_category', ['categoryId'], {
  unique: true,
  where: '"is_active" = true AND "deleted_at" IS NULL',
})
export class EventSite {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column()
  name!: string;

  @Column({ length: 100 })
  slug!: string;

  @Column({ name: 'period_year', type: 'int', nullable: true })
  periodYear!: number | null;

  @Column({ name: 'batch_number', type: 'int', nullable: true })
  batchNumber!: number | null;

  @Column({ name: 'batch_label', type: 'varchar', length: 40, nullable: true })
  batchLabel!: string | null;

  @Column({ name: 'batch_note', length: 240, default: '' })
  batchNote!: string;

  @Column({ name: 'activated_at', type: 'timestamptz', nullable: true })
  activatedAt!: Date | null;

  @Column({ name: 'is_active', default: false })
  isActive!: boolean;

  @Column({ default: 'active' })
  status!: string; // active | suspended

  @Column({ name: 'mascot_asset_id', type: 'uuid', nullable: true })
  mascotAssetId!: string | null;

  @Column({ name: 'logo_asset_id', type: 'uuid', nullable: true })
  logoAssetId!: string | null;

  @Column({ name: 'fallback_icon', default: 'graduation-cap' })
  fallbackIcon!: string;

  @Column({ type: 'text', default: '' })
  description!: string;

  @VersionColumn({ default: 1 })
  version!: number;

  @Column({ name: 'workspace_revision', type: 'integer', default: 1 })
  workspaceRevision!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  @ManyToOne(() => CompetitionCategory, (c) => c.events, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'category_id' })
  category!: CompetitionCategory;

  @ManyToOne(() => Organization, (o) => o.eventSites, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @ManyToOne(() => MediaAsset, { nullable: true })
  @JoinColumn({ name: 'mascot_asset_id' })
  mascotAsset!: MediaAsset | null;

  @ManyToOne(() => MediaAsset, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'logo_asset_id' })
  logoAsset!: MediaAsset | null;

  @OneToOne(() => SiteSettings, (s) => s.eventSite, { cascade: true })
  settings!: SiteSettings;

  @OneToMany(() => AuditLog, (a) => a.eventSite)
  auditLogs!: AuditLog[];

  @OneToMany(() => EventDocument, (d) => d.eventSite)
  documents!: EventDocument[];

  @OneToMany(() => WinnerCategory, (c) => c.eventSite)
  winnerCategories!: WinnerCategory[];

  @OneToOne(() => EventDetailSettings, (s) => s.eventSite, { cascade: true })
  detailSettings!: EventDetailSettings;

  @OneToOne(() => EventPublication, (p) => p.eventSite)
  publication!: EventPublication | null;
}
