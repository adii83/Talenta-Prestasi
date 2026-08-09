import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CompetitionCategory } from './competition-category.entity';

@Entity('site_domains')
export class SiteDomain {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId!: string;

  @Index({ unique: true })
  @Column()
  hostname!: string;

  @Column({ name: 'is_primary', default: false })
  isPrimary!: boolean;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt!: Date | null;

  @ManyToOne(() => CompetitionCategory, (c) => c.domains, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'category_id' })
  category!: CompetitionCategory;
}
