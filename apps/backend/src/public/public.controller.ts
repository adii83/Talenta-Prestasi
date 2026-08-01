import { Controller, Get, Param } from '@nestjs/common';
import { IsFQDN, IsString, Matches, MaxLength } from 'class-validator';
import { PublicService } from './public.service';

class HostnameParams {
  @IsFQDN({ require_tld: false, allow_underscores: false })
  @MaxLength(253)
  hostname!: string;
}

class SiteSlugParams {
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(100)
  siteSlug!: string;
}

class ArchiveParams extends SiteSlugParams {
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(100)
  competitionSlug!: string;
}

@Controller('public/sites')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('by-host/:hostname/bootstrap')
  bootstrap(@Param() params: HostnameParams) {
    return this.publicService.bootstrap(params.hostname);
  }

  @Get(':siteSlug/home')
  home(@Param() params: SiteSlugParams) {
    return this.publicService.home(params.siteSlug);
  }

  @Get(':siteSlug/downloads')
  downloads(@Param() params: SiteSlugParams) {
    return this.publicService.downloads(params.siteSlug);
  }

  @Get(':siteSlug/faq')
  faq(@Param() params: SiteSlugParams) {
    return this.publicService.faq(params.siteSlug);
  }

  @Get(':siteSlug/winners')
  winners(@Param() params: SiteSlugParams) {
    return this.publicService.winners(params.siteSlug);
  }

  @Get(':siteSlug/archives')
  archives(@Param() params: SiteSlugParams) {
    return this.publicService.archives(params.siteSlug);
  }

  @Get(':siteSlug/archives/:competitionSlug')
  archiveDetail(@Param() params: ArchiveParams) {
    return this.publicService.archiveDetail(
      params.siteSlug,
      params.competitionSlug,
    );
  }
}
