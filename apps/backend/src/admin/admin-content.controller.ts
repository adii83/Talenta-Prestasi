import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminContentService } from './admin-content.service';

class CompetitionParams {
  @IsUUID() competitionId!: string;
}
class ResourceParams extends CompetitionParams {
  @IsUUID() resourceId!: string;
}
class PageParams {
  @IsUUID() siteId!: string;
  @IsIn(['home', 'download', 'winners', 'archive', 'faq']) pageType!: string;
}
class DocumentDto {
  @IsString() @MinLength(1) @MaxLength(200) title!: string;
  @IsOptional() @IsString() @MaxLength(80) category?: string;
  @IsOptional() @IsString() @MaxLength(40) documentRole?: string;
  @IsOptional() @IsUUID() assetId?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}
class CategoryDto {
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
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}
class PageDto {
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() @MaxLength(120) eyebrow?: string;
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional() @IsIn(['left', 'center']) alignment?: string;
}

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminContentController {
  constructor(private readonly content: AdminContentService) {}

  @Get('competitions/:competitionId/documents') documents(
    @Param() p: CompetitionParams,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.content.list(
      'competition_documents',
      p.competitionId,
      u.userId,
    );
  }
  @Post('competitions/:competitionId/documents') createDocument(
    @Param() p: CompetitionParams,
    @Body() d: DocumentDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.content.createDocument(p.competitionId, u.userId, d);
  }
  @Patch('competitions/:competitionId/documents/:resourceId') updateDocument(
    @Param() p: ResourceParams,
    @Body() d: DocumentDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.content.updateDocument(
      p.competitionId,
      p.resourceId,
      u.userId,
      d,
    );
  }
  @Delete('competitions/:competitionId/documents/:resourceId') deleteDocument(
    @Param() p: ResourceParams,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.content.remove(
      'competition_documents',
      p.competitionId,
      p.resourceId,
      u.userId,
    );
  }

  @Get('competitions/:competitionId/winner-categories') categories(
    @Param() p: CompetitionParams,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.content.list('winner_categories', p.competitionId, u.userId);
  }
  @Post('competitions/:competitionId/winner-categories') createCategory(
    @Param() p: CompetitionParams,
    @Body() d: CategoryDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.content.createCategory(p.competitionId, u.userId, d);
  }
  @Patch('competitions/:competitionId/winner-categories/:resourceId')
  updateCategory(
    @Param() p: ResourceParams,
    @Body() d: CategoryDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.content.updateCategory(
      p.competitionId,
      p.resourceId,
      u.userId,
      d,
    );
  }
  @Delete('competitions/:competitionId/winner-categories/:resourceId')
  deleteCategory(
    @Param() p: ResourceParams,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.content.remove(
      'winner_categories',
      p.competitionId,
      p.resourceId,
      u.userId,
    );
  }

  @Get('competitions/:competitionId/winners') winners(
    @Param() p: CompetitionParams,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.content.list('winners', p.competitionId, u.userId);
  }
  @Post('competitions/:competitionId/winners') createWinner(
    @Param() p: CompetitionParams,
    @Body() d: WinnerDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.content.createWinner(p.competitionId, u.userId, d);
  }
  @Patch('competitions/:competitionId/winners/:resourceId') updateWinner(
    @Param() p: ResourceParams,
    @Body() d: WinnerDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.content.updateWinner(
      p.competitionId,
      p.resourceId,
      u.userId,
      d,
    );
  }
  @Delete('competitions/:competitionId/winners/:resourceId') deleteWinner(
    @Param() p: ResourceParams,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.content.remove(
      'winners',
      p.competitionId,
      p.resourceId,
      u.userId,
    );
  }

  @Get('sites/:siteId/pages/:pageType') page(
    @Param() p: PageParams,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.content.page(p.siteId, p.pageType, u.userId);
  }
  @Put('sites/:siteId/pages/:pageType') putPage(
    @Param() p: PageParams,
    @Body() d: PageDto,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.content.putPage(p.siteId, p.pageType, u.userId, d);
  }
}
