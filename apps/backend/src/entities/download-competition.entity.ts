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
import { Competition } from './competition.entity';
import { DownloadDocumentSettings } from './download-document-settings.entity';

@Entity('download_competitions')
@Unique('uq_download_competition_per_site', ['eventSiteId', 'competitionId'])
@Unique('uq_download_competition_owner', ['id', 'competitionId'])
@Index('uq_default_download_per_site', ['eventSiteId'], {
  unique: true,
  where: `"is_default" = true`,
})
export class DownloadCompetition {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'event_site_id', type: 'uuid' }) eventSiteId!: string;
  @Column({ name: 'competition_id', type: 'uuid' }) competitionId!: string;
  @Column({ name: 'custom_tab_name', default: '' }) customTabName!: string;
  @Column({ name: 'is_default', default: false }) isDefault!: boolean;
  @Column({ name: 'is_active', default: true }) isActive!: boolean;
  @Column({ name: 'sort_order', type: 'int', default: 0 }) sortOrder!: number;
  @ManyToOne(() => EventSite, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_site_id' })
  eventSite!: EventSite;
  @ManyToOne(() => Competition, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'competition_id' })
  competition!: Competition;
  @OneToMany(() => DownloadDocumentSettings, (item) => item.downloadCompetition)
  documentSettings!: DownloadDocumentSettings[];
}
