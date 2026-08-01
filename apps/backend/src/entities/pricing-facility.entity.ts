import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { HomeSection } from './home-section.entity';
@Entity('pricing_facilities')
export class PricingFacility {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'section_id', type: 'uuid' }) sectionId!: string;
  @Column() label!: string;
  @Column({ name: 'is_active', default: true }) isActive!: boolean;
  @Column({ name: 'sort_order', type: 'int', default: 0 }) sortOrder!: number;
  @ManyToOne(() => HomeSection, (section) => section.pricingFacilities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'section_id' })
  section!: HomeSection;
}
