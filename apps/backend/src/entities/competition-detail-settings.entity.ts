import {
  Entity,
  PrimaryColumn,
  Column,
  OneToOne,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Competition } from './competition.entity';
import { CompetitionDocument } from './competition-document.entity';
import { ArchiveCategorySettings } from './archive-category-settings.entity';
import { ArchiveDocumentSettings } from './archive-document-settings.entity';

@Entity('competition_detail_settings')
export class CompetitionDetailSettings {
  @PrimaryColumn({ name: 'competition_id', type: 'uuid' })
  competitionId!: string;

  @Column({ name: 'decree_document_id', type: 'uuid', nullable: true })
  decreeDocumentId!: string | null;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'winners_active', default: true })
  winnersActive!: boolean;

  @Column({ name: 'documents_active', default: true })
  documentsActive!: boolean;

  @Column({ name: 'metadata_visibility', type: 'jsonb', default: {} })
  metadataVisibility!: Record<string, boolean>;

  @OneToOne(() => Competition, (c) => c.detailSettings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'competition_id' })
  competition!: Competition;

  @ManyToOne(() => CompetitionDocument, { nullable: true })
  @JoinColumn([
    { name: 'decree_document_id', referencedColumnName: 'id' },
    { name: 'competition_id', referencedColumnName: 'competitionId' },
  ])
  decreeDocument!: CompetitionDocument | null;

  @OneToMany(() => ArchiveCategorySettings, (s) => s.detailSettings)
  categorySettings!: ArchiveCategorySettings[];

  @OneToMany(() => ArchiveDocumentSettings, (s) => s.detailSettings)
  documentSettings!: ArchiveDocumentSettings[];
}
