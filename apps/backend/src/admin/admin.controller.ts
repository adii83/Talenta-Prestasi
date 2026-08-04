import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  IsBoolean,
  IsArray,
  IsIn,
  IsOptional,
  IsObject,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminService } from './admin.service';

class SiteParams {
  @IsUUID() siteId!: string;
}

class CreateCompetitionDto {
  @IsString() @MinLength(1) @MaxLength(160) name!: string;
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(100)
  slug!: string;
  @IsIn(['current', 'archived']) lifecycle!: 'current' | 'archived';
}

class CreateSiteDto {
  @IsString() @MinLength(1) @MaxLength(160) name!: string;
}

class CompetitionParams {
  @IsUUID() competitionId!: string;
}

class SiteSettingsDto {
  @IsString() @MinLength(1) @MaxLength(160) eventName!: string;
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(100)
  eventSlug!: string;
  @IsString() @MinLength(1) @MaxLength(160) organizerName!: string;
  @IsString() @MaxLength(20) primaryColor!: string;
  @IsOptional() @IsUUID() logoAssetId?: string;
  @IsObject() navigation!: Record<string, boolean>;
  @IsObject() contact!: Record<string, string>;
  @IsObject() footer!: Record<string, string>;
}

class FaqQuestionDto {
  @IsOptional() @IsUUID() id?: string;
  @IsString() @MinLength(1) @MaxLength(500) question!: string;
  @IsString() @MinLength(1) @MaxLength(10000) answer!: string;
  @IsBoolean() active!: boolean;
}
class FaqCategoryDto {
  @IsOptional() @IsUUID() id?: string;
  @IsString() @MinLength(1) @MaxLength(160) title!: string;
  @IsBoolean() active!: boolean;
  @ValidateNested({ each: true })
  @Type(() => FaqQuestionDto)
  questions!: FaqQuestionDto[];
}
class FaqAggregateDto {
  @ValidateNested({ each: true })
  @Type(() => FaqCategoryDto)
  categories!: FaqCategoryDto[];
}

class DownloadDocumentDto {
  @IsUUID() documentId!: string;
  @IsBoolean() isVisible!: boolean;
  @IsString() @MaxLength(200) labelOverride!: string;
}
class DownloadCompetitionDto {
  @IsUUID() competitionId!: string;
  @IsString() @MaxLength(160) customTabName!: string;
  @IsBoolean() isDefault!: boolean;
  @IsBoolean() isActive!: boolean;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DownloadDocumentDto)
  documents!: DownloadDocumentDto[];
}
class DownloadAggregateDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DownloadCompetitionDto)
  competitions!: DownloadCompetitionDto[];
}

class HomeSectionDto {
  @IsString()
  @IsIn([
    'hero',
    'winnerHighlight',
    'schedule',
    'pricing',
    'benefit',
    'partners',
  ])
  sectionType!: string;
  @IsBoolean() isActive!: boolean;
  @IsObject() settings!: Record<string, unknown>;
}
class HomeAggregateDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HomeSectionDto)
  sections!: HomeSectionDto[];
}

class UpdateCompetitionDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(160) name?: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional() @IsUUID() mascotAssetId?: string;
}

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminSessionController {
  constructor(private readonly adminService: AdminService) {}

  @Get('session')
  session(@CurrentUser() user: AuthenticatedUser) {
    return this.adminService.session(user.userId, user.email);
  }

  @Post('sites')
  createSite(
    @Body() input: CreateSiteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.createSite(user.userId, input);
  }
}

@Controller('admin/sites/:siteId')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  site(@Param() params: SiteParams, @CurrentUser() user: AuthenticatedUser) {
    return this.adminService.site(params.siteId, user.userId);
  }

  @Delete()
  removeSite(
    @Param('siteId', ParseUUIDPipe) siteId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.deleteSite(siteId, user.userId);
  }

  @Post('publish')
  publishSite(
    @Param('siteId', ParseUUIDPipe) siteId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.publishSite(siteId, user.userId);
  }

  @Post('unpublish')
  unpublishSite(
    @Param('siteId', ParseUUIDPipe) siteId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.unpublishSite(siteId, user.userId);
  }

  @Get('settings')
  settings(
    @Param('siteId', ParseUUIDPipe) siteId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.settings(siteId, user.userId);
  }

  @Put('settings')
  putSettings(
    @Param('siteId', ParseUUIDPipe) siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: SiteSettingsDto,
  ) {
    return this.adminService.putSettings(siteId, user.userId, input);
  }

  @Get('faq')
  faq(
    @Param('siteId', ParseUUIDPipe) siteId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.faq(siteId, user.userId);
  }

  @Put('faq')
  putFaq(
    @Param('siteId', ParseUUIDPipe) siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: FaqAggregateDto,
  ) {
    return this.adminService.putFaq(siteId, user.userId, input.categories);
  }

  @Get('downloads')
  downloads(
    @Param('siteId', ParseUUIDPipe) siteId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.downloads(siteId, user.userId);
  }

  @Put('downloads')
  putDownloads(
    @Param('siteId', ParseUUIDPipe) siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: DownloadAggregateDto,
  ) {
    return this.adminService.putDownloads(
      siteId,
      user.userId,
      input.competitions,
    );
  }

  @Get('home')
  home(
    @Param('siteId', ParseUUIDPipe) siteId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.home(siteId, user.userId);
  }

  @Put('home')
  putHome(
    @Param('siteId', ParseUUIDPipe) siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: HomeAggregateDto,
  ) {
    return this.adminService.putHome(siteId, user.userId, input.sections);
  }

  @Get('competitions')
  competitions(
    @Param() params: SiteParams,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.competitions(params.siteId, user.userId);
  }

  @Post('competitions')
  createCompetition(
    @Param() params: SiteParams,
    @Body() dto: CreateCompetitionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.createCompetition(params.siteId, user.userId, dto);
  }
}

@Controller('admin/competitions/:competitionId')
@UseGuards(JwtAuthGuard)
export class AdminCompetitionController {
  constructor(private readonly adminService: AdminService) {}

  @Patch()
  update(
    @Param() params: CompetitionParams,
    @Headers('if-match') version: string | undefined,
    @Body() dto: UpdateCompetitionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.updateCompetition(
      params.competitionId,
      user.userId,
      version,
      dto,
    );
  }

  @Delete()
  remove(
    @Param() params: CompetitionParams,
    @Headers('if-match') version: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.deleteCompetition(
      params.competitionId,
      user.userId,
      version,
    );
  }

  @Post('publish')
  publish(
    @Param() params: CompetitionParams,
    @Headers('if-match') version: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.publishCompetition(
      params.competitionId,
      user.userId,
      version,
    );
  }
}
