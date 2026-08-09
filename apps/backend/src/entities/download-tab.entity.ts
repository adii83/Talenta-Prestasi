import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { EventSite } from './event-site.entity';
import { DownloadDocumentSettings } from './download-document-settings.entity';

// ponytail: was DownloadCompetition bridging EventSite↔Competition.
// Now simplified: each tab references documents from the same event.
// If multi-event download tabs needed later, add sourceEventSiteId FK.
@Entity('download_tabs')
@Unique('uq_download_tab_owner', ['id', 'eventSiteId'])
@Index('uq_default_download_per_event', ['eventSiteId'], {
  unique: true,
  where: '"is_default" = true',
})
export class DownloadTab {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'event_site_id', type: 'uuid' }) eventSiteId!: string;
  @Column({ name: 'custom_tab_name', default: '' }) customTabName!: string;
  @Column({ name: 'is_default', default: false }) isDefault!: boolean;
  @Column({ name: 'is_active', default: true }) isActive!: boolean;
  @Column({ name: 'sort_order', type: 'int', default: 0 }) sortOrder!: number;
  @ManyToOne(() => EventSite, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_site_id' })
  eventSite!: EventSite;
  @OneToMany(() => DownloadDocumentSettings, (item) => item.downloadTab)
  documentSettings!: DownloadDocumentSettings[];
}
