import { Controller, Get, Param } from '@nestjs/common';
import { IsFQDN, IsString, Matches, MaxLength } from 'class-validator';
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

@Controller('public/sites')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('by-host/:hostname/bootstrap')
  bootstrap(@Param() params: HostnameParams) {
    return this.publicService.bootstrap(params.hostname);
  }

  @Get(':categorySlug/bootstrap')
  bootstrapBySlug(@Param() params: CategorySlugParams) {
    return this.publicService.bootstrapBySlug(params.categorySlug);
  }

  @Get(':categorySlug/home')
  home(@Param() params: CategorySlugParams) {
    return this.publicService.home(params.categorySlug);
  }

  @Get(':categorySlug/downloads')
  downloads(@Param() params: CategorySlugParams) {
    return this.publicService.downloads(params.categorySlug);
  }

  @Get(':categorySlug/faq')
  faq(@Param() params: CategorySlugParams) {
    return this.publicService.faq(params.categorySlug);
  }

  @Get(':categorySlug/winners')
  winners(@Param() params: CategorySlugParams) {
    return this.publicService.winners(params.categorySlug);
  }

  @Get(':categorySlug/archives')
  archives(@Param() params: CategorySlugParams) {
    return this.publicService.archives(params.categorySlug);
  }

  @Get(':categorySlug/archives/:eventSlug')
  archiveDetail(@Param() params: ArchiveParams) {
    return this.publicService.archiveDetail(
      params.categorySlug,
      params.eventSlug,
    );
  }
}
