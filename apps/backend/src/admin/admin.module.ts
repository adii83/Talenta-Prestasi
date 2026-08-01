import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventSite } from '../entities/event-site.entity';
import { Competition } from '../entities/competition.entity';
import { AuthModule } from '../auth/auth.module';
import {
  AdminCompetitionController,
  AdminController,
} from './admin.controller';
import { AdminService } from './admin.service';
import { AdminContentController } from './admin-content.controller';
import { AdminContentService } from './admin-content.service';

@Module({
  imports: [TypeOrmModule.forFeature([EventSite, Competition]), AuthModule],
  controllers: [
    AdminController,
    AdminCompetitionController,
    AdminContentController,
  ],
  providers: [AdminService, AdminContentService],
})
export class AdminModule {}
