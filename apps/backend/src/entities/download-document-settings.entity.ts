import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { DownloadCompetition } from './download-competition.entity';
import { CompetitionDocument } from './competition-document.entity';

@Entity('download_document_settings')
export class DownloadDocumentSettings {
  @PrimaryColumn({ name: 'download_competition_id', type: 'uuid' })
  downloadCompetitionId!: string;
  @PrimaryColumn({ name: 'document_id', type: 'uuid' }) documentId!: string;
  @Column({ name: 'competition_id', type: 'uuid' }) competitionId!: string;
  @Column({ name: 'is_visible', default: true }) isVisible!: boolean;
  @Column({ name: 'label_override', default: '' }) labelOverride!: string;
  @Column({ name: 'sort_order', type: 'int', default: 0 }) sortOrder!: number;
  @ManyToOne(
    () => DownloadCompetition,
    (download) => download.documentSettings,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn([
    { name: 'download_competition_id', referencedColumnName: 'id' },
    { name: 'competition_id', referencedColumnName: 'competitionId' },
  ])
  downloadCompetition!: DownloadCompetition;
  @ManyToOne(() => CompetitionDocument, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'document_id', referencedColumnName: 'id' },
    { name: 'competition_id', referencedColumnName: 'competitionId' },
  ])
  document!: CompetitionDocument;
}
