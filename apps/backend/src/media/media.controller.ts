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
  Headers,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PreviewTokenService } from '../public/preview-token.service';
import { MediaService } from './media.service';

type UploadedMedia = {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
};

@Controller()
export class MediaController {
  constructor(
    private readonly media: MediaService,
    private readonly previewTokens: PreviewTokenService,
  ) {}
  @Post('admin/events/:eventId/media')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10_485_760, files: 1 } }),
  )
  upload(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: UploadedMedia,
    @Body('altText') altText = '',
  ) {
    return this.media.upload(eventId, user.userId, file, altText);
  }

  @Get('public/media/:assetId')
  @Header('X-Content-Type-Options', 'nosniff')
  async publicFile(
    @Param('assetId', ParseUUIDPipe) id: string,
    @Headers('x-talenta-preview') headerToken = '',
    @Headers('cookie') cookie = '',
    @Res() response: Response,
  ) {
    const previewToken =
      headerToken || this.previewTokens.fromCookie(cookie);
    const { asset, buffer } = await this.media.file(id, previewToken);
    response.setHeader('Content-Type', asset.mimeType);
    response.setHeader('Content-Length', buffer.length);
    response.setHeader(
      'Cache-Control',
      previewToken ? 'private, no-store' : 'public, max-age=3600',
    );
    if (previewToken) response.setHeader('Vary', 'X-Talenta-Preview, Cookie');
    response.setHeader(
      'Content-Disposition',
      `${asset.mimeType === 'application/pdf' ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(asset.originalName)}`,
    );
    response.send(buffer);
  }
}
