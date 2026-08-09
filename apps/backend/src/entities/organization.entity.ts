import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { OrganizationMembership } from './organization-membership.entity';
import { EventSite } from './event-site.entity';
import { CompetitionCategory } from './competition-category.entity';
import { MediaAsset } from './media-asset.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Index({ unique: true })
  @Column()
  slug!: string;

  @Column({ default: 'active' })
  status!: string; // active | suspended

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  @OneToMany(() => OrganizationMembership, (m) => m.organization)
  memberships!: OrganizationMembership[];

  @OneToMany(() => CompetitionCategory, (c) => c.organization)
  categories!: CompetitionCategory[];

  @OneToMany(() => EventSite, (s) => s.organization)
  eventSites!: EventSite[];

  @OneToMany(() => MediaAsset, (a) => a.organization)
  mediaAssets!: MediaAsset[];
}
