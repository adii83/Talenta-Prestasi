import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { HomeSection } from './home-section.entity';
@Entity('pricing_packages')
export class PricingPackage {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'section_id', type: 'uuid' }) sectionId!: string;
  @Column() name!: string;
  @Column({ type: 'bigint' }) amount!: string;
  @Column({ default: 'IDR' }) currency!: string;
  @Column({ name: 'unit_label', default: '' }) unitLabel!: string;
  @Column({ default: false }) featured!: boolean;
  @Column({ name: 'sort_order', type: 'int', default: 0 }) sortOrder!: number;
  @ManyToOne(() => HomeSection, (section) => section.pricingPackages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'section_id' })
  section!: HomeSection;
}
