import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  IsBoolean,
  IsArray,
  IsIn,
  IsOptional,
  IsInt,
  IsObject,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminService } from './admin.service';
import { EventPublicationService } from './event-publication.service';

class CreateCategoryDto {
  @IsString() @MinLength(1) @MaxLength(160) name!: string;
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(100)
  slug!: string;
}

class EventPeriodIdentityDto {
  @Type(() => Number) @IsInt() @Min(2000) @Max(2100) periodYear!: number;
  @IsBoolean() batchEnabled!: boolean;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(40) batchLabel?: string;
  @IsOptional() @IsString() @MaxLength(240) batchNote?: string;
  @IsOptional() @IsBoolean() confirmBatchConversion?: boolean;
  @IsOptional() @IsInt() @Min(1) expectedRevision?: number;
}

class CreateEventDto extends EventPeriodIdentityDto {
  @IsOptional() @IsBoolean() useLatestTemplate?: boolean;
}

class UpdateCategoryDto {
  @IsString() @MinLength(1) @MaxLength(160) name!: string;
  @IsString() @MaxLength(160) organizerName!: string;
}

class UpdateEventDto {
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional()
  @IsIn([
    'archive',
    'award',
    'book-open',
    'graduation-cap',
    'medal',
    'school',
    'sparkles',
    'star',
    'trophy',
  ])
  fallbackIcon?: string;
  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsUUID()
  mascotAssetId?: string | null;
  @IsOptional() @IsInt() @Min(1) expectedRevision?: number;
}

class EventSettingsDto {
  @IsOptional() @IsString() @MaxLength(5000) eventDescription?: string;
  @IsString() @MaxLength(20) primaryColor!: string;
  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsUUID()
  logoAssetId?: string | null;
  @Type(() => Number)
  @IsInt()
  @Min(24)
  @Max(44)
  navbarLogoSize!: number;
  @IsObject() navigation!: Record<string, boolean>;
  @IsObject() contact!: Record<string, string>;
  @IsObject() footer!: Record<string, string>;
  @IsOptional() @IsObject() seo?: Record<string, string>;
  @IsOptional() @IsInt() @Min(1) expectedRevision?: number;
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
  @IsOptional() @IsInt() @Min(1) expectedRevision?: number;
}

class DownloadDocumentDto {
  @IsUUID() documentId!: string;
  @IsBoolean() isVisible!: boolean;
  @IsString() @MaxLength(200) labelOverride!: string;
}
class DownloadTabDto {
  @IsString() @MaxLength(160) customTabName!: string;
  @IsBoolean() isDefault!: boolean;
  @IsBoolean() isActive!: boolean;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DownloadDocumentDto)
  documents!: DownloadDocumentDto[];
}
class DownloadAggregateDto {
  @IsInt() @Min(1) expectedRevision!: number;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DownloadTabDto)
  tabs!: DownloadTabDto[];
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
  @IsInt() @Min(1) expectedRevision!: number;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HomeSectionDto)
  sections!: HomeSectionDto[];
}

class PublicationActionDto {
  @IsOptional() @IsInt() @Min(1) expectedVersion?: number;
  @IsInt() @Min(1) expectedRevision!: number;
  @IsOptional()
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  expectedChecksum?: string;
}

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminSessionController {
  constructor(private readonly adminService: AdminService) {}

  @Get('session')
  session(@CurrentUser() user: AuthenticatedUser) {
    return this.adminService.session(user.userId, user.email);
  }

  @Get('categories')
  categories(@CurrentUser() user: AuthenticatedUser) {
    return this.adminService.listCategories(user.userId);
  }

  @Post('categories')
  createCategory(
    @Body() input: CreateCategoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.createCategory(user.userId, input);
  }
}

@Controller('admin/categories/:categoryId')
@UseGuards(JwtAuthGuard)
export class AdminCategoryController {
  constructor(private readonly adminService: AdminService) {}

  @Get('events')
  events(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.categoryEvents(categoryId, user.userId);
  }

  @Post('events')
  createEvent(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Body() input: CreateEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.createEvent(categoryId, user.userId, input);
  }

  @Patch()
  update(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Body() input: UpdateCategoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.updateCategory(categoryId, user.userId, input);
  }

  @Delete()
  remove(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.deleteCategory(categoryId, user.userId);
  }

  @Post('publish')
  publish(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.publishCategory(categoryId, user.userId);
  }

  @Post('unpublish')
  unpublish(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.unpublishCategory(categoryId, user.userId);
  }
}

@Controller('admin/events/:eventId')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly publications: EventPublicationService,
  ) {}

  @Get()
  event(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.event(eventId, user.userId);
  }

  @Patch()
  update(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() input: UpdateEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.updateEvent(eventId, user.userId, input);
  }

  @Delete()
  remove(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.deleteEvent(eventId, user.userId);
  }

  @Patch('period-identity')
  periodIdentity(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() input: EventPeriodIdentityDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.setEventPeriodIdentity(
      eventId,
      user.userId,
      input,
    );
  }

  @Post('activate')
  activate(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.activateEvent(eventId, user.userId);
  }

  @Post('deactivate')
  deactivate(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.deactivateEvent(eventId, user.userId);
  }

  @Get('publication-status')
  publicationStatus(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.publications.status(eventId, user.userId);
  }

  @Post('preview-token')
  previewToken(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.publications.previewToken(eventId, user.userId);
  }

  @Post('publish')
  publishEvent(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() input: PublicationActionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.publications.publish(
      eventId,
      user.userId,
      input.expectedVersion,
      input.expectedChecksum,
      input.expectedRevision,
    );
  }

  @Post('discard-draft')
  discardDraft(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() input: PublicationActionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.publications.discardDraft(
      eventId,
      user.userId,
      input.expectedVersion,
      input.expectedChecksum,
      input.expectedRevision,
    );
  }

  @Get('settings')
  settings(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.settings(eventId, user.userId);
  }

  @Put('settings')
  putSettings(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: EventSettingsDto,
  ) {
    return this.adminService.putSettings(eventId, user.userId, input);
  }

  @Get('faq')
  faq(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.faq(eventId, user.userId);
  }

  @Put('faq')
  putFaq(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: FaqAggregateDto,
  ) {
    return this.adminService.putFaq(eventId, user.userId, input.categories, input.expectedRevision);
  }

  @Get('downloads')
  downloads(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.downloads(eventId, user.userId);
  }

  @Put('downloads')
  putDownloads(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: DownloadAggregateDto,
  ) {
    return this.adminService.putDownloads(eventId, user.userId, input.tabs, input.expectedRevision);
  }

  @Get('home')
  home(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.home(eventId, user.userId);
  }

  @Put('home')
  putHome(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: HomeAggregateDto,
  ) {
    return this.adminService.putHome(
      eventId,
      user.userId,
      input.sections,
      input.expectedRevision,
    );
  }
}
