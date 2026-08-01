import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization } from './organization.entity';

@Entity('media_assets')
export class MediaAsset {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Index({ unique: true })
  @Column({ name: 'storage_key' })
  storageKey!: string;

  @Column({ name: 'original_name', default: '' })
  originalName!: string;

  @Column({ name: 'mime_type' })
  mimeType!: string;

  @Column({ name: 'byte_size', type: 'bigint', default: 0 })
  byteSize!: number;

  @Column({ type: 'varchar', nullable: true })
  checksum!: string | null;

  @Column({ type: 'int', nullable: true })
  width!: number | null;

  @Column({ type: 'int', nullable: true })
  height!: number | null;

  @Column({ name: 'alt_text', default: '' })
  altText!: string;

  @Column({ default: 'pending' })
  status!: string; // pending | active | deleted

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => Organization, (o) => o.mediaAssets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;
}
