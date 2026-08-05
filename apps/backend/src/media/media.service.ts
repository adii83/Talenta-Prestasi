import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DataSource, Repository } from 'typeorm';
import { MediaAsset } from '../entities/media-asset.entity';

const TYPES: Record<string, { ext: string; max: number }> = {
  'image/png': { ext: '.png', max: 5_242_880 },
  'image/jpeg': { ext: '.jpg', max: 5_242_880 },
  'image/webp': { ext: '.webp', max: 5_242_880 },
  'image/svg+xml': { ext: '.svg', max: 5_242_880 },
  'application/pdf': { ext: '.pdf', max: 10_485_760 },
};

@Injectable()
export class MediaService {
  private readonly root: string;
  constructor(
    @InjectRepository(MediaAsset)
    private readonly assets: Repository<MediaAsset>,
    private readonly db: DataSource,
    config: ConfigService,
  ) {
    this.root = resolve(
      config.get(
        'LOCAL_STORAGE_PATH',
        resolve(process.cwd(), 'storage/uploads'),
      ),
    );
  }

  async upload(
    siteId: string,
    userId: string,
    file?: {
      buffer: Buffer;
      mimetype: string;
      size: number;
      originalname: string;
    },
    altText = '',
  ) {
    if (!file) throw new BadRequestException('File is required');
    const type = TYPES[file.mimetype];
    if (!type || file.size > type.max)
      throw new BadRequestException('Unsupported file type or size');
    this.verifySignature(file.mimetype, file.buffer);
    const rows = await this.db.query<
      Array<{ organizationId: string; role: string }>
    >(
      `SELECT site.organization_id AS "organizationId",membership.role FROM event_sites site JOIN organization_memberships membership ON membership.organization_id=site.organization_id WHERE site.id=$1 AND membership.user_id=$2 AND site.status='active' AND site.deleted_at IS NULL`,
      [siteId, userId],
    );
    if (!rows[0] || !['owner', 'admin', 'editor'].includes(rows[0].role))
      throw new ForbiddenException('Site write access required');
    const key = `${rows[0].organizationId}/${randomUUID()}${type.ext}`;
    const path = this.path(key);
    await mkdir(resolve(path, '..'), { recursive: true });
    await writeFile(path, file.buffer, { flag: 'wx' });
    try {
      const asset = await this.assets.save(
        this.assets.create({
          organizationId: rows[0].organizationId,
          storageKey: key,
          originalName: file.originalname.slice(0, 255),
          mimeType: file.mimetype,
          byteSize: file.size,
          checksum: createHash('sha256').update(file.buffer).digest('hex'),
          altText: altText.slice(0, 255),
          status: 'active',
          createdBy: userId,
          width: null,
          height: null,
        }),
      );
      return { data: this.dto(asset), errors: [] };
    } catch (error) {
      await unlink(path).catch(() => undefined);
      throw error;
    }
  }

  async file(id: string) {
    const asset = await this.assets.findOneBy({ id, status: 'active' });
    if (!asset) throw new NotFoundException('Media not found');
    return { asset, buffer: await readFile(this.path(asset.storageKey)) };
  }

  private path(key: string) {
    const path = resolve(this.root, key);
    if (!path.startsWith(this.root + '\\') && !path.startsWith(this.root + '/'))
      throw new BadRequestException('Invalid storage path');
    return path;
  }
  private dto(asset: MediaAsset) {
    return {
      id: asset.id,
      assetId: asset.id,
      url: `/api/v1/public/media/${asset.id}`,
      originalName: asset.originalName,
      mimeType: asset.mimeType,
      byteSize: Number(asset.byteSize),
      altText: asset.altText,
    };
  }
  private verifySignature(mime: string, b: Buffer) {
    const ok =
      mime === 'image/png'
        ? b
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : mime === 'image/jpeg'
          ? b[0] === 0xff && b[1] === 0xd8
          : mime === 'image/webp'
            ? b.toString('ascii', 0, 4) === 'RIFF' &&
              b.toString('ascii', 8, 12) === 'WEBP'
            : mime === 'application/pdf'
              ? b.toString('ascii', 0, 5) === '%PDF-'
              : true;
    if (!ok)
      throw new BadRequestException('File signature does not match MIME type');
    if (
      mime === 'image/svg+xml' &&
      /<script|on\w+\s*=|javascript:|<!entity/i.test(b.toString('utf8'))
    )
      throw new BadRequestException('Unsafe SVG content');
  }
}
