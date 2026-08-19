import { Entity, PrimaryColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { EventSite } from './event-site.entity';

@Entity('site_settings')
export class SiteSettings {
  @PrimaryColumn({ name: 'event_site_id', type: 'uuid' })
  eventSiteId!: string;

  @Column({ name: 'primary_color', default: '#1e4b8c' })
  primaryColor!: string;

  @Column({ name: 'navbar_logo_size', type: 'smallint', default: 36 })
  navbarLogoSize!: number;

  @Column({ type: 'jsonb', default: {} })
  navigation!: Record<string, boolean>;

  @Column({ type: 'jsonb', default: {} })
  contact!: Record<string, string>;

  @Column({ type: 'jsonb', default: {} })
  footer!: Record<string, string>;

  @Column({ type: 'jsonb', default: {} })
  seo!: Record<string, string>;

  @OneToOne(() => EventSite, (s) => s.settings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_site_id' })
  eventSite!: EventSite;
}
