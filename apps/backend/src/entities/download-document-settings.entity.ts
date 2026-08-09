import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { DownloadTab } from './download-tab.entity';
import { EventDocument } from './event-document.entity';

@Entity('download_document_settings')
export class DownloadDocumentSettings {
  @PrimaryColumn({ name: 'download_tab_id', type: 'uuid' })
  downloadTabId!: string;
  @PrimaryColumn({ name: 'document_id', type: 'uuid' }) documentId!: string;
  @Column({ name: 'event_site_id', type: 'uuid' }) eventSiteId!: string;
  @Column({ name: 'is_visible', default: true }) isVisible!: boolean;
  @Column({ name: 'label_override', default: '' }) labelOverride!: string;
  @Column({ name: 'sort_order', type: 'int', default: 0 }) sortOrder!: number;
  @ManyToOne(() => DownloadTab, (tab) => tab.documentSettings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([
    { name: 'download_tab_id', referencedColumnName: 'id' },
    { name: 'event_site_id', referencedColumnName: 'eventSiteId' },
  ])
  downloadTab!: DownloadTab;
  @ManyToOne(() => EventDocument, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'document_id', referencedColumnName: 'id' },
    { name: 'event_site_id', referencedColumnName: 'eventSiteId' },
  ])
  document!: EventDocument;
}
