import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MediaService } from './media.service';

type UploadedMedia = {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
};

@Controller()
export class MediaController {
  constructor(private readonly media: MediaService) {}
  @Post('admin/sites/:siteId/media')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10_485_760, files: 1 } }),
  )
  upload(
    @Param('siteId', ParseUUIDPipe) siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: UploadedMedia,
    @Body('altText') altText = '',
  ) {
    return this.media.upload(siteId, user.userId, file, altText);
  }

  @Get('public/media/:assetId')
  @Header('X-Content-Type-Options', 'nosniff')
  async publicFile(
    @Param('assetId', ParseUUIDPipe) id: string,
    @Res() response: Response,
  ) {
    const { asset, buffer } = await this.media.file(id);
    response.setHeader('Content-Type', asset.mimeType);
    response.setHeader('Content-Length', buffer.length);
    response.setHeader('Cache-Control', 'public, max-age=3600');
    response.setHeader(
      'Content-Disposition',
      `${asset.mimeType === 'application/pdf' ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(asset.originalName)}`,
    );
    response.send(buffer);
  }
}
