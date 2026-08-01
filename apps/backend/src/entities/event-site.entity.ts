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
} from 'typeorm';
import { Organization } from './organization.entity';
import { MediaAsset } from './media-asset.entity';
import { SiteDomain } from './site-domain.entity';
import { SiteSettings } from './site-settings.entity';
import { AuditLog } from './audit-log.entity';

@Entity('event_sites')
@Index('uq_site_slug_per_org', ['organizationId', 'slug'], { unique: true })
export class EventSite {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column()
  name!: string;

  @Column()
  slug!: string;

  @Column({ name: 'organizer_name', default: '' })
  organizerName!: string;

  @Column({ name: 'logo_asset_id', type: 'uuid', nullable: true })
  logoAssetId!: string | null;

  @Column({ default: 'active' })
  status!: string; // active | suspended

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  @ManyToOne(() => Organization, (o) => o.eventSites, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @ManyToOne(() => MediaAsset, { nullable: true })
  @JoinColumn({ name: 'logo_asset_id' })
  logoAsset!: MediaAsset | null;

  @OneToMany(() => SiteDomain, (d) => d.eventSite)
  domains!: SiteDomain[];

  @OneToOne(() => SiteSettings, (s) => s.eventSite, { cascade: true })
  settings!: SiteSettings;

  @OneToMany(() => AuditLog, (a) => a.eventSite)
  auditLogs!: AuditLog[];
}
