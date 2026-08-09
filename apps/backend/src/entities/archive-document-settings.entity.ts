import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { EventDetailSettings } from './event-detail-settings.entity';
import { EventDocument } from './event-document.entity';

@Entity('archive_document_settings')
export class ArchiveDocumentSettings {
  @PrimaryColumn({ name: 'event_site_id', type: 'uuid' })
  eventSiteId!: string;

  @PrimaryColumn({ name: 'document_id', type: 'uuid' })
  documentId!: string;

  @Column({ name: 'is_visible', default: true })
  isVisible!: boolean;

  @Column({ name: 'label_override', default: '' })
  labelOverride!: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @ManyToOne(() => EventDetailSettings, (s) => s.documentSettings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'event_site_id' })
  detailSettings!: EventDetailSettings;

  @ManyToOne(() => EventDocument, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'document_id', referencedColumnName: 'id' },
    { name: 'event_site_id', referencedColumnName: 'eventSiteId' },
  ])
  document!: EventDocument;
}
