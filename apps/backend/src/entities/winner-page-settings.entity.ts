import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { EventSite } from './event-site.entity';

@Entity('winner_page_settings')
export class WinnerPageSettings {
  @PrimaryColumn({ name: 'event_site_id', type: 'uuid' })
  eventSiteId!: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'show_decree', default: true })
  showDecree!: boolean;

  @Column({ name: 'metadata_visibility', type: 'jsonb', default: {} })
  metadataVisibility!: Record<string, boolean>;

  @Column({ name: 'archive_active', default: true })
  archiveActive!: boolean;

  @Column({ name: 'archive_limit', type: 'int', default: 3 })
  archiveLimit!: number;

  @OneToOne(() => EventSite, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_site_id' })
  eventSite!: EventSite;
}
