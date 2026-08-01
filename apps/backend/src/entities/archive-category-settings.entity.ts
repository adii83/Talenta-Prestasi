import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CompetitionDetailSettings } from './competition-detail-settings.entity';
import { WinnerCategory } from './winner-category.entity';

@Entity('archive_category_settings')
export class ArchiveCategorySettings {
  @PrimaryColumn({ name: 'competition_id', type: 'uuid' })
  competitionId!: string;

  @PrimaryColumn({ name: 'category_id', type: 'uuid' })
  categoryId!: string;

  @Column({ name: 'is_visible', default: true })
  isVisible!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @ManyToOne(() => CompetitionDetailSettings, (s) => s.categorySettings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'competition_id' })
  detailSettings!: CompetitionDetailSettings;

  @ManyToOne(() => WinnerCategory, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'category_id', referencedColumnName: 'id' },
    { name: 'competition_id', referencedColumnName: 'competitionId' },
  ])
  category!: WinnerCategory;
}
