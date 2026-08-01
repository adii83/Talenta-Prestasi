import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { EventSite } from './event-site.entity';
import { HeroBadge } from './hero-badge.entity';
import { HeroAction } from './hero-action.entity';
import { ScheduleItem } from './schedule-item.entity';
import { PricingPackage } from './pricing-package.entity';
import { PricingFacility } from './pricing-facility.entity';
import { BenefitItem } from './benefit-item.entity';
import { PartnerItem } from './partner-item.entity';

@Entity('home_sections')
@Unique('uq_home_section_type_per_site', ['eventSiteId', 'sectionType'])
export class HomeSection {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'event_site_id', type: 'uuid' }) eventSiteId!: string;
  @Column({ name: 'section_type' }) sectionType!: string;
  @Column({ name: 'is_active', default: true }) isActive!: boolean;
  @Column({ name: 'sort_order', type: 'int', default: 0 }) sortOrder!: number;
  @Column({ type: 'jsonb', default: {} }) settings!: Record<string, unknown>;
  @ManyToOne(() => EventSite, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_site_id' })
  eventSite!: EventSite;
  @OneToMany(() => HeroBadge, (item) => item.section) heroBadges!: HeroBadge[];
  @OneToMany(() => HeroAction, (item) => item.section)
  heroActions!: HeroAction[];
  @OneToMany(() => ScheduleItem, (item) => item.section)
  scheduleItems!: ScheduleItem[];
  @OneToMany(() => PricingPackage, (item) => item.section)
  pricingPackages!: PricingPackage[];
  @OneToMany(() => PricingFacility, (item) => item.section)
  pricingFacilities!: PricingFacility[];
  @OneToMany(() => BenefitItem, (item) => item.section)
  benefitItems!: BenefitItem[];
  @OneToMany(() => PartnerItem, (item) => item.section)
  partnerItems!: PartnerItem[];
}
