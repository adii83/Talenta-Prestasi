import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { EventSite } from './event-site.entity';
import { MediaAsset } from './media-asset.entity';

@Entity('event_publication_assets')
export class EventPublicationAsset {
  @PrimaryColumn({ name: 'event_site_id', type: 'uuid' })
  eventSiteId!: string;

  @PrimaryColumn({ name: 'asset_id', type: 'uuid' })
  assetId!: string;

  @ManyToOne(() => EventSite, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_site_id' })
  eventSite!: EventSite;

  @ManyToOne(() => MediaAsset, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'asset_id' })
  asset!: MediaAsset;
}
