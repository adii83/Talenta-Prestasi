import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { CompetitionCategory } from './competition-category.entity';
import { EventSite } from './event-site.entity';
import { Organization } from './organization.entity';
import { User } from './user.entity';

@Entity('event_publications')
export class EventPublication {
  @PrimaryColumn({ name: 'event_site_id', type: 'uuid' })
  eventSiteId!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId!: string;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @Column({ name: 'schema_version', type: 'int', default: 1 })
  schemaVersion!: number;

  @Column({ name: 'public_snapshot', type: 'jsonb' })
  publicSnapshot!: Record<string, unknown>;

  @Column({ name: 'workspace_snapshot', type: 'jsonb' })
  workspaceSnapshot!: Record<string, unknown>;

  @Column({ name: 'workspace_checksum', length: 64 })
  workspaceChecksum!: string;

  @Column({ name: 'published_at', type: 'timestamptz' })
  publishedAt!: Date;

  @Column({ name: 'published_by', type: 'uuid', nullable: true })
  publishedBy!: string | null;

  @OneToOne(() => EventSite, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_site_id' })
  eventSite!: EventSite;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @ManyToOne(() => CompetitionCategory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category!: CompetitionCategory;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'published_by' })
  publisher!: User | null;
}
