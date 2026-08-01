import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CompetitionDetailSettings } from './competition-detail-settings.entity';
import { CompetitionDocument } from './competition-document.entity';

@Entity('archive_document_settings')
export class ArchiveDocumentSettings {
  @PrimaryColumn({ name: 'competition_id', type: 'uuid' })
  competitionId!: string;

  @PrimaryColumn({ name: 'document_id', type: 'uuid' })
  documentId!: string;

  @Column({ name: 'is_visible', default: true })
  isVisible!: boolean;

  @Column({ name: 'label_override', default: '' })
  labelOverride!: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @ManyToOne(() => CompetitionDetailSettings, (s) => s.documentSettings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'competition_id' })
  detailSettings!: CompetitionDetailSettings;

  @ManyToOne(() => CompetitionDocument, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'document_id', referencedColumnName: 'id' },
    { name: 'competition_id', referencedColumnName: 'competitionId' },
  ])
  document!: CompetitionDocument;
}
