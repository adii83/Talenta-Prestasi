import { NotFoundException } from '@nestjs/common';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { MediaService } from './media.service';

describe('MediaService adminFile', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(resolve(tmpdir(), 'talenta-media-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('returns asset and buffer when user is authorized membership member', async () => {
    const asset = {
      id: '22222222-2222-4222-8222-222222222222',
      organizationId: 'organization-1',
      storageKey: 'organization-1/logo.png',
      originalName: 'logo.png',
      mimeType: 'image/png',
      byteSize: 8,
      status: 'active',
    };
    await mkdir(resolve(root, 'organization-1'), { recursive: true });
    await writeFile(resolve(root, asset.storageKey), Buffer.from('logo'));

    const assets = { findOneBy: jest.fn().mockResolvedValue(asset) };
    const db = { query: jest.fn().mockResolvedValue([{ id: asset.id }]) };
    const config = { get: jest.fn().mockReturnValue(root) };
    const service = new MediaService(
      assets as never,
      db as never,
      config as never,
      { verify: jest.fn() } as never,
    );

    const result = await service.adminFile(
      '11111111-1111-4111-8111-111111111111',
      '33333333-3333-4333-8333-333333333333',
      asset.id,
    );

    expect(result.asset).toBe(asset);
    expect(result.buffer.toString()).toBe('logo');
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('JOIN organization_memberships membership'),
      [
        '11111111-1111-4111-8111-111111111111',
        '33333333-3333-4333-8333-333333333333',
        asset.id,
      ],
    );
  });

  it('throws NotFoundException when membership or asset check fails', async () => {
    const assets = { findOneBy: jest.fn() };
    const db = { query: jest.fn().mockResolvedValue([]) };
    const config = { get: jest.fn().mockReturnValue(root) };
    const service = new MediaService(
      assets as never,
      db as never,
      config as never,
      { verify: jest.fn() } as never,
    );

    await expect(
      service.adminFile(
        '11111111-1111-4111-8111-111111111111',
        '33333333-3333-4333-8333-333333333333',
        '22222222-2222-4222-8222-222222222222',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns Event logo binary for a valid preview token', async () => {
    const asset = {
      id: '22222222-2222-4222-8222-222222222222',
      storageKey: 'organization-1/logo.png',
      status: 'active',
    };
    const claims = {
      eventId: '11111111-1111-4111-8111-111111111111',
      categoryId: '44444444-4444-4444-8444-444444444444',
      organizationId: '55555555-5555-4555-8555-555555555555',
      sub: '33333333-3333-4333-8333-333333333333',
    };
    await mkdir(resolve(root, 'organization-1'), { recursive: true });
    await writeFile(resolve(root, asset.storageKey), Buffer.from('logo'));

    const assets = { findOneBy: jest.fn().mockResolvedValue(asset) };
    const db = { query: jest.fn().mockResolvedValue([{ id: asset.id }]) };
    const previewTokens = { verify: jest.fn().mockResolvedValue(claims) };
    const service = new MediaService(
      assets as never,
      db as never,
      { get: jest.fn().mockReturnValue(root) } as never,
      previewTokens as never,
    );

    const result = await service.file(asset.id, 'preview-token');

    expect(result.buffer.toString()).toBe('logo');
    expect(previewTokens.verify).toHaveBeenCalledWith('preview-token');
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('event.logo_asset_id=asset.id'),
      [
        asset.id,
        claims.eventId,
        claims.categoryId,
        claims.organizationId,
        claims.sub,
      ],
    );
  });

  it('allows a custom winner design for a valid preview token', async () => {
    const asset = {
      id: '22222222-2222-4222-8222-222222222222',
      storageKey: 'organization-1/winner.webp',
      status: 'active',
    };
    const claims = {
      eventId: '11111111-1111-4111-8111-111111111111',
      categoryId: '44444444-4444-4444-8444-444444444444',
      organizationId: '55555555-5555-4555-8555-555555555555',
      sub: '33333333-3333-4333-8333-333333333333',
    };
    await mkdir(resolve(root, 'organization-1'), { recursive: true });
    await writeFile(resolve(root, asset.storageKey), Buffer.from('winner'));

    const assets = { findOneBy: jest.fn().mockResolvedValue(asset) };
    const db = { query: jest.fn().mockResolvedValue([{ id: asset.id }]) };
    const service = new MediaService(
      assets as never,
      db as never,
      { get: jest.fn().mockReturnValue(root) } as never,
      { verify: jest.fn().mockResolvedValue(claims) } as never,
    );

    const result = await service.file(asset.id, 'preview-token');

    expect(result.buffer.toString()).toBe('winner');
    expect(db.query.mock.calls[0][0]).toContain(
      'winner.design_asset_id=asset.id',
    );
    expect(db.query.mock.calls[0][0]).toContain(
      'winner.photo_asset_id=asset.id',
    );
  });

  it('allows an older Event mascot in the active Event archive preview', async () => {
    const asset = {
      id: '22222222-2222-4222-8222-222222222222',
      storageKey: 'organization-1/archive.png',
      status: 'active',
    };
    const claims = {
      eventId: '11111111-1111-4111-8111-111111111111',
      categoryId: '44444444-4444-4444-8444-444444444444',
      organizationId: '55555555-5555-4555-8555-555555555555',
      sub: '33333333-3333-4333-8333-333333333333',
    };
    await mkdir(resolve(root, 'organization-1'), { recursive: true });
    await writeFile(resolve(root, asset.storageKey), Buffer.from('archive'));

    const assets = { findOneBy: jest.fn().mockResolvedValue(asset) };
    const db = { query: jest.fn().mockResolvedValue([{ id: asset.id }]) };
    const service = new MediaService(
      assets as never,
      db as never,
      { get: jest.fn().mockReturnValue(root) } as never,
      { verify: jest.fn().mockResolvedValue(claims) } as never,
    );

    const result = await service.file(asset.id, 'preview-token');

    expect(result.buffer.toString()).toBe('archive');
    expect(db.query.mock.calls[0][0]).toContain(
      'archive.mascot_asset_id=asset.id',
    );
    expect(db.query.mock.calls[0][0]).toContain(
      'archive.category_id=event.category_id',
    );
  });

  it('hides an unallowlisted Event logo without a preview token', async () => {
    const assets = { findOneBy: jest.fn() };
    const db = { query: jest.fn().mockResolvedValue([]) };
    const previewTokens = { verify: jest.fn() };
    const service = new MediaService(
      assets as never,
      db as never,
      { get: jest.fn().mockReturnValue(root) } as never,
      previewTokens as never,
    );

    await expect(
      service.file('22222222-2222-4222-8222-222222222222'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('event_publication_assets link'),
      ['22222222-2222-4222-8222-222222222222'],
    );
    expect(previewTokens.verify).not.toHaveBeenCalled();
    expect(assets.findOneBy).not.toHaveBeenCalled();
  });
});
