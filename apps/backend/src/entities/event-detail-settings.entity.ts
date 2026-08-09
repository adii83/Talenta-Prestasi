import {
  Entity,
  PrimaryColumn,
  Column,
  OneToOne,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { EventSite } from './event-site.entity';
import { EventDocument } from './event-document.entity';
import { ArchiveCategorySettings } from './archive-category-settings.entity';
import { ArchiveDocumentSettings } from './archive-document-settings.entity';

@Entity('event_detail_settings')
export class EventDetailSettings {
  @PrimaryColumn({ name: 'event_site_id', type: 'uuid' })
  eventSiteId!: string;

  @Column({ name: 'decree_document_id', type: 'uuid', nullable: true })
  decreeDocumentId!: string | null;

  @Column({ name: 'decree_title', default: 'SK Penetapan Pemenang' })
  decreeTitle!: string;

  @Column({
    name: 'decree_description',
    type: 'text',
    default:
      'Unduh dokumen resmi SK Pemenang untuk keperluan administrasi sekolah.',
  })
  decreeDescription!: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'winners_active', default: true })
  winnersActive!: boolean;

  @Column({ name: 'documents_active', default: true })
  documentsActive!: boolean;

  @Column({ name: 'metadata_visibility', type: 'jsonb', default: {} })
  metadataVisibility!: Record<string, boolean>;

  @OneToOne(() => EventSite, (e) => e.detailSettings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_site_id' })
  eventSite!: EventSite;

  @ManyToOne(() => EventDocument, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'decree_document_id' })
  decreeDocument!: EventDocument | null;

  @OneToMany(() => ArchiveCategorySettings, (s) => s.detailSettings)
  categorySettings!: ArchiveCategorySettings[];

  @OneToMany(() => ArchiveDocumentSettings, (s) => s.detailSettings)
  documentSettings!: ArchiveDocumentSettings[];
}
