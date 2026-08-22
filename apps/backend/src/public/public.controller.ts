import {
  Controller,
  Get,
  Header,
  Headers,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { IsFQDN, IsString, Matches, MaxLength } from 'class-validator';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { PreviewTokenService } from './preview-token.service';
import { PublicService } from './public.service';

class HostnameParams {
  @IsFQDN({ require_tld: false, allow_underscores: false })
  @MaxLength(253)
  hostname!: string;
}

class CategorySlugParams {
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(100)
  categorySlug!: string;
}

class ArchiveParams extends CategorySlugParams {
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(100)
  eventSlug!: string;
}

@Controller('public')
export class PublicController {
  constructor(
    private readonly publicService: PublicService,
    private readonly previewTokens: PreviewTokenService,
    private readonly config: ConfigService,
  ) {}

  @Get('runtime-config')
  runtimeConfig() {
    const publicBaseDomain = this.config
      .get<string>('PUBLIC_BASE_DOMAIN', 'nexaplaymetadata.online')
      .trim()
      .toLowerCase()
      .replace(/^\.+|\.+$/g, '');
    return { data: { publicBaseDomain }, errors: [] };
  }

  @Post('preview/session')
  @Header('Cache-Control', 'private, no-store')
  async previewSession(
    @Headers('x-talenta-preview') token: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.publicService.validatePreview(token);
    const forwardedProtocol = request
      .get('x-forwarded-proto')
      ?.split(',')[0]
      .trim()
      .toLowerCase();
    response.setHeader(
      'Set-Cookie',
      this.previewTokens.cookie(
        token,
        request.secure || forwardedProtocol === 'https',
      ),
    );
    return { data: { active: true }, errors: [] };
  }

  @Get('sites/by-host/:hostname/bootstrap')
  bootstrap(
    @Param() params: HostnameParams,
    @Headers('x-talenta-preview') headerToken = '',
    @Headers('cookie') cookie = '',
  ) {
    return this.publicService.bootstrap(
      params.hostname,
      headerToken || this.previewTokens.fromCookie(cookie),
    );
  }

  @Get('sites/:categorySlug/bootstrap')
  bootstrapBySlug(
    @Param() params: CategorySlugParams,
    @Headers('x-talenta-preview') headerToken = '',
    @Headers('cookie') cookie = '',
  ) {
    return this.publicService.bootstrapBySlug(
      params.categorySlug,
      headerToken || this.previewTokens.fromCookie(cookie),
    );
  }

  @Get('sites/:categorySlug/home')
  home(
    @Param() params: CategorySlugParams,
    @Headers('x-talenta-preview') headerToken = '',
    @Headers('cookie') cookie = '',
  ) {
    return this.publicService.home(
      params.categorySlug,
      headerToken || this.previewTokens.fromCookie(cookie),
    );
  }

  @Get('sites/:categorySlug/downloads')
  downloads(
    @Param() params: CategorySlugParams,
    @Headers('x-talenta-preview') headerToken = '',
    @Headers('cookie') cookie = '',
  ) {
    return this.publicService.downloads(
      params.categorySlug,
      headerToken || this.previewTokens.fromCookie(cookie),
    );
  }

  @Get('sites/:categorySlug/faq')
  faq(
    @Param() params: CategorySlugParams,
    @Headers('x-talenta-preview') headerToken = '',
    @Headers('cookie') cookie = '',
  ) {
    return this.publicService.faq(
      params.categorySlug,
      headerToken || this.previewTokens.fromCookie(cookie),
    );
  }

  @Get('sites/:categorySlug/winners')
  winners(
    @Param() params: CategorySlugParams,
    @Headers('x-talenta-preview') headerToken = '',
    @Headers('cookie') cookie = '',
  ) {
    return this.publicService.winners(
      params.categorySlug,
      headerToken || this.previewTokens.fromCookie(cookie),
    );
  }

  @Get('sites/:categorySlug/archives')
  archives(
    @Param() params: CategorySlugParams,
    @Headers('x-talenta-preview') headerToken = '',
    @Headers('cookie') cookie = '',
  ) {
    return this.publicService.archives(
      params.categorySlug,
      headerToken || this.previewTokens.fromCookie(cookie),
    );
  }

  @Get('sites/:categorySlug/archives/:eventSlug')
  archiveDetail(
    @Param() params: ArchiveParams,
    @Headers('x-talenta-preview') headerToken = '',
    @Headers('cookie') cookie = '',
  ) {
    return this.publicService.archiveDetail(
      params.categorySlug,
      params.eventSlug,
      headerToken || this.previewTokens.fromCookie(cookie),
    );
  }
}
