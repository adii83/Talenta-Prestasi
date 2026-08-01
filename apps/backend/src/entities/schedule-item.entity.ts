import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { HomeSection } from './home-section.entity';
@Entity('schedule_items')
export class ScheduleItem {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'section_id', type: 'uuid' }) sectionId!: string;
  @Column() label!: string;
  @Column({ name: 'date_label' }) dateLabel!: string;
  @Column({ type: 'text', default: '' }) description!: string;
  @Column({ name: 'sort_order', type: 'int', default: 0 }) sortOrder!: number;
  @ManyToOne(() => HomeSection, (section) => section.scheduleItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'section_id' })
  section!: HomeSection;
}
