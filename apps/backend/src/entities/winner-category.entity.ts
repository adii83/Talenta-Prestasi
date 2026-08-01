import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Competition } from './competition.entity';
import { Winner } from './winner.entity';

@Entity('winner_categories')
@Unique('uq_category_owner', ['id', 'competitionId'])
export class WinnerCategory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'competition_id', type: 'uuid' })
  competitionId!: string;

  @Column({ name: 'legacy_key', type: 'varchar', nullable: true })
  legacyKey!: string | null;

  @Column()
  name!: string;

  @Column({ name: 'rank_prefix', default: 'Juara' })
  rankPrefix!: string;

  @Column({ default: 'trophy' })
  icon!: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @ManyToOne(() => Competition, (c) => c.winnerCategories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'competition_id' })
  competition!: Competition;

  @OneToMany(() => Winner, (w) => w.category)
  winners!: Winner[];
}
