import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
} from 'typeorm';
import { EventSite } from './event-site.entity';
import { Winner } from './winner.entity';

@Entity('winner_categories')
@Unique('uq_category_owner', ['id', 'eventSiteId'])
export class WinnerCategory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'event_site_id', type: 'uuid' })
  eventSiteId!: string;

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

  @ManyToOne(() => EventSite, (e) => e.winnerCategories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'event_site_id' })
  eventSite!: EventSite;

  @OneToMany(() => Winner, (w) => w.category)
  winners!: Winner[];
}
