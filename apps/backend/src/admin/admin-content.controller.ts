import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminContentService } from './admin-content.service';

enum AdminPageType {
  Home = 'home',
  Download = 'download',
  Winners = 'winners',
  Archive = 'archive',
  Faq = 'faq',
}

class DocumentDto {
  @IsString() @MinLength(1) @MaxLength(200) title!: string;
  @IsOptional() @IsString() @MaxLength(80) category?: string;
  @IsOptional() @IsString() @MaxLength(40) documentRole?: string;
  @IsOptional() @IsString() @MaxLength(20) fileType?: string;
  @IsOptional() @IsString() @MaxLength(40) displaySize?: string;
  @IsOptional() @IsUUID() assetId?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}
class WinnerCategoryDto {
  @IsString() @MinLength(1) @MaxLength(160) name!: string;
  @IsOptional() @IsString() @MaxLength(40) rankPrefix?: string;
  @IsOptional() @IsString() @MaxLength(60) icon?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}
class WinnerDto {
  @IsUUID() categoryId!: string;
  @IsString() @MinLength(1) @MaxLength(200) fullName!: string;
  @IsOptional() @IsString() @MaxLength(80) rankLabel?: string;
  @IsOptional() @IsString() @MaxLength(200) school?: string;
  @IsOptional() @IsString() @MaxLength(80) examNumber?: string;
  @IsOptional() @IsString() @MaxLength(160) regency?: string;
  @IsOptional() @IsString() @MaxLength(160) province?: string;
  @IsOptional() @IsUUID() photoAssetId?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}
class PageDto {
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() @MaxLength(120) eyebrow?: string;
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional() @IsIn(['left', 'center']) alignment?: string;
  @IsOptional() @IsBoolean() showDecree?: boolean;
  @IsOptional() @IsObject() metadataVisibility?: Record<string, boolean>;
  @IsOptional() @IsBoolean() archiveActive?: boolean;
  @IsOptional() @IsInt() @Min(0) archiveLimit?: number;
}
class DecreeDto {
  @IsString() @MinLength(1) @MaxLength(200) title!: string;
  @IsString() @MaxLength(1000) description!: string;
  @IsOptional() @IsUUID() assetId?: string;
  @IsOptional() @IsString() @MaxLength(20) fileType?: string;
  @IsOptional() @IsString() @MaxLength(40) displaySize?: string;
  @IsOptional() @IsBoolean() deleteFile?: boolean;
}
class DetailCategoryDto {
  @IsUUID() categoryId!: string;
  @IsBoolean() isVisible!: boolean;
}
class DetailDocumentDto {
  @IsUUID() documentId!: string;
  @IsBoolean() isVisible!: boolean;
  @IsString() @MaxLength(200) labelOverride!: string;
}
class DetailSettingsDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(200) archiveDisplayName?: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional() @IsUUID() decreeDocumentId?: string;
  @IsOptional() @IsString() @MaxLength(200) decreeTitle?: string;
  @IsOptional() @IsString() @MaxLength(1000) decreeDescription?: string;
  @IsBoolean() isActive!: boolean;
  @IsBoolean() winnersActive!: boolean;
  @IsBoolean() documentsActive!: boolean;
  @IsObject() metadataVisibility!: Record<string, boolean>;
  @ValidateNested({ each: true })
  @Type(() => DetailCategoryDto)
  categories!: DetailCategoryDto[];
  @ValidateNested({ each: true })
  @Type(() => DetailDocumentDto)
  documents!: DetailDocumentDto[];
}

@Controller('admin/events/:eventId')
@UseGuards(JwtAuthGuard)
export class AdminContentController {
  constructor(private readonly content: AdminContentService) {}

  @Get('detail-settings') detailSettings(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.content.detailSettings(eventId, u.userId);
  }
  @Put('detail-settings') putDetailSettings(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() input: DetailSettingsDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.content.putDetailSettings(eventId, u.userId, input);
  }

  @Get('decree') decree(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.content.decree(eventId, u.userId);
  }
  @Put('decree') putDecree(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() input: DecreeDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.content.putDecree(eventId, u.userId, input);
  }

  @Get('documents') documents(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.content.list('event_documents', eventId, u.userId);
  }
  @Post('documents') createDocument(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() d: DocumentDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.content.createDocument(eventId, u.userId, d);
  }
  @Patch('documents/:resourceId') updateDocument(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('resourceId', ParseUUIDPipe) resourceId: string,
    @Body() d: DocumentDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.content.updateDocument(eventId, resourceId, u.userId, d);
  }
  @Delete('documents/:resourceId') deleteDocument(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('resourceId', ParseUUIDPipe) resourceId: string,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.content.remove('event_documents', eventId, resourceId, u.userId);
  }

  @Get('winner-categories') categories(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.content.list('winner_categories', eventId, u.userId);
  }
  @Post('winner-categories') createCategory(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() d: WinnerCategoryDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.content.createWinnerCategory(eventId, u.userId, d);
  }
  @Patch('winner-categories/:resourceId') updateCategory(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('resourceId', ParseUUIDPipe) resourceId: string,
    @Body() d: WinnerCategoryDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.content.updateWinnerCategory(eventId, resourceId, u.userId, d);
  }
  @Delete('winner-categories/:resourceId') deleteCategory(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('resourceId', ParseUUIDPipe) resourceId: string,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.content.remove('winner_categories', eventId, resourceId, u.userId);
  }

  @Get('winners') winners(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.content.list('winners', eventId, u.userId);
  }
  @Post('winners') createWinner(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() d: WinnerDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.content.createWinner(eventId, u.userId, d);
  }
  @Patch('winners/:resourceId') updateWinner(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('resourceId', ParseUUIDPipe) resourceId: string,
    @Body() d: WinnerDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.content.updateWinner(eventId, resourceId, u.userId, d);
  }
  @Delete('winners/:resourceId') deleteWinner(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('resourceId', ParseUUIDPipe) resourceId: string,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.content.remove('winners', eventId, resourceId, u.userId);
  }

  @Get('pages/:pageType') page(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('pageType', new ParseEnumPipe(AdminPageType)) pageType: AdminPageType,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.content.page(eventId, pageType, u.userId);
  }
  @Put('pages/:pageType') putPage(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('pageType', new ParseEnumPipe(AdminPageType)) pageType: AdminPageType,
    @Body() d: PageDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.content.putPage(eventId, pageType, u.userId, d);
  }
}
