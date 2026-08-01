import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { HomeSection } from './home-section.entity';
import { MediaAsset } from './media-asset.entity';
@Entity('partner_items')
export class PartnerItem {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'section_id', type: 'uuid' }) sectionId!: string;
  @Column({ name: 'logo_asset_id', type: 'uuid', nullable: true })
  logoAssetId!: string | null;
  @Column() name!: string;
  @Column({ name: 'target_url', default: '' }) targetUrl!: string;
  @Column({ name: 'sort_order', type: 'int', default: 0 }) sortOrder!: number;
  @ManyToOne(() => HomeSection, (section) => section.partnerItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'section_id' })
  section!: HomeSection;
  @ManyToOne(() => MediaAsset, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'logo_asset_id' })
  logoAsset!: MediaAsset | null;
}
