import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
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

class CompetitionParams {
  @IsUUID() competitionId!: string;
}

class UpdateCompetitionDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(160) name?: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
}

@Controller('admin/sites/:siteId')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  site(@Param() params: SiteParams, @CurrentUser() user: AuthenticatedUser) {
    return this.adminService.site(params.siteId, user.userId);
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
