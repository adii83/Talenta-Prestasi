import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  VersionColumn,
} from 'typeorm';
import { Organization } from './organization.entity';
import { MediaAsset } from './media-asset.entity';
import { EventSite } from './event-site.entity';
import { SiteDomain } from './site-domain.entity';

@Entity('competition_categories')
@Index('uq_category_slug_per_org', ['organizationId', 'slug'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class CompetitionCategory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column()
  name!: string;

  @Column({ length: 100 })
  slug!: string;

  @Column({ name: 'organizer_name', default: '' })
  organizerName!: string;

  @Column({ name: 'logo_asset_id', type: 'uuid', nullable: true })
  logoAssetId!: string | null;

  @Column({ name: 'favicon_asset_id', type: 'uuid', nullable: true })
  faviconAssetId!: string | null;

  @Column({ default: 'active' })
  status!: string; // active | suspended

  @Column({ name: 'publication_status', default: 'draft' })
  publicationStatus!: string; // draft | published | unpublished

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @VersionColumn({ default: 1 })
  version!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @ManyToOne(() => MediaAsset, { nullable: true })
  @JoinColumn({ name: 'logo_asset_id' })
  logoAsset!: MediaAsset | null;

  @ManyToOne(() => MediaAsset, { nullable: true })
  @JoinColumn({ name: 'favicon_asset_id' })
  faviconAsset!: MediaAsset | null;

  @OneToMany(() => EventSite, (e) => e.category)
  events!: EventSite[];

  @OneToMany(() => SiteDomain, (d) => d.category)
  domains!: SiteDomain[];
}
