import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { HomeSection } from './home-section.entity';
@Entity('hero_actions')
export class HeroAction {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'section_id', type: 'uuid' }) sectionId!: string;
  @Column() label!: string;
  @Column({ name: 'target_url' }) targetUrl!: string;
  @Column({ default: 'primary' }) style!: string;
  @Column({ name: 'new_tab', default: false }) newTab!: boolean;
  @Column({ name: 'sort_order', type: 'int', default: 0 }) sortOrder!: number;
  @ManyToOne(() => HomeSection, (section) => section.heroActions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'section_id' })
  section!: HomeSection;
}
