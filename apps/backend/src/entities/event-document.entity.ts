import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { EventSite } from './event-site.entity';
import { MediaAsset } from './media-asset.entity';

@Entity('event_documents')
@Unique('uq_document_owner', ['id', 'eventSiteId'])
export class EventDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'event_site_id', type: 'uuid' })
  eventSiteId!: string;

  @Column({ name: 'asset_id', type: 'uuid', nullable: true })
  assetId!: string | null;

  @Column({ name: 'legacy_key', type: 'varchar', nullable: true })
  legacyKey!: string | null;

  @Column()
  title!: string;

  @Column({ default: 'Dokumen' })
  category!: string;

  @Column({ name: 'document_role', default: '' })
  documentRole!: string; // juknis | kisi-kisi | materi | pengumuman | sk

  @Column({ name: 'file_type', default: 'PDF' })
  fileType!: string;

  @Column({ name: 'display_size', default: '' })
  displaySize!: string;

  @Column({ name: 'default_download_label', default: '' })
  defaultDownloadLabel!: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @ManyToOne(() => EventSite, (e) => e.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_site_id' })
  eventSite!: EventSite;

  @ManyToOne(() => MediaAsset, { nullable: true })
  @JoinColumn({ name: 'asset_id' })
  asset!: MediaAsset | null;
}
